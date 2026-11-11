import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListing, parseListingText, parcelCandidates, parseDate } from "../src/core/listings.ts";

test("text line from a clerk PDF: case, amount, date, parcel", () => {
  const [l] = parseListingText("2025-TD-000123    12-19-26-0100-002-00500   $3,200.00   06/01/2025", "lands_available");
  assert.equal(l.caseNumber, "2025-TD-000123");
  assert.equal(l.openingBid, 3200);
  assert.equal(l.saleDate, "2025-06-01");
  assert.equal(l.candidateKeys[0], "121926010000200500");
});

test("parcel written with spaces is still found", () => {
  assert.ok(parcelCandidates("04 20 26 0000 000 00100").includes("042026000000000100"));
});

test("lines with no parcel-like number are skipped", () => {
  assert.equal(parseListingText("Page 1 of 3\nTax Deed # Parcel Opening Bid", "auction").length, 0);
});

test("CSV with headers: parcel, bid, quote, case and date columns", () => {
  const rows = parseListing("Case Number,Parcel ID,Opening Bid,Auction Date\n2026-TD-1,13-19-26-0300-001-02000,\"9,500.00\",12/03/2026\n", "auction");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].openingBid, 9500);
  assert.equal(rows[0].caseNumber, "2026-TD-1");
  assert.equal(rows[0].saleDate, "2026-12-03");
  const q = parseListing("Parcel ID,Statement Total\n12-19-26-0100-008-04000,16500.00\n", "lands_available");
  assert.equal(q[0].quotedTotal, 16500);
  assert.equal(q[0].openingBid, undefined);
});

test("date parsing", () => {
  assert.equal(parseDate("3/5/26"), "2026-03-05");
  assert.equal(parseDate("2024-11-01"), "2024-11-01");
  assert.equal(parseDate("13/40/2024"), undefined);
});
