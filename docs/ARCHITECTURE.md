# Architecture - TaxProperty

## System Overview
Single-user Next.js app with SQLite database. No auth currently.
Data flows from CSV import through enrichment pipeline to UI and reports.

## Data Flow
1. CSV Import (/api/import) → parse Utah County CSV → create Property records
2. Scoring Engine (lib/scoring) → calculate opportunity/risk/capital scores → update Property
3. AGRC Enrichment (auto-fill) → pull market value, sqft, year built from AGRC LIR API
4. Zoning Auto-fill (/api/properties/[id]/zoning/auto-fill) → detect city vs unincorporated → query zoning → create ZoningProfile
5. Report Generation (/reports) → fetch properties + zoning → render 5-section report → print

## API Endpoints
- GET /api/properties → list all properties with filters
- GET /api/properties/[id] → single property detail
- POST /api/properties/[id]/zoning → create zoning profile
- PUT /api/properties/[id]/zoning → update zoning profile
- POST /api/properties/[id]/zoning/auto-fill → run automated zoning lookup
- POST /api/import → import CSV file
- GET /api/dashboard → dashboard stats

## Key Files
- src/lib/scoring/ → scoring engine
- src/lib/zoning/utah-county-zones.ts → zone lookup table (20+ zones)
- src/lib/zoning/use-idea-generator.ts → auto-generate use ideas from zone + property type
- src/app/api/properties/[id]/zoning/auto-fill/route.ts → main enrichment logic
- src/components/ZoningAutoFillButton.tsx → UI trigger for auto-fill
- src/app/reports/page.tsx → 5-section printable report
- prisma/schema.prisma → full data model

## County Adapter Interface (Future)
Each county needs: parcel_api_url, zoning_api_url, land_records_url_template,
auction_date, parcel_id_format, csv_column_mapping

## External Dependencies
- AGRC LIR API (Utah parcel data - public, no auth)
- Utah County Zoning Identify (public GIS service)
- Utah County Land Records (manual verification URLs only)
