// Enriches an AuctionListing into a FullPropertyRecord.
// Uses AGRC LIR for valuation + physical data. Title data added only for
// counties with live scrapers (Utah, Tooele, Rich). All others: TitleSnapshot.confidence = 'NONE'.

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { lookupAgrc } from './agrc-lookup'
import { runCountyEnricher } from './enrichers'
import type {
  AuctionListing,
  FullPropertyRecord,
  AgrcParcelData,
  AssessorEnrichment,
  MissingDataFlag,
  TitleSnapshot,
  CountyReadiness,
} from './auction-types'

// ── County meta ────────────────────────────────────────────────────────────────

// DB slug from display name (handles "Iron County" → "iron", "Box Elder" → "box_elder")
const COUNTY_SLUG: Record<string, string> = {
  'sanpete': 'sanpete',
  'juab': 'juab',
  'box elder': 'box_elder',
  'salt lake': 'salt_lake',
  'sevier': 'sevier',
  'iron': 'iron',
  'iron county': 'iron',
  'wasatch': 'wasatch',
  'wasatch county': 'wasatch',
  'washington': 'washington',
  'beaver': 'beaver',
  'duchesne': 'duchesne',
  'duchesne county': 'duchesne',
  'utah': 'utah',
  'tooele': 'tooele',
  'rich': 'rich',
  'davis': 'davis',
  'weber': 'weber',
  'cache': 'cache',
  'summit': 'summit',
}

const DISPLAY_NAME: Record<string, string> = {
  sanpete: 'Sanpete', juab: 'Juab', box_elder: 'Box Elder', salt_lake: 'Salt Lake',
  sevier: 'Sevier', iron: 'Iron', wasatch: 'Wasatch', washington: 'Washington',
  beaver: 'Beaver', duchesne: 'Duchesne', utah: 'Utah', tooele: 'Tooele',
  rich: 'Rich', davis: 'Davis', weber: 'Weber', cache: 'Cache',
  summit: 'Summit',
}

// Readiness per county (mirrors CountyConfig.readiness in DB)
const COUNTY_READINESS: Record<string, CountyReadiness> = {
  utah: 'LIVE',
  tooele: 'LIVE',
  rich: 'LIVE',
  sanpete: 'NEAR_LIVE',
  davis: 'PARTIAL',
  weber: 'PARTIAL',
}

function getReadiness(slug: string): CountyReadiness {
  return COUNTY_READINESS[slug] ?? 'PLANNED'
}

// Public Surplus buyer's premium by county
const BUYERS_PREMIUM: Record<string, number> = {
  utah: 5,
  tooele: 8,
  rich: 5,
  sanpete: 5,
  box_elder: 5,
  salt_lake: 5,
  juab: 5,
  sevier: 5,
  iron: 5,
  wasatch: 5,
  washington: 5,
  beaver: 5,
  duchesne: 5,
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

interface CsvRow {
  listing_id: string
  title: string
  county: string
  current_price: string
  start_date: string
  end_date: string
  time_remaining: string
  status: string
  url: string
  parcel_number: string
  address: string
  acres: string
  full_description: string
}

function parseRawCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseCsvLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
      return row as unknown as CsvRow
    })
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export function parseCsvToListings(csvPath: string): AuctionListing[] {
  const raw = fs.readFileSync(csvPath, 'utf8')
  const rows = parseRawCsv(raw)
  const scrapedAt = new Date().toISOString()

  return rows
    .map((row): AuctionListing | null => {
      const countyRaw = (row.county ?? '').trim()
      const countyKey = countyRaw.toLowerCase()
      const slug = COUNTY_SLUG[countyKey] ?? null
      if (!slug) return null  // skip rows with unrecognised county

      // Split multi-parcel entries like "00-0012-8961 & 00-0012-8979"
      const parcelRaw = (row.parcel_number ?? '').trim()
      const parcelIds = parcelRaw
        .split(/\s*&\s*/)
        .map(s => s.trim())
        .filter(Boolean)
      if (parcelIds.length === 0) return null

      const openingBid = row.current_price
        ? parseFloat(row.current_price.replace(/[$,]/g, '')) || null
        : null

      let endDateParsed: Date | null = null
      if (row.end_date) {
        const d = new Date(row.end_date)
        if (!isNaN(d.getTime())) endDateParsed = d
      }

      const acresHint = row.acres ? parseFloat(row.acres) || null : null

      return {
        listing_id: row.listing_id.trim(),
        county: slug,
        county_display: DISPLAY_NAME[slug] ?? countyRaw,
        parcel_ids: parcelIds,
        parcel_raw: parcelRaw,
        title: (row.title ?? '').trim(),
        opening_bid: openingBid,
        start_date: row.start_date?.trim() || null,
        end_date: row.end_date?.trim() || null,
        end_date_parsed: endDateParsed,
        status: (row.status ?? '').trim(),
        url: (row.url ?? '').trim(),
        description: (row.full_description ?? '').trim(),
        address_hint: row.address?.trim() || null,
        acres_hint: acresHint,
        source_file: path.basename(csvPath),
        scraped_at: scrapedAt,
      }
    })
    .filter((l): l is AuctionListing => l !== null)
}

