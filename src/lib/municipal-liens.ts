/**
 * Municipal Lien Detection for Utah County
 * 
 * Research and implementation for detecting code enforcement violations
 * and utility liens that survive tax foreclosure.
 * 
 * Sources:
 * - Utah County Code Enforcement API (unincorporated areas only)
 *   https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer/7
 * - Utah County Land Records (manual utility lien search)
 * - Individual city code enforcement (manual)
 */

// =============================================================================
// RESEARCH FINDINGS
// =============================================================================

/**
 * UTAH COUNTY CODE ENFORCEMENT API
 * 
 * Endpoint: https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer/7
 * Coverage: UNINCORPORATED Utah County only (excludes all cities)
 * 
 * Key Fields:
 * - SITE_APN: Parcel number (format: NNNNNNNNN without colons)
 * - STATUS: "Investigation Started" | "Notice Given" | "At Hearing" | "Closed" | "Lien"
 * - BALANCE_DUE: Outstanding fees (key for lien detection)
 * - FEES_CHARGED: Total fees assessed
 * - CASE_NO, CASE_NAME, DESCRIPTION: Violation details
 * - STARTED, CLOSED: Case dates
 */

/**
 * UTILITY LIENS
 * 
 * No centralized database exists. Utility liens are:
 * - Recorded with Utah County Recorder
 * - Search manually: https://www.utahcounty.gov/LandRecords/namesearch.asp
 * - Include: water, sewer, gas, electric liens
 * - SURVIVE tax foreclosure (critical for max bid calculation)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CodeEnforcementCase {
  CASE_NO: string
  CASE_NAME: string
  CaseType: string
  CaseSubType: string
  STATUS: 'Investigation Started' | 'Notice Given' | 'At Hearing' | 'Closed' | 'Lien' | string
  DESCRIPTION: string
  STARTED: string  // Date string
  CLOSED: string | null
  LASTACTION: string | null
  SITE_APN: string
  SITE_ADDR: string
  SITE_CITY: string
  SITE_ZIP: string
  FEES_CHARGED: number
  FEES_PAID: number
  BALANCE_DUE: number
  OWNER_NAME: string
  LAT: number
  LON: number
}

export interface MunicipalLienCheckResult {
  hasViolations: boolean
  hasActiveLien: boolean
  totalBalanceDue: number
  violationCount: number
  cases: CodeEnforcementCase[]
  dataSource: 'api' | 'manual' | 'unavailable'
  checkedAt: string
  notes: string
}

export type MunicipalLienRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'

// =============================================================================
// CONFIGURATION
// =============================================================================

const CODE_ENFORCEMENT_API_BASE = 'https://gis2.codb.us/arcgis/rest/services/CustomResources/CodeEnforcementCases/MapServer'
const API_LAYER_ID = 7 // "UT Cases - Open Current Year"

// Cities in Utah County that handle their own code enforcement
// These are NOT covered by the county API
const CITIES_WITH_OWN_ENFORCEMENT = [
  'PROVO', 'OREM', 'LEHI', 'AMERICAN FORK', 'PLEASANT GROVE',
  'SPANISH FORK', 'SPRINGVILLE', 'HIGHLAND', 'ALPINE', 'LINDON',
  'MAPLETON', 'PAYSON', 'SARATOGA SPRINGS', 'EAGLE MOUNTAIN',
  'VINEYARD', 'CEDAR HILLS', 'GENOLA', 'ELK RIDGE', 'SANTAQUIN',
  'SALEM', 'WOODLAND HILLS', 'DRAPER', 'GOSHEN'
]

// City code enforcement department links
export const CITY_CODE_ENFORCEMENT_LINKS: Record<string, { url: string; phone?: string; name: string }> = {
  'PROVO': {
    name: 'Provo City Code Compliance',
    url: 'https://cvportal.provo.org/CityViewPortal',
    phone: '(801) 852-6427'
  },
  'OREM': {
    name: 'Orem City Code Enforcement',
    url: 'https://orem.gov/orem-ut/municipal-code-enforcement/',
    phone: '(801) 229-7044'
  },
  'LEHI': {
    name: 'Lehi City Code Enforcement',
    url: 'https://www.lehi-ut.gov/code-enforcement/',
    phone: '(385) 201-1003'
  },
  'AMERICAN FORK': {
    name: 'American Fork Code Enforcement',
    url: 'https://www.americanfork.gov/177/Code-Enforcement',
    phone: '(801) 763-3000'
  },
  'PLEASANT GROVE': {
    name: 'Pleasant Grove Code Enforcement',
    url: 'https://pgcityutah.gov/departments/community_development/code_enforcement.php',
    phone: '(801) 785-5045'
  },
  'SPANISH FORK': {
    name: 'Spanish Fork Code Enforcement',
    url: 'https://www.spanishfork.org/city/code-enforcement',
    phone: '(801) 804-4505'
  },
  'SPRINGVILLE': {
    name: 'Springville Code Enforcement',
    url: 'https://www.springville.org/community-development/code-enforcement/',
    phone: '(801) 489-2713'
  },
  'HIGHLAND': {
    name: 'Highland City Code Enforcement',
    url: 'https://www.highlandcity.org/code-enforcement',
    phone: '(801) 756-5751'
  },
  'ALPINE': {
    name: 'Alpine City Code Enforcement',
    url: 'https://www.alpineut.gov/171/Code-Enforcement',
    phone: '(801) 756-6347'
  },
  'LINDON': {
    name: 'Lindon City Code Enforcement',
    url: 'https://www.lindon.gov/238/Code-Enforcement',
    phone: '(801) 796-7974'
  },
  'SARATOGA SPRINGS': {
    name: 'Saratoga Springs Code Enforcement',
    url: 'https://www.saratogasprings-ut.gov/182/planning-zoning',
    phone: '(801) 766-9793'
  },
  'EAGLE MOUNTAIN': {
    name: 'Eagle Mountain Code Enforcement',
    url: 'https://eaglemountain.gov/code-enforcement/',
    phone: '(801) 789-4375'
  },
  'VINEYARD': {
    name: 'Vineyard City Code Enforcement',
    url: 'https://www.vineyardutah.gov/government/code-enforcement.php',
    phone: '(801) 226-2099'
  },
  'MAPLETON': {
    name: 'Mapleton City Code Enforcement',
    url: 'https://www.mapleton.org/departments/community_development/',
    phone: '(801) 489-3425'
  },
  'PAYSON': {
    name: 'Payson City Code Enforcement',
    url: 'https://www.paysonutah.gov/330/Community-Development',
    phone: '(801) 465-5100'
  },
  'CEDAR HILLS': {
    name: 'Cedar Hills Code Enforcement',
    url: 'https://www.cedarhills.org/code-enforcement',
    phone: '(801) 785-7996'
  },
  'GOSHEN': {
    name: 'Goshen Town Code Enforcement',
    url: 'https://goshentownutah.gov/',
    phone: '(801) 667-9551'
  },
  'SANTAQUIN': {
    name: 'Santaquin City Code Enforcement',
    url: 'https://www.santaquin.org/departments/community_development/',
    phone: '(801) 754-3211'
  },
  'SALEM': {
    name: 'Salem City Code Enforcement',
    url: 'https://www.salemcity.org/code-enforcement',
    phone: '(801) 423-2776'
  }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Normalize parcel number for API query
 * Removes colons: "01:002:0003" -> "010020003"
 */
