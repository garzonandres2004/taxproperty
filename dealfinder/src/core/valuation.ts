// Market value estimate for a parcel from the tax roll alone.
//
// Method, best first:
// 1. Comparable sales ratio: recent arm's length sales of the same kind of
//    property nearby. For each sale, price / that parcel's just value. The
//    median ratio times the subject's just value is the estimate. Using a ratio
//    instead of price per square foot keeps it fair across lot and house sizes.
// 2. The subject's own recent arm's length sale.
// 3. Just value divided by the usual assessment level (Florida just value runs
//    below market because appraisers deduct roughly 15% for cost of sale).

import type { Parcel, PropertyKind, ValueEstimate } from "./types.ts";
import type { Assumptions } from "./assumptions.ts";
import { median, quantile, round } from "./stats.ts";

/** A compact sale record kept from the tax roll for comparison. */
export interface Comp {
  parcelKey: string;
  group: string;
  neighborhood: string;
  tract: string;
  zip: string;
  city: string;
  justValue: number;
  price: number;
  year: number;
}

export function kindGroup(kind: PropertyKind): string {
  switch (kind) {
    case "vacant_residential":
      return "vacant_res";
    case "vacant_commercial":
      return "vacant_com";
    case "vacant_other":
      return "acreage";
    case "agricultural":
      return "ag"; // ag land trades differently from plain acreage; never mix their ratios
    case "single_family":
      return "sfr";
    case "condo":
      return "condo";
    case "mobile_home":
      return "mh";
    case "multifamily":
      return "multi";
    case "commercial":
      return "commercial";
    default:
      return "other";
  }
}

function isVacantGroup(group: string): boolean {
  return group === "vacant_res" || group === "vacant_com" || group === "acreage" || group === "ag";
}

/** Months between a sale and today; negative means a sale dated in the future. Unknown month counts as June. */
export function saleAgeMonths(year: number, month: number, today: Date): number {
  const m = month >= 1 && month <= 12 ? month : 6;
  return today.getUTCFullYear() * 12 + today.getUTCMonth() + 1 - (year * 12 + m);
}

function saleUsable(s: { qualified: boolean; year: number; month: number; vi: string; price: number }, vacant: boolean, jv: number, a: Assumptions, today: Date): boolean {
  if (!s.qualified) return false;
  const age = saleAgeMonths(s.year, s.month, today);
  if (age < 0 || age > a.valuation.compMaxAgeYears * 12) return false;
  if (s.vi === "V" && !vacant) return false; // sold as land, now built: ratio would be wrong
  if (s.vi === "I" && vacant) return false; // sold with a building that is gone now
  const ratio = s.price / jv;
  return ratio >= a.valuation.ratioMin && ratio <= a.valuation.ratioMax;
}

export function tractOf(censusBlock: string): string {
  const d = (censusBlock || "").replace(/\D/g, "");
  return d.length >= 11 ? d.slice(0, 11) : "";
}

/** Turn a tax roll parcel into zero or more comp records (one per usable sale). */
export function compsFromParcel(p: Parcel, a: Assumptions, today: Date): Comp[] {
  if (p.justValue < 1000) return [];
  const group = kindGroup(p.kind);
  const vacant = isVacantGroup(group);
  const out: Comp[] = [];
  for (const s of p.sales) {
    if (!saleUsable(s, vacant, p.justValue, a, today)) continue;
    out.push({
      parcelKey: p.parcelKey,
      group,
      neighborhood: p.neighborhood,
      tract: tractOf(p.censusBlock),
      zip: p.situsZip,
      city: p.situsCity.toUpperCase(),
      justValue: p.justValue,
      price: s.price,
      year: s.year,
    });
    break; // most recent usable sale only
  }
  return out;
}

export interface CompIndex {
  byNeighborhood: Map<string, Comp[]>;
  byTract: Map<string, Comp[]>;
  byZip: Map<string, Comp[]>;
  byCity: Map<string, Comp[]>;
}

export function emptyCompIndex(): CompIndex {
  return { byNeighborhood: new Map(), byTract: new Map(), byZip: new Map(), byCity: new Map() };
}

function push(m: Map<string, Comp[]>, k: string, c: Comp) {
  if (!k) return;
  const arr = m.get(k);
  if (arr) arr.push(c);
  else m.set(k, [c]);
}

