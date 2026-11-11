// Read a county list (Lands Available or an auction list) in whatever shape the
// county gives it: a CSV/spreadsheet export with headers, or plain text copied
// out of a PDF or web page. Parcel numbers are matched against the tax roll
// later, so formatting differences (dashes, dots, spaces) do not matter.

import { parseCsvText } from "./csv.ts";
import type { ListingChannel } from "./types.ts";

export interface RawListing {
  channel: ListingChannel;
  candidateKeys: string[]; // normalized possible parcel ids, best guess first
  openingBid?: number;
  quotedTotal?: number;
  caseNumber?: string;
  saleDate?: string;
  sourceLine: string;
}

export function normKey(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseMoney(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  let m = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return iso(y, +m[1], +m[2]);
  }
  return undefined;
}

function iso(y: number, mo: number, d: number): string | undefined {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const HEADER_HINTS: Record<string, RegExp> = {
  parcel: /^(PARCEL|PARCEL_?ID|PARCEL_?(NO|NUM|NUMBER)|PARCEL_?#|FOLIO|STRAP|PIN|APN|RE_?#?|RE_?NUMBER|ACCOUNT|ACCOUNT_?(NO|NUMBER)|ALT_?KEY|ALTERNATE_?KEY|PROPERTY_?ID|TAX_?ID)$/,
  bid: /(OPENING|MINIMUM|MIN|OPEN|STARTING|START)_?BID|^BID$|^AMOUNT$|^OPENING$|^PRICE$/,
  quote: /(QUOTE|STATEMENT|TOTAL_?DUE|AMOUNT_?DUE|PURCHASE_?PRICE|PAYOFF)/,
  caseNo: /(CASE|TAX_?DEED|TD_?(NO|NUM|NUMBER|#)|CERT|APPLICATION|FILE)/,
  date: /(SALE_?DATE|AUCTION_?DATE|DATE_?(OF_)?SALE|LIST(ED)?_?DATE|DATE)/,
};

function findCol(header: string[], key: keyof typeof HEADER_HINTS): number {
  return header.findIndex((h) => HEADER_HINTS[key].test(h));
}

/** Parse a list. Uses headers when they are recognizable, otherwise scans text line by line. */
export function parseListing(text: string, channel: ListingChannel): RawListing[] {
  const rows = parseCsvText(text);
  if (rows.length >= 2) {
    const header = rows[0].map((h) => h.trim().toUpperCase().replace(/[\s.]+/g, "_"));
    const pc = findCol(header, "parcel");
    if (pc >= 0) {
      const bc = findCol(header, "bid");
      const qc = findCol(header, "quote");
      const cc = findCol(header, "caseNo");
      const dc = findCol(header, "date");
      const out: RawListing[] = [];
      for (const r of rows.slice(1)) {
        const id = (r[pc] ?? "").trim();
        if (!id) continue;
        out.push({
          channel,
          candidateKeys: [normKey(id)],
          openingBid: bc >= 0 ? parseMoney(r[bc]) : undefined,
          quotedTotal: qc >= 0 && qc !== bc ? parseMoney(r[qc]) : undefined,
          caseNumber: cc >= 0 ? (r[cc] ?? "").trim() || undefined : undefined,
          saleDate: dc >= 0 ? parseDate(r[dc]) : undefined,
          sourceLine: r.join(" | "),
        });
      }
      return out;
    }
  }
  return parseListingText(text, channel);
}

const CASE_RE = /\b(\d{2,4}[- ]?TD[- ]?\d{2,8}|TD[- ]?\d{2,4}[- ]?\d{1,8})\b/i;
const MONEY_RE = /\$\s?([\d,]+(?:\.\d{2})?)|\b(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})\b/;

/** Free text: every line that has something shaped like a parcel number becomes a listing. */
export function parseListingText(text: string, channel: ListingChannel): RawListing[] {
  const out: RawListing[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const caseMatch = line.match(CASE_RE);
    let rest = caseMatch ? line.replace(caseMatch[0], " ") : line;
    const date = parseDate(rest);
    rest = rest.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ");
    const moneyMatch = rest.match(MONEY_RE);
    const amount = moneyMatch ? parseMoney(moneyMatch[1] ?? moneyMatch[2]) : undefined;
    if (moneyMatch) rest = rest.replace(moneyMatch[0], " ");
    const candidates = parcelCandidates(rest);
    if (!candidates.length) continue;
    out.push({
      channel,
      candidateKeys: candidates,
      openingBid: amount,
      caseNumber: caseMatch ? caseMatch[0] : undefined,
      saleDate: date,
      sourceLine: line.trim(),
    });
  }
  return out;
}

/** Tokens, and runs of adjacent tokens joined, that contain at least 6 digits. */
export function parcelCandidates(s: string): string[] {
  const tokens = s.split(/\s+/).filter((t) => /^[A-Za-z0-9][A-Za-z0-9.\-/]*$/.test(t) && /\d/.test(t));
  const out = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    let joined = "";
    for (let j = i; j < Math.min(tokens.length, i + 6); j++) {
      joined += tokens[j];
      const k = normKey(joined);
      if ((k.match(/\d/g) ?? []).length >= 6 && k.length <= 30) out.add(k);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}
