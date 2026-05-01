// TaxProperty Utah - Scoring Engine
// Transparent, rule-based scoring per Perplexity spec

import { getPresaleVolatilityScore } from '@/lib/counties/config'
import { prisma } from '@/lib/db'
import {
  calculateRedemptionRisk,
  detectOwnerType,
  detectAbsenteeOwner,
  quickRedemptionAssessment,
  RedemptionRiskInput,
  RedemptionRiskResult
} from './redemption-risk'
import {
  detectTooGoodToBeTrue,
  quickTGTTBCheck,
  TooGoodToBeTrueInput,
  TooGoodResult
} from './too-good-detector'

export type PropertyInput = {
  county?: string // 'utah' | 'salt_lake'
  total_amount_due: number | null
  estimated_market_value: number | null
  estimated_repair_cost: number | null
  estimated_cleanup_cost: number | null
  estimated_closing_cost: number | null
  property_type: string
  occupancy_status: string
  zoning: string | null
  lot_size_sqft: number | null
  building_sqft: number | null
  year_built: number | null
  assessed_value: number | null
  deposit_required: number | null
  data_confidence: number | null
  access_risk: string
  title_risk: string
  legal_risk: string
  marketability_risk: string
  presale_volatility_risk?: number
  is_active_sale_candidate?: boolean
  status_last_verified_at?: string | Date | null
  sale_date?: string | Date | null
  owner_name?: string | null
  owner_mailing_address?: string | null
  property_address?: string | null
  adjacentParcelIds?: string[]
  years_delinquent?: number
  has_partial_payments?: boolean
  city?: string | null
  is_unincorporated?: boolean
  opening_bid?: number | null
  outcomes?: Array<{ event_type: string; event_date: string; details?: string | null }>
  has_zoning_profile?: boolean
  buildability_score?: number | null
  is_otc?: boolean
}

export type CapitalFitDetails = {
  score: number
  estimatedTotalCost: number
  budgetUsagePercent: number
  notes: string[]
}

export type OpportunityBreakdown = {
  equity_spread: number
  property_quality: number
  exit_ease: number
  capital_fit: number
  data_confidence: number
  redemption_risk_adjustment: number
  too_good_adjustment: number
  otc_adjustment: number
  total: number
  capital_fit_details: CapitalFitDetails
}

export type RiskBreakdown = {
  legal_process: number
  property: number
  execution: number
  market: number
  presale_volatility: number
  total: number
}

export type UserSettingsInput = {
  totalBudget: number
  maxPerProperty: number
  reserveBuffer: number
}

export type RedFlagResult = {
  flag_type: string
  message: string
  severity: 'warning' | 'critical' | 'info'
  details?: string
  calculation?: {
    tax_amount: number
    market_value: number
    ratio_percent: number
    threshold_percent: number
  }
}

const TAX_SANITY_THRESHOLD = 0.3

export function calculateTaxSanityCheck(
  total_amount_due: number | null,
  estimated_market_value: number | null
): RedFlagResult | null {
  if (total_amount_due == null || estimated_market_value == null) {
    return null
  }

  if (estimated_market_value <= 0) {
    return null
  }

  const ratioPercent = (total_amount_due / estimated_market_value) * 100

  if (ratioPercent < TAX_SANITY_THRESHOLD) {
    return {
      flag_type: 'suspicious_tax_amount',
      message: 'Tax amount seems too low for property value - investigate occupancy, liens, or title issues',
      severity: 'warning',
      details: `Tax is only ${ratioPercent.toFixed(2)}% of value (expected >${TAX_SANITY_THRESHOLD}%)`,
      calculation: {
        tax_amount: total_amount_due,
        market_value: estimated_market_value,
        ratio_percent: ratioPercent,
        threshold_percent: TAX_SANITY_THRESHOLD
      }
    }
  }

  return null
}

