/**
 * Eagle Mountain City Zoning Fetcher
 * Layer ID: 20
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['EAGLE MOUNTAIN']
const LAYER_ID = CITY_LAYER_IDS['EAGLE MOUNTAIN']

/**
 * Fetch zoning for Eagle Mountain properties
 */
export async function fetchEagleMountainZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'EAGLE MOUNTAIN')

  if (!result) {
    return createZoningResult('EAGLE MOUNTAIN', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeEMZoneCode(zoneCode)
  }

  return createZoningResult('EAGLE MOUNTAIN', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Eagle Mountain zone codes
 */
function normalizeEMZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'CR': 'C-R',
    'OS': 'O-S',
    'SC': 'S-C',
    'TCR': 'TC-R',
    'VC': 'V-C',
    'EM': 'E-M',
  }

  return codeMap[normalized] || normalized
}
