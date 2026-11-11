// Florida pipeline:
//   pass 1  read the NAL tax roll, pick out the parcels on the county list
//   pass 2  read it again, collect comparable sales and nearby owners
//   then    value, costs, risk, strategies, competition, score, verdict

import type { Assumptions } from "../core/assumptions.ts";
import { readCsvRecords, normalizeHeader, recordToObject } from "../core/csv.ts";
import type { Analysis, Listing, Parcel, RiskFlag, Settings, StrategyResult } from "../core/types.ts";
import type { RawListing } from "../core/listings.ts";
import { addComp, compsFromParcel, emptyCompIndex, estimateValue, type CompIndex } from "../core/valuation.ts";
import { createNeighborFinder } from "../core/neighbors.ts";
import { buildStrategies, meetsTargets, pickBest } from "../core/strategies.ts";
import { assessCompetition, type Calibration } from "../core/competition.ts";
import { money, pct } from "../core/stats.ts";
import { isNalHeader, nalRowToParcel, parcelKey } from "./nal.ts";
import { flCounty } from "./counties.ts";
import { auctionCosts, landsAvailableCosts, maxBidForAllIn } from "./costs.ts";
import { floridaRiskFlags } from "./risk.ts";

export interface RunInput {
  nalPaths: string[];
  listings: RawListing[];
  settings: Settings;
  a: Assumptions;
  calibration: Calibration;
  today: Date;
}

export interface RunResult {
  analyses: Analysis[];
  unmatched: RawListing[];
  parcelsScanned: number;
  compsFound: number;
  referenceYear: number;
}

async function* scanNal(paths: string[]): AsyncGenerator<Record<string, string>> {
  for (const path of paths) {
    let header: string[] | null = null;
    for await (const rec of readCsvRecords(path)) {
      if (!header) {
        header = normalizeHeader(rec);
        if (!isNalHeader(header)) throw new Error(`${path} does not look like a Florida NAL file (missing CO_NO, PARCEL_ID, DOR_UC or JV columns).`);
        continue;
      }
      yield recordToObject(header, rec);
    }
  }
}

function countyAllowed(code: string, settings: Settings): boolean {
  if (!settings.counties.length) return true;
  return settings.counties.some((c) => flCounty(c)?.code === code);
}

export async function runFlorida(input: RunInput): Promise<RunResult> {
  const { settings, a, today } = input;
  const opts = { qualifiedSaleCodes: a.valuation.qualifiedSaleCodes };

  // Index every candidate key so any one of them can match.
  const byKey = new Map<string, number[]>();
  input.listings.forEach((l, i) => l.candidateKeys.forEach((k) => byKey.set(k, [...(byKey.get(k) ?? []), i])));
  const matched = new Map<number, Parcel>();
  const matchedKeyLen = new Map<number, number>();

  // Pass 1: find listed parcels. Match on PARCEL_ID or ALT_KEY.
  let scanned = 0;
  let referenceYear = 0;
  for await (const row of scanNal(input.nalPaths)) {
    scanned++;
    const yr = Number(row.ASMNT_YR) || 0;
    if (yr > referenceYear) referenceYear = yr;
    const keys = [parcelKey(row.PARCEL_ID), parcelKey(row.ALT_KEY ?? "")].filter(Boolean);
    for (const k of keys) {
      for (const i of byKey.get(k) ?? []) {
        // Prefer the longest matching candidate (most specific) when a line had several.
        if ((matchedKeyLen.get(i) ?? 0) >= k.length) continue;
        const p = nalRowToParcel(row, opts);
        if (!countyAllowed(p.countyCode, settings)) continue;
        matched.set(i, p);
        matchedKeyLen.set(i, k.length);
      }
    }
  }
  if (!referenceYear) referenceYear = today.getFullYear();

  // Pass 2: comps and neighbors.
  const comps: CompIndex = emptyCompIndex();
  const finder = createNeighborFinder(a.neighbors);
  const subjectCounties = new Set<string>();
  for (const p of matched.values()) {
    finder.addSubject(p);
    subjectCounties.add(p.countyCode);
  }
  let compsFound = 0;
  if (matched.size) {
    for await (const row of scanNal(input.nalPaths)) {
      const p = nalRowToParcel(row, opts);
      if (!subjectCounties.has(p.countyCode)) continue;
      for (const c of compsFromParcel(p, a, referenceYear)) {
        addComp(comps, p.countyCode, c);
        compsFound++;
      }
      finder.offer(p);
    }
  }

  // Dedupe: the same parcel listed twice keeps the first listing.
  const seen = new Set<string>();
  const analyses: Analysis[] = [];
  const unmatched: RawListing[] = [];
  input.listings.forEach((raw, i) => {
    const parcel = matched.get(i);
    if (!parcel) {
      unmatched.push(raw);
      return;
    }
    if (seen.has(parcel.parcelKey)) return;
    seen.add(parcel.parcelKey);
    const listing: Listing = {
      channel: raw.channel,
      parcelId: parcel.parcelId,
      parcelKey: parcel.parcelKey,
      caseNumber: raw.caseNumber,
      openingBid: raw.openingBid,
      quotedTotal: raw.quotedTotal,
      saleDate: raw.saleDate,
      sourceLine: raw.sourceLine,
    };
    analyses.push(analyzeOne(parcel, listing, comps, finder.neighborsOf(parcel), input, referenceYear));
  });

  analyses.sort((x, y) => verdictRank(x.verdict) - verdictRank(y.verdict) || y.score - x.score);
  return { analyses, unmatched, parcelsScanned: scanned, compsFound, referenceYear };
}

