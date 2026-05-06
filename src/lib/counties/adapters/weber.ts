// Weber County Adapter
// Northern Utah county. AGRC LIR provides market data and coordinates.
// In-person auction at Weber Center, Ogden — no online bidding.
// Sale procedures: contact Weber County Clerk/Auditor (Ogden, UT).

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '../types'
import { geocodeAddress } from '@/lib/geocoding'

export const weberAdapter: CountyAdapter = {
  id: 'weber',
  name: 'Weber County',
  state: 'Utah',
  readiness: {
    status: 'PARTIAL',
    propertyCount: 69,
    adapterExists: true,
    hasEnrichment: true,
    dataGaps: ['Zoning verification incomplete', 'Title signals not fully automated']
  },

  importConfig: {
    sourceType: 'csv',
    expectedColumns: [
      'Parcel Number',
      'Owner Name',
      'Mailing Address',
      'Amount Due',
      'Legal Description'
    ],
    columnMapping: {
      'Parcel Number': 'parcel_number',
      'Owner Name': 'owner_name',
      'Mailing Address': 'owner_mailing_address',
      'Amount Due': 'total_amount_due',
      'Legal Description': 'legal_description'
    },
    saleDate: '2026-05-21',
    auctionPlatform: 'In-Person (Weber Center, Ogden)',
    depositAmount: 0  // unverified — confirm with county before bidding
  },

  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 40,
      data_source: 'AGRC LIR',
      notes: ''
    }

    // Try AGRC Weber LIR — same endpoint pattern as all Utah counties.
    // Attempt raw parcel first, then numeric-only (AGRC accepts various formats).
    try {
      const rawParcel = property.parcel_number.trim()
      const numericParcel = rawParcel.replace(/[^0-9]/g, '')

      for (const parcelId of [rawParcel, numericParcel]) {
        if (!parcelId) continue

        const whereValue = `PARCEL_ID='${parcelId}'`.replace(/'/g, '%27')
        const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
        const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Weber_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

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

          if (attrs.PARCEL_CITY && attrs.PARCEL_CITY.trim()) {
            result.jurisdiction = attrs.PARCEL_CITY.trim()
            result.jurisdiction_type = 'city'
          } else {
            result.jurisdiction = 'Unincorporated Weber County'
            result.jurisdiction_type = 'county'
          }

          result.data_source = 'AGRC Weber LIR'
          result.notes = 'Enriched from AGRC Parcels_Weber_LIR'
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

    // Weber County: no automated zoning identify service — flag for manual lookup
    result.zoning = 'Manual verification required'
    result.zoning_description = 'Verify zoning at webercountyutah.gov/Community_Development or contact Weber County Planning at 801-399-8791.'

    result.legal_risk = 'medium'
    result.access_risk = 'medium'
    result.title_risk = 'medium'
    result.marketability_risk = 'medium'

    return result
  },

  makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
    return {
      assessorUrl: 'https://www.webercountyutah.gov/Assessor',
      recorderUrl: 'https://www.webercountyutah.gov/Recorder',
      taxHistoryUrl: 'https://www.webercountyutah.gov/Treasurer',
      auctionInfoUrl: 'https://www.webercountyutah.gov/Clerk_Auditor/tax_sale.php',
      planningUrl: 'https://www.webercountyutah.gov/Community_Development',
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Weber County, Utah')}`
        : undefined
    }
  },

  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    critical.push('Tax deed sale — no title guarantee')
    critical.push('IN-PERSON ONLY auction — no online bidding platform')
    critical.push('Sale procedures unverified — confirm deposit and payment terms with Weber County Clerk before bidding')

    warnings.push('Call Andy McRae (Weber County BOE Clerk) at 801-399-8112 to confirm deposit amount and payment deadline')
    warnings.push('Properties may be redeemed until auction begins on sale day')
    warnings.push('Verify road access and utilities before bidding on unincorporated parcels')

    notes.push('Auction: Weber Center, Commission Chambers (1st Floor), 2380 Washington Blvd., Ogden, UT 84401')
    notes.push('Sale date: May 21, 2026 at 10:00 AM MST')
    notes.push('Source list: webercountyutah.gov/Clerk_Auditor/tax_sale.php')

    return { critical, warnings, notes }
  },

  formatParcelNumber(parcel: string): string {
    return parcel.trim()
  },

  isValidParcel(parcel: string): boolean {
    // Accept any non-empty parcel until Weber format is confirmed from PDF
    return parcel.trim().length > 0
  }
}

export default weberAdapter
