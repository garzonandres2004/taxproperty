# Changelog - TaxProperty

## [Current] - April 2026

### Core App
- Next.js 14 App Router setup with TypeScript
- Prisma + SQLite database
- Tailwind CSS styling
- Full routing: dashboard, properties, property detail, import, settings, reports

### Data Model
- Property model with 30+ fields
- ZoningProfile model with full zoning schema (70 fields)
- Source and Outcome models
- ZoningProfile linked to Property (1:1)

### Scoring Engine
- Opportunity score (equity spread, property quality, exit ease, capital fit, data confidence)
- Risk score (legal, property, market, execution, pre-sale volatility)
- Capital fit score
- Final weighted score
- Recommendation: bid / research_more / avoid

### Data Enrichment
- AGRC LIR API integration (correct endpoint: Parcels_Utah_LIR/FeatureServer/0)
- Market value, building sqft, year built auto-populated from AGRC
- Parcel ID format normalization (removes non-numeric chars for API query)
- Centroid calculation from polygon geometry rings

### Zoning System
- Utah County Zoning Identify API integrated
- City vs unincorporated detection from PARCEL_CITY field
- 16-city planning URL lookup table
- 20+ zone lookup table (RA-5, R-1-8, TR-5, A-40, CE-1, etc.)
- Use idea generator (auto from zone + property type + lot size)
- Buildability score calculator (0-100)
- Penalty logic for CE zones, mining/grazing, city jurisdiction
- ZoningProfile saved to database

### Reports
- 5-section report per property
- Executive summary table
- Per-property: Investment Summary, Land Use & Zoning, Building Rules, Buildability, Use Ideas
- Print/PDF support
- City jurisdiction warning banners
- Red flag detection

### Data Quality
- 127 real Utah County 2026 tax sale properties imported
- 10 fake seed properties removed
- 11 BRMK Provo Canyon LLC parcels flagged as hillside
- 04:016:0003 (DENSITY997 LLC) flagged as suspicious
- Auto-fill run on all 127 properties
