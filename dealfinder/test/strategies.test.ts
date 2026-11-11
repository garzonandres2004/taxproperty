import { test } from "node:test";
import assert from "node:assert/strict";
import { a, settings } from "./helpers.ts";
import { buildStrategies, pickBest, rehabEstimate } from "../src/core/strategies.ts";
import type { Parcel, ValueEstimate } from "../src/core/types.ts";

const lot = { kind: "vacant_residential", homestead: false, livingSqft: 0, yearBuilt: 0 } as Parcel;
const house = { kind: "single_family", homestead: true, livingSqft: 1500, yearBuilt: 1970 } as Parcel;
const val = (market: number): ValueEstimate => ({ market, low: market, high: market, method: "comps_ratio", confidence: "high", compCount: 5, notes: [] });
const identity = (x: number) => x;

test("paying exactly the max all in still meets both profit targets", () => {
  const s = settings({ minProfit: 1500, minReturnPct: 0.3 });
  const ceiling = buildStrategies({ parcel: lot, value: val(30000), neighbors: [], settings: s, a, allIn: null, ceilingToPrice: identity });
  for (const st of ceiling) {
    const [priced] = buildStrategies({ parcel: lot, value: val(30000), neighbors: [], settings: { ...s, strategies: [st.name] }, a, allIn: st.maxAllIn, ceilingToPrice: identity });
    assert.ok(priced.profit >= s.minProfit - 1, `${st.name} profit ${priced.profit}`);
    assert.ok(priced.returnPct >= s.minReturnPct - 0.001, `${st.name} return ${priced.returnPct}`);
  }
});

test("vacant land gets land exits, houses get house exits", () => {
  const s = settings();
  const l = buildStrategies({ parcel: lot, value: val(20000), neighbors: [], settings: s, a, allIn: 3000, ceilingToPrice: identity }).map((x) => x.name);
  assert.deepEqual(l.sort(), ["quiet_title_and_list", "sell_to_neighbor", "wholesale"]);
  const h = buildStrategies({ parcel: house, value: val(200000), neighbors: [], settings: s, a, allIn: 60000, ceilingToPrice: identity }).map((x) => x.name);
  assert.deepEqual(h.sort(), ["flip", "rent", "wholesale"]);
});

test("strategies the user turned off are not offered", () => {
  const r = buildStrategies({ parcel: lot, value: val(20000), neighbors: [], settings: settings({ strategies: ["wholesale"] }), a, allIn: 3000, ceilingToPrice: identity });
  assert.deepEqual(r.map((x) => x.name), ["wholesale"]);
});

test("budget fit uses the user's numbers: rehab money counts against free cash", () => {
  const small = settings({ totalCapital: 20000, maxPerDeal: 8000 });
  const flip = buildStrategies({ parcel: house, value: val(200000), neighbors: [], settings: small, a, allIn: 7000, ceilingToPrice: identity }).find((x) => x.name === "flip")!;
  assert.equal(flip.fitsBudget, false);
  assert.match(flip.financing, /partner or private lender/);
  const big = settings({ totalCapital: 500000, maxPerDeal: 100000 });
  const flip2 = buildStrategies({ parcel: house, value: val(200000), neighbors: [], settings: big, a, allIn: 7000, ceilingToPrice: identity }).find((x) => x.name === "flip")!;
  assert.equal(flip2.fitsBudget, true);
});

test("homestead houses carry the full eviction budget and old houses the heavy rehab tier", () => {
  const r = buildStrategies({ parcel: house, value: val(200000), neighbors: [], settings: settings(), a, allIn: 50000, ceilingToPrice: identity }).find((x) => x.name === "flip")!;
  assert.ok(r.costLines.some((c) => c.label.startsWith("Eviction") && c.amount === a.exit.evictionBudget));
  assert.equal(rehabEstimate(house, a).amount, 1500 * a.rehab.heavyPerSqft);
});

test("neighbor exit is less certain when no neighbor was found", () => {
  const s = settings();
  const without = buildStrategies({ parcel: lot, value: val(20000), neighbors: [], settings: s, a, allIn: 3000, ceilingToPrice: identity }).find((x) => x.name === "sell_to_neighbor")!;
  const withN = buildStrategies({ parcel: lot, value: val(20000), neighbors: [{ parcelId: "n", ownerName: "o", situsAddress: "", reason: "" }], settings: s, a, allIn: 3000, ceilingToPrice: identity }).find((x) => x.name === "sell_to_neighbor")!;
  assert.ok(withN.certainty > without.certainty);
});

test("best plan prefers ones that meet targets and fit the budget", () => {
  const s = settings();
  const r = buildStrategies({ parcel: lot, value: val(20000), neighbors: [], settings: s, a, allIn: 3000, ceilingToPrice: identity });
  const best = pickBest(r, s)!;
  assert.ok(best.fitsBudget);
  assert.ok(best.profit >= s.minProfit);
});
