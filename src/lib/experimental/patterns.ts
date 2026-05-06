// Experimental Pattern Detection
// Detects property patterns that may indicate opportunities or risks
// NOT FOR LAUNCH - Research and experimentation only

import { EnrichableProperty } from '@/lib/counties/types'

// ============================================================================
// INDIAN RIDGE RANCH PATTERN
// ============================================================================

/**
 * Indian Ridge Ranch is a recreational subdivision in Sanpete County.
 * These lots have specific characteristics:
 * - Small parcels (0.5 - 5 acres typically)
 * - Located in mountainous/forested area
 * - Likely have HOA restrictions
 * - May have limited access in winter
 * - Recreational use restrictions may apply
 */
export interface IndianRidgePattern {
  detected: boolean
  confidence: number
  indicators: string[]
  risks: string[]
  recommendations: string[]
}

export function detectIndianRidgePattern(
  property: Partial<EnrichableProperty>
): IndianRidgePattern {
  const indicators: string[] = []
  const risks: string[] = []
  const recommendations: string[] = []
  let confidence = 0

  // Check legal description
  const legal = property.legal_description?.toUpperCase() || ''
  if (legal.includes('INDIAN RIDGE') || legal.includes('INDIAN RIDGE RANCH')) {
    indicators.push('Legal description contains "Indian Ridge"')
    confidence += 40
  }

  // Check address
  const address = property.property_address?.toUpperCase() || ''
  if (address.includes('INDIAN RIDGE')) {
    indicators.push('Address contains "Indian Ridge"')
    confidence += 30
  }

  // Check parcel number patterns (Sanpete County specific)
  const parcel = property.parcel_number || ''
  // Indian Ridge parcels often start with specific prefixes
  if (/^0000[0-9]/.test(parcel)) {
    indicators.push('Parcel number matches Indian Ridge pattern')
    confidence += 20
  }

  // Check lot size (Indian Ridge lots are typically 1-5 acres)
  const lotSize = property.lot_size_sqft
  if (lotSize) {
    const acres = lotSize / 43560
    if (acres >= 0.5 && acres <= 5) {
      indicators.push(`Lot size ${acres.toFixed(2)} acres matches Indian Ridge pattern`)
      confidence += 10
    }
  }

  // Risks specific to Indian Ridge
  if (confidence > 50) {
    risks.push('Likely HOA restrictions - verify CC&Rs')
    risks.push('Possible seasonal access limitations')
    risks.push('Recreational use may be restricted')
    risks.push('Water rights may be limited')
    risks.push('Fire risk in forested area')

    recommendations.push('Contact Sanpete County Recorder for HOA documents')
    recommendations.push('Verify road access in winter months')
    recommendations.push('Check water rights status')
    recommendations.push('Visit property for physical verification')
  }

  return {
    detected: confidence >= 50,
    confidence: Math.min(confidence, 100),
    indicators,
    risks,
    recommendations
  }
}

// ============================================================================
// RECREATIONAL LOT PATTERNS
// ============================================================================

export interface RecreationalLotPattern {
  detected: boolean
  type: 'rv_park' | 'hunting_club' | 'ski_resort' | 'lake_access' | 'general' | null
  confidence: number
  indicators: string[]
  restrictions: string[]
  considerations: string[]
}

/**
 * Detects recreational lot patterns that may have use restrictions.
 */
