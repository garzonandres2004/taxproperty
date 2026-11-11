// Florida DOR NAL (Name Address Legal) tax roll reader.
// The NAL file has one row per parcel for a county, same columns statewide.
// Field names follow the DOR NAL/SDF/NAP Users Guide.

import type { Parcel, Sale } from "../core/types.ts";
import { flCounty } from "./counties.ts";
import { useCodeInfo } from "./useCodes.ts";

export function parcelKey(id: string): string {
  return (id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(o: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export interface NalOptions {
  qualifiedSaleCodes: string[];
}

function readSale(o: Record<string, string>, n: 1 | 2, opts: NalOptions): Sale | null {
  const price = num(o[`SALE_PRC${n}`]);
  const year = num(o[`SALE_YR${n}`]);
  if (!price || !year) return null;
  const qualCode = (o[`QUAL_CD${n}`] || "").trim().padStart(2, "0");
  return {
    price,
    year,
    month: num(o[`SALE_MO${n}`]),
    qualCode,
    qualified: opts.qualifiedSaleCodes.includes(qualCode),
    vi: (o[`VI_CD${n}`] || "").trim().toUpperCase(),
  };
}

export const REQUIRED_NAL_COLUMNS = ["CO_NO", "PARCEL_ID", "DOR_UC", "JV"];

export function isNalHeader(header: string[]): boolean {
  return REQUIRED_NAL_COLUMNS.every((c) => header.includes(c));
}

export function nalRowToParcel(o: Record<string, string>, opts: NalOptions): Parcel {
  const county = flCounty(o.CO_NO || "");
  const use = useCodeInfo(o.DOR_UC || "");
  const sales: Sale[] = [];
  for (const n of [1, 2] as const) {
    const s = readSale(o, n, opts);
    if (s) sales.push(s);
  }
  const eff = num(o.EFF_YR_BLT);
  const act = num(o.ACT_YR_BLT);
  const situs = [str(o, "PHY_ADDR1"), str(o, "PHY_ADDR2")].filter(Boolean).join(" ");
  return {
    state: "FL",
    countyCode: county?.code ?? (o.CO_NO || ""),
    countyName: county?.name ?? "Unknown",
    parcelId: str(o, "PARCEL_ID"),
    parcelKey: parcelKey(o.PARCEL_ID || ""),
    assessmentYear: num(o.ASMNT_YR),
    useCode: use.code,
    useDescription: use.desc,
    kind: use.kind,
    justValue: num(o.JV),
    landValue: num(o.LND_VAL),
    landSqft: num(o.LND_SQFOOT),
    livingSqft: num(o.TOT_LVG_AREA),
    buildings: num(o.NO_BULDNG),
    units: num(o.NO_RES_UNTS),
    yearBuilt: eff || act || 0,
    homestead: num(o.EXMPT_01) > 0 || num(o.JV_HMSTD) > 0,
    ownerName: str(o, "OWN_NAME"),
    ownerState: str(o, "OWN_STATE", "OWN_STATE_DOM"),
    ownerCity: str(o, "OWN_CITY"),
    situsAddress: situs,
    situsCity: str(o, "PHY_CITY"),
    situsZip: str(o, "PHY_ZIPCD").slice(0, 5),
    legal: str(o, "S_LEGAL"),
    neighborhood: str(o, "NBRHD_CD"),
    censusBlock: str(o, "CENSUS_BK"),
    township: str(o, "TWN"),
    range: str(o, "RNG"),
    section: str(o, "SEC"),
    sales,
    landsAvailableFlag: num(o.EXMPT_82) > 0,
  };
}
