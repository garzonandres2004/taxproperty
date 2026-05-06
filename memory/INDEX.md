# TaxProperty - Memory Index

## Project Context
- **Project**: TaxProperty Utah - Tax sale property investment intelligence platform
- **Current Phase**:
  - Agent A: County-Agnostic Architecture (COMPLETED - coder)
  - Agent B: InvestorMemo Engine (COMPLETED - coder)
  - Workstream 1: Title Research Checklist (COMPLETED - coder)
  - Workstream A: Real Property Images (COMPLETED - coder)
  - Workstream C: Authentication & Multi-User (COMPLETED - arquitecto)
  - Workstream 6: Map Integration (COMPLETED - coder)
  - Workstream 7: Auction Calendar + OTC Detection (COMPLETED - coder)
- **Location**: /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah

## Agent B: InvestorMemo Engine Enhancement
**Status**: COMPLETED
**Agent**: coder (Agent B - Memo/Recommendation Engine Owner)
**Started**: 2026-05-05
**Completed**: 2026-05-05

### Tasks Completed
- [x] Enhanced InvestorMemo types with CountyReadiness support (LIVE | NEAR_LIVE | PARTIAL | PLANNED)
- [x] Added ReadinessCaveat interface with message, impact, data gaps, confidence adjustment
- [x] Created MaxBidAnalysis interface with Dustin Hahn formula breakdown
- [x] Implemented county readiness detection from CountyConfig.status
- [x] Integrated Dustin Hahn max bid formula: (ARV × 80%) - Liens - $3,500 - Repairs - Profit
- [x] Added max bid viability assessment (strong/good/marginal/poor)
- [x] Implemented confidence score calculation with readiness multiplier
- [x] Updated recommendation logic to consider readiness and max bid viability
- [x] Enhanced markdown renderer with formula breakdown and data sources
- [x] Created memo/index.ts exports file with batch processing helpers

### Memo Output Fields (Required per Parcel)
| Field | Type | Description |
|-------|------|-------------|
| recommendation | GO/CAUTION/RESEARCH/AVOID | Investment decision |
| maxBid | MaxBidAnalysis | Full bid calculation with formula breakdown |
| good | string[] | Positive investment signals |
| bad | string[] | Risk signals and warnings |
| titleSummary | MemoTitleSummary | Title research findings |
| keyFacts | MemoKeyFacts | Essential property data |
| nextActions | string[] | Recommended verification steps |
| confidenceScore | number | 0-100, adjusted by readiness |
| readinessCaveat | ReadinessCaveat/null | County status warning |

### County Readiness Handling
| Level | Confidence | Message | Impact |
|-------|------------|---------|--------|
| LIVE | 100% | None | None |
| NEAR_LIVE | 85% | Beta - verify auction details | Minor |
| PARTIAL | 60% | Verify key assumptions manually | Moderate |
| PLANNED | 30% | Not onboarded - CSV only | Severe |

### Files Created/Modified
- `src/lib/memo/types.ts` — Enhanced with readiness types and max bid analysis
- `src/lib/memo/generate.ts` — Added readiness detection and Dustin Hahn formula
- `src/lib/memo/render.ts` — Enhanced markdown with formula breakdown
- `src/lib/memo/index.ts` — New exports file

### Active Entries
- [2026-05-05] coder — Agent B: InvestorMemo Engine Enhancement complete

---

## Agent A: County-Agnostic Architecture + Readiness System
**Status**: COMPLETED
**Agent**: coder (Agent A - County/Core Data Owner)
**Started**: 2026-05-05
**Completed**: 2026-05-05

### Tasks Completed
- [x] Added `CountyReadinessStatus` enum: LIVE | NEAR_LIVE | PARTIAL | PLANNED
- [x] Added `CountyReadiness` interface with metadata fields
- [x] Added `NormalizedParcelOutput` interface for memo engine feeding
- [x] Updated `CountyAdapter` interface with `readiness` field and `toNormalizedOutput()` method
- [x] Updated Prisma schema: added `readiness` and `readiness_reason` to CountyConfig
- [x] Updated COUNTY_REGISTRY.md with new status definitions
- [x] Assigned statuses to all counties:
  - LIVE: Utah (127), Tooele (29), Rich (4)
  - NEAR_LIVE: Sanpete (0 properties, 52 discovered)
  - PARTIAL: Weber (69), Davis (22)
  - PLANNED: Salt Lake + 22 remaining counties
