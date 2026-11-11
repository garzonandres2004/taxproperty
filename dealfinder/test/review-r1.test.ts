// Regression tests for Codex review round 1 (issue #19). One test per finding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { a, settings } from "./helpers.ts";
import { runFlorida, resolveMatches } from "../src/fl/engine.ts";
import { parseListing, parseListingText, ListingError } from "../src/core/listings.ts";
import { buildStrategies, meetsTargets } from "../src/core/strategies.ts";
import { estimateValue, emptyCompIndex, addComp, compsFromParcel } from "../src/core/valuation.ts";
import { readCsvRecords } from "../src/core/csv.ts";
import type { Parcel, Settings, ValueEstimate } from "../src/core/types.ts";

const today = new Date("2026-11-11T12:00:00Z");
const HEADER = "CO_NO,PARCEL_ID,ASMNT_YR,DOR_UC,JV,LND_SQFOOT,TOT_LVG_AREA,EFF_YR_BLT,QUAL_CD1,VI_CD1,SALE_PRC1,SALE_YR1,SALE_MO1,OWN_NAME,S_LEGAL,NBRHD_CD,PHY_ADDR1,PHY_CITY,PHY_ZIPCD,ALT_KEY";

function roll(rows: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "r1-"));
  const f = join(dir, "nal.csv");
  writeFileSync(f, [HEADER, ...rows].join("\n") + "\n");
  return f;
}

async function run(nal: string, lists: { text: string; channel: "lands_available" | "auction" }[], s: Settings = settings()) {
  const listings = lists.flatMap((l) => parseListing(l.text, l.channel));
  return runFlorida({ nalPaths: [nal], listings, settings: s, a, calibration: {}, today });
}

// 10 vacant comps at 1.5x just value so values are high confidence
const comps = Array.from({ length: 10 }, (_, i) => `45,45-C-${100000 + i},2026,000,20000,10000,0,0,01,V,30000,2026,3,OWNER ${i},X,N1,${100 + i * 20} ELM ST,EUSTIS,32726,`);

test("P1: a later clerk statement is merged, not discarded", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const r = await run(nal, [
    { text: "Parcel ID,Opening Bid\n12-19-26-0100-002-00500,3200\n", channel: "lands_available" },
    { text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,50000\n", channel: "lands_available" },
  ]);
  assert.equal(r.analyses.length, 1);
  const x = r.analyses[0];
  assert.equal(x.listing.quotedTotal, 50000);
  assert.equal(x.costs!.allIn, 50000);
  assert.notEqual(x.verdict, "buy_candidate");
});

test("P1: conflicting statements are flagged and never a straight buy", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const r = await run(nal, [
    { text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,3000\n", channel: "lands_available" },
    { text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,3400\n", channel: "lands_available" },
  ]);
  const x = r.analyses[0];
  assert.equal(x.listing.quotedTotal, 3400);
  assert.ok(x.flags.some((f) => f.code === "LISTING_CONFLICT"));
  assert.equal(x.verdict, "watch");
});

test("P1: same alt key in two counties is reported as ambiguous, not guessed", async () => {
  const nal = roll([
    "72,07567-012,2026,000,9000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,3800100",
    "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,B,X,N1,,EUSTIS,32726,3800100",
  ]);
  const r = await run(nal, [{ text: "2025-TD-1  3800100  $3,200.00", channel: "lands_available" }]);
  assert.equal(r.analyses.length, 0);
  assert.match(r.unmatched[0].reason, /more than one parcel/);
  // Limiting counties in settings resolves it.
  const r2 = await run(nal, [{ text: "2025-TD-1  3800100  $3,200.00", channel: "lands_available" }], settings({ counties: ["Lake"] }));
  assert.equal(r2.analyses[0].parcel.countyCode, "45");
});

test("P1: same parcel id in two counties gives two analyses, not one", async () => {
  const nal = roll(["45,111111-222,2026,000,9000,20000,0,0,,,,,,A,X,N1,,EUSTIS,32726,", "72,111111-222,2026,000,9000,20000,0,0,,,,,,B,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Opening Bid\n111111-222,1000\n", channel: "lands_available" }]);
  assert.equal(r.analyses.length, 0, "one list line matching two counties is ambiguous");
  assert.equal(r.unmatched.length, 1);
});

test("P1: walk away price leaves cash for the plan's upfront costs", () => {
  const s = settings({ totalCapital: 10000, maxPerDeal: 8000, reservePct: 0.2, strategies: ["quiet_title_and_list"] });
  const lot = { kind: "vacant_residential", homestead: false, livingSqft: 0, yearBuilt: 0 } as Parcel;
  const value: ValueEstimate = { market: 30000, low: 30000, high: 30000, method: "comps_ratio", confidence: "high", compCount: 9, notes: [] };
  const [qt] = buildStrategies({ parcel: lot, value, neighbors: [], settings: s, a, allIn: 5000, ceilingToPrice: (x) => x });
  assert.equal(qt.upfrontCosts, 2675);
  assert.equal(qt.affordableAllIn, 8000 - 2675);
  assert.ok(qt.fitsBudget);
});

