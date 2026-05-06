// Bridge: FullPropertyRecord → PropertyForMemo (synthetic)
// Creates a PropertyForMemo-compatible object from a FullPropertyRecord without
// touching the database — allowing memo generation from CSV/enriched data alone.

import type { FullPropertyRecord } from './auction-types'
import type { PropertyForMemo } from '@/lib/memo/generate'

// Build a synthetic PropertyForMemo that satisfies the generateInvestorMemo interface.
// All Prisma-required fields that aren't meaningful for auction listings get safe defaults.
export function fullRecordToPropertyForMemo(r: FullPropertyRecord): PropertyForMemo {
  const ts = r.title

  const titleSignals = (ts.confidence !== 'NONE' || ts.has_deed_records !== null)
    ? {
        id: `synth-ts-${r.listing_id}`,
        property_id: r.listing_id,
        has_deed_records: ts.has_deed_records,
        document_count_5yr: ts.document_count_5yr,
        last_transfer_date: ts.last_transfer_date ? new Date(ts.last_transfer_date) : null,
        last_transfer_type: ts.last_transfer_type,
        mortgage_docs_found: ts.mortgage_docs_found,
        lien_docs_found: ts.lien_docs_found,
        release_docs_found: ts.release_docs_found,
        red_flags_count: ts.red_flags.length,
        yellow_flags_count: 0,
        data_source: ts.source ?? 'unknown',
        source_url: null,
        scraped_at: new Date(),
      }
    : null

  // Synthesise a CountyConfig record from known values
  const countyConfig = {
    id: `synth-cc-${r.county}`,
    county_name: r.county,
    state: 'Utah',
    display_name: r.county_display,
    auction_date: r.auction_end ?? null,
    auction_platform: 'public_surplus',
    auction_url: r.auction_url,
    auction_format: 'bid_up',
    sale_type: r.sale_type,
    parcel_api_url: null,
    parcel_api_layer: null,
    zoning_api_url: null,
    land_records_url: null,
    land_records_requires_auth: false,
    parcel_id_format: null,
    parcel_id_separator: '-',
    parcel_id_for_api: null,
    csv_source_url: null,
    csv_format_notes: null,
    is_active: true,
    notes: null,
    total_properties: 0,
    completeness_score: null,
    physical_completeness: null,
    valuation_completeness: null,
    location_completeness: null,
    title_completeness: null,
    automation_potential: 'unknown',
    manual_playbook_required: false,
    // status maps readiness → pipeline status string
    status: r.county_readiness === 'LIVE' ? 'production'
          : r.county_readiness === 'NEAR_LIVE' ? 'beta'
          : r.county_readiness === 'PARTIAL' ? 'alpha'
          : 'pending',
    readiness: r.county_readiness,
    readiness_reason: null,
    last_completeness_check: null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  // Build data gaps from missing_data_flags
  const dataGaps = r.missing_data_flags.map((flag, i) => ({
    id: `synth-gap-${r.listing_id}-${i}`,
    property_id: r.listing_id,
    phase: flag.includes('TITLE') ? 'title' : flag.includes('MARKET') ? 'valuation' : 'physical',
    field: flag,
    reason: 'COUNTY_NOT_CONFIGURED',
    level: 'C',
    source_hint: null,
    resolved: false,
    resolved_at: null,
    resolved_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  }))

  const isMicroParcel = r.acres != null && r.acres < 0.05 &&
    r.property_type !== 'condo' && r.property_type !== 'single_family'

  return {
    // Prisma Property required fields
    id: `auction-${r.listing_id}`,
    user_id: null,
    county: r.county,
    sale_year: r.auction_end ? new Date(r.auction_end).getFullYear() : new Date().getFullYear(),
    sale_date: r.auction_end ?? null,
    parcel_number: r.parcel_id,
    owner_name: r.owner_name,
    owner_mailing_address: null,
    property_address: r.situs_address,
    legal_description: r.legal_description,

    // Financials
    total_amount_due: r.opening_bid,
    assessed_value: r.assessed_value,
    estimated_market_value: r.market_value,
    estimated_repair_cost: null,
    estimated_cleanup_cost: null,
    estimated_closing_cost: null,
    repair_estimate: null,
    desired_profit: null,

    // Property details
    property_type: r.property_type ?? 'unknown',
    occupancy_status: 'unknown',
    zoning: r.zoning,
    lot_size_sqft: r.acres != null ? Math.round(r.acres * 43560) : null,
    building_sqft: r.building_sqft,
    year_built: r.year_built,

    // Risk flags
    access_risk: r.access_notes ? 'medium' : 'unknown',
    title_risk: ts.confidence === 'NONE' ? 'unknown' : 'low',
    legal_risk: 'unknown',
    marketability_risk: 'unknown',

    // Scoring
    data_confidence: null,
    notes: r.buildability_notes,
    opportunity_score: null,
    risk_score: null,
    final_score: null,
    recommendation: null,
    opportunity_score_v2: null,
    risk_score_v2: null,
    title_score_v2: null,
    confidence_score_v2: null,
    investability_score: null,
    recommendation_bucket: null,
    score_version: null,

    // Enhanced scoring
    max_bid: null,
    max_bid_calculated: null,
    absentee_owner: null,
    micro_parcel: isMicroParcel,
    assemblage_opportunity: null,

    // Flags
    is_otc: false,
    municipal_lien_risk: r.code_violation_flag ? 'medium' : 'unknown',
    code_violations_found: r.code_violation_flag ?? null,
    code_violations_balance_due: null,
    utility_lien_notes: null,
    municipal_lien_checked_at: null,
    status: 'new',
    status_reason: null,
    status_last_verified_at: null,
    county_source_url: r.auction_url,
    source_last_checked_at: null,
    presale_volatility_risk: 0,
    is_active_sale_candidate: true,
    photo_url: null,
    photo_date: null,
    aerial_url: null,
    latitude: r.latitude,
    longitude: r.longitude,
    is_seed: false,
    auction_platform: 'public_surplus',
    deposit_required: null,
    redemption_deadline: null,

    created_at: new Date(),
    updated_at: new Date(),

    // Relations
    titleSignals: titleSignals as any,
    zoningProfile: null,
    data_gaps: dataGaps as any[],
    titleAnalysis: null,
    red_flags: [],
    countyConfig: countyConfig as any,
  }
}