export function addComp(idx: CompIndex, countyCode: string, c: Comp): void {
  if (c.neighborhood) push(idx.byNeighborhood, `${countyCode}|${c.group}|${c.neighborhood}`, c);
  if (c.tract) push(idx.byTract, `${countyCode}|${c.group}|${c.tract}`, c);
  if (c.zip) push(idx.byZip, `${countyCode}|${c.group}|${c.zip}`, c);
  if (c.city) push(idx.byCity, `${countyCode}|${c.group}|${c.city}`, c);
}

export function estimateValue(p: Parcel, idx: CompIndex, a: Assumptions, today: Date): ValueEstimate {
  const v = a.valuation;
  const group = kindGroup(p.kind);
  const notes: string[] = [];
  const jv = p.justValue;

  if (jv <= 0) {
    return { market: 0, low: 0, high: 0, method: "assessed", confidence: "low", compCount: 0, notes: ["Tax roll shows no just value. Treat value as unknown."] };
  }

  const levels: [string, Comp[] | undefined][] = [
    ["same appraiser neighborhood", p.neighborhood ? idx.byNeighborhood.get(`${p.countyCode}|${group}|${p.neighborhood}`) : undefined],
    ["same census tract", tractOf(p.censusBlock) ? idx.byTract.get(`${p.countyCode}|${group}|${tractOf(p.censusBlock)}`) : undefined],
    ["same ZIP code", p.situsZip ? idx.byZip.get(`${p.countyCode}|${group}|${p.situsZip}`) : undefined],
    ["same city", p.situsCity ? idx.byCity.get(`${p.countyCode}|${group}|${p.situsCity.toUpperCase()}`) : undefined],
  ];

  for (const [label, list] of levels) {
    const comps = (list ?? []).filter((c) => c.parcelKey !== p.parcelKey);
    if (comps.length < v.minCompsForMedium) continue;
    const recent = [...comps].sort((x, y) => y.year - x.year).slice(0, v.maxCompsUsed);
    const ratios = recent.map((c) => c.price / c.justValue);
    const mid = median(ratios);
    let confidence: ValueEstimate["confidence"] = recent.length >= v.minCompsForHigh && label !== "same city" ? "high" : "medium";
    // Many sales that disagree with each other are not high confidence. Spread = middle half range / median.
    const spread = (quantile(ratios, 0.75) - quantile(ratios, 0.25)) / mid;
    notes.push(`${recent.length} arm's length sales of similar property in the ${label} sold at a median of ${mid.toFixed(2)}x their assessed just value.`);
    if (spread > v.maxSpreadForMedium) {
      confidence = "low";
      notes.push(`Those sales disagree a lot (middle half from ${quantile(ratios, 0.25).toFixed(2)}x to ${quantile(ratios, 0.75).toFixed(2)}x), so the value is a guess.`);
    } else if (spread > v.maxSpreadForHigh && confidence === "high") {
      confidence = "medium";
      notes.push(`Those sales are spread out (middle half from ${quantile(ratios, 0.25).toFixed(2)}x to ${quantile(ratios, 0.75).toFixed(2)}x), so confidence is medium.`);
    }
    return {
      market: round(jv * mid, 100),
      low: round(jv * quantile(ratios, 0.25), 100),
      high: round(jv * quantile(ratios, 0.75), 100),
      method: "comps_ratio",
      confidence,
      compCount: recent.length,
      notes,
    };
  }

  // Same tests as comps: arm's length, recent, same vacant/improved state, sane ratio to just value.
  const own = p.sales.find((s) => saleUsable(s, isVacantGroup(group), jv, a, today));
  if (own) {
    notes.push(`Only its own arm's length sale (${own.year}) to go on. Few or no nearby comparable sales.`);
    return {
      market: round(own.price, 100),
      low: round(Math.min(own.price, jv) * 0.9, 100),
      high: round(Math.max(own.price, jv / v.jvToMarketRatio), 100),
      method: "own_sale",
      confidence: "low",
      compCount: 0,
      notes,
    };
  }

  notes.push(`No usable comparable sales found. Estimate is assessed just value divided by ${v.jvToMarketRatio}. Check real sales before trusting it.`);
  return {
    market: round(jv / v.jvToMarketRatio, 100),
    low: round(jv * 0.8, 100),
    high: round(jv / 0.7, 100),
    method: "assessed",
    confidence: "low",
    compCount: 0,
    notes,
  };
}
