import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAmount, parsePastSales, parseResultBlocks, planRecord } from "../src/backtest.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = (args: string[]) => spawnSync(process.execPath, [join(root, "src/cli.ts"), ...args], { cwd: root, encoding: "utf8" });

test("results CSV: sold, canceled and redeemed rows", () => {
  const s = parsePastSales("Parcel ID,Opening Bid,Winning Bid,Sale Date,Status,Sold To\n13-19-26-0300-001-02000,9500,150000,11/04/2026,Sold,3rd Party Bidder\n07567-012,1500,,11/04/2026,Canceled,\n14-19-26-0400-000-21000,48250,60000,11/04/2026,Redeemed,\n");
  assert.equal(s.length, 3);
  assert.deepEqual([s[0].status, s[0].winningBid, s[0].openingBid, s[0].saleDate, s[0].soldTo], ["sold", 150000, 9500, "2026-11-04", "3rd Party Bidder"]);
  assert.equal(s[1].status, "not_sold");
  assert.equal(s[2].status, "not_sold", "redeemed is never a sale even with an amount");
  assert.equal(s[2].winningBid, undefined);
});

test("text copied from an auction results page", () => {
  const text = [
    "Auction Sold",
    "11/04/2026 11:00 AM ET",
    "Amount $45,100.00",
    "Sold To 3rd Party Bidder",
    "Auction Type TAXDEED",
    "Case # 2024-TD-000123",
    "Opening Bid $1,234.56",
    "Parcel ID 12-19-26-0100-002-00500",
    "Property Address 120 OAK ST",
    "Auction Canceled",
    "Case # 2024-TD-000124",
    "Opening Bid",
    "$2,000.00",
    "Parcel ID",
    "07567-012",
  ].join("\n");
  const s = parseResultBlocks(text);
  assert.equal(s.length, 2);
  assert.deepEqual([s[0].parcelId, s[0].winningBid, s[0].openingBid, s[0].soldTo, s[0].status], ["12-19-26-0100-002-00500", 45100, 1234.56, "3rd Party Bidder", "sold"]);
  assert.deepEqual([s[1].parcelId, s[1].openingBid, s[1].status], ["07567-012", 2000, "not_sold"]);
});

test("backtest end to end on the sample roll, then record and calibrate", () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-"));
  const results = join(dir, "results.csv");
  writeFileSync(results, [
    "Parcel ID,Opening Bid,Winning Bid,Sale Date,Sold To",
    "13-19-26-0300-001-02000,9500,150000,11/04/2026,3rd Party Bidder",
    "14-19-26-0400-000-21000,48250,90000,11/04/2026,3rd Party Bidder",
    "07567-012,1500,1500,11/04/2026,Certificate Holder",
    "99-99-99-9999-999-99999,500,800,11/04/2026,3rd Party Bidder",
  ].join("\n") + "\n");
  const out = join(dir, "bt");
  const outcomes = join(dir, "outcomes.csv");
  const r = cli(["backtest", "--nal", "fixtures/nal_sample.csv", "--results", results, "--record", "--outcomes", outcomes, "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /compared 3; 1 not in the tax roll/);
  const md = readFileSync(`${out}.md`, "utf8");
  assert.match(md, /Expected price vs actual winning bid/);
  assert.match(md, /Every sale/);
  assert.match(r.stdout, /1 low confidence skipped/);
  const lines = readFileSync(outcomes, "utf8").trim().split("\n");
  assert.equal(lines.length, 3, "header plus the 2 sales with a medium or high confidence value");
  const c = cli(["calibrate", "--outcomes", outcomes, "--out", join(dir, "cal.json")]);
  assert.equal(c.status, 0, c.stderr);
  const cal = JSON.parse(readFileSync(join(dir, "cal.json"), "utf8"));
  assert.equal(cal["45"].improved.n, 2);
  assert.equal(cal["72"], undefined, "the guessed Taylor value is not used for calibration");
});

test("backtest with no usable results stops with a clear message", () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-"));
  const f = join(dir, "empty.txt");
  writeFileSync(f, "nothing here\n");
  const r = cli(["backtest", "--nal", "fixtures/nal_sample.csv", "--results", f]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /No past sales found/);
});

