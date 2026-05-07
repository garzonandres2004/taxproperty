// Auction pipeline types
// AuctionListing  — raw normalized row from utah_auctions.csv
// FullPropertyRecord — enriched deal file ready for memo engine + UI

export interface AuctionListing {
  listing_id: string
  county: string              // DB slug: "box_elder", "salt_lake", etc.
  county_display: string      // human: "Box Elder", "Salt Lake"
  parcel_ids: string[]        // split on " & "
  parcel_raw: string          // original parcel string from CSV
  title: string               // auction title text
  opening_bid: number | null
  start_date: string | null   // "May 21, 2026 10:00 AM MDT"
  end_date: string | null
  end_date_parsed: Date | null
  status: string              // "Has Not Started" | "Active" | "Closed"
  url: string
  description: string         // first 1000 chars of body text
  address_hint: string | null // scraped address fragment (unreliable — verify via AGRC)
  acres_hint: number | null   // from description text (unreliable — prefer AGRC)
  source_file: string
  scraped_at: string
}

export interface AgrcParcelData {
  parcel_id_returned: string | null
  owner_name: string | null
  situs_address: string | null
  city: string | null
  legal_description: string | null
  acres: number | null
  market_value: number | null
  land_value: number | null
  building_sqft: number | null
  year_built: number | null
  property_class: string | null
  latitude: number | null
  longitude: number | null
  raw_attributes: Record<string, unknown>
}

export type MissingDataFlag =
  | 'NO_AGRC_MATCH'
  | 'NO_TITLE_DATA'
  | 'NO_MARKET_VALUE'
  | 'NO_ZONING_DATA'
  | 'NO_COORDINATES'
  | 'MULTI_PARCEL'
  | 'PARCEL_FORMAT_UNKNOWN'
  | 'ENVIRONMENTAL_PARCEL'
  | 'STREET_PARCEL'

export type ValueConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type TitleConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
export type CountyReadiness = 'LIVE' | 'NEAR_LIVE' | 'PARTIAL' | 'PLANNED'

export interface TitleSnapshot {
  has_deed_records: boolean | null
  document_count_5yr: number | null
  last_transfer_date: string | null
  last_transfer_type: string | null
  mortgage_docs_found: number | null
  lien_docs_found: number | null
  release_docs_found: number | null
  confidence: TitleConfidence
  notes: string | null
  red_flags: string[]
  source: string | null    // e.g. "eagleweb", "recorder_index", "none"
}

export interface AssessorEnrichment {
  source: string | null           // "sanpete_publicsurplus" | "publicsurplus_detail" | etc.
  fetched_at: string | null
  owner_name: string | null
  mailing_address: string | null  // owner's mailing address
  situs_address: string | null    // property street address (from PS "Location:" label)
  account_number: string | null
  assessed_value: number | null
  market_value: number | null
  tax_year: number | null
  taxes_owed: number | null       // annual tax bill or delinquent total from county
  property_class: string | null
  legal_description: string | null
  acres: number | null
  subdivision: string | null
  source_url: string | null
  notes: string | null
}

export interface FullPropertyRecord {
  // ── Identity ──────────────────────────────────────────────────────
  listing_id: string
  county: string
  county_display: string
  county_readiness: CountyReadiness
  parcel_id: string           // primary (first if multi-parcel)
  parcel_ids: string[]
  is_multi_parcel: boolean

  // ── Property info ──────────────────────────────────────────────────
  owner_name: string | null
  situs_address: string | null
  legal_description: string | null
  subdivision: string | null
  acres: number | null
  building_sqft: number | null
  year_built: number | null
  property_class: string | null   // "residential" | "vacant" | "commercial" | "recreational" | "unknown"
  property_type: string | null    // "single_family" | "condo" | "vacant_land" | "commercial" | "strip_lot" | etc.
  zoning: string | null
  latitude: number | null
  longitude: number | null

  // ── Auction economics ──────────────────────────────────────────────
  opening_bid: number | null
  buyers_premium_pct: number       // 5 for most PublicSurplus, 0 = unknown
  all_in_cost: number | null       // opening_bid * (1 + buyers_premium_pct/100)
  sale_type: 'deed' | 'lien' | 'redeemable'
  auction_url: string
  auction_platform: 'public_surplus'
  auction_end: string | null       // ISO date string

  // ── Market / value ─────────────────────────────────────────────────
  assessed_value: number | null
  market_value: number | null
  land_value: number | null
  value_confidence: ValueConfidence
  bid_to_value_pct: number | null  // (opening_bid / market_value) * 100
  equity_multiple: number | null   // market_value / opening_bid

  // ── Title snapshot ─────────────────────────────────────────────────
  title: TitleSnapshot

  // ── Land/use risk ──────────────────────────────────────────────────
  access_notes: string | null
  subdivision_pattern: string | null  // "recreational_hoa" | "rural_remnant" | "infill_lot" | "urban_vacant" | "unknown"
  likely_utilities: 'on_grid' | 'off_grid' | 'unknown'
  hoa_flag: boolean | null
  code_violation_flag: boolean | null  // Box Elder "Non-Compliant" = code violation
  buildability_notes: string | null

  // ── Data quality / meta ────────────────────────────────────────────
  missing_data_flags: MissingDataFlag[]
  run_id: string
  enriched_at: string
  agrc_hit: boolean

  // ── Raw sources ────────────────────────────────────────────────────
  agrc_data: AgrcParcelData | null
  assessor_enrichment: AssessorEnrichment | null
  listing_data: AuctionListing
}
