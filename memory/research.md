# City Zoning Integration Research
**Date:** 2026-04-28
**Workstream:** D - City Zoning Integration

## Executive Summary

Utah County maintains ArcGIS REST services that contain zoning data for ALL 16 cities in the county. This is a game-changer - we can get real zoning codes for the 102 city properties instead of just planning department guidance.

## Current Property Distribution (127 total)

| Jurisdiction | Count | Layer ID | Has Real Zoning |
|--------------|-------|----------|-----------------|
| Provo | 27 | 29 | Yes |
| Orem | 18 | 28 | Yes |
| Lehi | 17 | 25 | Yes |
| Pleasant Grove | 6 | 30 | Yes |
| Saratoga Springs | 6 | 34 | Yes |
| American Fork | 4 | 16 | Yes |
| Alpine | 4 | 27 | Yes |
| Spanish Fork | 3 | 35 | Yes |
| Springville | 3 | 36 | Yes |
| Highland | 2 | 24 | Yes |
| Lindon | 2 | 26 | Yes |
| Eagle Mountain | 2 | 20 | Yes |
| Goshen | 2 | 23 | Yes |
| Vineyard | 2 | 37 | Yes |
| Mapleton | 1 | 27 | Yes |
| Cedar Fort | 1 | 17 | Yes |
| Salem | 1 | 32 | Yes |
| Santaquin | 1 | 33 | Yes |
| Unincorporated | 25 | 65 | Already have |

## Key Discovery: Utah County ArcGIS REST API

**Base URL:** `https://maps.utahcounty.gov/arcgis/rest/services/Assessor/CommercialAppraiser/MapServer`

**Zoning Layer IDs (Group 14 - "City Zoning"):**
- 15: Alpine Zoning
- 16: American Fork Zoning
- 17: Cedar Fort Zoning
- 18: Cedar Hills Zoning
- 19: Draper Zoning
- 20: Eagle Mountain Zoning
- 21: Elk Ridge Zoning
- 22: Genola Zoning
- 23: Goshen Zoning
- 24: Highland Zoning
- 25: Lehi Zoning
- 26: Lindon Zoning
- 27: Mapleton Zoning
- 28: Orem Zoning
- 29: Provo Zoning
- 30: Pleasant Grove Zoning
- 31: Payson Zoning
- 32: Salem Zoning
- 33: Santaquin Zoning
- 34: Saratoga Springs Zoning
- 35: Spanish Fork Zoning
- 36: Springville Zoning
- 37: Vineyard Zoning
- 38: Woodland Hills Zoning
- 65: County Zoning (Unincorporated)

## Implementation Strategy

### Step 1: Query AGRC LIR for Parcel Geometry
1. Use existing AGRC LIR endpoint to get parcel coordinates
2. Extract centroid from polygon geometry

### Step 2: Query City Zoning via Identify
1. Use ArcGIS `identify` endpoint with coordinates
2. Specify the appropriate city zoning layer ID
3. Extract zone code and description from attributes

### Step 3: Map to Internal Zone Codes
- Each city uses different zone naming conventions
- Create mapping tables per city to normalize to standard format (e.g., "R-1", "C-2")

## City Planning URLs (for fallback)

```typescript
const CITY_PLANNING_URLS: Record<string, string> = {
  'PROVO': 'https://www.provo.org/departments/community-development/planning',
  'OREM': 'https://orem.gov/planning/',
  'LEHI': 'https://www.lehi-ut.gov/planning-zoning/',
  'SPANISH FORK': 'https://www.spanishfork.org/planning',
  'PLEASANT GROVE': 'https://pgcityutah.gov/departments/community_development/',
  'SPRINGVILLE': 'https://www.springville.org/community-development/',
  'AMERICAN FORK': 'https://www.americanfork.gov/841/Mapping-GIS',
  'HIGHLAND': 'https://www.highlandcity.org/planning',
  'ALPINE': 'https://www.alpineut.gov/168/Planning-Zoning',
  'CEDAR HILLS': 'https://www.cedarhills.org/page/maps',
  'LINDON': 'https://www.lindon.gov/239/Planning-Zoning',
  'MAPLETON': 'https://www.mapleton.org/departments/community_development/resources/maps.php',
  'PAYSON': 'https://www.paysonutah.gov/331/Planning-and-Zoning',
  'SARATOGA SPRINGS': 'https://www.saratogasprings-ut.gov/182/planning-zoning',
  'EAGLE MOUNTAIN': 'https://eaglemountain.gov/government/zoning-in-eagle-mountain/',
  'VINEYARD': 'https://www.vineyardutah.gov/government/planning.php'
}
```

