import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { a, settings } from "./helpers.ts";
import { runFlorida } from "../src/fl/engine.ts";
import { parseListing } from "../src/core/listings.ts";
import { auctionCosts } from "../src/fl/costs.ts";
import { renderHtml, renderMarkdown } from "../src/core/report.ts";
import type { Settings } from "../src/core/types.ts";

const fx = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const read = (f: string) => readFileSync(join(fx, f), "utf8");

async function run(s: Settings) {
  const listings = [
    ...parseListing(read("lands_available_sample.txt"), "lands_available"),
    ...parseListing(read("lands_quotes_sample.csv"), "lands_available"),
    ...parseListing(read("auction_sample.csv"), "auction"),
  ];
  return runFlorida({ nalPaths: [join(fx, "nal_sample.csv")], listings, settings: s, a, calibration: {}, today: new Date("2026-11-11T12:00:00") });
}
const byId = (r: Awaited<ReturnType<typeof run>>, id: string) => r.analyses.find((x) => x.parcel.parcelId === id)!;

test("end to end on the sample county files", async () => {
  const r = await run(settings({ showAvoid: true }));
  assert.equal(r.parcelsScanned, 33);
  assert.equal(r.analyses.length, 8);
  assert.equal(r.unmatched.length, 1);

  const lotA = byId(r, "12-19-26-0100-002-00500"); // matched through the alternate key on the list
  assert.equal(lotA.verdict, "buy_candidate");
  assert.equal(lotA.competition.winChance, "likely");
  assert.equal(lotA.value.method, "comps_ratio");
  const nbIds = lotA.neighbors.map((n) => n.parcelId);
  assert.ok(nbIds.includes("12-19-26-0100-002-00400") && nbIds.includes("12-19-26-0100-002-00600"));
  assert.ok(!nbIds.includes("12-19-26-0900-009-04000"), "900 OAK ST is too far away");

  assert.equal(byId(r, "12-19-26-0200-00C-00000").verdict, "avoid"); // HOA sliver
  assert.equal(byId(r, "04-20-26-0000-000-00100").verdict, "avoid"); // swamp, list had the id with spaces
  assert.equal(byId(r, "12-19-26-0100-007-03000").verdict, "needs_quote");
  assert.equal(byId(r, "12-19-26-0100-008-04000").verdict, "pass");

  const house = byId(r, "13-19-26-0300-001-02000");
  assert.equal(house.verdict, "pass");
  assert.match(house.offer.note, /above your max per deal/);

  const condo = byId(r, "14-19-26-0400-000-21000");
  const codes = condo.flags.map((f) => f.code);
  assert.ok(codes.includes("HOMESTEAD") && codes.includes("CONDO_ASSESSMENTS"));

  const taylor = byId(r, "07567-012");
  assert.equal(taylor.value.confidence, "low");
  assert.equal(taylor.verdict, "buy_candidate");
});

test("never suggests paying more than the user's max per deal", async () => {
  for (const maxPerDeal of [2000, 5000, 8000]) {
    const s = settings({ totalCapital: 20000, maxPerDeal });
    const r = await run(s);
    for (const x of r.analyses) {
      if (x.offer.walkAway <= 0) continue;
      const allIn = x.listing.channel === "auction" ? auctionCosts(x.offer.walkAway, a).allIn : x.offer.walkAway;
      assert.ok(allIn <= maxPerDeal, `${x.parcel.parcelId} walk away ${x.offer.walkAway} vs ${maxPerDeal}`);
    }
  }
});

test("results follow the settings: a tiny budget turns buys into watch or pass", async () => {
  const r = await run(settings({ totalCapital: 3000, maxPerDeal: 1000 }));
  assert.ok(!r.analyses.some((x) => x.verdict === "buy_candidate"));
});

test("reports render without NaN, undefined, or Infinity", async () => {
  const s = settings({ showAvoid: true });
  const r = await run(s);
  const meta = { title: "t", generatedAt: new Date(), nalFiles: [], listFiles: [], parcelsScanned: r.parcelsScanned, compsFound: r.compsFound, referenceYear: r.referenceYear, unmatched: r.unmatched };
  for (const out of [renderMarkdown(r.analyses, s, a, meta), renderHtml(r.analyses, s, a, meta)]) {
    assert.ok(!/\bNaN\b|undefined|Infinity/.test(out));
  }
});
