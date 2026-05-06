// Experimental County Helpers
// Future utilities for county onboarding and normalization
// NOT FOR LAUNCH - Research and experimentation only

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '@/lib/counties/types'

// ============================================================================
// ADAPTER TEMPLATES
// ============================================================================

/**
 * Creates a skeleton county adapter with default implementations.
 * Use this as a starting point when adding new counties.
 */
export function createCountyAdapterTemplate(countyId: string, countyName: string, state: string): CountyAdapter {
  return {
    id: countyId as any,
    name: countyName,
    state,
    readiness: {
      status: 'PLANNED',
      propertyCount: 0,
      adapterExists: false,
      hasEnrichment: false,
      dataGaps: ['Adapter template only - implementation needed']
    },

    importConfig: {
      sourceType: 'csv',
      expectedColumns: ['parcel_number', 'address', 'owner_name', 'amount_due'],
      columnMapping: {
        'parcel_number': 'parcel_number',
        'address': 'property_address',
        'owner_name': 'owner_name',
        'amount_due': 'total_amount_due'
      }
    },

    async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
      return {
        confidence: 0,
        notes: `County adapter not yet implemented for ${countyName}`,
        data_source: 'None'
      }
    },

    makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
      return {
        recorderUrl: undefined,
        assessorUrl: undefined,
        auctionInfoUrl: undefined
      }
    },

    getRiskFactors(): CountyRiskFactors {
      return {
        critical: ['Tax sale property - due diligence required'],
        warnings: [],
        notes: []
      }
    },

    formatParcelNumber(parcel: string): string {
      return parcel.trim()
    },

    isValidParcel(parcel: string): boolean {
      return parcel.length > 0
    }
  }
}

// ============================================================================
// COLUMN DETECTION HELPERS
// ============================================================================

export type ColumnPattern = {
  field: string
  patterns: string[]
  required: boolean
  transform?: (value: string) => string | number | null
}

/**
 * Common column name patterns across different counties.
 * Used for auto-detection in import wizard.
 */
export const COMMON_COLUMN_PATTERNS: ColumnPattern[] = [
  {
    field: 'parcel_number',
    patterns: [
      'parcel', 'parcel number', 'serial number', 'account number',
      'tax id', 'pin', 'apn', 'parcel_id', 'tax parcel', 'property id',
      'property number', 'assessor parcel', 'map number', 'parcel no'
    ],
    required: true
  },
  {
    field: 'owner_name',
    patterns: [
      'owner', 'name', 'taxpayer', 'grantee', 'owner name',
      'taxpayer name', 'property owner', 'deeded owner', 'record owner'
    ],
    required: true
  },
  {
    field: 'total_amount_due',
    patterns: [
      'amount due', 'total due', 'starting bid', 'estimated starting bid',
      'minimum bid', 'opening bid', 'tax due', 'balance due',
      'total amount', 'delinquent tax', 'sale amount'
    ],
    required: true,
    transform: (v) => {
      const num = parseFloat(v.replace(/[$,]/g, ''))
      return isNaN(num) ? null : num
    }
  },
  {
    field: 'property_address',
    patterns: [
      'address', 'property address', 'situs', 'location', 'street address',
      'property location', 'site address', 'physical address'
    ],
    required: false
  },
  {
    field: 'legal_description',
    patterns: [
      'legal', 'legal description', 'taxing description', 'subdivision',
      'lot', 'block', 'tract', 'description'
    ],
    required: false
  },
  {
    field: 'city',
    patterns: [
      'city', 'municipality', 'town'
    ],
    required: false
  },
  {
    field: 'property_type',
    patterns: [
      'type', 'property type', 'use', 'property use', 'zoning',
      'classification', 'land use'
    ],
    required: false
  }
]

/**
 * Attempts to auto-detect column mappings from CSV headers.
 * Returns a mapping object: { appField: csvHeader }
 */
export function detectColumnMappings(
  csvHeaders: string[]
): Record<string, string> {
  const mappings: Record<string, string> = {}
  const normalizedHeaders = csvHeaders.map(h => h.toLowerCase().trim())

  for (const pattern of COMMON_COLUMN_PATTERNS) {
    for (const header of normalizedHeaders) {
      if (pattern.patterns.some(p => header.includes(p))) {
        const originalHeader = csvHeaders[normalizedHeaders.indexOf(header)]
        mappings[pattern.field] = originalHeader
        break
      }
    }
  }

  return mappings
}

// ============================================================================
// PARCEL NUMBER NORMALIZATION
// ============================================================================

