// Read a county list (Lands Available or an auction list) in whatever shape the
// county gives it: a CSV/spreadsheet export with headers, or plain text copied
// out of a PDF or web page. Parcel numbers are matched against the tax roll
// later, so formatting differences (dashes, dots, spaces) do not matter.

import { parseCsvText } from "./csv.ts";
import type { ListingChannel } from "./types.ts";

export interface RawListing {
  channel: ListingChannel;
  candidateKeys: string[]; // normalized possible parcel ids, longest first
  openingBid?: number;
  quotedTotal?: number;
  caseNumber?: string;
  saleDate?: string;
  /** Free text only: plain numbers (no $ or cents) seen on the line. Resolved after the parcel is known. */
  looseNumbers?: { token: string; value: number }[];
  sourceLine: string;
  sourceFile?: string;
}

export class ListingError extends Error {}

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

// Only specific names are trusted. A bare AMOUNT, PRICE, TOTAL or DATE column
// could mean several things (opening bid, total due, update date), so it is an
// error unless a specific column for that role also exists.
const HEADER_HINTS = {
  parcel: /^(PARCEL|PARCEL_?ID|PARCEL_?(NO|NUM|NUMBER)|PARCEL_?#|FOLIO|STRAP|PIN|APN|RE_?#?|RE_?NUMBER|ACCOUNT|ACCOUNT_?(NO|NUMBER)|ALT_?KEY|ALTERNATE_?KEY|PROPERTY_?ID|TAX_?ID)$/,
  bid: /^(OPENING|MINIMUM|MIN|OPEN|STARTING|START)_?BID(_?AMOUNT)?$|^BID$|^OPENING$/,
  quote: /^(QUOTE|QUOTED_?TOTAL|STATEMENT|STATEMENT_?TOTAL|STATEMENT_?AMOUNT|PURCHASE_?PRICE|PAYOFF|PAYOFF_?AMOUNT)$/,
  caseNo: /(CASE|TAX_?DEED|TD_?(NO|NUM|NUMBER|#)|CERT|APPLICATION)/,
  // Most specific first: the first pattern that matches any column wins.
  date: [/^(SALE|AUCTION)_?DATE$/, /^DATE_?(OF_)?(SALE|AUCTION)$/, /^(DATE_?OFFERED|OFFERED_?DATE|DATE_?LISTED|LIST(ED)?_?DATE)$/],
};
const AMBIGUOUS_MONEY = /^(AMOUNT|PRICE|TOTAL|TOTAL_?DUE|AMOUNT_?DUE|BALANCE|DUE)$/;
const AMBIGUOUS_DATE = /^DATE$/;

function findCol(header: string[], re: RegExp): number {
  return header.findIndex((h) => re.test(h));
}

function findDateCol(header: string[]): number {
  for (const re of HEADER_HINTS.date) {
    const i = findCol(header, re);
    if (i >= 0) return i;
  }
  return -1;
}

/** Parse a list. Uses headers when they are recognizable, otherwise scans text line by line. */
export function parseListing(text: string, channel: ListingChannel, sourceFile?: string): RawListing[] {
  const rows = parseCsvText(text);
  if (rows.length >= 2) {
    const header = rows[0].map((h) => h.trim().toUpperCase().replace(/[\s.]+/g, "_"));
    const pc = findCol(header, HEADER_HINTS.parcel);
    if (pc >= 0) {
      const bc = findCol(header, HEADER_HINTS.bid);
      const qc = findCol(header, HEADER_HINTS.quote);
      const cc = findCol(header, HEADER_HINTS.caseNo);
      const dc = findDateCol(header);
      const where = sourceFile ? ` in ${sourceFile}` : "";
      const vague = header.filter((h) => AMBIGUOUS_MONEY.test(h));
      if (vague.length && bc < 0 && qc < 0) {
        throw new ListingError(`Column "${vague[0]}"${where} could be an opening bid or a total due. Rename it to "Opening Bid" (auction or list price before later taxes) or "Statement Total" (the clerk's full payoff), then run again.`);
      }
      if (dc < 0 && header.some((h) => AMBIGUOUS_DATE.test(h))) {
        throw new ListingError(`Column "DATE"${where} is not clear. Rename it to "Sale Date" (auction date) or "Date Offered" (date it went on the Lands Available list), then run again.`);
      }
      const out: RawListing[] = [];
      for (const r of rows.slice(1)) {
        const id = (r[pc] ?? "").trim();
        if (!id) continue;
        out.push({
          channel,
          candidateKeys: [normKey(id)],
          openingBid: bc >= 0 ? parseMoney(r[bc]) : undefined,
          quotedTotal: qc >= 0 ? parseMoney(r[qc]) : undefined,
          caseNumber: cc >= 0 ? (r[cc] ?? "").trim() || undefined : undefined,
          saleDate: dc >= 0 ? parseDate(r[dc]) : undefined,
          sourceLine: r.join(" | "),
          sourceFile,
        });
      }
      return out;
    }
  }
  return parseListingText(text, channel, sourceFile);
}

const CASE_RE = /\b(\d{2,4}[- ]?TD[- ]?\d{2,8}|TD[- ]?\d{2,4}[- ]?\d{1,8})\b/i;
const MONEY_RE = /\$\s?([\d,]+(?:\.\d{2})?)|\b(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})\b/;
const DATE_RE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g;

/** Free text: every line that has something shaped like a parcel number becomes a listing. */
export function parseListingText(text: string, channel: ListingChannel, sourceFile?: string): RawListing[] {
  const out: RawListing[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const caseMatch = line.match(CASE_RE);
    let rest = caseMatch ? line.replace(caseMatch[0], " ") : line;
    const date = parseDate(rest);
    rest = rest.replace(DATE_RE, " ");
    const moneyMatch = rest.match(MONEY_RE);
    const amount = moneyMatch ? parseMoney(moneyMatch[1] ?? moneyMatch[2]) : undefined;
    if (moneyMatch) rest = rest.replace(moneyMatch[0], " ");
    const candidates = parcelCandidates(rest);
    if (!candidates.length) continue;
    // Plain whole numbers (like "5000") might be the bid or might be a piece of
    // the parcel number. Keep them aside; the engine decides once it knows the parcel.
    const looseNumbers = amount === undefined
      ? rest.split(/\s+/).filter((t) => /^[1-9]\d{2,6}$/.test(t)).map((t) => ({ token: t, value: Number(t) }))
      : [];
    out.push({
      channel,
      candidateKeys: candidates,
      openingBid: amount,
      caseNumber: caseMatch ? caseMatch[0] : undefined,
      saleDate: date,
      looseNumbers: looseNumbers.length ? looseNumbers : undefined,
      sourceLine: line.trim(),
      sourceFile,
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

/**
 * After the parcel is known: a plain number counts as the amount only if it is
 * not part of the matched parcel number and it is the only such number left.
 */
export function resolveLooseAmount(raw: RawListing, matchedKey: string): number | undefined {
  const left = (raw.looseNumbers ?? []).filter((n) => !matchedKey.includes(n.token) && n.value >= 100);
  return left.length === 1 ? left[0].value : undefined;
}
