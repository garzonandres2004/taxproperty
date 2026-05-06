// Generic AGRC LIR lookup — works for any Utah county that has a LIR layer.
// Tries the raw parcel ID, then a numeric-stripped fallback.

import type { AgrcParcelData } from './auction-types'

const AGRC_BASE = 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services'
// Use '*' — field availability varies by county (e.g. Box Elder lacks LEGAL_DESC, NAME, LAND_USE)
const OUT_FIELDS = '*'
const FETCH_OPTS = { headers: { 'User-Agent': 'TaxProperty-Utah/1.0 pipeline' } }

// Map DB slug → AGRC layer name
const LAYER_NAME: Record<string, string> = {
  utah: 'Utah',
  tooele: 'Tooele',
  rich: 'Rich',
  sanpete: 'Sanpete',
  box_elder: 'BoxElder',
  salt_lake: 'SaltLake',
  juab: 'Juab',
  sevier: 'Sevier',
  iron: 'Iron',
  wasatch: 'Wasatch',
  washington: 'Washington',
  beaver: 'Beaver',
  duchesne: 'Duchesne',
  davis: 'Davis',
  weber: 'Weber',
  cache: 'Cache',
  summit: 'Summit',
  carbon: 'Carbon',
  uintah: 'Uintah',
  grand: 'Grand',
  emery: 'Emery',
  san_juan: 'SanJuan',
  garfield: 'Garfield',
  kane: 'Kane',
  millard: 'Millard',
  piute: 'Piute',
  wayne: 'Wayne',
  morgan: 'Morgan',
  daggett: 'Daggett',
}

function agrcLayerUrl(countySlug: string): string | null {
  const layer = LAYER_NAME[countySlug]
  if (!layer) return null
  return `${AGRC_BASE}/Parcels_${layer}_LIR/FeatureServer/0/query`
}

async function queryAgrc(layerUrl: string, where: string): Promise<Record<string, unknown> | null> {
  const url = `${layerUrl}?where=${encodeURIComponent(where)}&outFields=${encodeURIComponent(OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=json`
  try {
    const res = await fetch(url, FETCH_OPTS)
    if (!res.ok) return null
    const data = await res.json() as { features?: Array<{ attributes: Record<string, unknown>; geometry?: unknown }> }
    if (!data?.features?.length) return null
    const feat = data.features[0]
    return { ...feat.attributes, _geometry: feat.geometry }
  } catch {
    return null
  }
}

function centroidFromGeometry(geom: unknown): { lat: number; lon: number } | null {
  if (!geom || typeof geom !== 'object') return null
  const g = geom as Record<string, unknown>
  // Point geometry
  if (typeof g.x === 'number' && typeof g.y === 'number') {
    return { lat: g.y, lon: g.x }
  }
  // Polygon — average of outer ring
  const rings = g.rings as number[][][] | undefined
  if (rings?.length && rings[0]?.length) {
    const ring = rings[0]
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length
    const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length
    return { lat, lon }
  }
  return null
}

function parseAttrs(attrs: Record<string, unknown>): AgrcParcelData {
  const geom = centroidFromGeometry(attrs._geometry)
  return {
    parcel_id_returned: (attrs.PARCEL_ID as string | null) ?? (attrs.SERIAL_NUM as string | null) ?? null,
    owner_name: (attrs.NAME as string | null) ?? null,
    situs_address: (attrs.PARCEL_ADD as string | null) ?? null,
    city: (attrs.PARCEL_CITY as string | null) ?? null,
    legal_description: (attrs.LEGAL_DESC as string | null) ?? null,
    acres: typeof attrs.PARCEL_ACRES === 'number' ? attrs.PARCEL_ACRES : null,
    market_value: typeof attrs.TOTAL_MKT_VALUE === 'number' ? Math.round(attrs.TOTAL_MKT_VALUE) : null,
    land_value: typeof attrs.LAND_MKT_VALUE === 'number' ? Math.round(attrs.LAND_MKT_VALUE) : null,
    building_sqft: typeof attrs.BLDG_SQFT === 'number' ? Math.round(attrs.BLDG_SQFT) : null,
    year_built: typeof attrs.BUILT_YR === 'number' ? attrs.BUILT_YR : null,
    property_class: (attrs.PROP_CLASS as string | null) ?? (attrs.LAND_USE as string | null) ?? null,
    latitude: geom?.lat ?? null,
    longitude: geom?.lon ?? null,
    raw_attributes: attrs,
  }
}

export async function lookupAgrc(countySlug: string, parcelId: string): Promise<AgrcParcelData | null> {
  const layerUrl = agrcLayerUrl(countySlug)
  if (!layerUrl) return null

  // Attempt 1: exact match on raw parcel ID against PARCEL_ID field
  let attrs = await queryAgrc(layerUrl, `PARCEL_ID='${parcelId}'`)
  if (attrs) return parseAttrs(attrs)

  // Attempt 2: raw parcel ID against SERIAL_NUM (handles dashed IDs like Box Elder 01-150-0012)
  attrs = await queryAgrc(layerUrl, `SERIAL_NUM='${parcelId}'`)
  if (attrs) return parseAttrs(attrs)

  // Attempt 3: numeric-stripped ID against SERIAL_NUM (for counties where SERIAL_NUM is digits-only)
  const numericId = parcelId.replace(/[^0-9]/g, '')
  if (numericId && numericId !== parcelId) {
    attrs = await queryAgrc(layerUrl, `SERIAL_NUM='${numericId}'`)
    if (attrs) return parseAttrs(attrs)

    // Attempt 4: numeric-stripped against PARCEL_ID
    attrs = await queryAgrc(layerUrl, `PARCEL_ID='${numericId}'`)
    if (attrs) return parseAttrs(attrs)
  }

  // Attempt 5: LIKE prefix on numeric form (first 8 chars) — for multi-segment IDs
  const numericPrefix = (numericId || parcelId.replace(/[^0-9]/g, '')).slice(0, 8)
  if (numericPrefix.length >= 6) {
    attrs = await queryAgrc(layerUrl, `PARCEL_ID LIKE '${numericPrefix}%'`)
    if (attrs) return parseAttrs(attrs)
  }

  return null
}
