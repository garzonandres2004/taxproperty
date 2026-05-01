// Redemption Risk Scoring Engine
// Calculates likelihood that original owner will redeem property
// Based on Dustin Hahn signals and Utah County tax sale patterns

export type OwnerType = 'individual' | 'llc' | 'corporation' | 'bank' | 'trust' | 'government' | 'unknown'
export type PropertyUse = 'owner_occupied' | 'rental' | 'vacant' | 'commercial' | 'unknown'
export type PaymentPattern = 'none' | 'partial' | 'consistent' | 'unknown'

export interface RedemptionRiskInput {
  // Years of delinquency
  yearsDelinquent: number

  // Owner characteristics
  ownerName: string | null
  ownerMailingAddress: string | null
  propertyAddress: string | null

  // Payment history signals
  paymentPattern: PaymentPattern
  hasPartialPayments: boolean

  // Property characteristics
  propertyUse: PropertyUse
  occupancyStatus: string

  // Financial signals
  totalAmountDue: number | null
  estimatedMarketValue: number | null

  // Historical data
  previousAuctionPasses?: number
}

export interface RedemptionRiskResult {
  score: number // 0-100, higher = more likely to redeem
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  percentage: number // Display percentage (0-100%)
  factors: string[] // Which factors contributed
  breakdown: {
    yearsDelinquent: number // 0-25 points
    ownerType: number // 0-40 points
    paymentPattern: number // 0-30 points
    propertyUse: number // 0-40 points
    financialStress: number // 0-20 points (bonus)
  }
  notes: string[] // Human-readable notes
}

// Detect owner type from name patterns
export function detectOwnerType(ownerName: string | null): OwnerType {
  if (!ownerName) return 'unknown'

  const upper = ownerName.toUpperCase()

  // Bank/lender patterns
  if (/BANK|LENDER|MORTGAGE|LOAN|CREDIT UNION|FINANCIAL/i.test(upper)) {
    return 'bank'
  }

  // Government
  if (/CITY|COUNTY|STATE|FEDERAL|GOVERNMENT|MUNICIPAL/i.test(upper)) {
    return 'government'
  }

  // Corporation (non-bank)
  if (/INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|LIMITED/i.test(upper)) {
    return 'corporation'
  }

  // Trust
  if (/TRUST|TRUSTEE|ESTATE|FAMILY/i.test(upper)) {
    return 'trust'
  }

  // LLC
  if (/LLC|L\.L\.C\./i.test(upper)) {
    return 'llc'
  }

  // Individual (default)
  return 'individual'
}

// Detect if owner is absentee (mailing address differs from property)
export function detectAbsenteeOwner(
  ownerMailingAddress: string | null,
  propertyAddress: string | null
): boolean {
  if (!ownerMailingAddress || !propertyAddress) return false

  const normalize = (addr: string) => addr.toUpperCase().replace(/\s+/g, ' ').trim()
  const owner = normalize(ownerMailingAddress)
  const prop = normalize(propertyAddress)

  // Extract street number and name for comparison
  const ownerParts = owner.split(',')[0].trim()
  const propParts = prop.split(',')[0].trim()

  // Check if mailing address contains property address components
  return !owner.includes(propParts) && !prop.includes(ownerParts)
}

// Determine property use from occupancy and other signals
export function detectPropertyUse(
  occupancyStatus: string,
  ownerMailingAddress: string | null,
  propertyAddress: string | null
): PropertyUse {
  const normalized = occupancyStatus.toLowerCase()

  if (normalized === 'owner_occupied') return 'owner_occupied'
  if (normalized === 'tenant') return 'rental'
  if (normalized === 'vacant') return 'vacant'

  // Check if owner mailing matches property (owner occupied indicator)
  if (ownerMailingAddress && propertyAddress) {
    const isAbsentee = detectAbsenteeOwner(ownerMailingAddress, propertyAddress)
    if (!isAbsentee) return 'owner_occupied'
  }

  return 'unknown'
}

