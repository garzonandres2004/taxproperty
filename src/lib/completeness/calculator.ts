// County Completeness Calculator
// Calculates completeness scores for each county

import { PrismaClient } from '@prisma/client'

export interface CountyCompletenessMetrics {
  county: string
  totalProperties: number
  physicalCompleteness: number
  valuationCompleteness: number
  locationCompleteness: number
  titleCompleteness: number
  completenessScore: number
}

export interface CompletenessReport {
  counties: CountyCompletenessMetrics[]
  globalCompleteness: number
  totalProperties: number
  lastUpdated: Date
}

/**
 * Calculate completeness metrics for a single county
 */
export async function calculateCountyCompleteness(
  prisma: PrismaClient,
  county: string
): Promise<CountyCompletenessMetrics> {
  const totalResult = await prisma.property.count({
    where: { county, is_seed: false }
  })

  const totalProperties = totalResult || 0

  if (totalProperties === 0) {
    return {
      county,
      totalProperties: 0,
      physicalCompleteness: 0,
      valuationCompleteness: 0,
      locationCompleteness: 0,
      titleCompleteness: 0,
      completenessScore: 0
    }
  }

  // Physical: year_built AND building_sqft AND lot_size_sqft
  const physicalCount = await prisma.property.count({
    where: {
      county,
      is_seed: false,
      year_built: { not: null },
      building_sqft: { not: null },
      lot_size_sqft: { not: null }
    }
  })

  // Valuation: estimated_market_value
  const valuationCount = await prisma.property.count({
    where: {
      county,
      is_seed: false,
      estimated_market_value: { not: null, gt: 0 }
    }
  })

  // Location: latitude AND longitude AND photo_url
  const locationCount = await prisma.property.count({
    where: {
      county,
      is_seed: false,
      latitude: { not: null },
      longitude: { not: null },
      photo_url: { not: null }
    }
  })

  // Title: has titleSignals OR titleAnalysis
  const titleCount = await prisma.property.count({
    where: {
      county,
      is_seed: false,
      OR: [
        { titleSignals: { isNot: null } },
        { titleAnalysis: { isNot: null } }
      ]
    }
  })

  const physicalCompleteness = Math.round((physicalCount / totalProperties) * 100)
  const valuationCompleteness = Math.round((valuationCount / totalProperties) * 100)
  const locationCompleteness = Math.round((locationCount / totalProperties) * 100)
  const titleCompleteness = Math.round((titleCount / totalProperties) * 100)

  // Weighted overall score
  const completenessScore = Math.round(
    physicalCompleteness * 0.20 +
    valuationCompleteness * 0.25 +
    locationCompleteness * 0.25 +
    titleCompleteness * 0.30
  )

  return {
    county,
    totalProperties,
    physicalCompleteness,
    valuationCompleteness,
    locationCompleteness,
    titleCompleteness,
    completenessScore
  }
}

/**
 * Calculate completeness for all counties
 */
export async function calculateAllCountiesCompleteness(
  prisma: PrismaClient
): Promise<CompletenessReport> {
  const counties = await prisma.property.groupBy({
    by: ['county'],
    where: { is_seed: false },
    _count: { id: true }
  })

  const countyMetrics: CountyCompletenessMetrics[] = []

  for (const { county } of counties) {
    const metrics = await calculateCountyCompleteness(prisma, county)
    countyMetrics.push(metrics)
  }

  // Sort by completeness score descending
  countyMetrics.sort((a, b) => b.completenessScore - a.completenessScore)

  // Calculate global stats
  const totalProperties = countyMetrics.reduce((sum, c) => sum + c.totalProperties, 0)
  const globalCompleteness = countyMetrics.length > 0
    ? Math.round(countyMetrics.reduce((sum, c) => sum + c.completenessScore, 0) / countyMetrics.length)
    : 0

  // Update CountyConfig with metrics
  for (const metrics of countyMetrics) {
    await prisma.countyConfig.updateMany({
      where: { county_name: metrics.county },
      data: {
        total_properties: metrics.totalProperties,
        completeness_score: metrics.completenessScore,
        physical_completeness: metrics.physicalCompleteness,
        valuation_completeness: metrics.valuationCompleteness,
        location_completeness: metrics.locationCompleteness,
        title_completeness: metrics.titleCompleteness,
        last_completeness_check: new Date()
      }
    })
  }

  return {
    counties: countyMetrics,
    globalCompleteness,
    totalProperties,
    lastUpdated: new Date()
  }
}

/**
 * Get county status based on completeness thresholds
 */
export function getCountyStatus(metrics: CountyCompletenessMetrics): {
  status: 'pending' | 'alpha' | 'beta' | 'production'
  label: string
} {
  const {
    completenessScore,
    physicalCompleteness,
    valuationCompleteness,
    locationCompleteness,
    titleCompleteness
  } = metrics

  // Production ready: >= 85% overall, all dimensions >= 50%
  if (completenessScore >= 85 &&
      physicalCompleteness >= 50 &&
      valuationCompleteness >= 50 &&
      locationCompleteness >= 50 &&
      titleCompleteness >= 50) {
    return { status: 'production', label: 'Production Ready' }
  }

  // Beta: >= 60% overall, valuation >= 50%, location >= 80%
  if (completenessScore >= 60 &&
      valuationCompleteness >= 50 &&
      locationCompleteness >= 80) {
    return { status: 'beta', label: 'Beta' }
  }

  // Alpha: >= 40% overall
  if (completenessScore >= 40) {
    return { status: 'alpha', label: 'Alpha' }
  }

  return { status: 'pending', label: 'Pending' }
}