// Codex PR #27 round 1

test("PR27: one parcel sold on two dates gives two comparisons with their own dates and prices", () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-"));
  const results = join(dir, "r.csv");
  writeFileSync(results, "Parcel ID,Opening Bid,Winning Bid,Sale Date,Status\n13-19-26-0300-001-02000,9500,150000,11/04/2026,Sold\n13-19-26-0300-001-02000,9500,90000,10/01/2026,Sold\n13-19-26-0300-001-02000,9500,,09/01/2026,Canceled\n");
  const out = join(dir, "bt");
  const outcomes = join(dir, "o.csv");
  const r = cli(["backtest", "--nal", "fixtures/nal_sample.csv", "--results", results, "--record", "--outcomes", outcomes, "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /compared 2/);
  const rec = readFileSync(outcomes, "utf8").trim().split("\n").slice(1).sort();
  assert.deepEqual(rec.map((l) => [l.split(",")[0], l.split(",")[5]]), [["2026-10-01", "90000"], ["2026-11-04", "150000"]]);
  const md = readFileSync(`${out}.md`, "utf8");
  assert.match(md, /2026-10-01/);
  assert.match(md, /2026-11-04/);
});

test("PR27: running --record twice adds nothing the second time; a different price is a conflict", () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-"));
  const results = join(dir, "r.csv");
  writeFileSync(results, "Parcel ID,Opening Bid,Winning Bid,Sale Date\n13-19-26-0300-001-02000,9500,150000,11/04/2026\n");
  const outcomes = join(dir, "o.csv");
  const args = ["backtest", "--nal", "fixtures/nal_sample.csv", "--results", results, "--record", "--outcomes", outcomes, "--out", join(dir, "bt")];
  assert.equal(cli(args).status, 0);
  const second = cli(args);
  assert.match(second.stdout, /Recorded 0 new outcome\(s\).*1 already there/);
  assert.equal(readFileSync(outcomes, "utf8").trim().split("\n").length, 2);
  writeFileSync(results, "Parcel ID,Opening Bid,Winning Bid,Sale Date\n13-19-26-0300-001-02000,9500,155000,11/04/2026\n");
  const third = cli(args);
  assert.match(third.stdout, /CONFLICT, not recorded/);
  assert.equal(readFileSync(outcomes, "utf8").trim().split("\n").length, 2);
});

test("PR27: planRecord dedupes within one batch too", () => {
  const row = { parcelId: "A-1", saleDate: "2026-11-04", county: "45", bucket: "vacant" as const, value: 10000, confidence: "high", expected: 4500, modelMax: 5000, actual: 6000, actualRatio: 0.6, call: "model_low" as const, ceilingMet: false, verdict: "pass" };
  const plan = planRecord([row, { ...row }], "date,county,parcel,type,est_market,winning_bid\n", false);
  assert.equal(plan.add.length, 1);
  assert.equal(plan.duplicates, 1);
});

test("PR27: money fields are parsed whole or rejected", () => {
  assert.equal(parseAmount("$1234.5"), 1234.5);
  assert.equal(parseAmount("$45,100.00"), 45100);
  assert.equal(parseAmount("-$500.00"), undefined);
  assert.equal(parseAmount("$500 (pending)"), undefined);
  assert.equal(parseAmount(""), undefined);
  const [b] = parseResultBlocks("Auction Sold\nAmount -$500.00\nParcel ID 07567-012\n");
  assert.equal(b.status, "not_sold", "a negative amount is not a sale price");
});

