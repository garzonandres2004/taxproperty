// Florida pipeline:
//   pass 1  read the NAL tax roll, pick out the parcels on the county list
//   pass 2  read it again, collect comparable sales and nearby owners
//   then    value, costs, risk, strategies, competition, score, verdict

import type { Assumptions } from "../core/assumptions.ts";
import { readCsvRecords, normalizeHeader, recordToObject } from "../core/csv.ts";
import type { Analysis, Listing, Parcel, RiskFlag, Settings, StrategyResult } from "../core/types.ts";
import { ListingError, normKey, resolveLooseAmount, type RawListing } from "../core/listings.ts";
import { addComp, compsFromParcel, emptyCompIndex, estimateValue, type CompIndex } from "../core/valuation.ts";
import { createNeighborFinder, parcelUid } from "../core/neighbors.ts";
import { buildStrategies, meetsTargets, MIN_PLAUSIBLE_ALL_IN, pickBest } from "../core/strategies.ts";
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
  /** Values the user checked by hand (parcel key -> market value). They replace the estimate. */
  valueOverrides?: Map<string, number>;
}

export interface RunResult {
  analyses: Analysis[];
  unmatched: UnmatchedListing[];
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
        if (!isNalHeader(header)) {
          throw new ListingError(
            `${path} is not a Florida DOR NAL file (missing CO_NO, PARCEL_ID, DOR_UC or JV columns). ` +
              `Use the NAL file from the Florida Department of Revenue Data Portal, not the county property appraiser's own export; ` +
              `the DOR file has the same columns in all 67 counties.`,
          );
        }
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

interface Match {
  key: string;
  parcel: Parcel;
}

export interface UnmatchedListing extends RawListing {
  reason: string;
}

/**
 * Decide which roll parcel a list line means. Several keys pointing at the same
 * parcel (its id and its alt key, or pieces of a spaced out number) are fine.
 * Two or more distinct parcels is ambiguous and reported, never guessed, even
 * when one key contains the other.
 */
export function resolveMatches(matches: Match[]): { parcel: Parcel; key: string } | { ambiguous: string } | null {
  if (!matches.length) return null;
  const byUid = new Map<string, Match>();
  for (const m of matches) {
    const uid = parcelUid(m.parcel);
    const prev = byUid.get(uid);
    if (!prev || m.key.length > prev.key.length) byUid.set(uid, m);
  }
  const distinct = [...byUid.values()].sort((x, y) => y.key.length - x.key.length);
  if (distinct.length === 1) return { parcel: distinct[0].parcel, key: distinct[0].key };
  const names = distinct.slice(0, 4).map((m) => `${m.parcel.countyName} ${m.parcel.parcelId}`).join("; ");
  return { ambiguous: `matches more than one parcel (${names}). Limit counties in settings or fix the list line.` };
}

/** Merge lines that point at the same parcel and channel. Statements beat estimates; disagreements are kept as conflicts. */
export function mergeListings(parcel: Parcel, raws: { raw: RawListing; key: string }[]): Listing {
  const conflicts: string[] = [];
  const distinct = (vals: (number | undefined)[]) => [...new Set(vals.filter((v): v is number => v !== undefined))];
  let plain = false;
  const bids = distinct(raws.map(({ raw, key }) => {
    if (raw.openingBid !== undefined) return raw.openingBid;
    const loose = resolveLooseAmount(raw, key);
    if (loose !== undefined) plain = true;
    return loose;
  }));
  const quotes = distinct(raws.map(({ raw }) => raw.quotedTotal));
  if (bids.length > 1) conflicts.push(`opening bids disagree: ${bids.map(money).join(", ")} (using the highest)`);
  if (quotes.length > 1) conflicts.push(`clerk statements disagree: ${quotes.map(money).join(", ")} (using the highest)`);
  // Dates drive accrued taxes and interest. Use the earliest (more accrual, higher cost) and flag any disagreement.
  const dates = [...new Set(raws.map(({ raw }) => raw.saleDate).filter((d): d is string => !!d))].sort();
  if (dates.length > 1) conflicts.push(`list dates disagree: ${dates.join(", ")} (using the earliest)`);
  const first = <T,>(f: (r: RawListing) => T | undefined) => raws.map(({ raw }) => f(raw)).find((v) => v !== undefined && v !== "");
  return {
    channel: raws[0].raw.channel,
    parcelId: parcel.parcelId,
    parcelKey: parcel.parcelKey,
    caseNumber: first((r) => r.caseNumber),
    openingBid: bids.length ? Math.max(...bids) : undefined,
    quotedTotal: quotes.length ? Math.max(...quotes) : undefined,
    saleDate: dates[0],
    sourceLine: raws.map(({ raw }) => raw.sourceLine).join(" || "),
    conflicts: conflicts.length ? conflicts : undefined,
    amountFromPlainNumber: plain && bids.length > 0 && raws.every(({ raw }) => raw.openingBid === undefined) ? true : undefined,
  };
}

export async function runFlorida(input: RunInput): Promise<RunResult> {
  const { settings, a, today } = input;
  const opts = { qualifiedSaleCodes: a.valuation.qualifiedSaleCodes };

  // Index every candidate key so any one of them can match.
  const byKey = new Map<string, number[]>();
  input.listings.forEach((l, i) => l.candidateKeys.forEach((k) => byKey.set(k, [...(byKey.get(k) ?? []), i])));
  const matches = new Map<number, Match[]>();
  const excludedByCounty = new Set<number>();

  // Pass 1: find listed parcels. Match on PARCEL_ID or ALT_KEY; keep every match, decide later.
  let scanned = 0;
  let referenceYear = 0;
  for await (const row of scanNal(input.nalPaths)) {
    scanned++;
    const yr = Number(row.ASMNT_YR) || 0;
    if (yr > referenceYear) referenceYear = yr;
    const keys = [...new Set([parcelKey(row.PARCEL_ID), parcelKey(row.ALT_KEY ?? "")].filter(Boolean))];
    let parcel: Parcel | null = null;
    for (const k of keys) {
      const hits = byKey.get(k);
      if (!hits) continue;
      parcel ??= nalRowToParcel(row, opts);
      if (!countyAllowed(parcel.countyCode, settings)) {
        hits.forEach((i) => excludedByCounty.add(i));
        continue;
      }
      for (const i of hits) matches.set(i, [...(matches.get(i) ?? []), { key: k, parcel }]);
    }
  }
  if (!referenceYear) referenceYear = today.getFullYear();

  // Resolve each line to one parcel, or report why not.
  const unmatched: UnmatchedListing[] = [];
  const groups = new Map<string, { parcel: Parcel; items: { raw: RawListing; key: string }[] }>();
  input.listings.forEach((raw, i) => {
    const r = resolveMatches(matches.get(i) ?? []);
    if (!r) {
      unmatched.push({ ...raw, reason: excludedByCounty.has(i) ? "only matches parcels in counties excluded by your settings" : "not found in the tax roll" });
      return;
    }
    if ("ambiguous" in r) {
      unmatched.push({ ...raw, reason: r.ambiguous });
      return;
    }
    const gk = `${parcelUid(r.parcel)}|${raw.channel}`;
    const g = groups.get(gk) ?? { parcel: r.parcel, items: [] };
    g.items.push({ raw, key: r.key });
    groups.set(gk, g);
  });

  // Pass 2: comps and neighbors.
  const comps: CompIndex = emptyCompIndex();
  const finder = createNeighborFinder(a.neighbors);
  const subjectCounties = new Set<string>();
  for (const g of groups.values()) {
    finder.addSubject(g.parcel);
    subjectCounties.add(g.parcel.countyCode);
  }
  let compsFound = 0;
  if (groups.size) {
    for await (const row of scanNal(input.nalPaths)) {
      const p = nalRowToParcel(row, opts);
      if (!subjectCounties.has(p.countyCode)) continue;
      for (const c of compsFromParcel(p, a, today)) {
        addComp(comps, p.countyCode, c);
        compsFound++;
      }
      finder.offer(p);
    }
  }

  const analyses: Analysis[] = [];
  for (const g of groups.values()) {
    const listing = mergeListings(g.parcel, g.items);
    analyses.push(analyzeOne(g.parcel, listing, comps, finder.neighborsOf(g.parcel), input));
  }

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
  input: Pick<RunInput, "settings" | "a" | "calibration" | "today" | "valueOverrides">,
): Analysis {
  const { settings, a, calibration, today } = input;
  const own = input.valueOverrides?.get(normKey(parcel.parcelId));
  const estimate = estimateValue(parcel, comps, a, today);
  const value: Analysis["value"] = own
    ? {
        market: own, low: Math.round(own * 0.9), high: Math.round(own * 1.1), method: "user", confidence: "high", compCount: 0,
        // Keep the roll estimate's reasoning so an override never hides why it was doubted.
        notes: [`Value you entered in your values file (${money(own)}). The tax roll estimate was ${money(estimate.market)} (${estimate.confidence} confidence).`, ...estimate.notes.map((n) => `Tax roll estimate: ${n}`)],
      }
    : estimate;
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
  for (const c of listing.conflicts ?? []) {
    flags.push({ code: "LISTING_CONFLICT", severity: "danger", message: `This parcel is listed more than once and the lines disagree: ${c}.`, check: "Confirm the current amount with the clerk before acting." });
  }
  if (own && estimate.market > 0 && (own > estimate.market * 2 || own < estimate.market * 0.5)) {
    flags.push({ code: "USER_VALUE_FAR", severity: "danger", message: `Your value ${money(own)} is ${own > estimate.market ? "more than double" : "less than half"} the tax roll estimate ${money(estimate.market)}.`, check: "Make sure it is not a typo (an extra zero) and that your sold comps really match this parcel." });
  }
  if (listing.amountFromPlainNumber) {
    flags.push({ code: "AMOUNT_FROM_PLAIN_NUMBER", severity: "caution", message: `The amount ${money(listing.openingBid ?? 0)} was read from a plain number on the list line (no $ sign or cents).`, check: "Make sure that number is the opening bid." });
  }
  if (isAuction && listing.openingBid === undefined) {
    flags.push({ code: "NO_OPENING_BID", severity: "caution", message: "The list did not show an opening bid. Profit below uses the expected final price.", check: "Look up the opening bid on the auction site." });
  }

  const offer = makeOffer(listing, best, costs, settings, a, ceilingToPrice);
  const verdict = decideVerdict({ flags, best, settings, priceKnown, competition, isAuction, offer, listing, value });
  const score = scoreIt({ flags, best, competition, value, verdict });
  const why = explain({ parcel, listing, value, costs, best, competition, neighbors, flags, verdict, settings, offer });

  return { parcel, listing, value, costs, priceKnown, flags, competition, strategies, best, offer, neighbors, score, verdict, why };
}

function makeOffer(
  listing: Listing,
  best: StrategyResult | null,
  costs: Analysis["costs"],
  settings: Settings,
  a: Assumptions,
  ceilingToPrice: (allIn: number) => number,
): Analysis["offer"] {
  const isAuction = listing.channel === "auction";
  if (best && best.maxAllIn < MIN_PLAUSIBLE_ALL_IN) {
    const nothing = `The most this is worth to you is ${money(best.maxAllIn)} all in, less than any tax deed costs with fees.`;
    return { low: isAuction ? (listing.openingBid ?? 0) : (costs?.allIn ?? 0), high: 0, walkAway: 0, note: isAuction ? `Do not bid. ${nothing}` : `Pass. ${nothing}` };
  }
  const targetCeiling = best ? best.maxPrice : 0;
  // Highest price that meets the targets AND leaves cash for the plan's costs after buying.
  const ceiling = best ? Math.min(targetCeiling, ceilingToPrice(best.affordableAllIn)) : 0;
  const cappedByBudget = best !== null && ceiling < targetCeiling;
  const capNote = cappedByBudget
    ? ` (capped by your budget: max per deal ${money(settings.maxPerDeal)} all in, and cash left for this plan's ${money(best!.upfrontCosts)} of costs before it pays; the deal itself would support ${money(targetCeiling)})`
    : "";

  if (isAuction) {
    const low = listing.openingBid ?? 0;
    if (!best || targetCeiling <= 0) return { low, high: 0, walkAway: 0, note: "Do not bid. No price meets your profit targets." };
    if (targetCeiling < low) return { low, high: 0, walkAway: 0, note: `Do not bid. The most this is worth to you is ${money(targetCeiling)}, below the opening bid ${money(low)}.` };
    if (ceiling < low || ceiling <= 0) return { low, high: 0, walkAway: 0, note: `Over your budget. ${low ? `The opening bid ${money(low)}` : "Any bid"} is more than you can pay and still cover this plan with your cash. The deal would support bids up to ${money(targetCeiling)} with more capital or a partner.` };
    const start = low ? `Start at the opening bid ${money(low)}.` : "The list shows no opening bid; check it on the auction site.";
    return { low, high: ceiling, walkAway: ceiling, note: `${start} Stop at ${money(ceiling)}${capNote}. Fees on top: about ${money(auctionCosts(ceiling, a).allIn - ceiling)} in doc stamps and recording.` };
  }

  if (!best || targetCeiling <= 0) return { low: costs?.allIn ?? 0, high: 0, walkAway: 0, note: "Pass. No price meets your profit targets." };
  if (ceiling <= 0) return { low: costs?.allIn ?? 0, high: 0, walkAway: 0, note: `Over your budget. You would not have cash left for this plan. The deal would support up to ${money(targetCeiling)} all in with more capital or a partner.` };
  if (!costs) {
    return { low: 0, high: ceiling, walkAway: ceiling, note: `Fixed price, no bidding. Request the clerk's statement. Buy only if the statement total is ${money(ceiling)} or less${capNote}.` };
  }
  const fixed = costs.allIn;
  const source = listing.quotedTotal ? "clerk statement" : "rough estimate, not the clerk's math; request the clerk's statement to confirm";
  if (fixed > ceiling) {
    const reason = fixed <= targetCeiling ? `more than you can pay and still cover this plan with your cash (${money(ceiling)})` : `above the most it is worth to you, ${money(targetCeiling)}`;
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
  listing: Listing;
  value: Analysis["value"];
}): Analysis["verdict"] {
  const { flags, best, settings, priceKnown, competition, isAuction, offer, listing, value } = args;
  if (flags.some((f) => f.severity === "avoid")) return "avoid";
  if (!best || offer.walkAway <= 0) return "pass";
  let v: Analysis["verdict"];
  if (isAuction) {
    // Some bid meets the targets. Whether it is worth showing up depends on the competition.
    if (listing.openingBid === undefined) v = best.fitsBudget ? "needs_quote" : "watch";
    else if (competition.winChance === "unlikely" || !meetsTargets(best, settings) || !best.fitsBudget) v = "watch";
    else v = "buy_candidate";
  } else if (!priceKnown) {
    if (!meetsTargets(best, settings)) return "pass";
    v = best.fitsBudget ? "needs_quote" : "watch";
  } else {
    if (!meetsTargets(best, settings) || flags.some((f) => f.code === "PRICE_OVER_VALUE")) return "pass";
    v = best.fitsBudget ? "buy_candidate" : "watch";
  }
  // Disagreeing list lines: never a straight buy until the clerk confirms the number.
  if (v === "buy_candidate" && listing.conflicts?.length) v = "watch";
  // A value with no sales behind it is a guess. Check it before calling anything a buy.
  if (v === "buy_candidate" && value.confidence === "low") v = "watch";
  // Amount guessed from a plain number: confirm the price before calling it a buy.
  if (v === "buy_candidate" && listing.amountFromPlainNumber) v = "needs_quote";
  return v;
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
  if (verdict === "watch" && value.confidence === "low" && best) {
    if (value.method === "comps_ratio" && value.compCount > 0) {
      why.push(`Held at watch because the ${value.compCount} nearby sales disagree a lot, so the value could be far off. Find out why first (lot size, waterfront, road access, wetlands, a different use). Then pull 3 sales that truly match this parcel, put that value in a values file (--values), and run again.`);
    } else {
      why.push("Held at watch because the value is a guess (no usable sales nearby). Pull 3 recent sold properties like it, put your value in a values file (--values), and run again.");
    }
  }
  if (verdict === "watch" && best && !best.fitsBudget) why.push("Does not fit your budget as set. Kept on the list in case your settings change or you bring a partner.");
  return why;
}
