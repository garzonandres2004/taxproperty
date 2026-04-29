import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getZoneRules } from '@/lib/zoning/utah-county-zones'
import { generateUseIdeas, calculateBuildabilityScore } from '@/lib/zoning/use-idea-generator'

// Utah County cities for jurisdiction detection
const UTAH_COUNTY_CITIES = [
  'PROVO', 'OREM', 'LEHI', 'AMERICAN FORK', 'PLEASANT GROVE',
  'LINDON', 'HIGHLAND', 'ALPINE', 'CEDAR HILLS', 'EAGLE MOUNTAIN',
  'SARATOGA SPRINGS', 'SPANISH FORK', 'SPRINGVILLE', 'PAYSON',
  'SANTAQUIN', 'GOSHEN', 'ELBERTA', 'CEDAR FORT', 'FAIRFIELD',
  'GENOLA', 'MAPLETON', 'SALEM', 'VINEYARD', 'WOODBURY',
  'LAKE SHORE', 'PALMYRA', 'BENJAMIN', 'LAKE POINT', 'MANILA',
  'MOORE', 'SLICK ROCK', 'TINTIC', 'VERDI', 'WEST MOUNTAIN'
]

// City planning department URLs for manual zoning lookup
const CITY_PLANNING_URLS: Record<string, string> = {
  'PROVO': 'https://www.provo.org/departments/community-development/planning',
  'OREM': 'https://orem.gov/planning/',
  'LEHI': 'https://www.lehi-ut.gov/planning-zoning/',
  'EAGLE MOUNTAIN': 'https://www.eaglemountaincity.com/planning-zoning/',
  'PLEASANT GROVE': 'https://www.plgrove.org/planning',
  'AMERICAN FORK': 'https://www.afcity.net/planning',
  'SPRINGVILLE': 'https://www.springville.org/planning-zoning/',
  'SPANISH FORK': 'https://www.spanishfork.org/planning',
  'PAYSON': 'https://www.paysonutah.org/community-development',
  'HIGHLAND': 'https://www.highlandcity.org/planning',
  'SARATOGA SPRINGS': 'https://www.saratogaspringscity.com/planning',
  'VINEYARD': 'https://www.vineyardutah.org/planning',
  'LINDON': 'https://www.lindonutah.org/planning',
  'MAPLETON': 'https://www.mapletoncity.org/planning',
  'SANTAQUIN': 'https://santaquin.org/planning-zoning/',
  'CEDAR HILLS': 'https://www.cedarhillscity.org/planning',
  'ALPINE': 'https://alpinecity.org/planning-zoning/',
  'GOSHEN': 'https://goshenutah.gov/planning-zoning/',
  'SALEM': 'https://salem-ut.gov/planning-zoning/'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check for debug mode
    const url = new URL(request.url)
    const isDebug = url.searchParams.get('debug') === 'true'

    const results: any = {
      stepsCompleted: [],
      warnings: [],
      errors: [],
      debug: isDebug ? {} : undefined,
      data: {}
    }

    // Step 1: Get property details
    const property = await prisma.property.findUnique({
      where: { id },
      include: { sources: true }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    results.stepsCompleted.push('Found property in database')
    results.data.parcelNumber = property.parcel_number

    const serial = property.parcel_number
    // AGRC expects numeric-only parcel ID (e.g., "55-123-4567" -> "551234567")
    const serialClean = serial.replace(/[^0-9]/g, '')

    // Step 2: Try AGRC Endpoints
    let parcelData: any = null
    let coordinates: { x: number; y: number } | null = null
    let agrcResponse1: any = null
    let agrcResponse2: any = null

    // Try AGRC Endpoint 1: Parcels_Utah_LIR (Land Information Record)
    try {
      // ArcGIS needs single quotes encoded as %27 for URL
      const whereValue = `PARCEL_ID='${serialClean}'`.replace(/'/g, '%27')
      // LIR fields: no OWNER, SITUS_ADDR, SITUS_CITY - use PARCEL_ADD, PARCEL_CITY instead
      const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR'

      const agrcUrl1 = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

      const response1 = await fetch(agrcUrl1, {
        headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
      })

      if (isDebug) {
        results.debug!.agrcEndpoint1 = {
          url: agrcUrl1,
          status: response1.status,
          statusText: response1.statusText
        }
      }

      if (response1.ok) {
        agrcResponse1 = await response1.json()

        if (isDebug) {
          results.debug!.agrcResponse1 = agrcResponse1
        }

        if (agrcResponse1?.features?.length > 0) {
          const feature = agrcResponse1.features[0]
          parcelData = feature
          results.stepsCompleted.push('AGRC Endpoint 1 (LIR) returned parcel data')

          // Extract coordinates from polygon geometry (calculate centroid)
          if (feature.geometry?.rings?.length > 0) {
            const ring = feature.geometry.rings[0]
            const xs = ring.map((p: number[]) => p[0])
            const ys = ring.map((p: number[]) => p[1])
            coordinates = {
              x: xs.reduce((a: number, b: number) => a + b, 0) / xs.length,
              y: ys.reduce((a: number, b: number) => a + b, 0) / ys.length
            }
            results.data.coordinates = coordinates
            results.data.coordinatesSource = 'AGRC LIR Endpoint'
          }

          results.data.agrcData = feature.attributes
        }
      }
    } catch (error) {
      if (isDebug) {
        results.debug!.agrcEndpoint1Error = (error as Error).message
      }
      results.warnings.push(`AGRC Endpoint 1 error: ${(error as Error).message}`)
    }

    // Try AGRC Endpoint 2: Parcels_Utah (fallback)
    if (!parcelData) {
      try {
        const whereValue = `PARCEL_ID='${serialClean}'`.replace(/'/g, '%27')
        // Parcels_Utah fields: OWNERNAME (not OWNER), no SITUS_ADDR/SITUS_CITY
        const outFields = 'PARCEL_ID,OWNERNAME,PARCEL_ADD,PARCEL_CITY,ACCOUNT_NUM'

        const agrcUrl2 = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

        const response2 = await fetch(agrcUrl2, {
          headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
        })

        if (isDebug) {
          results.debug!.agrcEndpoint2 = {
            url: agrcUrl2,
            status: response2.status,
            statusText: response2.statusText
          }
        }

        if (response2.ok) {
          agrcResponse2 = await response2.json()

          if (isDebug) {
            results.debug!.agrcResponse2 = agrcResponse2
          }

          if (agrcResponse2?.features?.length > 0) {
            const feature = agrcResponse2.features[0]
            parcelData = feature
            results.stepsCompleted.push('AGRC Endpoint 2 (Parcels_Utah) returned parcel data')

            // Extract coordinates from polygon geometry (calculate centroid)
            if (feature.geometry?.rings?.length > 0) {
              const ring = feature.geometry.rings[0]
              const xs = ring.map((p: number[]) => p[0])
              const ys = ring.map((p: number[]) => p[1])
              coordinates = {
                x: xs.reduce((a: number, b: number) => a + b, 0) / xs.length,
                y: ys.reduce((a: number, b: number) => a + b, 0) / ys.length
              }
              results.data.coordinates = coordinates
              results.data.coordinatesSource = 'AGRC Parcels_Utah Endpoint'
            }

            results.data.agrcData = feature.attributes
          }
        }
      } catch (error) {
        if (isDebug) {
          results.debug!.agrcEndpoint2Error = (error as Error).message
        }
        results.warnings.push(`AGRC Endpoint 2 error: ${(error as Error).message}`)
      }
    }

    if (!parcelData) {
      results.warnings.push('Both AGRC endpoints failed - using fallback detection')
    }

    // Step 3: Determine jurisdiction
    let isUnincorporated = true
    let jurisdiction = 'Unincorporated Utah County'
    let cityName: string | null = null

    // Check AGRC PARCEL_CITY field first (LIR uses PARCEL_CITY)
    const agrcCity = parcelData?.attributes?.PARCEL_CITY || parcelData?.attributes?.SITUS_CITY || results.data.agrcData?.PARCEL_CITY
    if (agrcCity && agrcCity.trim()) {
      isUnincorporated = false
      cityName = agrcCity.trim().toUpperCase()
      jurisdiction = cityName || 'Incorporated City'
    }
    // Fallback to address parsing
    else if (property.property_address) {
      const addressUpper = property.property_address.toUpperCase()
      for (const city of UTAH_COUNTY_CITIES) {
        if (addressUpper.includes(city)) {
          isUnincorporated = false
          cityName = city
          jurisdiction = city
          break
        }
      }
    }

    results.data.jurisdiction = jurisdiction
    results.data.isUnincorporated = isUnincorporated

    if (!isUnincorporated) {
      results.warnings.push(`Property appears to be in ${cityName} city limits. Municipal zoning applies.`)
    }

    // Step 4: Query Utah County Zoning Identify Service
    let zoneCode: string | null = null
    let zoneName: string | null = null
    let zoningIdentifyResponse: any = null

    if (isUnincorporated && coordinates) {
      try {
        // Calculate extent (buffer around point)
        const extentBuffer = 0.001
        const mapExtent = `${coordinates.x - extentBuffer},${coordinates.y - extentBuffer},${coordinates.x + extentBuffer},${coordinates.y + extentBuffer}`

        const geometry = encodeURIComponent(JSON.stringify({ x: coordinates.x, y: coordinates.y }))
        const mapExtentEncoded = encodeURIComponent(mapExtent)

        const identifyUrl = `https://maps.utahcounty.gov/arcgis/rest/services/CommunityDev-Fire/CountyZoning_wgs84/MapServer/identify?f=json&geometry=${geometry}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=10&mapExtent=${mapExtentEncoded}&imageDisplay=800,600,96&returnGeometry=false`

        const response = await fetch(identifyUrl, {
          headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
        })

        if (isDebug) {
          results.debug!.zoningIdentify = {
            url: identifyUrl,
            status: response.status,
            statusText: response.statusText
          }
        }

        if (response.ok) {
          zoningIdentifyResponse = await response.json()

          if (isDebug) {
            results.debug!.zoningIdentifyResponse = zoningIdentifyResponse
          }

          if (zoningIdentifyResponse?.results?.length > 0) {
            const zoneResult = zoningIdentifyResponse.results[0]
            const attrs = zoneResult.attributes || {}

            // Try different field name patterns (Utah County uses "Zoning Classification" and "Zoning Description")
            zoneCode = attrs['Zoning Classification'] || attrs['ZONECLASS'] || attrs.Zone_Code || attrs.ZONE_CODE || attrs.ZONE || attrs.ZONING || attrs.Code || attrs.zone
            zoneName = attrs['Zoning Description'] || attrs['ZONEDESC'] || attrs.Zone_Name || attrs.ZONE_NAME || attrs.Name || attrs.name

            if (zoneCode) {
              results.stepsCompleted.push(`Utah County Zoning Identify found zone: ${zoneCode}`)
            } else {
              results.warnings.push('Zoning Identify returned results but zone code field not found')
              if (isDebug) {
                results.debug!.zoningIdentifyFields = Object.keys(attrs)
              }
            }
          } else {
            results.warnings.push('Zoning Identify returned no results for these coordinates')
          }
        } else {
          results.warnings.push(`Zoning Identify API returned status ${response.status}`)
        }
      } catch (error) {
        if (isDebug) {
          results.debug!.zoningIdentifyError = (error as Error).message
        }
        results.warnings.push(`Zoning Identify error: ${(error as Error).message}`)
      }
    }

    // Step 4.5: Handle city jurisdictions with manual guidance
    let cityPlanningUrl = ''
    let cityGuidanceNotes = ''
    let cityNextSteps = ''

    if (!isUnincorporated) {
      cityPlanningUrl = CITY_PLANNING_URLS[cityName || ''] || ''
      results.stepsCompleted.push(`Property is in ${cityName} city limits - municipal zoning applies`)
      results.warnings.push(`${cityName} city zoning requires manual lookup via planning department`)

      // Set city-specific guidance
      zoneCode = null
      zoneName = `City jurisdiction - see ${cityName} Planning Dept`
      cityGuidanceNotes = `Property is within ${cityName} city limits. Utah County zoning does not apply. Verify zoning at: ${cityPlanningUrl || 'city planning department website'}`
      cityNextSteps = `1. Visit ${cityPlanningUrl || 'the city planning website'} to look up zoning by address.
2. Search parcel ${property.parcel_number}${property.property_address ? ` or address ${property.property_address}` : ''}.
3. Note the zone code and permitted uses.
4. Update this record manually using Edit Zoning.`

      results.data.cityPlanningUrl = cityPlanningUrl
    }

    // Step 5: Look up zone rules from local table
    const zoneRules = zoneCode ? getZoneRules(zoneCode) : null
    results.data.zoneRules = zoneRules

    if (zoneRules) {
      results.stepsCompleted.push(`Found zone rules for ${zoneCode}`)
    } else if (zoneCode) {
      results.warnings.push(`Zone code ${zoneCode} not in local lookup table - manual verification needed`)
    }

    // Step 6: Calculate acres
    const acres = property.lot_size_sqft
      ? property.lot_size_sqft / 43560
      : (parcelData?.attributes?.PARCEL_ACRES || parcelData?.attributes?.ACREAGE || 0)

    // Step 6.5: Update property fields from AGRC LIR data if empty
    const agrcAttrs = parcelData?.attributes || {}
    const propertyUpdates: any = {}

    // Update estimated_market_value from TOTAL_MKT_VALUE if empty
    if ((!property.estimated_market_value || property.estimated_market_value === 0) && agrcAttrs.TOTAL_MKT_VALUE) {
      propertyUpdates.estimated_market_value = Math.round(agrcAttrs.TOTAL_MKT_VALUE)
      results.stepsCompleted.push(`Updated market value: $${propertyUpdates.estimated_market_value.toLocaleString()}`)
    }

    // Update building_sqft from BLDG_SQFT if empty
    if ((!property.building_sqft || property.building_sqft === 0) && agrcAttrs.BLDG_SQFT) {
      propertyUpdates.building_sqft = Math.round(agrcAttrs.BLDG_SQFT)
      results.stepsCompleted.push(`Updated building sqft: ${propertyUpdates.building_sqft.toLocaleString()}`)
    }

    // Update year_built from BUILT_YR if empty
    if (!property.year_built && agrcAttrs.BUILT_YR) {
      propertyUpdates.year_built = agrcAttrs.BUILT_YR
      results.stepsCompleted.push(`Updated year built: ${propertyUpdates.year_built}`)
    }

    // Update lot_size_sqft from PARCEL_ACRES if empty
    if ((!property.lot_size_sqft || property.lot_size_sqft === 0) && agrcAttrs.PARCEL_ACRES) {
      propertyUpdates.lot_size_sqft = Math.round(agrcAttrs.PARCEL_ACRES * 43560)
      results.stepsCompleted.push(`Updated lot size: ${propertyUpdates.lot_size_sqft.toLocaleString()} sqft`)
    }

    // Apply property updates if any
    if (Object.keys(propertyUpdates).length > 0) {
      try {
        await prisma.property.update({
          where: { id },
          data: propertyUpdates
        })
        results.data.propertyUpdates = propertyUpdates
      } catch (error) {
        results.warnings.push(`Could not update property fields: ${(error as Error).message}`)
      }
    }

    // Step 7: Generate use ideas
    const propertyCharacteristics = {
      propertyType: property.property_type,
      zoneCode: zoneCode || '',
      acres: acres,
      lotSizeSqft: property.lot_size_sqft,
      hasAddress: !!property.property_address,
      ownerName: property.owner_name,
      isInCity: !isUnincorporated,
      cityName: cityName,
      slopePercent: null,
      hasUtilities: true,
      isLikelyCondo: property.property_type === 'condo'
    }

    const useIdeas = generateUseIdeas(propertyCharacteristics)
    results.stepsCompleted.push('Generated use ideas')
    results.data.useIdeas = useIdeas

    // Step 8: Calculate buildability score
    const buildabilityScore = calculateBuildabilityScore(propertyCharacteristics)
    results.data.buildabilityScore = buildabilityScore

    // Step 9: Prepare ZoningProfile data
    const zoningProfileData: any = {
      property_id: id,
      jurisdiction,
      is_unincorporated: isUnincorporated,
      zoning_code: zoneCode,
      zoning_name: zoneName || zoneRules?.name || null,
      land_use_designation: zoneRules?.category || null,
      permitted_uses: useIdeas.ideas.length > 0 ? JSON.stringify(useIdeas.ideas.slice(0, 4)) : null,
      conditional_uses: zoneRules?.conditionalUses ? JSON.stringify(zoneRules.conditionalUses) : null,
      prohibited_uses: useIdeas.redFlags.length > 0 ? JSON.stringify(useIdeas.redFlags.slice(0, 3)) : null,
      min_lot_size_acres: zoneRules?.minLotSizeAcres || null,
      min_lot_size_sqft: zoneRules?.minLotSizeSqft || null,
      front_setback_ft: zoneRules?.frontSetbackFt || null,
      side_setback_ft: zoneRules?.sideSetbackFt || null,
      rear_setback_ft: zoneRules?.rearSetbackFt || null,
      max_height_ft: zoneRules?.maxHeightFt || null,
      max_height_stories: zoneRules?.maxHeightStories || null,
      max_lot_coverage_percent: zoneRules?.maxLotCoveragePercent || null,
      has_slope_restrictions: zoneRules?.hasSlopeRestrictions || false,
      has_floodplain_restrictions: zoneRules?.hasFloodplainRestrictions || false,
      has_wildfire_restrictions: false,
      has_legal_access: propertyCharacteristics.hasAddress,
      access_type: propertyCharacteristics.hasAddress ? 'road' : 'unknown',
      utilities_status: 'available',
      buildability_score: buildabilityScore,
      buildability_notes: cityGuidanceNotes || (useIdeas.redFlags.length > 0
        ? `Red Flags: ${useIdeas.redFlags.join('; ')}. ${useIdeas.opportunities.length > 0 ? 'Opportunities: ' + useIdeas.opportunities.join('; ') : ''}`
        : useIdeas.opportunities.length > 0
          ? 'Opportunities: ' + useIdeas.opportunities.join('; ')
          : 'No major constraints identified.'),
      best_use_ideas: JSON.stringify(useIdeas.ideas),
      use_difficulty: cityGuidanceNotes ? 'manual_verification_required' : useIdeas.difficulty,
      estimated_time_to_entitlement: cityGuidanceNotes ? 'Unknown - requires city planning dept inquiry' : useIdeas.estimatedTimeToEntitlement,
      next_steps: cityNextSteps || useIdeas.nextSteps,
      zoning_map_url: 'https://maps.utahcounty.gov/CommDev/Zoning/Zoning.html',
      data_last_verified: new Date()
    }

    // Step 10: Save to database
    try {
      const existing = await prisma.zoningProfile.findUnique({
        where: { property_id: id }
      })

      let savedProfile
      if (existing) {
        savedProfile = await prisma.zoningProfile.update({
          where: { property_id: id },
          data: zoningProfileData
        })
        results.stepsCompleted.push('Updated existing ZoningProfile')
      } else {
        savedProfile = await prisma.zoningProfile.create({
          data: zoningProfileData
        })
        results.stepsCompleted.push('Created new ZoningProfile')
      }

      results.data.savedProfile = savedProfile
    } catch (error) {
      results.errors.push(`Database save error: ${(error as Error).message}`)
    }

    // Step 11: Fetch property images (Street View) if we have coordinates
    // This runs in parallel with other operations and won't block the response
    if (coordinates && !property.photo_url) {
      try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY
        if (apiKey) {
          const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${coordinates.y},${coordinates.x}&fov=80&pitch=0&key=${apiKey}`
          const aerialUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.y},${coordinates.x}&zoom=18&size=400x300&maptype=satellite&key=${apiKey}`

          await prisma.property.update({
            where: { id },
            data: {
              photo_url: streetViewUrl,
              aerial_url: aerialUrl,
              photo_date: new Date().toISOString()
            }
          })

          results.stepsCompleted.push('Generated Street View and aerial images')
          results.data.images = { streetViewUrl, aerialUrl }
        } else {
          results.warnings.push('GOOGLE_MAPS_API_KEY not set - skipping image generation')
        }
      } catch (imageError) {
        results.warnings.push(`Could not generate images: ${(imageError as Error).message}`)
      }
    }

    // Return results
    return NextResponse.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0
        ? 'Zoning data auto-filled successfully'
        : 'Zoning data partially filled with errors',
      results,
      zoningProfile: zoningProfileData
    })

  } catch (error) {
    console.error('Auto-fill zoning error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-fill zoning data', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Helper to format city name for display
function formatCityName(cityName: string): string {
  return cityName.split(' ').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ')
}