export function detectRecreationalLotPattern(
  property: Partial<EnrichableProperty>
): RecreationalLotPattern {
  const indicators: string[] = []
  const restrictions: string[] = []
  const considerations: string[] = []
  let confidence = 0
  let type: RecreationalLotPattern['type'] = null

  const legal = property.legal_description?.toUpperCase() || ''
  const address = property.property_address?.toUpperCase() || ''
  const owner = property.owner_name?.toUpperCase() || ''

  // RV Park patterns
  const rvPatterns = ['RV PARK', 'RV RESORT', 'CAMPGROUND', 'MOBILE HOME PARK']
  for (const pattern of rvPatterns) {
    if (legal.includes(pattern) || address.includes(pattern)) {
      indicators.push(`Contains "${pattern}"`)
      confidence += 40
      type = 'rv_park'
      restrictions.push('Likely restricted to RV/mobile home use')
      restrictions.push('May have minimum stay requirements')
      considerations.push('Verify park approval for ownership transfer')
    }
  }

  // Hunting club / recreational preserve
  const huntingPatterns = ['HUNTING', 'PRESERVE', 'CLUB', 'ASSOCIATION']
  for (const pattern of huntingPatterns) {
    if (legal.includes(pattern) || owner.includes(pattern)) {
      indicators.push(`Contains "${pattern}"`)
      confidence += 30
      type = 'hunting_club'
      restrictions.push('Likely member-only access')
      restrictions.push('May have dues/assessments')
      considerations.push('Verify membership transferability')
    }
  }

  // Ski resort / mountain recreational
  const skiPatterns = ['SKI', 'RESORT', 'MOUNTAIN', 'RECREATIONAL']
  for (const pattern of skiPatterns) {
    if (legal.includes(pattern) || address.includes(pattern)) {
      indicators.push(`Contains "${pattern}"`)
      confidence += 25
      type = 'ski_resort'
      restrictions.push('Likely seasonal access only')
      restrictions.push('May require resort membership')
      considerations.push('Check avalanche/flood risks')
    }
  }

  // Lake/waterfront access lots
  const waterPatterns = ['LAKE', 'SHORE', 'WATERFRONT', 'MARINA']
  for (const pattern of waterPatterns) {
    if (legal.includes(pattern) || address.includes(pattern)) {
      indicators.push(`Contains "${pattern}"`)
      confidence += 25
      type = 'lake_access'
      restrictions.push('Water rights may be separate from land')
      restrictions.push('Shoreline development restrictions likely')
      considerations.push('Verify water access rights')
    }
  }

  // Small lot in recreational area
  const lotSize = property.lot_size_sqft
  if (lotSize && lotSize < 10000) { // Less than ~0.25 acres
    const acres = lotSize / 43560
    if (acres < 0.25 && !indicators.some(i => i.includes('RV') || i.includes('MOBILE'))) {
      indicators.push(`Very small lot (${acres.toFixed(3)} acres) suggests recreational use`)
      confidence += 15
      if (!type) type = 'general'
    }
  }

  return {
    detected: confidence >= 40,
    type,
    confidence: Math.min(confidence, 100),
    indicators,
    restrictions,
    considerations
  }
}

// ============================================================================
// HOA RISK PATTERNS
// ============================================================================

export interface HoaRiskPattern {
  detected: boolean
  confidence: number
  indicators: string[]
  risks: string[]
  dueDiligenceItems: string[]
}

/**
 * Detects potential HOA/association risks from property data.
 */
export function detectHoaRiskPattern(
  property: Partial<EnrichableProperty>
): HoaRiskPattern {
  const indicators: string[] = []
  const risks: string[] = []
  const dueDiligenceItems: string[] = []
  let confidence = 0

  const legal = property.legal_description?.toUpperCase() || ''
  const owner = property.owner_name?.toUpperCase() || ''
  const address = property.property_address?.toUpperCase() || ''

  // Subdivision indicators
  const subdivisionPatterns = ['SUBD', 'SUBDIVISION', 'UNIT', 'PHASE', 'SECTION']
  for (const pattern of subdivisionPatterns) {
    if (legal.includes(pattern)) {
      indicators.push(`Legal description contains "${pattern}"`)
      confidence += 20
    }
  }

  // Common HOA terms in legal
  const hoaTerms = ['ASSOC', 'ASSOCIATION', 'HOA', 'HOMEOWNERS', 'COMMUNITY']
  for (const term of hoaTerms) {
    if (legal.includes(term) || owner.includes(term)) {
      indicators.push(`Contains "${term}"`)
      confidence += 35
    }
  }

  // Planned Unit Development
  if (legal.includes('PUD') || legal.includes('PLANNED UNIT')) {
    indicators.push('Planned Unit Development (PUD)')
    confidence += 40
    risks.push('PUDs typically have HOA with CC&Rs')
  }

  // Common area or amenity references
  const amenityTerms = ['CLUB', 'POOL', 'GOLF', 'TENNIS', 'TRAIL', 'PARK', 'OPEN SPACE']
  for (const term of amenityTerms) {
    if (legal.includes(term) || address.includes(term)) {
      indicators.push(`Amenity reference: "${term}"`)
      confidence += 15
    }
  }

  // Entity ownership (HOA often owns common areas)
  if (/LLC|ASSOC|CORP/i.test(owner)) {
    indicators.push('Entity ownership suggests HOA/common area')
    confidence += 25
  }

  // Build out the risks and due diligence
  if (confidence >= 40) {
    risks.push('HOA liens may survive tax sale')
    risks.push('Assessments may be due')
    risks.push('CC&Rs may restrict use')

    dueDiligenceItems.push('Request CC&Rs from county recorder')
    dueDiligenceItems.push('Verify current HOA dues and assessments')
    dueDiligenceItems.push('Check for HOA lien priority')
    dueDiligenceItems.push('Review HOA financial health')
  }

  return {
    detected: confidence >= 40,
    confidence: Math.min(confidence, 100),
    indicators,
    risks,
    dueDiligenceItems
  }
}

