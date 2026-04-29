/**
 * Highland City Zoning Fetcher
 * Layer ID: 24
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['HIGHLAND']
const LAYER_ID = CITY_LAYER_IDS['HIGHLAND']

/**
 * Fetch zoning for Highland properties
 */
export async function fetchHighlandZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'HIGHLAND')

  if (!result) {
    return createZoningResult('HIGHLAND', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeHighlandZoneCode(zoneCode)
  }

  return createZoningResult('HIGHLAND', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Highland zone codes
 */
function normalizeHighlandZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R120': 'R-1-20',
    'R130': 'R-1-30',
    'R140': 'R-1-40',
    'C1': 'C-1',
    'CR': 'C-R',
    'PD1': 'PD-1',
  }

  return codeMap[normalized] || normalized
}
