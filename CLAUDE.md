# TaxProperty - CLAUDE.md

## What This Is
Tax sale property investment intelligence platform.
Currently supports Utah County. Expanding to all USA counties.

## Docs to Read First
- /docs/PROJECT_SPEC.md - Full product vision and milestones
- /docs/ARCHITECTURE.md - System design and data flow
- /docs/PROJECT_STATUS.md - Current status and what to build next
- /docs/COUNTY_EXPANSION.md - How to add new counties

## Tech Stack
- Next.js 14 App Router + TypeScript
- Prisma + SQLite (prisma/dev.db)
- Tailwind CSS
- Key APIs: AGRC LIR, Utah County GIS Zoning Identify

## Project Rules
- NEVER delete real property data without explicit confirmation
- NEVER push directly to main branch
- ALWAYS use environment variables for secrets
- Parcel number format is always NN:NNN:NNNN for Utah County
- 127 real Utah County 2026 properties are in the database - protect them
- When adding counties, always use the county adapter pattern

## Key Commands
- npm run dev → start dev server (port 3000)
- npx prisma studio → browse database visually
- npx prisma db push → push schema changes
- npx prisma db push --accept-data-loss → force schema changes
- sqlite3 prisma/dev.db → direct DB access

## Database Models
- Property → main parcel data + scores
- ZoningProfile → zoning data per property (1:1)
- Source → external data sources per property
- Outcome → auction result tracking

## Auto-fill Pipeline
CSV Import → Scoring Engine → AGRC Enrichment → Zoning Auto-fill → Report

## Important Decisions Made
- City properties (102/127) get planning dept guidance, not live zoning
- Unincorporated properties (25/127) get real zone codes from Utah County GIS
- Micro-parcel penalty NOT YET IMPLEMENTED (GitHub issue exists)
- BRMK Provo Canyon LLC parcels flagged as hillside/avoid

---

## Adding a New Utah County (Quick Guide)

### What you need from the county:
1. Tax sale list (CSV/spreadsheet/PDF)
2. Auction date and platform
3. Land records URL (for title research)

### What's automatic (same for ALL Utah counties):
- **Market value, building data**: AGRC LIR API (auto, no setup needed)
- **Coordinates**: AGRC or geocoding
- **Scoring**: same engine
- **Report generation**: same template

### Steps to add a county:
1. Get their tax sale CSV
2. Go to `/import`, select county, upload CSV
3. Confirm column mapping in the wizard
4. Click "Auto-Enrich All"
5. Done - all features work immediately

### AGRC endpoint pattern:
```
https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_[CountyName]_LIR/FeatureServer/0/query
```

### County name formats for AGRC:
Utah, Tooele, SaltLake, Davis, Weber, Washington, Cache, Summit, Iron, BoxElder, etc.

### Column Detection:
The import wizard auto-detects columns from ANY county CSV:
- Parcel number: "parcel number", "serial number", "account number", "tax id", "pin", "apn"
- Owner: "name", "owner", "taxpayer", "grantee"
- Amount due: "estimated starting bid", "total due", "amount due", "starting bid"
- Address: "address", "property address", "situs", "location"
- Legal description: "legal", "legal description", "taxing description"

### Currently Supported (29 Utah counties):
| County | Status | Properties |
|--------|--------|------------|
| Utah | Active | 127 |
| Tooele | Active | 29 |
| All others | Pending | - |

### To activate a county:
```bash
# County is already in database with AGRC endpoint
# Just import their tax sale CSV via /import page
# Then run: curl -X POST http://localhost:3000/api/counties/[name]/enrich-all
```
