/**
 * Alpine City Zoning Fetcher
 * Layer ID: 15
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['ALPINE']
const LAYER_ID = CITY_LAYER_IDS['ALPINE']

/**
 * Fetch zoning for Alpine properties
 */
export async function fetchAlpineZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'ALPINE')

  if (!result) {
    return createZoningResult('ALPINE', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeAlpineZoneCode(zoneCode)
  }

  return createZoningResult('ALPINE', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Alpine zone codes
 */
function normalizeAlpineZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'RA': 'R-A',
    'R1': 'R-1',
    'R2': 'R-2',
    'C': 'C',
    'I': 'I',
    'PF': 'P-F',
  }

  return codeMap[normalized] || normalized
}
