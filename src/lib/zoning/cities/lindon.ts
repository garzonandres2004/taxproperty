/**
 * Lindon City Zoning Fetcher
 * Layer ID: 26
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['LINDON']
const LAYER_ID = CITY_LAYER_IDS['LINDON']

/**
 * Fetch zoning for Lindon properties
 */
export async function fetchLindonZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'LINDON')

  if (!result) {
    return createZoningResult('LINDON', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeLindonZoneCode(zoneCode)
  }

  return createZoningResult('LINDON', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Lindon zone codes
 */
function normalizeLindonZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'C': 'C',
    'I': 'I',
    'M': 'M',
    'PF': 'P-F',
    'R2O': 'R-2-O',  // R2 Overlay
  }

  return codeMap[normalized] || normalized
}
