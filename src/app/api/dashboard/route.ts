import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

const scoreRanges = [
  { range: '0-40', min: 0, max: 40, color: '#ef4444' },
  { range: '41-65', min: 41, max: 65, color: '#f59e0b' },
  { range: '66-80', min: 66, max: 80, color: '#3b82f6' },
  { range: '81-100', min: 81, max: 100, color: '#10b981' },
]

export async function GET() {
  try {
    // Debug logging for Vercel
    console.log('[Dashboard API] Starting request...')
    console.log('[Dashboard API] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
    console.log('[Dashboard API] VERCEL:', process.env.VERCEL)

    // Aggregate stats
    const totalProperties = await prisma.property.count({ where: { is_seed: false } })
    console.log('[Dashboard API] Total properties:', totalProperties)
    const highScoring = await prisma.property.count({
      where: { is_seed: false, investability_score: { gte: 80 } },
    })

    const marketValueAgg = await prisma.property.aggregate({
      where: { is_seed: false },
      _sum: { estimated_market_value: true },
    })
    const totalMarketValue = marketValueAgg._sum.estimated_market_value || 0

    const payoffAgg = await prisma.property.aggregate({
      where: { is_seed: false },
      _sum: { total_amount_due: true },
    })
    const totalPayoff = payoffAgg._sum.total_amount_due || 0

    const bidCount = await prisma.property.count({
      where: { is_seed: false, recommendation: 'bid' },
    })

    // County readiness breakdown
    const counties = await prisma.countyConfig.findMany({
      select: {
        county_name: true,
        display_name: true,
        readiness: true,
        auction_date: true,
        total_properties: true,
      }
    })

    const readinessBreakdown = {
      LIVE: counties.filter(c => c.readiness === 'LIVE'),
      NEAR_LIVE: counties.filter(c => c.readiness === 'NEAR_LIVE'),
      PARTIAL: counties.filter(c => c.readiness === 'PARTIAL'),
      PLANNED: counties.filter(c => c.readiness === 'PLANNED' || !c.readiness),
    }

    // Upcoming auctions (next 30 days)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    const upcomingAuctions = counties
      .filter(c => c.auction_date && new Date(c.auction_date) >= today && new Date(c.auction_date) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.auction_date!).getTime() - new Date(b.auction_date!).getTime())

    // Score distribution (using V2 investability_score)
    const distributionData = await Promise.all(
      scoreRanges.map(async (r) => ({
        ...r,
        count: await prisma.property.count({
          where: {
            is_seed: false,
            investability_score: { gte: r.min, lte: r.max },
          },
        }),
      }))
    )

    // Top properties (using V2 investability_score)
    const topProperties = await prisma.property.findMany({
      where: { is_seed: false },
      orderBy: { investability_score: 'desc' },
      take: 5,
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        total_amount_due: true,
        estimated_market_value: true,
        investability_score: true,
        property_type: true,
        recommendation_bucket: true,
      },
    })

    // Research queue (using V2 recommendation_bucket)
    const researchQueue = await prisma.property.findMany({
      where: { is_seed: false, recommendation_bucket: 'RESEARCH_MORE' },
      orderBy: { investability_score: 'desc' },
      take: 3,
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        investability_score: true,
        property_type: true,
        recommendation_bucket: true,
      },
    })

    // Individual bucket counts for dashboard
    const topTargetCount = await prisma.property.count({
      where: { is_seed: false, recommendation_bucket: 'TOP_TARGET' }
    })
    const bidCandidateCount = await prisma.property.count({
      where: { is_seed: false, recommendation_bucket: 'BID_CANDIDATE' }
    })
    const watchlistCount = await prisma.property.count({
      where: { is_seed: false, recommendation_bucket: 'WATCHLIST' }
    })
    const researchMoreCount = await prisma.property.count({
      where: { is_seed: false, recommendation_bucket: 'RESEARCH_MORE' }
    })
    const avoidCount = await prisma.property.count({
      where: { is_seed: false, recommendation_bucket: 'AVOID' }
    })

    // Transform counties to the format expected by the dashboard
    const countiesResponse = counties.map(c => ({
      id: c.county_name,
      name: c.county_name,
      displayName: c.display_name,
      propertyCount: c.total_properties,
      auctionDate: c.auction_date,
      readinessScore: c.readiness === 'LIVE' ? 100 : c.readiness === 'NEAR_LIVE' ? 75 : c.readiness === 'PARTIAL' ? 50 : 25,
      status: (c.readiness || 'PLANNED') as 'LIVE' | 'NEAR_LIVE' | 'PARTIAL' | 'PLANNED'
    }))

    return NextResponse.json({
      stats: {
        totalProperties,
        totalCounties: counties.length,
        highScoring,
        totalMarketValue,
        totalPayoff,
        bidCount,
      },
      counties: countiesResponse,
      readinessBreakdown: {
        LIVE: readinessBreakdown.LIVE.map(c => ({
          county: c.county_name,
          display_name: c.display_name,
          property_count: c.total_properties,
          auction_date: c.auction_date,
        })),
        NEAR_LIVE: readinessBreakdown.NEAR_LIVE.map(c => ({
          county: c.county_name,
          display_name: c.display_name,
          property_count: c.total_properties,
          auction_date: c.auction_date,
        })),
        PARTIAL: readinessBreakdown.PARTIAL.map(c => ({
          county: c.county_name,
          display_name: c.display_name,
          property_count: c.total_properties,
        })),
        PLANNED: readinessBreakdown.PLANNED.map(c => ({
          county: c.county_name,
          display_name: c.display_name,
        })),
      },
      upcomingAuctions: upcomingAuctions.map(c => ({
        county: c.county_name,
        display_name: c.display_name,
        auction_date: c.auction_date,
        daysUntil: Math.ceil((new Date(c.auction_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recommendationCounts: {
        TOP_TARGET: topTargetCount,
        BID_CANDIDATE: bidCandidateCount,
        WATCHLIST: watchlistCount,
        RESEARCH: researchMoreCount,
        AVOID: avoidCount,
      },
      distributionData,
      topProperties,
      researchQueue,
    })
  } catch (error) {
    console.error('[Dashboard API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}
