// Backtest: compare what the model would have said about past tax deed auctions
// with what those parcels actually sold for. Input is a results file the user
// collects from the county auction site (CSV, or text copied from the results page).
// Nothing here goes online; it only reads files.

import { parseCsvText } from "./core/csv.ts";
import { normKey, parseDate } from "./core/listings.ts";
import type { RawListing } from "./core/listings.ts";
import { typeBucket, type Outcome, type TypeBucket } from "./core/competition.ts";
import type { Analysis } from "./core/types.ts";
import { median, money, pct } from "./core/stats.ts";

export interface PastSale {
  parcelId: string;
  winningBid?: number; // undefined when not sold (canceled, redeemed, no bid)
  openingBid?: number;
  saleDate?: string;
  soldTo?: string;
  status: "sold" | "not_sold";
  sourceLine: string;
}

const PARCEL = /^(PARCEL|PARCEL_?ID|PARCEL_?(NO|NUM|NUMBER)|FOLIO|STRAP|PIN|APN|ALT_?KEY|ACCOUNT|PROPERTY_?ID)$/;
const WIN = /^(WINNING_?BID|WINNING_?AMOUNT|SOLD_?AMOUNT|SALE_?AMOUNT|SALE_?PRICE|AMOUNT_?SOLD|SOLD_?FOR|FINAL_?BID|HIGH_?BID|AMOUNT)$/;
const OPEN = /^(OPENING_?BID|MINIMUM_?BID|OPEN_?BID|STARTING_?BID)$/;
const DATE = /^(SALE_?DATE|AUCTION_?DATE|DATE_?SOLD|DATE)$/;
const STATUS = /^(STATUS|RESULT|AUCTION_?STATUS)$/;
const SOLD_TO = /^(SOLD_?TO|BUYER|WINNER)$/;