// ── Property type inference from title ────────────────────────────────────────

function inferPropertyType(title: string, agrcClass?: string | null): string {
  const t = title.toUpperCase()
  if (t.startsWith('CONDO')) return 'condo'
  if (t.startsWith('RESIDENTIAL')) return 'single_family'
  if (t.startsWith('COMMERCIAL')) return 'commercial'
  if (t.startsWith('VACANT')) return 'vacant_land'
  if (t.startsWith('STRIP')) return 'strip_lot'
  if (t.startsWith('STREET')) return 'street_parcel'
  if (t.startsWith('ENVIRONMENTAL')) return 'environmental'
  // Fall through to AGRC class
  if (agrcClass) {
    const c = agrcClass.toUpperCase()
    if (c.includes('RESIDENTIAL') || c.includes('RES')) return 'single_family'
    if (c.includes('COMMERCIAL') || c.includes('COM')) return 'commercial'
    if (c.includes('VACANT') || c.includes('VAC')) return 'vacant_land'
    if (c.includes('AGRIC') || c.includes('FARM')) return 'agricultural'
    if (c.includes('CONDO')) return 'condo'
  }
  return 'unknown'
}

function inferPropertyClass(propertyType: string): string {
  const map: Record<string, string> = {
    single_family: 'residential',
    condo: 'residential',
    multifamily: 'residential',
    duplex: 'residential',
    vacant_land: 'vacant',
    strip_lot: 'vacant',
    street_parcel: 'vacant',
    commercial: 'commercial',
    agricultural: 'agricultural',
    environmental: 'environmental',
  }
  return map[propertyType] ?? 'unknown'
}

function extractSubdivision(legal: string | null): string | null {
  if (!legal) return null
  const m = legal.match(/([A-Z][A-Z\s]+(?:SUB|SUBDIVISION|ESTATES|HEIGHTS|RIDGE|PARK|RANCH|VILLAGE|HILLS|ACRES))/i)
  return m ? m[1].trim() : null
}

function subdivisionPattern(
  subdivision: string | null,
  county: string,
  propertyType: string,
  acres: number | null
): string {
  if (subdivision) {
    const sub = subdivision.toUpperCase()
    if (sub.includes('RANCH') || sub.includes('RESORT') || sub.includes('RIDGE')) return 'recreational_hoa'
    if (sub.includes('ESTATES') || sub.includes('VILLAGE') || sub.includes('HEIGHTS')) return 'residential_subdivision'
    if (sub.includes('PARK') || sub.includes('INDUSTRIAL')) return 'commercial_park'
  }
  if (propertyType === 'strip_lot' || propertyType === 'street_parcel') return 'urban_remnant'
  if (propertyType === 'environmental') return 'environmental_land'
  if (['duchesne', 'rich', 'juab', 'beaver', 'wayne', 'garfield'].includes(county)) return 'rural_remnant'
  if (acres != null && acres < 0.1 && propertyType !== 'condo') return 'urban_remnant'
  if (propertyType === 'vacant_land' && ['salt_lake', 'utah', 'davis'].includes(county)) return 'infill_lot'
  return 'unknown'
}