## Sample Zone Codes by City

### Provo
- ZONE_PR_DESC: "Residential - Single Family", ZONE_PR_LABEL: "R1"
- ZONE_PR_DESC: "Commercial - General", ZONE_PR_LABEL: "CG"
- ZONE_PR_DESC: "Manufacturing - Light", ZONE_PR_LABEL: "M1"

### Orem
- ZONE_OR_DESC: "Residential", ZONE_OR_LABEL: "R"
- ZONE_OR_DESC: "Commercial - Local", ZONE_OR_LABEL: "CL"

### Lehi
- Uses: ZONE_LE_DESC, ZONE_LE_LABEL

## API Query Pattern

```
// Step 1: Get coordinates from AGRC
https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?
  where=PARCEL_ID='{parcelId}'&
  outFields=PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES&
  returnGeometry=true&
  outSR=4326&
  f=json

// Step 2: Query zoning via identify
https://maps.utahcounty.gov/arcgis/rest/services/Assessor/CommercialAppraiser/MapServer/identify?
  geometry={x:lon,y:lat}&
  geometryType=esriGeometryPoint&
  sr=4326&
  layers=show:{layerId}&
  tolerance=10&
  mapExtent={extent}&
  imageDisplay=800,600,96&
  f=json
```

## Blockers/Issues
- None - API is publicly accessible
- Rate limiting unknown - implement with delays
- Some zones may need manual mapping to standardized codes

## Next Steps
1. Create `src/lib/zoning/cities/` directory
2. Create fetcher for each city
3. Update auto-fill pipeline to use city fetchers
4. Test with sample parcels from each city

### [2026-04-29] investigador — Municipal Lien Detection for Utah County

**Pregunta:** What municipal lien and code enforcement data sources are available for Utah County properties, and how can we integrate them into the TaxProperty platform?

**Hallazgo:**

## 1. Utah County Code Enforcement API (Automated Source Found)

**ArcGIS REST API Endpoint:**
- Base URL: `https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer`
- Layer 7: "UT Cases - Open Current Year" (code enforcement for unincorporated Utah County)
- Query URL: `https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer/7/query`

**Available Fields:**
- `SITE_APN` - Parcel number (can query by this)
- `CASE_NO`, `CASE_NAME`, `CaseType`, `CaseSubType`
- `STATUS` - Values: "Investigation Started", "Notice Given", "At Hearing", "Closed", "Lien"
- `DESCRIPTION` - Violation description
- `STARTED`, `CLOSED`, `LASTACTION` - Dates
- `FEES_CHARGED`, `FEES_PAID`, `BALANCE_DUE` - Financial impact
- `SITE_ADDR`, `SITE_CITY`, `SITE_ZIP` - Location
- `LAT`, `LON` - Coordinates

**Important Limitation:**
This API only covers **unincorporated areas** of Utah County (approximately 25/127 properties in our database). Cities like Provo, Orem, Lehi handle their own code enforcement and do NOT appear in this database.

## 2. City Code Enforcement (Manual Sources Required)

**Provo:**
- CityView Portal: https://cvportal.provo.org/CityViewPortal
- Code Compliance: (801) 852-6427
- No public API found — must search manually or contact department

**Other Cities (Orem, Lehi, etc.):**
- No public APIs or searchable databases found
- Each city maintains its own code enforcement records
- Manual contact required for violation checks