export type ScoringResult = {
  opportunity_score: number
  risk_score: number
  final_score: number
  recommendation: 'bid' | 'research_more' | 'avoid'
  opportunity_breakdown: OpportunityBreakdown
  risk_breakdown: RiskBreakdown
  presale_volatility_details: {
    baseScore: number
    countyFactor: string
    isActiveCandidate: boolean
    adjustedScore: number
    stalenessPenalty: number
  }
  redemption_risk: RedemptionRiskResult | null
  too_good_to_be_true: TooGoodResult | null
  reasons: string[]
  warnings: string[]
  red_flags: RedFlagResult[]
  maxBid?: number
  absenteeOwner?: boolean
  microParcel?: boolean
  assemblageOpportunity?: boolean
  title_score?: number
  title_recommendation?: string
}

const DEFAULT_SETTINGS: UserSettingsInput = {
  totalBudget: 50000,
  maxPerProperty: 25000,
  reserveBuffer: 5000
}

export function calculateCapitalFit(
  property: Partial<PropertyInput>,
  settings: UserSettingsInput = DEFAULT_SETTINGS
): CapitalFitDetails {
  const estimatedTotalCost = (property.total_amount_due || 0) +
                             (property.estimated_repair_cost || 0) +
                             (property.estimated_cleanup_cost || 0) +
                             (property.estimated_closing_cost || 0) +
                             (property.deposit_required || 0)

  const budgetUsagePercent = settings.totalBudget > 0
    ? (estimatedTotalCost / settings.totalBudget) * 100
    : 0

  const notes: string[] = []
  let score = 0

  if (estimatedTotalCost > settings.maxPerProperty) {
    notes.push(`Exceeds max per property limit ($${settings.maxPerProperty.toLocaleString()})`)
    score = 0
  } else if (estimatedTotalCost > settings.totalBudget - settings.reserveBuffer) {
    notes.push(`Would violate reserve buffer ($${settings.reserveBuffer.toLocaleString()} kept uncommitted)`)
    score = 3
  } else if (estimatedTotalCost > settings.totalBudget * 0.7) {
    notes.push('Uses significant portion of budget')
    score = 7
  } else if (estimatedTotalCost > settings.totalBudget * 0.5) {
    notes.push('Moderate budget usage')
    score = 11
  } else {
    notes.push('Fits comfortably within budget')
    score = 15
  }

  if (budgetUsagePercent <= 25) {
    notes.push(`Uses ${budgetUsagePercent.toFixed(0)}% of total budget - very conservative`)
  } else if (budgetUsagePercent <= 50) {
    notes.push(`Uses ${budgetUsagePercent.toFixed(0)}% of total budget - good allocation`)
  } else if (budgetUsagePercent <= 75) {
    notes.push(`Uses ${budgetUsagePercent.toFixed(0)}% of total budget - substantial commitment`)
  } else {
    notes.push(`Uses ${budgetUsagePercent.toFixed(0)}% of total budget - heavy concentration`)
  }

  return {
    score,
    estimatedTotalCost,
    budgetUsagePercent,
    notes
  }
}

