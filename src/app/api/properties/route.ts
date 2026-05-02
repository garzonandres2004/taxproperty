import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreProperty, calculateDataConfidence, getDefaultSettings } from '@/lib/scoring'

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

async function getOrCreateSettings() {
  let settings = await prisma.userSettings.findUnique({
    where: { id: 'default' }
  })

  if (!settings) {
    // Create with null values (user hasn't configured yet)
    const defaults = getDefaultSettings()
    settings = await prisma.userSettings.create({
      data: { ...defaults, id: 'default' }
    })
  }

  return settings
}

export async function POST(request: Request) {
  try {
    // Simple auth check using cookie (middleware already validated)
    const cookieHeader = request.headers.get('cookie')
    const isAuthenticated = cookieHeader?.includes('taxproperty-auth=true')

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Get user settings for capital fit calculation (may be unconfigured)
    const settings = await getOrCreateSettings()

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

    // Calculate scores with county context and user settings
    const scores = scoreProperty({
      county: data.county,
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
      marketability_risk: data.marketability_risk || 'unknown',
      presale_volatility_risk: data.presale_volatility_risk,
      is_active_sale_candidate: data.is_active_sale_candidate !== false,
      status_last_verified_at: data.status_last_verified_at,
      sale_date: data.sale_date
    }, settings)

    // Create property with calculated scores and user ownership
    const property = await prisma.property.create({
      data: {
        user_id: null, // Simple auth - no user tracking
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
        status: 'new',
        // Source tracking fields
        county_source_url: data.county_source_url || null,
        source_last_checked_at: data.source_last_checked_at ? new Date(data.source_last_checked_at) : null,
        status_last_verified_at: data.status_last_verified_at ? new Date(data.status_last_verified_at) : null,
        presale_volatility_risk: data.presale_volatility_risk || scores.presale_volatility_details.adjustedScore || 0,
        is_active_sale_candidate: data.is_active_sale_candidate !== false
      }
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // TEMP: Auth disabled for V2 demo - return all properties
    // const session = await getServerSession()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const properties = await prisma.property.findMany({
      where: {
        // user_id: session.user.id, // TEMP: disabled
        is_seed: false
      },
      orderBy: [{ final_score: 'desc' }],
      include: {
        sources: true,
        titleAnalysis: {
          select: {
            score: true,
            recommendation: true
          }
        }
      }
    })
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