function verdictRank(v: Analysis["verdict"]): number {
  return { buy_candidate: 0, needs_quote: 1, watch: 2, pass: 3, avoid: 4 }[v];
}

export function analyzeOne(
  parcel: Parcel,
  listing: Listing,
  comps: CompIndex,
  neighbors: Analysis["neighbors"],
  input: Pick<RunInput, "settings" | "a" | "calibration" | "today">,
  referenceYear: number,
): Analysis {
  const { settings, a, calibration, today } = input;
  const value = estimateValue(parcel, comps, a, referenceYear);
  const tier = flCounty(parcel.countyCode)?.tier ?? "small";
  const isAuction = listing.channel === "auction";
  const ceilingToPrice = isAuction ? (maxAllIn: number) => maxBidForAllIn(maxAllIn, a) : (maxAllIn: number) => maxAllIn;

  // First pass at strategies without a price: gives the most the user should pay.
  const ceilingOnly = buildStrategies({ parcel, value, neighbors, settings, a, allIn: null, ceilingToPrice });
  const bestCeiling = pickBest(ceilingOnly, settings);
  const budgetCeiling = isAuction ? maxBidForAllIn(settings.maxPerDeal, a) : settings.maxPerDeal;
  const competition = assessCompetition({ parcel, listing, value, tier, best: bestCeiling, budgetCeiling, a, calibration });

  // Price to evaluate at: the clerk quote or estimate for Lands Available;
  // the expected final bid for auctions (profit at the opening bid is a fantasy when others bid).
  let costs = null as ReturnType<typeof auctionCosts> | null;
  if (isAuction) {
    const evalPrice = Math.max(listing.openingBid ?? 0, competition.expectedClearing);
    costs = evalPrice > 0 ? auctionCosts(evalPrice, a) : null;
  } else {
    costs = landsAvailableCosts(listing, parcel, a, today);
  }
  const priceKnown = costs !== null;
  const strategies = priceKnown ? buildStrategies({ parcel, value, neighbors, settings, a, allIn: costs!.allIn, ceilingToPrice }) : ceilingOnly;
  const best = pickBest(strategies, settings);
  const flags = floridaRiskFlags({ parcel, listing, value, costs, a, today });

  const offer = makeOffer(listing, best, costs, settings, a);
  const verdict = decideVerdict({ flags, best, settings, priceKnown, competition, isAuction, offer });
  const score = scoreIt({ flags, best, competition, value, verdict });
  const why = explain({ parcel, listing, value, costs, best, competition, neighbors, flags, verdict, settings, offer });

  return { parcel, listing, value, costs, priceKnown, flags, competition, strategies, best, offer, neighbors, score, verdict, why };
}

function makeOffer(listing: Listing, best: StrategyResult | null, costs: Analysis["costs"], settings: Settings, a: Assumptions): Analysis["offer"] {
  const maxDealCeiling = listing.channel === "auction" ? maxBidForAllIn(settings.maxPerDeal, a) : settings.maxPerDeal;
  const targetCeiling = best ? best.maxPrice : 0;
  const ceiling = Math.min(targetCeiling, maxDealCeiling);
  const cappedByBudget = maxDealCeiling < targetCeiling;
  const capNote = cappedByBudget ? ` (capped by your max per deal of ${money(settings.maxPerDeal)} all in; the deal itself would support ${money(targetCeiling)})` : "";

  if (listing.channel === "auction") {
    const low = listing.openingBid ?? 0;
    if (!best || targetCeiling <= 0) return { low, high: 0, walkAway: 0, note: "Do not bid. No price meets your profit targets." };
    if (targetCeiling < low) return { low, high: 0, walkAway: 0, note: `Do not bid. The most this is worth to you is ${money(targetCeiling)}, below the opening bid ${money(low)}.` };
    if (maxDealCeiling < low) return { low, high: 0, walkAway: 0, note: `Over your budget. The opening bid ${money(low)} is above your max per deal (${money(settings.maxPerDeal)} all in). The deal would support bids up to ${money(targetCeiling)} with more capital or a partner.` };
    return { low, high: ceiling, walkAway: ceiling, note: `Start at the opening bid ${money(low)}. Stop at ${money(ceiling)}${capNote}. Fees on top: about ${money(auctionCosts(ceiling, a).allIn - ceiling)} in doc stamps and recording.` };
  }

  if (!best || ceiling <= 0) return { low: costs?.allIn ?? 0, high: 0, walkAway: 0, note: "Pass. No price meets your profit targets." };
  if (!costs) {
    return { low: 0, high: ceiling, walkAway: ceiling, note: `Fixed price, no bidding. Request the clerk's statement. Buy only if the statement total is ${money(ceiling)} or less${capNote}.` };
  }
  const fixed = costs.allIn;
  const source = listing.quotedTotal ? "clerk statement" : "estimate; request the clerk's statement to confirm";
  if (fixed > ceiling) {
    const reason = fixed > maxDealCeiling && fixed <= targetCeiling ? `above your max per deal of ${money(settings.maxPerDeal)}` : `above the most it is worth to you, ${money(targetCeiling)}`;
    return { low: fixed, high: fixed, walkAway: ceiling, note: `Fixed price about ${money(fixed)} (${source}) is ${reason}.` };
  }
  return { low: fixed, high: fixed, walkAway: ceiling, note: `Fixed price about ${money(fixed)} (${source}). Still worth it up to ${money(ceiling)}${capNote}.` };
}

