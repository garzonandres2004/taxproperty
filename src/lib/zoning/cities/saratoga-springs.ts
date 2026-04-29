/**
 * Saratoga Springs City Zoning Fetcher
 * Layer ID: 34
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['SARATOGA SPRINGS']
const LAYER_ID = CITY_LAYER_IDS['SARATOGA SPRINGS']

/**
 * Fetch zoning for Saratoga Springs properties
 */
export async function fetchSaratogaSpringsZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'SARATOGA SPRINGS')

  if (!result) {
    return createZoningResult('SARATOGA SPRINGS', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeSSZoneCode(zoneCode)
  }

  return createZoningResult('SARATOGA SPRINGS', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Saratoga Springs zone codes
 */
function normalizeSSZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A': 'A',
    'RR': 'R-R',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'MF': 'M-F',
    'MU': 'M-U',
    'NC': 'N-C',
    'RC': 'R-C',
    'OW': 'O-W',
    'PC': 'P-C',
  }

  return codeMap[normalized] || normalized
}
