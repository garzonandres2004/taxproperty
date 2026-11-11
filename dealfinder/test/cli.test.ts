import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = (args: string[], cwd = root) => spawnSync(process.execPath, [join(root, "src/cli.ts"), ...args], { cwd, encoding: "utf8" });

test("analyze refuses to run without a budget", () => {
  const dir = mkdtempSync(join(tmpdir(), "df-"));
  const s = join(dir, "s.json");
  writeFileSync(s, JSON.stringify({ totalCapital: null, maxPerDeal: null }));
  const r = cli(["analyze", "--nal", "fixtures/nal_sample.csv", "--lands", "fixtures/lands_available_sample.txt", "--settings", s]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /totalCapital" is required/);
});

test("analyze writes html, md and json", () => {
  const dir = mkdtempSync(join(tmpdir(), "df-"));
  const out = join(dir, "rep");
  const r = cli(["analyze", "--nal", "fixtures/nal_sample.csv", "--lands", "fixtures/lands_available_sample.txt", "--auction", "fixtures/auction_sample.csv", "--capital", "20000", "--max-per-deal", "8000", "--today", "2026-11-11", "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  for (const ext of ["html", "md", "json"]) assert.ok(existsSync(`${out}.${ext}`));
  const j = JSON.parse(readFileSync(`${out}.json`, "utf8"));
  assert.ok(j.analyses.length > 0);
});

test("record then calibrate", () => {
  const dir = mkdtempSync(join(tmpdir(), "df-"));
  const f = join(dir, "o.csv");
  for (const win of [5000, 6000, 7000]) {
    const r = cli(["record", "--outcomes", f, "--county", "Lake", "--type", "vacant", "--est-market", "20000", "--winning-bid", String(win)]);
    assert.equal(r.status, 0, r.stderr);
  }
  const c = cli(["calibrate", "--outcomes", f, "--out", join(dir, "cal.json")]);
  assert.equal(c.status, 0, c.stderr);
  const cal = JSON.parse(readFileSync(join(dir, "cal.json"), "utf8"));
  assert.deepEqual(cal["45"].vacant, { ratio: 0.3, n: 3 });
});
