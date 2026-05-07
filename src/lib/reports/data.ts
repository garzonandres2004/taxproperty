import { prisma } from '@/lib/db'
import type { ReportData, ReportParams, ReportProperty } from './types'
import { deriveRiskFlags, deriveKeyFacts, deriveOurTake, formatCounty } from './narrative'

export async function buildReportData(params: ReportParams): Promise<ReportData> {
  const { county, topN, minScore } = params

  // Count total screened for this county
  const totalScreened = await prisma.property.count({
    where: { county, is_seed: false }
  })

  // Fetch all qualifying properties
  const raw = await prisma.property.findMany({
    where: {
      county,
      is_seed: false,
      investability_score: { gte: minScore },
    },
    orderBy: [
      { investability_score: 'desc' },
      { total_amount_due: 'asc' },
    ],
    take: topN * 3, // fetch extra to allow filtering
    include: {
      red_flags: { where: { is_resolved: false } },
    }
  })

  // Build report properties with derived fields
  const reportProperties: ReportProperty[] = raw.map(p => {
    const equity_multiple = (p.estimated_market_value && p.total_amount_due && p.total_amount_due > 0)
      ? p.estimated_market_value / p.total_amount_due
      : null

    const base: ReportProperty = {
      parcel_number: p.parcel_number,
      county: p.county,
      property_address: p.property_address,
      owner_name: p.owner_name,
      total_amount_due: p.total_amount_due,
      estimated_market_value: p.estimated_market_value,
      assessed_value: p.assessed_value,
      lot_size_sqft: p.lot_size_sqft,
      building_sqft: p.building_sqft,
      year_built: p.year_built,
      property_type: p.property_type,
      latitude: p.latitude,
      longitude: p.longitude,
      investability_score: p.investability_score,
      recommendation_bucket: p.recommendation_bucket,
      opportunity_score_v2: p.opportunity_score_v2,
      risk_score_v2: p.risk_score_v2,
      title_score_v2: p.title_score_v2,
      confidence_score_v2: p.confidence_score_v2,
      access_risk: p.access_risk,
      title_risk: p.title_risk,
      legal_risk: p.legal_risk,
      marketability_risk: p.marketability_risk,
      is_otc: p.is_otc,
      absentee_owner: p.absentee_owner,
      micro_parcel: p.micro_parcel,
      zoning: p.zoning,
      county_source_url: p.county_source_url,
      legal_description: p.legal_description,
      notes: p.notes,
      sale_date: p.sale_date,
      equity_multiple,
      risk_flags: [],
      key_facts: [],
      our_take: '',
    }

    base.risk_flags = deriveRiskFlags(base)
    base.key_facts = deriveKeyFacts(base)
    base.our_take = deriveOurTake(base)

    return base
  })

  // Apply flag exclusions then take topN
  const filtered = reportProperties
    .filter(p => {
      if (params.excludeFlags.length === 0) return true
      return !p.risk_flags.some(f => params.excludeFlags.some(ex => f.includes(ex)))
    })
    .slice(0, topN)

  // Determine sale date from first property
  const firstWithDate = raw.find(p => p.sale_date)
  const saleDateDisplay = firstWithDate?.sale_date
    ? new Date(firstWithDate.sale_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'May 2026'

  const auctionPlatform = raw.find(p => p.auction_platform)?.auction_platform ?? 'PublicSurplus'

  return {
    params,
    generated_at: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    total_screened: totalScreened,
    total_identified: filtered.length,
    properties: filtered,
    county_display: formatCounty(county),
    sale_date_display: saleDateDisplay,
    auction_platform: auctionPlatform,
  }
}
