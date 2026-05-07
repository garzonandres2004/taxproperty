import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runPipelineBatch } from '@/lib/pipeline/orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    // Find properties in this county that need enrichment
    const properties = await prisma.property.findMany({
      where: {
        county: name,
        is_seed: false,
        OR: [
          { estimated_market_value: null },
          { estimated_market_value: 0 },
          { latitude: null },
          { photo_url: null },
          { property_address: null },
          { owner_name: null }
        ]
      },
      select: {
        id: true,
        parcel_number: true,
        property_address: true
      }
    })

    if (properties.length === 0) {
      return NextResponse.json({
        success: true,
        county: name,
        total: 0,
        enriched: 0,
        errors: 0,
        message: 'No properties need enrichment'
      })
    }

    // Use orchestrator for batch processing
    const propertyIds = properties.map(p => p.id)
    const results = await runPipelineBatch(prisma, propertyIds, {
      phases: ['physical', 'location', 'title', 'gaps', 'score'],
      verbose: false
    })

    const summary = {
      total: results.length,
      complete: results.filter(r => r.overallStatus === 'complete').length,
      partial: results.filter(r => r.overallStatus === 'partial').length,
      failed: results.filter(r => r.overallStatus === 'failed').length,
      duplicates: results.filter(r => r.isDuplicate).length
    }

    // Get data gaps summary
    const gaps = await prisma.dataGap.groupBy({
      by: ['level'],
      where: {
        property: { county: name },
        resolved: false
      },
      _count: { id: true }
    })

    return NextResponse.json({
      success: true,
      county: name,
      total: properties.length,
      enriched: summary.complete + summary.partial,
      failed: summary.failed,
      skipped: summary.duplicates,
      gaps: {
        levelA: gaps.find(g => g.level === 'A')?._count.id || 0,
        levelB: gaps.find(g => g.level === 'B')?._count.id || 0,
        levelC: gaps.find(g => g.level === 'C')?._count.id || 0
      }
    })

  } catch (error) {
    console.error('Error enriching county:', error)
    return NextResponse.json(
      { error: 'Failed to enrich properties', details: String(error) },
      { status: 500 }
    )
  }
}
