import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Generate Google Street View URL from coordinates
function generateStreetViewUrl(lat: number, lng: number, size: string = '400x300'): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  // Using location-based lookup (more reliable than address-based)
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&fov=80&pitch=0&key=${apiKey}`
}

// Generate aerial/satellite view URL from coordinates
function generateAerialUrl(lat: number, lng: number, zoom: number = 18): string {
  // Using Google Static Maps for aerial view
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=400x300&maptype=satellite&key=${apiKey}`
}

// Fetch coordinates from AGRC LIR API
async function fetchCoordinatesFromAGRC(parcelNumber: string): Promise<{ lat: number; lng: number } | null> {
  const serialClean = parcelNumber.replace(/[^0-9]/g, '')

  try {
    // Try AGRC LIR Endpoint first
    const whereValue = `PARCEL_ID='${serialClean}'`.replace(/'/g, '%27')
    const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY'

    const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

    const response = await fetch(agrcUrl, {
      headers: { 'User-Agent': 'TaxProperty-Utah/1.0' },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data?.features?.length > 0) {
      const feature = data.features[0]

      // Extract coordinates from polygon geometry (calculate centroid)
      if (feature.geometry?.rings?.length > 0) {
        const ring = feature.geometry.rings[0]
        const xs = ring.map((p: number[]) => p[0])
        const ys = ring.map((p: number[]) => p[1])
        const lat = ys.reduce((a: number, b: number) => a + b, 0) / ys.length
        const lng = xs.reduce((a: number, b: number) => a + b, 0) / xs.length

        return { lat, lng }
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching coordinates from AGRC:', error)
    return null
  }
}

// GET /api/properties/[id]/images
// Returns image URLs for a property (generates if needed)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get property from database
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        photo_url: true,
        aerial_url: true
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // If we already have images, return them
    if (property.photo_url) {
      return NextResponse.json({
        propertyId: id,
        parcelNumber: property.parcel_number,
        streetViewUrl: property.photo_url,
        aerialUrl: property.aerial_url,
        cached: true
      })
    }

    // Need to generate images - first get coordinates
    const coordinates = await fetchCoordinatesFromAGRC(property.parcel_number)

    if (!coordinates) {
      return NextResponse.json({
        error: 'Could not fetch coordinates for property',
        propertyId: id,
        parcelNumber: property.parcel_number,
        hasAddress: !!property.property_address
      }, { status: 404 })
    }

    // Check for API key
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({
        error: 'GOOGLE_MAPS_API_KEY not configured',
        message: 'Please set GOOGLE_MAPS_API_KEY environment variable'
      }, { status: 503 })
    }

    // Generate image URLs
    const streetViewUrl = generateStreetViewUrl(coordinates.lat, coordinates.lng)
    const aerialUrl = generateAerialUrl(coordinates.lat, coordinates.lng)

    // Update property in database (cache the URLs)
    await prisma.property.update({
      where: { id },
      data: {
        photo_url: streetViewUrl,
        aerial_url: aerialUrl,
        photo_date: new Date().toISOString()
      }
    })

    return NextResponse.json({
      propertyId: id,
      parcelNumber: property.parcel_number,
      streetViewUrl,
      aerialUrl,
      coordinates,
      cached: false
    })

  } catch (error) {
    console.error('Error generating property images:', error)
    return NextResponse.json(
      { error: 'Failed to generate images', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/properties/[id]/images
// Force regeneration of images
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get property from database
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        parcel_number: true,
        property_address: true
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check for API key
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({
        error: 'GOOGLE_MAPS_API_KEY not configured',
        message: 'Please set GOOGLE_MAPS_API_KEY environment variable'
      }, { status: 503 })
    }

    // Fetch fresh coordinates
    const coordinates = await fetchCoordinatesFromAGRC(property.parcel_number)

    if (!coordinates) {
      return NextResponse.json({
        error: 'Could not fetch coordinates for property',
        propertyId: id,
        parcelNumber: property.parcel_number
      }, { status: 404 })
    }

    // Generate new image URLs
    const streetViewUrl = generateStreetViewUrl(coordinates.lat, coordinates.lng)
    const aerialUrl = generateAerialUrl(coordinates.lat, coordinates.lng)

    // Update property in database
    await prisma.property.update({
      where: { id },
      data: {
        photo_url: streetViewUrl,
        aerial_url: aerialUrl,
        photo_date: new Date().toISOString()
      }
    })

    return NextResponse.json({
      propertyId: id,
      parcelNumber: property.parcel_number,
      streetViewUrl,
      aerialUrl,
      coordinates,
      cached: false,
      regenerated: true
    })

  } catch (error) {
    console.error('Error regenerating property images:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate images', details: (error as Error).message },
      { status: 500 }
    )
  }
}
