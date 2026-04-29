/**
 * Pleasant Grove City Zoning Fetcher
 * Layer ID: 30
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['PLEASANT GROVE']
const LAYER_ID = CITY_LAYER_IDS['PLEASANT GROVE']

/**
 * Fetch zoning for Pleasant Grove properties
 */
export async function fetchPleasantGroveZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'PLEASANT GROVE')

  if (!result) {
    return createZoningResult('PLEASANT GROVE', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizePGZoneCode(zoneCode)
  }

  return createZoningResult('PLEASANT GROVE', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Pleasant Grove zone codes
 */
function normalizePGZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A1': 'A-1',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'RM': 'R-M',
    'CN': 'C-N',
    'CS': 'C-S',
    'CG': 'C-G',
    'MD': 'M-D',
    'PO': 'P-O',
    'BMP': 'B-MP',
  }

  return codeMap[normalized] || normalized
}
