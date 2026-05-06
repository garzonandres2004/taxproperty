// Phase 5: resolveDataGaps
// Attempt to resolve data gaps that are auto-fixable

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'

export interface GapsPhaseOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Gaps Phase: Attempt to resolve Level A and some Level B gaps
 *
 * Resolution strategies:
 * - Level A (API_NO_MATCH, API_ERROR): Retry with backoff
 * - Level A (GEOCODE_FAILED): Try alternative address formats
 * - Level B (RECORDER_NEEDS_PLAYBOOK): Apply county-specific playbook if available
 * - Level C: Skip, mark as requiring manual intervention
 */
export async function runGapsPhase(
  prisma: PrismaClient,
  propertyId: string,
  options: GapsPhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'gaps',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    // Get unresolved gaps for this property
    const gaps = await prisma.dataGap.findMany({
      where: {
        property_id: propertyId,
        resolved: false
      }
    })

    if (gaps.length === 0) {
      result.notes.push('No unresolved gaps')
      result.durationMs = Date.now() - startTime
      return result
    }

    result.notes.push(`${gaps.length} unresolved gaps found`)

    let resolved = 0
    let skipped = 0
    let failed = 0

    for (const gap of gaps) {
      // Level A: Retry strategies
      if (gap.level === 'A') {
        switch (gap.reason) {
          case 'API_ERROR':
            // Could implement retry logic here
            result.notes.push(`API_ERROR gap ${gap.field}: retry not yet implemented`)
            failed++
            break

          case 'GEOCODE_FAILED':
            // Could try alternative address
            result.notes.push(`GEOCODE_FAILED gap ${gap.field}: alternative geocoding not yet implemented`)
            failed++
            break

          default:
            skipped++
        }
      }
      // Level B: Check if playbook is available
      else if (gap.level === 'B') {
        if (gap.reason === 'RECORDER_NEEDS_PLAYBOOK') {
          // TODO: Check if playbook is implemented for this county
          result.notes.push(`Playbook gap ${gap.field}: implementation pending`)
          skipped++
        } else {
          skipped++
        }
      }
      // Level C: Always skip
      else {
        skipped++
      }
    }

    result.notes.push(`Gaps: ${resolved} resolved, ${skipped} skipped, ${failed} failed`)

    if (resolved === 0 && skipped > 0) {
      result.status = 'partial'
    } else if (failed > 0) {
      result.status = 'partial'
    }

    if (verbose) {
      console.log(`[Gaps Phase] ${gaps.length} gaps: ${resolved} resolved, ${skipped} skipped`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
