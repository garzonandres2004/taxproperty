// Scoring V2 — TaxProperty
// investability = opp_v2*0.50 + title_v2*0.25 + (100-risk_v2)*0.15 + conf_v2*0.10

export const SCORE_VERSION_V2 = '2.0.0'

export interface PropertyInputV2 {
  // Financials
  total_amount_due: number | null
  estimated_market_value: number | null
  // Property details
  property_type: string        // "single_family" | "condo" | "multifamily" | "vacant_land" | "commercial" | "mobile_home" | "unknown"
  occupancy_status: string     // "owner_occupied" | "tenant" | "vacant" | "unknown"
  zoning: string | null
  year_built: number | null
  building_sqft: number | null
  lot_size_sqft: number | null
  assessed_value: number | null
  // Risk fields
  access_risk: string          // "low" | "medium" | "high" | "unknown"
  title_risk: string
  legal_risk: string
  marketability_risk: string
  // TitleAnalysis structured fields (null when no analysis exists)
  title_yearsSameOwner: number | null
  title_mortgageStatus: string | null  // "paid_off" | "active" | "unclear"
  title_complexity: string | null      // "simple" | "moderate" | "complex"
  title_activeLiens: string | null     // JSON string: array of lien objects
  title_redFlags: string | null        // JSON string: array of RedFlag objects
  title_greenFlags: string | null      // JSON string: array of GreenFlag objects
  // Metadata
  micro_parcel: boolean | null
  status: string
}

export interface ScoresV2 {
  opportunity_score_v2: number
  risk_score_v2: number
  title_score_v2: number
  confidence_score_v2: number
  investability_score: number
  recommendation_bucket: 'AVOID' | 'RESEARCH' | 'WATCHLIST' | 'BID_CANDIDATE' | 'TOP_TARGET'
  score_version: string
}

// ─── Component: Opportunity V2 (0-100) ───────────────────────────────────────
// Three sub-components: equity_spread (40), property_quality (30), exit_ease (30)

function equitySpreadScore(
  amountDue: number | null,
  marketValue: number | null
): number {
  if (marketValue == null || marketValue <= 0) return 0
  if (amountDue == null) return 0
  if (amountDue === 0) return 35   // $0 needs verification — good but uncertain
  const equity = (marketValue - amountDue) / marketValue
  if (equity >= 0.85) return 40
  if (equity >= 0.70) return 32
  if (equity >= 0.50) return 22
  if (equity >= 0.30) return 12
  if (equity >= 0.10) return 5
  return 0
}

function propertyQualityScore(
  propertyType: string,
  yearBuilt: number | null,
  buildingSqft: number | null
): number {
  // Year built: 0-10
  let yearPts = 0
  if (yearBuilt != null) {
    if (yearBuilt >= 2000) yearPts = 10
    else if (yearBuilt >= 1980) yearPts = 8
    else if (yearBuilt >= 1960) yearPts = 6
    else yearPts = 3
  }

  // Building sqft: 0-10
  let sqftPts = 0
  if (buildingSqft != null) {
    if (buildingSqft >= 2000) sqftPts = 10
    else if (buildingSqft >= 1200) sqftPts = 7
    else if (buildingSqft >= 800) sqftPts = 5
    else if (buildingSqft >= 100) sqftPts = 3
  }

  // Property type: 0-10
  const typePts: Record<string, number> = {
    single_family: 10,
    multifamily: 8,
    condo: 7,
    vacant_land: 5,
    commercial: 5,
    mobile_home: 3,
    unknown: 0
  }
  const typePtsVal = typePts[propertyType] ?? 0

  return yearPts + sqftPts + typePtsVal
}

function exitEaseScore(
  occupancyStatus: string,
  propertyType: string,
  zoning: string | null
): number {
  // Occupancy: 0-15
  const occupancyPts: Record<string, number> = {
    vacant: 15,
    unknown: 10,
    owner_occupied: 5,
    tenant: 3
  }
  const occupancyVal = occupancyPts[occupancyStatus] ?? 10

  // Zoning clarity: 0-10
  const zoningPts = zoning ? 10 : 0

  // Type marketability: 0-5
  const marketabilityPts: Record<string, number> = {
    single_family: 5,
    condo: 5,
    multifamily: 4,
    vacant_land: 3,
    commercial: 2,
    mobile_home: 1,
    unknown: 0
  }
  const marketVal = marketabilityPts[propertyType] ?? 0

  return occupancyVal + zoningPts + marketVal
}