function likelyUtilities(county: string, pattern: string, acres: number | null): 'on_grid' | 'off_grid' | 'unknown' {
  if (pattern === 'urban_remnant' || pattern === 'infill_lot' || pattern === 'residential_subdivision') return 'on_grid'
  if (['duchesne', 'rich', 'juab', 'beaver'].includes(county)) return 'off_grid'
  if (acres != null && acres > 20) return 'off_grid'
  return 'unknown'
}

// ── Access notes ───────────────────────────────────────────────────────────────

const COUNTY_ACCESS_CONTEXT: Record<string, string> = {
  rich: 'Rich County parcels are often remote with seasonal or unpaved access — verify year-round road access before bidding.',
  duchesne: 'Duchesne County contains large rural parcels in the Uinta Basin — confirm road access and utilities.',
  juab: 'Juab County parcels may be remote desert land — confirm legal access and road condition.',
  beaver: 'Beaver County parcels may be remote — confirm access, water, and power availability.',
  sevier: 'Sevier County: mostly agricultural/rural — verify water rights and access easements.',
  iron: 'Iron County: mixed rural/suburban — Cedar City area properties likely have public access; outlying parcels may not.',
}

// ── Title snapshot (empty for PLANNED counties) ───────────────────────────────

function emptyTitleSnapshot(source: string | null = null): TitleSnapshot {
  return {
    has_deed_records: null,
    document_count_5yr: null,
    last_transfer_date: null,
    last_transfer_type: null,
    mortgage_docs_found: null,
    lien_docs_found: null,
    release_docs_found: null,
    confidence: 'NONE',
    notes: source ? null : 'Title research not yet run for this county.',
    red_flags: [],
    source: source,
  }
}

// ── Main enrichment ────────────────────────────────────────────────────────────

