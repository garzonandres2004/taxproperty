import type { ReportProperty } from './types'

export function deriveRiskFlags(p: ReportProperty): string[] {
  const flags: string[] = []
  if (p.title_risk === 'high') flags.push('HIGH TITLE RISK')
  if (p.access_risk === 'high') flags.push('ACCESS ISSUES')
  if (p.legal_risk === 'high') flags.push('LEGAL COMPLEXITY')
  if (p.marketability_risk === 'high') flags.push('LOW MARKETABILITY')
  if (!p.estimated_market_value) flags.push('NO MARKET VALUE ON RECORD')
  if (!p.property_address) flags.push('NO SITUS ADDRESS')
  if (p.micro_parcel) flags.push('MICRO PARCEL (<2,000 SQFT)')
  if (p.is_otc) flags.push('OVER-THE-COUNTER (UNSOLD PRIOR AUCTION)')
  if (p.title_risk === 'unknown' && p.legal_risk === 'unknown') flags.push('TITLE UNVERIFIED')
  return flags
}

export function deriveKeyFacts(p: ReportProperty): string[] {
  const facts: string[] = []

  if (p.equity_multiple && p.equity_multiple > 0) {
    facts.push(`Equity multiple ${p.equity_multiple.toFixed(1)}x — market value ${fmt(p.estimated_market_value)} vs. opening bid ${fmt(p.total_amount_due)}`)
  }

  if (p.building_sqft && p.year_built) {
    facts.push(`${p.building_sqft.toLocaleString()} sqft structure built in ${p.year_built}`)
  } else if (p.building_sqft) {
    facts.push(`${p.building_sqft.toLocaleString()} sqft structure`)
  } else if (p.year_built) {
    facts.push(`Built in ${p.year_built}`)
  }

  if (p.lot_size_sqft) {
    const acres = p.lot_size_sqft / 43560
    if (acres >= 0.1) {
      facts.push(`Lot size: ${acres.toFixed(2)} acres (${p.lot_size_sqft.toLocaleString()} sqft)`)
    } else {
      facts.push(`Lot size: ${p.lot_size_sqft.toLocaleString()} sqft`)
    }
  }

  if (p.absentee_owner) {
    facts.push('Absentee owner — mailing address differs from property address')
  }

  if (p.zoning) {
    facts.push(`Zoning: ${p.zoning}`)
  }

  if (p.property_type === 'vacant_land') {
    facts.push('Vacant land — no existing structure; development potential depends on zoning')
  }

  if (p.legal_description && p.legal_description.length > 20 && facts.length < 4) {
    const shortLegal = p.legal_description.substring(0, 80).trim()
    facts.push(`Legal: ${shortLegal}${p.legal_description.length > 80 ? '…' : ''}`)
  }

  if (facts.length === 0) {
    facts.push('Parcel on record with ' + formatCounty(p.county) + ' County')
  }

  return facts.slice(0, 4)
}

export function deriveOurTake(p: ReportProperty): string {
  const bucket = p.recommendation_bucket ?? ''
  const em = p.equity_multiple ?? 0
  const score = p.investability_score ?? 0
  const type = p.property_type
  const hasAddress = !!p.property_address
  const hasValue = !!p.estimated_market_value

  if (bucket === 'TOP_TARGET') {
    if (em >= 10) {
      return `Exceptional equity spread at ${em.toFixed(1)}x — this is among the highest-upside properties in the dataset. Conduct title and condition due diligence immediately; competition may be high.`
    }
    return `High-conviction opportunity with strong fundamentals. Score of ${Math.round(score)}/100 places this in the top tier. Verify title and schedule an in-person review before the auction.`
  }

  if (bucket === 'BID_CANDIDATE') {
    if (!hasValue) {
      return `Solid score but no assessed market value on record — estimate ARV from comps before bidding. ${hasAddress ? 'Address confirmed; run a CMA before setting your max bid.' : 'Verify location and run comps.'}`
    }
    if (em >= 5) {
      return `${em.toFixed(1)}x equity spread on a ${formatType(type)} — above-average upside. Confirm property condition and title before the auction.`
    }
    return `Reasonable opportunity in ${formatCounty(p.county)} County. Verify title status and walk the property or review Street View before bidding.`
  }

  if (bucket === 'WATCHLIST') {
    return `Borderline opportunity — worth monitoring but not a priority bid. Reassess if higher-scored properties redeem before auction day.`
  }

  if (bucket === 'RESEARCH') {
    return `Insufficient data to recommend a bid. Gather comps, verify title, and confirm property condition before committing capital.`
  }

  // AVOID or fallback
  return `Multiple risk factors present. Avoid or conduct deep due diligence before bidding. Verify title, access, and any encumbrances.`
}

function fmt(n: number | null): string {
  if (!n) return 'N/A'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function formatCounty(county: string): string {
  return county.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatType(type: string): string {
  switch (type) {
    case 'single_family': return 'single-family home'
    case 'condo': return 'condo'
    case 'multifamily': return 'multi-family'
    case 'vacant_land': return 'vacant land parcel'
    case 'commercial': return 'commercial property'
    default: return 'property'
  }
}