- [x] Applied database updates with readiness values
- [x] Added missing county entries: Davis, Weber, Salt Lake

### Files Modified
- `src/lib/counties/types.ts` — Added readiness types and normalized output schema
- `prisma/schema.prisma` — Added readiness fields to CountyConfig
- `docs/COUNTY_REGISTRY.md` — Updated all county statuses

### County Status Summary
| County | Status | Properties | Adapter | Data Gaps |
|--------|--------|------------|---------|-----------|
| Utah | LIVE | 127 | Yes | None (reference) |
| Tooele | LIVE | 29 | Yes | None |
| Rich | LIVE | 4 | Yes | No zoning API |
| Weber | PARTIAL | 69 | Yes | Zoning incomplete |
| Davis | PARTIAL | 22 | Yes | PDF extraction incomplete |
| Sanpete | NEAR_LIVE | 0 | Yes | Import pending |
| Salt Lake | PLANNED | 0 | Yes | Awaiting tax sale list |

### Active Entries
- [2026-05-05] coder — Agent A: County-Agnostic Architecture + Readiness System complete

---

## Workstream 6: Map Integration (WS6)
**Status**: COMPLETED
**Agent**: coder
**Started**: 2026-04-29
**Completed**: 2026-04-29

### Tasks Completed
- [x] Created StreetViewPanel component with Google Maps iframe embed
- [x] Created ParcelMap component with Utah County GIS links
- [x] Integrated both components into property detail page
- [x] Dark theme styling matching existing UI patterns
- [x] Build passes (npm run build)

### Files Created/Modified
- `src/components/property/StreetViewPanel.tsx` — Google Street View embed card
- `src/components/property/ParcelMap.tsx` — Utah County GIS links card
- `src/app/properties/[id]/page.tsx` — Added map section after Score Breakdown

### Implementation Details
- Street View uses address-based embed (no lat/lng required in database)
- Parcel ID normalization: strips colons, pads to 11 digits
- Primary: Utah County GIS (`maps.utahcounty.gov/UtahCountyMap/?parcel={id}`)
- Secondary: OpenStreetMap fallback link

### Active Entries
- [2026-04-29] coder — WS6: Map Integration complete
- [2026-05-02] investigador — Tax Sale Programs for Salt Lake, Summit, and Weber Counties
- [2026-04-29] coder — WS7: Auction Calendar + OTC Detection complete
- [2026-05-04] investigador — Tooele County Recorder Portal Investigation (CivicCenter URL was incorrect)
- [2026-05-05] coder — Tooele EagleWeb Integration: Full browser automation via Public Web Limited Viewer. 29 properties batch processed with title signals extracted. Auction triage updated.
- [2026-05-05] coder — Sanpete County Triage Alpha: Public Surplus + EagleWeb automation complete. 52 parcels discovered. Recorder IS ONLINE via Public Web Limited Viewer (identical to Tooele). Title signals extracted for all test parcels. Indian Ridge Ranch recreational lot pattern identified.

---

## Workstream 7: Auction Calendar + OTC Detection
**Status**: COMPLETED
**Agent**: coder
**Started**: 2026-04-29
**Completed**: 2026-04-29

### Tasks Completed
- [x] Database: Added `is_otc` field to Property model, created Auction model
- [x] Calendar page: Full dark-themed page with hero, countdown timer, filters
- [x] AuctionCard component: Reusable cards with format badges, property count, countdown
- [x] Auction API: GET/POST endpoints with filtering support
- [x] Properties page: OTC filter dropdown, OTC badge on property cards
- [x] Scoring: +10 point OTC bonus in opportunity_score calculation
- [x] OTC Detection: Keyword-based detection utility (notes containing "OTC", "unsold", etc.)
- [x] Build passes (TypeScript clean, Prisma generates)

