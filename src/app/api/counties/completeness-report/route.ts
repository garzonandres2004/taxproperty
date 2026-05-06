// County Completeness Report API
// GET /api/counties/completeness-report

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  calculateAllCountiesCompleteness,
  calculateCountyCompleteness,
  getCountyStatus
} from '@/lib/completeness/calculator'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')
    const refresh = searchParams.get('refresh') === 'true'

    if (county) {
      // Single county report
      const metrics = await calculateCountyCompleteness(prisma, county)
      const status = getCountyStatus(metrics)

      // Get gap summary for this county
      const gapSummary = await prisma.dataGap.groupBy({
        by: ['level', 'resolved'],
        where: {
          property: { county },
          resolved: false
        },
        _count: { id: true }
      })

      return NextResponse.json({
        success: true,
        county: {
          ...metrics,
          ...status,
          gapSummary: {
            levelA: gapSummary.find(g => g.level === 'A')?._count.id || 0,
            levelB: gapSummary.find(g => g.level === 'B')?._count.id || 0,
            levelC: gapSummary.find(g => g.level === 'C')?._count.id || 0
          }
        }
      })
    }

    // All counties report
    const report = await calculateAllCountiesCompleteness(prisma)

    // Compute gap stats per county from DataGap table (ground truth)
    const gapStats = await prisma.dataGap.groupBy({
      by: ['level'],
      where: { resolved: false, property: { is_seed: false } },
      _count: { id: true }
    })

    // Per-county gap breakdown
    const countyGaps = await prisma.$queryRaw<Array<{county: string; level: string; cnt: number}>>`
      SELECT p.county, dg.level, COUNT(dg.id) as cnt
      FROM DataGap dg
      JOIN Property p ON p.id = dg.property_id
      WHERE dg.resolved = 0 AND p.is_seed = 0
      GROUP BY p.county, dg.level
    `

    const gapsByCounty: Record<string, {A: number; B: number; C: number}> = {}
    for (const row of countyGaps) {
      if (!gapsByCounty[row.county]) gapsByCounty[row.county] = { A: 0, B: 0, C: 0 }
      gapsByCounty[row.county][row.level as 'A' | 'B' | 'C'] += Number(row.cnt)
    }

    const enrichedCounties = report.counties.map((metrics) => {
      const gaps = gapsByCounty[metrics.county] ?? { A: 0, B: 0, C: 0 }
      const totalGaps = gaps.A + gaps.B + gaps.C
      const automatable = gaps.A + gaps.B
      // null means pipeline hasn't run yet — different from 100% (no gaps after pipeline ran)
      const automationPotential = totalGaps > 0
        ? Math.round((automatable / totalGaps) * 100)
        : null
      const manualPlaybookRequired = gaps.B > 0
      const calculatedStatus = getCountyStatus(metrics)

      return {
        ...metrics,
        automationPotential,
        manualPlaybookRequired,
        gapSummary: gaps,
        derivedStatus: calculatedStatus.status,
        statusLabel: calculatedStatus.label
      }
    })

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        counties: enrichedCounties
      }
    })

  } catch (error) {
    console.error('Error generating completeness report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', details: (error as Error).message },
      { status: 500 }
    )
  }
}