/**
 * Normalizes parcel numbers to various formats.
 * Different counties use different conventions.
 */
export const ParcelFormat = {
  // Utah County: 01:002:0003 (NN:NNN:NNNN)
  utah(parcel: string): string {
    const digits = parcel.replace(/\D/g, '')
    if (digits.length !== 10) return parcel
    return `${digits.slice(0, 2)}:${digits.slice(2, 5)}:${digits.slice(5, 10)}`
  },

  // Tooele County: 13-050-0-0014 (NN-NNN-N-NNNN)
  tooele(parcel: string): string {
    const digits = parcel.replace(/\D/g, '')
    if (digits.length < 10) return parcel
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 6)}-${digits.slice(6, 10)}`
  },

  // Salt Lake: 22-11-1234-567 (NN-NN-NNNN-NNN)
  saltLake(parcel: string): string {
    const digits = parcel.replace(/\D/g, '')
    if (digits.length < 13) return parcel
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 11)}`
  },

  // Davis: Various formats, often with leading zeros
  davis(parcel: string): string {
    return parcel.replace(/\D/g, '').padStart(13, '0')
  },

  // Generic: Remove all non-digits
  digitsOnly(parcel: string): string {
    return parcel.replace(/\D/g, '')
  },

  // Generic: Strip spaces and normalize
  clean(parcel: string): string {
    return parcel.trim().replace(/\s+/g, ' ')
  }
}

/**
 * Detects likely parcel format based on pattern.
 * Returns the county ID or 'unknown'.
 */
export function detectParcelFormat(parcel: string): string {
  const digits = parcel.replace(/\D/g, '')

  // Utah County: 10 digits
  if (/^\d{2}:\d{3}:\d{5}$/.test(parcel) || digits.length === 10) {
    return 'utah'
  }

  // Tooele: 10-12 digits, often with dashes
  if (/^\d{2}-\d{3}-\d-\d{4}$/.test(parcel) || (digits.length >= 10 && digits.length <= 12)) {
    return 'tooele'
  }

  // Salt Lake: 13 digits
  if (/^\d{2}-\d{2}-\d{4}-\d{3}$/.test(parcel) || digits.length === 13) {
    return 'salt_lake'
  }

  // Davis: 12-13 digits
  if (digits.length >= 12 && digits.length <= 13) {
    return 'davis'
  }

  return 'unknown'
}

// ============================================================================
// AGRC ENDPOINT BUILDER
// ============================================================================

/**
 * AGRC (Utah Automated Geographic Reference Center) provides
 * parcel data for all Utah counties. This helper builds the correct
 * endpoint URLs for each county.
 */
export const AgrcEndpoints = {
  baseUrl: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services',

  /**
   * Returns the LIR (Land Information Record) endpoint for a county.
   * LIR contains: market value, building sqft, year built, acres, etc.
   */
  lir(countyName: string): string {
    // AGRC uses specific naming conventions
    const countyMapping: Record<string, string> = {
      'utah': 'Utah',
      'tooele': 'Tooele',
      'salt_lake': 'SaltLake',
      'davis': 'Davis',
      'weber': 'Weber',
      'washington': 'Washington',
      'cache': 'Cache',
      'summit': 'Summit',
      'iron': 'Iron',
      'box_elder': 'BoxElder',
      'sanpete': 'Sanpete',
      'sevier': 'Sevier',
      'uintah': 'Uintah',
      'wasatch': 'Wasatch',
      'carbon': 'Carbon',
      'grand': 'Grand',
      'juab': 'Juab',
      'millard': 'Millard',
      'san_juan': 'SanJuan',
      'morgan': 'Morgan',
      'rich': 'Rich',
      'kane': 'Kane',
      'garfield': 'Garfield',
      'emery': 'Emery',
      'duchesne': 'Duchesne',
      'daggett': 'Daggett',
      'beaver': 'Beaver',
      'piute': 'Piute',
      'wayne': 'Wayne'
    }

    const normalized = countyName.toLowerCase().replace(/\s+/g, '_')
    const agrcName = countyMapping[normalized] ||
      normalized.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')

    return `${this.baseUrl}/Parcels_${agrcName}_LIR/FeatureServer/0`
  },

  /**
   * Builds a query URL for a specific parcel.
   */
  queryUrl(countyName: string, parcelId: string, fields: string[] = ['*']): string {
    const base = this.lir(countyName)
    const where = encodeURIComponent(`PARCEL_ID='${parcelId}'`)
    const outFields = fields.join(',')
    return `${base}/query?where=${where}&outFields=${outFields}&returnGeometry=false&f=json`
  }
}

