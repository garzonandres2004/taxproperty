export type MemoRecommendation = 'GO' | 'CAUTION' | 'RESEARCH' | 'AVOID' | 'SKIP'

// County readiness levels for confidence degradation
export type CountyReadiness = 'LIVE' | 'NEAR_LIVE' | 'PARTIAL' | 'PLANNED'

export interface MemoScores {
  equity: number           // 0–4: value above cost (4 = outstanding equity)
  titleRisk: number        // 0–4: title cleanliness (4 = clean)
  recency: number          // 0–3: ownership stability / no recent distress
  propertyQuality: number  // 0–4: physical and use potential
  dataCompleteness: number // 0–3: confidence in available data
  total: number            // 0–18
}

export interface MemoTitleSummary {
  hasDeedRecords: boolean | null
  documentCount5yr: number | null
  lastTransferType: string | null
  notes: string | null
  riskLevel: 'clean' | 'caution' | 'danger' | 'avoid' | 'unknown'
}

export interface MaxBidAnalysis {
  suggestedMaxBid: number | null
  formula: string
  breakdown: {
    arv: number | null
    quickSalePercent: number
    municipalLiens: number | null
    quietTitleCost: number
    repairEstimate: number | null
    desiredProfit: number | null
    buyerPremium: number
  }
  viability: 'strong' | 'good' | 'marginal' | 'poor' | 'unknown'
  openingBidRatio?: number
  reasoning: string
}

export interface MemoKeyFacts {
  owner: string | null
  subdivision: string | null
  acres: number | null
  class: string | null
  openingBid: number | null
  buyersPremiumPercent: number | null
  estMarketValue: number | null
  locationSummary: string | null
  titleSummary: MemoTitleSummary
}

// County readiness configuration with confidence multipliers
export interface CountyReadinessConfig {
  level: CountyReadiness
  enrichmentAvailable: boolean
  gisAvailable: boolean
  auctionInfoVerified: boolean
  titleResearchAutomated: boolean
  confidenceMultiplier: number // 0.0 - 1.0
  caveatMessage?: string
}

// Readiness caveat attached to memos for non-LIVE counties
export interface ReadinessCaveat {
  level: CountyReadiness
  message: string
  impact: 'none' | 'minor' | 'moderate' | 'severe'
  dataGaps: string[]
  confidenceAdjustment: number // percentage points to subtract
}

export interface InvestorMemo {
  county: string
  parcelId: string
  headline: string
  recommendation: MemoRecommendation
  maxBidInclusivePremium?: number        // all-in ceiling incl. premium (legacy)
  maxBid: MaxBidAnalysis                  // enhanced max bid analysis
  scores: MemoScores
  keyFacts: MemoKeyFacts
  good: string[]
  bad: string[]
  nextActions: string[]
  // County readiness
  countyReadiness: CountyReadiness
  readinessCaveat: ReadinessCaveat | null
  confidenceScore: number // 0-100, adjusted by readiness
  _meta: {
    generatedAt: string
    propertyId: string
    investability_v2: number | null
    confidence_pct: number | null
    dataSources: string[]
    analystNotes?: string
  }
}

// Default readiness configs by level
export const DEFAULT_READINESS_CONFIG: Record<CountyReadiness, CountyReadinessConfig> = {
  LIVE: {
    level: 'LIVE',
    enrichmentAvailable: true,
    gisAvailable: true,
    auctionInfoVerified: true,
    titleResearchAutomated: true,
    confidenceMultiplier: 1.0,
    caveatMessage: 'Full data pipeline operational'
  },
  NEAR_LIVE: {
    level: 'NEAR_LIVE',
    enrichmentAvailable: true,
    gisAvailable: true,
    auctionInfoVerified: false,
    titleResearchAutomated: false,
    confidenceMultiplier: 0.85,
    caveatMessage: 'High confidence with minor verification needed'
  },
  PARTIAL: {
    level: 'PARTIAL',
    enrichmentAvailable: true,
    gisAvailable: false,
    auctionInfoVerified: false,
    titleResearchAutomated: false,
    confidenceMultiplier: 0.6,
    caveatMessage: 'Reduced confidence - verify key assumptions manually'
  },
  PLANNED: {
    level: 'PLANNED',
    enrichmentAvailable: false,
    gisAvailable: false,
    auctionInfoVerified: false,
    titleResearchAutomated: false,
    confidenceMultiplier: 0.3,
    caveatMessage: 'County not yet onboarded - placeholder analysis only'
  }
}
