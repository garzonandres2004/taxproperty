// "Too Good To Be True" Detector
// Identifies properties that appear exceptional but may have hidden issues
// Based on Dustin Hahn due diligence framework

import { OutcomeEvent } from '@prisma/client'

export interface TooGoodToBeTrueInput {
  // Financial indicators
  openingBid: number | null
  estimatedMarketValue: number | null
  assessedValue: number | null
  totalAmountDue: number | null

  // Property characteristics
  propertyType: string
  lotSizeSqft: number | null
  buildingSqft: number | null
  yearBuilt: number | null

  // Location signals
  city: string | null
  zoning: string | null
  isUnincorporated: boolean
  coordinates?: { lat: number; lng: number } | null

  // Scoring context
  opportunityScore: number | null
  riskScore: number | null
  finalScore: number | null

  // Historical data
  outcomes: Array<Pick<OutcomeEvent, 'event_type' | 'event_date' | 'details'>>

  // Risk flags
  accessRisk: string
  titleRisk: string
  legalRisk: string
  marketabilityRisk: string

  // Additional context
  dataConfidence: number | null
  hasZoningProfile: boolean
  buildabilityScore: number | null
}

export type TGTTBTriggerType =
  | 'ultra_low_bid'
  | 'prime_location_low_score'
  | 'multiple_passes'
  | 'high_value_no_bidders'
  | 'data_discrepancy'
  | 'tax_anomaly'

export interface TGTTBTrigger {
  type: TGTTBTriggerType
  severity: 'warning' | 'critical'
  message: string
  details?: string
}

export interface TooGoodResult {
  triggered: boolean
  triggers: TGTTBTrigger[]
  severity: 'none' | 'investigate' | 'high_suspicion'
  checklist: string[]
  summary: string
  notes: string[]
}

// Prime locations in Utah County (city centers, desirable areas)
const PRIME_LOCATIONS = [
  // City centers and downtown areas
  'provo',
  'orem',
  'lehi',
  'american fork',
  'pleasant grove',
  'spanish fork',
  'springville',
  'highland',
  'alpine',
  'cedar hills',
  // Tech corridor
  'lindon',
  'vineyard',
  'eagle mountain',
  'saratoga springs'
]

// Low-opportunity areas where low scores are expected
const RURAL_AREAS = [
  'elberta',
  'genola',
  'goshen',
  'lake shore',
  'palmyra',
  'mammoth'
]

// Detect if property is in a prime location
function isPrimeLocation(city: string | null, zoning: string | null): boolean {
  if (!city) return false

  const cityLower = city.toLowerCase()

  // Check for prime location match
  return PRIME_LOCATIONS.some(prime => cityLower.includes(prime))
}

// Detect if property is in a rural/low-demand area
function isRuralArea(city: string | null): boolean {
  if (!city) return false
  return RURAL_AREAS.some(rural => city.toLowerCase().includes(rural))
}

// Count previous auction passes
function countAuctionPasses(
  outcomes: Array<Pick<OutcomeEvent, 'event_type' | 'event_date' | 'details'>>
): number {
  return outcomes.filter(o => o.event_type === 'passed').length
}

