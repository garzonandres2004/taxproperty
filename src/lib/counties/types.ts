// Multi-County Architecture - Core Types
// Supports Utah County, Tooele County, and future counties (Rich, Sanpete, etc.)

export type CountyId = 'utah' | 'tooele' | 'salt_lake' | 'rich' | 'sanpete' | 'weber' | 'davis' | string

// County Readiness Status - operational state for product use
export type CountyReadinessStatus =
  | 'LIVE'           // Full data available, actively maintained
  | 'NEAR_LIVE'      // Almost-full data with explicit gaps marked
  | 'PARTIAL'        // Preliminary data with known gaps
  | 'PLANNED'        // No fake data, roadmap only

// County Readiness Metadata - for memo engine and UI
export interface CountyReadiness {
  status: CountyReadinessStatus
  propertyCount: number
  adapterExists: boolean
  hasEnrichment: boolean
  dataGaps: string[]      // Explicit gaps for PARTIAL/NEAR_LIVE
  blockedBy?: string[]    // Blockers preventing status promotion
}

// Property data that can be enriched by county adapters
export interface EnrichableProperty {
  id: string
  parcel_number: string
  county: CountyId
  property_address: string | null
  city: string | null
  owner_name: string | null
  assessed_value: number | null
  total_amount_due: number | null
  latitude?: number | null
  longitude?: number | null
  zoning?: string | null
  jurisdiction?: string | null
  estimated_market_value?: number | null
  lot_size_sqft?: number | null
  building_sqft?: number | null
  year_built?: number | null
  legal_description?: string | null
}

// Result of property enrichment
export interface EnrichmentResult {
  estimated_market_value?: number | null
  latitude?: number | null
  longitude?: number | null
  zoning?: string | null
  zoning_description?: string | null
  jurisdiction?: string | null
  jurisdiction_type?: 'city' | 'county' | 'unknown'
  lot_size_sqft?: number | null
  building_sqft?: number | null
  year_built?: number | null
  property_type?: string | null
  // Risk assessment fields (prevent 'unknown' from inflating risk score)
  legal_risk?: 'low' | 'medium' | 'high' | 'unknown'
  access_risk?: 'low' | 'medium' | 'high' | 'unknown'
  title_risk?: 'low' | 'medium' | 'high' | 'unknown'
  marketability_risk?: 'low' | 'medium' | 'high' | 'unknown'
  confidence?: number // 0-100, how confident we are in the data
  notes?: string // e.g., "Manual verification required"
  data_source?: string // e.g., "AGRC LIR", "Zillow API", "County Records"
}

// Normalized Parcel Output - standard format for all counties feeding memo engine
export interface NormalizedParcelOutput {
  // Core identification
  parcel_number: string
  county: CountyId
  county_display_name: string

  // Location
  property_address: string | null
  city: string | null
  state: string
  zip: string | null
  latitude: number | null
  longitude: number | null

  // Ownership
  owner_name: string | null
  owner_mailing_address: string | null

  // Financial
  assessed_value: number | null
  estimated_market_value: number | null
  total_amount_due: number | null

  // Property characteristics
  property_type: string
  lot_size_sqft: number | null
  building_sqft: number | null
  year_built: number | null
  bedrooms: number | null
  bathrooms: number | null

  // Zoning & jurisdiction
  zoning: string | null
  zoning_description: string | null
  jurisdiction: string | null
  jurisdiction_type: 'city' | 'county' | 'unknown'

  // Legal
  legal_description: string | null

  // Auction info
  sale_date: string | null
  auction_platform: string | null
  deposit_required: number | null

  // Risk flags (normalized from county-specific)
  access_risk: 'low' | 'medium' | 'high' | 'unknown'
  title_risk: 'low' | 'medium' | 'high' | 'unknown'
  legal_risk: 'low' | 'medium' | 'high' | 'unknown'
  marketability_risk: 'low' | 'medium' | 'high' | 'unknown'

  // Enrichment metadata
  data_source: string
  confidence_score: number // 0-100
  enrichment_timestamp: string // ISO timestamp

  // County-specific gaps (for PARTIAL/NEAR_LIVE)
  data_gaps: string[]
}

// External research links for a county
export interface CountyLinks {
  recorderUrl?: string
  assessorUrl?: string
  taxHistoryUrl?: string
  auctionInfoUrl?: string
  medicilandUrl?: string
  streetViewUrl?: string
  parcelMapUrl?: string
  planningUrl?: string // City planning department
  auditorUrl?: string
  treasurerUrl?: string
}

// County-specific risk warnings
export interface CountyRiskFactors {
  critical: string[] // Must-know warnings
  warnings: string[] // Important considerations
  notes: string[] // General info
}

// Main adapter interface - every county implements this
export interface CountyAdapter {
  id: CountyId
  name: string
  state: string

  // County readiness status
  readiness: CountyReadiness

  // Import configuration
  importConfig: {
    sourceType: 'csv' | 'google_sheet' | 'pdf' | 'html' | 'api'
    expectedColumns: string[]
    columnMapping: Record<string, string> // CSV column -> app field
    saleDate?: string
    auctionPlatform?: string
    depositAmount?: number
  }

  // Property enrichment - fetch market value, zoning, coords, etc.
  enrichProperty: (property: EnrichableProperty) => Promise<EnrichmentResult>

  // Generate external research links
  makeExternalLinks: (parcel: string, address: string, city?: string | null) => CountyLinks

  // Get county-specific risk factors
  getRiskFactors: (property: Partial<EnrichableProperty>) => CountyRiskFactors

  // Format parcel number for display/search
  formatParcelNumber: (parcel: string) => string

  // Validate parcel number format
  isValidParcel: (parcel: string) => boolean

  // Get city planning URL (if applicable)
  getPlanningUrl?: (city: string) => string | null

  // Convert property to normalized output for memo engine
  toNormalizedOutput?: (property: EnrichableProperty, enrichment: EnrichmentResult) => NormalizedParcelOutput
}

// Registry of all county adapters
export type CountyAdapterRegistry = Record<CountyId, CountyAdapter>

// Default/fallback adapter for unknown counties
export const defaultAdapter: CountyAdapter = {
  id: 'unknown',
  name: 'Unknown County',
  state: 'Unknown',
  readiness: {
    status: 'PLANNED',
    propertyCount: 0,
    adapterExists: false,
    hasEnrichment: false,
    dataGaps: ['All data sources']
  },
  importConfig: {
    sourceType: 'csv',
    expectedColumns: ['parcel_number', 'address'],
    columnMapping: {}
  },
  async enrichProperty() {
    return {
      confidence: 0,
      notes: 'County not configured for enrichment',
      data_source: 'None'
    }
  },
  makeExternalLinks() {
    return {}
  },
  getRiskFactors() {
    return { critical: [], warnings: [], notes: [] }
  },
  formatParcelNumber(parcel) {
    return parcel
  },
  isValidParcel() {
    return true
  }
}
