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
