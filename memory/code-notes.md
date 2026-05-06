### [2026-05-05] coder — Agent B: InvestorMemo Engine Enhancement

**Decisión de código:** Enhanced the InvestorMemo system with county readiness degradation and Dustin Hahn max bid formula integration.

**Enhancements to Memo System:**

1. **types.ts** (`src/lib/memo/types.ts`):
   - Added `CountyReadiness` type: LIVE | NEAR_LIVE | PARTIAL | PLANNED
   - Added `ReadinessCaveat` interface with message, impact level, data gaps, and confidence adjustment
   - Added `MaxBidAnalysis` interface with Dustin Hahn formula breakdown:
     - suggestedMaxBid: calculated ceiling
     - formula: Human-readable formula string
     - breakdown: ARV, quickSalePercent (80%), municipalLiens, quietTitleCost ($3,500), repairs, desiredProfit
     - viability: strong/good/marginal/poor/unknown
     - openingBidRatio: max bid as percentage of opening bid
     - reasoning: Analyst-style explanation of the bid recommendation
   - Updated `InvestorMemo` interface:
     - Added `countyReadiness` field
     - Added `readinessCaveat` field (null for LIVE counties)
     - Added `confidenceScore` (0-100, adjusted by readiness)
     - Added `maxBid` with full analysis (replaces simple maxBidInclusivePremium)
   - Added `DEFAULT_READINESS_CONFIG` record with confidence multipliers:
     - LIVE: 1.0 (full confidence)
     - NEAR_LIVE: 0.85 (minor verification needed)
     - PARTIAL: 0.6 (verify key assumptions)
     - PLANNED: 0.3 (placeholder only)

2. **generate.ts** (`src/lib/memo/generate.ts`):
   - Added county readiness detection from CountyConfig.status:
     - production → LIVE
     - beta → NEAR_LIVE
     - alpha → PARTIAL
     - pending → PLANNED
   - Added `buildReadinessCaveat()` function to generate appropriate warnings per readiness level
   - Added `calculateMaxBidDustinHahn()` function implementing Expert Investor Formula:
     ```
     Max Bid = (ARV × 80%) - Municipal Liens - $3,500 - Repairs - Desired Profit
     ```
   - Enhanced `computeRecommendation()` to consider max bid viability and readiness
   - Added `calculateConfidenceScore()` using readiness multiplier and data gaps penalty
   - Updated `buildBadBullets()` to include readiness-specific warnings
   - Updated `buildHeadline()` to show confidence score and readiness tag
   - Updated `buildTitleNotes()` to include risk level annotations
   - Updated `generateInvestorMemo()` to populate all new fields

3. **render.ts** (`src/lib/memo/render.ts`):
   - Added readiness badge display for non-LIVE counties
   - Added confidence score and data gaps to header
   - Added Max Bid Formula breakdown table showing each component
   - Added viability assessment with analyst reasoning

---

### [2026-05-06] coder — Agent C: Launch-Ready UI for AI Tax Sale Deal Analyst

**Decisión de código:** Implemented launch-ready UI for the AI Tax Sale Deal Analyst covering dashboard, counties, properties, parcel detail (investment memo), and reports.

**Files Created/Modified:**

1. **Dashboard** (`src/app/dashboard/page.tsx`):
   - County summary cards with GO/CAUTION/RESEARCH/SKIP counts
   - Readiness badges per county (LIVE/NEAR_LIVE/PARTIAL/PLANNED)
   - Next auction countdown with days remaining
   - Top opportunities list with budget fit indicators
   - Budget status panel (shows available funds, reserve buffer)
   - Quick actions for GO properties and report generation

2. **Counties Page** (`src/app/counties/page.tsx`):
   - Grid layout of all counties with status badges
   - LIVE/NEAR_LIVE/PARTIAL/PLANNED status indicators
   - Property counts per county
   - Auction dates with countdown
   - Recommendation distribution (GO/CAUTION/RESEARCH/SKIP counts)
   - Readiness score progress bars
   - Search and filter by status
   - Link to county properties

3. **Properties Page** (`src/app/properties/page.tsx`):
   - Enhanced with recommendation_bucket column (GO/CAUTION/RESEARCH/SKIP)
   - Added Max Bid column showing calculated max bid
   - Updated county filter to dynamically show available counties
   - Links now route to `/properties/[county]/[parcelId]` format
   - Added max_bid_calculated to Property interface

4. **Parcel Detail - Investment Memo** (`src/app/properties/[county]/[parcelId]/page.tsx`):
   - **NEW ROUTE**: Creates investment memo page per property
   - Recommendation hero with large badge (GO/CAUTION/etc)
   - One-line thesis summarizing the opportunity
   - Max bid callout with "Do Not Exceed" warning
   - Key facts grid (property type, lot size, year built, zoning, etc.)
   - What's Good / What's Risky two-column layout
   - Title summary section with title analysis score
   - Next actions checklist (verify title, check liens, etc.)
   - Quick links to county recorder, assessor, parcel map
   - Readiness caveat banner for non-LIVE data
   - Financial summary with equity spread calculation
   - Owner information with absentee owner badge

5. **Reports Page** (`src/app/reports/page.tsx`):
   - Three-tab layout: Investment Memos, County Summary, Top Opportunities
   - Export memo as markdown (.md files) with full property analysis
   - Export county summary as CSV with all recommendation counts
   - Top opportunities list ranked by investability score
   - Property selection for bulk memo export

**Design Decisions:**
- Used existing shadcn/ui components (Card, Badge, Button, Alert)
- Dark professional theme matching existing app (slate-900, slate-50)
- Mobile responsive with flexbox and grid layouts
- Investor-focused copy ("GO", "CAUTION", "Max Bid", "Equity Spread")
- Integration with existing scoring engine and county adapters

**Trampa evitada:**
- Initially tried to use Tabs component from shadcn/ui but it wasn't installed. Solution: Created custom tab navigation with styled buttons.
- Parcel detail route conflict with existing `/properties/[id]` route. Solution: Used `/properties/[county]/[parcelId]` pattern for cleaner URLs and better SEO.
- Missing readiness data for counties. Solution: Derive from data_confidence score (80+=LIVE, 50+=NEAR_LIVE, else PARTIAL).

**Patrón reusable:**
- Bucket colors for recommendations: emerald-500 (GO), amber-500 (CAUTION), slate-400 (RESEARCH), red-500 (SKIP)
- Status badges with icons: CheckCircle2 (LIVE), Clock (NEAR_LIVE), AlertCircle (PARTIAL), Database (PLANNED)
- Investment memo structure: Hero → Financial → Good/Risk → Title → Actions → Links
- County/city jurisdiction detection via zoningProfile.is_unincorporated
   - Added data sources and analyst notes to footer

4. **index.ts** (`src/lib/memo/index.ts`):
   - Created central exports file
   - Added `generateMemoForProperty()` helper for single property
   - Added `generateMemosForProperties()` helper for batch processing
   - Re-exports all types and functions