// Main detector function
export function detectTooGoodToBeTrue(input: TooGoodToBeTrueInput): TooGoodResult {
  const triggers: TGTTBTrigger[] = []
  const notes: string[] = []

  // 1. Ultra-low opening bid relative to value
  if (input.openingBid !== null && input.estimatedMarketValue !== null && input.estimatedMarketValue > 0) {
    const bidToArvRatio = input.openingBid / input.estimatedMarketValue

    if (bidToArvRatio < 0.005) { // Less than 0.5% of ARV
      triggers.push({
        type: 'ultra_low_bid',
        severity: 'critical',
        message: `Opening bid is ${(bidToArvRatio * 100).toFixed(2)}% of estimated value`,
        details: `Bid: $${input.openingBid.toLocaleString()} vs ARV: $${input.estimatedMarketValue.toLocaleString()}`
      })
      notes.push('Opening bid is suspiciously low relative to market value')
    } else if (bidToArvRatio < 0.01) { // Less than 1%
      triggers.push({
        type: 'ultra_low_bid',
        severity: 'warning',
        message: `Opening bid is only ${(bidToArvRatio * 100).toFixed(1)}% of estimated value`,
        details: 'Below typical 2-5% range for tax sales'
      })
      notes.push('Opening bid is lower than typical tax sale percentages')
    }
  }

  // Also check tax amount vs assessed value (payoff ratio anomaly)
  if (input.totalAmountDue !== null && input.assessedValue !== null && input.assessedValue > 0) {
    const taxToAssessedRatio = input.totalAmountDue / input.assessedValue

    if (taxToAssessedRatio < 0.005) {
      triggers.push({
        type: 'tax_anomaly',
        severity: 'warning',
        message: 'Tax amount unusually low relative to assessed value',
        details: `Tax: $${input.totalAmountDue.toLocaleString()} vs Assessed: $${input.assessedValue.toLocaleString()}`
      })
      notes.push('Tax amount seems too low - verify exemptions or partial payments')
    }
  }

  // 2. Prime location with low score
  if (isPrimeLocation(input.city, input.zoning)) {
    const score = input.finalScore || 0
    const opScore = input.opportunityScore || 0

    // Prime location properties should have decent scores unless there's a major issue
    if (score < 40 && opScore < 50) {
      triggers.push({
        type: 'prime_location_low_score',
        severity: 'critical',
        message: 'Prime location property with unusually low score',
        details: `${input.city} properties typically score higher - investigate specific issues`
      })
      notes.push(`Property in ${input.city} should have strong fundamentals - verify risk factors`)
    } else if (score < 55) {
      triggers.push({
        type: 'prime_location_low_score',
        severity: 'warning',
        message: 'Below-average score for this desirable area',
        details: 'Location is strong, but property-specific factors are suppressing score'
      })
    }
  }

  // 3. Multiple previous auction passes
  const passCount = countAuctionPasses(input.outcomes)
  if (passCount >= 2) {
    triggers.push({
      type: 'multiple_passes',
      severity: 'critical',
      message: `Passed at ${passCount} previous auctions`,
      details: 'Experienced investors have examined and passed on this property multiple times'
    })
    notes.push('Multiple auction passes indicate known issues - research prior auction cycles')
  } else if (passCount === 1) {
    triggers.push({
      type: 'multiple_passes',
      severity: 'warning',
      message: 'Passed at 1 previous auction',
      details: 'May indicate issues discovered during prior due diligence'
    })
  }

  // 4. High value but no bidders (inferred from auction passes + high value)
  if (passCount > 0 && input.estimatedMarketValue !== null && input.estimatedMarketValue > 200000) {
    const hasHighRiskFlags =
      input.accessRisk === 'high' ||
      input.titleRisk === 'high' ||
      input.legalRisk === 'high'

    if (!hasHighRiskFlags) {
      triggers.push({
        type: 'high_value_no_bidders',
        severity: 'warning',
        message: 'High-value property passed at auction without obvious risk flags',
        details: 'Investors passed despite strong fundamentals - hidden issue likely'
      })
    }
  }

  // 5. Data discrepancy / low confidence on high-value property
  if (input.dataConfidence !== null && input.dataConfidence < 50) {
    if (input.estimatedMarketValue !== null && input.estimatedMarketValue > 150000) {
      triggers.push({
        type: 'data_discrepancy',
        severity: 'warning',
        message: 'Low data confidence on higher-value property',
        details: 'Missing key information on property that should be well-documented'
      })
    }
  }

  // 6. Building with no zoning profile (anomaly)
  if (input.propertyType !== 'vacant_land' && !input.hasZoningProfile) {
    if (input.buildingSqft !== null && input.buildingSqft > 0) {
      triggers.push({
        type: 'data_discrepancy',
        severity: 'warning',
        message: 'Improved property without zoning information',
        details: 'Zoning data should be available for buildings'
      })
    }
  }

  // 7. Extremely low buildability score in unincorporated area
  if (input.isUnincorporated && input.buildabilityScore !== null && input.buildabilityScore < 30) {
    if (input.lotSizeSqft !== null && input.lotSizeSqft > 10000) {
      triggers.push({
        type: 'data_discrepancy',
        severity: 'warning',
        message: 'Large unincorporated lot with very low buildability',
        details: 'May indicate access, slope, or utility issues'
      })
    }
  }

  // Determine severity and summary
  const criticalCount = triggers.filter(t => t.severity === 'critical').length
  const warningCount = triggers.filter(t => t.severity === 'warning').length

  let severity: 'none' | 'investigate' | 'high_suspicion'
  let summary: string

  if (criticalCount > 0) {
    severity = 'high_suspicion'
    summary = `Multiple critical warning signs detected (${criticalCount} critical, ${warningCount} warnings). Deep investigation required before bidding.`
  } else if (warningCount > 0) {
    severity = 'investigate'
    summary = `${warningCount} warning sign${warningCount > 1 ? 's' : ''} detected. Verify property details before proceeding.`
  } else {
    severity = 'none'
    summary = 'No unusual warning signs detected. Standard due diligence recommended.'
  }

  // Generate checklist based on triggers
  const checklist = generateInvestigationChecklist(triggers, input)

  return {
    triggered: triggers.length > 0,
    triggers,
    severity,
    checklist,
    summary,
    notes
  }
}

