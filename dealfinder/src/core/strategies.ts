// Exit strategies. Each one says what you sell (or keep) the property for,
// what it costs after you buy it, how long it takes, how you would pay for it,
// and the most you can pay and still hit your profit targets.

import type { Assumptions } from "./assumptions.ts";
import type { Neighbor, Parcel, Settings, StrategyName, StrategyResult, ValueEstimate } from "./types.ts";
import { money, pct } from "./stats.ts";

const VACANT_KINDS = new Set(["vacant_residential", "vacant_commercial", "vacant_other", "agricultural"]);
const HOME_KINDS = new Set(["single_family", "condo", "mobile_home", "multifamily"]);

interface Plan {
  name: StrategyName;
  label: string;
  exitPrice: number;
  costLines: { label: string; amount: number; upfront: boolean }[];
  months: number;
  certainty: number;
  financing: string;
  notes: string[];
  isEquity?: boolean; // rent: profit is equity created, not cash
  monthlyRent?: number;
  cashFlowYear?: number;
}

export interface StrategyInput {
  parcel: Parcel;
  value: ValueEstimate;
  neighbors: Neighbor[];
  settings: Settings;
  a: Assumptions;
  /** Known all in purchase cost, or null when no price is known yet. */
  allIn: number | null;
  /** Convert an all in ceiling into the number the user actually sees (bid or statement total). */
  ceilingToPrice: (maxAllIn: number) => number;
}

export function rehabEstimate(p: Parcel, a: Assumptions): { amount: number; tier: string; note?: string } {
  const r = a.rehab;
  if (p.kind === "mobile_home") return { amount: r.mobileHomeFlat, tier: "mobile home flat" };
  let sqft = p.livingSqft;
  let note: string | undefined;
  if (sqft <= 0) {
    sqft = 1200;
    note = "Living area missing on the roll; rehab assumes 1,200 sq ft.";
  }
  let perSqft = r.mediumPerSqft;
  let tier = "medium";
  if (p.yearBuilt > 0 && p.yearBuilt >= r.lightIfBuiltAfter) {
    perSqft = r.lightPerSqft;
    tier = "light";
  } else if (p.yearBuilt > 0 && p.yearBuilt < r.heavyIfBuiltBefore) {
    perSqft = r.heavyPerSqft;
    tier = "heavy";
  }
  const factor = p.kind === "condo" ? 0.8 : 1;
  return { amount: Math.round(sqft * perSqft * factor), tier: `${tier} ($${perSqft}/sq ft)`, note };
}

