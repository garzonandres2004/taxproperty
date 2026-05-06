// Phase 3: enrichLocation
// Enrich property with coordinates, photos, and geographic context

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'
import { geocodeAddress, generateStreetViewUrl, generateAerialUrl } from '@/lib/geocoding'
import { scanAndRecordDataGaps } from '../data-gaps'

export interface LocationPhaseOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Location Phase: Enrich coordinates and images
 *
 * Sources:
 * 1. AGRC polygon centroid (automatic from physical phase)
 * 2. Google Geocoding API (fallback)
 * 3. Street View / Aerial images (Google Maps API)
 *
 * Fields populated:
 * - latitude, longitude
 * - photo_url (Street View)
 * - aerial_url (satellite)
 * - jurisdiction (city/unincorporated)
 */
export async function runLocationPhase(
  prisma: PrismaClient,
  propertyId: string,
  options: LocationPhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'location',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { zoningProfile: true }
    })

    if (!property) {
      throw new Error(`Property not found: ${propertyId}`)
    }

    const updates: any = {}
    let coordinates: { latitude: number; longitude: number } | null = null

    // Check if we already have coordinates from AGRC
    if (property.latitude && property.longitude) {
      coordinates = { latitude: property.latitude, longitude: property.longitude }
      result.notes.push('Using existing coordinates from AGRC')
    }
    // Try geocoding if we have address
    else if (property.property_address) {
      try {
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
          updates.latitude = geoResult.latitude
          updates.longitude = geoResult.longitude
          result.fieldsSet.push('latitude', 'longitude')
          result.notes.push('Coordinates from geocoding')
        }
      } catch (error) {
        result.notes.push(`Geocoding failed: ${(error as Error).message}`)
      }
    }

    // Generate images if we have coordinates and API key
    if (coordinates) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY

      if (apiKey && !dryRun) {
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

          updates.photo_url = streetViewUrl
          updates.aerial_url = aerialUrl
          updates.photo_date = new Date().toISOString()

          result.fieldsSet.push('photo_url', 'aerial_url')
          result.notes.push('Generated Street View and aerial images')
        } catch (imageError) {
          result.notes.push(`Image generation failed: ${(imageError as Error).message}`)
        }
      } else if (!apiKey) {
        result.notes.push('GOOGLE_MAPS_API_KEY not set - skipping image generation')
      }
    }

    // Update property
    if (!dryRun && Object.keys(updates).length > 0) {
      await prisma.property.update({
        where: { id: propertyId },
        data: updates
      })
    }

    // Update ZoningProfile jurisdiction if available
    const jurisdiction = property.zoningProfile?.jurisdiction ||
                        property.property_address?.split(',')[1]?.trim() ||
                        'Unknown'

    if (jurisdiction !== 'Unknown' && property.zoningProfile && !dryRun) {
      await prisma.zoningProfile.update({
        where: { property_id: propertyId },
        data: { jurisdiction }
      })
    }

    // Scan for location gaps
    const updatedProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        estimated_market_value: true,
        assessed_value: true,
        year_built: true,
        building_sqft: true,
        lot_size_sqft: true,
        property_type: true,
        occupancy_status: true,
        latitude: true,
        longitude: true,
        property_address: true,
        zoning: true,
        title_risk: true,
        county: true
      }
    })

    if (updatedProperty) {
      const gaps = await scanAndRecordDataGaps(prisma, propertyId, updatedProperty as any)
      const locationGaps = gaps.filter(g => g.phase === 'location')
      result.dataGapsRecorded = locationGaps.map(g => `${g.phase}:${g.field}`)

      if (locationGaps.length > 0) {
        result.status = 'partial'
        result.notes.push(`${locationGaps.length} location gaps recorded`)
      }
    }

    if (verbose) {
      console.log(`[Location Phase] ${property.county}/${property.parcel_number}: ${result.fieldsSet.length} fields`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
