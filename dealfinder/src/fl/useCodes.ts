// Florida DOR land use codes (DOR_UC in the NAL file) mapped to a short
// description and a property kind the rest of the engine understands.

import type { PropertyKind } from "../core/types.ts";

interface UseInfo {
  desc: string;
  kind: PropertyKind;
}

const EXACT: Record<string, UseInfo> = {
  "000": { desc: "Vacant residential", kind: "vacant_residential" },
  "001": { desc: "Single family", kind: "single_family" },
  "002": { desc: "Mobile home", kind: "mobile_home" },
  "003": { desc: "Multifamily, 10+ units", kind: "multifamily" },
  "004": { desc: "Condominium", kind: "condo" },
  "005": { desc: "Cooperative", kind: "condo" },
  "006": { desc: "Retirement home", kind: "institutional" },
  "007": { desc: "Misc residential", kind: "other" },
  "008": { desc: "Multifamily, under 10 units", kind: "multifamily" },
  "009": { desc: "Residential common area", kind: "trap" },
  "010": { desc: "Vacant commercial", kind: "vacant_commercial" },
  "028": { desc: "Parking lot or mobile home park", kind: "commercial" },
  "040": { desc: "Vacant industrial", kind: "vacant_commercial" },
  "070": { desc: "Vacant institutional", kind: "vacant_other" },
  "082": { desc: "Forest, park, recreational", kind: "government" },
  "090": { desc: "Leasehold interest", kind: "trap" },
  "091": { desc: "Utility", kind: "trap" },
  "092": { desc: "Mining, petroleum, gas", kind: "other" },
  "093": { desc: "Subsurface rights only", kind: "trap" },
  "094": { desc: "Right of way, street, road", kind: "trap" },
  "095": { desc: "River, lake, submerged land", kind: "trap" },
  "096": { desc: "Waste land, marsh, swamp, borrow pit, drainage", kind: "trap" },
  "097": { desc: "Outdoor recreational or recharge land", kind: "vacant_other" },
  "098": { desc: "Centrally assessed", kind: "trap" },
  "099": { desc: "Acreage, not agricultural", kind: "vacant_other" },
};

export function useCodeInfo(raw: string): UseInfo & { code: string } {
  const code = (raw || "").trim().padStart(3, "0").slice(-3);
  const exact = EXACT[code];
  if (exact) return { code, ...exact };
  const n = Number(code);
  if (n >= 11 && n <= 39) return { code, desc: "Commercial", kind: "commercial" };
  if (n >= 41 && n <= 49) return { code, desc: "Industrial", kind: "commercial" };
  if (n >= 50 && n <= 69) return { code, desc: "Agricultural", kind: "agricultural" };
  if (n >= 71 && n <= 79) return { code, desc: "Institutional", kind: "institutional" };
  if (n >= 80 && n <= 89) return { code, desc: "Government owned", kind: "government" };
  return { code, desc: "Unknown use", kind: "other" };
}

export function isVacant(kind: PropertyKind): boolean {
  return kind === "vacant_residential" || kind === "vacant_commercial" || kind === "vacant_other";
}

export function isImprovedResidential(kind: PropertyKind): boolean {
  return kind === "single_family" || kind === "condo" || kind === "mobile_home" || kind === "multifamily";
}
