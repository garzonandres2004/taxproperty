# COUNTY_COMPLETENESS_CHECKLIST.md

## Purpose
This checklist is used to determine whether a county is actually usable inside the TaxProperty platform.

A county is not "complete" just because:
- the auction list was imported,
- some rows show up in the UI,
- or a few links exist.

Use this checklist:
- after onboarding a new county,
- after major county refactors,
- before marking a county as investor-ready,
- before using a county in demos,
- and before expanding the same pattern to more counties/states.

---

## How to Use This Checklist

### Review Method
For each county:
1. Choose at least 5 real properties for initial QA
2. Ideally test 10 properties for stronger confidence
3. Include a mix: land, residential, weird/edge-case parcels, records with weak addresses, higher-confidence records

### Scoring Method
Each section: `PASS` / `PARTIAL` / `FAIL` / `N/A`

### Final Readiness
At the end, assign one: `NOT_STARTED` / `LIST_IMPORTED` / `BASIC_USABLE` / `ADVANCED_USABLE` / `INVESTOR_READY` / `REFERENCE_QUALITY`

---

## County Metadata

- State:
- County:
- County ID:
- Date reviewed:
- Reviewed by:
- Sample size:
- Sample property IDs / parcel numbers:

---

## Section 1 — Auction Source Integrity

- [ ] Official auction source is identified
- [ ] Source URL is documented
- [ ] Source type is documented (pdf/csv/xlsx/html/api/etc.)
- [ ] Auction date is captured when available
- [ ] Amount due / opening bid fields import correctly
- [ ] Parcel ID imports correctly
- [ ] Rows are not obviously duplicated
- [ ] Rows are not obviously truncated
- [ ] Source import date is stored or documented
- [ ] Source origin is traceable in the app or docs

**Result:** Status: / Notes: / Issues found:

---

## Section 2 — Parcel Identity Quality

- [ ] Parcel numbers are normalized consistently
- [ ] Alternate parcel formats are handled when needed
- [ ] Parcel IDs match county style
- [ ] Legal description is preserved if available
- [ ] Properties can be matched between list and external systems
- [ ] No obvious parcel corruption from parser/import
- [ ] Edge cases are identified (split lots, malformed IDs, weird strips, etc.)

**Result:** Status: / Notes: / Issues found:

---

## Section 3 — Address / Situs Quality

- [ ] Property address or situs is captured when available
- [ ] Address formatting is readable
- [ ] City/ZIP values are usable when present
- [ ] Records without situs are clearly labeled
- [ ] No fake or hallucinated addresses
- [ ] Users can still understand location when full address is unavailable
- [ ] Weak-address records still have a usable fallback path

**Result:** Status: / Notes: / Issues found:

---

## Section 4 — Map / Geolocation Usability

- [ ] Coordinates exist when expected
- [ ] Google Maps links work
- [ ] Parcel map link works when available
- [ ] Map opens to the right general location
- [ ] Weak-address records still provide a map/search fallback when possible
- [ ] No clearly broken location behavior in the UI
- [ ] Users can visually orient themselves to the property area

**Result:** Status: / Notes: / Issues found:

---

## Section 5 — Image / Visual Layer

- [ ] Property image strategy is defined
- [ ] Street View or visual fallback works when supported
- [ ] Parcel-only / land records degrade gracefully
- [ ] Missing images do not break the UI
- [ ] Visual area remains informative even when no real image exists
- [ ] Parcel map / map fallback is visible for no-photo cases

**Result:** Status: / Notes: / Issues found:

---

## Section 6 — Assessor / Parcel Enrichment

- [ ] Assessor source is identified
- [ ] Assessor link works
- [ ] Acreage or lot size is imported when available
- [ ] Market/assessed values are attached when available
- [ ] Building sqft is attached when available
- [ ] Year built is attached when available
- [ ] Owner name is attached when available
- [ ] Mailing address is attached when available
- [ ] Property type classification is credible
- [ ] Enrichment fields are clearly absent rather than misleading when unavailable

**Result:** Status: / Notes: / Issues found:

---

## Section 7 — Recorder / Title Access

- [ ] Recorder source is identified
- [ ] Recorder link works
- [ ] Title-search path is understandable
- [ ] Users can reasonably continue title research from the app
- [ ] If direct search is not possible, manual instructions are clear
- [ ] No broken recorder links in tested records
- [ ] Title layer is represented honestly in the UI

**Result:** Status: / Notes: / Issues found:

---

## Section 8 — Tax History Access

- [ ] Tax history source is identified
- [ ] Tax history link works
- [ ] Tax status context is usable
- [ ] If only a link fallback exists, it is clear and usable
- [ ] No misleading "history" claims without a real source
- [ ] The user can continue due diligence from this layer

**Result:** Status: / Notes: / Issues found:

---

## Section 9 — Zoning / Planning Guidance