function calculatePresaleVolatility(property: PropertyInput): {
  score: number
  details: {
    baseScore: number
    countyFactor: string
    isActiveCandidate: boolean
    adjustedScore: number
    stalenessPenalty: number
  }
} {
  const baseScore = property.presale_volatility_risk ?? getPresaleVolatilityScore(property.county || '')

  let countyFactor = 'Standard county behavior'
  let adjustedScore = baseScore
  let stalenessPenalty = 0

  if (property.county === 'utah') {
    countyFactor = 'Utah County: High pre-sale instability. Properties can be redeemed until bidding starts. List changes in real-time.'
    adjustedScore = Math.max(baseScore, 10)
  } else if (property.county === 'salt_lake') {
    countyFactor = 'Salt Lake County: Medium-high instability. Redemption possible until sale.'
    adjustedScore = Math.max(baseScore, 8)
  }

  if (property.is_active_sale_candidate === false) {
    adjustedScore += 5
    countyFactor += ' Property marked as inactive/pulled from sale.'
  }

  if (!property.data_confidence || property.data_confidence < 40) {
    adjustedScore += 3
    countyFactor += ' Low data confidence increases uncertainty.'
  }

  if (property.status_last_verified_at && property.sale_date) {
    const now = Date.now()
    const verifiedTime = new Date(property.status_last_verified_at).getTime()
    const saleTime = new Date(property.sale_date).getTime()
    const daysSinceVerified = Math.floor((now - verifiedTime) / (1000 * 60 * 60 * 24))
    const daysUntilSale = Math.floor((saleTime - now) / (1000 * 60 * 60 * 24))

    if (daysSinceVerified > 7 && daysUntilSale <= 14) {
      stalenessPenalty += 3
    }
    if (daysSinceVerified > 14 && daysUntilSale <= 7) {
      stalenessPenalty += 5
    }

    if (stalenessPenalty > 0) {
      countyFactor += ` Data is ${daysSinceVerified} days old with ${daysUntilSale} days until sale.`
    }
  }

  adjustedScore += stalenessPenalty
  adjustedScore = Math.min(20, adjustedScore)

  return {
    score: adjustedScore,
    details: {
      baseScore,
      countyFactor,
      isActiveCandidate: property.is_active_sale_candidate !== false,
      adjustedScore,
      stalenessPenalty
    }
  }
}

export function calculateOpportunityScore(
  property: PropertyInput,
  settings: UserSettingsInput = DEFAULT_SETTINGS,
  redemptionRisk: RedemptionRiskResult | null = null,
  tooGoodResult: TooGoodResult | null = null
): OpportunityBreakdown {
  let equity_spread = 0
  if (property.total_amount_due != null && property.estimated_market_value != null) {
    const totalCost = (property.total_amount_due || 0) +
                      (property.estimated_repair_cost || 0) +
                      (property.estimated_cleanup_cost || 0) +
                      (property.estimated_closing_cost || 0)
    const spread = (property.estimated_market_value || 0) - totalCost
    const spreadPercent = property.estimated_market_value > 0
      ? spread / property.estimated_market_value
      : 0

    if (spreadPercent >= 0.3) equity_spread = 30
    else if (spreadPercent >= 0.15) equity_spread = 20
    else if (spreadPercent >= 0.05) equity_spread = 10
    else if (spreadPercent > 0) equity_spread = 5
    else equity_spread = 0
  }

  let property_quality = 0
  const isStandardType = ['single_family', 'condo'].includes(property.property_type)
  const hasAddress = property.zoning != null
  const isUsable = property.property_type !== 'vacant_land' || (property.lot_size_sqft && property.lot_size_sqft > 5000)

  const isMicroParcel = property.lot_size_sqft && property.lot_size_sqft < 2000 && property.property_type !== 'condo'
  const hasAssemblagePotential = property.adjacentParcelIds && property.adjacentParcelIds.length > 0

  const ownerName = (property as any).owner_name || ''
  const isEntityOwned = /LLC|CITY|HOA|ASSOC|CORP|INC|TRUST/i.test(ownerName)

  if (isStandardType) property_quality += 8
  if (hasAddress) property_quality += 6
  if (isUsable) property_quality += 6

  if (isEntityOwned) {
    property_quality = Math.max(0, property_quality - 15)
  }

  let exit_ease = 0
  const isResidential = ['single_family', 'condo', 'multifamily'].includes(property.property_type)
  const isOccupied = property.occupancy_status === 'owner_occupied' || property.occupancy_status === 'tenant'

  if (isResidential) exit_ease += 10
  if (isOccupied) exit_ease += 5
  if (property.building_sqft && property.building_sqft > 800) exit_ease += 5

  const capital_fit_details = calculateCapitalFit(property, settings)
  const capital_fit = capital_fit_details.score

  let data_confidence = property.data_confidence || 0
  data_confidence = Math.min(15, Math.max(0, data_confidence))

  let total = equity_spread + property_quality + exit_ease + capital_fit + data_confidence

  if (isMicroParcel && !hasAssemblagePotential) {
    total = Math.max(0, total - 40)
  }

  let redemption_risk_adjustment = 0
  if (redemptionRisk) {
    if (redemptionRisk.level === 'LOW') {
      redemption_risk_adjustment = 5
    } else if (redemptionRisk.level === 'HIGH') {
      redemption_risk_adjustment = -10
    }
    total = Math.max(0, total + redemption_risk_adjustment)
  }

  let too_good_adjustment = 0
  if (tooGoodResult?.triggered) {
    const criticalCount = tooGoodResult.triggers.filter(t => t.severity === 'critical').length
    if (criticalCount > 0) {
      too_good_adjustment = -15 * criticalCount
    } else {
      too_good_adjustment = -5
    }
    total = Math.max(0, total + too_good_adjustment)
  }

  // OTC (Over The Counter) bonus: +10 points
  // OTC properties are unsold from previous auctions and may have less competition
  let otc_adjustment = 0
  if (property.is_otc) {
    otc_adjustment = 10
    total = Math.min(100, total + otc_adjustment)
  }

  return {
    equity_spread,
    property_quality,
    exit_ease,
    capital_fit,
    data_confidence,
    redemption_risk_adjustment,
    too_good_adjustment,
    otc_adjustment,
    total,
    capital_fit_details
  }
}