### Features
- **Calendar**: Utah County May 21, 2026 featured with link to official listing
- **Countdown**: Dynamic days-remaining display for next auction
- **Filters**: State, Format (Online/In-Person), Date Range (Upcoming/All/Past)
- **OTC Badge**: Amber badge on properties marked as Over The Counter
- **OTC Bonus**: +10 points to opportunity_score (less competition for unsold properties)

### Files Created/Modified
- `prisma/schema.prisma` — Added is_otc field, Auction model
- `src/app/calendar/page.tsx` — Full calendar page with featured auction
- `src/components/auction/AuctionCard.tsx` — Reusable auction card component
- `src/app/api/auctions/route.ts` — REST API for auctions
- `src/lib/otc-detector.ts` — OTC detection from notes/status
- `src/app/properties/page.tsx` — OTC filter and badge added
- `src/lib/scoring/index.ts` — OTC bonus in scoring engine

---

## Workstream 1: Title Research Checklist (P0 CRITICAL)
**Status**: COMPLETED
**Agent**: coder
**Started**: 2026-04-29
**Completed**: 2026-04-29

### Tasks Completed
- [x] Database migration: Added TitleResearchChecklist model linked to Property (1:1)
- [x] 9 checklist items from Dustin Hahn methodology:
  1. Drive-by/Street View verified (auto-check if photo_url exists)
  2. County recorder deed search done
  3. Grantor/Grantee chain reviewed
  4. Municipal liens checked
  5. Owner name lien search done
  6. HOA status checked
  7. ARV verified with market value
  8. GIS/parcel boundary verified (auto-check if aerial_url exists)
  9. Lawsuit search done
- [x] Each item has: status (pending/clear/flagged), notes field, completed_at timestamp
- [x] Progress bar showing X/9 completed
- [x] Auto-links for each step (County recorder, GIS, Utah Courts, etc.)
- [x] Save state to database via API
- [x] Build passes (npm run build)

### Files Created/Modified
- `prisma/schema.prisma` — Added TitleResearchChecklist model + Property relation
- `src/app/api/properties/[id]/title-research/route.ts` — API endpoints (GET, POST, PATCH)
- `src/components/property/TitleResearchChecklist.tsx` — Interactive checklist component
- `src/app/properties/[id]/page.tsx` — Added TitleResearchChecklist before DueDiligenceChecklist

### Auto-Verification Logic
- Drive-by item: Auto-marked "clear" if property.photo_url exists (Street View image)
- GIS item: Auto-marked "clear" if property.aerial_url exists (Aerial imagery)
- Auto-verified items show purple "Auto-Verified" badge with Sparkles icon

### Migration Status
```bash
npx prisma db push  # Schema pushed successfully (SQLite)
```

### Active Entries
- [2026-04-29] coder — Workstream 1: Title Research Checklist complete

---

## Workstream E: Assemblage Detection System
**Status**: COMPLETED
**Agent**: coder
**Started**: 2026-04-28
**Completed**: 2026-04-28

### Tasks Completed
- [x] Phase 1: Database Schema (AdjacentParcel model, Property relation)
- [x] Phase 2: Detection Logic (AGRC LIR integration, buffer query)
- [x] Phase 3: Scoring Integration (assemblage_opportunity flag)
- [x] Phase 4: UI Updates (property detail page, adjacent parcels section)
- [x] Build passes (npm run build)

### Files Created/Modified
- `prisma/schema.prisma` — Added AdjacentParcel model
- `src/lib/assemblage/detector.ts` — Assemblage detection logic
- `src/app/api/properties/[id]/assemblage/route.ts` — API endpoints
- `src/app/properties/[id]/page.tsx` — Adjacent parcels UI section
- `src/components/DataTrustIndicators.tsx` — Enhanced assemblage alert
- `src/lib/scoring/index.ts` — Added getAdjacentParcelNumbers helper
- `scripts/detect-assemblage.ts` — Batch detection script

### Active Entries
- [2026-04-28] coder — Workstream E: Assemblage Detection System complete

## Workstream A: Real Property Images
**Status**: COMPLETED - AWAITING GOOGLE MAPS API KEY
**Agent**: coder
**Started**: 2026-04-28
**Completed**: 2026-04-28