test("P1: walk away is capped end to end", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const s = settings({ totalCapital: 10000, maxPerDeal: 8000, reservePct: 0.2, strategies: ["quiet_title_and_list"] });
  const r = await run(nal, [{ text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,5000\n", channel: "lands_available" }], s);
  const x = r.analyses[0];
  const freeCash = 10000 * 0.8;
  assert.ok(x.offer.walkAway + x.best!.upfrontCosts <= freeCash, `${x.offer.walkAway} + ${x.best!.upfrontCosts}`);
});

test("P1: own sale fallback rejects a sale made when the parcel had a building", () => {
  const p = {
    state: "FL", countyCode: "45", countyName: "Lake", parcelId: "X", parcelKey: "X", assessmentYear: 2026, useCode: "000", useDescription: "", kind: "vacant_residential",
    justValue: 10000, landValue: 10000, landSqft: 10000, livingSqft: 0, buildings: 0, units: 0, yearBuilt: 0, homestead: false, ownerName: "", ownerState: "FL", ownerCity: "",
    situsAddress: "", situsCity: "", situsZip: "", legal: "", neighborhood: "", censusBlock: "", township: "", range: "", section: "",
    sales: [{ price: 300000, year: 2026, month: 2, qualified: true, qualCode: "01", vi: "I" }], landsAvailableFlag: false,
  } as Parcel;
  const v = estimateValue(p, emptyCompIndex(), a, today);
  assert.equal(v.method, "assessed");
  assert.ok(v.market < 20000);
  // Also out of ratio bounds even when marked vacant.
  const v2 = estimateValue({ ...p, sales: [{ ...p.sales[0], vi: "V" }] }, emptyCompIndex(), a, today);
  assert.equal(v2.method, "assessed");
});

test("P2: ZIP comps never cross counties", () => {
  const idx = emptyCompIndex();
  const base = { state: "FL", countyName: "", parcelId: "", assessmentYear: 2026, useCode: "000", useDescription: "", kind: "vacant_residential", landValue: 0, landSqft: 10000, livingSqft: 0, buildings: 0, units: 0, yearBuilt: 0, homestead: false, ownerName: "", ownerState: "", ownerCity: "", situsAddress: "", situsCity: "", situsZip: "32000", legal: "", neighborhood: "", censusBlock: "", township: "", range: "", section: "", landsAvailableFlag: false } as const;
  for (let i = 0; i < 5; i++) {
    const c = { ...base, countyCode: "72", parcelKey: `B${i}`, justValue: 10000, sales: [{ price: 30000, year: 2026, month: 1, qualified: true, qualCode: "01", vi: "V" }] } as Parcel;
    for (const comp of compsFromParcel(c, a, today)) addComp(idx, "72", comp);
  }
  const subject = { ...base, countyCode: "45", parcelKey: "S", justValue: 10000, sales: [] } as Parcel;
  const v = estimateValue(subject, idx, a, today);
  assert.equal(v.method, "assessed");
});

test("P2: an alt key on the same line as a different parcel number is ambiguous", async () => {
  const nal = roll(["72,07567-012,2026,000,9000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,", "72,99999-999,2026,000,9000,20000,0,0,,,,,,B,X,N9,,PERRY,32347,123456789"]);
  const r = await run(nal, [{ text: "Certificate 123456789 Parcel 07567-012 $1500.00", channel: "auction" }]);
  assert.equal(r.analyses.length, 0);
  assert.match(r.unmatched[0].reason, /more than one parcel/);
});

test("P2: a spaced parcel number still resolves to the full key", () => {
  const p = (key: string, id: string) => ({ key, parcel: { countyCode: "45", parcelKey: key, parcelId: id, countyName: "Lake" } as Parcel });
  const r = resolveMatches([p("042026000000000100", "full"), p("0000000100", "fragment")]);
  assert.ok(r && "parcel" in r && r.parcel.parcelId === "full");
});

test("P2: bare whole number on a text line becomes the opening bid", async () => {
  const [l] = parseListingText("07567-012 5000 12/08/2026", "auction");
  assert.equal(l.openingBid, undefined);
  assert.deepEqual(l.looseNumbers, [{ token: "5000", value: 5000 }]);
  const nal = roll(["72,07567-012,2026,000,10000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "07567-012 5000 12/08/2026", channel: "auction" }]);
  const x = r.analyses[0];
  assert.equal(x.listing.openingBid, 5000);
  assert.ok(x.flags.some((f) => f.code === "AMOUNT_FROM_PLAIN_NUMBER"));
  assert.notEqual(x.verdict, "buy_candidate");
});

test("P2: auction line with no opening bid is never a bid candidate", async () => {
  const nal = roll(["72,07567-012,2026,000,10000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Sale Date\n07567-012,12/08/2026\n", channel: "auction" }]);
  assert.ok(["needs_quote", "pass", "watch"].includes(r.analyses[0].verdict));
  assert.ok(r.analyses[0].flags.some((f) => f.code === "NO_OPENING_BID"));
});

test("P2: vague AMOUNT or DATE columns stop the run with a clear message", () => {
  assert.throws(() => parseListing("Parcel ID,AMOUNT,Date Listed\n07567-012,5000,2025-11-11\n", "lands_available"), ListingError);
  assert.throws(() => parseListing("Parcel ID,Opening Bid,DATE\n07567-012,5000,2025-11-11\n", "lands_available"), /Sale Date/);
  const [l] = parseListing("Parcel ID,Opening Bid,UPDATE_DATE,SALE_DATE\n07567-012,5000,2026-11-11,2025-11-11\n", "auction");
  assert.equal(l.saleDate, "2025-11-11");
});

test("P2: unknown price fits when a cheap purchase leaves cash for the plan", () => {
  const s = settings({ totalCapital: 20000, maxPerDeal: 8000, reservePct: 0.2, strategies: ["rent"] });
  const house = { kind: "single_family", homestead: false, livingSqft: 600, yearBuilt: 2010 } as Parcel;
  const value: ValueEstimate = { market: 100000, low: 1, high: 1, method: "comps_ratio", confidence: "high", compCount: 9, notes: [] };
  const [rent] = buildStrategies({ parcel: house, value, neighbors: [], settings: s, a, allIn: null, ceilingToPrice: (x) => x });
  assert.equal(rent.upfrontCosts, 13750);
  assert.equal(rent.fitsBudget, true);
  assert.equal(rent.affordableAllIn, 16000 - 13750);
});

test("P2: unknown price Lands Available under the minimum viable price is a pass", async () => {
  const nal = roll(["72,07567-012,2026,000,3825,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Case\n07567-012,2025-TD-1\n", channel: "lands_available" }], settings({ strategies: ["wholesale"], totalCapital: 100000, maxPerDeal: 50000 }));
  const x = r.analyses[0];
  assert.equal(x.best && meetsTargets(x.best, settings()), false);
  assert.equal(x.verdict, "pass");
});

test("P2: public mode has no numeric stand in even for absurd values", async () => {
  const { publicSettings } = await import("../src/core/settings.ts");
  const s = publicSettings("");
  assert.equal(s.totalCapital, Infinity);
  const nal = roll(["45,12-19-26-0100-002-00500,2026,000,1700000000000,10000,0,0,,,,,,DOE,X,N1,,EUSTIS,32726,"]);
  const r = await run(nal, [{ text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,5000\n", channel: "lands_available" }], { ...s, strategies: ["quiet_title_and_list"] });
  const text = JSON.stringify(r.analyses, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v));
  assert.ok(!/max per deal|capped by your budget|free cash/.test(text));
});

test("nit: UTF-8 names survive streaming, even split across chunks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "u8-"));
  const f = join(dir, "t.csv");
  writeFileSync(f, "﻿NAME\nJosé Núñez\n");
  for (const size of [1, 2, 3, 64]) {
    const got: string[][] = [];
    for await (const r of readCsvRecords(f, ",", size)) got.push(r);
    assert.deepEqual(got, [["NAME"], ["José Núñez"]], `chunk ${size}`);
  }
});

test("nit: profit is not rounded before the eligibility check", () => {
  const s = settings({ minProfit: 1000, minReturnPct: 0, strategies: ["wholesale"] });
  const lot = { kind: "vacant_residential" } as Parcel;
  const value: ValueEstimate = { market: 10000, low: 1, high: 1, method: "comps_ratio", confidence: "high", compCount: 9, notes: [] };
  const [w] = buildStrategies({ parcel: lot, value: { ...value, market: 10000 }, neighbors: [], settings: s, a, allIn: 2400.4, ceilingToPrice: (x) => x });
  // exit 4000 - 2400.40 - 600 = 999.60
  assert.ok(w.profit < 1000);
  assert.equal(meetsTargets(w, s), false);
});

test("nit: sale age counts months and rejects future sales", () => {
  const p = { countyCode: "45", parcelKey: "X", kind: "vacant_residential", justValue: 10000, neighborhood: "", censusBlock: "", situsZip: "", situsCity: "" } as Parcel;
  const sale = (year: number, month: number) => ({ ...p, sales: [{ price: 15000, year, month, qualified: true, qualCode: "01", vi: "V" }] }) as Parcel;
  assert.equal(compsFromParcel(sale(2023, 1), a, today).length, 0, "Jan 2023 is more than 3 years before Nov 2026");
  assert.equal(compsFromParcel(sale(2024, 1), a, today).length, 1);
  assert.equal(compsFromParcel(sale(2027, 1), a, today).length, 0, "future sale");
});

