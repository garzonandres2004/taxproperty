export interface ReportProperty {
  parcel_number: string
  county: string
  property_address: string | null
  owner_name: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  assessed_value: number | null
  lot_size_sqft: number | null
  building_sqft: number | null
  year_built: number | null
  property_type: string
  latitude: number | null
  longitude: number | null
  investability_score: number | null
  recommendation_bucket: string | null
  opportunity_score_v2: number | null
  risk_score_v2: number | null
  title_score_v2: number | null
  confidence_score_v2: number | null
  access_risk: string
  title_risk: string
  legal_risk: string
  marketability_risk: string
  is_otc: boolean
  absentee_owner: boolean | null
  micro_parcel: boolean | null
  zoning: string | null
  county_source_url: string | null
  legal_description: string | null
  notes: string | null
  sale_date: string | null
  // Derived
  equity_multiple: number | null
  risk_flags: string[]
  key_facts: string[]
  our_take: string
}

export interface ReportParams {
  county: string
  topN: number
  minScore: number
  excludeFlags: string[]
}

export interface ReportData {
  params: ReportParams
  generated_at: string
  total_screened: number
  total_identified: number
  properties: ReportProperty[]
  county_display: string
  sale_date_display: string
  auction_platform: string
}

export type BucketLabel = 'TOP TARGET' | 'BID CANDIDATE' | 'WATCHLIST' | 'RESEARCH' | 'AVOID'
