// Builds small sample files that use the real Florida NAL column names.
// The parcels are invented. Run: node fixtures/make-fixtures.ts
//
// What is in here, so tests can check behavior:
//   Lake County (45), neighborhood 1001: vacant lots, 10 arm's length sales at about 1.4x just value
//   Lake County (45), neighborhood 2002: single family homes, 8 sales at about 1.2x just value
//   Subjects on the lists:
//     12-19-26-0100-002-00500  good vacant lot, Lands Available (listed by alt key 3800100), opening bid 3,200, neighbors on both sides
//     12-19-26-0200-00C-00000  900 sq ft strip owned by an HOA (avoid)
//     04-20-26-0000-000-00100  use code 096 swamp, written with spaces on the list (avoid)
//     12-19-26-0100-007-03000  vacant lot on Lands Available with no price (get a quote)
//     12-19-26-0100-008-04000  lot with a clerk statement too high to profit (pass)
//     13-19-26-0300-001-02000  house at auction; opening bid above the demo max per deal (pass)
//     14-19-26-0400-000-21000  homestead condo at auction (danger flags)
//     07567-012                small county (Taylor) vacant lot at auction, no comps (low confidence)

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const HEADER = [
  "CO_NO", "PARCEL_ID", "FILE_T", "ASMNT_YR", "DOR_UC", "PA_UC", "JV", "JV_HMSTD", "AV_HMSTD", "AV_SD", "TV_SD",
  "EXMPT_01", "EXMPT_82", "LND_VAL", "LND_UNTS_CD", "NO_LND_UNTS", "LND_SQFOOT", "IMP_QUAL", "CONST_CLASS",
  "EFF_YR_BLT", "ACT_YR_BLT", "TOT_LVG_AREA", "NO_BULDNG", "NO_RES_UNTS", "SPEC_FEAT_VAL",
  "QUAL_CD1", "VI_CD1", "SALE_PRC1", "SALE_YR1", "SALE_MO1", "QUAL_CD2", "VI_CD2", "SALE_PRC2", "SALE_YR2", "SALE_MO2",
  "OWN_NAME", "OWN_ADDR1", "OWN_ADDR2", "OWN_CITY", "OWN_STATE", "OWN_ZIPCD", "OWN_STATE_DOM",
  "S_LEGAL", "MKT_AR", "NBRHD_CD", "PUBLIC_LND", "TAX_AUTH_CD", "TWN", "RNG", "SEC", "CENSUS_BK",
  "PHY_ADDR1", "PHY_ADDR2", "PHY_CITY", "PHY_ZIPCD", "ALT_KEY", "SEQ_NO", "STATE_PAR_ID",
];

type Row = Partial<Record<(typeof HEADER)[number], string | number>>;

const rows: Row[] = [];
let seq = 1;
function add(r: Row) {
  rows.push({ FILE_T: "R", ASMNT_YR: 2026, SEQ_NO: seq++, OWN_STATE: "FL", ...r });
}

// Lake County vacant lots, neighborhood 1001, plat PB 10 PG 20 (Pine Ridge), streets OAK ST and ELM ST.
for (let i = 0; i < 10; i++) {
  const jv = 18000 + i * 600;
  add({
    CO_NO: 45, PARCEL_ID: `12-19-26-0100-007-0${String(2000 + i * 100)}`, DOR_UC: "000", JV: jv, LND_VAL: jv, LND_SQFOOT: 10890,
    QUAL_CD1: "01", VI_CD1: "V", SALE_PRC1: Math.round(jv * (1.3 + (i % 3) * 0.05)), SALE_YR1: 2025, SALE_MO1: 1 + i,
    OWN_NAME: `BUYER ${i} LLC`, OWN_CITY: "TAMPA", S_LEGAL: `PINE RIDGE LOT ${20 + i} BLK 7 PB 10 PG 20`,
    NBRHD_CD: "1001", TWN: "19S", RNG: "26E", SEC: "12", CENSUS_BK: "120690310021001",
    PHY_ADDR1: `${300 + i * 20} ELM ST`, PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
  });
}
// Subject A: good vacant lot on Lands Available, lot 5 block 2.
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0100-002-00500", ALT_KEY: "3800100", DOR_UC: "000", JV: 20000, LND_VAL: 20000, LND_SQFOOT: 10890, EXMPT_82: 20000,
  OWN_NAME: "DOE JOHN", OWN_CITY: "ATLANTA", OWN_STATE: "GA", S_LEGAL: "PINE RIDGE LOT 5 BLK 2 PB 10 PG 20",
  NBRHD_CD: "1001", CENSUS_BK: "120690310021002", PHY_ADDR1: "120 OAK ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
