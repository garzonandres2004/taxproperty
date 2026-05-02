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
    // Aggregate stats
    const totalProperties = await prisma.property.count({ where: { is_seed: false } })
    const highScoring = await prisma.property.count({
      where: { is_seed: false, final_score: { gte: 80 } },
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

    // Score distribution
    const distributionData = await Promise.all(
      scoreRanges.map(async (r) => ({
        ...r,
        count: await prisma.property.count({
          where: {
            is_seed: false,
            final_score: { gte: r.min, lte: r.max },
          },
        }),
      }))
    )

    // Top properties
    const topProperties = await prisma.property.findMany({
      where: { is_seed: false },
      orderBy: { final_score: 'desc' },
      take: 5,
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        total_amount_due: true,
        estimated_market_value: true,
        final_score: true,
        property_type: true,
        recommendation: true,
      },
    })

    // Research queue
    const researchQueue = await prisma.property.findMany({
      where: { is_seed: false, recommendation: 'research_more' },
      orderBy: { final_score: 'desc' },
      take: 3,
      select: {
        id: true,
        parcel_number: true,
        property_address: true,
        final_score: true,
        property_type: true,
        recommendation: true,
      },
    })

    return NextResponse.json({
      stats: {
        totalProperties,
        highScoring,
        totalMarketValue,
        totalPayoff,
        bidCount,
      },
      distributionData,
      topProperties,
      researchQueue,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
