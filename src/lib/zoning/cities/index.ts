/**
 * City Zoning Fetchers
 * Unified interface for fetching zoning data from Utah County cities
 */

import { fetchProvoZoning } from './provo'
import { fetchOremZoning } from './orem'
import { fetchLehiZoning } from './lehi'
import { fetchSpanishForkZoning } from './spanish-fork'
import { fetchPleasantGroveZoning } from './pleasant-grove'
import { fetchSpringvilleZoning } from './springville'
import { fetchAmericanForkZoning } from './american-fork'
import { fetchHighlandZoning } from './highland'
import { fetchAlpineZoning } from './alpine'
import { fetchCedarHillsZoning } from './cedar-hills'
import { fetchLindonZoning } from './lindon'
import { fetchMapletonZoning } from './mapleton'
import { fetchPaysonZoning } from './payson'
import { fetchSaratogaSpringsZoning } from './saratoga-springs'
import { fetchEagleMountainZoning } from './eagle-mountain'
import { fetchVineyardZoning } from './vineyard'

export interface ZoningResult {
  zoneCode: string | null
  zoneName: string | null
  buildabilityScore: number
  sourceUrl: string
  jurisdiction: string
  isUnincorporated: boolean
}

export interface Coordinates {
  x: number  // longitude
  y: number  // latitude
}

// Map city names to fetcher functions
const cityFetchers: Record<string, (coords: Coordinates, parcelNumber?: string) => Promise<ZoningResult>> = {
  'PROVO': fetchProvoZoning,
  'OREM': fetchOremZoning,
  'LEHI': fetchLehiZoning,
  'SPANISH FORK': fetchSpanishForkZoning,
  'PLEASANT GROVE': fetchPleasantGroveZoning,
  'SPRINGVILLE': fetchSpringvilleZoning,
  'AMERICAN FORK': fetchAmericanForkZoning,
  'HIGHLAND': fetchHighlandZoning,
  'ALPINE': fetchAlpineZoning,
  'CEDAR HILLS': fetchCedarHillsZoning,
  'LINDON': fetchLindonZoning,
  'MAPLETON': fetchMapletonZoning,
  'PAYSON': fetchPaysonZoning,
  'SARATOGA SPRINGS': fetchSaratogaSpringsZoning,
  'EAGLE MOUNTAIN': fetchEagleMountainZoning,
  'VINEYARD': fetchVineyardZoning,
}

// Layer IDs for each city in Utah County ArcGIS
export const CITY_LAYER_IDS: Record<string, number> = {
  'ALPINE': 15,
  'AMERICAN FORK': 16,
  'CEDAR FORT': 17,
  'CEDAR HILLS': 18,
  'DRAPER': 19,
  'EAGLE MOUNTAIN': 20,
  'ELK RIDGE': 21,
  'GENOLA': 22,
  'GOSHEN': 23,
  'HIGHLAND': 24,
  'LEHI': 25,
  'LINDON': 26,
  'MAPLETON': 27,
  'OREM': 28,
  'PROVO': 29,
  'PLEASANT GROVE': 30,
  'PAYSON': 31,
  'SALEM': 32,
  'SANTAQUIN': 33,
  'SARATOGA SPRINGS': 34,
  'SPANISH FORK': 35,
  'SPRINGVILLE': 36,
  'VINEYARD': 37,
  'WOODLAND HILLS': 38,
}

// City planning URLs for manual fallback
export const CITY_PLANNING_URLS: Record<string, string> = {
  'PROVO': 'https://www.provo.org/departments/community-development/planning',
  'OREM': 'https://orem.gov/planning/',
  'LEHI': 'https://www.lehi-ut.gov/planning-zoning/',
  'SPANISH FORK': 'https://www.spanishfork.org/planning',
  'PLEASANT GROVE': 'https://pgcityutah.gov/departments/community_development/',
  'SPRINGVILLE': 'https://www.springville.org/community-development/',
  'AMERICAN FORK': 'https://www.americanfork.gov/841/Mapping-GIS',
  'HIGHLAND': 'https://www.highlandcity.org/planning',
  'ALPINE': 'https://www.alpineut.gov/168/Planning-Zoning',
  'CEDAR HILLS': 'https://www.cedarhills.org/page/maps',
  'LINDON': 'https://www.lindon.gov/239/Planning-Zoning',
  'MAPLETON': 'https://www.mapleton.org/departments/community_development/resources/maps.php',
  'PAYSON': 'https://www.paysonutah.gov/331/Planning-and-Zoning',
  'SARATOGA SPRINGS': 'https://www.saratogasprings-ut.gov/182/planning-zoning',
  'EAGLE MOUNTAIN': 'https://eaglemountain.gov/government/zoning-in-eagle-mountain/',
  'VINEYARD': 'https://www.vineyardutah.gov/government/planning.php',
  'SALEM': 'https://salem-ut.gov/planning-zoning/',
  'SANTAQUIN': 'https://santaquin.org/planning-zoning/',
  'GOSHEN': 'https://goshenutah.gov/planning-zoning/',
  'CEDAR FORT': 'https://www.cedarfort.org/',
}

/**
 * Fetch zoning for a city property using coordinates
 */
export async function fetchCityZoning(
  cityName: string,
  coords: Coordinates,
  parcelNumber?: string
): Promise<ZoningResult> {
  const normalizedCity = cityName.toUpperCase().trim()
  const fetcher = cityFetchers[normalizedCity]

  if (!fetcher) {
    return {
      zoneCode: null,
      zoneName: null,
      buildabilityScore: 0,
      sourceUrl: CITY_PLANNING_URLS[normalizedCity] || '',
      jurisdiction: normalizedCity,
      isUnincorporated: false,
    }
  }

  try {
    return await fetcher(coords, parcelNumber)
  } catch (error) {
    console.error(`Error fetching zoning for ${normalizedCity}:`, error)
    return {
      zoneCode: null,
      zoneName: null,
      buildabilityScore: 0,
      sourceUrl: CITY_PLANNING_URLS[normalizedCity] || '',
      jurisdiction: normalizedCity,
      isUnincorporated: false,
    }
  }
}

/**
 * Get layer ID for a city
 */
export function getCityLayerId(cityName: string): number | null {
  return CITY_LAYER_IDS[cityName.toUpperCase().trim()] || null
}

/**
 * Check if we have a fetcher for this city
 */
export function hasCityFetcher(cityName: string): boolean {
  return cityName.toUpperCase().trim() in cityFetchers
}

// Re-export individual fetchers for direct use
export {
  fetchProvoZoning,
  fetchOremZoning,
  fetchLehiZoning,
  fetchSpanishForkZoning,
  fetchPleasantGroveZoning,
  fetchSpringvilleZoning,
  fetchAmericanForkZoning,
  fetchHighlandZoning,
  fetchAlpineZoning,
  fetchCedarHillsZoning,
  fetchLindonZoning,
  fetchMapletonZoning,
  fetchPaysonZoning,
  fetchSaratogaSpringsZoning,
  fetchEagleMountainZoning,
  fetchVineyardZoning,
}
