import type { Property, TitleSignals, ZoningProfile, DataGap, TitleAnalysis, RedFlag, CountyConfig } from '@prisma/client'
import type { InvestorMemo, MemoRecommendation, MemoScores, MemoKeyFacts, MaxBidAnalysis, ReadinessCaveat, CountyReadiness, CountyReadinessConfig } from './types'
import { DEFAULT_READINESS_CONFIG } from './types'

export type PropertyForMemo = Property & {
  titleSignals: TitleSignals | null
  zoningProfile: ZoningProfile | null
  data_gaps: DataGap[]
  titleAnalysis: TitleAnalysis | null
  red_flags: RedFlag[]
  countyConfig?: CountyConfig | null
}

// County readiness detection from CountyConfig model
function detectCountyReadiness(countyConfig?: CountyConfig | null): CountyReadiness {
  if (!countyConfig) return 'PLANNED'

  switch (countyConfig.status) {
    case 'production':
      return 'LIVE'
    case 'beta':
      return 'NEAR_LIVE'
    case 'alpha':
      return 'PARTIAL'
    case 'pending':
    default:
      return 'PLANNED'
  }
}

// Build readiness caveat based on county status
function buildReadinessCaveat(
  readiness: CountyReadiness,
  countyConfig?: CountyConfig | null,
  dataGaps?: DataGap[]
): ReadinessCaveat | null {
  if (readiness === 'LIVE') return null

  const config = DEFAULT_READINESS_CONFIG[readiness]
  const openGaps = dataGaps?.filter(g => !g.resolved) || []

  const gapFields = Array.from(new Set(openGaps.map(g => g.field))).slice(0, 5)

  return {
    level: readiness,
    message: config.caveatMessage || `${readiness}: Verify all data before bidding`,
    impact: readiness === 'NEAR_LIVE' ? 'minor' : readiness === 'PARTIAL' ? 'moderate' : 'severe',
    dataGaps: gapFields,
    confidenceAdjustment: Math.round((1 - config.confidenceMultiplier) * 100)
  }
}

// Enhanced max bid calculation using Dustin Hahn formula
function calculateMaxBidDustinHahn(
  p: PropertyForMemo,
  premium: number
): MaxBidAnalysis {
  const arv = p.estimated_market_value
  const municipalLiens = p.total_amount_due
  const repairEstimate = p.repair_estimate ?? p.estimated_repair_cost ?? 0
  const desiredProfit = p.desired_profit ?? Math.round((arv || 0) * 0.15) // Default 15% of ARV
  const quietTitleCost = 3500
  const quickSalePercent = 80 // ARV × 80%

  // Calculate using Expert Investor Formula
  // Max Bid = (ARV × 80%) - Municipal Liens - $3,500 - Repairs - Desired Profit
  let suggestedMaxBid: number | null = null
  let viability: MaxBidAnalysis['viability'] = 'unknown'
  let reasoning = ''
  let openingBidRatio: number | undefined

  if (arv && municipalLiens) {
    const quickSalePrice = arv * (quickSalePercent / 100)
    const rawMaxBid = quickSalePrice - municipalLiens - quietTitleCost - repairEstimate - desiredProfit

    // Apply buyer premium to get all-in ceiling
    const netMaxBid = rawMaxBid / (1 + premium / 100)

    // Floor: at least 10% above opening bid
    const floor = municipalLiens * 1.1

    // Ceiling: 50% of ARV
    const ceiling = arv * 0.5

    suggestedMaxBid = Math.max(floor, Math.min(netMaxBid, ceiling))
    suggestedMaxBid = Math.round(suggestedMaxBid / 500) * 500 // Round to nearest $500

    openingBidRatio = suggestedMaxBid / municipalLiens

    // Determine viability
    if (suggestedMaxBid >= municipalLiens * 1.5) {
      viability = 'strong'
      reasoning = `Max bid ${formatCurrency(suggestedMaxBid)} is ${(openingBidRatio * 100).toFixed(0)}% of opening bid - excellent margin for competitive bidding`
    } else if (suggestedMaxBid >= municipalLiens * 1.2) {
      viability = 'good'
      reasoning = `Max bid ${formatCurrency(suggestedMaxBid)} provides ${(openingBidRatio * 100).toFixed(0)}% headroom above opening bid`
    } else if (suggestedMaxBid >= municipalLiens) {
      viability = 'marginal'
      reasoning = `Max bid ${formatCurrency(suggestedMaxBid)} is barely above opening bid - limited room for competition`
    } else {
      viability = 'poor'
      reasoning = `Max bid ${formatCurrency(suggestedMaxBid)} is below opening bid of ${formatCurrency(municipalLiens)} - property may be overvalued or requires lower profit margin`
    }
  } else {
    reasoning = arv ? 'Missing opening bid amount' : 'Missing ARV - cannot calculate max bid'
  }

  return {
    suggestedMaxBid,
    formula: 'Max Bid = (ARV × 80%) - Municipal Liens - $3,500 - Repairs - Desired Profit',
    breakdown: {
      arv,
      quickSalePercent,
      municipalLiens,
      quietTitleCost,
      repairEstimate: repairEstimate > 0 ? repairEstimate : null,
      desiredProfit: desiredProfit > 0 ? desiredProfit : null,
      buyerPremium: premium
    },
    viability,
    openingBidRatio,
    reasoning
  }
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '$—'
  return `$${Math.round(n).toLocaleString()}`
}

