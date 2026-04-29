/**
 * Spanish Fork City Zoning Fetcher
 * Layer ID: 35
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['SPANISH FORK']
const LAYER_ID = CITY_LAYER_IDS['SPANISH FORK']

/**
 * Fetch zoning for Spanish Fork properties
 */
export async function fetchSpanishForkZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'SPANISH FORK')

  if (!result) {
    return createZoningResult('SPANISH FORK', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeSFZoneCode(zoneCode)
  }

  return createZoningResult('SPANISH FORK', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Spanish Fork zone codes
 */
function normalizeSFZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A': 'A',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'RM': 'R-M',
    'C1': 'C-1',
    'C2': 'C-2',
    'I1': 'I-1',
    'I2': 'I-2',
    'PD': 'P-D',
  }

  return codeMap[normalized] || normalized
}