function plans(p: Parcel, value: ValueEstimate, neighbors: Neighbor[], a: Assumptions): Plan[] {
  const e = a.exit;
  const mv = value.market;
  if (mv <= 0) return [];
  const out: Plan[] = [];
  const holding = (months: number, base: number) => Math.round(base * e.holdingCostMonthlyPctOfValue * months);

  if (VACANT_KINDS.has(p.kind)) {
    const nMonths = 3;
    out.push({
      name: "sell_to_neighbor",
      label: "Sell to a neighbor",
      exitPrice: Math.round(mv * e.neighborPriceFactor),
      costLines: [
        { label: "Closing and deed prep", amount: e.directSaleClosingCost, upfront: false },
        { label: `Holding (${nMonths} months taxes and upkeep)`, amount: holding(nMonths, mv), upfront: true },
      ],
      months: nMonths,
      certainty: neighbors.length ? 0.7 : 0.45,
      financing: "Buy with cash. Neighbors often pay cash; you can also offer owner financing (small down payment, monthly payments) which widens the buyer pool and adds interest income.",
      notes: neighbors.length
        ? [`${neighbors.length} nearby owner(s) found on the tax roll; adjacent owners are the usual buyers for a lot like this.`]
        : ["No neighbor found by street or plat match. Check the GIS map for adjacent owners before counting on this exit."],
    });
    const qMonths = e.quietTitleMonths + e.landMarketingMonths;
    out.push({
      name: "quiet_title_and_list",
      label: "Quiet title, then list for sale",
      exitPrice: mv,
      costLines: [
        { label: "Quiet title action", amount: e.quietTitleCost, upfront: true },
        { label: `Selling costs (${pct(e.listedSaleCostPctLand)})`, amount: Math.round(mv * e.listedSaleCostPctLand), upfront: false },
        { label: `Holding (${qMonths} months)`, amount: holding(qMonths, mv), upfront: true },
      ],
      months: qMonths,
      certainty: 0.8,
      financing: "Buy with cash. Quiet title is paid in cash too. After quiet title the land is insurable, so a buyer can use a land loan.",
      notes: ["Slowest exit but the highest price, because the buyer gets title insurance."],
    });
    out.push({
      name: "wholesale",
      label: "Quick resale to an investor",
      exitPrice: Math.round(mv * e.wholesaleLandFactor),
      costLines: [{ label: "Closing and deed prep", amount: e.directSaleClosingCost, upfront: false }],
      months: 1,
      certainty: 0.85,
      financing: "Buy with cash and resell as is. No extra money needed.",
      notes: ["Land investors pay a deep discount for tax deed land without insurable title."],
    });
    return out;
  }

  if (HOME_KINDS.has(p.kind)) {
    const arv = mv;
    const rehab = rehabEstimate(p, a);
    const eviction = p.homestead ? e.evictionBudget : Math.round(e.evictionBudget / 2);
    const evictionLabel = p.homestead ? "Eviction budget (homestead, likely occupied)" : "Eviction budget (half, occupancy unknown)";
    const prepMonths = Math.max(e.quietTitleMonths, a.rehab.rehabMonths);
    const flipMonths = prepMonths + e.homeMarketingMonths;
    const rehabNotes = rehab.note ? [rehab.note] : [];
    out.push({
      name: "flip",
      label: "Fix and flip",
      exitPrice: arv,
      costLines: [
        { label: `Rehab, ${rehab.tier}`, amount: rehab.amount, upfront: true },
        { label: "Quiet title action", amount: e.quietTitleCost, upfront: true },
        { label: evictionLabel, amount: eviction, upfront: true },
        { label: `Holding (${flipMonths} months)`, amount: holding(flipMonths, arv), upfront: true },
        { label: `Selling costs (${pct(e.listedSaleCostPctImproved)})`, amount: Math.round(arv * e.listedSaleCostPctImproved), upfront: false },
      ],
      months: flipMonths,
      certainty: 0.7,
      financing: "Buy with cash (tax deed sales are cash only). Hard money lenders usually want insurable title, so rehab money from a lender typically comes after quiet title. Before that, rehab is your cash or a private partner.",
      notes: [`Sale value assumes the home is brought to typical condition for the area (${money(arv)}).`, ...rehabNotes],
    });
    const rent = Math.round(arv * a.rent.monthlyRentToValue);
    const noi = Math.round(rent * 12 * (1 - a.rent.expenseRatio));
    out.push({
      name: "rent",
      label: "Fix and rent (keep it)",
      exitPrice: arv,
      costLines: [
        { label: `Rehab, ${rehab.tier}`, amount: rehab.amount, upfront: true },
        { label: "Quiet title action", amount: e.quietTitleCost, upfront: true },
        { label: evictionLabel, amount: eviction, upfront: true },
        { label: `Holding until rented (${prepMonths} months)`, amount: holding(prepMonths, arv), upfront: true },
      ],
      months: prepMonths,
      certainty: 0.65,
      isEquity: true,
      monthlyRent: rent,
      cashFlowYear: noi,
      financing: `Buy with cash. After quiet title you can refinance with a DSCR or conventional loan at about ${pct(a.rent.refiLtv)} of value (${money(arv * a.rent.refiLtv)}) to pull your cash back out.`,
      notes: [`Rough rent ${money(rent)}/month (${(a.rent.monthlyRentToValue * 100).toFixed(2)}% of value); about ${money(noi)}/year after expenses. Check real rents nearby.`, ...rehabNotes],
    });
    out.push({
      name: "wholesale",
      label: "Quick resale to an investor",
      exitPrice: Math.max(0, Math.round(arv * e.investorArvFactor - rehab.amount)),
      costLines: [{ label: "Closing and deed prep", amount: e.directSaleClosingCost, upfront: false }],
      months: 1,
      certainty: 0.8,
      financing: "Buy with cash and resell as is. No extra money needed.",
      notes: [`Investors typically pay about ${pct(e.investorArvFactor)} of after repair value minus repairs.`],
    });
    return out;
  }

  if (p.kind === "commercial" || p.kind === "other" || p.kind === "institutional") {
    const qMonths = e.quietTitleMonths + e.landMarketingMonths + 2;
    out.push({
      name: "quiet_title_and_list",
      label: "Quiet title, then list for sale",
      exitPrice: mv,
      costLines: [
        { label: "Quiet title action", amount: e.quietTitleCost, upfront: true },
        { label: `Selling costs (${pct(e.listedSaleCostPctLand)})`, amount: Math.round(mv * e.listedSaleCostPctLand), upfront: false },
        { label: `Holding (${qMonths} months)`, amount: holding(qMonths, mv), upfront: true },
      ],
      months: qMonths,
      certainty: 0.55,
      financing: "Buy with cash. Commercial buyers will need insurable title.",
      notes: ["Commercial value from the tax roll is rough."],
    });
    out.push({
      name: "wholesale",
      label: "Quick resale to an investor",
      exitPrice: Math.round(mv * e.wholesaleLandFactor),
      costLines: [{ label: "Closing and deed prep", amount: e.directSaleClosingCost, upfront: false }],
      months: 1,
      certainty: 0.6,
      financing: "Buy with cash and resell as is.",
      notes: [],
    });
  }
  return out;
}

