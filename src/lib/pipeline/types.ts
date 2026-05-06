// Universal Pipeline — Types
// Every property passes through these 6 phases in order.

export const PIPELINE_VERSION = '1.0.0' as const

export type PipelinePhase =
  | 'ingest'
  | 'physical'
  | 'location'
  | 'title'
  | 'gaps'
  | 'score'

export type PhaseStatus = 'ok' | 'partial' | 'skipped' | 'failed'

export interface PhaseResult {
  phase: PipelinePhase
  status: PhaseStatus
  fieldsSet: string[]
  dataGapsRecorded: string[]
  notes: string[]
  durationMs: number
}

export interface PipelineResult {
  propertyId: string
  parcelNumber: string
  county: string
  phases: PhaseResult[]
  totalDurationMs: number
  overallStatus: 'complete' | 'partial' | 'failed'
  investabilityScore: number | null
  recommendationBucket: string | null
  pipelineVersion: string
  isDuplicate: boolean
}

// ─── Data Gap Reasons ────────────────────────────────────────────────────────
// Used to classify WHY a field is missing, not just that it's missing.
// This distinction is what makes gaps actionable.

export type DataGapReason =
  // Level A — auto (should work but failed)
  | 'API_NO_MATCH'           // AGRC/GIS API returned no feature for this parcel
  | 'API_PARCEL_FORMAT'      // Parcel format doesn't match API expectations
  | 'API_ERROR'              // API returned error or timed out
  | 'GEOCODE_FAILED'         // No usable address to geocode
  // Level B — semi-auto (county has a path, needs playbook or adapter work)
  | 'RECORDER_NEEDS_PLAYBOOK'  // County recorder exists online, no adapter yet
  | 'PORTAL_SPECIFIC_FLOW'     // County portal works but needs custom flow
  | 'CSV_MISSING_COLUMN'       // Source CSV didn't include this field
  // Level C — not automatable
  | 'REQUIRES_LOGIN'           // Portal requires authentication
  | 'CAPTCHA_PROTECTED'        // Portal has CAPTCHA / anti-bot
  | 'PDF_UNREADABLE'           // PDF is scanned/image, no text layer
  | 'NO_ONLINE_SOURCE'         // County has no online source for this data
  | 'COUNTY_NOT_CONFIGURED'    // No adapter or config for this county yet

export type AutomationLevel = 'A' | 'B' | 'C'

export const DATA_GAP_LEVELS: Record<DataGapReason, AutomationLevel> = {
  API_NO_MATCH:            'A',
  API_PARCEL_FORMAT:       'A',
  API_ERROR:               'A',
  GEOCODE_FAILED:          'A',
  RECORDER_NEEDS_PLAYBOOK: 'B',
  PORTAL_SPECIFIC_FLOW:    'B',
  CSV_MISSING_COLUMN:      'B',
  REQUIRES_LOGIN:          'C',
  CAPTCHA_PROTECTED:       'C',
  PDF_UNREADABLE:          'C',
  NO_ONLINE_SOURCE:        'C',
  COUNTY_NOT_CONFIGURED:   'C'
}

// ─── County Completeness ─────────────────────────────────────────────────────

export interface CountyCompletenessReport {
  county: string
  totalProperties: number
  completenessScore: number        // 0-100 weighted overall
  physicalCompleteness: number     // year_built, sqft, lot, type
  valuationCompleteness: number    // market_value, assessed_value
  locationCompleteness: number     // lat/lng, address
  titleCompleteness: number        // titleAnalysis or title signals
  automationPotential: number      // % of gaps that are level A or B
  manualPlaybookRequired: boolean  // true if any B-level gaps exist
  grade: 'REFERENCE_QUALITY' | 'INVESTOR_READY' | 'ADVANCED_USABLE' | 'BASIC_USABLE' | 'LIST_IMPORTED'
  gapSummary: {
    levelA: number   // gaps that AGRC/geocoding should fill (retry)
    levelB: number   // gaps needing playbook work
    levelC: number   // structural limits — register and move on
  }
}
