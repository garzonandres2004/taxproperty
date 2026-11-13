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
import { loadSettings, publicSettings, SettingsError } from "./core/settings.ts";
import { ListingError, normKey, parseListing, type RawListing } from "./core/listings.ts";
import { calibrate, loadCalibration, type Outcome, type TypeBucket } from "./core/competition.ts";
import { renderHtml, renderMarkdown } from "./core/report.ts";
import { parseCsvText } from "./core/csv.ts";
import { runFlorida } from "./fl/engine.ts";
import { groupRows, parsePastSales, pastSalesToListings, planRecord, renderBacktest, summarize } from "./backtest.ts";
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
  backtest    Compare the model with past auction results you collected
              (--nal FILE --results FILE [--record] [--outcomes FILE] [--out PATH]
               [--include-low-confidence])
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
  --values FILE       CSV of values you checked by hand (Parcel ID, Value); they replace the estimate
  --widths FILE       CSV of the narrowest side you measured on the GIS map (Parcel ID, Width Ft); strips are a pass
  --public            Report safe to post publicly: no budget applied or printed
                      (no settings file needed; verdicts reflect the deal only)
`;

async function analyze(args: Args): Promise<number> {
  const nal = many(args, "nal");
  const lands = many(args, "lands");
  const auction = many(args, "auction");
  if (!nal.length) throw new SettingsError("analyze needs --nal (the county tax roll file).");
  if (!lands.length && !auction.length) throw new SettingsError("analyze needs --lands and/or --auction (the county list).");
  for (const f of [...nal, ...lands, ...auction]) if (!existsSync(f)) throw new SettingsError(`File not found: ${f}`);

  // Public mode: for reports shared on GitHub. No budget is applied or printed,
  // so nothing about the owner's money leaks. Verdicts then reflect the deal only.
  const publicMode = one(args, "public") === "true";
  const settings = publicMode
    ? publicSettings(one(args, "settings") ?? "")
    : loadSettings(one(args, "settings") ?? "", { totalCapital: one(args, "capital"), maxPerDeal: one(args, "max-per-deal") });
  const a = loadAssumptions(one(args, "assumptions"));
  const calibration = loadCalibration(one(args, "calibration") ?? "data/calibration.json");
  const today = one(args, "today") ? new Date(`${one(args, "today")}T12:00:00`) : new Date();

  const listings: RawListing[] = [];
  for (const f of lands) listings.push(...parseListing(readFileSync(f, "utf8"), "lands_available", basename(f)));
  for (const f of auction) listings.push(...parseListing(readFileSync(f, "utf8"), "auction", basename(f)));
  // An empty list is a real answer (some counties have nothing for sale): report it, do not fail.
  if (!listings.length) console.log("No parcel numbers found in the list file(s). Writing an empty report.");

  const valuesFile = one(args, "values");
  const valueOverrides = valuesFile ? loadValueOverrides(valuesFile) : undefined;
  const widthsFile = one(args, "widths");
  const widths = widthsFile ? loadWidths(widthsFile) : undefined;
  const result = await runFlorida({ nalPaths: nal, listings, settings, a, calibration, today, valueOverrides, widths });
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
    publicMode,
  };
  writeFileSync(`${out}.md`, renderMarkdown(result.analyses, settings, a, meta));
  writeFileSync(`${out}.html`, renderHtml(result.analyses, settings, a, meta));
  writeFileSync(`${out}.json`, JSON.stringify({ meta, settings: publicMode ? { ...settings, totalCapital: null, maxPerDeal: null } : settings, analyses: result.analyses }, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 2));

  const counts: Record<string, number> = {};
  for (const x of result.analyses) counts[x.verdict] = (counts[x.verdict] ?? 0) + 1;
  console.log(`Scanned ${result.parcelsScanned.toLocaleString()} parcels, matched ${result.analyses.length} of ${listings.length} list lines.`);
  if (widths) {
    // A typo in a widths file would silently leave a strip unchecked; say which lines matched nothing.
    const listed = new Set(result.analyses.map((x) => normKey(x.parcel.parcelId)));
    const stray = [...widths.keys()].filter((k) => !listed.has(k));
    if (stray.length) console.log(`Widths file: ${stray.length} parcel(s) not on the list, ignored: ${stray.slice(0, 5).join(", ")}${stray.length > 5 ? ", ..." : ""}`);
  }
  console.log(`Verdicts: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
  for (const x of result.analyses.filter((y) => y.verdict === "buy_candidate" || y.verdict === "needs_quote").slice(0, 10)) {
    console.log(`  ${x.verdict.padEnd(13)} ${String(x.score).padStart(3)}  ${x.parcel.parcelId}  ${x.parcel.useDescription}  value ${money(x.value.market)}  max ${money(x.offer.walkAway)}  ${x.best?.label ?? ""}`);
  }
  console.log(`Wrote ${out}.html, ${out}.md, ${out}.json`);
  return 0;
}