## 3. Utility Liens (Manual Search Required)

**No centralized database found.** Utility liens:
- Are recorded with Utah County Recorder's Office
- Must be searched manually by property/owner name
- Include water, sewer, gas, electric liens
- Search URL: https://www.utahcounty.gov/LandRecords/namesearch.asp

## 4. Legal Context — Why This Matters

Per Utah law and Dustin Hahn's training:
- **Municipal liens survive tax deed sales** — they are NOT wiped out like federal tax liens
- Code enforcement fees and utility liens remain attached to property
- Buyers must pay these before clear title

**Implication:** Municipal liens directly impact max bid calculations and must be subtracted from bids.

## 5. Implementation Strategy

### Automated (Unincorporated Properties):
- Query ArcGIS API by `SITE_APN` (parcel number without colons)
- Check for open cases with `BALANCE_DUE > 0` or `STATUS = "Lien"`
- Flag properties with active violations

### Manual (City Properties):
- Provide links to city code enforcement departments
- Create checklist item for manual verification
- Link to Utah County Recorder for utility lien search

**Implicación:** 
We can implement a hybrid approach:
1. Auto-check unincorporated properties via API (20% coverage)
2. Provide manual checklist + links for city properties (80% coverage)
3. Add scoring penalty (-20 points) for municipal lien risk
4. Display warning: "Municipal liens may survive foreclosure"