export function normalizeParcelForApi(parcelNumber: string): string {
  return parcelNumber.replace(/:/g, '').trim()
}

/**
 * Check if property is in unincorporated Utah County (covered by API)
 * or in a city (requires manual check)
 */
export function isUnincorporated(propertyAddress: string | null | undefined): boolean {
  if (!propertyAddress) return false
  
  const upperAddress = propertyAddress.toUpperCase()
  
  // Check if address contains any city name
  for (const city of CITIES_WITH_OWN_ENFORCEMENT) {
    if (upperAddress.includes(city)) {
      return false
    }
  }
  
  // Check for unincorporated indicators
  if (upperAddress.includes('UNINCORPORATED') || 
      upperAddress.includes('COUNTY') ||
      upperAddress.includes('UT 8460') ||  // Generic ZIP without city
      upperAddress.includes('UT 8461') ||
      upperAddress.includes('UT 8462') ||
      upperAddress.includes('UT 8463') ||
      upperAddress.includes('UT 8464') ||
      upperAddress.includes('UT 8465') ||
      upperAddress.includes('UT 8466')) {
    return true
  }
  
  return false
}

/**
 * Get code enforcement department link for a property
 */
export function getCodeEnforcementLink(propertyAddress: string | null | undefined): {
  type: 'api' | 'manual'
  url: string
  phone?: string
  name: string
  notes: string
} {
  if (!propertyAddress) {
    return {
      type: 'manual',
      url: 'https://www.utahcounty.gov/LandRecords/namesearch.asp',
      name: 'Utah County Recorder',
      notes: 'Search by owner name or address for recorded liens'
    }
  }
  
  const upperAddress = propertyAddress.toUpperCase()
  
  // Check for city match
  for (const [city, info] of Object.entries(CITY_CODE_ENFORCEMENT_LINKS)) {
    if (upperAddress.includes(city)) {
      return {
        type: 'manual',
        url: info.url,
        phone: info.phone,
        name: info.name,
        notes: `Contact ${city} code enforcement - city handles violations independently`
      }
    }
  }
  
  // Default to county API for unincorporated
  return {
    type: 'api',
    url: 'https://www.utahcounty.gov/landrecords/',
    name: 'Utah County Code Enforcement',
    notes: 'Unincorporated area - can be checked via county API or land records'
  }
}