// Calculate redemption risk score
export function calculateRedemptionRisk(input: RedemptionRiskInput): RedemptionRiskResult {
  const factors: string[] = []
  const notes: string[] = []
  const breakdown = {
    yearsDelinquent: 0,
    ownerType: 0,
    paymentPattern: 0,
    propertyUse: 0,
    financialStress: 0
  }

  // 1. Years Delinquent (0-25 points)
  // Logic: Longer delinquency = lower redemption likelihood
  if (input.yearsDelinquent >= 5) {
    breakdown.yearsDelinquent = 5 // High risk = low redemption
    factors.push('5+ years delinquent - owner unlikely to redeem')
    notes.push('Property delinquent for 5+ years - owner has not acted to resolve')
  } else if (input.yearsDelinquent >= 3) {
    breakdown.yearsDelinquent = 15
    factors.push('3-4 years delinquent')
    notes.push('Multiple years of delinquency - redemption less likely')
  } else if (input.yearsDelinquent >= 1) {
    breakdown.yearsDelinquent = 25
    factors.push('1-2 years delinquent')
    notes.push('Recent delinquency - owner may still redeem')
  } else {
    breakdown.yearsDelinquent = 20
    factors.push('Less than 1 year delinquent')
    notes.push('Newly delinquent - monitor closely for redemption')
  }

  // 2. Owner Type (0-40 points)
  // Logic: Banks/Corps redeem more, Individuals/LLCs less
  const ownerType = detectOwnerType(input.ownerName)
  switch (ownerType) {
    case 'bank':
      breakdown.ownerType = 40 // Banks almost always redeem or sell before auction
      factors.push('Bank-owned - very high redemption likelihood')
      notes.push('Bank/lender owner - typically redeems or resolves before sale')
      break
    case 'government':
      breakdown.ownerType = 35
      factors.push('Government entity - high redemption likelihood')
      notes.push('Government ownership - likely to resolve through other means')
      break
    case 'corporation':
      breakdown.ownerType = 30
      factors.push('Corporation-owned - higher redemption likelihood')
      notes.push('Corporate owner may have resources to redeem')
      break
    case 'trust':
      breakdown.ownerType = 25
      factors.push('Trust-owned - moderate redemption risk')
      notes.push('Trust ownership - may have complex resolution timeline')
      break
    case 'llc':
      breakdown.ownerType = 15
      factors.push('LLC-owned - lower redemption likelihood')
      notes.push('LLC ownership - often investment property, lower emotional attachment')
      break
    case 'individual':
    default:
      // Check if absentee owner
      const isAbsentee = detectAbsenteeOwner(input.ownerMailingAddress, input.propertyAddress)
      if (isAbsentee) {
        breakdown.ownerType = 10
        factors.push('Individual absentee owner - lower redemption risk')
        notes.push('Owner does not live at property - lower emotional/financial attachment')
      } else {
        breakdown.ownerType = 20
        factors.push('Individual owner-occupied - moderate redemption risk')
        notes.push('Owner may have emotional attachment to primary residence')
      }
      break
  }

  // 3. Payment Pattern (0-30 points)
  // Logic: Partial payments indicate intent to keep property
  if (input.hasPartialPayments) {
    breakdown.paymentPattern = 30 // Strong redemption signal
    factors.push('Partial payments found - owner trying to keep property')
    notes.push('Owner has made partial payments - actively working to resolve')
  } else if (input.paymentPattern === 'partial') {
    breakdown.paymentPattern = 25
    factors.push('Irregular payment history')
    notes.push('Inconsistent payment pattern - some financial engagement')
  } else if (input.paymentPattern === 'consistent') {
    breakdown.paymentPattern = 20
    factors.push('Previously consistent payer')
    notes.push('Good payment history prior to delinquency')
  } else {
    breakdown.paymentPattern = 5
    factors.push('No payment activity')
    notes.push('No payment activity detected - owner may have abandoned property')
  }

  // 4. Property Use (0-40 points)
  // Logic: Owner-occupied = high redemption, Vacant = low redemption
  const propUse = detectPropertyUse(
    input.occupancyStatus,
    input.ownerMailingAddress,
    input.propertyAddress
  )
  switch (propUse) {
    case 'owner_occupied':
      breakdown.propertyUse = 40
      factors.push('Owner-occupied residence - high redemption likelihood')
      notes.push('Primary residence - owner likely to fight to keep home')
      break
    case 'rental':
      breakdown.propertyUse = 25
      factors.push('Rental property - moderate redemption risk')
      notes.push('Income-producing property - owner may redeem to keep cash flow')
      break
    case 'commercial':
      breakdown.propertyUse = 20
      factors.push('Commercial property')
      notes.push('Business use - financial decision, less emotional')
      break
    case 'vacant':
      breakdown.propertyUse = 10
      factors.push('Vacant property - low redemption likelihood')
      notes.push('Vacant land - lower emotional/financial attachment')
      break
    default:
      breakdown.propertyUse = 20
      factors.push('Property use unknown')
      notes.push('Unable to determine occupancy - assume moderate risk')
  }

  // 5. Financial Stress Indicator (0-20 bonus points)
  // Logic: High tax-to-value ratio may indicate inability to redeem
  if (input.totalAmountDue && input.estimatedMarketValue && input.estimatedMarketValue > 0) {
    const taxRatio = input.totalAmountDue / input.estimatedMarketValue
    if (taxRatio > 0.5) {
      // More than 50% of value in taxes - severe financial distress
      breakdown.financialStress = -10 // Negative = reduces redemption likelihood
      factors.push('Severe tax burden (>50% of value) - may lack funds to redeem')
      notes.push('Tax debt exceeds 50% of property value - owner may be unable to redeem')
    } else if (taxRatio > 0.2) {
      breakdown.financialStress = -5
      factors.push('High tax burden (20-50% of value)')
      notes.push('Significant tax burden relative to property value')
    } else if (taxRatio < 0.01) {
      // Less than 1% - very low taxes, might be special case
      breakdown.financialStress = 5
      factors.push('Unusually low tax amount - verify data')
      notes.push('Tax amount seems low - may indicate partial payments or exemptions')
    }
  }

  // Calculate total score
  let score = breakdown.yearsDelinquent + breakdown.ownerType +
              breakdown.paymentPattern + breakdown.propertyUse +
              Math.max(-20, breakdown.financialStress)

  // Cap at 100
  score = Math.min(100, Math.max(0, score))

  // Determine level
  let level: 'LOW' | 'MEDIUM' | 'HIGH'
  if (score >= 70) {
    level = 'HIGH'
  } else if (score >= 40) {
    level = 'MEDIUM'
  } else {
    level = 'LOW'
  }

  // Add previous auction passes as modifier
  if (input.previousAuctionPasses && input.previousAuctionPasses > 0) {
    notes.push(`Property passed at ${input.previousAuctionPasses} previous auction(s) - may indicate owner redemption attempts`)
  }

  return {
    score,
    level,
    percentage: score,
    factors,
    breakdown,
    notes
  }
}

// Quick assessment for property card display
export function quickRedemptionAssessment(
  ownerName: string | null,
  yearsDelinquent: number,
  occupancyStatus: string
): { level: 'LOW' | 'MEDIUM' | 'HIGH'; indicator: string } {
  const ownerType = detectOwnerType(ownerName)

  // Quick heuristics for list view
  if (ownerType === 'bank' || ownerType === 'government') {
    return { level: 'HIGH', indicator: 'Bank/Gov' }
  }

  if (yearsDelinquent >= 5) {
    return { level: 'LOW', indicator: '5+ yrs' }
  }

  if (occupancyStatus === 'owner_occupied') {
    return { level: 'MEDIUM', indicator: 'Owner Occ' }
  }

  if (occupancyStatus === 'vacant') {
    return { level: 'LOW', indicator: 'Vacant' }
  }

  return { level: 'MEDIUM', indicator: 'Standard' }
}
