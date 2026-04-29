# V2 Freeze - TaxProperty Utah

**Status:** DEMO-READY  
**Date:** 2026-04-29  
**Tag:** v2.0-demo-ready

---

## V2 Scope Complete

### Core Features
- ✅ Scoring engine with micro-parcel penalties, entity-owned detection, max bid calculation
- ✅ Property list with images (119 real Street View + 8 clean fallback)
- ✅ Data trust indicators (warnings, score colors, confidence meters)
- ✅ Investor Report with Portfolio Overview
- ✅ Zoning: 25 unincorporated (real codes), 102 city (manual guidance)
- ✅ Due diligence links (Land Records, Recorder) + Tax Sanity Check
- ✅ Dark-themed landing page
- ✅ Authentication system (NextAuth.js + Google OAuth configured)

### V2.1 Polish Sprint
- ✅ Image fallback for 8 properties without Street View coverage
- ✅ Due diligence section in Property Detail and Report
- ✅ Tax Sanity Check with neutral copy (payoff ratio)
- ✅ Decision: Keep city zoning as manual verification (fetchers ready for V3)

---

## Verification Checklist

Manual verification performed 2026-04-29:

- [x] 3 properties with real images display correctly
- [x] 2 properties with fallback show "No image" (clean, no broken icons)
- [x] 1 unincorporated parcel shows real zoning code
- [x] 1 city parcel shows manual verification guidance with planning URL
- [x] Report generation works with multiple selected properties
- [x] External links (Land Records, Recorder) open correctly
- [x] Print layout preserves formatting
- [x] Build passes (`npm run build`)

---

## What Was NOT Changed (Intentionally)

- Scoring thresholds remain at BID≥70, RESEARCH≥55
- No refactor of auto-fill pipeline
- No integration of city zoning fetchers (ready for V3)
- No activation of Salt Lake County, assemblage, or cron jobs

---

## V3 Ready (Code Exists, Not Activated)

The following workstreams are implemented but not integrated:

1. **Salt Lake County expansion** - API researched, adapters ready
2. **Authentication** - NextAuth configured, waiting for Google OAuth activation
3. **City zoning fetchers** - 16 city modules ready for integration
4. **Assemblage detection** - AdjacentParcel model and detection logic ready
5. **Data sync** - Redemption checker and cron API ready
6. **Real property images** - 119/127 populated, system working

---

## Next Phase

**V3 will open with ONE workstream:**
- Option A: Salt Lake County expansion (multi-county proof)
- Option B: Authentication activation (multi-user)
- Option C: Advanced due diligence automation

**Recommendation:** Start with Salt Lake County to prove multi-county architecture.

---

## Files at Freeze

- `src/lib/scoring/index.ts` - Scoring engine
- `src/app/properties/[id]/page.tsx` - Property detail with due diligence
- `src/app/reports/page.tsx` - Investor report
- `src/components/PropertyImage.tsx` - Images with fallback
- `src/lib/zoning/cities/` - City fetchers (ready for V3)
- `.env.local` - Configured with API keys

---

**V2 is frozen. Do not modify scoring, core flows, or existing data models.**

All V3 work must branch from this tag.