/**
 * Fetch code enforcement cases for a parcel from Utah County API
 * NOTE: Only works for unincorporated properties
 */
export async function fetchCodeEnforcementCases(
  parcelNumber: string
): Promise<CodeEnforcementCase[]> {
  const normalizedParcel = normalizeParcelForApi(parcelNumber)
  
  const queryUrl = `${CODE_ENFORCEMENT_API_BASE}/${API_LAYER_ID}/query?where=SITE_APN='${normalizedParcel}'&outFields=*&f=json`
  
  try {
    const response = await fetch(queryUrl, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.features || !Array.isArray(data.features)) {
      return []
    }
    
    return data.features.map((feature: { attributes: CodeEnforcementCase }) => feature.attributes)
  } catch (error) {
    console.error('Failed to fetch code enforcement cases:', error)
    return []
  }
}

/**
 * Check municipal liens for a property
 * Returns detailed results including balance due and violation status
 */
export async function checkMunicipalLiens(
  parcelNumber: string,
  propertyAddress: string | null | undefined
): Promise<MunicipalLienCheckResult> {
  const isUninc = isUnincorporated(propertyAddress)
  const checkedAt = new Date().toISOString()
  
  // If in a city, we can't use the API
  if (!isUninc) {
    const cityInfo = getCodeEnforcementLink(propertyAddress)
    return {
      hasViolations: false,
      hasActiveLien: false,
      totalBalanceDue: 0,
      violationCount: 0,
      cases: [],
      dataSource: 'manual',
      checkedAt,
      notes: `Property is in a city jurisdiction. ${cityInfo.notes}. Contact: ${cityInfo.name} at ${cityInfo.url}`
    }
  }
  
  // Try to fetch from API for unincorporated properties
  try {
    const cases = await fetchCodeEnforcementCases(parcelNumber)
    
    const openCases = cases.filter(c => 
      c.STATUS !== 'Closed' && 
      (c.BALANCE_DUE > 0 || c.STATUS === 'Lien')
    )
    
    const totalBalance = openCases.reduce((sum, c) => sum + (c.BALANCE_DUE || 0), 0)
    const hasActiveLien = openCases.some(c => c.STATUS === 'Lien')
    
    return {
      hasViolations: openCases.length > 0,
      hasActiveLien,
      totalBalanceDue: totalBalance,
      violationCount: openCases.length,
      cases: openCases,
      dataSource: 'api',
      checkedAt,
      notes: hasActiveLien 
        ? `FOUND: ${openCases.length} violation(s) with $${totalBalance.toLocaleString()} balance due`
        : openCases.length > 0
          ? `Found ${openCases.length} open case(s) but no active lien recorded`
          : 'No open code enforcement cases found'
    }
  } catch (error) {
    return {
      hasViolations: false,
      hasActiveLien: false,
      totalBalanceDue: 0,
      violationCount: 0,
      cases: [],
      dataSource: 'unavailable',
      checkedAt,
      notes: `API check failed: ${error instanceof Error ? error.message : 'Unknown error'}. Manual verification required.`
    }
  }
}

