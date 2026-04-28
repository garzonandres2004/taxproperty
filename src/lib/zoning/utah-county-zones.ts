/**
 * Utah County Zoning Lookup Table
 * Building rules for common unincorporated Utah County zones
 * Sources: Utah County Land Use Ordinance, Title 12
 */

export interface ZoneRules {
  code: string
  name: string
  category: 'residential' | 'agricultural' | 'commercial' | 'industrial' | 'mixed' | 'other'
  minLotSizeAcres?: number
  minLotSizeSqft?: number
  frontSetbackFt?: number
  sideSetbackFt?: number
  rearSetbackFt?: number
  maxHeightFt?: number
  maxHeightStories?: number
  maxLotCoveragePercent?: number
  frontageRequiredFt?: number
  permittedUses?: string[]
  conditionalUses?: string[]
  prohibitedUses?: string[]
  hasSlopeRestrictions?: boolean
  hasFloodplainRestrictions?: boolean
  redFlags?: string[]
  notes?: string
}

export const utahCountyZones: Record<string, ZoneRules> = {
  // Residential Agriculture (actual Utah County zones)
  'RA-5': {
    code: 'RA-5',
    name: 'Residential Agriculture 5 acre',
    category: 'agricultural',
    minLotSizeAcres: 5,
    frontSetbackFt: 50,
    sideSetbackFt: 20,
    rearSetbackFt: 30,
    maxHeightFt: 35,
    maxHeightStories: 2,
    permittedUses: ['Single family dwelling', 'Agriculture', 'Home occupations', 'Accessory buildings'],
    conditionalUses: ['Guest house', 'Day care (family)', 'Bed & breakfast'],
    notes: '5 acre minimum. Most restrictive RA zone. Good for rural living, not for development.'
  },

  // Rural Residential
  'RR-5': {
    code: 'RR-5',
    name: 'Rural Residential 5 acre',
    category: 'residential',
    minLotSizeAcres: 5,
    frontSetbackFt: 30,
    sideSetbackFt: 15,
    rearSetbackFt: 30,
    maxHeightFt: 35,
    permittedUses: ['Single family dwelling', 'Limited agriculture', 'Home occupations'],
    conditionalUses: ['Guest house', 'Small scale farming'],
    notes: '5 acre minimum rural residential. Allows limited agricultural use.'
  },

  // Transitional Residential
  'TR-5': {
    code: 'TR-5',
    name: 'Transitional Residential 5 acre',
    category: 'residential',
    minLotSizeAcres: 5,
    frontSetbackFt: 30,
    sideSetbackFt: 10,
    rearSetbackFt: 25,
    maxHeightFt: 35,
    permittedUses: ['Single family dwelling', 'Home occupations', 'Accessory buildings'],
    conditionalUses: ['Multi-family (limited)', 'Elderly housing'],
    notes: 'Transitional zone allowing some density flexibility. Potential for development.'
  },

  // Agricultural
  'A-40': {
    code: 'A-40',
    name: 'Agriculture 40 acre',
    category: 'agricultural',
    minLotSizeAcres: 40,
    frontSetbackFt: 50,
    sideSetbackFt: 25,
    rearSetbackFt: 30,
    maxHeightFt: 35,
    permittedUses: ['Agriculture', 'Farming', 'Ranching', 'Agricultural processing'],
    conditionalUses: ['Farmworker housing (seasonal)'],
    prohibitedUses: ['Permanent residential dwellings'],
    notes: '40 acre minimum agriculture. NO permanent dwellings. Farm use only.'
  },

  // Grazing
  'G-1': {
    code: 'G-1',
    name: 'Grazing 1',
    category: 'agricultural',
    minLotSizeAcres: 1,
    frontSetbackFt: 50,
    sideSetbackFt: 25,
    rearSetbackFt: 30,
    maxHeightFt: 35,
    permittedUses: ['Grazing', 'Pasture', 'Range land'],
    conditionalUses: ['Temporary structures for grazing operations'],
    notes: 'Grazing land. Limited building rights. Check well/septic requirements.'
  },

  // Mining & Grazing
  'M&G-1': {
    code: 'M&G-1',
    name: 'Mining and Grazing 1',
    category: 'other',
    minLotSizeAcres: 1,
    frontSetbackFt: 50,
    sideSetbackFt: 25,
    rearSetbackFt: 30,
    maxHeightFt: 35,
    permittedUses: ['Mining', 'Grazing', 'Mineral extraction'],
    conditionalUses: ['Reclamation activities'],
    redFlags: ['Mining activities may affect land use', 'Check mineral rights'],
    notes: 'Mining and grazing zone. Check mineral rights and reclamation requirements.'
  },

  // Critical Environment
  'CE-1': {
    code: 'CE-1',
    name: 'Critical Environment 1',
    category: 'other',
    hasSlopeRestrictions: true,
    hasFloodplainRestrictions: true,
    permittedUses: ['Conservation', 'Open space', 'Limited recreation'],
    prohibitedUses: ['Residential', 'Commercial', 'Industrial'],
    redFlags: ['Steep slopes or sensitive environment', 'Severe building restrictions'],
    notes: 'Critical environmental area. Severe restrictions on development. Verify with Planning.'
  },
  'CE-2': {
    code: 'CE-2',
    name: 'Critical Environment 2',
    category: 'other',
    hasSlopeRestrictions: true,
    permittedUses: ['Conservation', 'Limited residential (case by case)', 'Recreation'],
    conditionalUses: ['Single family (if buildable)'],
    prohibitedUses: ['Commercial', 'Industrial', 'Multi-family'],
    redFlags: ['Environmental sensitivity', 'Building restrictions apply'],
    notes: 'Critical environment with some development potential. Case by case review required.'
  },

  // Highway Service
  'HS-1': {
    code: 'HS-1',
    name: 'Highway Service 1',
    category: 'commercial',
    minLotSizeSqft: 15000,
    frontSetbackFt: 30,
    sideSetbackFt: 10,
    rearSetbackFt: 20,
    maxHeightFt: 45,
    maxHeightStories: 2,
    permittedUses: ['Service stations', 'Highway commercial', 'Restaurants', 'Hotels', 'Rest areas'],
    conditionalUses: ['Truck stops', 'RV parks'],
    notes: 'Highway corridor commercial. Requires highway frontage. Good visibility needed.'
  },

  // Neighborhood Commercial
  'NC-1': {
    code: 'NC-1',
    name: 'Neighborhood Commercial 1',
    category: 'commercial',
    minLotSizeSqft: 10000,
    frontSetbackFt: 20,
    sideSetbackFt: 5,
    rearSetbackFt: 15,
    maxHeightFt: 40,
    maxHeightStories: 2,
    permittedUses: ['Retail', 'Professional offices', 'Personal services', 'Restaurants (limited)'],
    conditionalUses: ['Gas stations', 'Daycare centers'],
    notes: 'Small scale neighborhood commercial. Supports local community needs.'
  },

  // Industrial
  'I-1': {
    code: 'I-1',
    name: 'Industrial 1',
    category: 'industrial',
    minLotSizeSqft: 20000,
    frontSetbackFt: 30,
    sideSetbackFt: 15,
    rearSetbackFt: 20,
    maxHeightFt: 60,
    permittedUses: ['Light industrial', 'Warehousing', 'Distribution', 'Manufacturing (light)'],
    conditionalUses: ['Heavy manufacturing', 'Recycling facilities'],
    notes: 'Light industrial zone. Check environmental requirements and utility capacity.'
  },

  // Planned Community
  'PC': {
    code: 'PC',
    name: 'Planned Community',
    category: 'mixed',
    minLotSizeSqft: 4356,
    frontSetbackFt: 15,
    sideSetbackFt: 5,
    rearSetbackFt: 15,
    maxHeightFt: 45,
    permittedUses: ['Single family', 'Multi-family', 'Commercial', 'Recreation', 'Open space'],
    conditionalUses: ['Varies by specific PC approval'],
    redFlags: ['Must review specific PC documents - rules vary!'],
    notes: 'Planned Community with custom rules. Check specific PC documents for exact regulations.'
  },

  // Public Facilities
  'PF': {
    code: 'PF',
    name: 'Public Facilities',
    category: 'other',
    permittedUses: ['Government buildings', 'Schools', 'Utilities', 'Public safety', 'Parks'],
    prohibitedUses: ['Private residential', 'Private commercial'],
    redFlags: ['Public land', 'Usually not available for private purchase'],
    notes: 'Public facilities zone. Typically government owned. Verify availability before purchase.'
  },

  // City Jurisdiction Placeholders (for detection)
  'AF CITY': {
    code: 'AF CITY',
    name: 'American Fork City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within American Fork city limits. Contact city planning for zoning rules.'
  },
  'LE CITY': {
    code: 'LE CITY',
    name: 'Lehi City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Lehi city limits. Contact city planning for zoning rules.'
  },
  'PR CITY': {
    code: 'PR CITY',
    name: 'Provo City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Provo city limits. Contact city planning for zoning rules.'
  },
  'OR CITY': {
    code: 'OR CITY',
    name: 'Orem City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Orem city limits. Contact city planning for zoning rules.'
  },
  'SP CITY': {
    code: 'SP CITY',
    name: 'Spanish Fork City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Spanish Fork city limits. Contact city planning for zoning rules.'
  },
  'SA CITY': {
    code: 'SA CITY',
    name: 'Salem City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Salem city limits. Contact city planning for zoning rules.'
  },
  'PA CITY': {
    code: 'PA CITY',
    name: 'Payson City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Payson city limits. Contact city planning for zoning rules.'
  },
  'SQ CITY': {
    code: 'SQ CITY',
    name: 'Santaquin City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Santaquin city limits. Contact city planning for zoning rules.'
  },
  'EM CITY': {
    code: 'EM CITY',
    name: 'Eagle Mountain City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Eagle Mountain city limits. Contact city planning for zoning rules.'
  },
  'SS CITY': {
    code: 'SS CITY',
    name: 'Saratoga Springs City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Saratoga Springs city limits. Contact city planning for zoning rules.'
  },
  'SF CITY': {
    code: 'SF CITY',
    name: 'Spanish Fork City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Spanish Fork city limits. Contact city planning for zoning rules.'
  },
  'SF CITY2': {
    code: 'SF CITY',
    name: 'Springville City',
    category: 'other',
    redFlags: ['Incorporated city - municipal zoning applies', 'Must verify with city planning'],
    notes: 'Property is within Springville city limits. Contact city planning for zoning rules.'
  }
}

