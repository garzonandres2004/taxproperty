# TaxProperty - Project Spec

## Product Goal
A data intelligence platform for tax sale property investors. 
Automates the due diligence process for tax auction properties 
by pulling live GIS, zoning, and tax history data and scoring 
each property for investment viability.

## Who It's For
- Individual real estate investors ($5k-$500k budget)
- Real estate investment funds buying in bulk
- Hard money lenders validating borrower deals
- Anyone attending county tax sales in the USA

## Problem It Solves
Investors currently spend 40+ hours manually researching each 
county's auction list. TaxProperty automates this to seconds.

## Milestones

### MVP (Current - Utah County) ✅
- Import Utah County CSV tax sale list
- Score each property (opportunity + risk + capital fit)
- Auto-fill market value, building data from AGRC API
- Auto-fill zoning from Utah County GIS
- Generate printable investor report (5 sections per property)
- Dashboard with filters and search

### V2 - Demo Ready (May 2026)
- Professional landing page
- Portfolio overview in reports
- Micro-parcel scoring penalty
- One-click "Generate Investor Report" for all BID properties
- Polished UI for investor demos

### V3 - Salt Lake County
- County adapter pattern (standardized interface)
- Salt Lake County parcel + zoning integration
- Multi-county dashboard
- County selector on import page

### V4 - Utah Statewide
- All 29 Utah counties
- County config table in database
- Automated auction list detection

### V5 - National Expansion
- Top 20 counties by auction volume
- Standardized data model for all US counties
- SaaS subscription model ($99-299/month)

## Business Model
B2B SaaS. Charge investors monthly for access to county 
auction intelligence. Upsell: partner deal flow, co-investment.

---

## Technical Requirements

### Current Stack
- Framework: Next.js 14 (App Router)
- Database: SQLite via Prisma ORM  
- Styling: Tailwind CSS
- Language: TypeScript
- Runtime: Node.js

### External APIs
- AGRC LIR: services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Utah_LIR/FeatureServer/0/query
- Utah County Zoning: maps.utahcounty.gov/arcgis/rest/services/CommunityDev-Fire/CountyZoning_wgs84/MapServer/identify
- Utah County Land Records: utahcounty.gov/LandRecords/Property.asp

### Architecture Pattern (County Adapter)
Each county must implement:
- parcel_api_url
- zoning_api_url  
- land_records_url_template
- auction_date
- auction_format (bid_up | lien)
- parcel_id_format (regex)
- csv_column_mapping