/** CSV with a parcel column and a width column: the narrowest side in feet, measured on the GIS map. */
export function loadWidths(path: string): Map<string, number> {
  if (!existsSync(path)) throw new SettingsError(`File not found: ${path}`);
  const rows = parseCsvText(readFileSync(path, "utf8"));
  const header = (rows[0] ?? []).map((h) => h.trim().toUpperCase());
  const pc = header.findIndex((h) => /PARCEL|FOLIO|ALT/.test(h));
  const wc = header.findIndex((h) => /WIDTH|FRONTAGE/.test(h));
  if (pc < 0 || wc < 0) throw new SettingsError(`${path} needs a "Parcel ID" column and a "Width Ft" column.`);
  const m = new Map<string, number>();
  for (const r of rows.slice(1)) {
    // The first number in the cell: "25", "25 ft", "25'" and "25.5 feet" all read as feet.
    const v = Number((r[wc] ?? "").replace(/,/g, "").match(/[0-9]+(?:\.[0-9]+)?/)?.[0]);
    if (r[pc] && Number.isFinite(v) && v > 0) m.set(normKey(r[pc]), v);
  }
  return m;
}

/** CSV with a parcel column and a value column: values you checked by hand replace the estimate. */
export function loadValueOverrides(path: string): Map<string, number> {
  if (!existsSync(path)) throw new SettingsError(`File not found: ${path}`);
  const rows = parseCsvText(readFileSync(path, "utf8"));
  const header = (rows[0] ?? []).map((h) => h.trim().toUpperCase());
  const pc = header.findIndex((h) => /PARCEL|FOLIO|ALT/.test(h));
  const vc = header.findIndex((h) => /VALUE|ARV|PRICE/.test(h));
  if (pc < 0 || vc < 0) throw new SettingsError(`${path} needs a "Parcel ID" column and a "Value" column.`);
  const m = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const v = Number((r[vc] ?? "").replace(/[$,\s]/g, ""));
    if (r[pc] && Number.isFinite(v) && v > 0) m.set(normKey(r[pc]), v);
  }
  return m;
}

/**
 * Backtest against past auction results the user collected (CSV or copied results page text).
 * Each sale date is valued as of that day. With --record, compared sales are added to the
 * outcomes file once per sale event (county, parcel, date); repeats are skipped and
 * conflicting prices are reported, never written.
 */
