// Florida risk flags. Each flag says what is wrong and, where it matters,
// what the buyer must check and where. Flags marked "avoid" knock a parcel out.

import type { Assumptions } from "../core/assumptions.ts";
import type { CostBreakdown, Listing, Parcel, RiskFlag, ValueEstimate } from "../core/types.ts";
import { isImprovedResidential, isVacant } from "./useCodes.ts";
import { money } from "../core/stats.ts";

const GOVT_OWNER = /\b(COUNTY|STATE OF FLORIDA|CITY OF|TOWN OF|VILLAGE OF|UNITED STATES|USA|BOARD OF|SCHOOL BOARD|TRUSTEES OF (THE )?INTERNAL|TIITF|WATER MANAGEMENT|DEPT OF|DEPARTMENT OF|HOUSING AUTHORITY)\b/;
const ASSOC_OWNER = /\b(ASSOCIATION|ASSN|ASSOC|HOA|POA|PROPERTY OWNERS|HOMEOWNERS|COMMUNITY DEVELOPMENT|CDD|MASTER ASSOC)\b/;
const COMPANY_OWNER = /\b(INC|LLC|L L C|CORP|CORPORATION|LTD|COMPANY|CO|DEVELOPMENT|DEVELOPERS|HOMES|BUILDERS|PARTNERS|LP)\b/;

