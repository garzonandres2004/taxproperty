// TaxProperty Utah - Scoring Engine
// Transparent, rule-based scoring per Perplexity spec

import { getPresaleVolatilityScore } from '@/lib/counties/config'
import { prisma } from '@/lib/db'

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
  presale_volatility_risk?: number // Override value
  is_active_sale_candidate?: boolean
  status_last_verified_at?: string | Date | null
  sale_date?: string | Date | null
  // NEW: Owner analysis fields
  owner_name?: string | null
  owner_mailing_address?: string | null
  property_address?: string | null
  // NEW: Assemblage tracking
  adjacentParcelIds?: string[]
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
  reasons: string[]
  warnings: string[]
  // NEW: Strategic analysis fields
  maxBid?: number
  absenteeOwner?: boolean
  microParcel?: boolean
  assemblageOpportunity?: boolean
}

// Default settings for backward compatibility
const DEFAULT_SETTINGS: UserSettingsInput = {
  totalBudget: 50000,
  maxPerProperty: 25000,
  reserveBuffer: 5000
}

// Constants
const OPPORTUNITY_WEIGHTS = {
  equity_spread: 30,
  property_quality: 20,
  exit_ease: 20,
  capital_fit: 15,
  data_confidence: 15
} as const

const RISK_WEIGHTS = {
  legal_process: 25,  // Reduced from 30 to make room for volatility
  property: 20,       // Reduced from 25
  execution: 20,      // Reduced from 25
  market: 15,         // Reduced from 20
  presale_volatility: 20 // NEW: Pre-sale instability risk
} as const

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

  // Check hard limits first
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

  // Additional note for budget usage
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

export function calculateOpportunityScore(
  property: PropertyInput,
  settings: UserSettingsInput = DEFAULT_SETTINGS
): OpportunityBreakdown {
  // 1. Equity Spread (30 points)
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

  // 2. Property Quality (20 points)
  let property_quality = 0
  const isStandardType = ['single_family', 'condo'].includes(property.property_type)
  const hasAddress = property.zoning != null
  const isUsable = property.property_type !== 'vacant_land' || (property.lot_size_sqft && property.lot_size_sqft > 5000)

  // ENHANCED MICRO-PARCEL FILTER for Demo Quality
  const isMicroParcel = property.lot_size_sqft && property.lot_size_sqft < 2000 && property.property_type !== 'condo'
  const isExtremeMicro = property.lot_size_sqft && property.lot_size_sqft < 500 && property.property_type !== 'condo'
  const hasAssemblagePotential = property.adjacentParcelIds && property.adjacentParcelIds.length > 0

  // ENTITY-OWNED PENALTY: LLCs, Cities, HOAs are harder to acquire
  const ownerName = (property as any).owner_name || ''
  const isEntityOwned = /LLC|CITY|HOA|ASSOC|CORP|INC|TRUST/i.test(ownerName)

  if (isStandardType) property_quality += 8
  if (hasAddress) property_quality += 6
  if (isUsable) property_quality += 6

  // Micro-parcel detection (penalty applied to total score below)
  // isMicroParcel and isExtremeMicro are calculated above for use in total score

  // Entity-owned penalty
  if (isEntityOwned) {
    property_quality = Math.max(0, property_quality - 15)
  }

  // 3. Exit Ease (20 points)
  let exit_ease = 0
  const isResidential = ['single_family', 'condo', 'multifamily'].includes(property.property_type)
  const isOccupied = property.occupancy_status === 'owner_occupied' || property.occupancy_status === 'tenant'

  if (isResidential) exit_ease += 10
  if (isOccupied) exit_ease += 5
  if (property.building_sqft && property.building_sqft > 800) exit_ease += 5

  // 4. Capital Fit (15 points) - Now uses user settings
  const capital_fit_details = calculateCapitalFit(property, settings)
  const capital_fit = capital_fit_details.score

  // 5. Data Confidence (15 points)
  let data_confidence = property.data_confidence || 0
  data_confidence = Math.min(15, Math.max(0, data_confidence))

  // Calculate total opportunity score
  let total = equity_spread + property_quality + exit_ease + capital_fit + data_confidence

  // Apply micro-parcel penalty to total opportunity score
  if (isMicroParcel && !hasAssemblagePotential) {
    total = Math.max(0, total - 40)
  }

  return {
    equity_spread,
    property_quality,
    exit_ease,
    capital_fit,
    data_confidence,
    total,
    capital_fit_details
  }
}

