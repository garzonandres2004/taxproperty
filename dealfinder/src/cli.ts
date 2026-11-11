#!/usr/bin/env node
// Deal Finder command line.
//
//   node src/cli.ts analyze --nal NAL45F202601.csv --lands lake_lands.txt --settings my-settings.json
//   node src/cli.ts analyze --nal roll.csv --auction auction_list.csv --settings my-settings.json --out reports/lake
//   node src/cli.ts record --county 45 --type vacant --est-market 18000 --winning-bid 7200 --parcel 12-34
//   node src/cli.ts calibrate
//   node src/cli.ts counties

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { loadAssumptions } from "./core/assumptions.ts";
import { loadSettings, SettingsError } from "./core/settings.ts";
import { parseListing, type RawListing } from "./core/listings.ts";
import { calibrate, loadCalibration, type Outcome, type TypeBucket } from "./core/competition.ts";
import { renderHtml, renderMarkdown } from "./core/report.ts";
import { parseCsvText } from "./core/csv.ts";
import { runFlorida } from "./fl/engine.ts";
import { allFlCounties, flCounty } from "./fl/counties.ts";
import { money } from "./core/stats.ts";

type Args = Record<string, string[]>;

export function parseArgs(argv: string[]): { cmd: string; args: Args } {
  const [cmd = "help", ...rest] = argv;
  const args: Args = {};
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = rest[i + 1];
    const val = next !== undefined && !next.startsWith("--") ? (i++, next) : "true";
    (args[key] ??= []).push(val);
  }
  return { cmd, args };
}

const one = (a: Args, k: string) => a[k]?.[a[k].length - 1];
const many = (a: Args, k: string) => (a[k] ?? []).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);

const HELP = `Deal Finder (Florida)

Commands
  analyze     Rank parcels from a county list against the tax roll
  record      Save a real auction result (who won, at what price)
  calibrate   Learn auction price levels from your recorded results
  counties    List Florida county codes and size tiers

analyze options
  --nal FILE          Florida DOR NAL tax roll CSV (repeat or comma separate for several)
  --lands FILE        Lands Available list (CSV or text pasted from the PDF/web page)
  --auction FILE      Tax deed auction list (CSV or text)
  --settings FILE     Your settings JSON (budget lives here; see settings.example.json)
  --capital N         Override totalCapital from settings
  --max-per-deal N    Override maxPerDeal from settings
  --assumptions FILE  Override some assumptions (merged over config/assumptions.json)
  --calibration FILE  Calibration from the calibrate command (default data/calibration.json)
  --out PATH          Output path without extension (default reports/deals-DATE)
  --today YYYY-MM-DD  Treat this as today (for reproducible runs)
`;

