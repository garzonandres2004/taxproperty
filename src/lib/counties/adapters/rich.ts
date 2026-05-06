// Rich County Adapter
// Rural northeast Utah county. AGRC LIR provides market data and coordinates.
// No automated zoning identify service available - manual lookup required.
// Sale procedures: contact Rich County Clerk/Auditor directly (Randolph, UT).

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '../types'
import { geocodeAddress } from '@/lib/geocoding'

export const richAdapter: CountyAdapter = {
  id: 'rich',
  name: 'Rich County',
  state: 'Utah',
  readiness: {
    status: 'LIVE',
    propertyCount: 4,
    adapterExists: true,
    hasEnrichment: true,
    dataGaps: ['No automated zoning identify service (manual lookup required)']
  },

  importConfig: {
    sourceType: 'csv',
    // Column names are TBD - auto-detection handles any format
    expectedColumns: [
      'Parcel Number',
      'Owner Name',
      'Property Address',
      'Amount Due',
      'Legal Description'
    ],
    columnMapping: {
      'Parcel Number': 'parcel_number',
      'Owner Name': 'owner_name',
      'Property Address': 'property_address',
      'Amount Due': 'total_amount_due',
      'Legal Description': 'legal_description'
    },
    saleDate: '2026-05-14',
    auctionPlatform: 'Public Surplus',
    depositAmount: 1000
  },

  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 40,
      data_source: 'AGRC LIR',
      notes: ''
    }

    // Try AGRC Rich LIR - same endpoint pattern as all Utah counties
    try {
      // Try both raw parcel and numeric-only (AGRC accepts various formats)
      const rawParcel = property.parcel_number.trim()
      const numericParcel = rawParcel.replace(/[^0-9]/g, '')

      // Try raw first, then numeric if raw returns nothing
      for (const parcelId of [rawParcel, numericParcel]) {
        if (!parcelId) continue

        const whereValue = `PARCEL_ID='${parcelId}'`.replace(/'/g, '%27')
        const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
        const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Rich_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

        const response = await fetch(agrcUrl, {
          headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
        })

        if (!response.ok) break

        const data = await response.json()

        if (data?.features?.length > 0) {
          const attrs = data.features[0].attributes
          const geometry = data.features[0].geometry

          // Coordinates from polygon centroid
          if (geometry?.rings?.length > 0) {
            const ring = geometry.rings[0]
            const xs = ring.map((p: number[]) => p[0])
            const ys = ring.map((p: number[]) => p[1])
            result.longitude = xs.reduce((a: number, b: number) => a + b, 0) / xs.length
            result.latitude = ys.reduce((a: number, b: number) => a + b, 0) / ys.length
          }

          if (attrs.TOTAL_MKT_VALUE) {
            result.estimated_market_value = Math.round(attrs.TOTAL_MKT_VALUE)
            result.confidence = 85
          }

          if (attrs.BLDG_SQFT) result.building_sqft = Math.round(attrs.BLDG_SQFT)
          if (attrs.BUILT_YR) result.year_built = attrs.BUILT_YR
          if (attrs.PARCEL_ACRES) result.lot_size_sqft = Math.round(attrs.PARCEL_ACRES * 43560)

          // Rich County is mostly unincorporated; Randolph is the only incorporated city
          if (attrs.PARCEL_CITY && attrs.PARCEL_CITY.trim()) {
            result.jurisdiction = attrs.PARCEL_CITY.trim()
            result.jurisdiction_type = 'city'
          } else {
            result.jurisdiction = 'Unincorporated Rich County'
            result.jurisdiction_type = 'county'
          }

          result.data_source = 'AGRC Rich LIR'
          result.notes = 'Enriched from AGRC Parcels_Rich_LIR'
          break
        }
      }
    } catch (error) {
      result.notes = `AGRC enrichment failed: ${(error as Error).message}`
      result.confidence = 30
    }

    // Assessed value fallback
    if (!result.estimated_market_value && property.assessed_value && property.assessed_value > 0) {
      result.estimated_market_value = property.assessed_value
      result.confidence = Math.max(result.confidence || 40, 55)
      result.notes += ' Market value estimated from assessed value.'
    }

    // Geocode fallback if AGRC returned no coordinates
    if (!result.latitude && property.property_address) {
      try {
        const geoResult = await geocodeAddress(
          property.property_address,
          property.city || undefined,
          'Utah'
        )
        if (geoResult) {
          result.latitude = geoResult.latitude
          result.longitude = geoResult.longitude
          result.confidence = Math.max(result.confidence || 40, 55)
          result.notes += ' Coordinates from geocoding.'
        }
      } catch {
        result.notes += ' Geocoding failed.'
      }
    }

    // Rich County: no automated zoning service - flag for manual lookup
    result.zoning = 'Manual verification required'
    result.zoning_description = 'Rich County does not have a GIS zoning identify service. Verify zoning at richcounty.gov or contact the county directly.'

    result.legal_risk = 'medium'
    result.access_risk = 'medium'
    result.title_risk = 'medium'
    result.marketability_risk = 'medium'

    return result
  },

  makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
    return {
      assessorUrl: 'https://www.richcounty.gov/assessor/',
      recorderUrl: 'http://search.richcounty.gov/RecordingsSearch.aspx',
      taxHistoryUrl: 'http://search.richcounty.gov/PropertyTaxSearch.aspx',
      auctionInfoUrl: 'https://www.richcounty.gov/tax-sale/',
      planningUrl: 'https://www.richcounty.gov/planning/',
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Rich County, Utah')}`
        : undefined
    }
  },

  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    critical.push('Tax deed sale - no title guarantee')
    critical.push('Sale procedures unverified - confirm details with Rich County Clerk before bidding')

    warnings.push('Very rural county - properties may have no utilities or road access')
    warnings.push('Bear Lake area properties may have seasonal access limitations')
    warnings.push('Limited resale market - verify exit strategy before bidding')

    notes.push('Rich County is one of Utahs smallest counties by population')
    notes.push('Contact Rich County Auditor in Randolph, UT: (435) 793-2415')

    return { critical, warnings, notes }
  },

  formatParcelNumber(parcel: string): string {
    return parcel.trim()
  },

  isValidParcel(parcel: string): boolean {
    // Accept any non-empty parcel until Rich County format is confirmed
    return parcel.trim().length > 0
  }
}

export default richAdapter