test("Muse's numbered results format (day headings, one line per item)", () => {
  const text = [
    "# Lake County past tax deed sale results (from lake.realtaxdeed.com)",
    "# Copied verbatim by Muse's browser, Nov 11 2026 ~23:30 MST. View only — no bidding, no login.",
    "",
    "## Tuesday, November 3, 2026 (10 parcels; 3 sold, 7 redeemed)",
    "1. Case 00054-2024, Cert 00054-2024, Parcel 06-18-24-039000018740, 1838 W SCHWARTZ BLVD, LADY LAKE, FL 32159, Opening Bid $12,147.07 — Redeemed",
    "2. Case 00074-2024, Cert 00074-2024, Parcel 06-18-24-039400031170, 606 RAINBOW BLVD, LADY LAKE, FL 32159, Opening Bid $14,007.39 — Redeemed",
    "3. Case 00461-2023, Cert 00461-2023, Parcel 04-19-24-000200008500, POINSETTIA AVE, FRUITLAND PARK, FL 34731, Opening Bid $1,889.31 — SOLD 11/03/2026 11:18 AM ET, $3,900.00, to 3rd Party Bidder",
    "4. Case 02087-2024, Cert 02087-2024, Parcel 08-22-25-100500002400, ROYAL PALM DR, GROVELAND, FL 34714, Opening Bid $6,544.33 — SOLD 11/03/2026 11:26 AM ET, $125,300.00, to 3rd Party Bidder",
    "## Tuesday, October 6, 2026",
    "1. Case 00100-2024, Parcel 01-17-28-0100-000-03700, SOME RD, PAISLEY, FL 32767, Opening Bid $1,786.00 - Canceled",
    "2. Case 00101-2024, Parcel 01-17-28-0100-000-03702, HWY 19 - LOT B, PAISLEY, FL 32767, Opening Bid $1,698.00 — SOLD 10/07/2026 11:02 AM ET, $4,900.00, to 3rd Party Bidder",
  ].join("\n");
  const s = parsePastSales(text);
  assert.equal(s.length, 6);
  assert.deepEqual(s.map((x) => x.status), ["not_sold", "not_sold", "sold", "sold", "not_sold", "sold"]);
  assert.equal(s[5].winningBid, 4900, "a dash inside the address does not hide the result");
  assert.deepEqual([s[2].parcelId, s[2].openingBid, s[2].winningBid, s[2].saleDate, s[2].soldTo], ["04-19-24-000200008500", 1889.31, 3900, "2026-11-03", "3rd Party Bidder"]);
  assert.equal(s[3].winningBid, 125300);
  assert.equal(s[0].saleDate, "2026-11-03", "date comes from the day heading");
  assert.equal(s[4].saleDate, "2026-10-06");
  assert.equal(s[5].saleDate, "2026-10-07", "the date on the SOLD part wins over the heading date");
  assert.equal(s[0].winningBid, undefined);
});

// Codex PR #30 round 1

test("PR30 r1: a dash in the buyer's name does not hide the sale", () => {
  const [x] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, POINSETTIA AVE, Opening Bid $1,889.31 — SOLD 11/03/2026 11:18 AM ET, $3,900.00, to Smith - Jones LLC\n");
  assert.deepEqual([x.status, x.winningBid, x.soldTo], ["sold", 3900, "Smith - Jones LLC"]);
});

test("PR30 r1: status words in the buyer's name do not undo a sale", () => {
  const [x] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, POINSETTIA AVE, Opening Bid $1,889.31 — SOLD 11/03/2026 11:18 AM ET, $3,900.00, to Bankruptcy Estate LLC\n");
  assert.deepEqual([x.status, x.winningBid, x.soldTo], ["sold", 3900, "Bankruptcy Estate LLC"]);
});

test("PR30 r1: a heading with an unknown month gives no date, not the previous day's", () => {
  const s = parsePastSales([
    "## Tuesday, November 3, 2026",
    "1. Case 1-2024, Parcel 06-18-24-039000018740, A ST, Opening Bid $100.00 — Redeemed",
    "## Tuesday, Novembr 10, 2026",
    "1. Case 2-2024, Parcel 06-18-24-039400031170, B ST, Opening Bid $100.00 — Redeemed",
  ].join("\n"));
  assert.equal(s[0].saleDate, "2026-11-03");
  assert.equal(s[1].saleDate, undefined);
});

