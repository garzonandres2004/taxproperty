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
  return parseResultBlocks(text);
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
    const amount = money2(field(/(?:amount|sold amount|winning bid)/)?.match(/[\d,]+(?:\.\d{2})?/)?.[0]);
    const notSold = notSoldStatus(header) || /status\s*:?\s*(canceled|cancelled|redeemed)/i.test(joined);
    out.push({
      parcelId: parcel.split(/\s{2,}/)[0],
      winningBid: notSold ? undefined : amount,
      openingBid: money2(field(/(?:opening bid|final judgment amount)/)?.match(/[\d,]+(?:\.\d{2})?/)?.[0]),
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
  county: string;
  bucket: TypeBucket;
  value: number;
  confidence: string;
  opening?: number;
  expected: number;
  modelMax: number; // most the model would have bid (deal ceiling, no budget)
  actual: number;
  soldTo?: string;
  actualRatio: number; // actual / value
  call: "right" | "model_high" | "model_low"; // expected price vs actual within +-20%
  wouldHaveWon: boolean; // model max >= actual
  verdict: string;
}

export interface BacktestSummary {
  rows: BacktestRow[];
  sold: number;
  notSold: number;
  unmatched: number;
  byGroup: { county: string; bucket: TypeBucket; n: number; actualMedianRatio: number; assumedRatio: number }[];
}

export function summarize(analyses: Analysis[], sales: PastSale[], assumed: (county: string, bucket: TypeBucket) => number): BacktestSummary {
  const byKey = new Map(sales.map((s) => [normKey(s.parcelId), s]));
  const rows: BacktestRow[] = [];
  for (const a of analyses) {
    const s = byKey.get(a.parcel.parcelKey) ?? [...byKey.values()].find((x) => a.listing.sourceLine?.includes(x.sourceLine));
    if (!s || s.status !== "sold" || !s.winningBid || a.value.market <= 0) continue;
    const expected = a.competition.expectedClearing;
    const actual = s.winningBid;
    const call = actual > expected * 1.2 ? "model_low" : actual < expected * 0.8 ? "model_high" : "right";
    rows.push({
      parcelId: a.parcel.parcelId,
      county: a.parcel.countyCode,
      bucket: typeBucket(a.parcel),
      value: a.value.market,
      confidence: a.value.confidence,
      opening: s.openingBid,
      expected,
      modelMax: a.best ? a.best.maxPrice : 0,
      actual,
      soldTo: s.soldTo,
      actualRatio: actual / a.value.market,
      call,
      wouldHaveWon: !!a.best && a.best.maxPrice >= actual,
      verdict: a.verdict,
    });
  }
  const groups = new Map<string, BacktestRow[]>();
  for (const r of rows) groups.set(`${r.county}|${r.bucket}`, [...(groups.get(`${r.county}|${r.bucket}`) ?? []), r]);
  const byGroup = [...groups.entries()].map(([k, rs]) => {
    const [county, bucket] = k.split("|") as [string, TypeBucket];
    return { county, bucket, n: rs.length, actualMedianRatio: median(rs.map((r) => r.actualRatio)), assumedRatio: assumed(county, bucket) };
  });
  return {
    rows,
    sold: sales.filter((s) => s.status === "sold").length,
    notSold: sales.filter((s) => s.status !== "sold").length,
    unmatched: 0,
    byGroup,
  };
}

export function toOutcomes(rows: BacktestRow[]): (Outcome & { parcelId: string; date: string })[] {
  return rows.map((r) => ({ countyCode: r.county, bucket: r.bucket, estMarket: r.value, winningBid: r.actual, parcelId: r.parcelId, date: "" }));
}

export function renderBacktest(sum: BacktestSummary, title: string): string {
  const L: string[] = [`# ${title}`, ""];
  const n = sum.rows.length;
  const right = sum.rows.filter((r) => r.call === "right").length;
  const low = sum.rows.filter((r) => r.call === "model_low").length;
  const high = sum.rows.filter((r) => r.call === "model_high").length;
  const won = sum.rows.filter((r) => r.wouldHaveWon).length;
  L.push(`Past results read: ${sum.sold} sold, ${sum.notSold} not sold (canceled, redeemed or no bid). Compared: ${n} sold parcels found in the tax roll with a value.`, "");
  if (!n) {
    L.push("Nothing to compare.");
    return L.join("\n");
  }
  L.push("## Expected price vs actual winning bid", "");
  L.push(`| Call | Count | Share |`, `|---|---|---|`);
  L.push(`| Right (actual within 20% of expected) | ${right} | ${pct(right / n)} |`);
  L.push(`| Model low (bidding went more than 20% higher) | ${low} | ${pct(low / n)} |`);
  L.push(`| Model high (sold more than 20% lower) | ${high} | ${pct(high / n)} |`, "");
  L.push(`The model's max bid would have won ${won} of ${n} (${pct(won / n)}). Max bid here is the deal ceiling with no budget applied.`, "");
  L.push("## Actual price as a share of estimated value, by county and type", "");
  L.push("| County | Type | Sales | Actual median | Model assumed |", "|---|---|---|---|---|");
  for (const g of sum.byGroup.sort((a, b) => b.n - a.n)) {
    L.push(`| ${g.county} | ${g.bucket} | ${g.n} | ${pct(g.actualMedianRatio)} | ${pct(g.assumedRatio)} |`);
  }
  L.push("", "## Every sale", "", "| Parcel | Type | Value | Conf. | Opening | Expected | Model max | Actual | Actual / value | Call | Sold to |", "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of [...sum.rows].sort((a, b) => b.actualRatio - a.actualRatio)) {
    L.push(`| ${r.parcelId} | ${r.bucket} | ${money(r.value)} | ${r.confidence} | ${r.opening ? money(r.opening) : "n/a"} | ${money(r.expected)} | ${money(r.modelMax)} | ${money(r.actual)} | ${pct(r.actualRatio)} | ${r.call.replace("_", " ")} | ${r.soldTo ?? ""} |`);
  }
  L.push("", "Values are today's tax roll estimates, so older sales compare against newer values. Treat ratios from sales more than a year old as rough.");
  return L.join("\n");
}