// Helper function to normalize zone codes (handles variations like "RA-5" vs "RA5")
export function normalizeZoneCode(code: string): string {
  if (!code) return ''

  // Remove spaces and uppercase
  const normalized = code.toUpperCase().replace(/\s/g, '')

  // Check direct match
  if (utahCountyZones[normalized]) {
    return normalized
  }

  // Try adding hyphen if missing (e.g., "RA5" -> "RA-5")
  const withHyphen = normalized.replace(/([A-Z])(\d)/, '$1-$2')
  if (utahCountyZones[withHyphen]) {
    return withHyphen
  }

  // Try removing hyphen if present
  const withoutHyphen = normalized.replace(/-/g, '')
  if (utahCountyZones[withoutHyphen]) {
    return withoutHyphen
  }

  return normalized
}

// Get zone rules with fallbacks
export function getZoneRules(zoneCode: string): ZoneRules | null {
  const normalized = normalizeZoneCode(zoneCode)
  return utahCountyZones[normalized] || null
}

// Check if zone allows residential
export function allowsResidential(zoneCode: string): boolean {
  const rules = getZoneRules(zoneCode)
  if (!rules) return false
  return rules.category === 'residential' || rules.category === 'agricultural'
}

// Check if zone is buildable (allows structures)
export function isBuildable(zoneCode: string): boolean {
  const rules = getZoneRules(zoneCode)
  if (!rules) return true // Assume buildable if unknown
  // Non-buildable zones
  const nonBuildable = ['CE-1', 'CE-2', 'PF', 'A-40', 'G-1', 'M&G-1']
  // City zones need city verification
  const cityZones = ['AF CITY', 'LE CITY', 'PR CITY', 'OR CITY', 'SP CITY', 'SA CITY', 'PA CITY', 'SQ CITY', 'EM CITY', 'SS CITY', 'SF CITY', 'AL CITY', 'BL CITY', 'CF CITY', 'CH CITY', 'DR CITY', 'ER CITY', 'FF CITY', 'GE CITY', 'GO CITY', 'HI CITY', 'LI CITY', 'MA CITY', 'PG CITY', 'VI CITY', 'WH CITY']
  return !nonBuildable.includes(rules.code) && !cityZones.includes(rules.code)
}

