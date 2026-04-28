/**
 * Use Idea Generator
 * Automatically generates use ideas based on property characteristics and zoning
 */

import { getZoneRules, allowsResidential, isBuildable, isCityJurisdiction } from './utah-county-zones'

export interface PropertyCharacteristics {
  propertyType: string
  zoneCode: string
  acres: number | null
  lotSizeSqft: number | null
  hasAddress: boolean
  ownerName: string | null
  isInCity: boolean
  cityName: string | null
  slopePercent: number | null
  hasUtilities: boolean
  isLikelyCondo: boolean
}

export interface UseIdeasResult {
  ideas: string[]
  difficulty: 'easy' | 'moderate' | 'difficult' | 'prohibitive'
  estimatedTimeToEntitlement: string
  nextSteps: string
  redFlags: string[]
  opportunities: string[]
}

export function generateUseIdeas(props: PropertyCharacteristics): UseIdeasResult {
  const ideas: string[] = []
  const redFlags: string[] = []
  const opportunities: string[] = []
  let difficulty: UseIdeasResult['difficulty'] = 'moderate'
  let estimatedTimeToEntitlement = '3-6 months'
  let nextSteps = 'Verify zoning and access; conduct preliminary title review'

  const zoneRules = getZoneRules(props.zoneCode)
  const isResidentialZone = allowsResidential(props.zoneCode)
  const zoneBuildable = isBuildable(props.zoneCode)
  const acres = props.acres || (props.lotSizeSqft ? props.lotSizeSqft / 43560 : 0)

  // === RED FLAGS ===

  // Micro parcel
  if (acres > 0 && acres < 0.02) {
    redFlags.push('Micro-parcel (less than 0.02 acres) - Very limited standalone value')
    ideas.push('Sell to adjacent owner only')
    ideas.push('Negotiate easement/access deal')
    difficulty = 'difficult'
  }

  // No address
  if (!props.hasAddress) {
    redFlags.push('No situs address - may indicate limited access or unbuildable lot')
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '6-12 months'
  }

  // Problematic owner types
  if (props.ownerName) {
    const ownerUpper = props.ownerName.toUpperCase()
    if (ownerUpper.includes('CITY OF') || ownerUpper.includes('COUNTY OF')) {
      redFlags.push('Government ownership - likely right-of-way or public land')
      ideas.push('Verify not already public property')
      difficulty = 'prohibitive'
    }
    if (ownerUpper.includes('LLC') && acres < 0.1) {
      redFlags.push('LLC-owned small parcel - likely corporate asset, may not sell')
    }
  }

  // Slope issues
  if (props.slopePercent && props.slopePercent > 20) {
    redFlags.push(`Steep slope (${props.slopePercent}%) - requires engineering review`)
    ideas.push('Sell to adjacent owner for view/open space')
    difficulty = 'difficult'
  }

  // Non-buildable zone
  if (!zoneBuildable && props.zoneCode) {
    redFlags.push(`Zone ${props.zoneCode} does not allow permanent structures`)
    ideas.push('Agricultural/recreational use only')
    ideas.push('Hold as land banking')
    difficulty = 'prohibitive'
  }

  // === OPPORTUNITIES ===

  // Good access/utilities
  if (props.hasAddress && props.hasUtilities) {
    opportunities.push('Has utilities - ready for development')
  }

  // Residential zones
  if (isResidentialZone) {
    if (acres >= 1) {
      opportunities.push('Large residential lot - potential for ADU or guest house')
    }
    if (acres >= 5 && props.zoneCode?.startsWith('RA')) {
      opportunities.push('Agricultural exemption potential')
    }
  }

  // === USE IDEAS BY ZONE TYPE ===

  // Condo/Townhome (from property type)
  if (props.isLikelyCondo || props.propertyType === 'condo') {
    ideas.push('Rent as residential unit')
    ideas.push('Resell to owner-occupant')
    ideas.push('Hold for appreciation (yield play)')
    difficulty = 'easy'
    estimatedTimeToEntitlement = '0-1 month'
    nextSteps = 'Verify HOA status; check rental restrictions; inspect unit condition'

    if (!redFlags.includes('No situs address - may indicate limited access or unbuildable lot')) {
      opportunities.push('Condo in rental market - steady income potential')
    }
  }
  // Single Family Residential zones
  else if (props.zoneCode?.startsWith('R-1') || props.zoneCode?.startsWith('R-2')) {
    ideas.push('Single family rental')
    ideas.push('Fix and flip to retail buyer')
    ideas.push('Hold for appreciation')

    if (acres > 0.3) {
      ideas.push('Potential for ADU (Accessory Dwelling Unit) - verify with county')
      opportunities.push('ADU potential can increase rental income')
    }

    difficulty = 'easy'
    estimatedTimeToEntitlement = '1-3 months'
    nextSteps = 'Property inspection; market comp analysis; verify utility connections'
  }
  // Multi-family / Higher density
  else if (props.zoneCode?.startsWith('R-2') || props.zoneCode?.startsWith('R-3')) {
    ideas.push('Multi-family rental')
    ideas.push('Renovate and increase rents')
    ideas.push('Long-term hold with cash flow')

    if (acres > 0.5) {
      ideas.push('Potential for lot split or additional units')
    }

    difficulty = 'moderate'
    estimatedTimeToEntitlement = '3-6 months'
    nextSteps = 'Verify parking requirements; check for rent control; inspect all units'
    opportunities.push('Higher density = higher rental income potential')
  }
  // Residential Agricultural
  else if (props.zoneCode?.startsWith('RA')) {
    if (acres >= 5) {
      ideas.push('Agricultural use (tax benefits)')
      ideas.push('Build estate home with privacy')
      ideas.push('Hold as land investment')
      ideas.push('Sell to adjacent owner wanting buffer')
      difficulty = 'moderate'
      estimatedTimeToEntitlement = '3-6 months'
      nextSteps = 'Verify well/septic capacity; check agricultural exemption requirements'
      opportunities.push('Large acreage = privacy and appreciation potential')
    } else if (acres >= 1) {
      ideas.push('Single family home with large lot')
      ideas.push('Horse property / hobby farm')
      ideas.push('Hold for suburban expansion')
      difficulty = 'easy'
      estimatedTimeToEntitlement = '1-3 months'
    } else {
      ideas.push('Build single family home')
      ideas.push('Resell to owner-occupant')
      difficulty = 'easy'
    }
  }
  // Agricultural only
  else if (props.zoneCode?.startsWith('A-')) {
    ideas.push('Farm/agricultural use')
    ideas.push('Hold long-term as land banking')
    ideas.push('Lease to farmer')

    if (acres >= 20) {
      ideas.push('Check subdivision potential (verify with Planning)')
      opportunities.push('Large acreage may allow for lot splits')
    }

    redFlags.push('A-1 zone: NO permanent residential allowed')
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '6-12 months'
    nextSteps = 'Verify buildability with Utah County Planning BEFORE bidding'
  }
  // Commercial
  else if (props.zoneCode?.startsWith('C-')) {
    ideas.push('Retail tenant lease')
    ideas.push('Owner-occupied business')
    ideas.push('Hold for commercial appreciation')

    if (props.zoneCode === 'C-1') {
      ideas.push('Neighborhood business (coffee, retail, service)')
      difficulty = 'moderate'
    } else if (props.zoneCode === 'C-2') {
      ideas.push('Restaurant or professional offices')
      difficulty = 'moderate'
    }

    estimatedTimeToEntitlement = '3-9 months'
    nextSteps = 'Market study; verify parking requirements; check environmental Phase I'
    opportunities.push('Commercial = higher rents but more tenant turnover')
  }
  // Industrial
  else if (props.zoneCode?.startsWith('M-')) {
    ideas.push('Warehouse lease')
    ideas.push('Light manufacturing tenant')
    ideas.push('Distribution center')
    difficulty = 'moderate'
    estimatedTimeToEntitlement = '3-9 months'
    nextSteps = 'Environmental assessment; verify utility capacity; check loading dock requirements'
  }
  // PUD
  else if (props.zoneCode === 'PUD') {
    ideas.push('Custom development (per PUD documents)')
    ideas.push('Mixed-use potential')
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '12-24 months'
    redFlags.push('PUD: Must review specific PUD documents - rules vary!')
    nextSteps = 'Obtain and review PUD approval documents; consult with Planning'
  }
  // Unknown zone
  else {
    ideas.push('Verify zoning classification with county')
    ideas.push('Hold as land investment pending entitlement')
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '6-12 months'
    nextSteps = 'Contact Utah County Planning for zone classification and permitted uses'
  }

  // === HILLSIDE/CANYON PROPERTIES ===
  if (!props.hasAddress && acres > 1) {
    ideas.push('Recreation land / weekend retreat')
    ideas.push('Sell to adjacent property owner')
    if (acres > 5) {
      ideas.push('Check for subdivision potential')
      opportunities.push('Large unaddressed parcels may have development potential')
    }
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '12+ months'
    nextSteps = 'Confirm access legal and physical; survey to determine buildable area'
  }

  // === CITY JURISDICTION HANDLING ===
  if (isCityJurisdiction(props.zoneCode)) {
    redFlags.push(`Property in ${props.cityName || 'incorporated city'} - municipal zoning applies`)
    redFlags.push('Must verify zoning with city planning department')
    ideas.push('Verify city zoning classification')
    ideas.push('Contact city planning for development potential')
    difficulty = 'difficult'
    estimatedTimeToEntitlement = '6-12 months'
    nextSteps = `Contact ${props.cityName || 'city'} Planning Department for zoning verification`
  }
  // === CITY JURISDICTION WARNING (fallback) ===
  else if (props.isInCity) {
    redFlags.push(`Property in ${props.cityName} - municipal zoning applies, not Utah County`)
    redFlags.push('Must verify zoning with city planning department')
    difficulty = 'difficult'
    nextSteps = `Contact ${props.cityName} Planning Department for zoning verification`
  }

  // === DEFAULT IDEAS ===
  if (ideas.length === 0) {
    ideas.push('Hold as land investment')
    ideas.push('Resell after market appreciation')
    ideas.push('Develop if economically feasible')
    difficulty = 'moderate'
  }

  // === NO UTILITIES ===
  if (!props.hasUtilities) {
    redFlags.push('No confirmed utilities - may require well/septic or extension')
    ideas.push('Rural/recreational use')
    ideas.push('Long-term hold')
    difficulty = 'difficult'
  }

  return {
    ideas: [...new Set(ideas)], // Remove duplicates
    difficulty,
    estimatedTimeToEntitlement,
    nextSteps,
    redFlags: [...new Set(redFlags)],
    opportunities: [...new Set(opportunities)]
  }
}