// ─── County constants ─────────────────────────────────────────────────────────

// Public Surplus charges 5% for most Utah counties; Tooele adds its own 8%.
// Set to 0 when truly unknown (shows "—" in memo rather than a wrong number).
const BUYERS_PREMIUM: Record<string, number> = {
  tooele: 8,
  rich: 5,
  sanpete: 5,
}

const COUNTY_CONTEXT: Record<string, string> = {
  tooele: 'Tooele Valley / Grantsville / Stansbury Park area',
  rich: 'Bear Lake / Garden City area (remote recreational)',
  sanpete: 'Sanpete Valley / Manti / Ephraim area',
}

// ─── Score sub-functions ──────────────────────────────────────────────────────

function scoreEquity(openingBid: number | null, marketValue: number | null): number {
  if (!openingBid || !marketValue || marketValue <= 0) return 0
  const margin = (marketValue - openingBid) / marketValue
  if (margin >= 0.90) return 4
  if (margin >= 0.75) return 3
  if (margin >= 0.55) return 2
  if (margin >= 0.30) return 1
  return 0
}

function scoreTitleRisk(
  ts: TitleSignals | null,
  ta: TitleAnalysis | null,
  redFlagCount: number
): number {
  // TitleAnalysis (EagleWeb deep scan) takes precedence when present
  if (ta?.recommendation) {
    if (ta.recommendation === 'clean') return 4
    if (ta.recommendation === 'caution') return ta.score != null && ta.score >= 70 ? 3 : 2
    if (ta.recommendation === 'danger') return 1
    if (ta.recommendation === 'avoid') return 0
  }

  // TitleSignals (recorder index scan)
  if (ts) {
    if (redFlagCount > 0) return 0
    const netLiens = (ts.lien_docs_found ?? 0) - (ts.release_docs_found ?? 0)
    if (netLiens > 1) return 1
    if (netLiens > 0) return 2

    const hasUnresolvedMortgage =
      (ts.mortgage_docs_found ?? 0) > (ts.release_docs_found ?? 0)

    if (!ts.has_deed_records) return 3            // no records since index start = clean by absence
    if (!hasUnresolvedMortgage && netLiens === 0) {
      const lastType = ts.last_transfer_type?.toLowerCase() ?? ''
      if (lastType.includes('warranty')) return 4
      if (lastType.includes('quit claim') || lastType.includes('trustee')) return 2
      return 3
    }
    return 2
  }

  return 2 // neutral unknown — not penalized but not rewarded
}

