// Florida DOR county numbers (CO_NO in the NAL file) and a rough size tier.
// Size tier drives the auction competition estimate: more people, more bidders.
// Tiers are approximate population bands, not a measured bidder count.

export type SizeTier = "large" | "mid" | "small";

export interface FlCounty {
  code: string;
  name: string;
  tier: SizeTier;
}

const NAMES: Record<string, string> = {
  "11": "Alachua", "12": "Baker", "13": "Bay", "14": "Bradford", "15": "Brevard",
  "16": "Broward", "17": "Calhoun", "18": "Charlotte", "19": "Citrus", "20": "Clay",
  "21": "Collier", "22": "Columbia", "23": "Miami-Dade", "24": "DeSoto", "25": "Dixie",
  "26": "Duval", "27": "Escambia", "28": "Flagler", "29": "Franklin", "30": "Gadsden",
  "31": "Gilchrist", "32": "Glades", "33": "Gulf", "34": "Hamilton", "35": "Hardee",
  "36": "Hendry", "37": "Hernando", "38": "Highlands", "39": "Hillsborough", "40": "Holmes",
  "41": "Indian River", "42": "Jackson", "43": "Jefferson", "44": "Lafayette", "45": "Lake",
  "46": "Lee", "47": "Leon", "48": "Levy", "49": "Liberty", "50": "Madison",
  "51": "Manatee", "52": "Marion", "53": "Martin", "54": "Monroe", "55": "Nassau",
  "56": "Okaloosa", "57": "Okeechobee", "58": "Orange", "59": "Osceola", "60": "Palm Beach",
  "61": "Pasco", "62": "Pinellas", "63": "Polk", "64": "Putnam", "65": "St. Johns",
  "66": "St. Lucie", "67": "Santa Rosa", "68": "Sarasota", "69": "Seminole", "70": "Sumter",
  "71": "Suwannee", "72": "Taylor", "73": "Union", "74": "Volusia", "75": "Wakulla",
  "76": "Walton", "77": "Washington",
};

const LARGE = new Set(["23", "16", "60", "39", "58", "26", "62", "46", "63"]);
const MID = new Set([
  "15", "61", "74", "69", "68", "51", "21", "59", "52", "45", "66", "27", "47", "11",
  "65", "20", "56", "37", "18", "67", "13", "53", "41", "19", "70",
]);

export function flCounty(codeOrName: string): FlCounty | undefined {
  const raw = codeOrName.trim();
  let code = raw.padStart(2, "0");
  if (!NAMES[code]) {
    const lower = raw.toLowerCase().replace(/\s+county$/, "").replace(/^saint /, "st. ");
    const hit = Object.entries(NAMES).find(([, n]) => n.toLowerCase() === lower || n.toLowerCase().replace(".", "") === lower);
    if (!hit) return undefined;
    code = hit[0];
  }
  const tier: SizeTier = LARGE.has(code) ? "large" : MID.has(code) ? "mid" : "small";
  return { code, name: NAMES[code], tier };
}

export function allFlCounties(): FlCounty[] {
  return Object.keys(NAMES).map((c) => flCounty(c)!);
}