// ============================================================================
// MICRO-PARCEL OPPORTUNITIES
// ============================================================================

export interface MicroParcelOpportunity {
  detected: boolean
  type: 'assemblage_candidate' | 'sliver_lot' | 'unbuildable' | null
  lotSize: number | null
  confidence: number
  considerations: string[]
  adjacentParcels: string[] // Would need external lookup
}

/**
 * Detects micro-parcel opportunities.
 * These are small lots that may be buildable only with adjacent parcels.
 */
export function detectMicroParcelOpportunity(
  property: Partial<EnrichableProperty>,
  adjacentParcelNumbers?: string[]
): MicroParcelOpportunity {
  const considerations: string[] = []
  const lotSize = property.lot_size_sqft
  let detected = false
  let type: MicroParcelOpportunity['type'] = null
  let confidence = 0

  if (!lotSize) {
    return {
      detected: false,
      type: null,
      lotSize: null,
      confidence: 0,
      considerations: ['Lot size unknown - verify from assessor'],
      adjacentParcels: adjacentParcelNumbers || []
    }
  }

  // Micro-parcel thresholds
  if (lotSize < 500) {
    detected = true
    type = 'unbuildable'
    confidence = 90
    considerations.push('Extremely small lot - likely unbuildable standalone')
    considerations.push('Value only in assemblage with neighbors')
    considerations.push('Check if city has minimum lot size ordinance')
  } else if (lotSize < 2000) {
    detected = true
    type = 'sliver_lot'
    confidence = 70
    considerations.push('Very small lot - may not meet zoning requirements')
    considerations.push('Verify setbacks and buildability')
    considerations.push('Check for assemblage opportunity')
  } else if (lotSize < 5000 && adjacentParcelNumbers && adjacentParcelNumbers.length > 0) {
    detected = true
    type = 'assemblage_candidate'
    confidence = 60
    considerations.push('Small lot with adjacent parcels - assemblage candidate')
    considerations.push('Check if adjacent parcels are also in tax sale')
    considerations.push('Calculate combined lot size and value')
  }

  // Zoning considerations
  if (property.zoning) {
    const zoning = property.zoning.toUpperCase()
    if (zoning.includes('R-1') || zoning.includes('SF')) {
      considerations.push('Single-family zoning typically requires 6,000+ sqft')
    } else if (zoning.includes('R-2') || zoning.includes('MULTI')) {
      considerations.push('Multi-family zoning may allow smaller lots')
    }
  }

  return {
    detected,
    type,
    lotSize,
    confidence,
    considerations,
    adjacentParcels: adjacentParcelNumbers || []
  }
}

// ============================================================================
// EAGLEWEB RECORDER PATTERN DETECTION
// ============================================================================

/**
 * Detects counties that use EagleWeb for their recorder system.
 * This helps with automation planning.
 */
