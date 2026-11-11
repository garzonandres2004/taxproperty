// Regression tests for Codex review round 1 (issue #19). One test per finding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { a, settings } from "./helpers.ts";
import { runFlorida, resolveMatches } from "../src/fl/engine.ts";
import * as listingsModule from "../src/core/listings.ts";
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
    { text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,50000,2026-01-01\n", channel: "lands_available" },
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
    { text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,3000,2026-01-01\n", channel: "lands_available" },
    { text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,3400,2026-01-01\n", channel: "lands_available" },
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
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,5000,2026-01-01\n", channel: "lands_available" }], s);
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

test("P2: several keys for one parcel resolve; two parcels never do", () => {
  const parcel = { countyCode: "45", parcelKey: "042026000000000100", parcelId: "04-20-26-0000-000-00100", countyName: "Lake" } as Parcel;
  const same = resolveMatches([{ key: "042026000000000100", parcel }, { key: "3800100", parcel }]);
  assert.ok(same && "parcel" in same && same.parcel === parcel);
  const other = { countyCode: "45", parcelKey: "0000000100", parcelId: "other", countyName: "Lake" } as Parcel;
  const two = resolveMatches([{ key: "042026000000000100", parcel }, { key: "0000000100", parcel: other }]);
  assert.ok(two && "ambiguous" in two);
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
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,5000,2026-01-01\n", channel: "lands_available" }], { ...s, strategies: ["quiet_title_and_list"] });
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


// Round 2 (issue #19, Codex on 2287d16)

test("R2 P1: overlapping keys of two distinct parcels are ambiguous", async () => {
  const nal = roll(["45,A-1,2026,000,9000,20000,0,0,,,,,,A,X,N1,,EUSTIS,32726,07567012", "45,B-1,2026,000,9000,20000,0,0,,,,,,B,X,N1,,EUSTIS,32726,107567012"]);
  const r = await run(nal, [{ text: "Certificate 107567012 Parcel 07567-012 $1500.00", channel: "lands_available" }]);
  assert.equal(r.analyses.length, 0);
  assert.match(r.unmatched[0].reason, /more than one parcel/);
});

test("R2 P2: disagreeing list dates are flagged, earliest used, order does not matter", async () => {
  const nal = roll(["72,07567-012,2026,000,20000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const f1 = { text: "Parcel ID,Opening Bid,Date Offered\n07567-012,3200,2026-11-11\n", channel: "lands_available" as const };
  const f2 = { text: "Parcel ID,Opening Bid,Date Offered\n07567-012,3200,2025-11-11\n", channel: "lands_available" as const };
  const ab = (await run(nal, [f1, f2])).analyses[0];
  const ba = (await run(nal, [f2, f1])).analyses[0];
  assert.equal(ab.listing.saleDate, "2025-11-11");
  assert.equal(ab.costs!.allIn, ba.costs!.allIn);
  assert.ok(ab.flags.some((f) => f.code === "LISTING_CONFLICT" && /dates disagree/.test(f.message)));
  assert.notEqual(ab.verdict, "buy_candidate");
});

test("R2 P2: auction with no opening bid and nonviable economics is a pass", async () => {
  const nal = roll(["72,07567-012,2026,000,3825,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Sale Date\n07567-012,12/08/2026\n", channel: "auction" }], settings({ strategies: ["wholesale"], totalCapital: 100000, maxPerDeal: 50000 }));
  assert.equal(r.analyses[0].verdict, "pass");
  assert.equal(r.analyses[0].offer.walkAway, 0);
});

test("R2 P2: a rejected plan never produces a purchase instruction", async () => {
  const nal = roll(["72,07567-012,2026,000,3825,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Case\n07567-012,2025-TD-1\n", channel: "lands_available" }], settings({ strategies: ["wholesale"], totalCapital: 100000, maxPerDeal: 50000 }));
  const x = r.analyses[0];
  assert.equal(x.verdict, "pass");
  assert.equal(x.offer.walkAway, 0);
  assert.doesNotMatch(x.offer.note, /Buy only if/);
});

test("R2 note: plain numbers skip year-like values and tiny numbers", () => {
  const { resolveLooseAmount } = listingsModule;
  const [a1] = parseListingText("07567-012 500 2026", "auction");
  assert.equal(resolveLooseAmount(a1, "07567012"), 500);
  const [a2] = parseListingText("07567-012 50 2026", "auction");
  assert.equal(resolveLooseAmount(a2, "07567012"), undefined);
  const [a3] = parseListingText("07567-012 5000", "auction");
  assert.equal(resolveLooseAmount(a3, "07567012"), 5000);
});

// Lake County data run 1 follow ups (issue #18)

test("Run1: a buy resting on a guessed value is held at watch, and a checked value releases it", async () => {
  const nal = roll(["72,07567-012,2026,000,20000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const list = [{ text: "Parcel ID,Statement Total,Date Offered\n07567-012,3000,2026-01-01\n", channel: "lands_available" as const }];
  const guessed = (await run(nal, list)).analyses[0];
  assert.equal(guessed.value.confidence, "low");
  assert.equal(guessed.verdict, "watch");
  assert.ok(guessed.why.some((w) => /value is a guess/.test(w)));
  const listings = list.flatMap((l) => parseListing(l.text, l.channel));
  const checked = await runFlorida({ nalPaths: [nal], listings, settings: settings(), a, calibration: {}, today, valueOverrides: new Map([["07567012", 24000]]) });
  assert.equal(checked.analyses[0].value.method, "user");
  assert.equal(checked.analyses[0].verdict, "buy_candidate");
});

test("Run1: a county appraiser export is rejected with a pointer to the DOR file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pa-"));
  const f = join(dir, "NALExtractPublic.txt");
  writeFileSync(f, "PARCEL_NUMBER,OWNER_NAME,JUST_VALUE\n1,A,100\n");
  await assert.rejects(run(f, [{ text: "Parcel ID,Opening Bid\n111111,500\n", channel: "auction" }]), /Department of Revenue/);
});

test("Run1: avoided parcels are shown by default", async () => {
  const { validateSettings } = await import("../src/core/settings.ts");
  assert.equal(validateSettings({ totalCapital: 1, maxPerDeal: 1 }).showAvoid, true);
  assert.equal(validateSettings({ totalCapital: 1, maxPerDeal: 1, showAvoid: false }).showAvoid, false);
});

test("Run1: a Lands Available price far under value carries a find-the-reason flag", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,2000,2026-01-01\n", channel: "lands_available" }]);
  assert.ok(r.analyses[0].flags.some((f) => f.code === "DEEP_DISCOUNT"));
});

test("Run3: sales that disagree a lot lower the confidence", () => {
  const idx = emptyCompIndex();
  const ratios = [0.5, 0.8, 1.2, 1.7, 2.2, 2.8, 1.0, 2.5];
  ratios.forEach((r, i) => {
    const c = { countyCode: "45", parcelKey: `D${i}`, kind: "agricultural", justValue: 100000, neighborhood: "AG1", censusBlock: "", situsZip: "", situsCity: "", sales: [{ price: 100000 * r, year: 2026, month: 1, qualified: true, qualCode: "01", vi: "V" }] } as Parcel;
    for (const comp of compsFromParcel(c, a, today)) addComp(idx, "45", comp);
  });
  const subject = { countyCode: "45", parcelKey: "S", kind: "agricultural", justValue: 100000, neighborhood: "AG1", censusBlock: "", situsZip: "", situsCity: "", sales: [] } as unknown as Parcel;
  const v = estimateValue(subject, idx, a, today);
  assert.equal(v.method, "comps_ratio");
  assert.equal(v.confidence, "low");
  assert.ok(v.notes.some((n) => /disagree a lot/.test(n)));
});

// Codex round 4 nits

test("R4: a hand value far from the roll estimate is flagged and the estimate is shown", async () => {
  const nal = roll(["72,07567-012,2026,000,20000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const listings = parseListing("Parcel ID,Statement Total,Date Offered\n07567-012,3000,2026-01-01\n", "lands_available");
  const r = await runFlorida({ nalPaths: [nal], listings, settings: settings(), a, calibration: {}, today, valueOverrides: new Map([["07567012", 240000]]) });
  const x = r.analyses[0];
  assert.ok(x.flags.some((f) => f.code === "USER_VALUE_FAR"));
  assert.match(x.value.notes[0], /tax roll estimate was \$23,500/);
});

test("R4: the how-to-fix line shows for a guessed value even when over budget", async () => {
  const nal = roll(["72,07567-012,2026,000,200000,20000,0,0,,,,,,A,X,N9,,PERRY,32347,"]);
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n07567-012,30000,2026-01-01\n", channel: "lands_available" }], settings({ totalCapital: 20000, maxPerDeal: 8000 }));
  const x = r.analyses[0];
  assert.equal(x.value.confidence, "low");
  assert.equal(x.best!.fitsBudget, false, "statement 30000 is over the 8000 max per deal");
  assert.equal(x.verdict, "watch");
  assert.ok(x.why.some((w) => /value is a guess/.test(w)));
});

// Codex round 5 (issue #19)

test("R5: low confidence from disagreeing sales is explained as disagreement, and an override keeps the trace", async () => {
  const ratios = [0.5, 0.8, 1.2, 1.7, 2.2, 2.8, 1.0, 2.5];
  const rows = ratios.map((r, i) => `45,AG-${100000 + i},2026,000,100000,20000,0,0,01,V,${100000 * r},2026,3,O${i},X,N7,,EUSTIS,32726,`);
  const nal = roll([...rows, "45,SUBJ-123456,2026,000,100000,20000,0,0,,,,,,S,X,N7,,EUSTIS,32726,"]);
  const list = [{ text: "Parcel ID,Statement Total,Date Offered\nSUBJ-123456,3000,2026-01-01\n", channel: "lands_available" as const }];
  const x = (await run(nal, list, settings({ totalCapital: 100000, maxPerDeal: 50000 }))).analyses[0];
  assert.equal(x.value.confidence, "low");
  assert.ok(x.value.compCount > 0);
  assert.equal(x.verdict, "watch");
  assert.ok(x.why.some((w) => /sales disagree a lot/.test(w)));
  assert.ok(!x.why.some((w) => /no usable sales nearby/.test(w)));
  assert.match(x.flags.find((f) => f.code === "VALUE_LOW_CONFIDENCE")!.message, /disagree/);
  const listings = list.flatMap((l) => parseListing(l.text, l.channel));
  const o = (await runFlorida({ nalPaths: [nal], listings, settings: settings({ totalCapital: 100000, maxPerDeal: 50000 }), a, calibration: {}, today, valueOverrides: new Map([["SUBJ123456", 29000]]) })).analyses[0];
  assert.equal(o.value.method, "user");
  assert.ok(o.value.notes.some((n) => /Tax roll estimate: .*disagree a lot/.test(n)), "override keeps why the estimate was doubted");
});

// Codex round 6 (issue #19): the reason must reach the HTML report, not only stored notes.

test("R6: after an override, HTML and Markdown both show why the estimate was doubted", async () => {
  const { renderHtml, renderMarkdown } = await import("../src/core/report.ts");
  const ratios = [0.5, 0.8, 1.2, 1.7, 2.2, 2.8, 1.0, 2.5];
  const rows = ratios.map((r, i) => `45,AG-${100000 + i},2026,000,100000,20000,0,0,01,V,${100000 * r},2026,3,O${i},X,N7,,EUSTIS,32726,`);
  const nal = roll([...rows, "45,SUBJ-123456,2026,000,100000,20000,0,0,,,,,,S,X,N7,,EUSTIS,32726,"]);
  const s = settings({ totalCapital: 100000, maxPerDeal: 50000 });
  const listings = parseListing("Parcel ID,Statement Total,Date Offered\nSUBJ-123456,3000,2026-01-01\n", "lands_available");
  const r = await runFlorida({ nalPaths: [nal], listings, settings: s, a, calibration: {}, today, valueOverrides: new Map([["SUBJ123456", 29000]]) });
  const x = r.analyses[0];
  assert.ok(x.flags.some((f) => f.code === "OVERRIDE_OF_DOUBTED_ESTIMATE" && /disagree a lot/.test(f.message)));
  const meta = { title: "t", generatedAt: today, nalFiles: [], listFiles: [], parcelsScanned: r.parcelsScanned, compsFound: r.compsFound, referenceYear: r.referenceYear, unmatched: r.unmatched };
  for (const out of [renderHtml(r.analyses, s, a, meta), renderMarkdown(r.analyses, s, a, meta)]) {
    // The reason must be in the rendered value notes themselves, not only in the flag.
    assert.match(out, /Tax roll estimate: [^<\n]*disagree a lot/);
    assert.match(out, /You replaced a low confidence estimate/);
  }
});

// Lands Available 3 county run (issue #18)

test("LA3: an estimated Lands Available price is never a straight buy; a clerk statement is", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const est = await run(nal, [{ text: "Parcel ID,Opening Bid,Date Offered\n12-19-26-0100-002-00500,3200,2025-11-11\n", channel: "lands_available" }]);
  assert.equal(est.analyses[0].verdict, "needs_quote");
  const stmt = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2026-01-01\n", channel: "lands_available" }]);
  assert.equal(stmt.analyses[0].verdict, "buy_candidate");
});

test("LA3: a parcel listed past the escheat window gets a danger flag and stays at get a quote", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2019-03-01\n", channel: "lands_available" }]);
  const x = r.analyses[0];
  assert.ok(x.flags.some((f) => f.code === "PAST_ESCHEAT" && f.severity === "danger"));
  assert.ok(!x.flags.some((f) => f.code === "ESCHEAT_SOON"));
  assert.equal(x.verdict, "needs_quote");
});

test("LA3: every flag, info included, is in the HTML and Markdown reports", async () => {
  const { renderHtml, renderMarkdown } = await import("../src/core/report.ts");
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const s = settings();
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2024-01-01\n", channel: "lands_available" }], s);
  const meta = { title: "t", generatedAt: today, nalFiles: [], listFiles: [], parcelsScanned: r.parcelsScanned, compsFound: r.compsFound, referenceYear: r.referenceYear, unmatched: r.unmatched };
  const html = renderHtml(r.analyses, s, a, meta);
  const md = renderMarkdown(r.analyses, s, a, meta);
  for (const f of r.analyses[0].flags) {
    const needle = f.message.slice(0, 30).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    assert.ok(html.includes(needle), `html missing ${f.code}`);
    assert.ok(md.includes(f.message.slice(0, 30)), `md missing ${f.code}`);
  }
});

test("LA3: Putnam style list with the clerk's Estimated Purchase Price and Auction Date", async () => {
  const text = "Tax Deed No.,Parcel Number,Estimated Purchase Price,Auction Date,Available for Purchase\nT.D. 2019-0001888,12-19-26-0100-002-00500,\"$1,550.41\",05/13/2026,08/11/2026\n";
  const [l] = parseListing(text, "lands_available");
  assert.equal(l.quotedTotal, 1550.41);
  assert.equal(l.quoteIsEstimate, true);
  assert.equal(l.saleDate, "2026-05-13", "auction date, not the available date");
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const x = (await run(nal, [{ text, channel: "lands_available" }])).analyses[0];
  assert.equal(x.costs!.allIn, 1550.41);
  assert.equal(x.verdict, "needs_quote", "a printed estimate is not a statement");
  assert.match(x.offer.note, /printed estimate/);
  // A real statement for the same parcel wins over the printed estimate.
  const both = await run(nal, [{ text, channel: "lands_available" }, { text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,1700\n", channel: "lands_available" }]);
  assert.equal(both.analyses[0].listing.quotedTotal, 1700);
  assert.equal(both.analyses[0].listing.quoteIsEstimate, undefined);
  assert.ok(!both.analyses[0].flags.some((f) => f.code === "LISTING_CONFLICT"));
});

// Putnam official list run (issue #18)

test("Putnam: inside the county-only 90 days, no 'pay quickly', the opening date is given", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,001,150000,10000,1400,1990,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const text = "Parcel Number,Estimated Purchase Price,Auction Date\n12-19-26-0100-002-00500,20619.76,09/16/2026\n";
  const x = (await run(nal, [{ text, channel: "lands_available" }])).analyses[0];
  assert.doesNotMatch(x.competition.explanation, /pay quickly/);
  assert.match(x.competition.explanation, /Only the county can buy it until about 2026-12-15/);
  assert.ok(x.flags.some((f) => f.code === "COUNTY_WINDOW"));
});

test("Putnam: public reports say n/a for budget fit instead of yes", async () => {
  const { renderHtml, renderMarkdown } = await import("../src/core/report.ts");
  const { publicSettings } = await import("../src/core/settings.ts");
  const s = publicSettings("");
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const r = await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2026-01-01\n", channel: "lands_available" }], s);
  const meta = { title: "t", generatedAt: today, nalFiles: [], listFiles: [], parcelsScanned: r.parcelsScanned, compsFound: r.compsFound, referenceYear: r.referenceYear, unmatched: r.unmatched, publicMode: true };
  for (const out of [renderHtml(r.analyses, s, a, meta), renderMarkdown(r.analyses, s, a, meta)]) {
    assert.match(out, /n\/a \(no budget\)/);
    assert.doesNotMatch(out, /\| yes \||<td>yes<\/td>/);
  }
});


// PR #23 Codex round 1

test("PR23: the 3 year escheat date is a calendar anniversary (1,095 day span)", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const listings = parseListing("Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2024-03-01\n", "lands_available");
  const at = async (d: string) => (await runFlorida({ nalPaths: [nal], listings, settings: settings(), a, calibration: {}, today: new Date(`${d}T12:00:00Z`) })).analyses[0];
  const dayBefore = await at("2027-02-28");
  assert.ok(dayBefore.flags.some((f) => f.code === "ESCHEAT_SOON"));
  assert.ok(!dayBefore.flags.some((f) => f.code === "PAST_ESCHEAT"));
  const anniversary = await at("2027-03-01");
  assert.ok(anniversary.flags.some((f) => f.code === "PAST_ESCHEAT"));
  assert.equal(anniversary.verdict, "needs_quote");
});

test("PR23: Feb 29 anniversaries fall on Feb 28", async () => {
  const { addYears } = await import("../src/fl/risk.ts");
  assert.equal(addYears(new Date("2024-02-29T00:00:00Z"), 3).toISOString().slice(0, 10), "2027-02-28");
  assert.equal(addYears(new Date("2024-02-29T00:00:00Z"), 4).toISOString().slice(0, 10), "2028-02-29");
});

test("PR23: a future list date is flagged and never treated as the county window", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,000,20000,10000,0,0,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const x = (await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,4200,2027-01-15\n", channel: "lands_available" }])).analyses[0];
  assert.ok(x.flags.some((f) => f.code === "FUTURE_SALE_DATE"));
  assert.ok(!x.flags.some((f) => f.code === "COUNTY_WINDOW"));
  assert.doesNotMatch(x.competition.explanation, /Only the county can buy/);
  assert.doesNotMatch(x.competition.explanation, /pay quickly/);
  assert.notEqual(x.verdict, "buy_candidate");
});

test("PR23 r2: a future dated improved parcel with a statement is never a buy and never told to pay quickly", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,001,150000,10000,1400,1990,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const x = (await run(nal, [{ text: "Parcel ID,Statement Total,Date Offered\n12-19-26-0100-002-00500,20000,2027-03-01\n", channel: "lands_available" }], settings({ totalCapital: 500000, maxPerDeal: 100000 }))).analyses[0];
  assert.ok(x.flags.some((f) => f.code === "FUTURE_SALE_DATE"));
  assert.equal(x.verdict, "needs_quote");
  assert.doesNotMatch(x.competition.explanation, /pay quickly/);
  assert.match(x.competition.explanation, /in the future/);
});

// Codex PR #23 round 3 notes

test("PR23 r3: no 'pay quickly' when the timeline is unknown or past the escheat date", async () => {
  const { assessCompetition } = await import("../src/core/competition.ts");
  const house = { kind: "single_family", countyCode: "45" } as Parcel;
  const value = { market: 200000 } as ValueEstimate;
  const best = { profit: 50000, maxPrice: 100000 } as never;
  const base = { parcel: house, value, tier: "mid" as const, best, budgetCeiling: Infinity, a, calibration: {} };
  const noDate = assessCompetition({ ...base, listing: { channel: "lands_available", parcelId: "x", parcelKey: "x", quotedTotal: 5000 }, today });
  const noToday = assessCompetition({ ...base, listing: { channel: "lands_available", parcelId: "x", parcelKey: "x", quotedTotal: 5000, saleDate: "2026-01-01" } });
  const past = assessCompetition({ ...base, listing: { channel: "lands_available", parcelId: "x", parcelKey: "x", quotedTotal: 5000, saleDate: "2023-01-01" }, today });
  const open = assessCompetition({ ...base, listing: { channel: "lands_available", parcelId: "x", parcelKey: "x", quotedTotal: 5000, saleDate: "2026-01-01" }, today });
  for (const c of [noDate, noToday, past]) assert.doesNotMatch(c.explanation, /pay quickly/);
  assert.match(past.explanation, /may already belong to the county/);
  assert.match(open.explanation, /pay quickly/, "statement backed, open to the public, before escheat: urgency is real");
  const estimate = assessCompetition({ ...base, listing: { channel: "lands_available", parcelId: "x", parcelKey: "x", quotedTotal: 4200, quoteIsEstimate: true, saleDate: "2026-01-01" }, today });
  assert.doesNotMatch(estimate.explanation, /pay quickly/);
  assert.match(estimate.explanation, /request the clerk's statement soon/);
});

test("PR25 r1: no list date caps a statement backed house at get a quote", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,001,150000,10000,1400,1990,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const x = (await run(nal, [{ text: "Parcel ID,Statement Total\n12-19-26-0100-002-00500,20000\n", channel: "lands_available" }], settings({ totalCapital: 500000, maxPerDeal: 100000 }))).analyses[0];
  assert.ok(x.flags.some((f) => f.code === "NO_LIST_DATE"));
  assert.equal(x.verdict, "needs_quote");
  assert.doesNotMatch(x.competition.explanation, /pay quickly/);
});

test("PR25 r1: an estimate only house in the open window is get a quote and is told to request the statement, not to pay", async () => {
  const nal = roll([...comps, "45,12-19-26-0100-002-00500,2026,001,150000,10000,1400,1990,,,,,,DOE,X,N1,9 OAK ST,EUSTIS,32726,"]);
  const x = (await run(nal, [{ text: "Parcel ID,Estimated Purchase Price,Date Offered\n12-19-26-0100-002-00500,4200,2026-01-01\n", channel: "lands_available" }], settings({ totalCapital: 500000, maxPerDeal: 100000 }))).analyses[0];
  assert.equal(x.verdict, "needs_quote");
  assert.doesNotMatch(x.competition.explanation, /pay quickly/);
  assert.ok(!x.why.some((w) => /pay quickly/.test(w)));
});