// Calculate buildability score
export function calculateBuildabilityScore(props: PropertyCharacteristics): number {
  let score = 100

  // No address penalty
  if (!props.hasAddress) {
    score -= 30
  }

  // Micro parcel penalty
  const acres = props.acres || (props.lotSizeSqft ? props.lotSizeSqft / 43560 : 0)
  if (acres < 0.02) {
    score -= 50
  } else if (acres < 0.1) {
    score -= 20
  }

  // Owner type penalty
  if (props.ownerName) {
    const ownerUpper = props.ownerName.toUpperCase()
    if (ownerUpper.includes('LLC') || ownerUpper.includes('INC') || ownerUpper.includes('CORP')) {
      score -= 15
    }
    if (ownerUpper.includes('CITY') || ownerUpper.includes('COUNTY') || ownerUpper.includes('STATE')) {
      score -= 40
    }
    if (ownerUpper.includes('HOA') || ownerUpper.includes('ASSOCIATION')) {
      score -= 30
    }
  }

  // Zoning penalties
  if (props.zoneCode?.startsWith('A-') || props.zoneCode === 'G-1') {
    score -= 25 // Agricultural/grazing only
  }
  if (props.zoneCode?.startsWith('CE-')) {
    score -= 60 // Critical environment - severe restrictions
  }
  if (props.zoneCode === 'PF') {
    score -= 60 // Public facilities
  }
  if (props.zoneCode?.startsWith('M') || props.zoneCode?.startsWith('I-')) {
    score -= 10 // Mining/Industrial
  }
  if (props.zoneCode === 'M&G-1') {
    score -= 35 // Mining and grazing
  }
  // City jurisdiction penalty (more complexity)
  if (isCityJurisdiction(props.zoneCode) || props.isInCity) {
    score -= 15 // City jurisdiction complexity
  }

  // Slope penalty
  if (props.slopePercent && props.slopePercent > 15) {
    score -= 20
  }

  // No utilities penalty
  if (!props.hasUtilities) {
    score -= 25
  }

  // Unincorporated large parcel penalty (rural complexity)
  if (!props.isInCity && acres > 5) {
    score -= 10
  }

  return Math.max(0, Math.min(100, score))
}

// Get difficulty color for UI
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-50 border-green-200'
    case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'difficult': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'prohibitive': return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// Get difficulty label in Spanish/English
export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'Easy / Fácil'
    case 'moderate': return 'Moderate / Moderado'
    case 'difficult': return 'Difficult / Difícil'
    case 'prohibitive': return 'Prohibitive / Prohibitivo'
    default: return 'Unknown / Desconocido'
  }
}