async function backtest(args: Args): Promise<number> {
  const nal = many(args, "nal");
  const resultsFiles = many(args, "results");
  if (!nal.length || !resultsFiles.length) throw new SettingsError("backtest needs --nal (tax roll) and --results (past auction results).");
  for (const f of [...nal, ...resultsFiles]) if (!existsSync(f)) throw new SettingsError(`File not found: ${f}`);
  const sales = resultsFiles.flatMap((f) => parsePastSales(readFileSync(f, "utf8")));
  if (!sales.length) throw new SettingsError("No past sales found in the results file(s). Expected columns like Parcel ID and Winning Bid, or text copied from an auction results page.");
  const a = loadAssumptions(one(args, "assumptions"));
  const settings = publicSettings(one(args, "settings") ?? "");
  const assumed = (county: string, bucket: "improved" | "vacant" | "other") => a.competition.clearingRatio[flCounty(county)?.tier ?? "small"][bucket];

  // Value each sale as of its own date: one engine run per sale date.
  const fallback = one(args, "today") ?? new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, typeof sales>();
  for (const sale of sales) byDate.set(sale.saleDate ?? fallback, [...(byDate.get(sale.saleDate ?? fallback) ?? []), sale]);
  const rows: ReturnType<typeof summarize> = [];
  let unmatched = 0;
  for (const [date, group] of [...byDate.entries()].sort()) {
    const result = await runFlorida({ nalPaths: nal, listings: pastSalesToListings(group), settings, a, calibration: {}, today: new Date(`${date}T12:00:00Z`) });
    unmatched += result.unmatched.length;
    rows.push(...summarize(result.analyses, group, assumed));
  }
  const sum = {
    rows,
    sold: sales.filter((x) => x.status === "sold").length,
    notSold: sales.filter((x) => x.status !== "sold").length,
    unmatched,
    valuationDates: [...byDate.keys()].sort(),
    byGroup: groupRows(rows, assumed),
  };
  const out = one(args, "out") ?? join("reports", "backtest");
  mkdirSync(dirname(out) || ".", { recursive: true });
  writeFileSync(`${out}.md`, renderBacktest(sum, `Backtest: ${resultsFiles.map((f) => basename(f)).join(", ")}`, (c) => flCounty(c)?.name ?? c) + "\n");
  writeFileSync(`${out}.json`, JSON.stringify(sum, null, 2));
  const n = rows.length;
  const c = (k: string) => rows.filter((r) => r.call === k).length;
  console.log(`Read ${sales.length} past results (${sum.sold} sold, ${sum.notSold} not sold); compared ${n}; ${unmatched} not in the tax roll.`);
  if (n) console.log(`Expected price vs actual: right ${c("right")}, model low ${c("model_low")}, model high ${c("model_high")}. Model ceiling met or exceeded the winning bid in ${rows.filter((r) => r.ceilingMet).length} of ${n}.`);
  for (const g of sum.byGroup) console.log(`  ${flCounty(g.county)?.name ?? g.county} ${g.bucket}: ${g.n} sales, actual median ${Math.round(g.actualMedianRatio * 100)}% of value vs assumed ${Math.round(g.assumedRatio * 100)}%`);
  if (one(args, "record") === "true") {
    const file = one(args, "outcomes") ?? "data/outcomes.csv";
    mkdirSync(dirname(file) || ".", { recursive: true });
    if (!existsSync(file)) writeFileSync(file, OUTCOME_HEADER + "\n");
    const plan = planRecord(rows, readFileSync(file, "utf8"), one(args, "include-low-confidence") === "true");
    for (const r of plan.add) appendFileSync(file, `${r.saleDate},${r.county},${r.parcelId.replace(/,/g, " ")},${r.bucket},${Math.round(r.value)},${r.actual}\n`);
    console.log(`Recorded ${plan.add.length} new outcome(s) to ${file}; ${plan.duplicates} already there; ${plan.skippedLowConfidence} low confidence skipped.`);
    for (const x of plan.conflicts) console.log(`  CONFLICT, not recorded: ${x}`);
    if (plan.add.length) console.log("Run: node src/cli.ts calibrate");
  }
  console.log(`Wrote ${out}.md and ${out}.json`);
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
      case "backtest":
        return await backtest(args);
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
    if (e instanceof SettingsError || e instanceof ListingError) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
