// County Adapter Registry
// Unified interface for all county integrations

import type { CountyId, CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from './types'
export type { CountyId, CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors }
import { tooeleAdapter } from './adapters/tooele'

// Utah County Adapter - wraps existing AGRC integration
export const utahAdapter: CountyAdapter = {
  id: 'utah',
  name: 'Utah County',
  state: 'Utah',

  importConfig: {
    sourceType: 'csv',
    expectedColumns: [
      'Parcel Number',
      'Owner Name',
      'Mailing Address',
      'Property Address',
      'Legal Description',
      'Amount Due',
      'Assessed Value'
    ],
    columnMapping: {
      'Parcel Number': 'parcel_number',
      'Owner Name': 'owner_name',
      'Mailing Address': 'owner_mailing_address',
      'Property Address': 'property_address',
      'Legal Description': 'legal_description',
      'Amount Due': 'total_amount_due',
      'Assessed Value': 'assessed_value'
    },
    saleDate: '2026-05-21',
    auctionPlatform: 'Public Surplus',
    depositAmount: 500
  },

  // Utah County uses AGRC LIR API for enrichment
  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 50,
      data_source: 'AGRC LIR',
      notes: ''
    }

    // AGRC expects numeric-only parcel ID
    const serialClean = property.parcel_number.replace(/[^0-9]/g, '')

    try {
      // Try AGRC LIR endpoint
      const whereValue = `PARCEL_ID='${serialClean}'`.replace(/'/g, '%27')
      const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
      const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

      const response = await fetch(agrcUrl, {
        headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
      })

      if (response.ok) {
        const data = await response.json()

        if (data?.features?.length > 0) {
          const attrs = data.features[0].attributes
          const geometry = data.features[0].geometry

          // Extract coordinates from polygon centroid
          if (geometry?.rings?.length > 0) {
            const ring = geometry.rings[0]
            const xs = ring.map((p: number[]) => p[0])
            const ys = ring.map((p: number[]) => p[1])
            result.longitude = xs.reduce((a: number, b: number) => a + b, 0) / xs.length
            result.latitude = ys.reduce((a: number, b: number) => a + b, 0) / ys.length
          }

          // Market value from AGRC
          if (attrs.TOTAL_MKT_VALUE) {
            result.estimated_market_value = Math.round(attrs.TOTAL_MKT_VALUE)
            result.confidence = 85
          }

          // Building data
          if (attrs.BLDG_SQFT) {
            result.building_sqft = Math.round(attrs.BLDG_SQFT)
          }
          if (attrs.BUILT_YR) {
            result.year_built = attrs.BUILT_YR
          }

          // Lot size
          if (attrs.PARCEL_ACRES) {
            result.lot_size_sqft = Math.round(attrs.PARCEL_ACRES * 43560)
          }

          // Jurisdiction from PARCEL_CITY
          if (attrs.PARCEL_CITY) {
            result.jurisdiction = attrs.PARCEL_CITY
            result.jurisdiction_type = 'city'
          } else {
            result.jurisdiction = 'Unincorporated Utah County'
            result.jurisdiction_type = 'county'
          }

          result.data_source = 'AGRC LIR'
          result.notes = 'Enriched from AGRC Parcels_Utah_LIR'
        }
      }
    } catch (error) {
      result.notes = `AGRC enrichment failed: ${(error as Error).message}`
      result.confidence = 30
    }

    return result
  },

  // Generate Utah County external links
  makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
    const normalized = parcel.replace(/:/g, '').trim()

    return {
      // Land Records - primary source
      recorderUrl: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalized}`,

      // Assessor
      assessorUrl: 'https://www.utahcounty.gov/dept/Assessor/',

      // Treasurer/Auditor
      taxHistoryUrl: 'https://www.utahcounty.gov/dept/auditor/',

      // Tax sale info
      auctionInfoUrl: 'https://auditor.utahcounty.gov/may-tax-sale/',

      // GIS/Parcel Map
      parcelMapUrl: 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html',

      // Street View
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Utah')}`
        : undefined,

      // Zoning map
      planningUrl: 'https://maps.utahcounty.gov/CommDev/Zoning/Zoning.html'
    }
  },

  // Utah County-specific risk factors
  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    // Utah County tax sale terms
    critical.push('Tax deed sale - no title guarantee')
    critical.push('Redemption allowed until bidding starts on sale day')
    critical.push('High pre-sale volatility - properties may disappear from list')

    // Deposit/payment
    warnings.push('Verify deposit amount with county before sale')
    warnings.push('Platform may change - verify current auction system')

    // Location-specific
    notes.push('127 properties on 2026 list - competitive bidding expected')
    notes.push('Utah County has high redemption rate before sales')

    return { critical, warnings, notes }
  },

  // Format parcel for display (Utah uses NN:NNN:NNNN format)
  formatParcelNumber(parcel: string): string {
    const normalized = parcel.replace(/[^0-9]/g, '')
    // Format as NN:NNN:NNNN if 9+ digits
    if (normalized.length >= 9) {
      return `${normalized.slice(0, 2)}:${normalized.slice(2, 5)}:${normalized.slice(5, 9)}`
    }
    return parcel
  },

  // Validate Utah parcel format (NN:NNN:NNNN or NNNNNNNNN)
  isValidParcel(parcel: string): boolean {
    const normalized = parcel.replace(/:/g, '').replace(/\D/g, '')
    return /^\d{9}$/.test(normalized)
  }
}

// Adapter registry
const adapterRegistry: Record<CountyId, CountyAdapter> = {
  utah: utahAdapter,
  tooele: tooeleAdapter
}

// Get adapter for a county
export function getCountyAdapter(county: CountyId): CountyAdapter {
  return adapterRegistry[county] || utahAdapter // Fallback to Utah
}

// Check if adapter exists for county
export function hasCountyAdapter(county: CountyId): boolean {
  return county in adapterRegistry
}

// Get all available counties
export function getAvailableCounties(): { id: CountyId; name: string; state: string }[] {
  return Object.values(adapterRegistry).map(adapter => ({
    id: adapter.id,
    name: adapter.name,
    state: adapter.state
  }))
}

// Enrich property using appropriate adapter
export async function enrichPropertyWithAdapter(
  property: EnrichableProperty
): Promise<EnrichmentResult> {
  const adapter = getCountyAdapter(property.county)
  return adapter.enrichProperty(property)
}

// Generate external links using appropriate adapter
export function makeExternalLinksWithAdapter(
  county: CountyId,
  parcel: string,
  address: string,
  city?: string | null
): CountyLinks {
  const adapter = getCountyAdapter(county)
  return adapter.makeExternalLinks(parcel, address, city)
}

// Get risk factors using appropriate adapter
export function getRiskFactorsWithAdapter(
  county: CountyId,
  property: Partial<EnrichableProperty>
): CountyRiskFactors {
  const adapter = getCountyAdapter(county)
  return adapter.getRiskFactors(property)
}

export { tooeleAdapter }
