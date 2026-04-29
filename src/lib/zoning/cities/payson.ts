/**
 * Payson City Zoning Fetcher
 * Layer ID: 31
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['PAYSON']
const LAYER_ID = CITY_LAYER_IDS['PAYSON']

/**
 * Fetch zoning for Payson properties
 */
export async function fetchPaysonZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'PAYSON')

  if (!result) {
    return createZoningResult('PAYSON', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizePaysonZoneCode(zoneCode)
  }

  return createZoningResult('PAYSON', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Payson zone codes
 */
function normalizePaysonZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A': 'A',
    'RR': 'R-R',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'C1': 'C-1',
    'C2': 'C-2',
    'I': 'I',
    'M': 'M',
  }

  return codeMap[normalized] || normalized
}