// Its neighbors, lots 4 and 6 (homes).
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0100-002-00400", DOR_UC: "001", JV: 210000, LND_SQFOOT: 10890, TOT_LVG_AREA: 1800, EFF_YR_BLT: 2001, NO_BULDNG: 1, NO_RES_UNTS: 1,
  EXMPT_01: 25000, OWN_NAME: "SMITH MARIA", OWN_CITY: "EUSTIS", S_LEGAL: "PINE RIDGE LOT 4 BLK 2 PB 10 PG 20",
  NBRHD_CD: "2002", PHY_ADDR1: "100 OAK ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0100-002-00600", DOR_UC: "001", JV: 205000, LND_SQFOOT: 10890, TOT_LVG_AREA: 1700, EFF_YR_BLT: 1999, NO_BULDNG: 1, NO_RES_UNTS: 1,
  OWN_NAME: "LEE ROBERT", OWN_CITY: "EUSTIS", S_LEGAL: "PINE RIDGE LOT 6 BLK 2 PB 10 PG 20",
  NBRHD_CD: "2002", PHY_ADDR1: "140 OAK ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
// Far away on the same street: not a neighbor.
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0900-009-04000", DOR_UC: "001", JV: 190000, LND_SQFOOT: 9000, TOT_LVG_AREA: 1500, EFF_YR_BLT: 1995,
  OWN_NAME: "FAR AWAY OWNER", S_LEGAL: "OTHER SUB LOT 40 BLK 9 PB 11 PG 3", NBRHD_CD: "2002",
  PHY_ADDR1: "900 OAK ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});

// Lake County single family homes, neighborhood 2002.
for (let i = 0; i < 8; i++) {
  const jv = 140000 + i * 5000;
  add({
    CO_NO: 45, PARCEL_ID: `13-19-26-0300-001-00${String(100 + i * 100).padStart(3, "0")}`, DOR_UC: "001", JV: jv, LND_SQFOOT: 9000, TOT_LVG_AREA: 1300 + i * 40, EFF_YR_BLT: 1980 + i, NO_BULDNG: 1, NO_RES_UNTS: 1,
    QUAL_CD1: "01", VI_CD1: "I", SALE_PRC1: Math.round(jv * (1.15 + (i % 3) * 0.05)), SALE_YR1: 2025, SALE_MO1: 2 + i,
    // A non qualified sale (code 11) that must be ignored even though it is cheap.
    QUAL_CD2: "11", VI_CD2: "I", SALE_PRC2: 100, SALE_YR2: 2024, SALE_MO2: 5,
    OWN_NAME: `HOMEOWNER ${i}`, S_LEGAL: `MAPLE GROVE LOT ${i + 1} BLK 1 PB 14 PG 8`, NBRHD_CD: "2002",
    PHY_ADDR1: `${1000 + i * 10} MAPLE AVE`, PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
  });
}
// Subject D: house at auction.
add({
  CO_NO: 45, PARCEL_ID: "13-19-26-0300-001-02000", DOR_UC: "001", JV: 150000, LND_SQFOOT: 9000, TOT_LVG_AREA: 1400, EFF_YR_BLT: 1985, NO_BULDNG: 1, NO_RES_UNTS: 1,
  OWN_NAME: "ESTATE OF GREEN", S_LEGAL: "MAPLE GROVE LOT 20 BLK 1 PB 14 PG 8", NBRHD_CD: "2002",
  PHY_ADDR1: "1200 MAPLE AVE", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
// Subject B: sliver owned by an HOA.
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0200-00C-00000", DOR_UC: "000", JV: 100, LND_SQFOOT: 900, OWN_NAME: "SUNNY ACRES HOMEOWNERS ASSN INC",
  S_LEGAL: "SUNNY ACRES TRACT C", NBRHD_CD: "1001", PHY_CITY: "EUSTIS",
});
// Subject C: swamp.
add({
  CO_NO: 45, PARCEL_ID: "04-20-26-0000-000-00100", DOR_UC: "096", JV: 1500, LND_SQFOOT: 217800, OWN_NAME: "UNKNOWN HEIRS", S_LEGAL: "S 1/2 OF NE 1/4 SEC 4", NBRHD_CD: "9000",
});
// Subject E: vacant lot, no price on the list.
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0100-007-03000", DOR_UC: "000", JV: 12000, LND_VAL: 12000, LND_SQFOOT: 8000, OWN_NAME: "BROWN MARY",
  S_LEGAL: "PINE RIDGE LOT 30 BLK 7 PB 10 PG 20", NBRHD_CD: "1001", PHY_ADDR1: "520 ELM ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
