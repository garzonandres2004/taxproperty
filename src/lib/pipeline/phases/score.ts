// Phase 6: scoreV2
// Calculate final V2 scores with all available data

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'
import { scoreAndSaveV2 } from '@/lib/scoring/scoring-v2'

export interface ScorePhaseOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Score Phase: Calculate V1 and V2 scores
 *
 * Scores calculated:
 * - V1: opportunity_score, risk_score, final_score, recommendation
 * - V2: investability_score, title_score_v2, confidence_score_v2, recommendation_bucket
 *
 * Data gaps impact scoring:
 * - Critical gaps (market_value, location) reduce confidence
 * - Title gaps limit recommendation to RESEARCH max
 */
export async function runScorePhase(
  prisma: PrismaClient,
  propertyId: string,
  options: ScorePhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'score',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    // Run V2 scoring
    if (!dryRun) {
      await scoreAndSaveV2(prisma, propertyId)
    }

    // Get the calculated scores
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        investability_score: true,
        confidence_score_v2: true,
        title_score_v2: true,
        recommendation_bucket: true,
        county: true,
        parcel_number: true
      }
    })

    if (property?.investability_score != null) {
      result.fieldsSet.push('investability_score')
    }
    if (property?.confidence_score_v2 != null) {
      result.fieldsSet.push('confidence_score_v2')
    }
    if (property?.title_score_v2 != null) {
      result.fieldsSet.push('title_score_v2')
    }

    // Check for critical gaps that should limit recommendation
    const criticalGaps = await prisma.dataGap.count({
      where: {
        property_id: propertyId,
        resolved: false,
        OR: [
          { phase: 'physical', field: 'estimated_market_value' },
          { phase: 'location', field: 'coordinates' }
        ]
      }
    })

    if (criticalGaps > 0) {
      result.status = 'partial'
      result.notes.push(`Scored with ${criticalGaps} critical data gaps - confidence may be reduced`)

      // Limit recommendation if critical gaps exist
      if (property?.recommendation_bucket && ['BID_CANDIDATE', 'TOP_TARGET'].includes(property.recommendation_bucket)) {
        if (!dryRun) {
          await prisma.property.update({
            where: { id: propertyId },
            data: { recommendation_bucket: 'RESEARCH' }
          })
        }
        result.notes.push('Recommendation downgraded to RESEARCH due to critical data gaps')
      }
    } else {
      result.notes.push(`V2 scoring complete: ${property?.recommendation_bucket || 'N/A'}`)
    }

    if (verbose) {
      console.log(`[Score Phase] ${property?.county}/${property?.parcel_number}: investability=${property?.investability_score}`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