**Sources:**
- [Utah County Code Enforcement API](https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer/7)
- [Provo Code Compliance](https://ut-provo.civicplus.com/207/Code-Compliance)
- [Utah County Land Records](https://www.utahcounty.gov/landrecords/)

---

### [2026-05-02] investigador — Rich County, Utah 2026 May Tax Sale Property List

**Pregunta:** Where is the 2026 Rich County, Utah tax sale property list, and what is the complete parcel data (parcel numbers, addresses, owner names, amounts due)?

**Hallazgo:** 

## Source Location
- **Official URL:** https://www.richcounty.gov/wp-content/uploads/may-tax-sale-list-rich-county-utah.pdf
- **Updated:** 4/24/2026 by Rich County Clerk/Auditor Anneliesa Peart
- **Auction Date:** Thursday, May 14, 2026, 10:00 AM MDT
- **Platform:** Public Surplus (https://www.publicsurplus.com/sms/richco,ut/browse/cataucs?catid=15)
- **Registration Deadline:** Tuesday, May 12, 2026 at 4:00 PM MDT
- **Bid Deposit Required:** $1,000.00 (wire transfer via Public Surplus)

## Complete 2026 Rich County Tax Sale Property List

**Note:** Properties marked "PAID" or "DATE REDEEMED" have been redeemed prior to sale. Only properties with "AMT DUE" and no redemption date remain available for the May 14 auction.

### Property 1: SEALE, HENRY & CATHERINE
- **Parcel Number:** 36-04-050-0022
- **Address:** PO BOX 878, EVANSTON, WY 82930
- **Legal Description:** LOT 22, SWEETWATER GOLF COURSE SUBDIVISION 5
- **Amount Due:** $1,856.02
- **Redemption Status:** NOT REDEEMED
- **Public Surplus Auction ID:** 3987454

### Property 2: TAYLOR, SHERRY & ALLEN
- **Parcel Number:** 36-05-130-0004
- **Address:** PO BOX 569, GARDEN CITY, UT 84028
- **Legal Description:** LOT 4, OMEGA SUBDIVISION 2
- **Amount Due:** $9,274.29
- **Redemption Status:** NOT REDEEMED
- **Public Surplus Auction ID:** 3987459

### Property 3: HUMBERT, STEVEN T & JEPPSON, LISA
- **Parcel Number:** 37-17-010-0028
- **Address:** 1354 W 1300 S, WOODS CROSS, UT 84087
- **Legal Description:** LOT 28, VISTA GRANDE ESTATES SUBDIVISION
- **Amount Due:** $8,269.05
- **Redemption Status:** NOT REDEEMED
- **Public Surplus Auction ID:** 3987509

### Property 4: TOONE, JAMES AVARD
- **Parcel Number:** 41-30-090-0106
- **Address:** 10129 GRAND OAK CIR, MADEIRA BEACH, FL 33708
- **Legal Description:** PART OF THE OPEN SPACE, EAGLE FEATHER AT SHUNDAHAI SUBDIVISION DESCRIBED AS FOLLOWS: BEGINNING AT THE SOUTHWEST CORNER OF LOT 93 OF SAID EAGLE FEATHER AT SHUNDAHAI SUBDIVISION, AND RUNNING THENCE NORTH 88*24'00" EAST 135.94 FEET, ALONG THE SOUTH LINE OF SAID LOT 93 TO THE NORTHWEST CORNER OF LOT 94 OF SAID EAGLE FEATHER AT SHUNDAHAI SUBDIVISION, THENCE SOUTH 01*33'38" WEST 494.12 FEET, ALONG THE WEST LINES OF LOTS 94, 95, 58 & 59 OF SAID EAGLE FEATHER AT SHUNDAHAI SUBDIVISION TO THE SOUTHWEST CORNER OF SAID LOT 59; THENCE NORTH 88*26'23" WEST 139.48 FT TO THE WEST LINE OF SAID EAGLE FEATHER AT SHUNDAHAI SUBDIVISION; THENCE NORTH 01*53'10" EAST ALONG SAID WEST LINE TO THE POINT OF BEGINNING.
- **Amount Due:** $4,374.15
- **Redemption Status:** NOT REDEEMED
- **Public Surplus Auction ID:** 3987517

## Redeemed Properties (Removed from Auction)

The following 6 properties were redeemed before May 14 and will NOT be sold at auction:

1. **19-16-420-0005** — Kennedy, Brandon & Ashley (4104 W Park Cir, Highland, UT 84003) — Redeemed 4/21/26 by Kennedy
2. **36-03-020-0346** — Stubblefield, Jay (PO Box 188, Garden City, UT 84028) — Redeemed 4/24/2026 by Sweetwater Trl Park
3. **36-05-050-0024** — Lund, Kenneth D & Nancy A, Trustees (684 W 3600 S, Bountiful, UT 84010-4021) — Redeemed 4/17/26 by Allred
4. **36-05-170-0005** — Ochoa, Joaquin & Tamariz, Maria G (2317 S 730 W, Nibley, UT 84321) — Redeemed 4/15/26 by Rich Land Title Company
5. **36-10-010-0317** — Rogers, Brandon & Jessica Rae (2680 W 300 N, West Point, UT 84015) — Redeemed 4/20/26 by Rogers
6. **41-17-030-0035** — Howes, Adam & Graham (391 Red Fox Trace, Logan, UT 84321) — Redeemed 4/20/26 by Howes

## Key Observations

1. **Only 4 properties remain active** from the original list of 10 properties published in the May Tax Sale listing.
2. **High redemption rate (60%)** — 6 of 10 properties redeemed before auction, indicating active owner/lienholder efforts to prevent sale.
3. **Parcel format:** All Rich County parcels follow pattern NN-NN-NNN-NNNN (8 segments with dashes), different from Utah County's NN:NNN:NNNN format.
4. **Amount Due range:** $1,856.02 to $9,274.29 for remaining 4 properties.
5. **Geographic spread:** Properties across Rich County including subdivisions (Sweetwater, Omega, Vista Grande Estates, Eagle Feather at Shundahai).
6. **Out-of-state owner:** Toone (FL) may indicate investment property or absentee owner situation.

## Import Implications for TaxProperty

- **Data source is official Rich County Clerk/Auditor document** — highest authority
- **PDF updated through 4/24/2026** — very current (as of research date 5/2/2026)
- **Public Surplus sync:** 4 active properties match the 4 properties visible on Public Surplus website (Auction IDs 3987454, 3987459, 3987509, 3987517)
- **Parcel format normalization:** Will need to convert "36-04-050-0022" format to match AGRC/database standards
- **Small dataset:** Only 4 properties active — good test case for Rich County county adapter pattern

**Implicación:** 
Rich County has a complete, official tax sale list in PDF format with full parcel numbers, owner names, and addresses. This provides excellent test data for:
1. Validating county-specific parcel number format conversion
2. Testing the import pipeline with a small, real dataset
3. Establishing Rich County as the second complete county implementation (after Utah County)
4. Building the county adapter pattern for future Utah county expansions


### [2026-05-02] investigador — Tax Sale Programs for Salt Lake, Summit, and Weber Counties

**Pregunta:** Where are the tax sale / tax lien / delinquent property auction lists for Salt Lake County, Summit County, and Weber County, and what data formats and sources are available?

**Hallazgo:**

## County 1: Salt Lake County (slco.org)

### Official Website
- **Domain:** saltlakecounty.gov
- **Tax Sale Pages:** 
  - Main: https://www.saltlakecounty.gov/property-tax/property-tax-sale/
  - Current List: https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/
  - Apps Portal: https://apps.saltlakecounty.gov/auditor/tax-sale/

### 2026 Auction Details
- **Sale Date:** May 27-28, 2026
- **Platform:** Public Surplus (https://www.publicsurplus.com/sms/slcore,ut/browse/home)
- **List Published:** April 27, 2026 (4 weeks before sale)
- **Updates:** Weekly updates through sale date

### Data Format & Availability
- **Format:** Accessible via Public Surplus web application (not a direct downloadable PDF/Excel)
- **Access Method:** Interactive web application, likely JavaScript-rendered HTML
- **Fields Available:** Not explicitly documented in audit; typically includes parcel numbers, addresses, amounts due
- **Complexity Note:** List is vendor-dependent (PublicSurplus); no static file endpoint found

### AGRC Endpoint Status
- **Service Name:** Parcels_SaltLake_LIR
- **URL:** https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0
- **Status:** CONFIRMED (HTTP 200, full LIR schema available)
- **Fields Queryable:** PARCEL_ID, PARCEL_ADD, PARCEL_CITY, TOTAL_MKT_VALUE, LAND_MKT_VALUE, PARCEL_ACRES, BUILT_YR, PROP_CLASS, TAX_DISTRICT, etc.
- **Geometry:** esriGeometryPolygon with UTM NAD83 Zone 12N

### Contact
- Salt Lake County Auditor: 385-468-7200

### Complexity Rating
**MEDIUM** — List exists but is vendor-dependent (PublicSurplus), no static file, requires JavaScript rendering. However, AGRC endpoint provides full parcel enrichment capability.

---

## County 2: Summit County (summitcounty.org)

### Official Website
- **Domain:** summitcountyutah.gov
- **Tax Sale Page:** https://www.summitcountyutah.gov/255/Tax-Sale
- **Registration:** https://www.summitcountyutah.gov/258/Registration

### 2026 Auction Details
- **Sale Date:** May 21, 2026, 10:00 a.m. - 3:00 p.m. (MDT)
- **Platform:** Public Surplus (https://www.publicsurplus.com/sms/summitcore,ut/list/current?orgid=973661)
- **Location:** Online sale with anchor location at 60 N. Main Street, Coalville, UT (Conference Room 1)
- **List Published:** Four weeks before sale (approximately April 23, 2026)
- **Updates:** Periodically updated up to sale date

### Data Format & Availability
- **Format:** Accessible via Public Surplus web application
- **Access Method:** Interactive web application (JavaScript-rendered)
- **Static File:** No PDF list mentioned on county website; must access via PublicSurplus
- **Complexity Note:** Vendor-dependent platform; no downloadable document found

### AGRC Endpoint Status
- **Service Name:** Parcels_Summit_LIR
- **URL:** https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Summit_LIR/FeatureServer/0
- **Status:** CONFIRMED (HTTP 200, full LIR schema available)
- **Fields Queryable:** PARCEL_ID, PARCEL_ADD, PARCEL_CITY, TOTAL_MKT_VALUE, LAND_MKT_VALUE, PARCEL_ACRES, BUILT_YR, PROP_CLASS, TAX_DISTRICT, etc.
- **Geometry:** esriGeometryPolygon with UTM NAD83 Zone 12N

### Contact
- Summit County Auditor: Available via https://www.summitcountyutah.gov/255/Tax-Sale

### Complexity Rating
**MEDIUM-HIGH** — List only accessible via Public Surplus platform. No static PDF available from county website. Dynamic platform requires JavaScript rendering. AGRC endpoint available for parcel enrichment.

---

## County 3: Weber County (webercountyutah.gov)

### Official Website
- **Domain:** webercountyutah.gov
- **Tax Sale Page:** https://www.webercountyutah.gov/Clerk_Auditor/tax_sale.php
- **List Page:** https://www.webercountyutah.gov/Clerk_Auditor/tax_sale_list.php

### 2026 Auction Details
- **Sale Date:** May 21, 2026, 10:00 a.m. MST
- **Location:** Weber Center, Commission Chambers (1st Floor), 2380 Washington Blvd., Ogden, UT 84401
- **Registration:** 9:00 a.m. day-of (in-person only)
- **Platform:** IN-PERSON AUCTION ONLY (no online bidding)
- **List Published:** April 23, 2026 (4 weeks before sale)
- **Publication:** Published on website and in Standard Examiner newspaper; updated weekly

### Data Format & Availability
- **Format:** PDF (confirmed)
- **Direct URL:** https://www.webercountyutah.gov/Clerk_Auditor/documents/taxsale/2026-tax-sale-list.pdf
- **File Size:** 86.1 KB
- **Access Method:** Static PDF download
- **Fields in PDF:** Parcel numbers, property addresses (mailing address of owner), amounts due, sale date (inferred from document structure)
- **Note:** County directs buyers to Parcel Search Database for property size/past taxes, GIS map for property images, and Recorder/Surveyor records for lien information

### AGRC Endpoint Status
- **Service Name:** Parcels_Weber_LIR
- **URL:** https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Weber_LIR/FeatureServer/0
- **Status:** CONFIRMED (HTTP 200, full LIR schema available)
- **Fields Queryable:** PARCEL_ID, PARCEL_ADD, PARCEL_CITY, TOTAL_MKT_VALUE, LAND_MKT_VALUE, PARCEL_ACRES, BUILT_YR, PROP_CLASS, TAX_DISTRICT, etc.
- **Geometry:** esriGeometryPolygon with UTM NAD83 Zone 12N

### Contact
- Andy McRae, BoE Clerk
- Phone: 801-399-8112
- Email: BOE@webercountyutah.gov
- Address: 2380 Washington Blvd Suite #320, Ogden, UT 84401

### Complexity Rating
**LOW** — Static PDF available for download. No online platform dependency. Direct file download possible. In-person auction only (simpler than managing online bidder portal). AGRC endpoint available for parcel enrichment.

---

## Comparative Summary Table

| Aspect | Salt Lake | Summit | Weber |
|--------|-----------|--------|-------|
| **Domain** | saltlakecounty.gov | summitcountyutah.gov | webercountyutah.gov |
| **Auction Date** | May 27-28, 2026 | May 21, 2026 | May 21, 2026 |
| **Sale Format** | Online (PublicSurplus) | Online (PublicSurplus) | In-person only |
| **List Format** | Dynamic/web app | Dynamic/web app | Static PDF |
| **Direct URL Available** | No (PublicSurplus link) | No (PublicSurplus link) | Yes (PDF link) |
| **AGRC LIR Endpoint** | Confirmed | Confirmed | Confirmed |
| **Fields Visible** | Via PublicSurplus | Via PublicSurplus | Parcel #, address, amt due |
| **Complexity** | Medium | Medium-High | Low |
| **Vendor Dependency** | PublicSurplus | PublicSurplus | None |

---

## Key Findings

1. **All three counties have AGRC Parcels_[County]_LIR endpoints** — Full parcel data enrichment (market value, acreage, building details, tax district) available for all properties automatically.

2. **Salt Lake & Summit use PublicSurplus platform** — List data is vendor-locked in dynamic web application. No static export provided. Requires JavaScript to render, making direct data scraping difficult.

3. **Weber County provides static PDF** — Only county with direct downloadable list. Simplest integration path. In-person auction only (no online platform complexity).

4. **Timing alignment** — All lists published ~4 weeks before sale. Summit and Weber both sale on May 21; Salt Lake on May 27-28.

5. **No complex fields documentation** — None of the counties publish detailed field definitions in their tax sale lists. Must rely on AGRC LIR schema for comprehensive parcel attributes.

**Implicación:** 

For TaxProperty platform expansion to these three counties:
- **Weber County is the easiest to automate**: Direct PDF link available, can be ingested via OCR/table extraction, AGRC LIR provides enrichment
- **Salt Lake County is medium complexity**: Must query PublicSurplus API or web-scrape their HTML tables; AGRC LIR available for enrichment
- **Summit County is similar to Salt Lake**: PublicSurplus dependency; may be able to reuse Salt Lake scraping logic

All three will benefit from AGRC LIR endpoints for auto-enrichment (no additional setup needed beyond what exists for Utah County). The main variable is getting the base tax sale list data (parcel numbers, amounts due) into the database.

**Sources:**
- [Salt Lake County Current Tax Sale List](https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/)
- [Salt Lake County Auditor Contact](https://www.saltlakecounty.gov/auditor/contact/)
- [Summit County Tax Sale Information](https://www.summitcountyutah.gov/255/Tax-Sale)
- [Summit County PublicSurplus Platform](https://www.publicsurplus.com/sms/summitcore,ut/list/current?orgid=973661)
- [Weber County Tax Sale List](https://www.webercountyutah.gov/Clerk_Auditor/tax_sale_list.php)
- [Weber County 2026 Tax Sale PDF](https://www.webercountyutah.gov/Clerk_Auditor/documents/taxsale/2026-tax-sale-list.pdf)
- [AGRC Parcels_SaltLake_LIR](https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0)
- [AGRC Parcels_Summit_LIR](https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Summit_LIR/FeatureServer/0)
- [AGRC Parcels_Weber_LIR](https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Weber_LIR/FeatureServer/0)


---

### [2026-05-04] investigador — Tooele County Recorder Portal Investigation

**Pregunta:** What is the exact URL pattern to search for documents by parcel number on the Tooele CivicCenter-hosted county recorder portal? What are the HTML structure, document types, CAPTCHA requirements, and direct-link patterns?

**Hallazgo:**

## Critical Finding: URL is Incorrect

The provided URL `https://tooele.hosted.civicentertechnologies.com/recorder/` does **NOT exist** and returns ECONNREFUSED errors. Based on comprehensive research, Tooele County does not use CivicCenter Technologies for their recorder system.

## Tooele County's Actual Recorder Systems

### System 1: Eagle Software (Primary Document Recording)
- **URL:** https://erecording.tooeleco.gov/eaglesoftware/web/
- **Coverage:** Electronic index of documents to parcel numbers beginning January 1, 1995
- **Search Capability:** Supports parcel number search
- **Access:** **LOGIN REQUIRED** - No public search without authentication
- **Status:** Active official system

### System 2: Tyler Records Search (Historical)
- **URL:** Accessed via https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php
- **Coverage:** Recent records (dates unspecified in documentation)
- **Status:** Available but details not documented

### System 3: MLG Records Search (Historical)
- **URL:** Accessed via https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php
- **Coverage:** 1985-1995 records
- **Status:** Legacy system

### System 4: Tooele County GIS (Parcel Mapping)
- **URL:** https://tooelecountygis.maps.arcgis.com/apps/webappviewer/index.html?id=c43e0f457ef547358a85c54d327c0342
- **Type:** ArcGIS Web AppViewer (JavaScript-rendered)
- **Search:** Supports parcel lookup, requires JavaScript to render
- **Status:** Active mapping system

### System 5: AGRC LIR (OPEN ACCESS - No Login Required)
- **URL:** https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Tooele_LIR/FeatureServer/0
- **Type:** REST API
- **Access:** Public, no authentication required
- **Query Pattern:** `?where=PARCEL_ID='1305000014'&returnGeometry=true&outFields=*&f=json`
- **Status:** CONFIRMED WORKING for Tooele County

## Public Search Options (No Login)

### Option 1: NETR Online
- **URL:** https://publicrecords.netronline.com/state/UT/county/tooele
- **Type:** Third-party aggregator
- **Access:** Public search interface
- **Status:** Active

### Option 2: Third-Party Services
- **RegRID:** https://app.regrid.com/us/ut/tooele
- **TooeleRecords.us:** https://tooelerecords.us/property-records
- **PropertyChecker:** https://utah.propertychecker.com/tooele-county

## Implications for Web Scraping

### Eagle Software (erecording.tooeleco.gov)
- **Scrapability:** LOW - Requires login, likely has anti-bot protections
- **CAPTCHA:** Unknown (hidden behind login)
- **Direct Links:** Unknown pattern (login required to access)
- **Document Types:** Not publicly documented
- **Recommendation:** Contact Tooele Recorder for batch data access or use public APIs instead

### AGRC LIR (Recommended Alternative)
- **Scrapability:** HIGH - Public REST API, no CAPTCHA, no login
- **Rate Limiting:** Unknown (implement delays to be safe)
- **Data Available:** Parcel ID, address, market value, acreage, building data, coordinates
- **Document Types:** N/A (property data only, not documents)
- **Recommendation:** Use this for parcel enrichment instead of scraping recorder

### GIS Web Viewer
- **Scrapability:** MEDIUM - JavaScript-rendered, may require headless browser
- **CAPTCHA:** Unlikely
- **Direct Links:** No documented parameter patterns
- **Recommendation:** Use AGRC API or contact county for GIS data export

## Key Contacts

- **Tooele Recorder:** (435) 843-3184
- **Address:** 47 South Main Street, Tooele, UT 84074
- **Electronic index start date:** January 1, 1995

## Recommendations for TaxProperty Platform

1. **For Tooele County parcel enrichment:** Use AGRC Parcels_Tooele_LIR API (already available, no setup needed)
2. **For title research checklist:** Provide manual link to Eagle Software login page (erecording.tooeleco.gov)
3. **For direct document access:** Contact Tooele Recorder directly - automated scraping unlikely to work due to login requirement
4. **For city zoning:** Map city boundaries to Utah County zoning layers (Tooele is unincorporated for most parcels)

**Implicación:**
The URL provided was incorrect. Tooele County uses **Eagle Software for document recording** (login-required), not CivicCenter Technologies. The publicly accessible alternative is the **AGRC LIR REST API**, which provides parcel data (not recorded documents) without authentication, rate limiting, or CAPTCHA concerns. For title research requiring recorded documents, users must either:
1. Log in to erecording.tooeleco.gov directly, or
2. Contact the Tooele Recorder's Office for batch document requests

The TaxProperty platform already has access to AGRC LIR for Tooele via `Parcels_Tooele_LIR` endpoint—no additional configuration needed for parcel enrichment.

**Sources:**
- [Tooele County Property Records Search](https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php)
- [Tooele County Electronic Recording (Eagle Software)](https://erecording.tooeleco.gov/eaglesoftware/web/)
- [Tooele County GIS](https://tooelecountygis.maps.arcgis.com/apps/webappviewer/index.html?id=c43e0f457ef547358a85c54d327c0342)
- [AGRC Parcels_Tooele_LIR API](https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Tooele_LIR/FeatureServer/0)
- [NETR Online Tooele County](https://publicrecords.netronline.com/state/UT/county/tooele)
