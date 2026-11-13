// Core types shared by every state adapter. Nothing here is Florida specific.

export type PropertyKind =
  | "vacant_residential"
  | "vacant_commercial"
  | "vacant_other"
  | "single_family"
  | "condo"
  | "mobile_home"
  | "multifamily"
  | "commercial"
  | "agricultural"
  | "institutional"
  | "government"
  | "trap"
  | "other";

export interface Sale {
  price: number;
  year: number;
  month: number;
  qualified: boolean;
  qualCode: string;
  vi: string; // V = vacant at sale, I = improved at sale, blank = unknown
}

/** One parcel from the state tax roll, normalized. */
export interface Parcel {
  state: string;
  countyCode: string;
  countyName: string;
  parcelId: string;
  parcelKey: string; // parcelId with only letters and digits, uppercased, for matching
  assessmentYear: number;
  useCode: string;
  useDescription: string;
  kind: PropertyKind;
  justValue: number;
  landValue: number;
  landSqft: number;
  livingSqft: number;
  buildings: number;
  units: number;
  yearBuilt: number; // effective year built when known, else actual, else 0
  homestead: boolean;
  ownerName: string;
  ownerState: string;
  ownerCity: string;
  situsAddress: string;
  situsCity: string;
  situsZip: string;
  legal: string;
  neighborhood: string;
  censusBlock: string;
  township: string;
  range: string;
  section: string;
  sales: Sale[];
  landsAvailableFlag: boolean; // tax roll says "land available for taxes"
}

export type ListingChannel = "lands_available" | "auction";

/** A parcel that is for sale through a distressed channel. */
export interface Listing {
  channel: ListingChannel;
  parcelId: string;
  parcelKey: string;
  caseNumber?: string;
  /** Opening bid from the list, if the list shows one. */
  openingBid?: number;
  /** A quoted total from the clerk (Lands Available statement). Overrides opening bid math. */
  quotedTotal?: number;
  /** The quoted total is the clerk's printed estimate on the list, not a statement. */
  quoteIsEstimate?: boolean;
  saleDate?: string; // ISO date of auction, or date it went to Lands Available
  sourceLine?: string;
  /** Lines that disagreed when the same parcel was listed more than once. */
  conflicts?: string[];
  /** The opening bid came from a plain number on a text line (no $ sign or cents). */
  amountFromPlainNumber?: boolean;
}

export interface Settings {
  /** Total cash the user has for deals. Required. Never defaulted. Infinity only in public mode (no budget applied). */
  totalCapital: number;
  /** Most the user will put into one purchase, all in. Required. Never defaulted. */
  maxPerDeal: number;
  /** Keep this much cash aside for quiet title, liens and surprises, as a share of capital. */
  reservePct: number;
  /** Minimum profit in dollars for a deal to count. */
  minProfit: number;
  /** Minimum profit as a share of total cash in. */
  minReturnPct: number;
  /** Strategies the user is willing to do. */
  strategies: StrategyName[];
  /** Counties to include (DOR codes or names). Empty means all in the file. */
  counties: string[];
  /** Include parcels flagged avoid in the report (shown separately). */
  showAvoid: boolean;
}

export type StrategyName =
  | "sell_to_neighbor"
  | "quiet_title_and_list"
  | "wholesale"
  | "flip"
  | "rent";

export type Severity = "info" | "caution" | "danger" | "avoid";

export interface RiskFlag {
  code: string;
  severity: Severity;
  message: string;
  check?: string; // what the buyer must verify and where
}

export interface ValueEstimate {
  market: number; // best estimate of market value as is
  low: number;
  high: number;
  method: "comps_ratio" | "own_sale" | "assessed" | "user";
  confidence: "high" | "medium" | "low";
  compCount: number;
  notes: string[];
}

export interface CostBreakdown {
  price: number; // bid or quoted base
  docStamps: number;
  recording: number;
  otherFees: number;
  allIn: number; // what it takes to get the deed
}

export interface StrategyResult {
  name: StrategyName;
  label: string;
  exitPrice: number;
  extraCosts: number; // rehab, quiet title, holding, selling, eviction
  costLines: { label: string; amount: number }[];
  months: number;
  profit: number; // NaN when the purchase price is not known yet
  returnPct: number; // profit / total cost (all in plus extra costs); NaN when price unknown
  cashNeeded: number; // all in plus extra costs paid before exit
  upfrontCosts: number; // costs paid in cash after buying and before the exit pays (rehab, quiet title, holding)
  maxAllIn: number; // highest all in cost (price plus fees) that still meets the user's targets
  maxPrice: number; // same ceiling expressed as a bid (auctions) or statement total (Lands Available)
  affordableAllIn: number; // highest all in purchase that also fits max per deal and free cash after upfront costs
  certainty: number; // 0..1, how likely this exit plays out as modeled
  fitsBudget: boolean;
  financing: string;
  notes: string[];
  monthlyRent?: number;
  cashFlowYear?: number;
}

export interface Competition {
  level: "none" | "low" | "medium" | "high";
  expectedClearing: number; // likely final price
  winChance: "likely" | "maybe" | "unlikely";
  explanation: string;
}

export interface Neighbor {
  parcelId: string;
  ownerName: string;
  situsAddress: string;
  reason: string;
}

export interface Analysis {
  parcel: Parcel;
  listing: Listing;
  value: ValueEstimate;
  costs: CostBreakdown | null; // null when no price is known yet
  priceKnown: boolean;
  flags: RiskFlag[];
  competition: Competition;
  strategies: StrategyResult[];
  best: StrategyResult | null;
  offer: { low: number; high: number; walkAway: number; note: string };
  neighbors: Neighbor[];
  score: number;
  verdict: "buy_candidate" | "needs_quote" | "watch" | "pass" | "avoid";
  why: string[];
}
