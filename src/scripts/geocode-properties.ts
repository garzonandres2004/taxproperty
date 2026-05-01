/**
 * Geocode all properties using Google Geocoding API
 * This populates latitude/longitude for Street View images
 */

import { prisma } from '@/lib/db'

interface GeocodeResult {
  latitude: number
  longitude: number
}

/**
 * Clean HTML entities from address
 */
function sanitizeAddress(address: string): string {
  return address
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Geocode a single address using Google Geocoding API
 */
async function geocodeAddress(address: string | null): Promise<GeocodeResult | null> {
  if (!address) return null

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('No Google Maps API key found')
    return null
  }

  try {
    // Clean up the address for geocoding
    const cleanAddr = sanitizeAddress(address)

    // Skip if no meaningful address
    if (!cleanAddr || cleanAddr.length < 3) {
      console.log(`  Skipping - insufficient address data`)
      return null
    }

    // Add Utah to help with geocoding accuracy
    const fullAddress = cleanAddr.includes(', UT') || cleanAddr.endsWith('UT')
      ? cleanAddr
      : cleanAddr.includes(' - ')
        ? cleanAddr.replace(' - ', ', ') + ', UT'
        : cleanAddr + ', UT'

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      console.warn(`  Geocoding failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        latitude: location.lat,
        longitude: location.lng
      }
    }

    console.log(`  Google API status: ${data.status}`)
    return null
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error)
    return null
  }
}

async function geocodeAllProperties() {
  console.log('Fetching properties without coordinates...')

  const properties = await prisma.property.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null }
      ]
    },
    select: {
      id: true,
      parcel_number: true,
      property_address: true
    }
  })

  console.log(`Found ${properties.length} properties to geocode`)

  let success = 0
  let failed = 0

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    console.log(`[${i + 1}/${properties.length}] Geocoding ${property.parcel_number}...`)

    if (!property.property_address) {
      console.log(`  Skipping - no address`)
      failed++
      continue
    }

    const result = await geocodeAddress(property.property_address)

    if (result) {
      await prisma.property.update({
        where: { id: property.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude
        }
      })
      console.log(`  ✓ Success: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`)
      success++
    } else {
      console.log(`  ✗ Failed to geocode`)
      failed++
    }

    // Rate limiting - Google has quota limits
    if (i < properties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Success: ${success}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${properties.length}`)

  await prisma.$disconnect()
}

// Run if called directly
if (require.main === module) {
  geocodeAllProperties().catch(e => {
    console.error(e)
    process.exit(1)
  })
}

export { geocodeAddress }
