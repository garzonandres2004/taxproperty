import { test } from "node:test";
import assert from "node:assert/strict";
import { a } from "./helpers.ts";
import { addComp, compsFromParcel, emptyCompIndex, estimateValue } from "../src/core/valuation.ts";
import type { Parcel } from "../src/core/types.ts";

const today = new Date("2026-11-11T12:00:00Z");

function parcel(over: Partial<Parcel>): Parcel {
  return {
    state: "FL", countyCode: "45", countyName: "Lake", parcelId: "X", parcelKey: "X", assessmentYear: 2026, useCode: "000",
    useDescription: "Vacant residential", kind: "vacant_residential", justValue: 10000, landValue: 10000, landSqft: 10000,
    livingSqft: 0, buildings: 0, units: 0, yearBuilt: 0, homestead: false, ownerName: "", ownerState: "FL", ownerCity: "",
    situsAddress: "", situsCity: "EUSTIS", situsZip: "32726", legal: "", neighborhood: "N1", censusBlock: "", township: "",
    range: "", section: "", sales: [], landsAvailableFlag: false, ...over,
  };
}

test("median sale to assessed ratio of nearby comps drives the estimate", () => {
  const idx = emptyCompIndex();
  const ratios = [1.2, 1.3, 1.4, 1.5, 1.6];
  ratios.forEach((r, i) => {
    const p = parcel({ parcelKey: `C${i}`, justValue: 20000, sales: [{ price: 20000 * r, year: 2025, month: 1, qualified: true, qualCode: "01", vi: "V" }] });
    for (const c of compsFromParcel(p, a, today)) addComp(idx, "45", c);
  });
  const v = estimateValue(parcel({ justValue: 10000 }), idx, a, today);
  assert.equal(v.method, "comps_ratio");
  assert.equal(v.market, 14000);
  assert.equal(v.confidence, "high");
  assert.ok(v.low <= v.market && v.market <= v.high);
});

test("non arm's length, stale, and vacant-vs-improved mismatched sales are ignored", () => {
  const base = { year: 2025, month: 1, vi: "V" };
  assert.equal(compsFromParcel(parcel({ sales: [{ ...base, price: 100, qualified: false, qualCode: "11" }] }), a, today).length, 0);
  assert.equal(compsFromParcel(parcel({ sales: [{ ...base, price: 15000, qualified: true, qualCode: "01", year: 2018 }] }), a, today).length, 0);
  assert.equal(compsFromParcel(parcel({ kind: "single_family", sales: [{ ...base, price: 15000, qualified: true, qualCode: "01" }] }), a, today).length, 0);
});

test("no comps falls back to assessed value with low confidence", () => {
  const v = estimateValue(parcel({ justValue: 8500 }), emptyCompIndex(), a, today);
  assert.equal(v.method, "assessed");
  assert.equal(v.confidence, "low");
  assert.equal(v.market, 10000);
});

test("zero just value means unknown value, not a deal", () => {
  const v = estimateValue(parcel({ justValue: 0 }), emptyCompIndex(), a, today);
  assert.equal(v.market, 0);
});
