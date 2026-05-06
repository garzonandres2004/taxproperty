# MASTER_BLUEPRINT.md

## Project Vision

Build a **tax sale property research platform** that can ingest county tax sale lists, normalize them, enrich each property with public-record data, and present a complete investor-grade property view.

The long-term goal is:
1. **Utah full coverage first** — all Utah counties, as complete as possible.
2. **Multi-state expansion second** — other US states with tax deed, tax lien, or hybrid systems.
3. **Same final experience everywhere** — photos, Google Maps, parcel/location data, title/recorder links, tax history access, zoning guidance, scoring, and investor reports.

Utah County is the current reference implementation ("gold standard" county).

---

## Product Standard

A county is not considered "complete" just because the auction list is imported.

A **complete property experience** means each property should have, whenever possible:

1. Auction list data
2. Parcel / tax ID normalized
3. Situs or usable address
4. County + state metadata
5. Geocoded coordinates
6. Google Maps + Street View / image experience
7. Assessor / parcel data (market value, acreage, year built, building sqft if available)
8. Recorder / title chain links
9. Tax history access or extracted signals
10. Zoning / jurisdiction / planning guidance
11. Scoring and recommendation
12. Report-ready structured data

If a county cannot fully automate one layer, the UI must still show:
- what is missing,
- what source to check,
- and the manual next step.

No silent gaps.

---

## Core Principles

1. **County-specific input, standard output**
   - Every county publishes data differently.
   - Our system must normalize different inputs into one standard property schema.

2. **Adapters, not hacks**
   - Never hard-code county logic directly into pages.
   - Use reusable county adapters.

3. **Completeness over raw breadth**
   - Utah counties should be integrated to a high standard before broad national expansion.

4. **Traceable data**
   - Keep source URLs, source type, import date, and confidence notes.
   - We need to know where each field came from.

5. **Human-auditable**
   - Every automated field should be inspectable and, when needed, editable manually.

---

## Technical Stack

### Frontend / App
- Next.js
- TypeScript
- Tailwind / existing UI system
- Server actions or API routes where appropriate

### Database
- Prisma ORM
- Preferred long-term DB: PostgreSQL
- SQLite acceptable only for local prototyping

### Data / Enrichment
- Node scripts for ingestion
- Python scripts optional for PDF parsing / OCR / data cleanup
- Google Maps / Street View for visual and mapping layer
- Playwright for difficult public portals
- Firecrawl for public web extraction where useful

### AI Workflow
- Claude Code as implementation lead
- Perplexity as: idea recorder, architect, research strategist, blueprint writer, QA thought partner

---

## System Architecture

The platform should be organized into 5 major layers:

### 1. Source Discovery Layer
Purpose: identify official county sources (auction list, assessor, recorder, tax history, GIS/zoning, planning)

Artifacts: county registry, source notes, source URLs, source confidence

### 2. Ingestion Layer
Purpose: take raw county lists in any format (CSV, XLSX, Google Sheet, PDF, HTML, API) and normalize into standard schema

Output: canonical `PropertyImportRow[]`

### 3. Enrichment Layer
Purpose: fill missing fields after import (address cleanup, geocoding, assessor values, building data, title/recorder links, zoning guidance, tax history)

Output: enhanced property record, zoning profile, external links, data confidence flags

### 4. Scoring Layer
Purpose: apply scoring and ranking logic consistently across counties

Important: County adapters should not break the shared scoring engine.

### 5. Presentation Layer
Purpose: dashboard, property table, property detail page, investor report, county/state selectors, filters and personalized ranking

---

## Data Model Direction

### Core entities

#### Property
- id, state, county, countyId, parcelNumber, alternateParcelNumber
- propertyAddress, city, zip, ownerName, mailingAddress, legalDescription
- amountDue, openingBid, auctionDate, saleType, propertyType
- acreage, lotSizeSqft, estimatedMarketValue, landMarketValue, buildingSqft, yearBuilt
- latitude, longitude
- assessorUrl, recorderUrl, taxHistoryUrl, auctionSourceUrl
- sourceFormat, sourceImportedAt, dataConfidence, status
- recommendation, oppScore, riskScore, finalScore, maxBid
- absenteeOwner, microParcel, assemblageOpportunity

