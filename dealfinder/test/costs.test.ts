import { test } from "node:test";
import assert from "node:assert/strict";
import { a } from "./helpers.ts";
import { auctionCosts, docStamps, landsAvailableCosts, maxBidForAllIn } from "../src/fl/costs.ts";
import type { Listing, Parcel } from "../src/core/types.ts";

test("doc stamps are 70 cents per $100 or part of $100", () => {
  assert.equal(docStamps(3250, a), 33 * 0.7);
  assert.equal(docStamps(3200, a), 32 * 0.7);
  assert.equal(docStamps(0, a), 0);
});

test("max bid is the highest bid whose all in cost fits the ceiling", () => {
  for (const ceiling of [500, 4321, 8000, 125000]) {
    const bid = maxBidForAllIn(ceiling, a);
    assert.ok(auctionCosts(bid, a).allIn <= ceiling, `bid ${bid} fits ${ceiling}`);
    assert.ok(auctionCosts(bid + 1, a).allIn > ceiling, `bid ${bid + 1} would not fit ${ceiling}`);
  }
});

test("Lands Available: clerk statement wins over the estimate", () => {
  const p = { justValue: 20000 } as Parcel;
  const quoted: Listing = { channel: "lands_available", parcelId: "x", parcelKey: "x", openingBid: 3000, quotedTotal: 4100 };
  assert.equal(landsAvailableCosts(quoted, p, a, new Date("2026-11-11"))!.allIn, 4100);
  const est: Listing = { channel: "lands_available", parcelId: "x", parcelKey: "x", openingBid: 3000, saleDate: "2025-11-11" };
  const c = landsAvailableCosts(est, p, a, new Date("2026-11-11"))!;
  // 365 days = 11.99 average months: taxes about 360, interest about 540
  assert.ok(Math.abs(c.otherFees - 900) < 1, String(c.otherFees));
  assert.ok(c.allIn > 3900 && c.allIn < 4000);
  const none: Listing = { channel: "lands_available", parcelId: "x", parcelKey: "x" };
  assert.equal(landsAvailableCosts(none, p, a, new Date()), null);
});
