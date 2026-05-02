// Generic Property Enrichment API
// Uses CountyAdapter pattern to enrich properties from any county

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCountyAdapter, CountyId } from '@/lib/counties'
import { geocodeAddress, generateStreetViewUrl, generateAerialUrl } from '@/lib/geocoding'

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

    // Step 1: Get property
    const property = await prisma.property.findUnique({
      where: { id },
      include: { sources: true }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    results.stepsCompleted.push('Found property in database')
    results.data.parcelNumber = property.parcel_number
    results.data.county = property.county

    // Step 2: Get the appropriate county adapter
    const adapter = getCountyAdapter(property.county as CountyId)
    results.stepsCompleted.push(`Using ${adapter.name} adapter`)

    // Step 3: Run county-specific enrichment
    const enrichmentInput = {
      id: property.id,
      parcel_number: property.parcel_number,
      county: property.county as CountyId,
      property_address: property.property_address,
      city: property.property_address?.split(',')[1]?.trim() || null,
      owner_name: property.owner_name,
      assessed_value: property.assessed_value,
      total_amount_due: property.total_amount_due,
      legal_description: property.legal_description
    }

    const enrichmentResult = await adapter.enrichProperty(enrichmentInput)
    results.stepsCompleted.push('County adapter enrichment completed')
    results.data.enrichment = enrichmentResult

    // Step 4: Geocode if we have address but no coordinates
    let coordinates: { latitude: number; longitude: number } | null = null

    if (!enrichmentResult.latitude && !enrichmentResult.longitude && property.property_address) {
      results.stepsCompleted.push('No coordinates from adapter - attempting geocoding')

      const geoResult = await geocodeAddress(
        property.property_address,
        undefined,
        'Utah'
      )

      if (geoResult) {
        coordinates = {
          latitude: geoResult.latitude,
          longitude: geoResult.longitude
        }
        enrichmentResult.latitude = geoResult.latitude
        enrichmentResult.longitude = geoResult.longitude
        enrichmentResult.confidence = Math.min(enrichmentResult.confidence || 50, 60)
        enrichmentResult.notes = (enrichmentResult.notes || '') + 'Coordinates from geocoding. '
        results.stepsCompleted.push(`Geocoded to ${geoResult.latitude}, ${geoResult.longitude}`)
      } else {
        results.warnings.push('Geocoding failed - no coordinates available')
      }
    } else if (enrichmentResult.latitude && enrichmentResult.longitude) {
      coordinates = {
        latitude: enrichmentResult.latitude,
        longitude: enrichmentResult.longitude
      }
    }

    // Step 5: Generate images if we have coordinates
    if (coordinates) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY
      if (apiKey) {
        try {
          const streetViewUrl = generateStreetViewUrl(
            coordinates.latitude,
            coordinates.longitude,
            apiKey
          )
          const aerialUrl = generateAerialUrl(
            coordinates.latitude,
            coordinates.longitude,
            apiKey
          )

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
        } catch (imageError) {
          results.warnings.push(`Could not generate images: ${(imageError as Error).message}`)
        }
      } else {
        results.warnings.push('GOOGLE_MAPS_API_KEY not set - skipping image generation')
      }
    }

    // Step 6: Update property with enrichment data
    const propertyUpdates: any = {}

    if (enrichmentResult.estimated_market_value && enrichmentResult.estimated_market_value > 0) {
      propertyUpdates.estimated_market_value = enrichmentResult.estimated_market_value
      results.stepsCompleted.push(`Updated market value: $${enrichmentResult.estimated_market_value.toLocaleString()}`)
    }

    if (enrichmentResult.building_sqft && enrichmentResult.building_sqft > 0) {
      propertyUpdates.building_sqft = enrichmentResult.building_sqft
      results.stepsCompleted.push(`Updated building sqft: ${enrichmentResult.building_sqft.toLocaleString()}`)
    }

    if (enrichmentResult.year_built) {
      propertyUpdates.year_built = enrichmentResult.year_built
      results.stepsCompleted.push(`Updated year built: ${enrichmentResult.year_built}`)
    }

    if (enrichmentResult.lot_size_sqft && enrichmentResult.lot_size_sqft > 0) {
      propertyUpdates.lot_size_sqft = enrichmentResult.lot_size_sqft
      results.stepsCompleted.push(`Updated lot size: ${enrichmentResult.lot_size_sqft.toLocaleString()} sqft`)
    }

    if (coordinates) {
      propertyUpdates.latitude = coordinates.latitude
      propertyUpdates.longitude = coordinates.longitude
    }

    // Apply property updates
    if (Object.keys(propertyUpdates).length > 0) {
      try {
        await prisma.property.update({
          where: { id },
          data: propertyUpdates
        })
        results.data.propertyUpdates = propertyUpdates
      } catch (error) {
        results.errors.push(`Could not update property fields: ${(error as Error).message}`)
      }
    }

    // Step 7: Create or update ZoningProfile
    try {
      const existingProfile = await prisma.zoningProfile.findUnique({
        where: { property_id: id }
      })

      const jurisdiction = enrichmentResult.jurisdiction ||
        property.property_address?.split(',')[1]?.trim() ||
        'Unknown'

      const zoningProfileData: any = {
        property_id: id,
        jurisdiction: jurisdiction,
        is_unincorporated: enrichmentResult.jurisdiction_type === 'county',
        zoning_code: enrichmentResult.zoning || null,
        zoning_name: enrichmentResult.zoning_description || null,
        data_last_verified: new Date(),
        notes: `Enriched via ${adapter.name}. Confidence: ${enrichmentResult.confidence || 50}%. Source: ${enrichmentResult.data_source || 'County Adapter'}. ${enrichmentResult.notes || ''}`.trim()
      }

      if (existingProfile) {
        await prisma.zoningProfile.update({
          where: { property_id: id },
          data: zoningProfileData
        })
        results.stepsCompleted.push('Updated existing ZoningProfile')
      } else {
        await prisma.zoningProfile.create({
          data: zoningProfileData
        })
        results.stepsCompleted.push('Created new ZoningProfile')
      }

      results.data.zoningProfile = zoningProfileData
    } catch (error) {
      results.errors.push(`ZoningProfile save error: ${(error as Error).message}`)
    }

    // Step 8: Save enrichment data to Source table
    try {
      await prisma.source.create({
        data: {
          property_id: id,
          source_type: 'county_adapter',
          label: `${adapter.name} Enrichment`,
          url: enrichmentResult.data_source
            ? `https://opendata.gis.utah.gov/`
            : null
        }
      })
      results.stepsCompleted.push('Saved enrichment source data')
    } catch (error) {
      results.warnings.push(`Could not save source: ${(error as Error).message}`)
    }

    // Return results
    return NextResponse.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0
        ? 'Property enriched successfully'
        : 'Property partially enriched with errors',
      results,
      enrichment: enrichmentResult
    })

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich property', details: (error as Error).message },
      { status: 500 }
    )
  }
}
