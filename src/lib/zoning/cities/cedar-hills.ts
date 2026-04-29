/**
 * Cedar Hills City Zoning Fetcher
 * Layer ID: 18
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['CEDAR HILLS']
const LAYER_ID = CITY_LAYER_IDS['CEDAR HILLS']

/**
 * Fetch zoning for Cedar Hills properties
 */
export async function fetchCedarHillsZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'CEDAR HILLS')

  if (!result) {
    return createZoningResult('CEDAR HILLS', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeCHZoneCode(zoneCode)
  }

  return createZoningResult('CEDAR HILLS', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Cedar Hills zone codes
 */
function normalizeCHZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R1': 'R-1',
    'R2': 'R-2',
    'C': 'C',
    'I': 'I',
    'PF': 'P-F',
  }

  return codeMap[normalized] || normalized
}