function scoreRecency(ts: TitleSignals | null, ta: TitleAnalysis | null): number {
  if (ta?.yearsSameOwner != null) {
    if (ta.yearsSameOwner >= 10) return 3
    if (ta.yearsSameOwner >= 3) return 2
    return 1
  }

  if (ts) {
    if (!ts.has_deed_records) return 3            // no activity in index at all
    const count5yr = ts.document_count_5yr ?? 0
    if (count5yr === 0) return 3                  // old records, nothing recent
    if (count5yr === 1) {
      // single recent transfer — check if it's benign (warranty deed)
      const t = ts.last_transfer_type?.toLowerCase() ?? ''
      if (t.includes('warranty')) return 2
      if (t.includes('trustee') || t.includes('sheriff')) return 1
      return 2
    }
    if (count5yr <= 3) return 1
    return 0  // heavy recent activity = churn / red flag
  }

  return 1 // no title data — slightly cautious
}

function scorePropertyQuality(p: PropertyForMemo): number {
  const type = (p.property_type ?? 'unknown').toLowerCase()
  const acres = p.lot_size_sqft ? p.lot_size_sqft / 43560 : null
  const sqft = p.building_sqft ?? 0

  if (p.micro_parcel) return 0

  // Residential with decent structure
  if ((type === 'house' || type === 'single_family') && sqft >= 800) {
    if (p.year_built && p.year_built >= 1980) return 4
    return 3
  }

  // Standard residential or condo
  if (type === 'house' || type === 'single_family' || type === 'condo') return 3

  // Multifamily
  if (type === 'multifamily' || type === 'duplex') return 3

  // Lot / vacant land: value depends on size and location
  if (type === 'lot' || type === 'vacant_land' || type === 'vacant' || type.includes('land') || type.includes('lot')) {
    if (acres != null && acres >= 1.0) return 3
    if (acres != null && acres >= 0.25) return 2
    return 1
  }

  // Commercial
  if (type.includes('commercial') || type.includes('office') || type.includes('retail')) return 2

  // Mobile home
  if (type.includes('mobile') || type.includes('manufactured')) return 1

  return 2 // unknown — neutral
}

function scoreDataCompleteness(p: PropertyForMemo): number {
  let pts = 0

  // Core financial data (needed for equity analysis)
  if (p.total_amount_due != null && p.total_amount_due > 0) pts++
  if (p.estimated_market_value != null && p.estimated_market_value > 0) pts++

  // Title data
  const hasTitle = p.titleSignals != null || p.titleAnalysis != null
  if (hasTitle) pts++

  return Math.min(3, pts)
}

function computeRecommendation(
  scores: MemoScores,
  p: PropertyForMemo,
  maxBid: MaxBidAnalysis,
  readiness: CountyReadiness
): MemoRecommendation {
  // Hard AVOID conditions (truly uninvestable)
  if (p.status === 'redeemed' || p.status === 'removed') return 'AVOID'
  if (p.micro_parcel && (p.building_sqft ?? 0) < 100) return 'AVOID'

  // County readiness affects recommendation
  if (readiness === 'PLANNED') {
    return 'RESEARCH' // Can't make informed decision without county data
  }

  // If max bid is poor and we have market value data, likely AVOID
  if (maxBid.viability === 'poor' && p.estimated_market_value && p.total_amount_due) {
    return 'AVOID'
  }

  // Standard scoring-based recommendation
  const total = scores.total

  if (total >= 14) return 'GO'
  if (total >= 10) return 'CAUTION'
  if (total >= 6) return 'RESEARCH'

  // Below 6 score is effectively an AVOID
  return 'AVOID'
}

// ─── Max bid (legacy simple version - kept for backward compatibility) ─────────

