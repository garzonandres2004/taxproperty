// Multi-County Architecture - Core Types
// Supports Utah County, Tooele County, and future counties (Rich, Sanpete, etc.)

export type CountyId = 'utah' | 'tooele' | 'salt_lake' | 'rich' | 'sanpete' | string

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
  confidence?: number // 0-100, how confident we are in the data
  notes?: string // e.g., "Manual verification required"
  data_source?: string // e.g., "AGRC LIR", "Zillow API", "County Records"
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
}

// Registry of all county adapters
export type CountyAdapterRegistry = Record<CountyId, CountyAdapter>

// Default/fallback adapter for unknown counties
export const defaultAdapter: CountyAdapter = {
  id: 'unknown',
  name: 'Unknown County',
  state: 'Unknown',
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
