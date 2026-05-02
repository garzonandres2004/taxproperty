import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { scoreProperty, calculateDataConfidence } from '@/lib/scoring'

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TEMP: Auth disabled for V2 demo
    // const session = await getServerSession()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params
    const property = await prisma.property.findFirst({
      where: {
        id
        // user_id: session.user.id // TEMP: disabled
      },
      include: {
        sources: true,
        outcomes: {
          orderBy: { event_date: 'desc' }
        }
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.property.findFirst({
      where: { id, user_id: session.user.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const data = await request.json()

    // Calculate data confidence and scores
    const dataConfidence = calculateDataConfidence({
      total_amount_due: data.total_amount_due ? parseFloat(data.total_amount_due) : null,
      estimated_market_value: data.estimated_market_value ? parseFloat(data.estimated_market_value) : null,
      property_type: data.property_type,
      occupancy_status: data.occupancy_status,
      zoning: data.zoning || null,
      lot_size_sqft: data.lot_size_sqft ? parseFloat(data.lot_size_sqft) : null,
      building_sqft: data.building_sqft ? parseFloat(data.building_sqft) : null,
      year_built: data.year_built ? parseInt(data.year_built) : null,
      assessed_value: data.assessed_value ? parseFloat(data.assessed_value) : null
    })

    // Calculate scores
    const scores = scoreProperty({
      total_amount_due: data.total_amount_due ? parseFloat(data.total_amount_due) : null,
      estimated_market_value: data.estimated_market_value ? parseFloat(data.estimated_market_value) : null,
      estimated_repair_cost: data.estimated_repair_cost ? parseFloat(data.estimated_repair_cost) : null,
      estimated_cleanup_cost: data.estimated_cleanup_cost ? parseFloat(data.estimated_cleanup_cost) : null,
      estimated_closing_cost: data.estimated_closing_cost ? parseFloat(data.estimated_closing_cost) : null,
      property_type: data.property_type || 'unknown',
      occupancy_status: data.occupancy_status || 'unknown',
      zoning: data.zoning || null,
      lot_size_sqft: data.lot_size_sqft ? parseFloat(data.lot_size_sqft) : null,
      building_sqft: data.building_sqft ? parseFloat(data.building_sqft) : null,
      year_built: data.year_built ? parseInt(data.year_built) : null,
      assessed_value: data.assessed_value ? parseFloat(data.assessed_value) : null,
      deposit_required: data.deposit_required ? parseFloat(data.deposit_required) : null,
      data_confidence: dataConfidence,
      access_risk: data.access_risk || 'unknown',
      title_risk: data.title_risk || 'unknown',
      legal_risk: data.legal_risk || 'unknown',
      marketability_risk: data.marketability_risk || 'unknown'
    })

    const property = await prisma.property.update({
      where: { id },
      data: {
        county: data.county,
        sale_year: parseInt(data.sale_year),
        sale_date: data.sale_date || null,
        parcel_number: data.parcel_number,
        owner_name: data.owner_name || null,
        owner_mailing_address: data.owner_mailing_address || null,
        property_address: data.property_address || null,
        legal_description: data.legal_description || null,
        total_amount_due: data.total_amount_due ? parseFloat(data.total_amount_due) : null,
        assessed_value: data.assessed_value ? parseFloat(data.assessed_value) : null,
        estimated_market_value: data.estimated_market_value ? parseFloat(data.estimated_market_value) : null,
        estimated_repair_cost: data.estimated_repair_cost ? parseFloat(data.estimated_repair_cost) : null,
        estimated_cleanup_cost: data.estimated_cleanup_cost ? parseFloat(data.estimated_cleanup_cost) : null,
        estimated_closing_cost: data.estimated_closing_cost ? parseFloat(data.estimated_closing_cost) : null,
        max_bid: data.max_bid ? parseFloat(data.max_bid) : null,
        max_bid_calculated: data.max_bid_calculated ? parseFloat(data.max_bid_calculated) : null,
        repair_estimate: data.repair_estimate ? parseFloat(data.repair_estimate) : null,
        desired_profit: data.desired_profit ? parseFloat(data.desired_profit) : null,
        property_type: data.property_type || 'unknown',
        occupancy_status: data.occupancy_status || 'unknown',
        zoning: data.zoning || null,
        lot_size_sqft: data.lot_size_sqft ? parseFloat(data.lot_size_sqft) : null,
        building_sqft: data.building_sqft ? parseFloat(data.building_sqft) : null,
        year_built: data.year_built ? parseInt(data.year_built) : null,
        auction_platform: data.auction_platform || null,
        deposit_required: data.deposit_required ? parseFloat(data.deposit_required) : null,
        access_risk: data.access_risk || 'unknown',
        title_risk: data.title_risk || 'unknown',
        legal_risk: data.legal_risk || 'unknown',
        marketability_risk: data.marketability_risk || 'unknown',
        data_confidence: dataConfidence,
        notes: data.notes || null,
        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        final_score: scores.final_score,
        recommendation: scores.recommendation,
        status: data.status || 'new'
      }
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership before deleting
    const existing = await prisma.property.findFirst({
      where: { id, user_id: session.user.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    await prisma.property.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting property:', error)
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
  }
}
