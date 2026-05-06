# COUNTY_REGISTRY.md

## Purpose
This document tracks county-level onboarding status for the TaxProperty platform.

Every county should have:
- official source references
- source format notes
- automation feasibility notes
- completeness status
- implementation status
- QA notes

This document is the operational registry for county expansion.

---

## Status Definitions

### County Readiness Status (New - Agent A)

**Product-facing statuses for county-agnostic operations:**

- `LIVE` — Full data available, actively maintained, adapter complete
  - 10+ properties imported
  - Full enrichment pipeline working
  - All core features functional
  - Properties ready for investor research

- `NEAR_LIVE` — Almost-full data with explicit gaps marked
  - Adapter complete or nearly complete
  - Data imported but some fields may be null
  - Gaps explicitly documented in `data_gaps`
  - Safe for research with caveats

- `PARTIAL` — Preliminary data with known gaps
  - Adapter exists but may be incomplete
  - Some properties imported
  - Core enrichment working but gaps remain
  - Requires manual verification

- `PLANNED` — No fake data, roadmap only
  - No properties imported
  - Adapter may or may not exist
  - Research complete but implementation pending

### Legacy Onboarding Status (Internal)
- `NOT_STARTED` — no research completed
- `RESEARCHING` — sources are being identified
- `MAPPED` — sources documented, integration path understood
- `IN_PROGRESS` — implementation has started
- `IN_APP` — county is in the app
- `QA_PENDING` — implementation exists but needs real validation
- `LIVE_READY` — county passes internal quality standard

### Completeness Status
- `NOT_STARTED`
- `LIST_IMPORTED`
- `BASIC_USABLE`
- `ADVANCED_USABLE`
- `INVESTOR_READY`
- `REFERENCE_QUALITY`

---

## Source Type Definitions

### Auction Source Types
- `pdf` / `csv` / `xlsx` / `google_sheet` / `html_table` / `public_portal` / `api` / `manual_only`

### Assessor Source Types
- `arcgis` / `county_search` / `parcel_map` / `manual_lookup` / `unknown`

### Recorder Source Types
- `fidlar` / `tyler` / `county_recorder_search` / `manual_lookup` / `unknown`

### Tax History Types
- `public_tax_portal` / `county_treasurer` / `parcel_tax_page` / `manual_lookup` / `unknown`

### Zoning / Planning Types
- `arcgis_zoning` / `planning_map` / `planning_department_page` / `manual_verification` / `unknown`

---

## County Entry Template

Copy this block for each county:

```md
### [State] - [County]

**County ID:** `state-county`
**State:**
**County:**
**Priority Tier:**
**Onboarding Status:**
**Completeness Status:**
**Target Standard:**

#### Auction
- Official source:
- Source type:
- Source URL:
- Vendor platform:
- Notes:

#### Assessor / Parcel
- Source type:
- Source URL:
- GIS / parcel map:
- Notes:

#### Recorder / Title
- Source type:
- Source URL:
- Notes:

#### Tax History
- Source type:
- Source URL:
- Notes:

#### Zoning / Planning
- Source type:
- Source URL:
- Jurisdiction notes:
- Notes:

#### Automation Feasibility
- Fully automatable:
- Semi-automatable:
- Manual only:
- Main blockers:

#### Product Notes
- Adapter status:
- Import status:
- Enrichment status:
- External links status:
- Report status:
- QA status:

#### Known Gaps
-

#### Next Step
-
```

---

## Utah Counties

### Utah - Utah County

**County ID:** `utah-utah`
**State:** Utah
**County:** Utah County
**Priority Tier:** P0
**Readiness Status:** LIVE
**Onboarding Status:** IN_APP
**Completeness Status:** REFERENCE_QUALITY
**Target Standard:** REFERENCE_QUALITY
**Properties in DB:** 127

#### Auction
- Official source: Utah County tax sale page
- Source type: public_portal
- Source URL: https://auditor.utahcounty.gov/may-tax-sale/property-list
- Vendor platform: PublicSurplus
- Notes: Current reference implementation for the platform. 127 real 2026 properties in DB.

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Utah_LIR/FeatureServer/0/query
- GIS / parcel map: Utah County GIS Zoning Identify
- Notes: AGRC LIR API provides market value, building data, and coordinates automatically

#### Recorder / Title
- Source type: county_recorder_search
- Source URL:
- Notes: Reference experience for title/recorder linking

#### Tax History
- Source type: county_treasurer
- Source URL: https://treasurer.utahcounty.gov/tax-information
- Notes: Part of the "complete property" standard

#### Zoning / Planning
- Source type: arcgis_zoning + planning_department_page
- Source URL: Utah County GIS Zoning Identify API
- Jurisdiction notes: Must distinguish city vs unincorporated. City properties (102/127) get planning dept guidance. Unincorporated (25/127) get real zone codes.
- Notes: Current gold-standard zoning workflow

#### Automation Feasibility
- Fully automatable: AGRC enrichment, geocoding, scoring, reports
- Semi-automatable: zoning depends on jurisdiction
- Manual only: edge cases where city-level data is unclear
- Main blockers: maintaining consistency during refactor

