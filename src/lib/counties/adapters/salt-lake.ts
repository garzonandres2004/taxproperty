// Salt Lake County Adapter
// High-priority county with ~500 properties annually

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '../types'
import { geocodeAddress } from '@/lib/geocoding'

export const saltLakeAdapter: CountyAdapter = {
  id: 'salt_lake',
  name: 'Salt Lake County',
  state: 'Utah',
  readiness: {
    status: 'PLANNED',
    propertyCount: 0,
    adapterExists: true,
    hasEnrichment: false,
    dataGaps: ['Awaiting 2026 tax sale property list', 'No properties imported yet']
  },

  importConfig: {
    sourceType: 'html', // SLC publishes as HTML table, not CSV
    expectedColumns: [
      'Parcel Number',
      'Owner Name',
      'Property Address',
      'City',
      'Amount Due',
      'Assessed Value'
    ],
    columnMapping: {
      'Parcel Number': 'parcel_number',
      'Owner Name': 'owner_name',
      'Property Address': 'property_address',
      'City': 'city',
      'Amount Due': 'total_amount_due',
      'Assessed Value': 'assessed_value'
    },
    saleDate: '2026-05-21', // Verify with county - typically same as Utah County
    auctionPlatform: 'Public Surplus',
    depositAmount: 500
  },

  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 50,
      data_source: 'AGRC LIR',
      notes: ''
    }

    // Salt Lake County uses AGRC LIR like Utah County
    // Parcel format: XX-XXX-XXXX (with dashes) or XXXXXXXXX (numeric)
    // Try both formats
    const parcelWithDashes = property.parcel_number
    const parcelNumeric = property.parcel_number.replace(/[^0-9]/g, '')

    try {
      // Try with both formats
      const whereClause = `PARCEL_ID='${parcelWithDashes}' OR PARCEL_ID='${parcelNumeric}'`.replace(/'/g, '%27')
      const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
      const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query?where=${whereClause}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

      const response = await fetch(agrcUrl, {
        headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
      })

      if (response.ok) {
        const data = await response.json()

        if (data?.features?.length > 0) {
          const attrs = data.features[0].attributes
          const geometry = data.features[0].geometry

          // Coordinates from polygon
          if (geometry?.rings?.length > 0) {
            const ring = geometry.rings[0]
            const xs = ring.map((p: number[]) => p[0])
            const ys = ring.map((p: number[]) => p[1])
            result.longitude = xs.reduce((a: number, b: number) => a + b, 0) / xs.length
            result.latitude = ys.reduce((a: number, b: number) => a + b, 0) / ys.length
          }

          // Market value
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

          // Jurisdiction
          if (attrs.PARCEL_CITY) {
            result.jurisdiction = attrs.PARCEL_CITY
            result.jurisdiction_type = 'city'
          } else {
            result.jurisdiction = 'Unincorporated Salt Lake County'
            result.jurisdiction_type = 'county'
          }

          result.notes = 'Enriched from AGRC SaltLake LIR'
        }
      }
    } catch (error) {
      result.notes = `AGRC enrichment failed: ${(error as Error).message}`
      result.confidence = 30
    }

    // Fallback: Try geocoding if AGRC failed
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
          result.confidence = Math.max(result.confidence || 50, 60)
          result.notes += ' Coordinates from geocoding.'
        }
      } catch (error) {
        result.notes += ' Geocoding failed.'
      }
    }

    // Risk defaults
    result.legal_risk = 'medium'
    result.access_risk = 'medium'
    result.title_risk = 'medium'
    result.marketability_risk = 'medium'

    return result
  },

  makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
    const normalized = parcel.replace(/[^0-9]/g, '').trim()

    return {
      // Salt Lake County Recorder
      recorderUrl: `https://slco.org/assessor/`,

      // Assessor
      assessorUrl: 'https://slco.org/assessor/',

      // Tax sale info
      auctionInfoUrl: 'https://www.slco.org/treasurer/',

      // Street View
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Salt Lake County, Utah')}`
        : undefined,

      // SLC specific
      planningUrl: city
        ? `https://www.${city.toLowerCase().replace(/\s/g, '')}.utah.gov/planning`
        : 'https://slco.org/planning-development/'
    }
  },

  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    // Salt Lake County tax sale terms
    critical.push('Tax deed sale - no title guarantee')
    critical.push('Redemption allowed until bidding starts')

    warnings.push('High competition - Salt Lake County has active investor market')
    warnings.push('Verify deposit amount with treasurer')

    notes.push('Larger market than Utah County - more properties but more competition')
    notes.push('Check for HOA liens in SLC condos/townhomes')

    return { critical, warnings, notes }
  },

  formatParcelNumber(parcel: string): string {
    const normalized = parcel.replace(/[^0-9]/g, '')
    // SLC uses various formats, display as-is
    return parcel.trim()
  },

  isValidParcel(parcel: string): boolean {
    const normalized = parcel.replace(/[^0-9]/g, '')
    // SLC parcels vary in length, typically 9-12 digits
    return /^\d{9,12}$/.test(normalized)
  }
}

export default saltLakeAdapter
