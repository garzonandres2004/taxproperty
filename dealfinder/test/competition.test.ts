import { test } from "node:test";
import assert from "node:assert/strict";
import { a } from "./helpers.ts";
import { assessCompetition, calibrate } from "../src/core/competition.ts";
import type { Listing, Parcel, StrategyResult, ValueEstimate } from "../src/core/types.ts";

const house = { kind: "single_family", countyCode: "39" } as Parcel;
const value = { market: 200000 } as ValueEstimate;
const best = (maxPrice: number) => ({ maxPrice }) as StrategyResult;
const auction: Listing = { channel: "auction", parcelId: "x", parcelKey: "x", openingBid: 5000 };

test("Lands Available has no bidding", () => {
  const c = assessCompetition({ parcel: house, listing: { ...auction, channel: "lands_available" }, value, tier: "large", best: best(50000), budgetCeiling: 50000, a, calibration: {} });
  assert.equal(c.winChance, "likely");
  assert.match(c.explanation, /first come first served/);
});

test("big county house at auction: a small max bid will probably lose", () => {
  const c = assessCompetition({ parcel: house, listing: auction, value, tier: "large", best: best(60000), budgetCeiling: 60000, a, calibration: {} });
  assert.equal(c.level, "high");
  assert.equal(c.expectedClearing, 160000);
  assert.equal(c.winChance, "unlikely");
});

test("budget ceiling limits the max bid even when the deal supports more", () => {
  const c = assessCompetition({ parcel: house, listing: auction, value, tier: "large", best: best(170000), budgetCeiling: 4000, a, calibration: {} });
  assert.equal(c.winChance, "unlikely");
  assert.match(c.explanation, /below the opening bid/);
});

test("recorded results replace the starting guess after 3 results", () => {
  const cal = calibrate([
    { countyCode: "39", bucket: "improved", estMarket: 100000, winningBid: 50000 },
    { countyCode: "39", bucket: "improved", estMarket: 100000, winningBid: 55000 },
    { countyCode: "39", bucket: "improved", estMarket: 100000, winningBid: 60000 },
  ]);
  assert.deepEqual(cal["39"].improved, { ratio: 0.55, n: 3 });
  const c = assessCompetition({ parcel: house, listing: auction, value, tier: "large", best: best(120000), budgetCeiling: 120000, a, calibration: cal });
  assert.equal(c.expectedClearing, 110000);
  assert.equal(c.winChance, "likely");
  assert.match(c.explanation, /your 3 recorded results/);
});