export function computeOpportunityV2(p: PropertyInputV2): number {
  const eq = equitySpreadScore(p.total_amount_due, p.estimated_market_value)
  const qual = propertyQualityScore(p.property_type, p.year_built, p.building_sqft)
  const exit = exitEaseScore(p.occupancy_status, p.property_type, p.zoning)
  return Math.min(100, Math.max(0, eq + qual + exit))
}

// ─── Component: Risk V2 (0-100, lower is better) ─────────────────────────────
// legal(30) + title(25) + access(25) + marketability(20) = 100 max

function riskFieldPts(level: string, maxPts: number): number {
  const frac: Record<string, number> = {
    low: 0.05,
    medium: 0.40,
    high: 0.90,
    unknown: 0.22   // slightly better than medium — lack of data, not confirmed risk
  }
  return (frac[level] ?? 0.22) * maxPts
}

export function computeRiskV2(p: PropertyInputV2): number {
  const legal = riskFieldPts(p.legal_risk, 30)
  const title = riskFieldPts(p.title_risk, 25)
  const access = riskFieldPts(p.access_risk, 25)
  const market = riskFieldPts(p.marketability_risk, 20)
  return Math.min(100, Math.max(0, Math.round((legal + title + access + market) * 10) / 10))
}

// ─── Component: Title Score V2 (0-100) ───────────────────────────────────────
// Uses structured TitleAnalysis fields, not the AI summary score.
// Falls back to 50 (neutral) when no TitleAnalysis exists.

function countJsonItems(json: string | null): number {
  if (!json) return 0
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

export function computeTitleScoreV2(p: PropertyInputV2): number {
  if (
    p.title_yearsSameOwner == null &&
    p.title_mortgageStatus == null &&
    p.title_complexity == null
  ) {
    return 50
  }

  let score = 50

  // Ownership stability (0 / ±15)
  if (p.title_yearsSameOwner != null) {
    if (p.title_yearsSameOwner >= 10) score += 15
    else if (p.title_yearsSameOwner >= 5) score += 10
    else if (p.title_yearsSameOwner >= 2) score += 5
    else score -= 5
  }

  // Mortgage status (±20)
  if (p.title_mortgageStatus === 'paid_off') score += 20
  else if (p.title_mortgageStatus === 'unclear') score -= 10
  else if (p.title_mortgageStatus === 'active') score -= 20

  // Title complexity (0 / ±15)
  if (p.title_complexity === 'simple') score += 15
  else if (p.title_complexity === 'complex') score -= 15

  // Net lien risk: activeLiens vs greenFlag releases
  const activeLienCount = countJsonItems(p.title_activeLiens)
  const releaseCount = countJsonItems(p.title_greenFlags)
  const redFlagCount = countJsonItems(p.title_redFlags)

  // greenFlags include Reconveyance/Release docs that offset redFlags/activeLiens
  const netLienRisk = Math.max(0, activeLienCount + redFlagCount - releaseCount)

  if (netLienRisk === 0) score += 8
  else if (netLienRisk <= 2) score -= 5
  else score -= 20

  return Math.min(100, Math.max(0, score))
}

// ─── Component: Confidence V2 (0-100) ────────────────────────────────────────
// Weighted presence of key data fields (mirrors calculateDataConfidence from V1)

export function computeConfidenceV2(p: PropertyInputV2): number {
  const fields: { value: unknown; weight: number; check?: (v: unknown) => boolean }[] = [
    { value: p.total_amount_due, weight: 15 },
    { value: p.estimated_market_value, weight: 15 },
    { value: p.property_type, weight: 10, check: v => v !== 'unknown' },
    { value: p.occupancy_status, weight: 10, check: v => v !== 'unknown' },
    { value: p.zoning, weight: 10 },
    { value: p.lot_size_sqft, weight: 10 },
    { value: p.building_sqft, weight: 10 },
    { value: p.year_built, weight: 10 },
    { value: p.assessed_value, weight: 10 }
  ]

  const total = fields.reduce((sum, f) => {
    if (f.value == null) return sum
    if (f.check && !f.check(f.value)) return sum
    return sum + f.weight
  }, 0)

  return Math.min(100, total)
}

// ─── Component: Investability (0-100) ────────────────────────────────────────

export function computeInvestabilityV2(
  opp: number,
  risk: number,
  title: number,
  confidence: number
): number {
  const raw = opp * 0.50 + title * 0.25 + (100 - risk) * 0.15 + confidence * 0.10
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10))
}

