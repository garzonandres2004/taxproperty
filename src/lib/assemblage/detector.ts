// Assemblage Detection System
// Identifies adjacent parcels for micro-parcel opportunities

import { prisma } from '@/lib/db'

const AGRC_LIR_URL = 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Utah_Parcels/FeatureServer/0'

export interface AdjacentParcelInfo {
  parcelNumber: string
  isInTaxSale: boolean
  distanceMeters?: number
}

export interface AssemblageResult {
  hasAssemblagePotential: boolean
  adjacentParcels: AdjacentParcelInfo[]
  taxSaleAdjacentParcels: AdjacentParcelInfo[]
}

/**
 * Query AGRC for parcel geometry by parcel number
 */
async function queryParcelGeometry(parcelNumber: string): Promise<{ x: number; y: number } | null> {
  try {
    // Utah County parcel numbers are in format NN:NNN:NNNN
    // AGRC uses a normalized format without colons
    const normalizedParcel = parcelNumber.replace(/:/g, '')

    const url = `${AGRC_LIR_URL}/query?where=PARCEL_ID='${normalizedParcel}'&outFields=PARCEL_ID&returnGeometry=true&f=json`

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`AGRC query failed for parcel ${parcelNumber}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      console.log(`No geometry found for parcel ${parcelNumber}`)
      return null
    }

    const geometry = data.features[0].geometry
    return { x: geometry.x, y: geometry.y }
  } catch (error) {
    console.error(`Error querying parcel geometry for ${parcelNumber}:`, error)
    return null
  }
}

/**
 * Query AGRC for parcels within a buffer distance
 */
async function queryParcelsWithinBuffer(
  x: number,
  y: number,
  distanceMeters: number = 100
): Promise<Array<{ parcelNumber: string; distance?: number }>> {
  try {
    // Create a buffer geometry (point buffer)
    const geometry = JSON.stringify({
      x,
      y,
      spatialReference: { wkid: 3857 }
    })

    const url = `${AGRC_LIR_URL}/query?where=1=1&geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryPoint&inSR=3857&spatialRel=esriSpatialRelIntersects&distance=${distanceMeters}&units=esriSRUnit_Meter&outFields=PARCEL_ID&returnGeometry=false&f=json`

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`AGRC buffer query failed: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return []
    }

    return data.features
      .map((feature: any) => {
        const parcelId = feature.attributes.PARCEL_ID
        // Convert normalized parcel ID back to format with colons
        // AGRC returns as "1234567890", we want "12:345:6789"
        if (parcelId && parcelId.length >= 9) {
          const formatted = `${parcelId.slice(0, 2)}:${parcelId.slice(2, 5)}:${parcelId.slice(5, 9)}`
          return { parcelNumber: formatted }
        }
        return null
      })
      .filter((p: any): p is { parcelNumber: string } => p !== null)
  } catch (error) {
    console.error('Error querying parcels within buffer:', error)
    return []
  }
}

/**
 * Check which parcels from a list exist in the tax sale database
 */
async function findParcelsInTaxSale(parcelNumbers: string[]): Promise<Set<string>> {
  const existingParcels = await prisma.property.findMany({
    where: {
      parcel_number: {
        in: parcelNumbers
      }
    },
    select: {
      parcel_number: true
    }
  })

  return new Set(existingParcels.map(p => p.parcel_number))
}

/**
 * Detect assemblage opportunities for a property
 */