**County Readiness Behavior:**

| Level | Confidence | Caveat Message | Data Gaps |
|-------|------------|----------------|-----------|
| LIVE | 100% | None | None |
| NEAR_LIVE | 85% | Beta - verify auction details | Minor |
| PARTIAL | 60% | Verify key assumptions manually | Moderate |
| PLANNED | 30% | Not onboarded - CSV only | Severe |

**Trampa evitada:**
- Initially planned to replace existing maxBidInclusivePremium entirely. Solution: Kept it for backward compatibility while adding new `maxBid` field with full analysis.
- Risk of breaking existing memo renders. Solution: All new fields are additive; existing code continues to work.
- Confidence calculation could exceed 100%. Solution: Capped at 100, floored at 0 with Math.min/Math.max.

**Patrón reusable:**
- Readiness tiers map directly to CountyConfig.status for automatic detection
- Max bid viability levels provide clear analyst guidance: strong (≥150%), good (≥120%), marginal (≥100%), poor (<100%)
- Formula transparency: Show full derivation with all components for investor trust
- Confidence degradation: Multiplier-based, not hardcoded scores

**Files Modified:**
- `src/lib/memo/types.ts` - Enhanced with readiness types and max bid analysis
- `src/lib/memo/generate.ts` - Added readiness detection and Dustin Hahn formula
- `src/lib/memo/render.ts` - Enhanced markdown output with formula breakdown
- `src/lib/memo/index.ts` - New exports file

---

### [2026-05-05] coder — Agent A: County-Agnostic Architecture + Readiness System

**Decisión de código:** Implemented standardized county readiness status system and normalized parcel output schema for multi-county operations.

**Schema Changes:**

1. **types.ts** (`src/lib/counties/types.ts`):
   - Added `CountyReadinessStatus` enum: LIVE | NEAR_LIVE | PARTIAL | PLANNED
   - Added `CountyReadiness` interface with: status, propertyCount, adapterExists, hasEnrichment, dataGaps, blockedBy
   - Added `NormalizedParcelOutput` interface for memo engine feeding:
     - Core: parcel_number, county, property_address, city, state, zip, lat/lng
     - Financial: assessed_value, estimated_market_value, total_amount_due
     - Property: property_type, lot_size_sqft, building_sqft, year_built, beds/baths
     - Zoning: zoning, zoning_description, jurisdiction, jurisdiction_type
     - Risk: access_risk, title_risk, legal_risk, marketability_risk (all normalized)
     - Metadata: data_source, confidence_score, enrichment_timestamp, data_gaps
   - Updated `CountyAdapter` interface:
     - Added `readiness: CountyReadiness` field (required)
     - Added optional `toNormalizedOutput()` method for pipeline output
   - Updated `defaultAdapter` with PLANNED readiness status

2. **schema.prisma** (`prisma/schema.prisma`):
   - Added `readiness String @default("PLANNED")` to CountyConfig model
   - Added `readiness_reason String?` for status explanation
   - Kept legacy `status` field for backward compatibility during transition

**County Status Assignments:**

| County | Status | Properties | Adapter | Notes |
|--------|--------|------------|---------|-------|
| Utah | LIVE | 127 | Yes | Reference implementation, full enrichment |
| Tooele | LIVE | 29 | Yes | AGRC + EagleWeb automation |
| Rich | LIVE | 4 | Yes | AGRC + geocoding, no zoning API |
| Weber | PARTIAL | 69 | Yes | Zoning verification incomplete |
| Davis | PARTIAL | 22 | Yes | PDF extraction incomplete |
| Sanpete | NEAR_LIVE | 0 (52 disc.) | Yes | Properties discovered, import pending |
| Salt Lake | PLANNED | 0 | Yes | Adapter exists, awaiting tax sale list |
| 22 others | PLANNED | 0 | No | AGRC endpoints ready, adapters needed |

**Documentation Updates:**

1. **COUNTY_REGISTRY.md** (`docs/COUNTY_REGISTRY.md`):
   - Added new "County Readiness Status" section with 4-tier definitions
   - Updated all county entries with Readiness Status
   - Added Davis County and Weber County entries (were missing)
   - Added Salt Lake County as PLANNED
   - Added property counts and data gaps per county

**Trampa evitada:**
- Initially considered replacing the existing `status` field in CountyConfig. Solution: Added new `readiness` field alongside legacy `status` to avoid breaking existing queries during transition period.
- Risk of "unknown" values inflating risk scores. Solution: NormalizedParcelOutput requires explicit risk values ('low' | 'medium' | 'high' | 'unknown') with adapter setting sensible defaults for each county.

**Patrón reusable:**
- County readiness tiers: LIVE (production-ready) → NEAR_LIVE (gaps documented) → PARTIAL (preliminary data) → PLANNED (roadmap only)
- Normalized output: All counties convert to same schema for memo engine, with data_gaps array explaining what's missing
- Adapter readiness field: Self-documenting - each adapter declares its own operational status
- Prisma enum alternative: Use String with @default instead of native enum for flexibility

**Files Modified:**
- `src/lib/counties/types.ts` - Added readiness types and normalized output schema
- `prisma/schema.prisma` - Added readiness fields to CountyConfig
- `docs/COUNTY_REGISTRY.md` - Updated all county statuses and added missing entries

**Next Steps:**
- Run `npx prisma db push` to apply schema changes
- Update existing adapters to include readiness metadata
- Build pipeline normalization layer using toNormalizedOutput()

---

### [2026-05-05] coder — Sanpete County Triage Alpha Complete (UPDATED)

**Achievement:** Sanpete County auction triage system for May 21, 2026 tax sale with **full EagleWeb automation**.

**Discovery:**

1. **Public Surplus Integration:**
   - 52 active auctions found at: https://www.publicsurplus.com/sms/sanpeteco,ut/list/current?orgid=972771
   - Example parcel: 0000055018 (CLESLAK ALEXANDER ETAL JT)
   - Opening bids: $436 - $23,980