// Below this, no county will sell you a tax deed: fees and back taxes alone cost more.
export const MIN_PLAUSIBLE_ALL_IN = 500;

export function buildStrategies(input: StrategyInput): StrategyResult[] {
  const { parcel, value, neighbors, settings, a, allIn, ceilingToPrice } = input;
  const freeCash = settings.totalCapital * (1 - settings.reservePct);
  const results: StrategyResult[] = [];

  for (const plan of plans(parcel, value, neighbors, a)) {
    if (!settings.strategies.includes(plan.name)) continue;
    const extra = plan.costLines.reduce((s, c) => s + c.amount, 0);
    const upfront = plan.costLines.filter((c) => c.upfront).reduce((s, c) => s + c.amount, 0);
    const r = settings.minReturnPct;
    // profit = exit - allIn - extra must be >= minProfit and >= r * (allIn + extra)
    const byDollars = plan.exitPrice - extra - settings.minProfit;
    const byReturn = plan.exitPrice / (1 + r) - extra;
    const maxAllIn = Math.max(0, Math.floor(Math.min(byDollars, byReturn)));
    const maxPrice = ceilingToPrice(maxAllIn);

    // The most the user can pay and still afford the whole plan: under the
    // profit ceiling, under max per deal, and leaving cash for the upfront costs.
    const affordableAllIn = Math.max(0, Math.floor(Math.min(maxAllIn, settings.maxPerDeal, freeCash - upfront)));

    let profit = NaN;
    let returnPct = NaN;
    let cashNeeded: number;
    let fitsBudget: boolean;
    if (allIn !== null) {
      // Not rounded: eligibility is checked on the exact number; reports round for display.
      profit = plan.exitPrice - allIn - extra;
      returnPct = profit / (allIn + extra);
      cashNeeded = allIn + upfront;
      fitsBudget = allIn <= settings.maxPerDeal && cashNeeded <= freeCash;
    } else {
      // Unknown price: it fits if some plausible price meets the targets and leaves cash for the plan.
      fitsBudget = affordableAllIn >= MIN_PLAUSIBLE_ALL_IN;
      cashNeeded = (fitsBudget ? affordableAllIn : MIN_PLAUSIBLE_ALL_IN) + upfront;
    }

    const notes = [...plan.notes];
    if (plan.isEquity) notes.push("Profit shown for this strategy is equity you build, not cash in hand, unless you sell or refinance.");
    let financing = plan.financing;
    if (!fitsBudget && Number.isFinite(freeCash)) {
      const gap = cashNeeded - freeCash;
      if (gap > 0) financing += ` This plan needs about ${money(cashNeeded)} before you get paid, ${money(gap)} more than your free cash (capital minus reserve). You would need a partner or private lender for the gap.`;
    }

    results.push({
      name: plan.name,
      label: plan.label,
      exitPrice: plan.exitPrice,
      extraCosts: extra,
      costLines: plan.costLines.map(({ label, amount }) => ({ label, amount })),
      months: plan.months,
      profit,
      returnPct,
      cashNeeded,
      upfrontCosts: upfront,
      maxAllIn,
      maxPrice,
      affordableAllIn,
      certainty: plan.certainty,
      fitsBudget,
      financing,
      notes,
      monthlyRent: plan.monthlyRent,
      cashFlowYear: plan.cashFlowYear,
    });
  }
  return results;
}

/** Pick the best plan: meets targets, fits budget, highest profit weighted by how sure the exit is. */
export function pickBest(results: StrategyResult[], settings: Settings): StrategyResult | null {
  const meets = (s: StrategyResult) => meetsTargets(s, settings);
  const weight = (s: StrategyResult) => (Number.isFinite(s.profit) ? s.profit : s.maxAllIn) * s.certainty;
  const ranked = [...results].sort((x, y) => {
    const fx = (meets(x) ? 2 : 0) + (x.fitsBudget ? 1 : 0);
    const fy = (meets(y) ? 2 : 0) + (y.fitsBudget ? 1 : 0);
    if (fx !== fy) return fy - fx;
    return weight(y) - weight(x);
  });
  return ranked[0] ?? null;
}

export function meetsTargets(s: StrategyResult, settings: Settings): boolean {
  return Number.isFinite(s.profit)
    ? s.profit >= settings.minProfit && s.returnPct >= settings.minReturnPct
    : s.maxAllIn >= MIN_PLAUSIBLE_ALL_IN;
}
