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

## In Progress 🔄
- V2 Demo polish (landing page, portfolio overview, investor report button)

## Open GitHub Issues (Next to Build)
Run: gh issue list

## Known Issues / Gaps
- Micro-parcel penalty not implemented (small parcels score too high)
- City zoning (102/127 properties) shows guidance only, not real zone codes
- No authentication (single user only)
- Landing page is default Next.js (needs professional design)
- No "Generate Investor Report" one-click button

## Next County: Salt Lake County
- Research needed: SLC parcel API endpoint, zoning service, CSV format
- Requires county adapter pattern implementation first

## Long-term Vision
National expansion to all US counties with SaaS subscription model.
