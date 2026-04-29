#!/usr/bin/env tsx
/**
 * Batch script to fetch Street View images for all properties
 * Usage: npx tsx scripts/fetch-all-images.ts
 * Or:    npm run fetch-images (after adding to package.json)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fetch coordinates from AGRC LIR API
async function fetchCoordinatesFromAGRC(parcelNumber: string): Promise<{ lat: number; lng: number } | null> {
  const serialClean = parcelNumber.replace(/[^0-9]/g, '')

  try {
    const whereValue = `PARCEL_ID='${serialClean}'`.replace(/'/g, '%27')
    const outFields = 'PARCEL_ID,SERIAL_NUM'

    const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`

    const response = await fetch(agrcUrl, {
      headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
    })

    if (!response.ok) {
      console.error(`AGRC API error for ${parcelNumber}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data?.features?.length > 0) {
      const feature = data.features[0]

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
    console.error(`Error fetching coordinates for ${parcelNumber}:`, error)
    return null
  }
}

// Generate Street View URL
function generateStreetViewUrl(lat: number, lng: number, apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${lat},${lng}&fov=80&pitch=0&key=${apiKey}`
}

// Generate Aerial URL
function generateAerialUrl(lat: number, lng: number, apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=400x300&maptype=satellite&key=${apiKey}`
}

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log('=== TaxProperty Image Fetcher ===\n')

  // Check for API key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('ERROR: GOOGLE_MAPS_API_KEY environment variable not set')
    console.error('\nSet it with: export GOOGLE_MAPS_API_KEY=your_key_here')
    console.error('Or create .env.local file with GOOGLE_MAPS_API_KEY=your_key_here')
    process.exit(1)
  }

  // Get all properties without images
  const properties = await prisma.property.findMany({
    where: {
      is_seed: false,
      photo_url: null
    },
    select: {
      id: true,
      parcel_number: true,
      property_address: true
    }
  })

  console.log(`Found ${properties.length} properties without images\n`)

  if (properties.length === 0) {
    console.log('All properties already have images. Nothing to do.')
    await prisma.$disconnect()
    return
  }

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  // Process each property
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const progress = `[${i + 1}/${properties.length}]`

    console.log(`${progress} Processing ${property.parcel_number}...`)

    try {
      // Fetch coordinates from AGRC
      const coordinates = await fetchCoordinatesFromAGRC(property.parcel_number)

      if (!coordinates) {
        console.log(`  ⚠ No coordinates found for ${property.parcel_number}`)
        skippedCount++
        continue
      }

      // Generate image URLs
      const streetViewUrl = generateStreetViewUrl(coordinates.lat, coordinates.lng, apiKey)
      const aerialUrl = generateAerialUrl(coordinates.lat, coordinates.lng, apiKey)

      // Update database
      await prisma.property.update({
        where: { id: property.id },
        data: {
          photo_url: streetViewUrl,
          aerial_url: aerialUrl,
          photo_date: new Date().toISOString()
        }
      })

      console.log(`  ✓ Images saved for ${property.parcel_number}`)
      successCount++

      // Rate limiting: wait 200ms between requests to avoid hitting API limits
      // Google Street View Static API has generous limits but let's be safe
      await sleep(200)

    } catch (error) {
      console.error(`  ✗ Error processing ${property.parcel_number}:`, error)
      errorCount++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Total properties processed: ${properties.length}`)
  console.log(`Successful: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Skipped (no coordinates): ${skippedCount}`)

  await prisma.$disconnect()
}

// Run the script
main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })