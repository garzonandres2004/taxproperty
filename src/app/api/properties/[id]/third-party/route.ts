import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { upsertThirdPartyEnrichment, ThirdPartyEnrichmentInput } from '@/lib/third-party-enrichment'

// POST /api/properties/[id]/third-party - Update third-party enrichment data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Validate input
    const input: ThirdPartyEnrichmentInput = {
      zillow_url: body.zillow_url,
      zillow_zpid: body.zillow_zpid,
      zillow_zestimate: body.zillow_zestimate ? Number(body.zillow_zestimate) : undefined,
      zillow_rent_estimate: body.zillow_rent_estimate ? Number(body.zillow_rent_estimate) : undefined,
      zillow_beds: body.zillow_beds ? Number(body.zillow_beds) : undefined,
      zillow_baths: body.zillow_baths ? Number(body.zillow_baths) : undefined,
      zillow_sqft: body.zillow_sqft ? Number(body.zillow_sqft) : undefined,
      zillow_confidence: body.zillow_confidence
    }

    // Upsert enrichment data
    const enrichment = await upsertThirdPartyEnrichment(id, input)

    return NextResponse.json(enrichment)
  } catch (error) {
    console.error('Error updating third-party enrichment:', error)
    return NextResponse.json(
      { error: 'Failed to update enrichment data' },
      { status: 500 }
    )
  }
}

// GET /api/properties/[id]/third-party - Get third-party enrichment data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const enrichment = await prisma.thirdPartyEnrichment.findUnique({
      where: { property_id: id }
    })

    if (!enrichment) {
      return NextResponse.json(null)
    }

    return NextResponse.json(enrichment)
  } catch (error) {
    console.error('Error fetching third-party enrichment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrichment data' },
      { status: 500 }
    )
  }
}
