/**
 * Springville City Zoning Fetcher
 * Layer ID: 36
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['SPRINGVILLE']
const LAYER_ID = CITY_LAYER_IDS['SPRINGVILLE']

/**
 * Fetch zoning for Springville properties
 */
export async function fetchSpringvilleZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'SPRINGVILLE')

  if (!result) {
    return createZoningResult('SPRINGVILLE', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeSVZoneCode(zoneCode)
  }

  return createZoningResult('SPRINGVILLE', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Springville zone codes
 */
function normalizeSVZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A': 'A',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'C1': 'C-1',
    'C2': 'C-2',
    'I': 'I',
    'M': 'M',
    'PD': 'P-D',
  }

  return codeMap[normalized] || normalized
}