// Calculate pre-sale volatility risk (0-20 points)
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
  // Base score from county config (0-15 based on preSaleInstability)
  const baseScore = property.presale_volatility_risk ?? getPresaleVolatilityScore(property.county || '')

  // County-specific factors
  let countyFactor = 'Standard county behavior'
  let adjustedScore = baseScore
  let stalenessPenalty = 0

  if (property.county === 'utah') {
    countyFactor = 'Utah County: High pre-sale instability. Properties can be redeemed until bidding starts. List changes in real-time.'
    // Utah County gets max volatility due to redemption-until-bidding + live list behavior
    adjustedScore = Math.max(baseScore, 10)
  } else if (property.county === 'salt_lake') {
    countyFactor = 'Salt Lake County: Medium-high instability. Redemption possible until sale.'
    adjustedScore = Math.max(baseScore, 8)
  }

  // Boost if not an active sale candidate
  if (property.is_active_sale_candidate === false) {
    adjustedScore += 5
    countyFactor += ' Property marked as inactive/pulled from sale.'
  }

  // Boost if data confidence is low (means we don't know current status)
  if (!property.data_confidence || property.data_confidence < 40) {
    adjustedScore += 3
    countyFactor += ' Low data confidence increases uncertainty.'
  }

  // Staleness-based penalties: add volatility when data is old and sale is near
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

  // Cap at 20 points
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