// =============================================================================
// SCORING HELPERS
// =============================================================================

/**
 * Calculate municipal lien risk level based on check results
 */
export function calculateLienRiskLevel(result: MunicipalLienCheckResult): MunicipalLienRisk {
  if (result.dataSource === 'unavailable') return 'UNKNOWN'
  if (result.hasActiveLien) return 'HIGH'
  if (result.hasViolations && result.totalBalanceDue > 1000) return 'MEDIUM'
  if (result.hasViolations) return 'MEDIUM'
  return 'LOW'
}

/**
 * Get scoring penalty for municipal lien risk
 * Expert Investor: Municipal liens survive foreclosure, must subtract from max bid
 */
export function getMunicipalLienScorePenalty(riskLevel: MunicipalLienRisk): number {
  switch (riskLevel) {
    case 'HIGH': return -20
    case 'MEDIUM': return -10
    case 'LOW': return 0
    case 'UNKNOWN': return -5  // Penalty for uncertainty
  }
}

/**
 * Generate warning message for display
 */
export function generateLienWarning(
  result: MunicipalLienCheckResult,
  riskLevel: MunicipalLienRisk
): string | null {
  if (riskLevel === 'HIGH') {
    return `CRITICAL: Municipal lien detected with $${result.totalBalanceDue.toLocaleString()} balance due. This lien SURVIVES foreclosure and must be paid before clear title.`
  }
  
  if (riskLevel === 'MEDIUM') {
    return `WARNING: Code enforcement violations found ($${result.totalBalanceDue.toLocaleString()}). Verify lien status before bidding.`
  }
  
  if (riskLevel === 'UNKNOWN') {
    return `Manual check required: Could not verify municipal lien status. Contact city/county code enforcement before bidding.`
  }
  
  return null
}

// =============================================================================
// UTILITY LIEN HELPERS
// =============================================================================

/**
 * Get utility lien search links
 * These always require manual search through county recorder
 */
export function getUtilityLienLinks(parcelNumber: string): {
  recorderSearch: string
  ownerSearch: string
  waterRightsSearch: string
  notes: string
} {
  const normalized = normalizeParcelForApi(parcelNumber)
  
  return {
    recorderSearch: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalized}`,
    ownerSearch: 'https://www.utahcounty.gov/LandRecords/namesearch.asp',
    waterRightsSearch: 'https://www.utahcounty.gov/landrecords/WaterRightsSearchForm.asp',
    notes: 'Utility liens must be searched manually. Check: water, sewer, gas, electric. These survive tax foreclosure in Utah.'
  }
}

// =============================================================================
// BATCH CHECKING
// =============================================================================

/**
 * Batch check multiple properties
 * Only unincorporated properties will be checked via API
 */
export async function batchCheckMunicipalLiens(
  properties: Array<{ parcelNumber: string; address: string | null }>
): Promise<Map<string, MunicipalLienCheckResult>> {
  const results = new Map<string, MunicipalLienCheckResult>()
  
  // Rate limiting: process in batches with delay
  const BATCH_SIZE = 5
  const DELAY_MS = 1000
  
  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const batch = properties.slice(i, i + BATCH_SIZE)
    
    await Promise.all(
      batch.map(async (prop) => {
        const result = await checkMunicipalLiens(prop.parcelNumber, prop.address)
        results.set(prop.parcelNumber, result)
      })
    )
    
    // Delay between batches to be nice to the API
    if (i + BATCH_SIZE < properties.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }
  
  return results
}
