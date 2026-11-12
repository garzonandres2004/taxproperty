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
