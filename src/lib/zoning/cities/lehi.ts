/**
 * Lehi City Zoning Fetcher
 * Layer ID: 25
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['LEHI']
const LAYER_ID = CITY_LAYER_IDS['LEHI']

/**
 * Fetch zoning for Lehi properties
 */
export async function fetchLehiZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'LEHI')

  if (!result) {
    return createZoningResult('LEHI', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeLehiZoneCode(zoneCode)
  }

  return createZoningResult('LEHI', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Lehi zone codes
 */
function normalizeLehiZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'RA': 'R-A',
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'CN': 'C-N',
    'CG': 'C-G',
    'BP': 'B-P',
    'IP': 'I-P',
    'PC': 'P-C',
    'RC': 'R-C',  // Resort Community
    'TM': 'T-M',  // Technical Manufacturing
    'MU': 'M-U',  // Mixed Use
  }

  return codeMap[normalized] || normalized
}