export function calculateRiskScore(property: PropertyInput): RiskBreakdown {
  let legal_process = 0
  if (property.legal_risk === 'high') legal_process = 25
  else if (property.legal_risk === 'medium') legal_process = 12
  else if (property.legal_risk === 'unknown') legal_process = 17
  else legal_process = 5

  let property_risk = 0
  if (property.access_risk === 'high') property_risk += 12
  else if (property.access_risk === 'medium') property_risk += 6
  else if (property.access_risk === 'unknown') property_risk += 8

  if (property.title_risk === 'high') property_risk += 8
  else if (property.title_risk === 'medium') property_risk += 4
  else if (property.title_risk === 'unknown') property_risk += 6

  let execution = 0
  if (property.deposit_required && property.deposit_required > 1000) execution += 12
  else if (property.deposit_required && property.deposit_required > 500) execution += 6

  if (!property.data_confidence || property.data_confidence < 30) execution += 8

  let market = 0
  if (property.marketability_risk === 'high') market = 15
  else if (property.marketability_risk === 'medium') market = 8
  else if (property.marketability_risk === 'unknown') market = 10
  else market = 4

  const volatility = calculatePresaleVolatility(property)

  return {
    legal_process,
    property: property_risk,
    execution,
    market,
    presale_volatility: volatility.score,
    total: legal_process + property_risk + execution + market + volatility.score
  }
}

export type RecommendationResult = {
  recommendation: 'bid' | 'research_more' | 'avoid'
  reasons: string[]
  warnings: string[]
  maxBid?: number
  absenteeOwner?: boolean
  microParcel?: boolean
  assemblageOpportunity?: boolean
}