export async function detectAssemblageOpportunities(
  propertyId: string,
  parcelNumber: string
): Promise<AssemblageResult> {
  // Clear existing adjacent parcels for this property
  await prisma.adjacentParcel.deleteMany({
    where: { property_id: propertyId }
  })

  // Get parcel geometry from AGRC
  const geometry = await queryParcelGeometry(parcelNumber)
  if (!geometry) {
    return {
      hasAssemblagePotential: false,
      adjacentParcels: [],
      taxSaleAdjacentParcels: []
    }
  }

  // Find parcels within 100 meters
  const nearbyParcels = await queryParcelsWithinBuffer(geometry.x, geometry.y, 100)

  // Filter out the property itself
  const adjacentParcels = nearbyParcels.filter(p => p.parcelNumber !== parcelNumber)

  if (adjacentParcels.length === 0) {
    return {
      hasAssemblagePotential: false,
      adjacentParcels: [],
      taxSaleAdjacentParcels: []
    }
  }

  // Check which adjacent parcels are in the tax sale
  const parcelNumbers = adjacentParcels.map(p => p.parcelNumber)
  const taxSaleParcels = await findParcelsInTaxSale(parcelNumbers)

  // Build result with tax sale status
  const parcelsWithStatus: AdjacentParcelInfo[] = adjacentParcels.map(p => ({
    parcelNumber: p.parcelNumber,
    isInTaxSale: taxSaleParcels.has(p.parcelNumber),
    distanceMeters: p.distance
  }))

  const taxSaleAdjacentParcels = parcelsWithStatus.filter(p => p.isInTaxSale)

  // Store adjacent parcels in database
  await Promise.all(
    parcelsWithStatus.map(p =>
      prisma.adjacentParcel.create({
        data: {
          property_id: propertyId,
          adjacent_parcel_number: p.parcelNumber,
          is_in_tax_sale: p.isInTaxSale,
          distance_meters: p.distanceMeters
        }
      })
    )
  )

  return {
    hasAssemblagePotential: parcelsWithStatus.length > 0,
    adjacentParcels: parcelsWithStatus,
    taxSaleAdjacentParcels
  }
}

/**
 * Get stored adjacent parcels for a property
 */
export async function getAdjacentParcels(propertyId: string): Promise<AdjacentParcelInfo[]> {
  const adjacentParcels = await prisma.adjacentParcel.findMany({
    where: { property_id: propertyId },
    orderBy: { distance_meters: 'asc' }
  })

  return adjacentParcels.map(p => ({
    parcelNumber: p.adjacent_parcel_number,
    isInTaxSale: p.is_in_tax_sale,
    distanceMeters: p.distance_meters || undefined
  }))
}

/**
 * Batch detect assemblage opportunities for multiple properties
 */
export async function batchDetectAssemblage(
  properties: Array<{ id: string; parcel_number: string }>
): Promise<Map<string, AssemblageResult>> {
  const results = new Map<string, AssemblageResult>()

  // Process sequentially to avoid rate limiting
  for (const property of properties) {
    try {
      const result = await detectAssemblageOpportunities(property.id, property.parcel_number)
      results.set(property.id, result)

      // Update property assemblage_opportunity flag
      await prisma.property.update({
        where: { id: property.id },
        data: {
          assemblage_opportunity: result.taxSaleAdjacentParcels.length > 0
        }
      })
    } catch (error) {
      console.error(`Error detecting assemblage for ${property.parcel_number}:`, error)
      results.set(property.id, {
        hasAssemblagePotential: false,
        adjacentParcels: [],
        taxSaleAdjacentParcels: []
      })
    }
  }

  return results
}

/**
 * Detect assemblage for all micro-parcels in the database
 */
export async function detectAssemblageForMicroParcels(): Promise<number> {
  // Find all micro-parcels (lot_size_sqft < 2000, not condos)
  const microParcels = await prisma.property.findMany({
    where: {
      lot_size_sqft: { lt: 2000 },
      property_type: { not: 'condo' },
      is_seed: false
    },
    select: {
      id: true,
      parcel_number: true
    }
  })

  console.log(`Found ${microParcels.length} micro-parcels to check for assemblage`)

  let processed = 0
  for (const property of microParcels) {
    try {
      await detectAssemblageOpportunities(property.id, property.parcel_number)
      processed++
    } catch (error) {
      console.error(`Failed to process ${property.parcel_number}:`, error)
    }
  }

  return processed
}
