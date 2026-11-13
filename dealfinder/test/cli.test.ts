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

test("public mode needs no settings and never prints a budget", () => {
  const dir = mkdtempSync(join(tmpdir(), "df-"));
  const out = join(dir, "pub");
  const r = cli(["analyze", "--nal", "fixtures/nal_sample.csv", "--lands", "fixtures/lands_available_sample.txt", "--auction", "fixtures/auction_sample.csv", "--public", "--today", "2026-11-11", "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  for (const ext of ["html", "md", "json"]) {
    const t = readFileSync(`${out}.${ext}`, "utf8");
    assert.ok(!/1,000,000,000,000|1000000000000|1e\+12|max per deal of|your free cash|capital \$/.test(t), `${ext} leaks budget`);
  }
  assert.match(readFileSync(`${out}.md`, "utf8"), /Public report: no budget applied/);
});

test("an empty county list writes an empty report instead of failing", () => {
  const dir = mkdtempSync(join(tmpdir(), "df-"));
  const list = join(dir, "empty.txt");
  writeFileSync(list, "LIST OF LANDS AVAILABLE\nNo records found\n");
  const out = join(dir, "empty");
  const r = cli(["analyze", "--nal", "fixtures/nal_sample.csv", "--lands", list, "--public", "--today", "2026-11-11", "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(`${out}.md`));
});

test("loadWidths reads the narrowest side in feet, with or without units", async () => {
  const { loadWidths } = await import("../src/cli.ts");
  const dir = mkdtempSync(join(tmpdir(), "w-"));
  const f = join(dir, "widths.csv");
  writeFileSync(f, "Parcel ID,Width Ft\n19-08-26-0000-0062-0260,25 ft\n07567-012,120\n07567-013,\n");
  const m = loadWidths(f);
  assert.equal(m.get("190826000000620260"), 25);
  assert.equal(m.get("07567012"), 120);
  assert.equal(m.size, 2, "a blank width is skipped");
  writeFileSync(f, "Parcel ID,Value\n1,2\n");
  assert.throws(() => loadWidths(f), /Width Ft/);
});