export function calculateRecommendation(
  opportunity: number,
  risk: number,
  property: PropertyInput,
  redemptionRisk: RedemptionRiskResult | null,
  tooGoodResult: TooGoodResult | null,
  volatilityDetails?: { countyFactor: string },
  capitalFitDetails?: CapitalFitDetails
): RecommendationResult {
  const reasons: string[] = []
  const warnings: string[] = []
  const result: RecommendationResult = {
    recommendation: 'avoid',
    reasons: [],
    warnings: []
  }

  const isMicroParcel = property.lot_size_sqft && property.lot_size_sqft < 2000 && property.property_type !== 'condo'
  const isExtremeMicro = property.lot_size_sqft && property.lot_size_sqft < 500 && property.property_type !== 'condo'
  const hasAssemblagePotential = property.adjacentParcelIds && property.adjacentParcelIds.length > 0

  const ownerName = (property as any).owner_name || ''
  const isEntityOwned = /LLC|CITY|HOA|ASSOC|CORP|INC|TRUST/i.test(ownerName)

  if (isExtremeMicro && !hasAssemblagePotential) {
    result.microParcel = true
    result.recommendation = 'avoid'
    result.reasons = ['Micro-parcel: Unbuildable sliver (<500 sqft)']
    result.warnings = ['Property too small for standalone development']
    return result
  }

  if (isMicroParcel && !hasAssemblagePotential) {
    result.microParcel = true
    warnings.push('Micro-parcel: likely unbuildable as standalone')
  } else if (isMicroParcel && hasAssemblagePotential) {
    result.microParcel = true
    result.assemblageOpportunity = true
    reasons.push('Assemblage opportunity with adjacent parcels')
  }

  if (isEntityOwned) {
    warnings.push(`Entity-owned (${ownerName.substring(0, 30)}...): May have complex title or legal protections`)
  }

  if (property.owner_mailing_address && property.property_address) {
    const ownerMailing = property.owner_mailing_address.toUpperCase().replace(/\s+/g, ' ')
    const propAddress = property.property_address.toUpperCase().replace(/\s+/g, ' ')

    if (!ownerMailing.includes(propAddress.split(',')[0]) && !propAddress.includes(ownerMailing.split(',')[0])) {
      result.absenteeOwner = true
      reasons.push('Absentee owner - lower redemption risk')
    }
  }

  if (redemptionRisk) {
    if (redemptionRisk.level === 'HIGH') {
      warnings.push(`High redemption risk (${redemptionRisk.percentage}%): ${redemptionRisk.factors[0]}`)
      if (opportunity < 60) {
        reasons.push('Owner likely to redeem - limited opportunity window')
      }
    } else if (redemptionRisk.level === 'LOW') {
      reasons.push(`Low redemption risk (${redemptionRisk.percentage}%) - owner unlikely to act`)
    } else {
      warnings.push(`Moderate redemption risk (${redemptionRisk.percentage}%) - monitor for redemption activity`)
    }
  }

  if (tooGoodResult?.triggered) {
    const criticalCount = tooGoodResult.triggers.filter(t => t.severity === 'critical').length
    if (criticalCount > 0) {
      warnings.push(`CRITICAL: ${tooGoodResult.summary}`)
      warnings.push(...tooGoodResult.checklist.slice(0, 3))
    } else {
      warnings.push(`Warning: ${tooGoodResult.summary}`)
    }
  }

  if (opportunity < 30) {
    result.recommendation = 'avoid'
    result.reasons = ['Opportunity score too low']
    result.warnings = ['Limited upside potential']
    if (isMicroParcel && !hasAssemblagePotential) {
      result.reasons.push('Micro-parcel: Unbuildable without assemblage')
    }
    return result
  }

  if (!property.total_amount_due) {
    result.recommendation = 'avoid'
    result.reasons = ['Missing tax amount due']
    result.warnings = ['Cannot evaluate without financial data']
    return result
  }

  if (risk > 80) {
    result.recommendation = 'avoid'
    result.reasons = ['Risk score too high']
    result.warnings = ['Multiple major risk factors present']
    return result
  }

  if (tooGoodResult?.severity === 'high_suspicion' && opportunity < 50) {
    result.recommendation = 'avoid'
    result.reasons.push('Multiple suspicious indicators - likely hidden issues')
    result.warnings.push('Complete full investigation checklist before reconsidering')
    return result
  }

  if (capitalFitDetails) {
    if (capitalFitDetails.score === 0) {
      warnings.push(`Capital constraint: ${capitalFitDetails.notes[0]}`)
    } else if (capitalFitDetails.score <= 5) {
      warnings.push('High budget usage - verify you have sufficient reserves')
    }
  }

  if (property.county === 'utah' || property.county === 'salt_lake') {
    warnings.push(`Pre-sale volatility: ${volatilityDetails?.countyFactor || 'Property may be redeemed or removed before sale'}`)
  }

  if (property.estimated_market_value && property.total_amount_due) {
    const repairCost = (property.estimated_repair_cost || 0) + (property.estimated_cleanup_cost || 0)
    const maxBid = Math.round((property.estimated_market_value * 0.70) - repairCost - property.total_amount_due)
    const minBid = Math.round(property.total_amount_due * 1.1)

    result.maxBid = Math.max(minBid, Math.min(maxBid, property.estimated_market_value * 0.5))

    if (result.maxBid > property.total_amount_due * 2) {
      reasons.push(`High equity potential: Max bid $${result.maxBid.toLocaleString()} vs $${Math.round(property.total_amount_due).toLocaleString()} payoff`)
    }
  }

  let opportunityThreshold = 70
  let riskThreshold = 40

  if (redemptionRisk?.level === 'LOW') {
    opportunityThreshold = 65
  } else if (redemptionRisk?.level === 'HIGH') {
    opportunityThreshold = 75
    riskThreshold = 35
  }

  if (tooGoodResult?.severity === 'high_suspicion') {
    opportunityThreshold += 10
  }

  if (opportunity >= opportunityThreshold && risk <= riskThreshold && !result.microParcel) {
    result.recommendation = 'bid'
    reasons.push('Strong opportunity with manageable risk')
    if (opportunity >= 85) reasons.push('Excellent equity spread')
    if (risk <= 25) reasons.push('Low risk profile')
    if (result.absenteeOwner) reasons.push('Absentee owner reduces redemption risk')

    if (property.county === 'utah' || property.county === 'salt_lake') {
      warnings.push('Monitor county list closely - property status may change before sale')
    }
  } else if (opportunity >= 55 || risk <= 60) {
    result.recommendation = 'research_more'
    if (opportunity < 75) reasons.push('Opportunity present but not exceptional')
    if (risk > 35) reasons.push('Some risk factors to investigate')
    if (result.microParcel && !result.assemblageOpportunity) reasons.push('Micro-parcel requires assemblage verification')
    if (!property.estimated_market_value) warnings.push('Missing market value estimate')
    if (property.data_confidence && property.data_confidence < 50) warnings.push('Low data confidence')

    if (redemptionRisk?.level === 'HIGH') {
      reasons.push('Research redemption activity - owner showing signs of intent')
    }

    if (tooGoodResult?.triggered && tooGoodResult.severity !== 'high_suspicion') {
      reasons.push('Investigate warning signs before proceeding')
    }
  } else {
    result.recommendation = 'avoid'
    reasons.push('Low opportunity or high risk')
  }

  result.reasons = reasons
  result.warnings = warnings
  return result
}