// Check if zone is a city jurisdiction
export function isCityJurisdiction(zoneCode: string): boolean {
  const cityZones = ['AF CITY', 'LE CITY', 'PR CITY', 'OR CITY', 'SP CITY', 'SA CITY', 'PA CITY', 'SQ CITY', 'EM CITY', 'SS CITY', 'SF CITY', 'AL CITY', 'BL CITY', 'CF CITY', 'CH CITY', 'DR CITY', 'ER CITY', 'FF CITY', 'GE CITY', 'GO CITY', 'HI CITY', 'LI CITY', 'MA CITY', 'PG CITY', 'VI CITY', 'WH CITY']
  return cityZones.includes(zoneCode?.toUpperCase())
}

// Get density description
export function getDensityDescription(zoneCode: string): string {
  const rules = getZoneRules(zoneCode)
  if (!rules) return 'Unknown density'

  if (rules.minLotSizeAcres) {
    if (rules.minLotSizeAcres >= 5) return 'Very low density (rural)'
    if (rules.minLotSizeAcres >= 1) return 'Low density (large lots)'
  }
  if (rules.minLotSizeSqft) {
    if (rules.minLotSizeSqft >= 18000) return 'Estate residential'
    if (rules.minLotSizeSqft >= 12000) return 'Low-medium density'
    if (rules.minLotSizeSqft >= 8000) return 'Standard density'
    if (rules.minLotSizeSqft >= 6000) return 'Medium density'
    return 'Higher density'
  }
  return 'Variable density'
}
