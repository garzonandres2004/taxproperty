import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreProperty, calculateDataConfidence, getDefaultSettings } from '@/lib/scoring'

/**
 * POST /api/rescore
 * Re-runs scoring on all properties with the updated scoring engine
 * including micro-parcel penalties and entity-owned detection
 */
export async function POST() {
  try {
    // Fetch all non-seed properties
    const properties = await prisma.property.findMany({
      where: { is_seed: false },
      select: {
        id: true,
        county: true,
        total_amount_due: true,
        estimated_market_value: true,
        estimated_repair_cost: true,
        estimated_cleanup_cost: true,
        estimated_closing_cost: true,
        property_type: true,
        occupancy_status: true,
        zoning: true,
        lot_size_sqft: true,
        building_sqft: true,
        year_built: true,
        assessed_value: true,
        deposit_required: true,
        access_risk: true,
        title_risk: true,
        legal_risk: true,
        marketability_risk: true,
        data_confidence: true,
        owner_name: true,
        owner_mailing_address: true,
        property_address: true,
        is_active_sale_candidate: true,
        status_last_verified_at: true,
        sale_date: true
      }
    })

    const settings = getDefaultSettings()
    const results = []
    let updated = 0

    for (const prop of properties) {
      // Calculate data confidence if not set
      const dataConfidence = prop.data_confidence || calculateDataConfidence({
        total_amount_due: prop.total_amount_due,
        estimated_market_value: prop.estimated_market_value,
        property_type: prop.property_type,
        occupancy_status: prop.occupancy_status,
        zoning: prop.zoning,
        lot_size_sqft: prop.lot_size_sqft,
        building_sqft: prop.building_sqft,
        year_built: prop.year_built,
        assessed_value: prop.assessed_value
      })

      // Run scoring with new logic
      const scores = scoreProperty({
        county: prop.county,
        total_amount_due: prop.total_amount_due,
        estimated_market_value: prop.estimated_market_value,
        estimated_repair_cost: prop.estimated_repair_cost,
        estimated_cleanup_cost: prop.estimated_cleanup_cost,
        estimated_closing_cost: prop.estimated_closing_cost,
        property_type: prop.property_type || 'unknown',
        occupancy_status: prop.occupancy_status || 'unknown',
        zoning: prop.zoning,
        lot_size_sqft: prop.lot_size_sqft,
        building_sqft: prop.building_sqft,
        year_built: prop.year_built,
        assessed_value: prop.assessed_value,
        deposit_required: prop.deposit_required,
        data_confidence: dataConfidence,
        access_risk: prop.access_risk || 'unknown',
        title_risk: prop.title_risk || 'unknown',
        legal_risk: prop.legal_risk || 'unknown',
        marketability_risk: prop.marketability_risk || 'unknown',
        is_active_sale_candidate: prop.is_active_sale_candidate,
        status_last_verified_at: prop.status_last_verified_at,
        sale_date: prop.sale_date,
        // Pass new fields
        owner_name: prop.owner_name,
        owner_mailing_address: prop.owner_mailing_address,
        property_address: prop.property_address
      }, settings)

      // Update property in database
      await prisma.property.update({
        where: { id: prop.id },
        data: {
          opportunity_score: scores.opportunity_score,
          risk_score: scores.risk_score,
          final_score: scores.final_score,
          recommendation: scores.recommendation,
          data_confidence: dataConfidence,
          max_bid: scores.maxBid,
          absentee_owner: scores.absenteeOwner,
          micro_parcel: scores.microParcel,
          assemblage_opportunity: scores.assemblageOpportunity
        }
      })

      results.push({
        id: prop.id,
        parcel_number: prop.parcel_number,
        final_score: scores.final_score,
        recommendation: scores.recommendation,
        micro_parcel: scores.microParcel,
        assemblage_opportunity: scores.assemblageOpportunity,
        absentee_owner: scores.absenteeOwner,
        max_bid: scores.maxBid
      })

      updated++
    }

    // Get summary stats
    const bidCount = results.filter(r => r.recommendation === 'bid').length
    const researchCount = results.filter(r => r.recommendation === 'research_more').length
    const avoidCount = results.filter(r => r.recommendation === 'avoid').length
    const microParcelCount = results.filter(r => r.micro_parcel).length

    return NextResponse.json({
      success: true,
      message: `Rescored ${updated} properties`,
      summary: {
        total: updated,
        bid: bidCount,
        research_more: researchCount,
        avoid: avoidCount,
        micro_parcels_flagged: microParcelCount
      },
      top_bid_properties: results
        .filter(r => r.recommendation === 'bid')
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 10)
    })

  } catch (error) {
    console.error('Rescore error:', error)
    return NextResponse.json(
      { error: 'Failed to rescore properties', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rescore
 * Returns the current top 10 BID properties without rescoring
 */
export async function GET() {
  try {
    const topProperties = await prisma.property.findMany({
      where: {
        recommendation: 'bid',
        is_seed: false
      },
      orderBy: { final_score: 'desc' },
      take: 10,
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        owner_name: true,
        total_amount_due: true,
        estimated_market_value: true,
        final_score: true,
        recommendation: true,
        micro_parcel: true,
        absentee_owner: true,
        max_bid: true,
        lot_size_sqft: true
      }
    })

    return NextResponse.json({
      success: true,
      top_bid_properties: topProperties.map(p => ({
        ...p,
        payoff_ratio: p.estimated_market_value > 0
          ? ((p.total_amount_due || 0) / p.estimated_market_value * 100).toFixed(1) + '%'
          : 'N/A',
        lot_size_acres: p.lot_size_sqft
          ? (p.lot_size_sqft / 43560).toFixed(2) + ' acres'
          : 'N/A'
      }))
    })

  } catch (error) {
    console.error('Error fetching top properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top properties' },
      { status: 500 }
    )
  }
}
