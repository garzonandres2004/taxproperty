// How likely a small budget buyer is to actually get the parcel.
//
// Lands Available: no auction. First come, first served at a fixed price.
// Auctions: anyone in the country can bid online. We estimate where bidding
// ends (a share of market value that depends on county size and property type)
// and compare it with the most the user should pay. Starting ratios are guesses
// in config; the calibrate command replaces them with real results.

import { readFileSync, existsSync } from "node:fs";
import type { Assumptions } from "./assumptions.ts";
import type { Competition, Listing, Parcel, StrategyResult, ValueEstimate } from "./types.ts";
import { money, pct } from "./stats.ts";

export type TypeBucket = "improved" | "vacant" | "other";

export function typeBucket(p: Parcel): TypeBucket {
  if (["single_family", "condo", "mobile_home", "multifamily"].includes(p.kind)) return "improved";
  if (["vacant_residential", "vacant_commercial", "vacant_other", "agricultural"].includes(p.kind)) return "vacant";
  return "other";
}

/** Calibration learned from real auction results: county code -> bucket -> ratio. */
export type Calibration = Record<string, Partial<Record<TypeBucket, { ratio: number; n: number }>>>;

export function loadCalibration(path: string | undefined): Calibration {
  if (!path || !existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Calibration;
}

export function assessCompetition(args: {
  parcel: Parcel;
  listing: Listing;
  value: ValueEstimate;
  tier: "large" | "mid" | "small";
  best: StrategyResult | null;
  /** The most the user's max per deal allows, in the same units as best.maxPrice. */
  budgetCeiling: number;
  a: Assumptions;
  calibration: Calibration;
  today?: Date;
}): Competition {
  const { parcel, listing, value, tier, best, budgetCeiling, a, calibration } = args;
  const bucket = typeBucket(parcel);

  if (listing.channel === "lands_available") {
    // Florida: only the county may buy in the first 90 days after the auction.
    const sale = listing.saleDate ? new Date(`${listing.saleDate}T00:00:00Z`) : null;
    if (sale && args.today && !Number.isNaN(sale.getTime())) {
      const opens = new Date(sale.getTime() + 90 * 86400000);
      // Only when the auction already happened: a future date is a list error, flagged elsewhere.
      if (sale.getTime() <= args.today.getTime() && args.today.getTime() < opens.getTime()) {
        return {
          level: "none",
          expectedClearing: listing.quotedTotal ?? listing.openingBid ?? 0,
          winChance: "likely",
          explanation: `No bidding, fixed price. Only the county can buy it until about ${opens.toISOString().slice(0, 10)} (90 days after the auction); after that it is first come first served. Request the statement before then.`,
        };
      }
    }
    const attractive = best && Number.isFinite(best.profit) ? best.profit > 0 && bucket === "improved" : bucket === "improved";
    return {
      level: attractive ? "low" : "none",
      expectedClearing: listing.quotedTotal ?? listing.openingBid ?? 0,
      winChance: "likely",
      explanation: attractive
        ? "No bidding: fixed price, first come first served. Homes on this list get noticed, so request the statement and pay quickly."
        : "No bidding: fixed price, first come first served. Nobody can outbid you; the only risk is someone paying first.",
    };
  }

  const learned = calibration[parcel.countyCode]?.[bucket];
  const ratio = learned && learned.n >= 3 ? learned.ratio : a.competition.clearingRatio[tier][bucket];
  const source = learned && learned.n >= 3 ? `your ${learned.n} recorded results in this county` : `the starting guess for ${tier} counties`;
  const opening = listing.openingBid ?? 0;
  const expected = Math.max(opening, Math.round(value.market * ratio));
  const userMax = best ? Math.min(best.maxPrice, budgetCeiling) : 0;

  let level: Competition["level"];
  if (value.market <= 0 || expected <= opening * 1.1) level = "low";
  else if (ratio >= 0.65 && bucket === "improved") level = "high";
  else if (ratio >= 0.45) level = "medium";
  else level = "low";

  let winChance: Competition["winChance"];
  if (userMax <= 0 || userMax < opening) winChance = "unlikely";
  else if (userMax >= expected) winChance = "likely";
  else if (userMax >= expected * 0.85) winChance = "maybe";
  else winChance = "unlikely";

  const parts = [
    `Online auction open to bidders nationwide. Similar ${bucket} property in a ${tier} county tends to sell around ${pct(ratio)} of market value (from ${source}), so expect bidding near ${money(expected)}.`,
  ];
  if (userMax <= 0) parts.push("No bid meets your profit targets.");
  else if (userMax < opening) parts.push(`Your max bid ${money(userMax)} is below the opening bid ${money(opening)}, so you cannot win this within your budget and targets.`);
  else if (winChance === "unlikely") parts.push(`Your max bid ${money(userMax)} is below that. You will probably lose this one; skip it or bid your max and walk away.`);
  else if (winChance === "maybe") parts.push(`Your max bid ${money(userMax)} is close to the expected price. It could go either way.`);
  else parts.push(`Your max bid ${money(userMax)} is at or above the expected price.`);

  return { level, expectedClearing: expected, winChance, explanation: parts.join(" ") };
}

export interface Outcome {
  countyCode: string;
  bucket: TypeBucket;
  estMarket: number;
  winningBid: number;
}

/** Median winning bid / estimated market per county and type. */
export function calibrate(outcomes: Outcome[]): Calibration {
  const groups = new Map<string, number[]>();
  for (const o of outcomes) {
    if (!(o.estMarket > 0) || !(o.winningBid > 0)) continue;
    const k = `${o.countyCode}|${o.bucket}`;
    groups.set(k, [...(groups.get(k) ?? []), o.winningBid / o.estMarket]);
  }
  const cal: Calibration = {};
  for (const [k, ratios] of groups) {
    const [county, bucket] = k.split("|") as [string, TypeBucket];
    const s = [...ratios].sort((x, y) => x - y);
    const mid = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    cal[county] = { ...(cal[county] ?? {}), [bucket]: { ratio: Math.round(mid * 1000) / 1000, n: s.length } };
  }
  return cal;
}