export async function enrichListing(
  listing: AuctionListing,
  runId: string,
  rateLimitMs = 200
): Promise<FullPropertyRecord> {
  const flags: MissingDataFlag[] = []
  if (listing.parcel_ids.length > 1) flags.push('MULTI_PARCEL')

  const primaryParcel = listing.parcel_ids[0]

  // AGRC lookup — use primary parcel ID
  let agrcData: AgrcParcelData | null = null
  if (listing.county) {
    agrcData = await lookupAgrc(listing.county, primaryParcel)
    if (rateLimitMs > 0) await new Promise(r => setTimeout(r, rateLimitMs))
  }
  const agrcHit = agrcData !== null

  if (!agrcHit) flags.push('NO_AGRC_MATCH')

  // County-specific enricher — runs when AGRC is missing owner name, value, or legal data.
  // AGRC never provides owner names (NAME field absent in all Utah LIR layers), so this
  // always runs for counties that have a registered enricher.
  let assessorData: AssessorEnrichment | null = null
  const needsEnrichment = !agrcData?.owner_name || !agrcHit || !agrcData?.market_value
  if (needsEnrichment) {
    assessorData = await runCountyEnricher(listing, agrcData?.raw_attributes ?? null)
    if (rateLimitMs > 0) await new Promise(r => setTimeout(r, rateLimitMs))
  }

  // Resolve physical fields: AGRC preferred, county enricher fallback, then CSV hints
  const acres = agrcData?.acres ?? assessorData?.acres ?? listing.acres_hint
  const marketValue = agrcData?.market_value ?? assessorData?.market_value ?? null
  const landValue = agrcData?.land_value ?? null
  const buildingSqft = agrcData?.building_sqft ?? null
  const yearBuilt = agrcData?.year_built ?? null
  const agrcClass = agrcData?.property_class ?? assessorData?.property_class ?? null

  if (!marketValue) flags.push('NO_MARKET_VALUE')
  if (!agrcData?.latitude) flags.push('NO_COORDINATES')

  // Property type + class
  const propertyType = inferPropertyType(listing.title, agrcClass)
  const propertyClass = inferPropertyClass(propertyType)

  if (propertyType === 'environmental') flags.push('ENVIRONMENTAL_PARCEL')
  if (propertyType === 'street_parcel') flags.push('STREET_PARCEL')

  const subdivision = extractSubdivision(agrcData?.legal_description ?? assessorData?.legal_description ?? null)
  const pattern = subdivisionPattern(subdivision, listing.county, propertyType, acres)
  const utilities = likelyUtilities(listing.county, pattern, acres)
  const hoaFlag = pattern === 'recreational_hoa' ? true : null
  const codeViolation = listing.title.includes('Non-Compliant') ? true :
                        listing.title.includes('Compliant') ? false : null

  // Value confidence
  const valueConfidence = agrcHit && marketValue
    ? 'HIGH'
    : listing.acres_hint != null
      ? 'LOW'
      : 'LOW'

  // Bid metrics
  const premium = BUYERS_PREMIUM[listing.county] ?? 5
  const allInCost = listing.opening_bid != null
    ? Math.round(listing.opening_bid * (1 + premium / 100))
    : null
  const bidToValuePct = marketValue && listing.opening_bid
    ? Math.round((listing.opening_bid / marketValue) * 100 * 10) / 10
    : null
  const equityMultiple = marketValue && listing.opening_bid && listing.opening_bid > 0
    ? Math.round((marketValue / listing.opening_bid) * 10) / 10
    : null

  // Title snapshot — populated by live scrapers for LIVE counties,
  // empty for PLANNED. The build-properties script can optionally run
  // live title scrapers for LIVE counties; for now, always start empty.
  const titleSnapshot = emptyTitleSnapshot(null)
  flags.push('NO_TITLE_DATA')

  const readiness = getReadiness(listing.county)
  const accessNotes = COUNTY_ACCESS_CONTEXT[listing.county] ?? null

  const buildabilityNotes = propertyType === 'environmental'
    ? 'Environmental classification — likely unbuildable or restricted. Verify before bidding.'
    : propertyType === 'street_parcel'
      ? 'Street parcel — likely a right-of-way or road remnant. Very limited use potential.'
      : propertyType === 'strip_lot'
        ? 'Strip lot — narrow parcel; verify minimum lot size and setbacks with county planning.'
        : null

  return {
    listing_id: listing.listing_id,
    county: listing.county,
    county_display: listing.county_display,
    county_readiness: readiness,
    parcel_id: primaryParcel,
    parcel_ids: listing.parcel_ids,
    is_multi_parcel: listing.parcel_ids.length > 1,

    owner_name: agrcData?.owner_name ?? assessorData?.owner_name ?? null,
    situs_address: agrcData?.situs_address ?? assessorData?.situs_address ?? listing.address_hint ?? null,
    legal_description: agrcData?.legal_description ?? assessorData?.legal_description ?? null,
    subdivision,
    acres,
    building_sqft: buildingSqft,
    year_built: yearBuilt,
    property_class: propertyClass,
    property_type: propertyType,
    zoning: null,
    latitude: agrcData?.latitude ?? null,
    longitude: agrcData?.longitude ?? null,

    opening_bid: listing.opening_bid,
    buyers_premium_pct: premium,
    all_in_cost: allInCost,
    sale_type: 'deed',
    auction_url: listing.url,
    auction_platform: 'public_surplus',
    auction_end: listing.end_date_parsed?.toISOString() ?? null,

    assessed_value: null,
    market_value: marketValue,
    land_value: landValue,
    value_confidence: valueConfidence,
    bid_to_value_pct: bidToValuePct,
    equity_multiple: equityMultiple,

    title: titleSnapshot,

    access_notes: accessNotes,
    subdivision_pattern: pattern,
    likely_utilities: utilities,
    hoa_flag: hoaFlag,
    code_violation_flag: codeViolation,
    buildability_notes: buildabilityNotes,

    missing_data_flags: flags,
    run_id: runId,
    enriched_at: new Date().toISOString(),
    agrc_hit: agrcHit,

    agrc_data: agrcData,
    assessor_enrichment: assessorData,
    listing_data: listing,
  }
}

// ── Batch enrichment ───────────────────────────────────────────────────────────

export async function enrichAll(
  csvPath: string,
  options: {
    runId?: string
    rateLimitMs?: number
    onProgress?: (done: number, total: number, record: FullPropertyRecord) => void
  } = {}
): Promise<FullPropertyRecord[]> {
  const listings = parseCsvToListings(csvPath)
  const runId = options.runId ?? crypto.randomUUID()
  const records: FullPropertyRecord[] = []

  for (let i = 0; i < listings.length; i++) {
    const record = await enrichListing(listings[i], runId, options.rateLimitMs ?? 150)
    records.push(record)
    options.onProgress?.(i + 1, listings.length, record)
  }

  return records
}