function money2(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Parse a whole money field ("$45,100.00", "1234.5"). Negative, empty or malformed gives undefined. */
export function parseAmount(field: string | undefined): number | undefined {
  if (!field) return undefined;
  const m = field.trim().match(/^\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function notSoldStatus(s: string): boolean {
  return /cancel|redeem|withdraw|no ?bid|not ?sold|postpon|bankrupt/i.test(s);
}

/** CSV with headers, or text copied from an auction results page (one block per item). */
export function parsePastSales(text: string): PastSale[] {
  const rows = parseCsvText(text);
  if (rows.length >= 2) {
    const h = rows[0].map((x) => x.trim().toUpperCase().replace(/[\s.#]+/g, "_").replace(/_+$/, ""));
    const pc = h.findIndex((x) => PARCEL.test(x));
    const wc = h.findIndex((x) => WIN.test(x));
    if (pc >= 0 && wc >= 0) {
      const oc = h.findIndex((x) => OPEN.test(x));
      const dc = h.findIndex((x) => DATE.test(x));
      const sc = h.findIndex((x) => STATUS.test(x));
      const tc = h.findIndex((x) => SOLD_TO.test(x));
      return rows.slice(1).filter((r) => (r[pc] ?? "").trim()).map((r) => {
        const status = sc >= 0 && notSoldStatus(r[sc] ?? "") ? "not_sold" : "sold";
        const win = money2(r[wc]);
        return {
          parcelId: r[pc].trim(),
          winningBid: status === "sold" ? win : undefined,
          openingBid: oc >= 0 ? money2(r[oc]) : undefined,
          saleDate: dc >= 0 ? parseDate(r[dc]) : undefined,
          soldTo: tc >= 0 ? (r[tc] ?? "").trim() || undefined : undefined,
          status: status === "sold" && win !== undefined ? "sold" : "not_sold",
          sourceLine: r.join(" | "),
        };
      });
    }
  }
  if (text.split(/\r?\n/).some((l) => NUMBERED_ITEM.test(l))) return parseNumberedResults(text);
  return parseResultBlocks(text);
}

const NUMBERED_ITEM = /^\s*\d+\.\s.*\bParcel\s+\S/i;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * One line per item, grouped under day headings, the way Muse records a results page:
 *   ## Tuesday, November 3, 2026 (10 parcels; 3 sold, 7 redeemed)
 *   3. Case ..., Parcel 04-19-24-000200008500, ADDRESS, Opening Bid $1,889.31 — SOLD 11/03/2026 11:18 AM ET, $3,900.00, to 3rd Party Bidder
 *   1. Case ..., Parcel 06-18-24-039000018740, ADDRESS, Opening Bid $12,147.07 — Redeemed
 * Lines starting with # are notes. A sale date on the SOLD part wins over the heading date.
 */
export function parseNumberedResults(text: string): PastSale[] {
  const out: PastSale[] = [];
  let dayDate: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^#{1,6}\s+(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    if (heading) {
      const m = MONTHS.indexOf(heading[1].toLowerCase());
      if (m >= 0) dayDate = `${heading[3]}-${String(m + 1).padStart(2, "0")}-${heading[2].padStart(2, "0")}`;
      continue;
    }
    if (!NUMBERED_ITEM.test(line)) continue;
    const parcel = line.match(/\bParcel\s+([A-Za-z0-9][A-Za-z0-9.\-]*)/i)?.[1];
    if (!parcel) continue;
    const opening = parseAmount(line.match(/\bOpening Bid\s+(\$?[0-9][0-9,]*(?:\.[0-9]+)?)/i)?.[1]);
    // The result is whatever follows the last dash separator ("—", "–" or " - ").
    const parts = line.split(/\s[\u2014\u2013-]\s/);
    const resultPart = parts.length > 1 ? parts[parts.length - 1].trim() : "";
    const sold = resultPart.match(/^SOLD\b\s*(\d{1,2}\/\d{1,2}\/\d{2,4})?[^$]*?(\$[0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:,\s*to\s+(.+))?$/i);
    const winning = sold ? parseAmount(sold[2]) : undefined;
    const status: PastSale["status"] = sold && winning !== undefined && !notSoldStatus(resultPart) ? "sold" : "not_sold";
    out.push({
      parcelId: parcel,
      winningBid: status === "sold" ? winning : undefined,
      openingBid: opening,
      saleDate: (sold?.[1] ? parseDate(sold[1]) : undefined) ?? dayDate,
      soldTo: sold?.[3]?.trim(),
      status,
      sourceLine: line,
    });
  }
  return out;
}

/**
 * Text copied from an online auction results page. Each item starts with an
 * "Auction Sold" / "Auction Status" style line and carries labeled fields like
 * "Amount $45,100.00", "Sold To 3rd Party Bidder", "Opening Bid $1,234.56",
 * "Parcel ID 12-19-26-...". Labels may be on the same line as the value or the line before.
 */
export function parseResultBlocks(text: string): PastSale[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (/^auction (sold|status|canceled|cancelled|redeemed)\b/i.test(l)) starts.push(i);
  });
  const out: PastSale[] = [];
  starts.forEach((s, k) => {
    const block = lines.slice(s, starts[k + 1] ?? lines.length);
    const joined = block.join("\n");
    const field = (label: RegExp) => {
      for (let i = 0; i < block.length; i++) {
        const m = block[i].match(new RegExp(`^${label.source}\\s*:?\\s*(.*)$`, "i"));
        if (m) return (m[m.length - 1] || block[i + 1] || "").trim();
      }
      return undefined;
    };
    const parcel = field(/parcel(?: id| number| #)?/);
    if (!parcel) return;
    const header = block[0];
    const amount = parseAmount(field(/(?:amount|sold amount|winning bid)/));
    const notSold = notSoldStatus(header) || /status\s*:?\s*(canceled|cancelled|redeemed)/i.test(joined);
    out.push({
      parcelId: parcel.split(/\s{2,}/)[0],
      winningBid: notSold ? undefined : amount,
      openingBid: parseAmount(field(/(?:opening bid|final judgment amount)/)),
      saleDate: parseDate(joined),
      soldTo: field(/sold to/),
      status: !notSold && amount !== undefined ? "sold" : "not_sold",
      sourceLine: block.join(" / "),
    });
  });
  return out;
}

export function pastSalesToListings(sales: PastSale[]): RawListing[] {
  return sales.map((s) => ({
    channel: "auction",
    candidateKeys: [normKey(s.parcelId)],
    openingBid: s.openingBid,
    saleDate: s.saleDate,
    sourceLine: s.sourceLine,
  }));
}

export interface BacktestRow {
  parcelId: string;
  saleDate: string;
  county: string;
  bucket: TypeBucket;
  value: number;
  confidence: string;
  opening?: number;
  expected: number;
  modelMax: number; // highest bid the model's deal math allows (no budget applied)
  actual: number;
  soldTo?: string;
  actualRatio: number; // actual / value
  call: "right" | "model_high" | "model_low"; // expected price vs actual within +-20%
  ceilingMet: boolean; // model ceiling met or exceeded the recorded winning bid
  verdict: string;
}

export interface BacktestSummary {
  rows: BacktestRow[];
  sold: number;
  notSold: number;
  unmatched: number;
  valuationDates: string[];
  byGroup: { county: string; bucket: TypeBucket; n: number; actualMedianRatio: number; assumedRatio: number }[];
}

/** Event identity: one parcel can be auctioned more than once, so the sale date is part of it. */
export const eventKey = (county: string, parcelId: string, date: string) => `${county}|${normKey(parcelId)}|${date}`;

/**
 * One row per sold sale event. Each event is matched to the analysis of its
 * parcel (by the exact list line it came from), and the expected price is
 * worked out from that event's own opening bid.
 */
export function summarize(
  analyses: Analysis[],
  sales: PastSale[],
  assumed: (county: string, bucket: TypeBucket) => number,
): BacktestRow[] {
  const rows: BacktestRow[] = [];
  for (const s of sales) {
    if (s.status !== "sold" || !s.winningBid) continue;
    const a = analyses.find((x) => (x.listing.sourceLine ?? "").split(" || ").includes(s.sourceLine));
    if (!a || a.value.market <= 0) continue;
    const bucket = typeBucket(a.parcel);
    const expected = Math.max(s.openingBid ?? 0, Math.round(a.value.market * assumed(a.parcel.countyCode, bucket)));
    const actual = s.winningBid;
    const modelMax = a.best ? a.best.maxPrice : 0;
    rows.push({
      parcelId: a.parcel.parcelId,
      saleDate: s.saleDate ?? "",
      county: a.parcel.countyCode,
      bucket,
      value: a.value.market,
      confidence: a.value.confidence,
      opening: s.openingBid,
      expected,
      modelMax,
      actual,
      soldTo: s.soldTo,
      actualRatio: actual / a.value.market,
      call: actual > expected * 1.2 ? "model_low" : actual < expected * 0.8 ? "model_high" : "right",
      ceilingMet: modelMax > 0 && modelMax >= actual,
      verdict: a.verdict,
    });
  }
  return rows;
}

export function groupRows(rows: BacktestRow[], assumed: (county: string, bucket: TypeBucket) => number): BacktestSummary["byGroup"] {
  const groups = new Map<string, BacktestRow[]>();
  for (const r of rows) groups.set(`${r.county}|${r.bucket}`, [...(groups.get(`${r.county}|${r.bucket}`) ?? []), r]);
  return [...groups.entries()].map(([k, rs]) => {
    const [county, bucket] = k.split("|") as [string, TypeBucket];
    return { county, bucket, n: rs.length, actualMedianRatio: median(rs.map((r) => r.actualRatio)), assumedRatio: assumed(county, bucket) };
  });
}

export interface RecordPlan {
  add: BacktestRow[];
  duplicates: number;
  conflicts: string[];
  skippedLowConfidence: number;
}

/**
 * Decide which rows to append to the outcomes file. Same event (county, parcel,
 * date) with the same price already recorded: skipped. Same event with a
 * different price: a conflict, reported and not written. Low confidence values
 * are skipped unless asked, so guessed values do not move the calibration.
 */
export function planRecord(rows: BacktestRow[], existingCsv: string, includeLowConfidence: boolean): RecordPlan {
  const existing = new Map<string, number>();
  for (const line of existingCsv.split(/\r?\n/).slice(1)) {
    const c = line.split(",");
    if (c.length < 6) continue;
    existing.set(eventKey(c[1], c[2], c[0]), Number(c[5]));
  }
  const plan: RecordPlan = { add: [], duplicates: 0, conflicts: [], skippedLowConfidence: 0 };
  for (const r of rows) {
    if (r.confidence === "low" && !includeLowConfidence) {
      plan.skippedLowConfidence++;
      continue;
    }
    const k = eventKey(r.county, r.parcelId, r.saleDate);
    const prev = existing.get(k);
    if (prev === undefined) {
      existing.set(k, r.actual);
      plan.add.push(r);
    } else if (prev === r.actual) {
      plan.duplicates++;
    } else {
      plan.conflicts.push(`${r.parcelId} on ${r.saleDate || "unknown date"}: already recorded at ${money(prev)}, new result says ${money(r.actual)}`);
    }
  }
  return plan;
}

export function renderBacktest(sum: BacktestSummary, title: string, countyName: (code: string) => string): string {
  const L: string[] = [`# ${title}`, ""];
  const n = sum.rows.length;
  const right = sum.rows.filter((r) => r.call === "right").length;
  const low = sum.rows.filter((r) => r.call === "model_low").length;
  const high = sum.rows.filter((r) => r.call === "model_high").length;
  const met = sum.rows.filter((r) => r.ceilingMet).length;
  L.push(`Past results read: ${sum.sold} sold, ${sum.notSold} not sold (canceled, redeemed or no bid). Compared: ${n} sale events found in the tax roll with a value. ${sum.unmatched} result line(s) not matched to the tax roll.`, "");
  if (!n) {
    L.push("Nothing to compare.");
    return L.join("\n");
  }
  L.push("## Expected price vs actual winning bid", "");
  L.push(`| Call | Count | Share |`, `|---|---|---|`);
  L.push(`| Right (actual within 20% of expected) | ${right} | ${pct(right / n)} |`);
  L.push(`| Model low (bidding went more than 20% higher) | ${low} | ${pct(low / n)} |`);
  L.push(`| Model high (sold more than 20% lower) | ${high} | ${pct(high / n)} |`, "");
  L.push(`Model ceiling met or exceeded the recorded winning bid in ${met} of ${n} (${pct(met / n)}). The ceiling is the deal math with no budget applied; meeting it does not prove a bid would have won (bid increments and other bidders are not modeled).`, "");
  L.push("## Actual price as a share of estimated value, by county and type", "");
  L.push("| County | Type | Sales | Actual median | Model assumed |", "|---|---|---|---|---|");
  for (const g of [...sum.byGroup].sort((a, b) => b.n - a.n)) {
    L.push(`| ${countyName(g.county)} | ${g.bucket} | ${g.n} | ${pct(g.actualMedianRatio)} | ${pct(g.assumedRatio)} |`);
  }
  L.push("", "## Every sale", "", "| Parcel | Sale date | Type | Value | Conf. | Opening | Expected | Model ceiling | Actual | Actual / value | Call | Sold to |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of [...sum.rows].sort((a, b) => b.actualRatio - a.actualRatio)) {
    L.push(`| ${r.parcelId} | ${r.saleDate || "n/a"} | ${r.bucket} | ${money(r.value)} | ${r.confidence} | ${r.opening ? money(r.opening) : "n/a"} | ${money(r.expected)} | ${money(r.modelMax)} | ${money(r.actual)} | ${pct(r.actualRatio)} | ${r.call.replace("_", " ")} | ${r.soldTo ?? ""} |`);
  }
  L.push(
    "",
    "## Limits",
    "",
    `- Each sale was valued as of its own sale date (${sum.valuationDates.length} date(s): ${sum.valuationDates.join(", ") || "none"}). Comparable sales dated after that day are excluded, but the just values come from the current tax roll, which can include changes made after the auction.`,
    "- Expected price uses the model's starting ratios, not calibration, so this report measures the uncalibrated model.",
    "- Low confidence values are shown here but are not recorded for calibration unless --include-low-confidence is given.",
  );
  return L.join("\n");
}
