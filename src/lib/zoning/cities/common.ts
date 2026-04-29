/**
 * Common utilities for city zoning fetchers
 */

import { ZoningResult, Coordinates } from './index'

const UTAH_COUNTY_ARCGIS_BASE = 'https://maps.utahcounty.gov/arcgis/rest/services/Assessor/CommercialAppraiser/MapServer'

/**
 * Query zoning using the identify API
 */
export async function queryZoningIdentify(
  layerId: number,
  coords: Coordinates,
  cityName: string
): Promise<{
  zoneCode: string | null
  zoneName: string | null
  attributes: Record<string, any>
} | null> {
  try {
    // Calculate extent (buffer around point)
    const extentBuffer = 0.001
    const mapExtent = `${coords.x - extentBuffer},${coords.y - extentBuffer},${coords.x + extentBuffer},${coords.y + extentBuffer}`

    const geometry = encodeURIComponent(JSON.stringify({ x: coords.x, y: coords.y }))
    const mapExtentEncoded = encodeURIComponent(mapExtent)

    const identifyUrl = `${UTAH_COUNTY_ARCGIS_BASE}/identify?f=json&geometry=${geometry}&geometryType=esriGeometryPoint&sr=4326&layers=show:${layerId}&tolerance=10&mapExtent=${mapExtentEncoded}&imageDisplay=800,600,96&returnGeometry=false`

    const response = await fetch(identifyUrl, {
      headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data?.results?.length > 0) {
      const attrs = data.results[0].attributes || {}
      
      // Extract zone code and name based on city naming conventions
      const { zoneCode, zoneName } = extractZoneInfo(attrs, cityName)
      
      return {
        zoneCode,
        zoneName,
        attributes: attrs
      }
    }

    return null
  } catch (error) {
    console.error(`Zoning identify error for ${cityName}:`, error)
    return null
  }
}

/**
 * Extract zone code and name from attributes based on city naming conventions
 */
function extractZoneInfo(attrs: Record<string, any>, cityName: string): { zoneCode: string | null, zoneName: string | null } {
  const cityKey = cityName.toUpperCase().replace(/\s+/g, '_')
  
  // Try common field patterns
  const codeFields = [
    `ZONE_${cityKey}_LABEL`,
    `ZONE_${cityKey.substring(0, 2)}_LABEL`,
    'ZONE_LABEL',
    'ZONE_CODE',
    'ZONECLASS',
    'ZONE_CLASS',
    'ZONE',
    'ZONING',
    'CODE'
  ]
  
  const nameFields = [
    `ZONE_${cityKey}_DESC`,
    `ZONE_${cityKey.substring(0, 2)}_DESC`,
    'ZONE_DESC',
    'ZONEDESC',
    'ZONE_NAME',
    'ZONE_DESCRIPTION',
    'DESCRIPTION',
    'NAME'
  ]

  let zoneCode: string | null = null
  let zoneName: string | null = null

  // Find zone code
  for (const field of codeFields) {
    if (attrs[field] && attrs[field].toString().trim()) {
      zoneCode = attrs[field].toString().trim()
      break
    }
  }

  // Find zone name
  for (const field of nameFields) {
    if (attrs[field] && attrs[field].toString().trim()) {
      zoneName = attrs[field].toString().trim()
      break
    }
  }

  // If we have a zone name but no code, try to extract code from name
  if (!zoneCode && zoneName) {
    // Common patterns like "Residential - Single Family (R1)"
    const match = zoneName.match(/\(([A-Z0-9\-]+)\)$/)
    if (match) {
      zoneCode = match[1]
    }
  }

  return { zoneCode, zoneName }
}

/**
 * Calculate buildability score based on zone
 */
export function calculateBuildabilityFromZone(zoneCode: string | null, zoneName: string | null): number {
  if (!zoneCode && !zoneName) return 0

  const code = (zoneCode || '').toUpperCase()
  const name = (zoneName || '').toUpperCase()

  // Non-buildable zones (0-10 score)
  const nonBuildable = [
    'CE', 'CRITICAL', 'CONSERVATION', 'OPEN SPACE', 'PUBLIC FACILITIES',
    'PF', 'A-40', 'G-1', 'M&G-1', 'MINING', 'GRAZING'
  ]
  
  for (const nb of nonBuildable) {
    if (code.includes(nb) || name.includes(nb)) {
      return 10
    }
  }

  // Agricultural zones (20-40 score)
  if (code.startsWith('A') || name.includes('AGRICULTURAL') || name.includes('GRAZING')) {
    return 30
  }

  // Residential zones (60-90 score)
  if (code.startsWith('R') || name.includes('RESIDENTIAL')) {
    // Single family higher score than multi-family (more flexibility)
    if (name.includes('SINGLE FAMILY') || code.includes('R1') || code.includes('R-1')) {
      return 85
    }
    if (name.includes('TWO FAMILY') || code.includes('R2') || code.includes('R-2')) {
      return 80
    }
    if (name.includes('MULTIPLE') || name.includes('MULTI') || code.includes('RM') || code.includes('R3')) {
      return 75
    }
    if (name.includes('MOBILE') || name.includes('MH')) {
      return 60
    }
    return 70
  }

  // Commercial zones (50-70 score)
  if (code.startsWith('C') || name.includes('COMMERCIAL') || name.includes('BUSINESS')) {
    if (name.includes('NEIGHBORHOOD') || code.includes('CN') || code.includes('C-N')) {
      return 65
    }
    if (name.includes('LOCAL')) {
      return 60
    }
    return 55
  }

  // Industrial zones (40-60 score)
  if (code.startsWith('I') || code.startsWith('M') || name.includes('INDUSTRIAL') || name.includes('MANUFACTURING')) {
    if (name.includes('LIGHT') || code.includes('I-1') || code.includes('LI')) {
      return 55
    }
    return 45
  }

  // Mixed use (70-80 score)
  if (name.includes('MIXED') || code.includes('MU') || code.includes('MX')) {
    return 75
  }

  // Planned community (varies)
  if (code.includes('PC') || code.includes('PD') || name.includes('PLANNED')) {
    return 65
  }

  // Office (65-75 score)
  if (name.includes('OFFICE') || code.includes('O') || code.includes('PO')) {
    return 70
  }

  // Default for unknown
  return 50
}

/**
 * Create a standard ZoningResult
 */
export function createZoningResult(
  cityName: string,
  zoneCode: string | null,
  zoneName: string | null,
  planningUrl: string
): ZoningResult {
  return {
    zoneCode,
    zoneName,
    buildabilityScore: calculateBuildabilityFromZone(zoneCode, zoneName),
    sourceUrl: planningUrl,
    jurisdiction: cityName,
    isUnincorporated: false,
  }
}

/**
 * Normalize city name for consistent lookup
 */
export function normalizeCityName(name: string): string {
  return name.toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^CITY OF\s+/i, '')
    .replace(/\s+CITY$/i, '')
    .trim()
}
