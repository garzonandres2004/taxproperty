/**
 * Vineyard City Zoning Fetcher
 * Layer ID: 37
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['VINEYARD']
const LAYER_ID = CITY_LAYER_IDS['VINEYARD']

/**
 * Fetch zoning for Vineyard properties
 */
export async function fetchVineyardZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'VINEYARD')

  if (!result) {
    return createZoningResult('VINEYARD', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeVineyardZoneCode(zoneCode)
  }

  return createZoningResult('VINEYARD', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Vineyard zone codes
 */
function normalizeVineyardZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'C': 'C',
    'I': 'I',
    'MU': 'M-U',
    'PF': 'P-F',
    'OS': 'O-S',
  }

  return codeMap[normalized] || normalized
}