function decideVerdict(args: {
  flags: RiskFlag[];
  best: StrategyResult | null;
  settings: Settings;
  priceKnown: boolean;
  competition: Analysis["competition"];
  isAuction: boolean;
  offer: Analysis["offer"];
}): Analysis["verdict"] {
  const { flags, best, settings, priceKnown, competition, isAuction, offer } = args;
  if (flags.some((f) => f.severity === "avoid")) return "avoid";
  if (!best || offer.walkAway <= 0) return "pass";
  if (isAuction) {
    // Some bid meets the targets. Whether it is worth showing up depends on the competition.
    if (competition.winChance === "unlikely" || !meetsTargets(best, settings) || !best.fitsBudget) return "watch";
    return "buy_candidate";
  }
  if (!priceKnown) return best.fitsBudget ? "needs_quote" : "watch";
  if (!meetsTargets(best, settings) || flags.some((f) => f.code === "PRICE_OVER_VALUE")) return "pass";
  if (!best.fitsBudget) return "watch";
  return "buy_candidate";
}

function scoreIt(args: { flags: RiskFlag[]; best: StrategyResult | null; competition: Analysis["competition"]; value: Analysis["value"]; verdict: Analysis["verdict"] }): number {
  const { flags, best, competition, value, verdict } = args;
  if (verdict === "avoid") return 0;
  let s = 0;
  if (best) {
    if (Number.isFinite(best.returnPct)) s += Math.max(0, Math.min(30, best.returnPct * 30));
    else s += 12; // price unknown: neutral
    const dollars = Number.isFinite(best.profit) ? best.profit : best.maxAllIn * 0.5;
    s += Math.max(0, Math.min(15, dollars / 1000));
    s += best.certainty * 5;
    if (best.fitsBudget) s += 5;
  }
  const danger = flags.filter((f) => f.severity === "danger").length;
  const caution = flags.filter((f) => f.severity === "caution").length;
  s += Math.max(0, 25 - danger * 10 - caution * 4);
  s += { likely: 10, maybe: 5, unlikely: 0 }[competition.winChance];
  s += { high: 10, medium: 6, low: 2 }[value.confidence];
  return Math.round(Math.max(0, Math.min(100, s)));
}

function explain(args: {
  parcel: Parcel;
  listing: Listing;
  value: Analysis["value"];
  costs: Analysis["costs"];
  best: StrategyResult | null;
  competition: Analysis["competition"];
  neighbors: Analysis["neighbors"];
  flags: RiskFlag[];
  verdict: Analysis["verdict"];
  settings: Settings;
  offer: Analysis["offer"];
}): string[] {
  const { parcel: p, listing, value, costs, best, competition, neighbors, flags, verdict } = args;
  const why: string[] = [];
  const avoid = flags.filter((f) => f.severity === "avoid");
  if (avoid.length) {
    why.push(`Avoid: ${avoid.map((f) => f.message).join(" ")}`);
    return why;
  }
  if (costs && value.market > 0) {
    why.push(`${listing.channel === "auction" ? "Expected price" : "Cost"} ${money(costs.allIn)} all in vs estimated value ${money(value.market)} (${pct(costs.allIn / value.market)} of value).`);
  } else if (value.market > 0) {
    why.push(`Estimated value ${money(value.market)}. Price not known yet.`);
  }
  why.push(`Value: ${value.notes[0] ?? value.method} Confidence ${value.confidence}.`);
  if (best) {
    if (Number.isFinite(best.profit)) {
      why.push(`Best plan: ${best.label.toLowerCase()}, about ${money(best.profit)} profit (${pct(best.returnPct)} on ${money(best.cashNeeded)} cash in) over about ${best.months} months.`);
    } else {
      why.push(`Best plan: ${best.label.toLowerCase()}. Pays off if the all in price is ${money(best.maxAllIn)} or less.`);
    }
  }
  if (p.kind.startsWith("vacant") && neighbors.length) why.push(`${neighbors.length} nearby owner(s) are natural buyers.`);
  why.push(competition.explanation);
  const dangers = flags.filter((f) => f.severity === "danger");
  if (dangers.length) why.push(`Watch out: ${dangers.map((f) => f.message).join(" ")}`);
  if (verdict === "watch" && best && !best.fitsBudget) why.push("Does not fit your budget as set. Kept on the list in case your settings change or you bring a partner.");
  return why;
}