#### Product Notes
- Adapter status: working (should become canonical adapter)
- Import status: working
- Enrichment status: advanced (AGRC LIR)
- External links status: advanced
- Report status: active
- QA status: ongoing regression checks

#### Known Gaps
- Micro-parcel penalty not yet implemented (GitHub issue exists)
- Need to preserve current behavior during multi-county refactor

#### Next Step
- Extract Utah County logic into reusable architecture without behavior regression

---

### Utah - Tooele County

**County ID:** `utah-tooele`
**State:** Utah
**County:** Tooele County
**Priority Tier:** P1
**Readiness Status:** LIVE
**Onboarding Status:** IN_APP
**Completeness Status:** BASIC_USABLE
**Target Standard:** INVESTOR_READY
**Properties in DB:** 29

#### Auction
- Official source:
- Source type:
- Source URL:
- Vendor platform:
- Notes: 29 properties in DB. First non-reference county in app.

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Tooele_LIR/FeatureServer/0/query
- GIS / parcel map:
- Notes: AGRC endpoint exists

#### Recorder / Title
- Source type:
- Source URL:
- Notes:

#### Tax History
- Source type:
- Source URL:
- Notes:

#### Zoning / Planning
- Source type:
- Source URL:
- Jurisdiction notes:
- Notes:

#### Automation Feasibility
- Fully automatable: AGRC enrichment, geocoding, scoring
- Semi-automatable: zoning
- Manual only: recorder/title
- Main blockers: full source mapping still needed

#### Product Notes
- Adapter status: basic
- Import status: working (CSV via import wizard)
- Enrichment status: basic (AGRC LIR)
- External links status: partial
- Report status: partial
- QA status: needs real validation pass

#### Known Gaps
- Full county source mapping needed
- Recorder/title path not documented
- Tax history path not documented

#### Next Step
- Run QA on 5-10 real Tooele properties and document gaps

---

### Utah - Rich County

**County ID:** `utah-rich`
**State:** Utah
**County:** Rich County
**Priority Tier:** P1
**Readiness Status:** LIVE
**Onboarding Status:** IN_APP
**Completeness Status:** BASIC_USABLE
**Target Standard:** ADVANCED_USABLE
**Properties in DB:** 4
**Data Gaps:**
- No automated zoning identify service (manual lookup required)
- Recorder/title path not fully documented

#### Auction
- Official source: Rich County tax sale page
- Source type: likely pdf
- Source URL: https://www.richcounty.gov/tax-sale/
- Vendor platform:
- Notes: Properties sold at May tax sale, at least 5 years delinquent. Tax sale deed issued shortly after, no redemption period. Good candidate for first PDF-pattern county.

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Rich_LIR/FeatureServer/0/query
- GIS / parcel map:
- Notes: AGRC endpoint should exist

#### Recorder / Title
- Source type:
- Source URL:
- Notes:

#### Tax History
- Source type:
- Source URL:
- Notes:

#### Zoning / Planning
- Source type:
- Source URL:
- Jurisdiction notes: Mostly rural/unincorporated
- Notes:

#### Automation Feasibility
- Fully automatable: AGRC enrichment after import
- Semi-automatable: PDF parsing
- Manual only: recorder/title, zoning for rural parcels
- Main blockers: PDF extraction quality and sparse county data

#### Product Notes
- Adapter status: working (AGRC enrichment, geocoding)
- Import status: 4 properties imported
- Enrichment status: working (AGRC LIR + geocoding fallback)
- External links status: basic
- Report status: not started
- QA status: needs validation pass

#### Known Gaps
- No automated zoning identify service (manual lookup required)
- Recorder/title path not fully documented

#### Next Step
- Run QA on imported Rich County properties

---

### Utah - Salt Lake County

**County ID:** `utah-salt-lake`
**State:** Utah
**County:** Salt Lake County
**Priority Tier:** P1
**Readiness Status:** PLANNED
**Onboarding Status:** IN_PROGRESS
**Completeness Status:** NOT_STARTED
**Target Standard:** INVESTOR_READY
**Properties in DB:** 0
**Adapter Status:** Exists but not activated

#### Auction
- Official source: Salt Lake County Auditor
- Source type: public_portal
- Source URL: https://www.saltlakecounty.gov/property-tax/property-tax-sale/
- Vendor platform: PublicSurplus (verify current)
- Notes: Adapter built, awaiting property import

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query
- Notes: AGRC endpoint available

#### Next Step
- Import 2026 tax sale properties when list is available
- Activate enrichment pipeline

---

### Utah - Davis County

**County ID:** `utah-davis`
**State:** Utah
**County:** Davis County
**Priority Tier:** P1
**Readiness Status:** PARTIAL
**Onboarding Status:** IN_APP
**Completeness Status:** BASIC_USABLE
**Target Standard:** INVESTOR_READY
**Properties in DB:** 22
**Data Gaps:**
- PDF auction list extraction incomplete
- Zoning data needs verification
- Market value enrichment needs validation

