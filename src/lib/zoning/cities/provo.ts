/**
 * Provo City Zoning Fetcher
 * Layer ID: 29
 */

import { ZoningResult, Coordinates, CITY_PLANNING_URLS, CITY_LAYER_IDS } from './index'
import { queryZoningIdentify, createZoningResult } from './common'

const PLANNING_URL = CITY_PLANNING_URLS['PROVO']
const LAYER_ID = CITY_LAYER_IDS['PROVO']

/**
 * Fetch zoning for Provo properties
 */
export async function fetchProvoZoning(
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const result = await queryZoningIdentify(LAYER_ID, coords, 'PROVO')

  if (!result) {
    return createZoningResult('PROVO', null, null, PLANNING_URL)
  }

  // Provo uses: ZONE_PR_DESC (description), ZONE_PR_LABEL (code like "R1", "CG")
  // Also has: ZONECLASS (abbreviated), ZONEDESC (full description)
  let zoneCode = result.zoneCode
  let zoneName = result.zoneName

  // Normalize Provo zone codes
  if (zoneCode) {
    zoneCode = normalizeProvoZoneCode(zoneCode)
  }

  // If we have a description but no code, try to extract it
  if (!zoneCode && zoneName) {
    zoneCode = extractCodeFromProvoDesc(zoneName)
  }

  return createZoningResult('PROVO', zoneCode, zoneName, PLANNING_URL)
}

/**
 * Normalize Provo zone codes to standard format
 */
function normalizeProvoZoneCode(code: string): string {
  const normalized = code.toUpperCase().trim()
  
  // Map common Provo codes
  const codeMap: Record<string, string> = {
    'R1': 'R-1',
    'R2': 'R-2',
    'R3': 'R-3',
    'RM': 'R-M',
    'CG': 'C-G',
    'CL': 'C-L',
    'CH': 'C-H',
    'M1': 'M-1',
    'M2': 'M-2',
    'PF': 'P-F',
    'A': 'A',
  }

  return codeMap[normalized] || normalized
}

/**
 * Extract zone code from Provo description
 */
function extractCodeFromProvoDesc(desc: string): string | null {
  const upper = desc.toUpperCase()
  
  // Pattern: "Residential - Single Family" -> "R-1"
  if (upper.includes('SINGLE FAMILY')) return 'R-1'
  if (upper.includes('TWO FAMILY')) return 'R-2'
  if (upper.includes('MULTIPLE') || upper.includes('MULTI')) return 'R-3'
  if (upper.includes('MEDIUM MULTIPLE')) return 'R-M'
  if (upper.includes('HIGH MULTIPLE')) return 'R-MH'
  
  // Commercial
  if (upper.includes('COMMERCIAL - GENERAL')) return 'C-G'
  if (upper.includes('COMMERCIAL - LOCAL')) return 'C-L'
  if (upper.includes('COMMERCIAL - HEAVY')) return 'C-H'
  if (upper.includes('SHOPPING CENTER')) return 'C-S'
  
  // Industrial
  if (upper.includes('MANUFACTURING - LIGHT')) return 'M-1'
  if (upper.includes('MANUFACTURING - HEAVY')) return 'M-2'
  if (upper.includes('MANUFACTURING PARK')) return 'M-P'
  
  // Other
  if (upper.includes('AGRICULTURAL')) return 'A'
  if (upper.includes('PUBLIC FACILITIES')) return 'P-F'
  if (upper.includes('PROFESSIONAL OFFICE')) return 'P-O'
  
  return null
}

/**
 * Provo zone code to friendly name
 */
export function getProvoZoneName(code: string): string {
  const names: Record<string, string> = {
    'R-1': 'Residential Single Family',
    'R-2': 'Residential Two Family',
    'R-3': 'Residential Multiple Family',
    'R-M': 'Residential Medium Multiple',
    'C-G': 'Commercial General',
    'C-L': 'Commercial Local',
    'C-H': 'Commercial Heavy',
    'M-1': 'Manufacturing Light',
    'M-2': 'Manufacturing Heavy',
    'P-F': 'Public Facilities',
    'P-O': 'Professional Office',
    'A': 'Agricultural',
  }
  
  return names[code] || code
}
