# Pipeline Architecture

## Overview

The TaxProperty Pipeline is a 6-phase universal enrichment system that every property must pass through. It ensures consistent data quality, tracks structural gaps, and provides clear automation levels for each data source.

## Philosophy

- **Universal Application**: Every property passes through all 6 phases, regardless of county or data source.
- **Explicit Gaps**: If data can't be filled, a DataGap is recorded with reason and automation level (A/B/C).
- **Idempotency**: Safe to re-run multiple times; tracks progress and prevents duplicate active runs.
- **County Completeness**: Each county has a measurable completeness score and production-readiness status.

## 6-Phase Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   ingest    │────▶│   physical   │────▶│   location   │
│  BaseRow    │     │  Physical    │     │   Location   │
└─────────────┘     └──────────────┘     └──────────────┘
                                                    │
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│    score    │◀────│     gaps     │◀────│    title     │
│    Score    │     │  Resolve     │     │   Title      │
└─────────────┘     └──────────────┘     └──────────────┘
```

### Phase 1: ingestBaseRow

**Purpose**: Transform raw county data (CSV/import) into a Property record.

**Inputs**: CSV row, county config
**Outputs**: Property record with normalized parcel, address, and owner data

**DataGaps**:
- `CSV_MISSING_COLUMN`: Required column not in source data
- `COUNTY_NOT_CONFIGURED`: No adapter exists for this county
- `PARCEL_FORMAT_MISMATCH`: Parcel doesn't match expected format

**Endpoint**: `POST /api/pipeline/run` with phases=['ingest']

### Phase 2: enrichPhysicalAndValue

**Purpose**: Populate physical characteristics and valuation data.

**Sources**:
1. AGRC LIR API (Level A - automatic for all Utah counties)
2. Assessor portal scraping (Level B - playbook required)
3. Manual entry (Level C)

**Fields Populated**:
- `estimated_market_value`
- `assessed_value`
- `building_sqft`
- `year_built`
- `lot_size_sqft`
- `property_type`

**DataGaps**:
- `API_NO_MATCH`: Parcel not found in AGRC
- `API_PARCEL_FORMAT`: Format mismatch with API expectations
- `NO_MARKET_VALUE`: AGRC returns null (common for tax-delinquent)
- `ASSESSOR_PORTAL_REQUIRED`: Needs manual playbook

### Phase 3: enrichLocation

**Purpose**: Enrich coordinates and images.

**Sources**:
1. AGRC polygon centroid (from Phase 2)
2. Google Geocoding API (fallback)
3. Street View / Aerial images (Google Maps)

**Fields Populated**:
- `latitude`, `longitude`
- `photo_url` (Street View)
- `aerial_url` (Satellite)
- `jurisdiction` (city/unincorporated)

**DataGaps**:
- `GEOCODE_FAILED`: Address not geocodable
- `STREET_VIEW_UNAVAILABLE`: No Street View coverage

### Phase 4: enrichTitleSignals

**Purpose**: Extract basic title signals from county recorders.

**Two-Tier Architecture**:
- **Basic Title Signals**: Automated scraping (this phase)
- **Full Title Analysis**: Manual/OCR analysis (separate process)

**Automation Levels by County**:

| County | Level | Status | Implementation |
|--------|-------|--------|----------------|
| Utah | A | ✅ Active | `scrapeUtahCountyRecorder()` |
| Salt Lake | B | 📋 Playbook | Documented, not implemented |
| Davis | B | 📋 Playbook | Documented, not implemented |
| Weber | B | 📋 Playbook | Documented, not implemented |
| Tooele | B | 📋 Playbook | Documented, not implemented |
| Rich | C | ❌ Manual | No online recorder |

**DataGaps**:
- `RECORDER_NEEDS_PLAYBOOK`: Portal exists, scraper pending
- `NO_ONLINE_SOURCE`: No online recorder

### Phase 5: resolveDataGaps

**Purpose**: Attempt to resolve auto-fixable gaps.

**Level A (Auto-Resolvable)**:
- `API_ERROR`: Retry with backoff
- `GEOCODE_FAILED`: Try alternative address

**Level B (Playbook-Based)**:
- `RECORDER_NEEDS_PLAYBOOK`: Apply county-specific playbook if available

**Level C (Not Auto-Resolvable)**:
- Mark as requiring manual intervention
- Generate task queue entry

### Phase 6: scoreV2

**Purpose**: Calculate final V1 and V2 scores.

**Scoring**:
- V1: opportunity_score, risk_score, final_score, recommendation
- V2: investability_score, title_score_v2, confidence_score_v2, recommendation_bucket

**Data Gap Impact**:
- Critical gaps reduce `confidence_score_v2`
- Title gaps limit `recommendation_bucket` to RESEARCH max

## DataGap System

Every missing field is recorded as a DataGap with:

```typescript
{
  property_id: string
  phase: 'physical' | 'valuation' | 'location' | 'title' | 'zoning'
  field: string           // e.g., 'year_built'
  reason: DataGapReason   // Why it's missing
  level: 'A' | 'B' | 'C'  // Automation level
  source_hint: string     // Human-readable next step
  resolved: boolean
  resolved_at?: Date
  resolved_by?: 'pipeline' | 'manual'
}
```

### Automation Levels

**Level A - Automatic**:
Should work but failed (retryable).
- `API_NO_MATCH`
- `API_PARCEL_FORMAT`
- `API_ERROR`
- `GEOCODE_FAILED`

**Level B - Semi-Automatic**:
County has path but needs playbook/adapter work.
- `RECORDER_NEEDS_PLAYBOOK`
- `PORTAL_SPECIFIC_FLOW`
- `CSV_MISSING_COLUMN`

**Level C - Not Automatable**:
Structural limitation.
- `REQUIRES_LOGIN`
- `CAPTCHA_PROTECTED`
- `PDF_UNREADABLE`
- `NO_ONLINE_SOURCE`
- `COUNTY_NOT_CONFIGURED`

## County Completeness Framework

### Metrics Calculated

| Dimension | Weight | Calculation |
|-----------|--------|-------------|
| physical_completeness | 20% | % with year_built, building_sqft, lot_size_sqft |
| valuation_completeness | 25% | % with estimated_market_value |
| location_completeness | 25% | % with lat/lng, photo_url |
| title_completeness | 30% | % with title_signals |
| **completeness_score** | 100% | Weighted average |

### Status Levels

**Production Ready** (status='production'):
- completeness_score >= 85
- physical_completeness >= 50
- valuation_completeness >= 50
- location_completeness >= 50
- title_completeness >= 50

**Beta** (status='beta'):
- completeness_score >= 60
- valuation_completeness >= 50
- location_completeness >= 80

**Alpha** (status='alpha'):
- completeness_score >= 40

**Pending** (status='pending'):
- completeness_score < 40

### API

```bash
# Get all counties
GET /api/counties/completeness-report