### Tasks Completed
- [x] Update PropertyImage.tsx with Google Street View support (photoUrl prop)
- [x] Create API route for image generation (`/api/properties/[id]/images`)
- [x] Update auto-fill pipeline to fetch images after coordinates
- [x] Create batch fetch script (`npm run fetch-images`)
- [x] Update property detail page with image gallery
- [x] Build passes (`npm run build`)

### Blockers
- [ ] Need Google Maps API key from user to populate images

### Usage
1. Add `GOOGLE_MAPS_API_KEY=your_key` to `.env.local`
2. Run `npm run fetch-images` to populate all 127 properties
3. Or run auto-fill on individual properties to generate images

### Files Modified/Created
- Modified: `src/components/PropertyImage.tsx` - Added photoUrl prop
- Created: `src/app/api/properties/[id]/images/route.ts` - Image generation API
- Modified: `src/app/api/properties/[id]/zoning/auto-fill/route.ts` - Image fetching step
- Created: `scripts/fetch-all-images.ts` - Batch script
- Modified: `src/app/properties/page.tsx` - Pass photo_url to PropertyImage
- Modified: `src/app/properties/[id]/page.tsx` - Image gallery section
- Created: `.env.example` - Document required env vars
- Modified: `package.json` - Added fetch-images script

### Active Entries
- [2026-04-28] coder — Completed Workstream A: Street View image implementation (awaiting API key)

## Workstream F: Data Synchronization & Automation
**Status**: COMPLETED
**Agent**: coder
**Started**: 2026-04-28
**Completed**: 2026-04-28

### Tasks Completed
- [x] Phase 1: Redemption Checker (`src/lib/sync/redemption-checker.ts`)
- [x] Phase 2: Cron Job API (`src/app/api/cron/redemption-check/route.ts`)
- [x] Phase 3: Bulk Actions UI (updated `src/app/properties/page.tsx`)
- [x] Phase 4: Staleness Indicators (last verified timestamp, sale date warnings)

### Features Implemented
- Automated scraping of Utah County Land Records
- Status change detection (redeemed, amount changed)
- Manual "Sync Status" button with last check timestamp
- Bulk "Re-check Status" and "Re-run Auto-fill" actions
- Stale data indicators (> 7 days)
- Sale date approaching warnings (< 7 days)

### Active Entries
- [2026-04-28] coder — Implemented Workstream F: Redemption Checker and sync automation

## Workstream C: Authentication & Multi-User
**Status**: COMPLETED - AWAITING DEPLOYMENT  
**Agent**: arquitecto + coder  
**Started**: 2026-04-28
**Completed**: 2026-04-28

### Tasks Completed
- [x] Phase 1: Schema Changes (User models, user_id on Property)
- [x] Phase 2: NextAuth Configuration
- [x] Phase 3: Middleware & Protection
- [x] Phase 4: UI Updates (Login page, AppLayout user display)
- [x] Phase 5: Data Scoping (API routes filter by user_id)

### Next Steps
1. Run `npm install next-auth @auth/prisma-adapter`
2. Run `npx prisma db push` to apply schema changes
3. Configure Google OAuth credentials in .env.local
4. Run `npm run build` to verify build passes

### Active Entries
- [2026-04-28] arquitecto — plan técnico: NextAuth.js + Google OAuth implementation

### Recent Entries (code-notes.md)
- [2026-04-27] coder — Property count on Generate Investor Report button
- [2026-04-27] coder — Portfolio Overview stats verification
- [2026-04-27] coder — Dark theme landing page transformation

## Memory Files
- `context.md` — Mission, scope, stakeholders
- `decisions.md` — Architecture decisions (ADRs)
- `research.md` — Research findings
- `code-notes.md` — Code patterns, gotchas
- `reviews.md` — Review findings
- `blockers.md` — Active blockers and unknowns

## Workstream 9: Municipal Lien Detection
**Status**: COMPLETED
**Agent**: investigador
**Started**: 2026-04-29
**Completed**: 2026-04-29

