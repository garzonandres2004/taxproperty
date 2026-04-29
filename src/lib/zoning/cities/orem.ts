/**
 * Orem City Zoning Fetcher
 * Layer ID: 28
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['OREM']
const LAYER_ID = CITY_LAYER_IDS['OREM']

/**
 * Fetch zoning for Orem properties
 */
export async function fetchOremZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'OREM')

  if (!result) {
    return createZoningResult('OREM', null, null, PLANNING_URL)
  }

  // Orem uses: ZONE_OR_DESC (description), ZONE_OR_LABEL (code)
  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  // Normalize Orem zone codes
  if (zoneCode) {
    zoneCode = normalizeOremZoneCode(zoneCode)
  }

  if (!zoneCode && zoneName) {
    zoneCode = extractCodeFromOremDesc(zoneName)
  }

  return createZoningResult('OREM', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Orem zone codes
 */
function normalizeOremZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R': 'R',
    'RA': 'R-A',
    'CL': 'C-L',
    'CG': 'C-G',
    'BP': 'B-P',
    'SHD': 'S-HD',  // Student Housing District
    'UMU': 'U-MU',  // Urban Mixed Use
  }

  return codeMap[normalized] || normalized
}

/**
 * Extract zone code from Orem description
 */
function extractCodeFromOremDesc(desc: string): string | null {
  const upper = desc.toUpperCase()
  
  if (upper.includes('STUDENT HOUSING')) return 'S-HD'
  if (upper.includes('URBAN MIXED')) return 'U-MU'
  if (upper.includes('BUSINESS PARK')) return 'B-P'
  if (upper.includes('COMMERCIAL - LOCAL')) return 'C-L'
  if (upper.includes('COMMERCIAL - GENERAL')) return 'C-G'
  if (upper.includes('RESIDENTIAL')) return 'R'
  
  return null
}
