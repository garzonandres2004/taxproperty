# TaxProperty - Memory Index

## Project Context
- **Project**: TaxProperty Utah - Tax sale property investment intelligence platform
- **Current Phase**: 
  - Workstream A: Real Property Images (IN PROGRESS - coder)
  - Workstream C: Authentication & Multi-User (IN PROGRESS - arquitecto)
- **Location**: /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah

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