#### ZoningProfile
- propertyId, jurisdiction, isUnincorporated, zoningCode, zoningName
- landUseDesignation, permittedUses, conditionalUses, prohibitedUses
- minLotSize, setbacks, maxHeight, accessType, utilitiesStatus
- slopePercent, buildabilityScore, buildabilityNotes, bestUseIdeas
- nextSteps, planningUrl, sourceNotes

#### ExternalLinkSet
- propertyId, assessorUrl, recorderUrl, taxHistoryUrl, parcelMapUrl, auctionInfoUrl, zoningMapUrl

#### CountySourceRegistry
- id, state, county, saleType
- auctionListUrl, auctionListFormat, assessorUrl, recorderUrl, taxHistoryUrl, gisUrl, zoningUrl, planningUrl
- notes, requiresLogin, automationLevel, completenessStatus

#### ImportRun
- id, countyId, sourceUrl, sourceFormat, runDate, successCount, errorCount, notes

---

## Standard Property Schema

Every imported county list should be normalized to this intermediate schema before entering the DB:

```ts
type StandardPropertyRow = {
  state: string
  county: string
  parcelNumber: string
  propertyAddress?: string
  city?: string
  zip?: string
  ownerName?: string
  mailingAddress?: string
  legalDescription?: string
  amountDue?: number
  openingBid?: number
  auctionDate?: string
  saleType?: 'tax_deed' | 'tax_lien' | 'hybrid'
  acreage?: number
  propertyType?: string
  sourceUrl?: string
  sourceFormat?: 'csv' | 'xlsx' | 'google_sheet' | 'pdf' | 'html' | 'api'
}
```

All county-specific parsers must output this schema first.

---

## County Adapter Architecture

Each county gets an adapter.

### Interface

```ts
type CountyId = `${string}-${string}`

interface CountyAdapter {
  id: CountyId
  state: string
  county: string
  saleTypes: ('tax_deed' | 'tax_lien' | 'hybrid')[]
  importConfig: {
    sourceType: 'csv' | 'xlsx' | 'google_sheet' | 'pdf' | 'html' | 'api'
    sourceUrl?: string
    notes?: string
  }

  mapRawRowToStandard(row: unknown): StandardPropertyRow

  enrichProperty?: (property: Property) => Promise<Partial<Property>>

  buildExternalLinks?: (property: Property) => {
    assessorUrl?: string
    recorderUrl?: string
    taxHistoryUrl?: string
    auctionInfoUrl?: string
    parcelMapUrl?: string
    zoningMapUrl?: string
    planningUrl?: string
  }
}
```

### Rules
- Pages should never hard-code county-specific logic.
- All county-specific import and enrichment goes through adapters.
- Utah County becomes the reference adapter.
- Tooele, Rich, Sanpete come next.

---

## Folder Structure Target

```
src/
  app/
    dashboard/
    properties/
    reports/
    settings/
    api/
      counties/
      properties/
      imports/
      enrichment/
  components/
    property/
    reports/
    counties/
    zoning/
    images/
  lib/
    counties/
      index.ts
      types.ts
      utah.ts
      tooele.ts
      rich.ts
      sanpete.ts
    scoring/
    enrichment/
      geocoding.ts
      assessor.ts
      zoning.ts
      links.ts
      tax-history.ts
    imports/
      csv.ts
      pdf.ts
      html.ts
      google-sheet.ts
    schemas/
    utils/

scripts/
  import-utah-county.ts
  import-tooele-county.ts
  import-rich-county.ts
  import-sanpete-county.ts
  enrich-county.ts
  audit-county.ts

data/
  raw/
  normalized/
  reference/

docs/
  MASTER_BLUEPRINT.md
  COUNTY_STANDARD.md
  COUNTY_REGISTRY.md
  CLAUDE_WORKFLOW.md
  COUNTY_COMPLETENESS_CHECKLIST.md
  ROADMAP.md
```