// Subject H: lot with a clerk quote that is too high.
add({
  CO_NO: 45, PARCEL_ID: "12-19-26-0100-008-04000", DOR_UC: "000", JV: 15000, LND_VAL: 15000, LND_SQFOOT: 9500, OWN_NAME: "GRAY PAT",
  S_LEGAL: "PINE RIDGE LOT 40 BLK 8 PB 10 PG 20", NBRHD_CD: "1001", PHY_ADDR1: "700 ELM ST", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});
// Subject G: homestead condo at auction.
for (let i = 0; i < 4; i++) {
  add({
    CO_NO: 45, PARCEL_ID: `14-19-26-0400-000-1${String(1000 + i * 10)}`, DOR_UC: "004", JV: 90000 + i * 2000, TOT_LVG_AREA: 900, EFF_YR_BLT: 2008,
    QUAL_CD1: "01", VI_CD1: "I", SALE_PRC1: Math.round((90000 + i * 2000) * 1.25), SALE_YR1: 2025, SALE_MO1: 3 + i,
    OWN_NAME: `CONDO OWNER ${i}`, S_LEGAL: `LAKEVIEW CONDO UNIT ${100 + i}`, NBRHD_CD: "3003", PHY_ADDR1: `50 LAKE DR UNIT ${100 + i}`, PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
  });
}
add({
  CO_NO: 45, PARCEL_ID: "14-19-26-0400-000-21000", DOR_UC: "004", JV: 95000, JV_HMSTD: 95000, EXMPT_01: 25000, TOT_LVG_AREA: 900, EFF_YR_BLT: 2008,
  OWN_NAME: "WHITE SAM", S_LEGAL: "LAKEVIEW CONDO UNIT 210", NBRHD_CD: "3003", PHY_ADDR1: "50 LAKE DR UNIT 210", PHY_CITY: "EUSTIS", PHY_ZIPCD: "32726",
});

// Taylor County (72), small county, vacant lot with no sales nearby.
add({
  CO_NO: 72, PARCEL_ID: "07567-012", DOR_UC: "000", JV: 9000, LND_VAL: 9000, LND_SQFOOT: 21780, OWN_NAME: "OLD OWNER TRUST",
  S_LEGAL: "COUNTRY ACRES LOT 12 BLK 3", NBRHD_CD: "500", PHY_ADDR1: "4410 COUNTY RD 30", PHY_CITY: "PERRY", PHY_ZIPCD: "32347",
});

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const nal = [HEADER.join(","), ...rows.map((r) => HEADER.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
writeFileSync(join(here, "nal_sample.csv"), nal);

// Lands Available list as text, the way it looks when copied out of a clerk PDF.
writeFileSync(
  join(here, "lands_available_sample.txt"),
  [
    "LAKE COUNTY CLERK - LIST OF LANDS AVAILABLE FOR TAXES",
    "Tax Deed #        Parcel / Alt Key        Opening Bid     Date Offered",
    "2025-TD-000123    3800100                 $3,200.00       06/01/2025",
    "2025-TD-000140    12-19-26-0200-00C-00000 $850.00         06/01/2025",
    "2024-TD-000777    04 20 26 0000 000 00100 $1,100.00       03/15/2024",
    "2025-TD-000201    12-19-26-0100-007-03000                 08/20/2025",
    "2025-TD-000999    99-99-99-9999-999-99999 $500.00         08/20/2025",
    "Page 1 of 1",
  ].join("\n") + "\n",
);

// Clerk statement for one parcel, as a CSV.
writeFileSync(join(here, "lands_quotes_sample.csv"), ["Parcel ID,Statement Total,Tax Deed Number", "12-19-26-0100-008-04000,16500.00,2025-TD-000300"].join("\n") + "\n");

// Auction list as a CSV export.
writeFileSync(
  join(here, "auction_sample.csv"),
  ["Case Number,Parcel ID,Opening Bid,Auction Date", "2026-TD-0055,13-19-26-0300-001-02000,9500.00,12/03/2026", "2026-TD-0056,14-19-26-0400-000-21000,48250.00,12/03/2026", "2026-TD-0007,07567-012,1500.00,12/08/2026"].join("\n") + "\n",
);

console.log(`Wrote ${rows.length} NAL rows and 4 list files to ${here}`);