export function detectEagleWebCounty(countyWebsite: string): {
  usesEagleWeb: boolean
  confidence: number
  publicViewerAvailable: boolean
  notes: string
} {
  const url = countyWebsite.toLowerCase()

  // Direct EagleWeb URL patterns
  if (url.includes('eagleweb')) {
    return {
      usesEagleWeb: true,
      confidence: 95,
      publicViewerAvailable: true,
      notes: 'Direct EagleWeb URL detected'
    }
  }

  // Common EagleWeb hosting domains
  if (url.includes('civiccenter.net') || url.includes('civicplus.com')) {
    return {
      usesEagleWeb: true,
      confidence: 60,
      publicViewerAvailable: false, // May require verification
      notes: 'CivicCenter hosting - likely EagleWeb or similar system'
    }
  }

  // Known EagleWeb counties (for expansion)
  const knownEagleWebCounties = [
    'tooele', 'sanpete', 'rich', 'davis', 'weber'
  ]

  for (const county of knownEagleWebCounties) {
    if (url.includes(county)) {
      return {
        usesEagleWeb: true,
        confidence: 80,
        publicViewerAvailable: true,
        notes: `Known EagleWeb county: ${county}`
      }
    }
  }

  return {
    usesEagleWeb: false,
    confidence: 0,
    publicViewerAvailable: false,
    notes: 'No EagleWeb indicators found'
  }
}

// ============================================================================
// PATTERN AGGREGATION
// ============================================================================

export interface PropertyPatternAnalysis {
  parcelId: string
  patterns: {
    indianRidge: IndianRidgePattern | null
    recreationalLot: RecreationalLotPattern | null
    hoaRisk: HoaRiskPattern | null
    microParcel: MicroParcelOpportunity | null
  }
  overallRisk: 'low' | 'medium' | 'high' | 'unknown'
  keyFindings: string[]
  recommendations: string[]
}

/**
 * Runs all pattern detectors on a property and aggregates results.
 */
export function analyzePropertyPatterns(
  property: Partial<EnrichableProperty>,
  adjacentParcels?: string[]
): PropertyPatternAnalysis {
  const indianRidge = detectIndianRidgePattern(property)
  const recreationalLot = detectRecreationalLotPattern(property)
  const hoaRisk = detectHoaRiskPattern(property)
  const microParcel = detectMicroParcelOpportunity(property, adjacentParcels)

  const keyFindings: string[] = []
  const recommendations: string[] = []
  let riskScore = 0

  // Aggregate findings
  if (indianRidge.detected) {
    keyFindings.push(`Indian Ridge Ranch pattern detected (${indianRidge.confidence}% confidence)`)
    recommendations.push(...indianRidge.recommendations)
    riskScore += 30
  }

  if (recreationalLot.detected) {
    keyFindings.push(`Recreational lot pattern: ${recreationalLot.type}`)
    recommendations.push(...recreationalLot.considerations)
    riskScore += 25
  }

  if (hoaRisk.detected) {
    keyFindings.push(`HOA risk detected (${hoaRisk.confidence}% confidence)`)
    recommendations.push(...hoaRisk.dueDiligenceItems)
    riskScore += 35
  }

  if (microParcel.detected) {
    keyFindings.push(`Micro-parcel opportunity: ${microParcel.type}`)
    recommendations.push(...microParcel.considerations)
    if (microParcel.type === 'unbuildable') {
      riskScore += 40
    }
  }

  // Determine overall risk
  let overallRisk: PropertyPatternAnalysis['overallRisk'] = 'low'
  if (riskScore >= 60) overallRisk = 'high'
  else if (riskScore >= 30) overallRisk = 'medium'

  return {
    parcelId: property.parcel_number || 'unknown',
    patterns: {
      indianRidge: indianRidge.detected ? indianRidge : null,
      recreationalLot: recreationalLot.detected ? recreationalLot : null,
      hoaRisk: hoaRisk.detected ? hoaRisk : null,
      microParcel: microParcel.detected ? microParcel : null
    },
    overallRisk,
    keyFindings,
    recommendations
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  detectIndianRidgePattern,
  detectRecreationalLotPattern,
  detectHoaRiskPattern,
  detectMicroParcelOpportunity,
  detectEagleWebCounty,
  analyzePropertyPatterns
}