// Generate investigation checklist based on detected triggers
function generateInvestigationChecklist(
  triggers: TGTTBTrigger[],
  input: TooGoodToBeTrueInput
): string[] {
  const checklist: string[] = []
  const triggerTypes = triggers.map(t => t.type)

  // Always include these base items
  checklist.push('Verify actual property location on county GIS')
  checklist.push('Confirm parcel number matches physical address')

  // Environmental issues (always important)
  if (triggerTypes.includes('ultra_low_bid') ||
      triggerTypes.includes('prime_location_low_score') ||
      triggerTypes.includes('multiple_passes')) {
    checklist.push('Check for environmental contamination (EPA database)')
    checklist.push('Verify no hazardous materials on-site')
    checklist.push('Check flood zone status (FEMA maps)')
    checklist.push('Verify no wetland or protected habitat restrictions')
  }

  // Title and legal issues
  if (triggerTypes.includes('multiple_passes') ||
      triggerTypes.includes('high_value_no_bidders')) {
    checklist.push('Order preliminary title report')
    checklist.push('Check for liens beyond tax debt (IRS, mechanics, judgments)')
    checklist.push('Verify no bankruptcy proceedings affecting property')
    checklist.push('Confirm no probate or estate complications')
    checklist.push('Check for cloud on title (easements, encroachments)')
  }

  // Access and egress
  if (triggerTypes.includes('data_discrepancy') ||
      (input.accessRisk === 'high') ||
      (input.accessRisk === 'unknown')) {
    checklist.push('Physically verify access/egress to property')
    checklist.push('Confirm legal right of way exists')
    checklist.push('Check for locked gates, private roads, or access disputes')
    checklist.push('Verify road maintenance agreements if on private road')
  }

  // Property condition
  if (triggerTypes.includes('ultra_low_bid') && input.propertyType !== 'vacant_land') {
    checklist.push('Conduct physical site inspection')
    checklist.push('Check for unpermitted structures or additions')
    checklist.push('Verify building is actually on the parcel (not neighboring lot)')
    checklist.push('Look for signs of foundation issues, sinkholes, or unstable ground')
  }

  // Tax and financial
  if (triggerTypes.includes('tax_anomaly')) {
    checklist.push('Verify exact tax amount due with county treasurer')
    checklist.push('Check for special assessments or SID/LID obligations')
    checklist.push('Confirm no HOA liens or special tax districts')
    checklist.push('Verify property is not in bankruptcy or litigation hold')
  }

  // Why passed previous auctions
  if (triggerTypes.includes('multiple_passes')) {
    checklist.push('Contact county treasurer - why did this pass previously?')
    checklist.push('Search for prior auction records and bidder notes')
    checklist.push('Check if redemption period expired between auctions')
    checklist.push('Verify property was actually available in prior auctions')
  }

  // Zoning and use
  if (input.propertyType !== 'vacant_land' && !input.hasZoningProfile) {
    checklist.push('Confirm current zoning with city/county planning')
    checklist.push('Check for pending zoning changes or moratoriums')
    checklist.push('Verify no code violations or condemned status')
  }

  // Utilities
  if (input.isUnincorporated) {
    checklist.push('Confirm water source (well, culinary, hauled)')
    checklist.push('Verify sewer/septic feasibility')
    checklist.push('Check power and utility access')
    checklist.push('Confirm no utility easement disputes')
  }

  // Value verification
  if (triggerTypes.includes('ultra_low_bid') || triggerTypes.includes('high_value_no_bidders')) {
    checklist.push('Get independent appraisal or BPO')
    checklist.push('Run comparable sales analysis (last 6 months)')
    checklist.push('Verify ARV is realistic for area and condition')
    checklist.push('Check if comparable sales are truly comparable')
  }

  return [...new Set(checklist)] // Remove duplicates
}

// Quick check for property list view
export function quickTGTTBCheck(
  openingBid: number | null,
  marketValue: number | null,
  passCount: number
): { triggered: boolean; severity: 'none' | 'warning' | 'critical' } {
  if (openingBid !== null && marketValue !== null && marketValue > 0) {
    const ratio = openingBid / marketValue
    if (ratio < 0.005) {
      return { triggered: true, severity: 'critical' }
    }
  }

  if (passCount >= 2) {
    return { triggered: true, severity: 'critical' }
  }

  if (passCount >= 1) {
    return { triggered: true, severity: 'warning' }
  }

  return { triggered: false, severity: 'none' }
}