test("PR30 r2: an address word that starts like a status (SOLDIER RD) is not the result", () => {
  const [a] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, HWY 19 - SOLDIER RD — SOLD $3,900.00, to Smith LLC\n");
  assert.deepEqual([a.status, a.winningBid, a.soldTo], ["sold", 3900, "Smith LLC"], "no Opening Bid");
  const [b] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, HWY 19 - SOLDIER RD, Opening Bid $100.00 (est.) — SOLD $3,900.00, to Smith LLC\n");
  assert.deepEqual([b.status, b.winningBid, b.openingBid], ["sold", 3900, 100], "text between the Opening Bid and the dash");
  const [c] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, 1 BANKRUPTCYVILLE LN - REDEEMEDX CT — Redeemed\n");
  assert.deepEqual([c.status, c.winningBid], ["not_sold", undefined]);
  assert.match(c.sourceLine, /REDEEMEDX/);
});

test("PR30 r1: without an Opening Bid the result starts at the first dash before a result word", () => {
  const [x] = parsePastSales("## Tuesday, November 3, 2026\n3. Case 1-2024, Parcel 04-19-24-000200008500, HWY 19 - LOT B — SOLD $3,900.00, to Smith - Jones LLC\n");
  assert.deepEqual([x.status, x.winningBid, x.soldTo, x.openingBid], ["sold", 3900, "Smith - Jones LLC", undefined]);
});

// Codex PR #27 round 2 follow ups

test("PR27 r2: each sale is valued as of its own date (comps sold later are not used)", () => {
  const dir = mkdtempSync(join(tmpdir(), "bt-"));
  const header = "CO_NO,PARCEL_ID,ASMNT_YR,DOR_UC,JV,LND_SQFOOT,QUAL_CD1,VI_CD1,SALE_PRC1,SALE_YR1,SALE_MO1,OWN_NAME,NBRHD_CD,PHY_CITY,PHY_ZIPCD";
  const comps = Array.from({ length: 8 }, (_, i) => `45,C-${100000 + i},2026,000,10000,10000,01,V,20000,2026,6,O${i},N1,EUSTIS,32726`);
  const nal = join(dir, "nal.csv");
  writeFileSync(nal, [header, ...comps, "45,SUBJ-123456,2026,000,10000,10000,,,,,,S,N1,EUSTIS,32726"].join("\n") + "\n");
  const results = join(dir, "r.csv");
  writeFileSync(results, "Parcel ID,Opening Bid,Winning Bid,Sale Date\nSUBJ-123456,1000,9000,03/01/2026\nSUBJ-123456,1000,9500,11/01/2026\n");
  const out = join(dir, "bt");
  const r = cli(["backtest", "--nal", nal, "--results", results, "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  const rows = JSON.parse(readFileSync(`${out}.json`, "utf8")).rows as { saleDate: string; value: number; confidence: string }[];
  const march = rows.find((x) => x.saleDate === "2026-03-01")!;
  const nov = rows.find((x) => x.saleDate === "2026-11-01")!;
  assert.equal(march.confidence, "low", "June comps did not exist on March 1");
  assert.equal(nov.value, 20000, "by November the June comps (2x just value) are usable");
  assert.notEqual(march.value, nov.value);
});

test("PR27 r2: money with misplaced thousands separators is rejected", () => {
  assert.equal(parseAmount("1,234"), 1234);
  assert.equal(parseAmount("$12,345,678.90"), 12345678.9);
  assert.equal(parseAmount("1,23"), undefined);
  assert.equal(parseAmount("12,34,5"), undefined);
  assert.equal(parseAmount(",123"), undefined);
});

test("PR27 r2: the outcomes file is read with the CSV reader (quoted fields, extra spaces)", () => {
  const row = { parcelId: "A-1", saleDate: "2026-11-04", county: "45", bucket: "vacant" as const, value: 10000, confidence: "high", expected: 4500, modelMax: 5000, actual: 6000, actualRatio: 0.6, call: "model_low" as const, ceilingMet: false, verdict: "pass" };
  const existing = 'date,county,parcel,type,est_market,winning_bid\n"2026-11-04", 45 ,"A-1",vacant,10000,6000\n';
  const plan = planRecord([row], existing, false);
  assert.equal(plan.add.length, 0);
  assert.equal(plan.duplicates, 1);
});