export function scoreProperty(
  property: PropertyInput,
  settings: UserSettingsInput = DEFAULT_SETTINGS
): ScoringResult {
  const redemptionRiskInput: RedemptionRiskInput = {
    yearsDelinquent: property.years_delinquent || 1,
    ownerName: property.owner_name || null,
    ownerMailingAddress: property.owner_mailing_address || null,
    propertyAddress: property.property_address || null,
    paymentPattern: property.has_partial_payments ? 'partial' : 'unknown',
    hasPartialPayments: property.has_partial_payments || false,
    propertyUse: property.occupancy_status === 'owner_occupied' ? 'owner_occupied' :
                 property.occupancy_status === 'tenant' ? 'rental' :
                 property.occupancy_status === 'vacant' ? 'vacant' : 'unknown',
    occupancyStatus: property.occupancy_status,
    totalAmountDue: property.total_amount_due,
    estimatedMarketValue: property.estimated_market_value,
    previousAuctionPasses: property.outcomes?.filter(o => o.event_type === 'passed').length || 0
  }

  const redemptionRisk = calculateRedemptionRisk(redemptionRiskInput)

  const tooGoodInput: TooGoodToBeTrueInput = {
    openingBid: property.opening_bid ?? property.total_amount_due,
    estimatedMarketValue: property.estimated_market_value,
    assessedValue: property.assessed_value,
    totalAmountDue: property.total_amount_due,
    propertyType: property.property_type,
    lotSizeSqft: property.lot_size_sqft,
    buildingSqft: property.building_sqft,
    yearBuilt: property.year_built,
    city: property.city ?? property.property_address?.split(',')[1]?.trim() ?? null,
    zoning: property.zoning,
    isUnincorporated: property.is_unincorporated || false,
    opportunityScore: null,
    riskScore: null,
    finalScore: null,
    outcomes: property.outcomes?.map(o => ({
      event_type: o.event_type,
      event_date: o.event_date,
      details: o.details ?? null
    })) || [],
    accessRisk: property.access_risk,
    titleRisk: property.title_risk,
    legalRisk: property.legal_risk,
    marketabilityRisk: property.marketability_risk,
    dataConfidence: property.data_confidence,
    hasZoningProfile: property.has_zoning_profile || false,
    buildabilityScore: property.buildability_score ?? null
  }

  const baseOpportunity = calculateOpportunityScore(property, settings, null, null)
  tooGoodInput.opportunityScore = baseOpportunity.total

  const risk = calculateRiskScore(property)
  tooGoodInput.riskScore = risk.total

  tooGoodInput.finalScore = Math.max(0, baseOpportunity.total - (risk.total * 0.5))

  const tooGoodResult = detectTooGoodToBeTrue(tooGoodInput)

  const opportunity = calculateOpportunityScore(property, settings, redemptionRisk, tooGoodResult)

  const opportunity_score = opportunity.total
  const risk_score = risk.total

  const volatility = calculatePresaleVolatility(property)

  const final_score = Math.max(0, opportunity_score - (risk_score * 0.5))

  const recResult = calculateRecommendation(
    opportunity_score,
    risk_score,
    property,
    redemptionRisk,
    tooGoodResult,
    volatility.details,
    opportunity.capital_fit_details
  )

  const taxFlag = calculateTaxSanityCheck(property.total_amount_due, property.estimated_market_value)
  const red_flags: RedFlagResult[] = taxFlag ? [taxFlag] : []

  return {
    opportunity_score,
    risk_score,
    final_score,
    recommendation: recResult.recommendation,
    opportunity_breakdown: opportunity,
    risk_breakdown: risk,
    presale_volatility_details: volatility.details,
    redemption_risk: redemptionRisk,
    too_good_to_be_true: tooGoodResult,
    reasons: recResult.reasons,
    warnings: recResult.warnings,
    red_flags,
    maxBid: recResult.maxBid,
    absenteeOwner: recResult.absenteeOwner,
    microParcel: recResult.microParcel,
    assemblageOpportunity: recResult.assemblageOpportunity
  }
}