- [ ] Jurisdiction is identified correctly
- [ ] City vs unincorporated logic is handled correctly
- [ ] Zoning source or planning path is identified
- [ ] Zoning results display correctly when known
- [ ] Manual verification message is shown when zoning is uncertain
- [ ] No false confidence in zoning
- [ ] Planning link works when applicable
- [ ] Zoning section helps rather than confuses the user

**Result:** Status: / Notes: / Issues found:

---

## Section 10 — Scoring / Recommendation Trust

- [ ] Score renders correctly
- [ ] Recommendation badge renders correctly
- [ ] Score colors are correct and consistent
- [ ] Important flags appear when expected
- [ ] Red flags are visible
- [ ] Weird parcels are handled appropriately
- [ ] No obvious score/UI mismatch
- [ ] Scoring feels credible for tested records

**Result:** Status: / Notes: / Issues found:

---

## Section 11 — Property Detail Usability

- [ ] Property detail page loads correctly
- [ ] Key facts are visible above the fold
- [ ] Links section is easy to use
- [ ] Warnings and caveats are understandable
- [ ] Data is organized logically
- [ ] Missing sections do not create confusion
- [ ] No broken layout or display issues
- [ ] Page feels usable for real research, not just demo display

**Result:** Status: / Notes: / Issues found:

---

## Section 12 — Report Readiness

- [ ] Report action is available when it should be
- [ ] Property can be included in report flow
- [ ] Report renders without breaking
- [ ] Core property summary is correct
- [ ] Risk/opportunity cues are coherent
- [ ] Zoning/tax/title context is represented honestly
- [ ] Missing data is labeled clearly in report output
- [ ] Report is useful enough to support a decision discussion

**Result:** Status: / Notes: / Issues found:

---

## Section 13 — Data Trust / UX Integrity

- [ ] No misleading blanks on important fields
- [ ] No obvious formatting bugs
- [ ] No obviously wrong property-type labels
- [ ] Warnings are visible enough
- [ ] County-specific caveats are surfaced clearly
- [ ] The user is told when manual verification is needed
- [ ] The county feels trustworthy overall
- [ ] Nothing major gives false confidence

**Result:** Status: / Notes: / Issues found:

---

## Section 14 — Architecture / Maintainability Check

- [ ] County is using adapter-based logic where appropriate
- [ ] County behavior is not excessively hardcoded in UI pages
- [ ] Source assumptions are documented
- [ ] External links are generated consistently
- [ ] Import logic is traceable
- [ ] County-specific behavior is understandable to future contributors

**Result:** Status: / Notes: / Issues found:

---

## Summary Table

| Area | Status | Key Notes |
|---|---|---|
| Auction Source Integrity | | |
| Parcel Identity Quality | | |
| Address / Situs Quality | | |
| Map / Geolocation Usability | | |
| Image / Visual Layer | | |
| Assessor / Parcel Enrichment | | |
| Recorder / Title Access | | |
| Tax History Access | | |
| Zoning / Planning Guidance | | |
| Scoring / Recommendation Trust | | |
| Property Detail Usability | | |
| Report Readiness | | |
| Data Trust / UX Integrity | | |
| Architecture / Maintainability | | |

---

## Final Readiness Decision

### Final Status
- [ ] NOT_STARTED
- [ ] LIST_IMPORTED
- [ ] BASIC_USABLE
- [ ] ADVANCED_USABLE
- [ ] INVESTOR_READY
- [ ] REFERENCE_QUALITY

### Recommended Decision
- Promote county forward
- Keep county internal only
- Block expansion until issues are fixed
- Use county only for source research, not investor use

### Biggest Blockers
1.
2.
3.

### Highest-Value Next Fixes
1.
2.
3.

### Notes
-

---

## Minimum Promotion Rules

### LIST_IMPORTED -> BASIC_USABLE
Must have: imported rows, usable parcel IDs, at least partial address/location usability, county tagging, source traceability

### BASIC_USABLE -> ADVANCED_USABLE
Must have: good parcel identity, usable maps or parcel map fallback, assessor path, recorder path, score support or score-ready structure

### ADVANCED_USABLE -> INVESTOR_READY
Must have: property detail confidence, tax history path, zoning/planning guidance, trustworthy warnings, report support, low confusion in UI

### INVESTOR_READY -> REFERENCE_QUALITY
Must have: strong QA performance, stable source handling, high trust in output, minimal silent gaps, pattern quality good enough to teach other county integrations

---

## Utah County Targets

| County | Current Status | Target |
|--------|---------------|--------|
| Utah County | REFERENCE_QUALITY | REFERENCE_QUALITY (maintain) |
| Tooele | BASIC_USABLE | INVESTOR_READY |
| Rich | NOT_STARTED | ADVANCED_USABLE |
| Sanpete | NOT_STARTED | ADVANCED_USABLE |

Do not expand aggressively to other counties or states until this checklist can be passed consistently.
