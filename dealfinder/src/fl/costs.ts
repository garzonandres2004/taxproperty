// What it costs to get a Florida tax deed, on top of the bid or list price.

import type { Assumptions } from "../core/assumptions.ts";
import type { CostBreakdown, Listing, Parcel } from "../core/types.ts";

export function docStamps(price: number, a: Assumptions): number {
  if (price <= 0) return 0;
  return Math.ceil(price / 100) * a.florida.docStampRatePer100;
}

export function recordingFees(a: Assumptions): number {
  const f = a.florida;
  return f.recordingFirstPage + Math.max(0, f.deedPages - 1) * f.recordingAdditionalPage;
}

/** Elapsed months as a fraction (days / average month), so Oct 31 to Nov 1 is about 0.03, not 1. */
export function monthsBetween(fromIso: string | undefined, to: Date): number {
  if (!fromIso) return 0;
  // List dates are plain calendar dates; read them as UTC so the machine's time zone cannot shift them.
  const d = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 0;
  const toDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, (toDay - d.getTime()) / (86400000 * (365.25 / 12)));
}

/** All in cost for a given price (bid). Used for auctions and for solving max bid. */
export function auctionCosts(price: number, a: Assumptions): CostBreakdown {
  const ds = docStamps(price, a);
  const rec = recordingFees(a);
  return { price, docStamps: ds, recording: rec, otherFees: 0, allIn: round2(price + ds + rec) };
}

/**
 * Lands Available: the clerk's statement is the real number. Without one we make
 * a rough planning estimate: opening bid + an assumed share of just value as later
 * taxes + assumed monthly interest on the opening bid + doc stamps + recording.
 * This is NOT the statutory calculation under F.S. 197.502 (bases, accrual dates
 * and rounding are not modeled). Reports label it an estimate and say to get the
 * clerk's statement.
 */
export function landsAvailableCosts(listing: Listing, parcel: Parcel, a: Assumptions, today: Date): CostBreakdown | null {
  if (listing.quotedTotal && listing.quotedTotal > 0) {
    return { price: listing.quotedTotal, docStamps: 0, recording: 0, otherFees: 0, allIn: round2(listing.quotedTotal) };
  }
  if (!listing.openingBid || listing.openingBid <= 0) return null;
  const months = monthsBetween(listing.saleDate, today);
  const omittedTaxes = parcel.justValue * a.florida.annualTaxRateOfJustValue * (months / 12);
  const interest = listing.openingBid * a.florida.landsAvailableMonthlyInterest * months;
  const base = listing.openingBid + omittedTaxes + interest;
  const ds = docStamps(base, a);
  const rec = recordingFees(a);
  return {
    price: listing.openingBid,
    docStamps: round2(ds),
    recording: rec,
    otherFees: round2(omittedTaxes + interest),
    allIn: round2(base + ds + rec),
  };
}

/** Highest bid whose all in cost stays at or under a ceiling. */
export function maxBidForAllIn(allInCeiling: number, a: Assumptions): number {
  const rec = recordingFees(a);
  let bid = Math.floor((allInCeiling - rec) / (1 + a.florida.docStampRatePer100 / 100));
  while (bid > 0 && auctionCosts(bid, a).allIn > allInCeiling) bid -= 1;
  return Math.max(0, bid);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