// ─── Recommendation Bucket ────────────────────────────────────────────────────

export function getRecommendationBucket(
  investability: number,
  p: Pick<PropertyInputV2, 'micro_parcel' | 'status' | 'building_sqft' | 'property_type'>
): ScoresV2['recommendation_bucket'] {
  const hardAvoid =
    (p.status === 'redeemed' || p.status === 'removed') ||
    // micro-parcel AVOID only for non-condo parcels with no building (condos share structure, not lot)
    (p.micro_parcel === true && (p.building_sqft ?? 0) < 100 && p.property_type !== 'vacant_land' && p.property_type !== 'condo')

  if (hardAvoid || investability < 28) return 'AVOID'
  if (investability < 45) return 'RESEARCH'
  if (investability < 60) return 'WATCHLIST'
  if (investability < 75) return 'BID_CANDIDATE'
  return 'TOP_TARGET'
}

// ─── Main pure scoring function ───────────────────────────────────────────────

export function scorePropertyV2Input(p: PropertyInputV2): ScoresV2 {
  const opp = computeOpportunityV2(p)
  const risk = computeRiskV2(p)
  const title = computeTitleScoreV2(p)
  const confidence = computeConfidenceV2(p)
  const investability = computeInvestabilityV2(opp, risk, title, confidence)
  const bucket = getRecommendationBucket(investability, p)

  return {
    opportunity_score_v2: opp,
    risk_score_v2: risk,
    title_score_v2: title,
    confidence_score_v2: confidence,
    investability_score: investability,
    recommendation_bucket: bucket,
    score_version: SCORE_VERSION_V2
  }
}

// ─── DB-aware function ────────────────────────────────────────────────────────
// Reads one property + TitleAnalysis from DB, scores it, writes V2 fields back.

import { PrismaClient } from '@prisma/client'

export async function scoreAndSaveV2(
  prisma: PrismaClient,
  propertyId: string
): Promise<ScoresV2 | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      total_amount_due: true,
      estimated_market_value: true,
      assessed_value: true,
      property_type: true,
      occupancy_status: true,
      zoning: true,
      year_built: true,
      building_sqft: true,
      lot_size_sqft: true,
      access_risk: true,
      title_risk: true,
      legal_risk: true,
      marketability_risk: true,
      micro_parcel: true,
      status: true,
      titleAnalysis: {
        select: {
          yearsSameOwner: true,
          mortgageStatus: true,
          titleComplexity: true,
          activeLiens: true,
          redFlags: true,
          greenFlags: true
        }
      }
    }
  })

  if (!property) return null

  const ta = property.titleAnalysis

  const input: PropertyInputV2 = {
    total_amount_due: property.total_amount_due,
    estimated_market_value: property.estimated_market_value,
    assessed_value: property.assessed_value,
    property_type: property.property_type ?? 'unknown',
    occupancy_status: property.occupancy_status ?? 'unknown',
    zoning: property.zoning,
    year_built: property.year_built,
    building_sqft: property.building_sqft,
    lot_size_sqft: property.lot_size_sqft,
    access_risk: property.access_risk ?? 'unknown',
    title_risk: property.title_risk ?? 'unknown',
    legal_risk: property.legal_risk ?? 'unknown',
    marketability_risk: property.marketability_risk ?? 'unknown',
    title_yearsSameOwner: ta?.yearsSameOwner ?? null,
    title_mortgageStatus: ta?.mortgageStatus ?? null,
    title_complexity: ta?.titleComplexity ?? null,
    title_activeLiens: ta?.activeLiens ?? null,
    title_redFlags: ta?.redFlags ?? null,
    title_greenFlags: ta?.greenFlags ?? null,
    micro_parcel: property.micro_parcel,
    status: property.status
  }

  const scores = scorePropertyV2Input(input)

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      opportunity_score_v2: scores.opportunity_score_v2,
      risk_score_v2: scores.risk_score_v2,
      title_score_v2: scores.title_score_v2,
      confidence_score_v2: scores.confidence_score_v2,
      investability_score: scores.investability_score,
      recommendation_bucket: scores.recommendation_bucket,
      score_version: scores.score_version
    }
  })

  return scores
}