export function calculateDataConfidence(property: Partial<PropertyInput>): number {
  let confidence = 0
  const fields = [
    { field: 'total_amount_due', weight: 15 },
    { field: 'estimated_market_value', weight: 15 },
    { field: 'property_type', weight: 10, check: (v: string) => v !== 'unknown' },
    { field: 'occupancy_status', weight: 10, check: (v: string) => v !== 'unknown' },
    { field: 'zoning', weight: 10 },
    { field: 'lot_size_sqft', weight: 10 },
    { field: 'building_sqft', weight: 10 },
    { field: 'year_built', weight: 10 },
    { field: 'assessed_value', weight: 10 }
  ]

  fields.forEach(({ field, weight, check }) => {
    const value = property[field as keyof PropertyInput]
    if (value != null) {
      if (check) {
        if (check(value as string)) confidence += weight
      } else {
        confidence += weight
      }
    }
  })

  return Math.min(100, confidence)
}

export function getDefaultSettings(): UserSettingsInput {
  return { ...DEFAULT_SETTINGS }
}

export { DEFAULT_SETTINGS }

export * from './redemption-risk'
export * from './too-good-detector'

export async function getAdjacentParcelNumbers(propertyId: string): Promise<string[]> {
  const adjacentParcels = await prisma.adjacentParcel.findMany({
    where: { property_id: propertyId },
    select: { adjacent_parcel_number: true }
  })
  return adjacentParcels.map(p => p.adjacent_parcel_number)
}