---

## County Completeness System

### Status labels
- `NOT_STARTED`
- `LIST_IMPORTED`
- `BASIC_USABLE`
- `ADVANCED_USABLE`
- `INVESTOR_READY`
- `REFERENCE_QUALITY`

Target:
- Utah County = `REFERENCE_QUALITY`
- Utah statewide counties = at least `ADVANCED_USABLE`, ideally `INVESTOR_READY`

---

## Development Phases

### Phase 1 — Stabilize Utah County as Reference
- Extract shared property schema
- Extract shared enrichment helpers
- Extract county adapter interface
- Document Utah County flow from source to report

### Phase 2 — Build Utah Multi-County Infrastructure
- County registry
- County selector in dashboard/properties
- Property filtering by county
- Import pipeline abstraction
- External links abstraction

### Phase 3 — Add Tooele, Rich, Sanpete
Why these:
- Tooele = Google Sheet / portal style
- Rich = PDF style
- Sanpete = another distinct county pattern

Tasks for each county:
1. source discovery
2. adapter creation
3. import script
4. assessor/parcel path
5. maps/photo enablement
6. recorder/tax link enablement
7. zoning/planning path
8. QA on 5–10 real properties

### Phase 4 — Complete Utah Statewide Coverage

### Phase 5 — Expand to Other States
First classify target states by: tax deed / tax lien / hybrid / source availability / recorder ecosystem / assessor ecosystem

---

## Prompt Templates for Claude Code

### Prompt 1 — Extract architecture
"Refactor the current Utah County implementation into reusable multi-county architecture without changing behavior. Create a county adapter interface, move Utah-specific logic into a Utah adapter, and keep the UI working exactly as it does today."

### Prompt 2 — Onboard a county
"Research and scaffold support for [COUNTY, STATE]. Identify official sources for auction list, assessor, recorder, tax history, GIS/zoning, and planning. Create/update COUNTY_REGISTRY.md and scaffold a county adapter with placeholders where automation is not yet available."

### Prompt 3 — Build an importer
"Create an import pipeline for [COUNTY] using the attached source file/URL. Normalize all rows into StandardPropertyRow and then insert/update Property records with county metadata."

### Prompt 4 — Enable complete property experience
"For [COUNTY], wire up all generic features that should work once address/coords are available: photos, Google Maps, property detail links, score rendering, budget sorting, and report support."

### Prompt 5 — Run QA
"Audit [COUNTY] across 10 real properties. Verify address quality, photos, maps, recorder links, tax history links, zoning messaging, scoring output, and report readiness. Return a county completeness report with blockers."

---

## First 30-Day Execution Plan

### Week 1
- Freeze Utah County as reference implementation
- Document current working flow
- Create county adapter architecture
- Create county registry docs

### Week 2
- Integrate Tooele through the new architecture
- Make generic features work: maps, photos, recorder links, reports
- Create completeness audit checklist

### Week 3
- Integrate Rich County from PDF source
- Identify Rich assessor/recorder/tax history sources
- QA 5–10 real Rich properties

### Week 4
- Integrate Sanpete
- Refine county registry process
- Run statewide Utah planning pass
- Create backlog for next counties

---

## Definition of Done

A county is "done" only if:
- list imports cleanly
- properties appear correctly in UI
- maps/photos work when possible
- recorder/tax links work
- report renders
- scoring works
- missing layers are clearly labeled
- county completeness report is saved in docs

---

## Immediate Next Actions

1. Refactor Utah County into reusable multi-county architecture.
2. Create docs: COUNTY_STANDARD.md, COUNTY_REGISTRY.md, COUNTY_COMPLETENESS_CHECKLIST.md, CLAUDE_WORKFLOW.md
3. Add Tooele as first non-reference county.
4. Use Rich as first PDF parser county.
5. Build internal county completeness audit process before statewide expansion.
