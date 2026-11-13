import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface Assumptions {
  valuation: {
    jvToMarketRatio: number;
    qualifiedSaleCodes: string[];
    compMaxAgeYears: number;
    minCompsForHigh: number;
    minCompsForMedium: number;
    maxCompsUsed: number;
    ratioMin: number;
    ratioMax: number;
    maxSpreadForHigh: number;
    maxSpreadForMedium: number;
  };
  florida: {
    docStampRatePer100: number;
    recordingFirstPage: number;
    recordingAdditionalPage: number;
    deedPages: number;
    annualTaxRateOfJustValue: number;
    landsAvailableMonthlyInterest: number;
  };
  exit: {
    quietTitleCost: number;
    quietTitleMonths: number;
    directSaleClosingCost: number;
    listedSaleCostPctImproved: number;
    listedSaleCostPctLand: number;
    landMarketingMonths: number;
    homeMarketingMonths: number;
    neighborPriceFactor: number;
    wholesaleLandFactor: number;
    investorArvFactor: number;
    holdingCostMonthlyPctOfValue: number;
    evictionBudget: number;
  };
  rehab: {
    lightPerSqft: number;
    mediumPerSqft: number;
    heavyPerSqft: number;
    mobileHomeFlat: number;
    lightIfBuiltAfter: number;
    heavyIfBuiltBefore: number;
    rehabMonths: number;
  };
  rent: { monthlyRentToValue: number; expenseRatio: number; refiLtv: number };
  competition: {
    clearingRatio: Record<"large" | "mid" | "small", Record<"improved" | "vacant" | "other", number>>;
  };
  risk: {
    sliverSqftAvoid: number;
    sliverSqftCaution: number;
    /** Narrowest side, in feet, below which vacant land is a strip and a pass (owner rule, Nov 13 2026). */
    minLotWidthFt: number;
    lowValueCaution: number;
    oldBuildYear: number;
    landsAvailableEscheatYears: number;
  };
  neighbors: { houseNumberRange: number; lotRange: number; maxShown: number };
}

export const DEFAULT_ASSUMPTIONS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "config", "assumptions.json");

function deepMerge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? deepMerge(b, v) : v;
  }
  return out as T;
}

export function loadAssumptions(overridePath?: string): Assumptions {
  const base = JSON.parse(readFileSync(DEFAULT_ASSUMPTIONS_PATH, "utf8")) as Assumptions;
  if (!overridePath) return base;
  const over = JSON.parse(readFileSync(overridePath, "utf8"));
  return deepMerge(base, over);
}