export function calculateRiskScore(property: PropertyInput): RiskBreakdown {
  // 1. Legal/Process Risk (25 points)
  let legal_process = 0
  if (property.legal_risk === 'high') legal_process = 25
  else if (property.legal_risk === 'medium') legal_process = 12
  else if (property.legal_risk === 'unknown') legal_process = 17
  else legal_process = 5

  // 2. Property Risk (20 points)
  let property_risk = 0
  if (property.access_risk === 'high') property_risk += 12
  else if (property.access_risk === 'medium') property_risk += 6
  else if (property.access_risk === 'unknown') property_risk += 8

  if (property.title_risk === 'high') property_risk += 8
  else if (property.title_risk === 'medium') property_risk += 4
  else if (property.title_risk === 'unknown') property_risk += 6

  // 3. Execution Risk (20 points)
  let execution = 0
  if (property.deposit_required && property.deposit_required > 1000) execution += 12
  else if (property.deposit_required && property.deposit_required > 500) execution += 6

  if (!property.data_confidence || property.data_confidence < 30) execution += 8

  // 4. Market Risk (15 points)
  let market = 0
  if (property.marketability_risk === 'high') market = 15
  else if (property.marketability_risk === 'medium') market = 8
  else if (property.marketability_risk === 'unknown') market = 10
  else market = 4

  // 5. Pre-sale Volatility Risk (20 points) - NEW
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

  // ENHANCED MICRO-PARCEL FILTER for Demo
  const isMicroParcel = property.lot_size_sqft && property.lot_size_sqft < 2000 && property.property_type !== 'condo'
  const isExtremeMicro = property.lot_size_sqft && property.lot_size_sqft < 500 && property.property_type !== 'condo'
  const hasAssemblagePotential = property.adjacentParcelIds && property.adjacentParcelIds.length > 0

  // ENTITY-OWNED DETECTION
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

  // Entity-owned penalty flag
  if (isEntityOwned) {
    warnings.push(`Entity-owned (${ownerName.substring(0, 30)}...): May have complex title or legal protections`)
  }

  // OWNER MAILING ADDRESS ANALYSIS: Absentee owner detection
  if (property.owner_mailing_address && property.property_address) {
    const ownerMailing = property.owner_mailing_address.toUpperCase().replace(/\s+/g, ' ')
    const propAddress = property.property_address.toUpperCase().replace(/\s+/g, ' ')

    // Check if mailing address is different (absentee owner)
    if (!ownerMailing.includes(propAddress.split(',')[0]) && !propAddress.includes(ownerMailing.split(',')[0])) {
      result.absenteeOwner = true
      reasons.push('Absentee owner - lower redemption risk')
    }
  }

  // Hard stops
  if (opportunity < 30) {
    result.recommendation = 'avoid'
    result.reasons = ['Opportunity score too low']
    result.warnings = ['Limited upside potential']
    if (isMicroParcel && !hasAssemblagePotential) {
      result.reasons.push('Micro-parcel: Unbuildable without assemblage')
    }
    return result
  }

  // Hard stops from property data
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

  // Capital fit warning
  if (capitalFitDetails) {
    if (capitalFitDetails.score === 0) {
      warnings.push(`Capital constraint: ${capitalFitDetails.notes[0]}`)
    } else if (capitalFitDetails.score <= 5) {
      warnings.push('High budget usage - verify you have sufficient reserves')
    }
  }

  // Pre-sale volatility warning
  if (property.county === 'utah' || property.county === 'salt_lake') {
    warnings.push(`Pre-sale volatility: ${volatilityDetails?.countyFactor || 'Property may be redeemed or removed before sale'}`)
  }

  // MAX BID CALCULATION: (Market Value * 0.70) - Repairs - Delinquent Debt
  if (property.estimated_market_value && property.total_amount_due) {
    const repairCost = (property.estimated_repair_cost || 0) + (property.estimated_cleanup_cost || 0)
    const maxBid = Math.round((property.estimated_market_value * 0.70) - repairCost - property.total_amount_due)
    const minBid = Math.round(property.total_amount_due * 1.1) // 10% premium over payoff

    result.maxBid = Math.max(minBid, Math.min(maxBid, property.estimated_market_value * 0.5))

    // Add bidding strategy note
    if (result.maxBid > property.total_amount_due * 2) {
      reasons.push(`High equity potential: Max bid $${result.maxBid.toLocaleString()} vs $${Math.round(property.total_amount_due).toLocaleString()} payoff`)
    }
  }

  // Recommendation logic (adjusted thresholds for demo - strict filtering)
  if (opportunity >= 70 && risk <= 40 && !result.microParcel) {
    result.recommendation = 'bid'
    reasons.push('Strong opportunity with manageable risk')
    if (opportunity >= 85) reasons.push('Excellent equity spread')
    if (risk <= 25) reasons.push('Low risk profile')
    if (result.absenteeOwner) reasons.push('Absentee owner reduces redemption risk')

    // Special note for pre-sale unstable counties
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
  const opportunity = calculateOpportunityScore(property, settings)
  const risk = calculateRiskScore(property)

  const opportunity_score = opportunity.total
  const risk_score = risk.total

  // Calculate volatility details separately for reporting
  const volatility = calculatePresaleVolatility(property)

  // Final score calculation
  const final_score = Math.max(0, opportunity_score - (risk_score * 0.5))

  const recResult = calculateRecommendation(
    opportunity_score,
    risk_score,
    property,
    volatility.details,
    opportunity.capital_fit_details
  )

  return {
    opportunity_score,
    risk_score,
    final_score,
    recommendation: recResult.recommendation,
    opportunity_breakdown: opportunity,
    risk_breakdown: risk,
    presale_volatility_details: volatility.details,
    reasons: recResult.reasons,
    warnings: recResult.warnings,
    // NEW: Strategic fields
    maxBid: recResult.maxBid,
    absenteeOwner: recResult.absenteeOwner,
    microParcel: recResult.microParcel,
    assemblageOpportunity: recResult.assemblageOpportunity
  }
}

// Helper to calculate data confidence score
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

// Helper to get default settings (for backward compatibility)
export function getDefaultSettings(): UserSettingsInput {
  return { ...DEFAULT_SETTINGS }
}

// Re-export types for convenience
export { DEFAULT_SETTINGS }

/**
 * Load adjacent parcel numbers for a property from database
 */
export async function getAdjacentParcelNumbers(propertyId: string): Promise<string[]> {
  const adjacentParcels = await prisma.adjacentParcel.findMany({
    where: { property_id: propertyId },
    select: { adjacent_parcel_number: true }
  })
  return adjacentParcels.map(p => p.adjacent_parcel_number)
}

/**
 * Score a property with adjacent parcel data loaded from database
 */
export async function scorePropertyWithAdjacentData(
  propertyId: string,
  propertyData: PropertyInput,
  settings?: UserSettingsInput
): Promise<ScoringResult> {
  const adjacentParcelNumbers = await getAdjacentParcelNumbers(propertyId)

  const enrichedPropertyData: PropertyInput = {
    ...propertyData,
    adjacentParcelIds: adjacentParcelNumbers
  }

  return scoreProperty(enrichedPropertyData, settings)
}
