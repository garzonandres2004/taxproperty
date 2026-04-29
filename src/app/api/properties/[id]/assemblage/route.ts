import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { detectAssemblageOpportunities } from '@/lib/assemblage/detector'

// GET /api/properties/[id]/assemblage
// Returns adjacent parcels for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adjacentParcels = await prisma.adjacentParcel.findMany({
      where: { property_id: id },
      orderBy: { distance_meters: 'asc' }
    })

    // Also get the property info for adjacent parcels that are in tax sale
    const adjacentParcelNumbers = adjacentParcels.map(p => p.adjacent_parcel_number)
    const taxSaleProperties = await prisma.property.findMany({
      where: {
        parcel_number: { in: adjacentParcelNumbers },
        is_seed: false
      },
      select: {
        id: true,
        parcel_number: true,
        total_amount_due: true,
        estimated_market_value: true,
        recommendation: true
      }
    })

    const taxSaleMap = new Map(taxSaleProperties.map(p => [p.parcel_number, p]))

    const enrichedParcels = adjacentParcels.map(p => ({
      ...p,
      taxSaleProperty: taxSaleMap.get(p.adjacent_parcel_number) || null
    }))

    return NextResponse.json({
      adjacentParcels: enrichedParcels,
      count: enrichedParcels.length,
      taxSaleCount: enrichedParcels.filter(p => p.is_in_tax_sale).length
    })
  } catch (error) {
    console.error('Error fetching adjacent parcels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch adjacent parcels' },
      { status: 500 }
    )
  }
}

// POST /api/properties/[id]/assemblage
// Triggers assemblage detection for a property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the property
    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, parcel_number: true }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Run assemblage detection
    const result = await detectAssemblageOpportunities(
      property.id,
      property.parcel_number
    )

    // Update property assemblage flag
    await prisma.property.update({
      where: { id: property.id },
      data: {
        assemblage_opportunity: result.taxSaleAdjacentParcels.length > 0
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error detecting assemblage:', error)
    return NextResponse.json(
      { error: 'Failed to detect assemblage opportunities' },
      { status: 500 }
    )
  }
}