// ============================================================================
// COUNTY ONBOARDING CHECKLIST
// ============================================================================

export interface CountyOnboardingChecklist {
  county: string
  state: string

  // Data Sources
  hasTaxSaleList: boolean
  taxSaleFormat: 'csv' | 'pdf' | 'excel' | 'html' | 'api' | 'unknown'
  hasParcelData: boolean
  parcelDataSource: 'agrc' | 'county_api' | 'manual' | 'unknown'

  // Enrichment
  agrcSupported: boolean
  hasOnlineRecorder: boolean
  recorderUrl: string | null
  hasOnlineAssessor: boolean
  assessorUrl: string | null

  // Auction Details
  auctionPlatform: string | null
  depositRequirement: string | null
  redemptionPeriod: string | null

  // Testing
  testParcel: string | null
  testResults: {
    enrichment: boolean
    geocoding: boolean
    links: boolean
  }
}

/**
 * Generates an onboarding checklist for a new county.
 * This is used to track progress when adding support.
 */
export function createOnboardingChecklist(county: string, state: string = 'Utah'): CountyOnboardingChecklist {
  return {
    county,
    state,
    hasTaxSaleList: false,
    taxSaleFormat: 'unknown',
    hasParcelData: false,
    parcelDataSource: 'unknown',
    agrcSupported: AgrcEndpoints.lir(county).includes('Parcels_'),
    hasOnlineRecorder: false,
    recorderUrl: null,
    hasOnlineAssessor: false,
    assessorUrl: null,
    auctionPlatform: null,
    depositRequirement: null,
    redemptionPeriod: null,
    testParcel: null,
    testResults: {
      enrichment: false,
      geocoding: false,
      links: false
    }
  }
}

// ============================================================================
// STATE EXPANSION TEMPLATES
// ============================================================================

/**
 * Template for adding counties from new states.
 * Each state has different data standards.
 */
export const StateTemplates: Record<string, {
  parcelFormat: string
  commonDataSources: string[]
  recorderType: 'county' | 'state' | 'mixed'
  notes: string
}> = {
  'Arizona': {
    parcelFormat: 'Book-Map-Parcel-Sub (e.g., 123-45-678-A)',
    commonDataSources: ['County Assessor', 'Arizona State Land Department'],
    recorderType: 'county',
    notes: 'Tax lien state (not deed). Different process than Utah.'
  },
  'Colorado': {
    parcelFormat: 'Schedule-Block-Lot (varies by county)',
    commonDataSources: ['County Assessor', 'County Treasurer'],
    recorderType: 'county',
    notes: 'Tax lien certificates, redeemable for 3 years.'
  },
  'Nevada': {
    parcelFormat: 'Assessor Parcel Number (APN) - varies',
    commonDataSources: ['County Assessor', 'Nevada Tax Sale'],
    recorderType: 'county',
    notes: 'Online auctions common. Some counties use Auction.com'
  },
  'Idaho': {
    parcelFormat: 'Tax ID Number (varies by county)',
    commonDataSources: ['County Assessor', 'County Treasurer'],
    recorderType: 'county',
    notes: 'Tax deed state. Process similar to Utah.'
  },
  'Wyoming': {
    parcelFormat: 'Parcel Number (varies)',
    commonDataSources: ['County Assessor'],
    recorderType: 'county',
    notes: 'Tax lien state. Limited online data in rural counties.'
  }
}

// ============================================================================
// EXPERIMENTAL: ML-BASED COLUMN DETECTION
// ============================================================================

/**
 * FUTURE: Use simple heuristics or ML to detect column types.
 * For now, this uses string similarity.
 */
export function fuzzyColumnMatch(
  header: string,
  patterns: string[],
  threshold: number = 0.6
): boolean {
  const normalized = header.toLowerCase().trim()

  for (const pattern of patterns) {
    // Exact match
    if (normalized === pattern) return true

    // Contains
    if (normalized.includes(pattern)) return true

    // Jaccard similarity for typos
    const similarity = jaccardSimilarity(normalized, pattern)
    if (similarity >= threshold) return true
  }

  return false
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''))
  const setB = new Set(b.split(''))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createCountyAdapterTemplate,
  detectColumnMappings,
  ParcelFormat,
  detectParcelFormat,
  AgrcEndpoints,
  createOnboardingChecklist,
  StateTemplates,
  fuzzyColumnMatch
}