export async function scorePropertyWithAdjacentData(
  propertyId: string,
  propertyData: PropertyInput,
  settings?: UserSettingsInput
): Promise<ScoringResult> {
  const adjacentParcelNumbers = await getAdjacentParcelNumbers(propertyId)

  const outcomes = await prisma.outcomeEvent.findMany({
    where: { property_id: propertyId },
    select: { event_type: true, event_date: true, details: true }
  })

  const zoningProfile = await prisma.zoningProfile.findUnique({
    where: { property_id: propertyId },
    select: { id: true, buildability_score: true }
  })

  const enrichedPropertyData: PropertyInput = {
    ...propertyData,
    adjacentParcelIds: adjacentParcelNumbers,
    outcomes,
    has_zoning_profile: !!zoningProfile,
    buildability_score: zoningProfile?.buildability_score ?? null
  }

  const result = scoreProperty(enrichedPropertyData, settings)

  // Check for title analysis and adjust scores
  const titleAnalysis = await prisma.titleAnalysis.findUnique({
    where: { property_id: propertyId }
  })

  if (titleAnalysis) {
    if (titleAnalysis.score < 40) {
      result.recommendation = 'avoid'
      result.warnings.push(`Title analysis: AVOID - critical title issues (score: ${titleAnalysis.score})`)
      result.final_score = Math.max(0, result.final_score - 50)
    } else if (titleAnalysis.score < 60) {
      result.opportunity_score = Math.max(0, result.opportunity_score - 25)
      result.final_score = Math.max(0, result.final_score - 25)
      result.warnings.push(`Title analysis: DANGER - significant title issues (score: ${titleAnalysis.score})`)
    } else if (titleAnalysis.score < 80) {
      result.opportunity_score = Math.max(0, result.opportunity_score - 10)
      result.final_score = Math.max(0, result.final_score - 10)
      result.warnings.push(`Title analysis: CAUTION - review title before bidding (score: ${titleAnalysis.score})`)
    }
    // Add title score to result
    ;(result as any).title_score = titleAnalysis.score
    ;(result as any).title_recommendation = titleAnalysis.recommendation
  }

  return result
}

export function quickScoreForList(property: Partial<PropertyInput>): {
  opportunity: number
  risk: number
  final: number
  redemptionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null
  tooGoodTriggered: boolean
  tooGoodSeverity: 'none' | 'warning' | 'critical'
} {
  let opportunity = 0
  if (property.estimated_market_value && property.total_amount_due) {
    const ratio = property.total_amount_due / property.estimated_market_value
    if (ratio < 0.05) opportunity = 70
    else if (ratio < 0.1) opportunity = 50
    else if (ratio < 0.2) opportunity = 35
    else opportunity = 20
  }

  let risk = 30
  if (property.access_risk === 'high') risk += 15
  if (property.title_risk === 'high') risk += 15
  if (property.legal_risk === 'high') risk += 15

  const ownerType = detectOwnerType(property.owner_name || null)
  let redemptionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null = null
  if (ownerType === 'bank') redemptionLevel = 'HIGH'
  else if (property.occupancy_status === 'vacant') redemptionLevel = 'LOW'
  else if (property.occupancy_status === 'owner_occupied') redemptionLevel = 'MEDIUM'

  const tgttb = quickTGTTBCheck(
    property.opening_bid ?? property.total_amount_due ?? 0,
    property.estimated_market_value ?? null,
    0
  )

  return {
    opportunity,
    risk,
    final: Math.max(0, opportunity - (risk * 0.5)),
    redemptionLevel,
    tooGoodTriggered: tgttb.triggered,
    tooGoodSeverity: tgttb.severity
  }
}