### Tasks Completed
- [x] Research: Found Utah County Code Enforcement API (gis2.codb.us)
- [x] Research: Documented city-specific code enforcement contacts
- [x] Research: Confirmed municipal liens survive foreclosure in Utah
- [x] Database: Added fields to Property model (municipal_lien_risk, code_violations_found, etc.)
- [x] Library: Created src/lib/municipal-liens.ts with API integration
- [x] Scoring: Added municipal lien penalties (-20 high, -10 medium, -5 unknown)
- [x] UI: Updated DueDiligenceChecklist with dynamic city-specific links
- [x] API: Created /api/properties/[id]/municipal-liens endpoint
- [x] Script: Created batch checker (npm run check-municipal-liens)

### Research Findings
- **Automated Source**: ArcGIS API for unincorporated Utah County (25/127 properties)
- **Manual Sources**: City code enforcement departments for 16 cities
- **No Centralized Utility Lien DB**: Must search county recorder manually
- **Key Insight**: Municipal liens survive tax foreclosure in Utah (Dustin Hahn warning)

### Files Created/Modified
- Created: `src/lib/municipal-liens.ts` — Research findings + implementation
- Created: `src/app/api/properties/[id]/municipal-liens/route.ts` — API endpoint
- Created: `scripts/check-municipal-liens.ts` — Batch checker
- Modified: `prisma/schema.prisma` — New Property fields
- Modified: `src/lib/scoring/index.ts` — Municipal lien penalties
- Modified: `src/components/DueDiligenceChecklist.tsx` — Dynamic city links
- Modified: `package.json` — Added check-municipal-liens script

### Active Entries
- [2026-04-29] investigador — Workstream 9: Municipal Lien Detection complete


## Workstream 2: Max Bid Calculator
**Status**: COMPLETED  
**Agent**: coder  
**Started**: 2026-04-29  
**Completed**: 2026-04-29

### Tasks Completed
- [x] Database schema: Added max_bid_calculated, repair_estimate, desired_profit fields
- [x] Calculator component with Dustin Hahn formula (ARV × 80% - Costs - Profit)
- [x] ARV pre-filled from estimated_market_value
- [x] Municipal liens pre-filled from total_amount_due
- [x] User inputs: Repair estimate (default $0), Desired profit ($ or % of ARV)
- [x] Fixed quiet title cost at $3,500
- [x] Display breakdown with all line items
- [x] "Do Not Exceed" warning when max bid is not viable
- [x] Save calculation to Property model
- [x] Build passes (TypeScript compilation clean)

### Formula
```
Max Bid = (ARV × 80%) - Municipal Liens - $3,500 - Repairs - Desired Profit
```

### Files Created/Modified
- `prisma/schema.prisma` — Added 3 new fields: max_bid_calculated, repair_estimate, desired_profit
- `src/components/MaxBidCalculator.tsx` — Complete component implementation
- `src/app/api/properties/[id]/route.ts` — PUT handler updated for new fields
- `src/app/properties/[id]/page.tsx` — Updated MaxBidCalculator integration
- `src/app/api/auth/[...nextauth]/route.ts` — Fixed authOptions export

### Active Entries
- [2026-04-29] coder — Workstream 2: Max Bid Calculator complete

---

## Workstream 10: Documentation + Polish
**Status**: COMPLETED  
**Agent**: coder  
**Started**: 2026-04-29  
**Completed**: 2026-04-29

### Tasks Completed
- [x] README.md complete rewrite with V3 features
- [x] Navigation updated with Calendar and States links
- [x] Landing page V3 highlights (Title Research, Max Bid Calculator, US Map)
- [x] App Store presentation updated with new screenshots
- [x] TypeScript compilation passes (build successful)
- [x] Prisma client generates successfully

### Files Modified
- `README.md` — Complete project documentation rewrite
- `src/components/AppLayout.tsx` — Added Calendar + States nav links
- `src/app/page.tsx` — V3 feature highlights, dark theme conversion
- `docs/APP_STORE_PRESENTATION.md` — V3 features and screenshot suggestions
- `src/lib/scoring/index.ts` — Fixed calculateRecommendation() signature mismatch

### Cross-Workstream Fixes
- Fixed TypeScript type mismatch in `calculateRecommendation()` call (volatility.details)
- Fixed type comparison error in DueDiligenceChecklist.tsx (removed 'unavailable' check)

### Active Entries
- [2026-04-29] coder — Workstream 10: Documentation + Polish complete, build passes