#### Auction
- Official source: Davis County Auditor
- Source type: pdf
- Source URL: https://www.daviscountyutah.gov/auditor/tax-sale
- Vendor platform: PublicSurplus
- Notes: 22 properties imported from 2026 list

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Davis_LIR/FeatureServer/0/query
- GIS / parcel map: Davis County GIS
- Notes: AGRC endpoint available

#### Next Step
- Complete PDF normalization for full property list
- Validate AGRC enrichment for Davis parcels

---

### Utah - Weber County

**County ID:** `utah-weber`
**State:** Utah
**County:** Weber County
**Priority Tier:** P1
**Readiness Status:** PARTIAL
**Onboarding Status:** IN_APP
**Completeness Status:** BASIC_USABLE
**Target Standard:** INVESTOR_READY
**Properties in DB:** 69
**Data Gaps:**
- Zoning verification incomplete
- Title signals not fully automated
- Market value validation needed

#### Auction
- Official source: Weber County Treasurer
- Source type: public_portal
- Source URL: https://www.webercountyutah.gov/treasurer/tax_sale/
- Vendor platform: PublicSurplus
- Notes: 69 properties imported

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Weber_LIR/FeatureServer/0/query
- Notes: AGRC endpoint available

#### Next Step
- Complete zoning verification pipeline
- Validate title signals automation

---

### Utah - Sanpete County

**County ID:** `utah-sanpete`
**State:** Utah
**County:** Sanpete County
**Priority Tier:** P1
**Readiness Status:** NEAR_LIVE
**Onboarding Status:** MAPPED
**Completeness Status:** BASIC_USABLE
**Target Standard:** ADVANCED_USABLE
**Properties in DB:** 0 (52 discovered, awaiting import)

#### Auction
- Official source: Sanpete County Public Surplus
- Source type: public_portal
- Source URL: https://www.publicsurplus.com/sms/sanpeteco,ut/list/current?orgid=972771
- Vendor platform: PublicSurplus
- Notes: 52 active auctions discovered. May 21, 2026 auction date. Opening bids $436-$23,980. Indian Ridge Ranch recreational lots prevalent.

#### Assessor / Parcel
- Source type: arcgis (AGRC LIR)
- Source URL: https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Sanpete_LIR/FeatureServer/0/query
- GIS / parcel map: No public parcel search available
- Notes: AGRC endpoint exists. No online assessor portal found. Property tax info via state: http://propertytax.utah.gov/

#### Recorder / Title
- Source type: eagleweb_public_viewer
- Source URL: https://erecording.sanpetecountyutah.gov/eaglesoftware/web/login.jsp
- Notes: ✅ **EagleWeb Public Web Limited Viewer** - Identical to Tooele. Playwright automation working. Document types visible (Warranty Deed, Quit Claim, Trustee's Deed). Sale dates NOT shown in public view. Phone: (435) 835-8068 for detailed requests.

#### Tax History
- Source type: state_portal
- Source URL: http://propertytax.utah.gov/
- Notes: State-level property tax information only

#### Zoning / Planning
- Source type: manual_verification
- Source URL:
- Jurisdiction notes: Cities include Manti, Ephraim, Mt. Pleasant, Gunnison, Centerfield, Fairview
- Notes: No online zoning portal found. Planning departments may have parcel info.

#### Automation Feasibility
- Fully automatable: AGRC enrichment, Public Surplus scraping, EagleWeb title signals
- Semi-automatable: Zoning (requires city-by-city research)
- Manual only: Assessor details, complete title history with dates
- Main blockers: Sale dates not visible in EagleWeb public view

#### Product Notes
- Adapter status: Public Surplus source implemented
- Import status: working (52 parcels discovered)
- Enrichment status: partial (AGRC + EagleWeb title signals)
- External links status: partial
- Report status: not started
- QA status: needs validation pass

#### Known Gaps
- Assessor has no public online portal
- EagleWeb shows document types but not sale dates
- Many parcels are Indian Ridge Ranch recreational lots (HOA restrictions likely)

#### Next Step
- Import 52 Sanpete parcels to database
- Run full enrichment pipeline with EagleWeb title signals
- Document Indian Ridge Ranch restrictions pattern

---

## AGRC LIR Endpoint Pattern (Utah)

All Utah counties can use:
```
https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_[CountyName]_LIR/FeatureServer/0/query
```

County name formats: Utah, Tooele, SaltLake, Davis, Weber, Washington, Cache, Summit, Iron, BoxElder, Rich, Sanpete, etc.

---

## State Expansion Notes

After Utah reaches strong multi-county maturity, expansion to other states should follow patterns:
- tax deed states
- tax lien states
- hybrid states
- high-data-availability states
- sparse/manual states

Do not begin broad multi-state implementation until the Utah county adapter pattern is proven across multiple Utah counties.

---

## Registry Maintenance Rules

Always update this document when:
- a county source is found or changed
- a county adapter is created
- import status changes
- completeness status changes
- QA is completed
- a blocker or gap is discovered
