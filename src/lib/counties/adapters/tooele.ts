// Tooele County Adapter
// Supports Tooele County tax sale properties with Mediciland integration

import { CountyAdapter, EnrichableProperty, EnrichmentResult, CountyLinks, CountyRiskFactors } from '../types'
import { geocodeAddress } from '@/lib/geocoding'

// Tooele County cities and their planning URLs
const TOOELE_CITY_PLANNING_URLS: Record<string, string> = {
  'Tooele': 'https://tooelecity.org/departments/community_development/planning_zoning.php',
  'Tooele City': 'https://tooelecity.org/departments/community_development/planning_zoning.php',
  'Grantsville': 'https://grantsvilleutah.gov/zoning/',
  'Stansbury Park': 'https://stansburypark.gov/planning/',
  'Stansbury': 'https://stansburypark.gov/planning/',
  'Wendover': 'https://wendovercity.com/planning/',
  'Rush Valley': 'https://rushvalleytown.org/',
  'Vernon': 'https://vernonutah.gov/', // May need manual lookup
  'Stockton': 'https://stocktonutah.gov/',
  'Ophir': 'https://tooelecounty.gov/', // Small town, county handles
}

export const tooeleAdapter: CountyAdapter = {
  id: 'tooele',
  name: 'Tooele County',
  state: 'Utah',

  importConfig: {
    sourceType: 'csv',
    expectedColumns: [
      'Account Number',
      'Parcel Number',
      'Name',
      'Estimated Starting Bid',
      'Property Type',
      'Address',
      'City State Zip',
      'Legal'
    ],
    columnMapping: {
      'Account Number': 'account_number',
      'Parcel Number': 'parcel_number',
      'Name': 'owner_name',
      'Estimated Starting Bid': 'total_amount_due',
      'Property Type': 'property_type',
      'Address': 'property_address',
      'City State Zip': 'city_state_zip',
      'Legal': 'legal_description'
    },
    saleDate: '2026-05-07',
    auctionPlatform: 'Public Surplus',
    depositAmount: 500
  },

  // Enrich Tooele property with market data, zoning, coordinates
  async enrichProperty(property: EnrichableProperty): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      confidence: 50,
      data_source: 'Tooele County Records',
      notes: ''
    }

    // 1. Extract city from address or city_state_zip
    let city = property.city
    if (!city && property.property_address) {
      // Try to extract city from "CITY, ST ZIP" format
      const cityMatch = property.property_address.match(/^([^,]+)/)
      if (cityMatch) {
        city = cityMatch[1].trim()
      }
    }

    // 2. Geocode address to get coordinates
    if (property.property_address) {
      try {
        const geoResult = await geocodeAddress(
          property.property_address,
          city || undefined,
          'Utah'
        )

        if (geoResult) {
          result.latitude = geoResult.latitude
          result.longitude = geoResult.longitude
          result.confidence = geoResult.confidence === 'high' ? 65 : 55
          result.notes += 'Coordinates from geocoding. '

          // Try to extract city from formatted address if not already set
          if (!city && geoResult.formattedAddress) {
            const cityMatch = geoResult.formattedAddress.match(/,\s*([^,]+?),\s*UT/)
            if (cityMatch) {
              city = cityMatch[1].trim()
            }
          }
        }
      } catch (error) {
        result.notes += 'Geocoding failed. '
      }
    }

    // 3. Determine jurisdiction
    if (city && TOOELE_CITY_PLANNING_URLS[city]) {
      result.jurisdiction = city
      result.jurisdiction_type = 'city'
      result.zoning = 'City jurisdiction - manual verification required'
      result.zoning_description = `Property is within ${city} city limits. Contact city planning for zoning.`
    } else {
      result.jurisdiction = 'Unincorporated Tooele County'
      result.jurisdiction_type = 'county'
      result.zoning = 'County jurisdiction - manual verification required'
      result.zoning_description = 'Property is in unincorporated Tooele County. Contact county planning.'
    }

    // 4. Query AGRC Tooele LIR for market data
    // AGRC covers all Utah counties including Tooele
    try {
      // Convert numeric parcel ID to dashed format for AGRC
      // CSV: 1305000014 -> AGRC: 13-050-0-0014
      const numeric = property.parcel_number.replace(/[^0-9]/g, '')
      // Format: XX-XXX-X-XXXX (2-3-1-4 digits)
      const dashedFormat = `${numeric.slice(0,2)}-${numeric.slice(2,5)}-${numeric.slice(5,6)}-${numeric.slice(6,10)}`
      const whereValue = `PARCEL_ID='${dashedFormat}'`.replace(/'/g, '%27')
      const outFields = 'PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'
      const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Tooele_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=false&f=json`

      const response = await fetch(agrcUrl, {
        headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.features?.length > 0) {
          const attrs = data.features[0].attributes

          // Market value from AGRC
          if (attrs.TOTAL_MKT_VALUE) {
            result.estimated_market_value = Math.round(attrs.TOTAL_MKT_VALUE)
            result.confidence = Math.max(result.confidence || 50, 85)
            result.notes += 'Market value from AGRC Tooele LIR. '
          }

          // Building data from AGRC
          if (attrs.BLDG_SQFT) {
            result.building_sqft = Math.round(attrs.BLDG_SQFT)
          }
          if (attrs.BUILT_YR) {
            result.year_built = attrs.BUILT_YR
          }

          // Lot size from AGRC (prefer over legal description)
          if (attrs.PARCEL_ACRES) {
            result.lot_size_sqft = Math.round(attrs.PARCEL_ACRES * 43560)
          }

          // Jurisdiction from AGRC
          if (attrs.PARCEL_CITY) {
            const agrcCity = attrs.PARCEL_CITY.trim()
            if (TOOELE_CITY_PLANNING_URLS[agrcCity]) {
              result.jurisdiction = agrcCity
              result.jurisdiction_type = 'city'
              result.zoning = 'City jurisdiction - manual verification required'
              result.zoning_description = `Property is within ${agrcCity} city limits. Contact city planning for zoning.`
            } else {
              result.jurisdiction = 'Unincorporated Tooele County'
              result.jurisdiction_type = 'county'
            }
          }

          result.data_source = 'AGRC Tooele LIR'
        }
      }
    } catch (error) {
      result.notes += 'AGRC enrichment failed. '
    }

    // Fallback to assessed_value if AGRC failed
    if (!result.estimated_market_value && property.assessed_value && property.assessed_value > 0) {
      result.estimated_market_value = property.assessed_value
      result.confidence = Math.max(result.confidence || 50, 60)
      result.notes += 'Market value estimated from assessed value. '
    }

    // 5. Parse lot size from legal description if available
    // Legal desc often contains "X.XX AC" or "X,XXX sqft"
    if (property.legal_description) {
      const acresMatch = property.legal_description.match(/(\d+\.?\d*)\s*AC/i)
      if (acresMatch) {
        const acres = parseFloat(acresMatch[1])
        result.lot_size_sqft = Math.round(acres * 43560) // Convert acres to sqft
        result.notes += `Lot size ${acres} AC from legal description. `
      }
    }

    // Also check lot_size_sqft if already available
    if (property.lot_size_sqft && property.lot_size_sqft > 0) {
      // Already have lot size, no need to override
    }

    // 6. Property type normalization
    // Tooele CSV has: "Commercial Land", "Lot", "House", etc.
    // Already normalized during import

    return result
  },

  // Generate all external links for Tooele County
  makeExternalLinks(parcel: string, address: string, city?: string | null): CountyLinks {
    const normalizedParcel = parcel.replace(/:/g, '').trim()

    return {
      // Mediciland - primary source for Tooele records (requires Google Auth)
      recorderUrl: `https://search.tooeleco.gov.mediciland.com/?q=${encodeURIComponent(normalizedParcel)}`,
      medicilandUrl: `https://search.tooeleco.gov.mediciland.com/?q=${encodeURIComponent(normalizedParcel)}`,

      // County websites
      assessorUrl: 'https://tooeleco.gov/departments/administration/auditor/',
      auditorUrl: 'https://tooeleco.gov/departments/administration/auditor/',
      treasurerUrl: 'https://tooeleco.gov/departments/administration/treasurer/',
      auctionInfoUrl: 'https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php',

      // Google Street View (works with any address)
      streetViewUrl: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Tooele County, Utah')}`
        : undefined,

      // City planning URL if in a city
      planningUrl: city && TOOELE_CITY_PLANNING_URLS[city]
        ? TOOELE_CITY_PLANNING_URLS[city]
        : 'https://tooeleco.gov/departments/community_development/',

      // Parcel map - Tooele uses Mediciland for this
      parcelMapUrl: `https://search.tooeleco.gov.mediciland.com/?q=${encodeURIComponent(normalizedParcel)}`
    }
  },

  // Tooele County-specific risk factors
  getRiskFactors(property: Partial<EnrichableProperty>): CountyRiskFactors {
    const critical: string[] = []
    const warnings: string[] = []
    const notes: string[] = []

    // Tooele tax sale terms
    critical.push('Tax deed sale - no title guarantee')
    critical.push('8% buyer premium added to winning bid')
    critical.push('Wire transfer payment required within 3 business days')
    critical.push('Federal tax liens may survive sale (120-day IRS redemption)')
    critical.push('High redemption risk until auction begins May 7, 2026')

    // Rural considerations
    warnings.push('Rural county - properties may have well/septic')
    warnings.push('Distance from Salt Lake may affect resale marketability')

    // Location-specific
    if (property.property_address?.includes('Ophir')) {
      warnings.push('Near Deseret Chemical Depot area - check restrictions')
    }
    if (property.property_address?.includes('Canyon') || property.property_address?.includes('Rush')) {
      notes.push('Mining history in area - environmental due diligence advised')
    }

    notes.push('Public Surplus platform - technology risk if website fails')

    return { critical, warnings, notes }
  },

  // Format parcel for display (Tooele uses plain numbers)
  formatParcelNumber(parcel: string): string {
    // Tooele parcels are typically 12-14 digits
    // Just return as-is, or add formatting if needed
    return parcel.replace(/:/g, '').trim()
  },

  // Validate Tooele parcel format (12-14 digits)
  isValidParcel(parcel: string): boolean {
    const normalized = parcel.replace(/:/g, '').replace(/\D/g, '')
    return /^\d{12,14}$/.test(normalized)
  },

  // Get planning URL for a specific city
  getPlanningUrl(city: string): string | null {
    return TOOELE_CITY_PLANNING_URLS[city] || null
  }
}

// Helper function for Tooele County research links (backward compatibility)
export function getTooeleResearchLinks(parcelNumber: string, ownerName?: string) {
  return {
    mediciland: `https://search.tooeleco.gov.mediciland.com/?q=${encodeURIComponent(parcelNumber)}`,
    recorder: 'https://tooeleco.gov/departments/administration/recorder_surveyor/',
    taxSale: 'https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php'
  }
}

export default tooeleAdapter
