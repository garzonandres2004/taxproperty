// Davis County Adapter
// Supports PowerPoint/PDF extracted data

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '../types'
import { geocodeAddress } from '@/lib/geocoding'

export const davisAdapter: CountyAdapter = {
  id: 'davis',
  name: 'Davis County',
  state: 'Utah',
  readiness: {
    status: 'PARTIAL',
    propertyCount: 22,
    adapterExists: true,
    hasEnrichment: true,
    dataGaps: ['PDF extraction incomplete', 'Zoning verification needed', 'Market value validation pending']
  },

  importConfig: {
    sourceType: 'csv', // After OCR extraction
    expectedColumns: [
      'Parcel Number',
      'Property Address',
      'City',
      'Owner Name',
      'Total Amount Due'
    ],
    columnMapping: {
      'Parcel Number': 'parcel_number',
      'Property Address': 'property_address',
      'City': 'city',
      'Owner Name': 'owner_name',
      'Total Amount Due': 'total_amount_due'
    },
    saleDate: '2026-05-13',
    auctionPlatform: 'In-person Auction',
    depositAmount: 0 // TBD - verify with county
  },

  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 50,
      data_source: 'AGRC LIR',
      notes: ''
    }

    // Davis County parcel format: XX-XXX-XXXX in database
    // AGRC LIR uses numeric format XXXXXXXXX (no dashes)
    const parcelId = property.parcel_number.replace(/-/g, '')

    try {
      const whereValue = `PARCEL_ID='${parcelId}'`.replace(/'/g, '%27')
      const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
      const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Davis_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

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
            result.jurisdiction = 'Unincorporated Davis County'
            result.jurisdiction_type = 'county'
          }

          result.data_source = 'AGRC Davis LIR'
          result.notes = 'Enriched from AGRC Parcels_Davis_LIR'
        }
      }
    } catch (error) {
      result.notes = `AGRC enrichment failed: ${(error as Error).message}`
      result.confidence = 30
    }

    // Fallback to geocoding
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
    return {
      // Davis County Assessor
      assessorUrl: 'https://www.daviscountyutah.gov/assessor/',

      // Recorder
      recorderUrl: 'https://www.daviscountyutah.gov/recorder/',

      // Tax sale info
      auctionInfoUrl: 'https://www.daviscountyutah.gov/controller/tax-administration-group/tax-sale/',

      // Street View
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Davis County, Utah')}`
        : undefined,

      // Planning
      planningUrl: city
        ? `https://www.${city.toLowerCase().replace(/\s/g, '')}.utah.gov/planning`
        : 'https://www.daviscountyutah.gov/community-development/'
    }
  },

  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    // Davis County specific
    critical.push('Tax deed sale - no title guarantee')
    critical.push('Buyer beware - purchaser responsible for research')

    warnings.push('In-person auction only - no online bidding')
    warnings.push('Properties redeemable until sale starts')

    notes.push('Deposit amount unknown - call 801-451-3329 to verify')
    notes.push('5th year delinquency properties only')

    return { critical, warnings, notes }
  },

  formatParcelNumber(parcel: string): string {
    // Davis uses XX-XXX-XXXX format
    return parcel.trim()
  },

  isValidParcel(parcel: string): boolean {
    // Format: XX-XXX-XXXX
    return /^\d{2}-\d{3}-\d{4}$/.test(parcel.trim())
  }
}

export default davisAdapter
