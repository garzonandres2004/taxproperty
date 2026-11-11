// Find likely adjacent or nearby owners from the tax roll, without parcel maps.
// Two signals:
//   1. Same street and city, house number within a small range.
//   2. Same plat (plat book and page, or subdivision text) and block, lot number close by.
// Adjacent owners are the most natural buyers for a vacant lot.

import type { Neighbor, Parcel } from "./types.ts";

export interface StreetKey {
  key: string;
  number: number;
}

export function parseStreet(address: string, city: string): StreetKey | null {
  const a = (address || "").toUpperCase().replace(/\s+/g, " ").trim();
  const m = a.match(/^(\d+)[A-Z]?\s+(.+)$/);
  if (!m) return null;
  const street = m[2].replace(/\b(UNIT|APT|#)\s*\S+$/, "").trim();
  if (!street) return null;
  return { key: `${(city || "").toUpperCase().trim()}|${street}`, number: Number(m[1]) };
}

export interface PlatKey {
  key: string;
  lot: number;
}

export function parsePlat(legal: string): PlatKey | null {
  const l = (legal || "").toUpperCase().replace(/\s+/g, " ");
  const lot = l.match(/\bLOTS?\s+(\d+)/);
  if (!lot) return null;
  const blk = l.match(/\bBL(?:OC)?K\s+([A-Z0-9]+)/);
  const pb = l.match(/\bP\.?\s?B\.?\s*(\d+)\s*,?\s*P(?:G|AGE)?S?\.?\s*(\d+)/);
  let plat = "";
  if (pb) plat = `PB${pb[1]}-${pb[2]}`;
  else {
    // fall back to subdivision words: legal text with lot and block tokens removed
    plat = l
      .replace(/\bLOTS?\s+[\d\s,&AND-]+/g, " ")
      .replace(/\bBL(?:OC)?K\s+[A-Z0-9]+/g, " ")
      .replace(/[^A-Z ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
  }
  if (!plat) return null;
  return { key: `${plat}|${blk ? blk[1] : ""}`, lot: Number(lot[1]) };
}

export interface NeighborFinder {
  /** Register subjects (listed parcels) before scanning the roll. */
  addSubject(p: Parcel): void;
  /** Offer each roll parcel; it is kept if it sits near a subject. */
  offer(p: Parcel): void;
  neighborsOf(p: Parcel): Neighbor[];
}

export function createNeighborFinder(opts: { houseNumberRange: number; lotRange: number; maxShown: number }): NeighborFinder {
  const streetSubjects = new Map<string, { parcelKey: string; number: number }[]>();
  const platSubjects = new Map<string, { parcelKey: string; lot: number }[]>();
  // Per subject, keep neighbors by parcel id; prune to the closest ones when it grows.
  const found = new Map<string, Map<string, Neighbor & { distance: number }>>();
  const KEEP = Math.max(opts.maxShown * 4, 20);
  const subjectKeys = new Set<string>();

  function add(subjectKey: string, n: Neighbor & { distance: number }) {
    let m = found.get(subjectKey);
    if (!m) found.set(subjectKey, (m = new Map()));
    const prev = m.get(n.parcelId);
    if (!prev || n.distance < prev.distance) m.set(n.parcelId, n);
    if (m.size > KEEP * 2) {
      const keep = [...m.values()].sort((x, y) => x.distance - y.distance).slice(0, KEEP);
      m.clear();
      for (const k of keep) m.set(k.parcelId, k);
    }
  }

  return {
    addSubject(p) {
      subjectKeys.add(p.parcelKey);
      const s = parseStreet(p.situsAddress, p.situsCity);
      if (s) streetSubjects.set(s.key, [...(streetSubjects.get(s.key) ?? []), { parcelKey: p.parcelKey, number: s.number }]);
      const pl = parsePlat(p.legal);
      if (pl) platSubjects.set(`${p.countyCode}|${pl.key}`, [...(platSubjects.get(`${p.countyCode}|${pl.key}`) ?? []), { parcelKey: p.parcelKey, lot: pl.lot }]);
    },
    offer(p) {
      const s = parseStreet(p.situsAddress, p.situsCity);
      if (s) {
        for (const subj of streetSubjects.get(s.key) ?? []) {
          if (subj.parcelKey === p.parcelKey) continue;
          const d = Math.abs(subj.number - s.number);
          if (d <= opts.houseNumberRange) {
            add(subj.parcelKey, { parcelId: p.parcelId, ownerName: p.ownerName, situsAddress: p.situsAddress, reason: `same street, ${d} house numbers away`, distance: d });
          }
        }
      }
      const pl = parsePlat(p.legal);
      if (pl) {
        for (const subj of platSubjects.get(`${p.countyCode}|${pl.key}`) ?? []) {
          if (subj.parcelKey === p.parcelKey) continue;
          const d = Math.abs(subj.lot - pl.lot);
          if (d <= opts.lotRange) {
            add(subj.parcelKey, { parcelId: p.parcelId, ownerName: p.ownerName, situsAddress: p.situsAddress, reason: `same plat and block, lot ${pl.lot}`, distance: d * 10 });
          }
        }
      }
    },
    neighborsOf(p) {
      const arr = [...(found.get(p.parcelKey)?.values() ?? [])];
      return arr
        .sort((a, b) => a.distance - b.distance)
        .slice(0, opts.maxShown)
        .map(({ distance: _d, ...n }) => n);
    },
  };
}