# Get specific county
GET /api/counties/completeness-report?county=utah

# Refresh calculations
GET /api/counties/completeness-report?refresh=true
```

## API Endpoints

### Pipeline Execution

```bash
# Run full pipeline for single property
POST /api/pipeline/run
Body: { propertyId: string, phases?: string[], force?: boolean }

# Batch pipeline
POST /api/pipeline/batch
Body: { propertyIds: string[], phases?: string[], force?: boolean }

# County enrichment (uses pipeline)
POST /api/counties/{name}/enrich-all

# Resume incomplete runs
POST /api/pipeline/resume
```

### Data Gaps

```bash
# List gaps
GET /api/data-gaps?county=utah&status=open&level=A

# Create gap
POST /api/data-gaps
Body: { property_id, phase, field, reason, level, source_hint }

# Resolve gap
PATCH /api/data-gaps/{id}
Body: { resolved: true, resolved_by: 'manual' }
```

## Database Schema

### PipelineRun

Tracks execution of pipeline for each property.

```prisma
model PipelineRun {
  id                    String   @id @default(uuid())
  property_id           String
  pipeline_version      String   // e.g., "1.0.0"
  county                String
  phases_requested      String   // JSON array
  phases_completed      String?  // JSON array
  current_phase         String?
  status                String   // running | completed | failed
  started_at            DateTime @default(now())
  completed_at          DateTime?
  duration_ms           Int?
  investability_score   Float?
  recommendation_bucket String?
  error_message         String?
}
```

### TitleSignals

Stores automated title scraping results.

```prisma
model TitleSignals {
  id                    String   @id @default(uuid())
  property_id           String   @unique
  has_deed_records      Boolean?
  document_count_5yr    Int?
  last_transfer_date    DateTime?
  last_transfer_type    String?
  mortgage_docs_found   Int?
  lien_docs_found       Int?
  release_docs_found    Int?
  red_flags_count       Int      @default(0)
  yellow_flags_count    Int      @default(0)
  data_source           String   // "utah_county_recorder"
  scraped_at            DateTime @default(now())
}
```

### CountyConfig Extensions

```prisma
model CountyConfig {
  // ... existing fields ...

  // Completeness tracking
  total_properties          Int       @default(0)
  completeness_score        Float?
  physical_completeness     Float?
  valuation_completeness    Float?
  location_completeness     Float?
  title_completeness        Float?

  // Automation metadata
  automation_potential      String    @default("unknown")
  manual_playbook_required  Boolean   @default(false)

  // Status
  status                    String    @default("pending")
  last_completeness_check   DateTime?
}
```

## Scripts

### Backfill Pipeline

```bash
# All properties
npx ts-node scripts/backfill-pipeline.ts

# Specific county
npx ts-node scripts/backfill-pipeline.ts --county=utah

# Dry run
npx ts-node scripts/backfill-pipeline.ts --dry-run

# Custom batch size
npx ts-node scripts/backfill-pipeline.ts --batch-size=100
```

### Backfill Utah Title Signals

```bash
npx ts-node scripts/backfill-utah-title-signals.ts
```

## Adding a New County

1. **Create County Adapter** (`src/lib/counties/adapters/{county}.ts`)
2. **Test AGRC LIR** (Level A enrichment should work automatically)
3. **Assess Recorder** for title signals:
   - Level A: Direct URL pattern
   - Level B: Portal requires playbook
   - Level C: No online source
4. **Document in Playbook** (`docs/playbooks/{county}-recorder.md`)
5. **Run Enrichment** via `/api/counties/{name}/enrich-all`
6. **Check Completeness** via dashboard

## Troubleshooting

### Stale Pipeline Runs

If a run is stuck in `running` status for >5 minutes, it's automatically marked as failed on next execution attempt.

### Duplicate Prevention

The orchestrator checks for:
- Active runs (same property + version + status=running)
- Recent completed runs (within 24h, unless force=true)

### Rate Limiting

All scrapers include delays:
- Between API calls: 100ms
- Between title scraper calls: 500ms
- Between batches: 1s

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-05-04 | 0_init | Baseline existing database |
| 2026-05-04 | add_pipeline_run_completeness_titlesignals | Pipeline infrastructure |