export function floridaRiskFlags(args: {
  parcel: Parcel;
  listing: Listing;
  value: ValueEstimate;
  costs: CostBreakdown | null;
  a: Assumptions;
  today: Date;
}): RiskFlag[] {
  const { parcel: p, listing, value, costs, a, today } = args;
  const r = a.risk;
  const flags: RiskFlag[] = [];
  const vacant = isVacant(p.kind);
  const owner = p.ownerName.toUpperCase();

  if (p.kind === "trap") {
    flags.push({ code: "TRAP_USE", severity: "avoid", message: `Use code ${p.useCode} (${p.useDescription}). Parcels like this almost never have a buyer or a use.` });
  }
  if (p.kind === "government") {
    flags.push({ code: "GOVT_USE", severity: "avoid", message: `Use code ${p.useCode} (${p.useDescription}): government or public use land.` });
  }
  if (GOVT_OWNER.test(owner)) {
    flags.push({ code: "GOVT_OWNER", severity: "danger", message: `Owner "${p.ownerName}" looks like a government body. Usually a drainage strip, road remnant, or a listing error.`, check: "Call the clerk's tax deed office and ask why it is on the list." });
  }
  if (ASSOC_OWNER.test(owner)) {
    flags.push({ code: "ASSOC_OWNER", severity: vacant ? "avoid" : "danger", message: `Owner "${p.ownerName}" is an association or district. Land like this is usually a common area, pond, or buffer strip with deed restrictions.` });
  } else if (vacant && COMPANY_OWNER.test(owner) && p.landSqft > 0 && p.landSqft < r.sliverSqftCaution * 2) {
    flags.push({ code: "DEVELOPER_REMNANT", severity: "caution", message: `Small vacant parcel owned by a company. Often a leftover strip, retention area, or common area from a subdivision.`, check: "Look at it on the property appraiser GIS map before anything else." });
  }

  if (vacant && p.landSqft > 0) {
    if (p.landSqft < r.sliverSqftAvoid) {
      flags.push({ code: "SLIVER", severity: "avoid", message: `Only ${Math.round(p.landSqft).toLocaleString()} sq ft. Too small to build on; likely a strip or sliver.` });
    } else if (p.landSqft < r.sliverSqftCaution) {
      flags.push({ code: "SMALL_LOT", severity: "caution", message: `${Math.round(p.landSqft).toLocaleString()} sq ft. May be below minimum lot size for building.`, check: "Check zoning minimum lot size with the city or county planning office." });
    }
  }
  if (p.landSqft <= 0) {
    flags.push({ code: "NO_SIZE", severity: "info", message: "Tax roll does not show land size." });
  }
  if (p.justValue > 0 && p.justValue < r.lowValueCaution) {
    flags.push({ code: "LOW_VALUE", severity: "caution", message: `Appraiser values it at ${money(p.justValue)}. Very low values usually mean unbuildable, landlocked, or wet land.` });
  }
  if (vacant && !p.situsAddress) {
    flags.push({ code: "NO_ADDRESS", severity: "caution", message: "No street address. Could be landlocked or on an unpaved road.", check: "Confirm legal road access on the GIS map." });
  }

  if (p.homestead) {
    flags.push({ code: "HOMESTEAD", severity: "danger", message: "Homestead exemption on the roll. The opening bid includes half of the assessed value, and the owner may still live there.", check: "Drive by. Budget for eviction (writ of possession) if occupied." });
  }
  if (isImprovedResidential(p.kind)) {
    flags.push({ code: "OCCUPANCY", severity: "caution", message: "Has a building. Assume someone lives there until you see it empty. Condition is unknown; you cannot go inside before buying.", check: "Drive by, look for signs of occupancy, roof and window condition." });
  }
  if (p.kind === "condo") {
    flags.push({ code: "CONDO_ASSESSMENTS", severity: "caution", message: "Condo association may try to collect unpaid assessments from the new owner.", check: "Ask the association for an estoppel letter with the balance." });
  }
  if (p.kind === "mobile_home") {
    flags.push({ code: "MOBILE_HOME_TITLE", severity: "caution", message: "The mobile home may have its own DMV title separate from the land.", check: "Check if the home is declared real property (RP decal) with the property appraiser." });
  }
  if (p.yearBuilt > 0 && p.yearBuilt < r.oldBuildYear && !vacant) {
    flags.push({ code: "OLD_BUILDING", severity: "caution", message: `Built around ${p.yearBuilt}. Expect older wiring, plumbing and roof; rehab estimate uses the heavy tier.` });
  }
  if (p.kind === "agricultural") {
    flags.push({ code: "AGRICULTURAL", severity: "caution", message: "Agricultural use. Ag tax classification can be lost on sale, and land lenders are scarce." });
  }
  if (p.kind === "commercial" || p.kind === "vacant_commercial") {
    flags.push({ code: "COMMERCIAL", severity: "caution", message: "Commercial property. Resale value is harder to estimate from the tax roll." });
  }

  if (value.confidence === "low") {
    const disagree = value.method === "comps_ratio" && value.compCount > 0;
    flags.push({
      code: "VALUE_LOW_CONFIDENCE",
      severity: "caution",
      message: disagree
        ? `Value estimate is low confidence: the ${value.compCount} nearby sales disagree a lot.`
        : "Value estimate is low confidence (no usable nearby comparable sales).",
      check: disagree ? "Find out why the sales differ, then pull 3 that truly match this parcel before buying." : "Pull 3 recent sold listings nearby before buying.",
    });
  }
  if (costs && value.market > 0 && costs.allIn >= value.market) {
    flags.push({ code: "PRICE_OVER_VALUE", severity: "danger", message: `All in cost ${money(costs.allIn)} is at or above the estimated value ${money(value.market)}.` });
  }

  // Fixed price far under value, yet nobody bought it at auction: there is usually a reason.
  if (listing.channel === "lands_available" && costs && value.market > 0 && costs.allIn < value.market * 0.15) {
    flags.push({ code: "DEEP_DISCOUNT", severity: "caution", message: `Price is ${Math.round((costs.allIn / value.market) * 100)}% of estimated value and still nobody bid at auction. Usually there is a reason: no road access, wetlands, an unbuildable lot, a big government lien, or a value estimate that is wrong.`, check: "Find the reason before paying: GIS map, lien search, and real sold prices nearby." });
  }
  if (listing.channel === "lands_available" && listing.saleDate) {
    const d = new Date(listing.saleDate);
    if (!Number.isNaN(d.getTime())) {
      const years = (today.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (years >= r.landsAvailableEscheatYears) {
        flags.push({
          code: "PAST_ESCHEAT",
          severity: "danger",
          message: `On the list for ${years.toFixed(1)} years. By statute, Lands Available parcels go to the county after ${r.landsAvailableEscheatYears} years, so this one may already belong to the county or the list may be out of date. Later taxes and interest in the estimate are also very uncertain this long after the sale.`,
          check: "Ask the clerk whether it is still for sale at the opening bid, and get the statement in writing.",
        });
      } else if (years > r.landsAvailableEscheatYears - 0.5) {
        flags.push({ code: "ESCHEAT_SOON", severity: "caution", message: `On the list for ${years.toFixed(1)} years. It goes to the county at ${r.landsAvailableEscheatYears} years, so this window is closing.`, check: "Request the clerk's statement now." });
      }
      if (years < 0.25) {
        flags.push({ code: "COUNTY_WINDOW", severity: "info", message: "Went to the list less than 90 days ago. Only the county can buy it until 90 days pass." });
      }
    }
  }
  if (listing.channel === "lands_available" && !p.landsAvailableFlag) {
    flags.push({
      code: "ROLL_NOT_FLAGGED",
      severity: "caution",
      message: "The tax roll does not mark this parcel as land available for taxes. If the roll is newer than the list, it may already be sold, redeemed, or owned by the county.",
      check: "Confirm with the clerk that it is still available.",
    });
  }
  if (p.ownerState && p.ownerState.toUpperCase() !== "FL") {
    flags.push({ code: "OUT_OF_STATE_OWNER", severity: "info", message: `Owner mailing address is in ${p.ownerState}.` });
  }

  flags.push({ code: "GOVT_LIENS_SURVIVE", severity: "info", message: "Government liens survive a Florida tax deed (code enforcement fines, city utility and lot clearing liens, some special assessments).", check: "Search the county official records and the city code enforcement office for liens on this parcel before paying." });
  flags.push({ code: "QUIET_TITLE", severity: "info", message: "Title insurers usually want a quiet title action before insuring a tax deed. Cost and time are included in the strategies that need insurable title." });

  return flags;
}