// Conservative multiplier: what % of market value is a safe all-in ceiling?
// Remote/recreational markets have limited liquidity — use a lower multiple.
const MAX_BID_MULTIPLIER: Record<string, number> = {
  tooele: 0.32,   // Tooele Valley — normal residential market
  rich: 0.20,     // Bear Lake / remote recreational — limited liquidity and seasonal
  sanpete: 0.25,  // Sanpete Valley — rural, modest resale demand
  utah: 0.35,     // Utah County — strong market
  salt_lake: 0.35, // Salt Lake County — strong market
  davis: 0.32,    // Davis County — good market
  weber: 0.30,    // Weber County — moderate market
}

function computeMaxBid(
  marketValue: number | null,
  openingBid: number | null,
  premiumPct: number,
  county: string
): number | undefined {
  if (!marketValue || !openingBid) return undefined

  const multiplier = MAX_BID_MULTIPLIER[county.toLowerCase()] ?? 0.30
  const targetGross = marketValue * multiplier
  const net = targetGross / (1 + premiumPct / 100)
  const floor = openingBid * 1.1           // at least 10% above opening bid

  const raw = Math.max(floor, net)
  return Math.round(raw / 500) * 500       // round to nearest $500
}

// ─── Narrative generation ─────────────────────────────────────────────────────

function buildLocationSummary(p: PropertyForMemo): string | null {
  const city = p.property_address
    ? p.property_address.match(/,\s*([^,]+),\s*UT/i)?.[1]?.trim() ?? null
    : null
  const context = COUNTY_CONTEXT[p.county.toLowerCase()]
  if (city) return `${city}, ${p.county.charAt(0).toUpperCase() + p.county.slice(1)} County (${context})`
  return context ? `${p.county.charAt(0).toUpperCase() + p.county.slice(1)} County — ${context}` : null
}

