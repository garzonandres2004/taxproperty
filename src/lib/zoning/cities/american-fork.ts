/**
 * American Fork City Zoning Fetcher
 * Layer ID: 16
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['AMERICAN FORK']
const LAYER_ID = CITY_LAYER_IDS['AMERICAN FORK']

/**
 * Fetch zoning for American Fork properties
 */
export async function fetchAmericanForkZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'AMERICAN FORK')

  if (!result) {
    return createZoningResult('AMERICAN FORK', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeAFZoneCode(zoneCode)
  }

  return createZoningResult('AMERICAN FORK', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize American Fork zone codes
 */
function normalizeAFZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'R4': 'R-4',
    'CC1': 'CC-1',
    'CC2': 'CC-2',
    'GC1': 'GC-1',
    'GC2': 'GC-2',
    'M1': 'M-1',
    'PI1': 'PI-1',
    'PO': 'P-O',
    'BP': 'B-P',
    'PR': 'P-R',
  }

  return codeMap[normalized] || normalized
}
