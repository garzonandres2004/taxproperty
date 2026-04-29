# Project Status

## Current Milestone: V2 - Demo Ready

## Completed ✅
- Next.js app with full routing
- Prisma schema: Property, ZoningProfile, Source, Outcome
- Dashboard page with stats
- Properties list with filters and search
- Property detail page
- CSV import for Utah County format
- Scoring engine: opportunity score, risk score, capital fit score, final score
- Recommendation engine: bid / research_more / avoid
- AGRC LIR API integration (correct endpoint: Parcels_Utah_LIR/FeatureServer/0)
- Market value, building sqft, year built auto-populated from AGRC
- Parcel ID format normalization (removes non-numeric chars for API query)
- Centroid calculation from polygon geometry rings
- Utah County Zoning Identify API integrated
- City vs unincorporated detection from PARCEL_CITY field
- 16-city planning URL lookup table
- 20+ zone lookup table (RA-5, R-1-8, TR-5, A-40, CE-1, etc.)
- Use idea generator (auto from zone + property type + lot size)
- Buildability score calculator (0-100)
- Penalty logic for CE zones, mining/grazing, city jurisdiction
- ZoningProfile saved to database
- 5-section report per property
- Executive summary table
- Per-property: Investment Summary, Land Use & Zoning, Building Rules, Buildability, Use Ideas
- Print/PDF support
- City jurisdiction warning banners
- Red flag detection
- 127 real Utah County 2026 tax sale properties imported
- 10 fake seed properties removed
- 11 BRMK Provo Canyon LLC parcels flagged as hillside
- 04:016:0003 (DENSITY997 LLC) flagged as suspicious
- Auto-fill run on all 127 properties
- **V2 Demo Ready (April 2026):**
  - Professional dark-themed landing page (navy/slate)
  - Micro-parcel scoring penalty (40 points deducted, 40 parcels flagged)
  - Portfolio Overview in reports (stats, payoff ratios, auction date)
  - Generate Investor Report button with BID property count

## Completed V2.1 ✅ (April 2026)
- Deployed to Vercel with password protection
- 127 Utah County properties with Street View (119/127)
- Due diligence links (Land Records, Recorder)
- Tax Sanity Check section
- Data confidence indicators
- App Store presentation created
- Dustin Hahn research analyzed (16 videos, 46k words)

## V3 Features - Based on Expert Research 📋
See: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md

### Priority 1 (Quick Wins)
- #9 Max Bid Calculator (ARV × 0.80 - liens - costs)
- #10 Tax Sanity Checker (flag suspicious payoffs)
- #11 Title Research Checklist (9 steps)
- #12 County Recorder Auto-Links
- #13 Regrid Map Embed

### Priority 2 (Scoring Intelligence)
- #14 Redemption Risk Score Enhancement
- #15 "Too Good To Be True" Detector

### Priority 3 (Data Enrichment)
- Municipal Lien Detection
- Document Timeline
- Red Flag Analyzer

### Priority 4 (Expansion Foundation)
- Interactive US Map (sale types by state)
- Auction Calendar
- State Guide Pages

## Open GitHub Issues
Run: gh issue list

## Next Phase: Perfect Utah County
NOT expanding to other counties until Utah is perfect.
Research shows Dustin Hahn's methodology - implement these features first.

## Long-term Vision
National expansion to all US counties with SaaS subscription model.