function fmt$(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function buildGoodBullets(p: PropertyForMemo, scores: MemoScores, premium: number): string[] {
  const bullets: string[] = []
  const mv = p.estimated_market_value
  const bid = p.total_amount_due
  const ts = p.titleSignals
  const ta = p.titleAnalysis
  const acres = p.lot_size_sqft ? p.lot_size_sqft / 43560 : null

  // Equity bullet
  if (mv && bid && mv > bid) {
    const totalCost = bid * (1 + premium / 100)
    const margin = ((mv - totalCost) / mv * 100).toFixed(0)
    bullets.push(
      `Total opening cost (${fmt$(totalCost)} with ${premium}% premium) is ~${margin}% below estimated market value of ${fmt$(mv)} — strong paper equity of ${fmt$(mv - totalCost)}.`
    )
  } else if (mv && bid && bid === 0) {
    bullets.push(`No opening bid listed — if auction starts at assessed value, equity potential against ${fmt$(mv)} market value is substantial.`)
  }

  // Title clean bullet
  if (ts && !ts.has_deed_records) {
    bullets.push('No recorded documents in county index since 2019-01-01 — property appears clean by absence of encumbrances.')
  } else if (ts?.last_transfer_type?.toLowerCase().includes('warranty') && (ts.document_count_5yr ?? 0) === 0) {
    const yr = ts.last_transfer_date ? new Date(ts.last_transfer_date).getFullYear() : null
    bullets.push(
      `Last recorded transfer is a Warranty Deed${yr ? ` (${yr})` : ''} with no recent activity — stable long-term ownership, no distressed instruments.`
    )
  } else if (ta?.recommendation === 'clean') {
    bullets.push('EagleWeb title review returned a clean result — no active liens, paid-off mortgage, clean ownership chain.')
  } else if (ta?.mortgageStatus === 'paid_off') {
    bullets.push('Mortgage paid off per title review — no deed of trust outstanding.')
  }

  // Physical bullet
  const type = p.property_type ?? 'Unknown'
  if (acres != null && acres >= 1.0) {
    bullets.push(`${acres.toFixed(2)}-acre ${type.toLowerCase()} parcel — meaningful land size with development or hold potential.`)
  } else if ((p.building_sqft ?? 0) >= 1000) {
    bullets.push(`Existing ${p.building_sqft?.toLocaleString()} sq ft structure${p.year_built ? ` (built ${p.year_built})` : ''} — improvements likely reduce time-to-use and utility setup costs.`)
  }

  // Data coverage bullet
  if (scores.dataCompleteness >= 3) {
    bullets.push('Data coverage is strong: auction bid, assessor/market value, and title index all present.')
  }

  // Recency/ownership stability
  if (scores.recency === 3 && ts?.has_deed_records) {
    bullets.push('No document activity in the last 5 years — long-term stable ownership, no evidence of recent churn.')
  } else if (ta?.yearsSameOwner != null && ta.yearsSameOwner >= 10) {
    bullets.push(`Same owner for ~${ta.yearsSameOwner} years per recorder index — stable, long-term holder, not a recent flipper.`)
  }

  return bullets
}

function buildBadBullets(
  p: PropertyForMemo,
  scores: MemoScores,
  readiness?: CountyReadiness
): string[] {
  const bullets: string[] = []
  const ts = p.titleSignals
  const ta = p.titleAnalysis
  const acres = p.lot_size_sqft ? p.lot_size_sqft / 43560 : null

  // County readiness warnings
  if (readiness === 'PLANNED') {
    bullets.push('County is not yet onboarded to the platform — all data is from preliminary CSV import only.')
    bullets.push('GIS enrichment, market value estimates, and title research are not yet available.')
  } else if (readiness === 'PARTIAL') {
    bullets.push('County has partial data pipeline — some enrichment may be missing or incomplete.')
    bullets.push('Verify all key data points (market value, zoning, title) manually before bidding.')
  } else if (readiness === 'NEAR_LIVE') {
    bullets.push('County is in beta — auction details and title automation may need verification.')
  }

  // Missing market value — critical gap
  if (!p.estimated_market_value) {
    bullets.push('No market value available — equity potential cannot be calculated without this data point.')
  }

  // No title data
  if (!ts && !ta) {
    bullets.push('No title research data yet — recorder search has not been run. Title risk is unknown.')
  }

  // Active liens
  if (ts) {
    const netLiens = (ts.lien_docs_found ?? 0) - (ts.release_docs_found ?? 0)
    if (netLiens > 0) {
      bullets.push(`${netLiens} potentially unreleased lien(s) found in recorder index — verify current status before bidding.`)
    }
    const netMort = (ts.mortgage_docs_found ?? 0) - (ts.release_docs_found ?? 0)
    if (netMort > 0 && netLiens === 0) {
      bullets.push('Mortgage documents in recorder index without a matching release — may be paid off but not formally reconveyed; verify.')
    }
    if (ts.last_transfer_type?.toLowerCase().includes('trustee')) {
      bullets.push("Last transfer in recorder index was a Trustee's Deed — indicates prior foreclosure; confirm all predecessor liens were extinguished.")
    }
    if (ts.red_flags_count && ts.red_flags_count > 0) {
      bullets.push(`${ts.red_flags_count} title red flag(s) recorded — review before bidding.`)
    }
  }

  if (ta?.recommendation === 'danger' || ta?.recommendation === 'avoid') {
    bullets.push(`EagleWeb title analysis returned "${ta.recommendation}" — significant title issues require review.`)
  }

  // Physical unknowns
  if (acres != null && acres > 0) {
    bullets.push('Lot boundaries, road access, and utility availability need to be confirmed via GIS or on-site inspection.')
  } else if (!p.lot_size_sqft) {
    bullets.push('Parcel size and physical characteristics are unknown — check assessor or GIS records.')
  }

  // Occupancy
  if (p.occupancy_status === 'unknown' || !p.occupancy_status) {
    bullets.push('Current occupancy unknown — possible tenants, holdover occupants, or encroachments not visible in public records.')
  } else if (p.occupancy_status === 'tenant') {
    bullets.push('Property shows as tenant-occupied — eviction process and timeline add cost and complexity post-acquisition.')
  }

  // Remote / recreational land risk
  if (p.county.toLowerCase() === 'rich') {
    bullets.push('Rich County parcels are often remote recreational land — verify year-round road access, power availability, and buildability before bidding.')
  }

  // Zoning unknown
  if (!p.zoning && p.property_type?.toLowerCase().includes('lot')) {
    bullets.push('Zoning not confirmed — check county planning department to verify permitted uses and minimum lot size requirements.')
  }

  // Data gaps
  const openGaps = p.data_gaps.filter(g => !g.resolved)
  if (openGaps.length > 0) {
    const gapSummary = Array.from(new Set(openGaps.map(g => g.field))).slice(0, 3).join(', ')
    bullets.push(`${openGaps.length} unresolved data gap(s) in pipeline: ${gapSummary}.`)
  }

  return bullets
}

function buildNextActions(
  p: PropertyForMemo,
  scores: MemoScores,
  rec: MemoRecommendation,
  maxBid: number | undefined,
  premium: number
): string[] {
  const actions: string[] = []
  const ts = p.titleSignals
  const ta = p.titleAnalysis

  // GIS/visual check — almost always needed
  actions.push('Verify lot shape, road access, and neighboring improvements via GIS satellite imagery (Google Earth or county parcel viewer).')

  // Title action
  if (!ts && !ta) {
    const adapters: Record<string, string> = {
      tooele: 'EagleWeb at erecording.tooeleco.gov',
      rich: 'RecordingsSearch.aspx at search.richcounty.gov (requires free guest login)',
      sanpete: 'EagleWeb at erecording.sanpetecountyutah.gov',
    }
    const system = adapters[p.county.toLowerCase()] ?? 'county recorder online system'
    actions.push(`Run title search via ${system} to assess deed history and lien status before bidding.`)
  } else if (ts) {
    const netLiens = (ts.lien_docs_found ?? 0) - (ts.release_docs_found ?? 0)
    if (netLiens > 0) {
      actions.push(`Call the ${p.county} County Recorder to confirm whether the ${netLiens} lien record(s) are formally released or still active.`)
    }
  }

  // Zoning action for land
  const isLand = (p.property_type ?? '').toLowerCase().match(/lot|land|vacant/)
  if (isLand) {
    actions.push(`Confirm zoning and permitted uses with ${p.county.charAt(0).toUpperCase() + p.county.slice(1)} County planning to ensure the parcel is buildable for your intended purpose.`)
  }

  // Bid cap action
  if (rec === 'GO' || rec === 'CAUTION') {
    if (maxBid) {
      actions.push(`Enter the auction with a firm cap of ${fmt$(maxBid)} all-in (including ${premium}% buyer premium). Do not exceed this in the heat of bidding.`)
    } else {
      actions.push(`Establish a firm max bid before the auction based on your own value estimate and exit strategy. Do not bid beyond it.`)
    }
  }

  // Research action
  if (rec === 'RESEARCH') {
    const openGaps = p.data_gaps.filter(g => !g.resolved)
    if (openGaps.length > 0) {
      actions.push(`Resolve ${openGaps.length} data gap(s) before making a bid decision: ${openGaps.map(g => g.field).slice(0, 3).join(', ')}.`)
    } else {
      actions.push('Complete due diligence on title and physical characteristics before deciding to bid.')
    }
  }

  return actions
}

// ─── Headline ─────────────────────────────────────────────────────────────────

function buildHeadline(
  p: PropertyForMemo,
  rec: MemoRecommendation,
  scores: MemoScores,
  confidenceScore?: number,
  readiness?: CountyReadiness
): string {
  const county = p.county.charAt(0).toUpperCase() + p.county.slice(1)
  const type = p.property_type ?? 'property'
  const mv = p.estimated_market_value
  const bid = p.total_amount_due
  let equityDesc = ''
  if (mv && bid && mv > bid) {
    const multiple = (mv / bid).toFixed(1)
    equityDesc = ` — ${multiple}× opening bid vs market value`
  }

  // Add readiness indicator if not LIVE
  let readinessTag = ''
  if (readiness && readiness !== 'LIVE') {
    readinessTag = ` [${readiness}]`
  }

  // Add confidence if available
  let confidenceTag = ''
  if (confidenceScore != null) {
    confidenceTag = ` (${confidenceScore}% conf)`
  }

  return `${county} – ${p.parcel_number} – ${type}${equityDesc} – ${rec}${readinessTag}${confidenceTag}`
}

// ─── Confidence score calculation ───────────────────────────────────────────────

function calculateConfidenceScore(
  scores: MemoScores,
  readiness: CountyReadiness,
  dataGaps: DataGap[]
): number {
  const config = DEFAULT_READINESS_CONFIG[readiness]

  // Base confidence from data completeness
  let baseConfidence = (scores.dataCompleteness / 3) * 50 +
                     (scores.titleRisk / 4) * 30 +
                     (scores.recency / 3) * 20

  // Apply readiness multiplier
  let confidence = baseConfidence * config.confidenceMultiplier

  // Penalty for unresolved data gaps
  const openGaps = dataGaps.filter(g => !g.resolved).length
  confidence -= openGaps * 5

  return Math.max(0, Math.min(100, Math.round(confidence)))
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateInvestorMemo(p: PropertyForMemo): InvestorMemo {
  const premium = BUYERS_PREMIUM[p.county.toLowerCase()] ?? 0

  // Detect county readiness
  const countyReadiness = detectCountyReadiness(p.countyConfig)
  const readinessCaveat = buildReadinessCaveat(countyReadiness, p.countyConfig, p.data_gaps)

  // Calculate scores
  const equity = scoreEquity(p.total_amount_due, p.estimated_market_value)
  const titleRisk = scoreTitleRisk(p.titleSignals, p.titleAnalysis, p.red_flags.filter(r => !r.is_resolved).length)
  const recency = scoreRecency(p.titleSignals, p.titleAnalysis)
  const propertyQuality = scorePropertyQuality(p)
  const dataCompleteness = scoreDataCompleteness(p)
  const total = equity + titleRisk + recency + propertyQuality + dataCompleteness

  const scores = { equity, titleRisk, recency, propertyQuality, dataCompleteness, total }

  // Calculate max bid using Dustin Hahn formula
  const maxBid = calculateMaxBidDustinHahn(p, premium)

  // Compute recommendation with readiness awareness
  const recommendation = computeRecommendation(scores, p, maxBid, countyReadiness)

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(scores, countyReadiness, p.data_gaps)

  const acres = p.lot_size_sqft ? p.lot_size_sqft / 43560 : null
  const subdivision = p.legal_description
    ? p.legal_description.match(/([A-Z][A-Z\s]+(?:SUB|SUBDIVISION|ESTATES|HEIGHTS|RIDGE|PARK))/i)?.[1]?.trim() ?? null
    : null

  // Determine title risk level
  const titleRiskLevel: MemoKeyFacts['titleSummary']['riskLevel'] =
    p.titleAnalysis?.recommendation as MemoKeyFacts['titleSummary']['riskLevel'] ??
    (p.titleSignals?.red_flags_count && p.titleSignals.red_flags_count > 0 ? 'caution' : 'unknown')

  const keyFacts: MemoKeyFacts = {
    owner: p.owner_name ?? null,
    subdivision,
    acres: acres != null ? Math.round(acres * 100) / 100 : null,
    class: p.property_type ?? null,
    openingBid: p.total_amount_due ?? null,
    buyersPremiumPercent: BUYERS_PREMIUM[p.county.toLowerCase()] ?? null,
    estMarketValue: p.estimated_market_value ?? null,
    locationSummary: buildLocationSummary(p),
    titleSummary: {
      hasDeedRecords: p.titleSignals?.has_deed_records ?? null,
      documentCount5yr: p.titleSignals?.document_count_5yr ?? p.titleAnalysis?.rawDocuments ? null : null,
      lastTransferType: p.titleSignals?.last_transfer_type ?? p.titleAnalysis?.ownershipChain
        ? ((): string | null => {
            try {
              const chain = JSON.parse(p.titleAnalysis!.ownershipChain ?? '[]')
              return Array.isArray(chain) && chain.length > 0 ? chain[chain.length - 1]?.docType ?? null : null
            } catch { return null }
          })()
        : null,
      notes: buildTitleNotes(p),
      riskLevel: titleRiskLevel,
    }
  }

  const good = buildGoodBullets(p, scores, premium)
  const bad = buildBadBullets(p, scores, countyReadiness)
  const nextActions = buildNextActions(p, scores, recommendation, maxBid.suggestedMaxBid ?? undefined, premium)

  // Build data sources list
  const dataSources: string[] = []
  if (p.titleSignals) dataSources.push('County Recorder Index')
  if (p.titleAnalysis) dataSources.push('EagleWeb Title Analysis')
  if (p.estimated_market_value) dataSources.push('AGRC LIR Market Data')
  if (p.zoningProfile) dataSources.push('County GIS/Zoning')
  if (dataSources.length === 0) dataSources.push('Tax Sale CSV Import')

  // Build analyst notes for non-LIVE counties
  let analystNotes: string | undefined
  if (countyReadiness !== 'LIVE') {
    analystNotes = `${countyReadiness} county: ${readinessCaveat?.message}. Confidence reduced by ${readinessCaveat?.confidenceAdjustment}%.`
  }

  return {
    county: p.county,
    parcelId: p.parcel_number,
    headline: buildHeadline(p, recommendation, scores, confidenceScore ?? undefined, countyReadiness),
    recommendation,
    maxBidInclusivePremium: recommendation !== 'AVOID' && recommendation !== 'SKIP' ? maxBid.suggestedMaxBid ?? undefined : undefined,
    maxBid,
    scores,
    keyFacts,
    good,
    bad,
    nextActions,
    countyReadiness,
    readinessCaveat,
    confidenceScore,
    _meta: {
      generatedAt: new Date().toISOString(),
      propertyId: p.id,
      investability_v2: p.investability_score ?? null,
      confidence_pct: p.confidence_score_v2 ?? null,
      dataSources,
      analystNotes,
    }
  }
}

function buildTitleNotes(p: PropertyForMemo): string | null {
  const ts = p.titleSignals
  const ta = p.titleAnalysis

  if (ta?.summary) {
    const riskLabel = ta.recommendation ? `[${ta.recommendation.toUpperCase()}] ` : ''
    return riskLabel + ta.summary
  }

  if (!ts) return null

  const parts: string[] = []
  if (!ts.has_deed_records) parts.push('No records in index since coverage start — clean by absence')
  else {
    const docCount = ts.document_count_5yr ?? 0
    if (docCount === 0) parts.push('No document activity in last 5 years')
    else parts.push(`${docCount} document(s) in last 5 years`)

    if (ts.last_transfer_type) parts.push(`Last instrument: ${ts.last_transfer_type}`)
    const netLiens = (ts.lien_docs_found ?? 0) - (ts.release_docs_found ?? 0)
    if (netLiens > 0) parts.push(`${netLiens} potentially unreleased lien(s)`)
    if (ts.mortgage_docs_found) parts.push(`${ts.mortgage_docs_found} mortgage/DOT doc(s)`)
  }

  // Add risk assessment
  if (ts.red_flags_count && ts.red_flags_count > 0) {
    parts.push(`${ts.red_flags_count} red flag(s)`)
  }

  return parts.join('; ')
}
