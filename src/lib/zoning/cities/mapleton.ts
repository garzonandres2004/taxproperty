/**
 * Mapleton City Zoning Fetcher
 * Layer ID: 27
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['MAPLETON']
const LAYER_ID = CITY_LAYER_IDS['MAPLETON']

/**
 * Fetch zoning for Mapleton properties
 */
export async function fetchMapletonZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'MAPLETON')

  if (!result) {
    return createZoningResult('MAPLETON', null, null, PLANNING_URL)
  }

  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  if (zoneCode) {
    zoneCode = normalizeMapletonZoneCode(zoneCode)
  }

  return createZoningResult('MAPLETON', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Mapleton zone codes
 */
function normalizeMapletonZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  const codeMap: Record<string, string> = {
    'A': 'A',
    'RA': 'R-A',
    'R1': 'R-1',
    'R2': 'R-2',
    'RAC': 'RA-C',
    'SD': 'S-D',
    'CC': 'C-C',
    'GC': 'G-C',
    'NC': 'N-C',
    'PO': 'P-O',
    'IM': 'I-M',
    'TDR': 'TDR',
  }

  return codeMap[normalized] || normalized
}