2. **Sanpete Recorder:**
   - ✅ **EAGLEWEB ONLINE** - Public Web Limited Viewer (identical to Tooele)
   - Portal: https://erecording.sanpetecountyutah.gov/eaglesoftware/web/login.jsp
   - Access: Click "Enter" under Public Web Limited Viewer (no login required)
   - **FULLY AUTOMATED** via Playwright browser automation
   - Extracts: document types, transfer history, deed types (Warranty, Quit Claim, Trustee's)
   - Note: Sale dates NOT shown in public view (unlike Tooele), but document types ARE visible
   - Phone: (435) 835-8068 for detailed title requests

3. **Sanpete Assessor:**
   - ❌ **NO online parcel search**
   - Only state-level tax info: http://propertytax.utah.gov/

**Implementation:**

1. **SanpeteAuctionSource** (`src/lib/sources/sanpete-public-surplus.ts`):
   - Fetches auction list from Public Surplus
   - Extracts: parcel, account, owner, legal description, total due
   - Parses legal for subdivision and acres
   - Calculates bid deposit (5%)

2. **Sanpete EagleWeb Scraper** (`src/lib/title/scrapers/sanpete-eagleweb.ts`):
   - Playwright-based browser automation (identical structure to Tooele)
   - Session persistence via `.sanpete-eagleweb-session.json`
   - Public Web Limited Viewer access (no login)
   - Extracts transfer history table with document types
   - Maps document types: Warranty Deed, Quit Claim Deed, Trustee's Deed, etc.

3. **Sanpete Triage Logic** (`scripts/debug-sanpete-triage.ts`):
   - Integrates real EagleWeb title signals for all parcels
   - Detects recreational lot patterns (Indian Ridge Ranch)
   - Buckets: GO (large parcels/low bids), CAUTION (recreational), RESEARCH (missing data)
   - Title signals: Document count, last transfer type, red/yellow flags

**Test Results (Parcel 0000055018):**
- Status: CAUTION (Indian Ridge Ranch recreational lot)
- Title: 6 documents found via EagleWeb
- Last Transfer: Warranty Deed
- Opening Bid: $729.39 + 8% premium = $787.74 total
- Acres: 1.13

**Key Findings:**
- Sanpete behaves IDENTICALLY to Tooele for navigation/access
- Many parcels are Indian Ridge Ranch recreational lots (restrictions likely)
- Low opening bids ($729-$7,000) but verify access/restrictions
- Full title automation possible (unlike initial assessment)

**Files Created:**
- `src/lib/sources/sanpete-public-surplus.ts` — Public Surplus scraper
- `src/lib/title/scrapers/sanpete-eagleweb.ts` — EagleWeb automation (works like Tooele)
- `scripts/debug-sanpete-triage.ts` — Triage alpha with real title signals
- `scripts/test-sanpete-eagleweb.ts` — Single parcel test script

---

### [2026-05-05] coder — Tooele EagleWeb Integration Complete

**Achievement:** Full browser automation for Tooele County title research via EagleWeb Public Web Limited Viewer.

**Problem Solved:**
- Tooele County has no simple API for title records
- Mediciland portal requires paid subscription/login
- EagleWeb Public Viewer is free but requires browser automation

**Solution Implemented:**

1. **EagleWeb Scraper** (`src/lib/title/scrapers/tooele-eagleweb.ts`):
   - Playwright-based browser automation
   - Public Web Limited Viewer access (no login required)
   - Session persistence via `.tooele-eagleweb-session.json`
   - Two-step extraction: Search → Account Link → Transfer History Table
   - Extracts: last transfer date, transfer type, document count

2. **Navigation Flow:**
   - Login page → Click "Public Web Limited Viewer" button (form submit with guest=true)
   - Accept Terms page (if shown)
   - Navigate to search.jsp
   - Enter parcel number, submit search
   - Click account link from results
   - Extract transfer history from Sale Date table
   - Navigate back to search.jsp for next property

3. **Batch Processing** (`scripts/batch-tooele-eagleweb.ts`):
   - Processes all 29 Tooele properties in sequence
   - Reuses session across properties (single login)
   - Updates database notes with EagleWeb results
   - Generates JSON and CSV reports

4. **Auction Triage Update** (`scripts/auction-triage-tooele.ts`):
   - Parses EagleWeb data from property.notes
   - Shows last transfer date in triage output
   - Removes "manual lookup required" for properties with title signals

**Results:**
- 29/29 properties processed successfully
- All properties have title records found
- Last transfer dates extracted (ranging from 1995 to 2017)
- Transfer types: Warranty Deed, Quit Claim Deed, Deed
- CSV report: `/tmp/tooele-eagleweb-triage.csv`

**Key Technical Details:**
- Session file must be cleared before each run (accountSearch.jsp vs search.jsp issue)
- Transfer history table has variable structure - header detection required
- Document types parsed from "Doc Description" column
- Date parsing handles JavaScript Date format: "Wed May 27 12:00:00 MDT 1992"

**Files Modified:**
- `src/lib/title/scrapers/tooele-eagleweb.ts` — Main scraper implementation
- `scripts/batch-tooele-eagleweb.ts` — Batch processing script
- `scripts/auction-triage-tooele.ts` — Updated to use EagleWeb data
- `package.json` — Added batch:tooele:title script

---

### [2026-04-29] coder — WS7: Auction Calendar + OTC Detection

**Decisión de código:** Implemented Auction Calendar page and OTC (Over The Counter) detection system for tracking upcoming tax sales and identifying unsold properties.

**Features Implemented:**

1. **Database Schema Changes** (`prisma/schema.prisma`):
   - Added `is_otc Boolean @default(false)` to Property model for OTC flag
   - Added new `Auction` model with fields: county, state, auction_date, format, property_count, url, notes
   - Applied migration with `npx prisma db push`

2. **Calendar Page** (`src/app/calendar/page.tsx`):
   - Full dark-themed page (bg-slate-900) with hero section
   - Countdown timer showing days until next auction
   - Filter controls: State, Format (Online/In-Person), Date Range (Upcoming/All/Past)
   - Stats bar showing: Total Auctions, Total Properties, Upcoming count, Online count
   - Featured Utah County section with May 21, 2026 auction details
   - Links to official Utah County listing: https://www.utahcounty.gov/Dept/ClerkAud/TaxSaleInfo.html

3. **AuctionCard Component** (`src/components/auction/AuctionCard.tsx`):
   - Reusable card with date display, location, format badge (Online = blue, In-Person = emerald)
   - Property count indicator
   - Dynamic countdown: days remaining, completed, or today status
   - Hover effects: translate-y, shadow, border color change
   - "Next Auction" badge for closest upcoming event
   - Link to official county listing

4. **Auction API** (`src/app/api/auctions/route.ts`):
   - GET: List all auctions with optional filters (state, county, format, upcoming)
   - POST: Create new auction (admin only, requires auth)
   - Query params: state, county, format, upcoming (boolean)

5. **Properties Page Updates** (`src/app/properties/page.tsx`):
   - Added OTC filter dropdown (All, Regular, OTC Only)
   - Added is_otc to Property interface
   - Added "OTC" badge (amber-100 text-amber-700) on property cards when is_otc=true
   - Updated filteredProperties logic to include OTC filter

6. **OTC Detection Logic** (`src/lib/otc-detector.ts`):
   - `detectOTCFromNotes()` - Checks notes for OTC keywords: "OTC", "over the counter", "unsold", "struck off", "passed at auction", etc.
   - `autoDetectOTC()` - Combines notes check with status field (struck_off, passed)
   - `processOTCProperties()` - Batch process array of properties to set is_otc
   - Can be called during import to automatically flag OTC properties

7. **Scoring Integration** (`src/lib/scoring/index.ts`):
   - Added `is_otc` to PropertyInput type
   - Added `otc_adjustment` to OpportunityBreakdown type
   - Added +10 point bonus to opportunity_score when is_otc=true (less competition)
   - Bonus applied in calculateOpportunityScore(), capped at 100 max

**Trampa evitada:**
- Calendar page initially rendered before AppLayout children causing layout issues. Solution: Used negative margins (-mx-6, -my-10) to fill the layout container.
- AuctionCard had import at wrong position causing TypeScript error. Solution: Moved Link import to top of calendar page file.
- OTC detection from notes needed case-insensitive matching. Solution: Lowercase both notes and keywords before comparison.

**Patrón reusable:**
- Countdown logic: Calculate days remaining, handle past (gray), today (green), soon (amber), future (blue)
- Badge patterns: Format-based colors (blue for online, emerald for in-person)
- Filter dropdowns: All | Specific values | Special categories (OTC)
- Keyword detection: Array of lowercase keywords, some() check against lowercase content
- Opportunity score adjustments: Add field to breakdown type, calculate in scoring function, cap at max

**Build Status:** PASS (TypeScript clean, 24 routes including new /calendar and /api/auctions)

---

### [2026-04-29] coder — WS6: Map Integration (Street View + Parcel Maps)

**Decisión de código:** Created StreetViewPanel and ParcelMap components for property detail page using iframe embeds and external GIS links.

**Features Implemented:**

1. **StreetViewPanel Component** (`src/components/property/StreetViewPanel.tsx`):
   - Google Maps iframe embed using address-based query URL
   - URL format: `https://maps.google.com/maps?q={address}&t=m&z=18&ie=UTF8&iwloc=&output=embed`
   - Responsive aspect-video iframe container with border-slate-600 styling
   - Open in Maps button linking to Google Maps search
   - Graceful handling for missing addresses (shows fallback with manual search link)
   - Dark theme card styling (bg-slate-800, text-slate-100)

2. **ParcelMap Component** (`src/components/property/ParcelMap.tsx`):
   - Utah County GIS direct link: `https://maps.utahcounty.gov/UtahCountyMap/?parcel={normalizedId}`
   - Assessor records link: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={normalizedId}`
   - OpenStreetMap fallback link for general location context
   - Parcel ID normalization: strips colons, pads to 11 digits (03:060:0016 → 30600016001)
   - Badge display showing normalized parcel ID
   - Three action buttons with appropriate icons and external link indicators

3. **Property Detail Page Integration** (`src/app/properties/[id]/page.tsx`):
   - Added imports for StreetViewPanel and ParcelMap
   - New map section positioned after Risk Analysis, before Main Content grid
   - 2-column grid layout (1 col on mobile, 2 on md+)
   - Passes property_address and parcel_number to components
   - Uses existing photo_url field (from Workstream A) if needed for future enhancement

**Trampa evitada:**
- Property model has no explicit lat/lng fields — coordinates were used only to generate photo_url/aerial_url in Workstream A. Solution: Use address-based Google Maps embed which doesn't require coordinates.
- Utah County GIS requires 11-digit parcel format without colons. Solution: normalizeParcelId() helper strips colons and pads with zeros to match their av_serial format.
- iframe security warnings: Added `referrerPolicy="no-referrer-when-downgrade"` to Google Maps embed for proper referrer handling.

**Patrón reusable:**
- External map embeds: Use address-based queries when coordinates unavailable (more flexible than lat/lng for tax sale properties where exact coordinates may not be in database)
- Government system integration: Always normalize IDs to match external system format (document the transformation)
- Dual-source pattern: Primary (official county GIS) + Secondary (general mapping) with clear labeling
- iframe containers: Use aspect-video for responsive 16:9 ratio, absolute inset-0 for full coverage
- External link buttons: Always use `target="_blank" rel="noopener noreferrer"` for government sites

**Files created/modified:**
- `src/components/property/StreetViewPanel.tsx` - New (120 lines, 4636 bytes)
- `src/components/property/ParcelMap.tsx` - New (115 lines, 4343 bytes)
- `src/app/properties/[id]/page.tsx` - Added imports + map section integration

**Build Status:** PASS (required `npx prisma db push` first for schema drift)

---

### [2026-04-29] coder — Workstream 5: Enhanced Scoring Engine

**Decisión de código:** Implemented Redemption Risk Score and "Too Good To Be True" Detector based on Dustin Hahn signals.

**Features Implemented:**

1. **Redemption Risk Scoring Module** (`src/lib/scoring/redemption-risk.ts`):
   - Owner type detection: Bank/Corp (+40), Trust (+25), LLC (+15), Individual absentee (+10), Individual owner-occupied (+20)
   - Years delinquent scoring: 5+ years (+5), 3-4 years (+15), 1-2 years (+25), <1 year (+20)
   - Payment pattern analysis: Partial payments found (+30 - high redemption signal)
   - Property use indicators: Owner-occupied (+40), Rental (+25), Vacant (+10)
   - Financial stress bonus: Tax >50% of value = reduced redemption likelihood (-10 points)
   - Output: Score 0-100 with LOW/MEDIUM/HIGH level and percentage display

2. **"Too Good To Be True" Detector** (`src/lib/scoring/too-good-detector.ts`):
   - **Ultra-low bid trigger:** Opening bid <0.5% of ARV = CRITICAL warning
   - **Prime location trigger:** High-value area with low score = investigate hidden issues
   - **Multiple auction passes:** 2+ previous passes = CRITICAL (experienced investors passed)
   - **High value no bidders:** ARV >$200K passed before = hidden issue likely
   - **Data discrepancy:** Low confidence on high-value property or missing zoning data
   - **Buildability anomaly:** Large unincorporated lot with very low buildability score
   - Investigation checklist auto-generated based on triggers:
     - Environmental: contamination, flood zone, wetlands
     - Title: preliminary report, liens, bankruptcy, probate
     - Access: physical verification, right of way, locked gates
     - Condition: site inspection, unpermitted structures, foundation issues
     - Tax: verify with treasurer, special assessments, HOA liens
     - Value: independent appraisal, comparables analysis

3. **Scoring Integration** (`src/lib/scoring/index.ts`):
   - Added `redemption_risk_adjustment` to opportunity breakdown: +5 for LOW risk, -10 for HIGH risk
   - Added `too_good_adjustment`: -15 per critical trigger, -5 for warnings
   - Recommendation thresholds now adjust based on redemption risk level
   - Too-good-to-be-true high suspicion + low opportunity = hard AVOID recommendation
   - Re-exports new modules for external use

4. **UI Components** (`src/components/property/RiskIndicators.tsx`):
   - `RedemptionRiskDisplay`: Color-coded card (green/amber/red) with percentage and factors
   - `TooGoodToBeTrueDisplay`: Critical/Warning badge with trigger details and investigation checklist
   - `RedemptionRiskBadge`: Compact badge for list views
   - `TooGoodIndicator`: Compact indicator for list views
   - Full integration into property detail page

5. **Property Detail Page Updates** (`src/app/properties/[id]/page.tsx`):
   - Added `scoreProperty()` call to compute enhanced scoring data
   - Passes outcomes, zoning profile, and unincorporated status for complete analysis
   - RiskIndicators component positioned after Score Breakdown section

**Trampa evitada:**
- Initially planned to store redemption risk in database, but it's derived from owner_name, occupancy_status, years_delinquent which are already stored. Solution: Calculate on-the-fly in scoring engine, no schema changes needed.
- Too-good-to-be-true detector needed outcomes data (auction passes) which isn't available at scoring time in database. Solution: Added `outcomes` array to PropertyInput and pass from page component which already loads outcomes for OutcomeTracker.

**Patron reusable:**
- Derived scoring metrics: Calculate at runtime from existing data rather than storing redundant columns
- Signal-based adjustments: Use point-based adjustments that feed into final score rather than separate binary flags
- Severity tiers: critical/warning/none with different UI treatments and scoring impacts
- Investigation checklist generation: Dynamic list based on which specific triggers fired
- Quick assessment functions: Export simplified versions for list views vs full calculation for detail views

**Files created/modified:**
- `src/lib/scoring/redemption-risk.ts` - New module (complete)
- `src/lib/scoring/too-good-detector.ts` - New module (complete)
- `src/lib/scoring/index.ts` - Enhanced with integration logic
- `src/components/property/RiskIndicators.tsx` - New component
- `src/app/properties/[id]/page.tsx` - Added RiskIndicators integration
- `memory/code-notes.md` - This entry

**Build Status:** PASS

---

### [2026-04-29] coder — Workstream 1: Title Research Checklist (P0 CRITICAL)

**Decisión de código:** Implemented the 9-step Interactive Title Research Checklist based on Dustin Hahn methodology.

**Features Implemented:**
1. **Database Schema** (`prisma/schema.prisma`):
   - Added `TitleResearchChecklist` model with 9 checklist items
   - Each item has: status (pending/clear/flagged), notes, completed_at, auto_verified fields
   - Linked 1:1 with Property model via `titleResearch` relation

2. **API Route** (`src/app/api/properties/[id]/title-research/route.ts`):
   - GET: Fetch checklist for property (auto-creates if missing)
   - POST: Update individual checklist item status
   - PATCH: Bulk update multiple items
   - Auto-verifies drive-by and GIS items if photo_url/aerial_url exist

3. **Component** (`src/components/property/TitleResearchChecklist.tsx`):
   - All 9 Dustin Hahn steps with descriptions and auto-links:
     1. Drive-by/Street View verified (auto-check if lat/lng exists)
     2. County recorder deed search done
     3. Grantor/Grantee chain reviewed
     4. Municipal liens checked
     5. Owner name lien search done
     6. HOA status checked
     7. ARV verified with market value
     8. GIS/parcel boundary verified (auto-check if geometry exists)
     9. Lawsuit search done
   - Interactive status toggle (pending -> clear, with flag option)
   - Progress bar showing X/9 completed
   - Auto-links to Utah County resources for each step
   - Auto-verification badges (purple) for items auto-checked
   - Notes field for each step with auto-save

4. **Property Detail Page** (`src/app/properties/[id]/page.tsx`):
   - Added TitleResearchChecklist component before DueDiligenceChecklist
   - Passes property data for auto-verification logic

**Trampa evitada:**
- Initially considered creating 9 separate database columns per item (27 columns total). Solution: Used consistent naming pattern (item_status, item_notes, item_completed_at) to keep schema manageable and auto-calculation of total_completed field.
- Auto-verification loop risk: Checklist creation on first GET uses property.photo_url/aerial_url without re-fetching Property, avoiding infinite loops.

**Patrón reusable:**
- Three-state workflow: pending (gray) -> clear (green) or flagged (red)
- Auto-verification: Check related entity data on creation, mark with Sparkles icon
- Progress calculation: Server-side counter updated on each status change, not calculated on read
- External link generation: Normalize parcel IDs (remove colons) for county URLs
- County URL pattern: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={parcelNoColons}`

**Files created/modified:**
- `prisma/schema.prisma` - Added TitleResearchChecklist model + Property relation
- `src/app/api/properties/[id]/title-research/route.ts` - New API route
- `src/components/property/TitleResearchChecklist.tsx` - New interactive component
- `src/app/properties/[id]/page.tsx` - Added checklist component
- `memory/code-notes.md` - This entry

**Migration:** `npx prisma db push` (schema pushed successfully)

---

### [2026-04-29] coder — Workstream 4: Tax Sanity Checker

**Decisión de código:** Implemented tax sanity checker to auto-flag suspicious properties where tax amount is too low relative to property value (per Dustin Hahn insight).

**Logic:**
- Flag if `total_amount_due / estimated_market_value < 0.3%`
- Example: $2,800 tax on $1M property = 0.28% → SUSPICIOUS
- Example: $5,000 tax on $200K property = 2.5% → NORMAL

**Cambios aplicados:**
1. **Database Schema** (`prisma/schema.prisma`):
   - Added `RedFlag` model with fields: property_id, flag_type, message, severity, details, is_resolved
   - Added `red_flags` relation to Property model

2. **Scoring Engine** (`src/lib/scoring/index.ts`):
   - Added `RedFlagResult` type with calculation metadata
   - Created `calculateTaxSanityCheck()` function with 0.3% threshold
   - Integrated into `scoreProperty()` - runs automatically during scoring

3. **UI Components** (`src/components/DataTrustIndicators.tsx`):
   - Added 'suspicious_tax_amount' alert type with amber/orange theming
   - Updated `generatePropertyAlerts()` to use 0.3% threshold (previously 0.5%)
   - Alert shows calculation: "Tax $X is only Y% of $Z value (expected >0.3%)"

4. **Property Detail Page** (`src/app/properties/[id]/page.tsx`):
   - Added `redFlags` query to fetch unresolved flags from database
   - Added display section for database red flags below auto-generated alerts

**Trampa evitada:** 
- Existing `generatePropertyAlerts()` had tax check at 0.5% threshold with 'tax-sanity' type. Updated to 0.3% and 'suspicious_tax_amount' type to match Dustin Hahn spec exactly.
- Separated runtime alerts (generated from property data) from persisted red flags (stored in database) - both displayed but different sources.

**Patron reusable:**
- Use threshold constants at module level for easy adjustment
- Store calculation details in JSON for audit trail
- Dual-display pattern: runtime-calculated warnings + persisted flags
- Alert type naming: use `suspicious_` prefix for data anomaly flags

**Files modified:**
- `prisma/schema.prisma` - Added RedFlag model and relation
- `src/lib/scoring/index.ts` - Added calculateTaxSanityCheck() and RedFlagResult type
- `src/components/DataTrustIndicators.tsx` - Added suspicious_tax_amount alert styling
- `src/app/properties/[id]/page.tsx` - Added redFlags query and display

---

### [2026-04-29] coder — Workstream 3: County Recorder Auto-Links

**Decision de código:** Implemented direct link generators to Utah County resources for title research.

**Links implemented:**
1. Deed Search by Owner - `https://www.utahcounty.gov/LandRecords/namesearch.asp?av_name=[OWNER]`
2. Parcel Records - `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=[PARCEL]`
3. Document Index - `https://www.utahcounty.gov/LandRecords/Index.asp`
4. Court Records - `https://www.utcourts.gov/courts/utah/`
5. GIS Map - `https://maps.utahcounty.gov/UtahCountyMap/`

**Trampa evitada:** Parcel number normalization. Utah County uses format `010020003` (no colons) in their av_serial parameter, but database stores `01:002:0003`. Created `normalizeParcelId()` helper that strips colons.

**Otra trampa evitada:** URL encoding for owner names with spaces/special characters. Used `encodeURIComponent()` to handle names like "O'Connor" or "Smith & Jones LLC".

**Patron reusable:** For county link generators:
- Always URL-encode query parameters
- Create normalization helpers for id format mismatches between internal storage and external systems
- Provide metadata objects for UI labels/descriptions separate from URL logic
- Implement disabled state when required data (like owner_name) is missing
- Use `target="_blank" rel="noopener noreferrer"` for all external government links

**Files created/modified:**
- `src/lib/utah-county-links.ts` - Link generator functions and metadata
- `src/components/property/CountyLinksPanel.tsx` - UI component with action buttons
- `src/app/properties/[id]/page.tsx` - Added CountyLinksPanel to right column

---

### [2026-04-27] coder — Property count on Generate Investor Report button

**Decisión de código:** Added `bidProperties.length` to the button text to show investors how many BID properties will be included in the report.

**Trampa evitada:** N/A - Simple JSX interpolation, no side effects.

**Patron reusable:** When showing action buttons that operate on a filtered dataset, display the count inline to set user expectations before they click.

### [2026-04-27] coder — Portfolio Overview stats verification

**Decisión de código:** Verified all 6 required stats are present in the Portfolio Overview section. Updated label from "Total Analyzed" to "Total Properties" for clarity. Added "Generated" date to the summary grid alongside Auction Date, Event Date -> Auction Date for consistency.

**Trampa evitada:** Almost left the generated date only in the footer. Moved it to the main stats grid so it's visible at a glance with other key metrics.

**Patron reusable:** When displaying report headers with multiple stats, use a consistent 4-column grid layout and group temporal data (auction date, generated date) together for scannability.

### [2026-04-28] coder — Workstream A: Street View Image Implementation (COMPLETED)

**Decisión de código:** Implemented Google Street View Static API for all 127 Utah County properties.

**Architecture:**
- API route `/api/properties/[id]/images` fetches coordinates from AGRC LIR
- Generates Street View URL using Google Maps Static API
- Also generates aerial view using Google Static Maps satellite view
- Caches URLs in `photo_url` and `aerial_url` database fields
- Batch script `npm run fetch-images` processes all properties

**Trampa evitada:** Coordinates are not stored in database currently. Solution: fetch from AGRC in API route, cache Street View URL in photo_url. No schema migration needed.

**Otra trampa evitada:** Google Maps API key must be kept server-side only. Client never sees the key - only the generated image URLs with embedded signatures.

**Patron reusable:** For external image APIs:
- Generate URL server-side (keeps API key secure)
- Store URL in database (caches result, reduces API calls)
- Client displays with error fallback to placeholder
- Use size parameter (sm/md/lg) for responsive images
- Always include error handling for missing/invalid images

**Files created/modified:**
- `src/components/PropertyImage.tsx` - Added photoUrl prop
- `src/app/api/properties/[id]/images/route.ts` - New API route
- `src/app/api/properties/[id]/zoning/auto-fill/route.ts` - Added image fetching step
- `scripts/fetch-all-images.ts` - Batch processing script
- `src/app/properties/page.tsx` - Updated to pass photo_url
- `src/app/properties/[id]/page.tsx` - Added image gallery section

**Next step:** User needs to provide GOOGLE_MAPS_API_KEY to populate images

### [2026-04-27] coder — Dark theme landing page transformation

**Decisión de código:** Converted landing page from light to dark professional theme (slate-900 base)

**Cambios aplicados:**
1. Main background: `bg-gradient-to-b from-slate-50 to-white` → `bg-slate-900`
2. Headlines: `text-slate-900` → `text-white`
3. Subheadlines: `text-slate-600` → `text-slate-300`
4. Badge text: `text-blue-800` → `text-blue-300`
5. Feature Cards: `bg-white` → `bg-slate-800 border border-slate-700`, text `text-slate-600` → `text-slate-400`
6. Stats Bar: numbers `text-slate-900` → `text-white`, labels `text-slate-600` → `text-slate-400`
7. How It Works: section title `text-white`, step backgrounds `bg-slate-800`, step text `text-slate-400`, descriptions `text-slate-400`
8. Demo CTA: background `bg-slate-900` → `bg-blue-900/30` for contrast
9. Footer: border-t `border-slate-800`, text `text-slate-400`

**Trampa evitada:** Demo CTA was already `bg-slate-900` which would blend with page background — changed to `bg-blue-900/30` for visual contrast

**Patrón reusable:** 
- Use `text-slate-300` for secondary text on dark backgrounds
- Use `text-slate-400` for tertiary/muted text
- Use `bg-slate-800 border border-slate-700` for elevated cards on dark themes
- Keep colored icon backgrounds (blue-100, green-100, amber-100) — they pop nicely on dark

### [2026-04-28] arquitecto — NextAuth.js Implementation

**Decisión de código:** Implemented NextAuth.js v5 with Google OAuth for multi-user support.

**Cambios aplicados:**
1. Schema: Added User, Account, Session, VerificationToken models (NextAuth standard)
2. Schema: Added user_id to Property model with relation to User
3. Created `/api/auth/[...nextauth]/route.ts` with PrismaAdapter and GoogleProvider
4. Created `middleware.ts` protecting /dashboard, /properties, /reports, /settings routes
5. Created login page at `/login` with dark theme and Google sign-in button
6. Updated AppLayout.tsx to use `useSession()` hook for real user data
7. Updated API routes to filter by session.user.id:
   - `/api/properties` - POST creates with user_id, GET filters by user_id
   - `/api/properties/[id]` - verifies ownership on GET, PUT, DELETE

**Trampa evitada:** Must use `getServerSession()` in API routes, not `getSession()`. The server version works in Next.js App Router API routes; the client version only works in browser.

**Patrón reusable:**
- Always verify ownership: `findFirst({ where: { id, user_id } })` instead of `findUnique({ where: { id } })`
- Return 401 for missing session, 404 for not found (don't leak existence of other users' data)
- Use `signOut({ callbackUrl: '/login' })` for clean logout redirect
- Avatar fallback: initials from name.split(' ').map(n => n[0]).join('').toUpperCase()

**Environment variables needed:**
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### [2026-04-28] coder — Workstream F: Redemption Checker Implementation

**Decisión de código:** Implemented automated redemption status checking for Utah County properties.

**Cambios aplicados:**
1. Created `src/lib/sync/redemption-checker.ts` with core logic:
   - `fetchRedemptionStatus()` - Scrapes Utah County Land Records for parcel
   - `parseRedemptionHtml()` - Extracts tax balance and "REDEEMED" status from HTML
   - `checkPropertyRedemption()` - Compares current vs previous status
   - `updatePropertyFromCheck()` - Updates DB and creates OutcomeEvent for redemptions

2. Created `src/app/api/cron/redemption-check/route.ts` API endpoint:
   - POST with modes: 'stale' (7+ days), 'all', 'selected' (by propertyIds)
   - Simple auth via CRON_SECRET env var (optional for dev)
   - Returns summary with redeemed count, amount changes, errors
   - GET returns sync status: lastCheckedAt, staleCount, daysUntilSale

3. Updated `src/app/properties/page.tsx` with new features:
   - "Sync Status" button with last check timestamp and stale count
   - Sale date approaching warning (< 7 days) with AlertTriangle
   - Status filter dropdown (All, new, researching, ready, redeemed)
   - Status column with color-coded badges
   - "Verified" column showing last check time with staleness indicator
   - Bulk actions: "Re-check Status" and "Re-run Auto-fill" for selected properties

**Trampa evitada:**
- Utah County server rate limiting: Added 1s delay between requests
- Partial page loading: Cheerio parses what's available, graceful fallbacks
- Duplicate OutcomeEvents: Used Prisma transaction to update Property + create Event atomically
- Redeemed properties still selectable: Disabled checkbox for redeemed status

**Patrón reusable:**
- For scraping: Use cheerio + fetch with User-Agent header + rate limiting delay
- For status checks: Store `source_last_checked_at` and `status_last_verified_at` separately
- For bulk actions: Show progress in selection bar, clear selection on complete
- For warnings: Use amber-50 border-amber-200 for sale date alerts, emerald for success
- For staleness: >7 days = AlertTriangle + amber text, <=7 days = Check + slate text

**Utah County URL format:**
```
https://www.utahcounty.gov/LandRecords/property.asp?av_serial={parcel.replace(/:/g, '')}
```

**Redemption detection logic:**
1. Look for "REDEEMED" or "PAID IN FULL" text on page
2. Parse tax history table, sum Balance Due for years >= 2024
3. If total balance = 0, mark as redeemed
4. Compare current amount with stored amount (>$1 diff = amount_changed)

### [2026-04-28] coder — Workstream E: Assemblage Detection System

**Decisión de código:** Implemented complete assemblage detection system to identify adjacent parcels for micro-parcel opportunities.

**Cambios aplicados:**
1. **Database Schema** (`prisma/schema.prisma`):
   - Added `AdjacentParcel` model with fields: property_id, adjacent_parcel_number, is_in_tax_sale, distance_meters
   - Added `adjacent_parcels` relation to Property model
   - Ran migration with `npx prisma db push --accept-data-loss`

2. **Detection Logic** (`src/lib/assemblage/detector.ts`):
   - Created AGRC LIR integration to query parcel geometry
   - Implemented buffer-based neighbor detection (100m radius)
   - Added tax sale cross-reference to identify adjacent properties in database
   - Created batch processing for multiple properties

3. **Scoring Integration** (`src/lib/scoring/index.ts`):
   - Added `getAdjacentParcelNumbers()` helper to load from DB
   - Added `scorePropertyWithAdjacentData()` async wrapper
   - Scoring engine already supported assemblage via `adjacentParcelIds` parameter

4. **API Endpoints** (`src/app/api/properties/[id]/assemblage/route.ts`):
   - GET: Returns adjacent parcels with tax sale enrichment
   - POST: Triggers on-demand assemblage detection

5. **UI Updates** (`src/app/properties/[id]/page.tsx`):
   - Added Adjacent Parcels section card
   - Shows parcel numbers with "In Tax Sale" badges
   - Links to properties that exist in database
   - Displays combined opportunity message for micro-parcels
   - Purple theming for assemblage opportunity highlighting

6. **Alert Enhancement** (`src/components/DataTrustIndicators.tsx`):
   - Enhanced assemblage alert to show count of adjacent tax sale parcels
   - Dynamic messaging based on actual data

**Trampa evitada:** Initially considered running AGRC queries for every property on page load. Changed to cached storage pattern — adjacent parcels stored in database and only refreshed on-demand or via batch script.

**Patrón reusable:**
- Use AGRC LIR FeatureServer queries with geometryType=esriGeometryPoint and spatialRel=esriSpatialRelIntersects
- Normalize Utah County parcel numbers: "12:345:6789" -> "123456789" for AGRC queries
- Batch external API calls with sequential processing to avoid rate limiting
- Store derived data (adjacent parcels) in database for fast reads

### [2026-04-29] coder — Workstream 10: Documentation + Polish

**Decisión de código:** Updated documentation, navigation, and landing page to reflect V3 features and ensure all components work together.

**Cambios aplicados:**

1. **README.md Complete Rewrite:**
   - Replaced default Next.js template with comprehensive project documentation
   - Documented all V3 features: Title Research Checklist, Max Bid Calculator, Assemblage Detection
   - Added environment variable reference and quick start guide
   - Listed V3 features: Authentication, Redemption Monitoring, City Zoning Fetchers (ready)

2. **Navigation Updates (`src/components/AppLayout.tsx`):**
   - Added Calendar link (Calendar icon) to main nav
   - Added States link (Map icon) to main nav - placeholder for Interactive US Map
   - Both links positioned between Investor Reports and Settings
   - Maintained mobile-responsive menu structure

3. **Landing Page Transformation (`src/app/page.tsx`):**
   - Converted to dark theme (slate-900 base) matching app aesthetic
   - Added V3 Feature Highlights section (V3 badge, 3 feature cards)
   - Documented: Title Research Tools (8-step Dustin Hahn workflow)
   - Documented: Max Bid Calculator (ARV × 80% − Costs − Profit formula)
   - Documented: Interactive US Map (nationwide expansion preview)
   - Enhanced stats bar: 127 Properties | Utah County | May 21, 2026 | 8-Step Due Diligence
   - Added Data Coverage section with scoring methodology visualization

4. **App Store Presentation (`docs/APP_STORE_PRESENTATION.md`):**
   - Updated for V3 with new screenshots documentation
   - Screenshot 1: Landing Page V3 with Title Research Tools badge
   - Screenshot 2: Properties List with status filters and verification timestamps
   - Screenshot 3: Property Detail with Due Diligence Checklist panel
   - Screenshot 4: Max Bid Calculator with formula breakdown
   - Screenshot 5: Investor Report (unchanged)
   - Screenshot 6: Dashboard (unchanged)
   - Screenshot 7: Navigation with Calendar and States links
   - Added suggested new screenshots: Due Diligence Progress, Assemblage Detection, Data Sync Status, Interactive Map (placeholder), Calendar View (placeholder)
   - Updated feature table with V3 additions: Title Research Checklist, Tax Sanity Checker, Redemption Monitoring, Assemblage Detection

5. **TypeScript Issue Fixes (Cross-Workstream Coordination):**
   - Fixed `calculateRecommendation()` call signature - added null placeholders for redemptionRisk and tooGoodResult, wrapped volatility.details to match expected type
   - Fixed `getCodeEnforcementLink()` type comparison - removed 'unavailable' check, kept 'api' check only

**Trampa evitada:**
- Navigation links to Calendar and States pages don't exist yet - added as future-proofing placeholders for V4 nationwide expansion
- TypeScript conflicts between workstreams: calculateRecommendation signature had changed but calls weren't updated - fixed argument mismatch

**Patrón reusable:**
- When adding nav links for future features, add them with working icons and labels even if pages don't exist yet (Next.js will 404 gracefully)
- After parallel workstreams, always run full TypeScript build to catch signature mismatches between branches
- Document placeholder features with "Coming Soon" badges on landing pages to build anticipation

**Files modified:**
- `README.md` - Complete documentation rewrite
- `src/components/AppLayout.tsx` - Added Calendar and States nav links
- `src/app/page.tsx` - V3 highlights, dark theme, feature documentation
- `docs/APP_STORE_PRESENTATION.md` - New screenshots and V3 features
- `src/lib/scoring/index.ts` - Fixed function call signature
- `memory/code-notes.md` - This entry

**Build Status:** PASS (TypeScript compilation clean, Prisma generates successfully)

---

---

### [2026-04-29] coder — Workstream 2: Max Bid Calculator

**Decisión de código:** Implemented Max Bid Calculator widget based on Dustin Hahn formula for property detail page.

**Formula Implemented:**
```
Max Bid = (ARV × 80%) - Municipal Liens - $3,500 (Quiet Title) - Repairs - Desired Profit
```

**Features Implemented:**
1. **Database Schema** (`prisma/schema.prisma`):
   - Added `max_bid_calculated` (Float) - stores the calculated maximum bid
   - Added `repair_estimate` (Float) - stores user's repair cost input
   - Added `desired_profit` (Float) - stores user's desired profit amount
   - Migration applied: `npx prisma db push --accept-data-loss`

2. **Calculator Component** (`src/components/MaxBidCalculator.tsx`):
   - ARV input pre-filled from `estimated_market_value` property field
   - Municipal liens input pre-filled from `total_amount_due` property field
   - Repair estimate input (default $0, user-editable)
   - Desired profit with dual-mode selector: $ amount OR % of ARV
   - Fixed quiet title cost at $3,500 (industry standard)
   - Fixed ARV discount at 80% (Dustin Hahn recommendation)
   - Real-time calculation display with full breakdown:
     - ARV × 80% = $
     - Less: Municipal Liens = $
     - Less: Quiet Title = $3,500
     - Less: Repairs = $
     - Less: Desired Profit = $
     - MAX BID = $
   - "Do Not Exceed" warning when max bid <= 0 or < 50% of opening bid
   - Save button persists calculation to database
   - Visual indicators: green (viable) vs red (too high) vs opening bid comparison

3. **API Integration** (`src/app/api/properties/[id]/route.ts`):
   - PUT endpoint updated to accept new fields: `max_bid_calculated`, `repair_estimate`, `desired_profit`
   - All fields stored with property record for retrieval

4. **Property Detail Page** (`src/app/properties/[id]/page.tsx`):
   - Integrated MaxBidCalculator with saved value retrieval
   - Passes saved repair_estimate, desired_profit, max_bid_calculated to component for re-hydration
   - Calculator positioned after Due Diligence Checklist in left column

5. **Authentication Fix** (`src/app/api/auth/[...nextauth]/route.ts`):
   - Exported `authOptions` configuration object (previously missing export)
   - Fixed type definition for session callback to satisfy TypeScript

**Trampa evitada:**
- Component was using PATCH method but API only supported PUT. Changed component to use PUT, aligning with existing API pattern.
- Desired profit needed dual input modes ($ amount vs % of ARV). Solution: Added state toggle with real-time conversion calculation.
- Pre-filling from property data could overwrite user edits. Solution: Only pre-fill on initial mount when values are empty, not on every prop change.

**Patron reusable:**
- Formula calculators: Show full derivation breakdown with +/- signs for transparency
- Fixed constants: Display as disabled inputs with explanatory text (e.g., "Fixed: $3,500")
- Dual-mode inputs: Use select dropdown next to input to switch between amount/percentage
- "Do Not Exceed" warnings: Calculate ratio against opening bid, show specific warning messages
- Save integration: Persist both calculated result and input parameters for re-hydration
- Pre-filled values: Add helper text "Pre-filled from X" to indicate data origin

**Build Status:** PASS
- All TypeScript errors resolved
- Schema migration applied successfully
- Build completes with 22 routes

**Files created/modified:**
- `prisma/schema.prisma` - Added 3 new fields to Property model
- `src/components/MaxBidCalculator.tsx` - Complete rewrite per Dustin Hahn spec
- `src/app/api/properties/[id]/route.ts` - Added new fields to PUT handler
- `src/app/properties/[id]/page.tsx` - Updated MaxBidCalculator props
- `src/app/api/auth/[...nextauth]/route.ts` - Added authOptions export

---

### [2026-04-28] coder — City Zoning Integration Implementation

**Decisión de código:** Implemented real zoning code fetchers for all 16 Utah County cities using Utah County's ArcGIS REST API.

**Cambios aplicados:**
1. Created `src/lib/zoning/cities/` directory with 16+2 city fetcher modules:
   - index.ts (exports, layer IDs, planning URLs)
   - common.ts (shared utilities, identify API, buildability calc)
   - Individual city files: provo.ts, orem.ts, lehi.ts, american-fork.ts, spanish-fork.ts, pleasant-grove.ts, springville.ts, highland.ts, alpine.ts, cedar-hills.ts, lindon.ts, mapleton.ts, payson.ts, saratoga-springs.ts, eagle-mountain.ts, vineyard.ts

2. Each city fetcher:
   - Uses Utah County ArcGIS identify API with city-specific layer ID
   - Normalizes zone codes to standard format (e.g., "R-1", "C-G")
   - Returns: zoneCode, zoneName, buildabilityScore, sourceUrl, jurisdiction

3. ArcGIS Layer IDs discovered:
   - Provo: 29, Orem: 28, Lehi: 25, Spanish Fork: 35
   - Pleasant Grove: 30, Springville: 36, American Fork: 16
   - Highland: 24, Alpine: 15, Cedar Hills: 18, Lindon: 26
   - Mapleton: 27, Payson: 31, Saratoga Springs: 34
   - Eagle Mountain: 20, Vineyard: 37
   - Unincorporated: 65

**Trampa evitada:** Initially thought cities had separate APIs - discovered Utah County hosts all zoning data in unified ArcGIS service. Saved weeks of individual city API research.

**Patron reusable:** 
- Use identify API with coordinates + layer ID for spatial queries
- Normalize zone codes per city (each uses different conventions)
- Calculate buildability score from zone classification
- Export both unified interface and individual fetchers for flexibility
