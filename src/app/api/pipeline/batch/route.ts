// Pipeline Batch API
// Execute pipeline for multiple properties

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runPipelineBatch } from '@/lib/pipeline/orchestrator'

export const dynamic = 'force-dynamic'

// POST /api/pipeline/batch
// Body: { propertyIds: string[], phases?: string[], force?: boolean }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { propertyIds, phases = ['all'], force = false } = body

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json(
        { error: 'propertyIds array required' },
        { status: 400 }
      )
    }

    // Limit batch size to prevent timeouts
    const BATCH_LIMIT = 100
    if (propertyIds.length > BATCH_LIMIT) {
      return NextResponse.json(
        { error: `Batch size exceeds ${BATCH_LIMIT} properties` },
        { status: 400 }
      )
    }

    const phaseList = phases.includes('all')
      ? ['ingest', 'physical', 'location', 'title', 'gaps', 'score']
      : phases

    const results = await runPipelineBatch(prisma, propertyIds, {
      phases: phaseList as any,
      force,
      verbose: true
    })

    const summary = {
      total: results.length,
      complete: results.filter(r => r.overallStatus === 'complete').length,
      partial: results.filter(r => r.overallStatus === 'partial').length,
      failed: results.filter(r => r.overallStatus === 'failed').length,
      duplicates: results.filter(r => r.isDuplicate).length,
      totalDurationMs: results.reduce((sum, r) => sum + r.totalDurationMs, 0)
    }

    return NextResponse.json({
      success: true,
      summary,
      results: results.map(r => ({
        propertyId: r.propertyId,
        parcelNumber: r.parcelNumber,
        county: r.county,
        status: r.overallStatus,
        phases: r.phases.map(p => ({ phase: p.phase, status: p.status })),
        durationMs: r.totalDurationMs,
        isDuplicate: r.isDuplicate
      }))
    })

  } catch (error) {
    console.error('Batch pipeline error:', error)
    return NextResponse.json(
      { error: 'Batch pipeline failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
