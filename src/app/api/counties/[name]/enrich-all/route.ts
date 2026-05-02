import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    // Find properties in this county that need enrichment
    const properties = await prisma.property.findMany({
      where: {
        county: name,
        is_seed: false,
        OR: [
          { estimated_market_value: null },
          { estimated_market_value: 0 },
          { latitude: null },
          { photo_url: null }
        ]
      },
      select: {
        id: true,
        parcel_number: true,
        property_address: true
      }
    })

    let enriched = 0
    const errors: string[] = []

    // Enrich each property
    for (const prop of properties) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/properties/${prop.id}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          enriched++
        } else {
          errors.push(`${prop.parcel_number}: ${response.status}`)
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errors.push(`${prop.parcel_number}: ${String(error)}`)
      }
    }

    return NextResponse.json({
      success: true,
      county: name,
      total: properties.length,
      enriched,
      errors: errors.length
    })

  } catch (error) {
    console.error('Error enriching county:', error)
    return NextResponse.json(
      { error: 'Failed to enrich properties', details: String(error) },
      { status: 500 }
    )
  }
}