async function analyze(args: Args): Promise<number> {
  const nal = many(args, "nal");
  const lands = many(args, "lands");
  const auction = many(args, "auction");
  if (!nal.length) throw new SettingsError("analyze needs --nal (the county tax roll file).");
  if (!lands.length && !auction.length) throw new SettingsError("analyze needs --lands and/or --auction (the county list).");
  for (const f of [...nal, ...lands, ...auction]) if (!existsSync(f)) throw new SettingsError(`File not found: ${f}`);

  const settings = loadSettings(one(args, "settings") ?? "", {
    totalCapital: one(args, "capital"),
    maxPerDeal: one(args, "max-per-deal"),
  });
  const a = loadAssumptions(one(args, "assumptions"));
  const calibration = loadCalibration(one(args, "calibration") ?? "data/calibration.json");
  const today = one(args, "today") ? new Date(`${one(args, "today")}T12:00:00`) : new Date();

  const listings: RawListing[] = [];
  for (const f of lands) listings.push(...parseListing(readFileSync(f, "utf8"), "lands_available"));
  for (const f of auction) listings.push(...parseListing(readFileSync(f, "utf8"), "auction"));
  if (!listings.length) throw new SettingsError("No parcel numbers found in the list file(s).");

  const result = await runFlorida({ nalPaths: nal, listings, settings, a, calibration, today });
  const stamp = today.toISOString().slice(0, 10);
  const out = one(args, "out") ?? join("reports", `deals-${stamp}`);
  mkdirSync(dirname(out) || ".", { recursive: true });
  const meta = {
    title: `Deal Finder: ${[...new Set(result.analyses.map((x) => x.parcel.countyName))].join(", ") || "Florida"} ${stamp}`,
    generatedAt: new Date(),
    nalFiles: nal.map((f) => basename(f)),
    listFiles: [...lands, ...auction].map((f) => basename(f)),
    parcelsScanned: result.parcelsScanned,
    compsFound: result.compsFound,
    referenceYear: result.referenceYear,
    unmatched: result.unmatched,
  };
  writeFileSync(`${out}.md`, renderMarkdown(result.analyses, settings, a, meta));
  writeFileSync(`${out}.html`, renderHtml(result.analyses, settings, a, meta));
  writeFileSync(`${out}.json`, JSON.stringify({ meta, settings, analyses: result.analyses }, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 2));

  const counts: Record<string, number> = {};
  for (const x of result.analyses) counts[x.verdict] = (counts[x.verdict] ?? 0) + 1;
  console.log(`Scanned ${result.parcelsScanned.toLocaleString()} parcels, matched ${result.analyses.length} of ${listings.length} list lines.`);
  console.log(`Verdicts: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
  for (const x of result.analyses.filter((y) => y.verdict === "buy_candidate" || y.verdict === "needs_quote").slice(0, 10)) {
    console.log(`  ${x.verdict.padEnd(13)} ${String(x.score).padStart(3)}  ${x.parcel.parcelId}  ${x.parcel.useDescription}  value ${money(x.value.market)}  max ${money(x.offer.walkAway)}  ${x.best?.label ?? ""}`);
  }
  console.log(`Wrote ${out}.html, ${out}.md, ${out}.json`);
  return 0;
}

const OUTCOME_HEADER = "date,county,parcel,type,est_market,winning_bid";

function record(args: Args): number {
  const file = one(args, "outcomes") ?? "data/outcomes.csv";
  const county = flCounty(one(args, "county") ?? "");
  const type = one(args, "type") as TypeBucket | undefined;
  const est = Number(one(args, "est-market"));
  const win = Number(one(args, "winning-bid"));
  if (!county) throw new SettingsError("record needs --county (code like 45 or a name like Lake).");
  if (!type || !["improved", "vacant", "other"].includes(type)) throw new SettingsError("record needs --type improved, vacant or other.");
  if (!(est > 0) || !(win > 0)) throw new SettingsError("record needs --est-market and --winning-bid as positive numbers.");
  mkdirSync(dirname(file) || ".", { recursive: true });
  if (!existsSync(file)) writeFileSync(file, OUTCOME_HEADER + "\n");
  const date = one(args, "date") ?? new Date().toISOString().slice(0, 10);
  appendFileSync(file, `${date},${county.code},${(one(args, "parcel") ?? "").replace(/,/g, " ")},${type},${est},${win}\n`);
  console.log(`Recorded ${county.name} ${type}: winning bid ${money(win)} on estimated value ${money(est)} (${Math.round((win / est) * 100)}%).`);
  return 0;
}

function runCalibrate(args: Args): number {
  const file = one(args, "outcomes") ?? "data/outcomes.csv";
  const out = one(args, "out") ?? "data/calibration.json";
  if (!existsSync(file)) throw new SettingsError(`No outcomes file at ${file}. Use the record command after each auction you watch.`);
  const rows = parseCsvText(readFileSync(file, "utf8"));
  const outcomes: Outcome[] = rows.slice(1).map((r) => ({ countyCode: r[1], bucket: r[3] as TypeBucket, estMarket: Number(r[4]), winningBid: Number(r[5]) }));
  const cal = calibrate(outcomes);
  mkdirSync(dirname(out) || ".", { recursive: true });
  writeFileSync(out, JSON.stringify(cal, null, 2));
  for (const [county, buckets] of Object.entries(cal)) {
    for (const [b, v] of Object.entries(buckets)) console.log(`${flCounty(county)?.name ?? county} ${b}: ${Math.round(v!.ratio * 100)}% of value from ${v!.n} result(s)${v!.n < 3 ? " (needs 3 before it is used)" : ""}`);
  }
  console.log(`Wrote ${out}`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const { cmd, args } = parseArgs(argv);
  try {
    switch (cmd) {
      case "analyze":
        return await analyze(args);
      case "record":
        return record(args);
      case "calibrate":
        return runCalibrate(args);
      case "counties":
        for (const c of allFlCounties()) console.log(`${c.code}  ${c.name.padEnd(14)} ${c.tier}`);
        return 0;
      default:
        console.log(HELP);
        return cmd === "help" || cmd === "--help" ? 0 : 1;
    }
  } catch (e) {
    if (e instanceof SettingsError) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
