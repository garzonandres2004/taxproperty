// Pipeline Orchestrator
// Universal 6-phase pipeline for all properties
// Every property passes through: ingest → physical → location → title → gaps → score

import { PrismaClient } from '@prisma/client'
import { PipelinePhase, PhaseResult, PhaseStatus, PipelineResult } from './types'
import {
  runIngestPhase,
  runPhysicalPhase,
  runLocationPhase,
  runTitlePhase,
  runGapsPhase,
  runScorePhase
} from './phases'

export const PIPELINE_VERSION = '1.0.0'

export type PipelineOptions = {
  phases?: PipelinePhase[]
  force?: boolean
  dryRun?: boolean
  verbose?: boolean
}

const ALL_PHASES: PipelinePhase[] = [
  'ingest',
  'physical',
  'location',
  'title',
  'gaps',
  'score'
]

/**
 * Run the complete pipeline for a single property
 * Idempotent: safe to re-run, prevents concurrent executions
 */
export async function runPipeline(
  prisma: PrismaClient,
  propertyId: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const {
    phases = ALL_PHASES,
    force = false,
    dryRun = false,
    verbose = false
  } = options

  const startTime = Date.now()

  // Get property basic info
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      parcel_number: true,
      county: true,
      status: true
    }
  })

  if (!property) {
    throw new Error(`Property not found: ${propertyId}`)
  }

  if (verbose) {
    console.log(`[Pipeline ${PIPELINE_VERSION}] Starting for ${property.county} / ${property.parcel_number}`)
    console.log(`[Pipeline] Phases: ${phases.join(', ')}`)
  }

  // Check for existing active run (concurrency guard)
  const existingRun = await prisma.pipelineRun.findFirst({
    where: {
      property_id: propertyId,
      pipeline_version: PIPELINE_VERSION,
      status: { in: ['running', 'completed'] }
    },
    orderBy: { started_at: 'desc' }
  })

  if (existingRun) {
    if (existingRun.status === 'running') {
      // Another process is running - wait or return busy status
      const runDuration = Date.now() - existingRun.started_at.getTime()
      if (runDuration < 300000) { // 5 minutes
        if (verbose) {
          console.log(`[Pipeline] Another run in progress (started ${runDuration}ms ago), skipping`)
        }
        return {
          propertyId,
          parcelNumber: property.parcel_number,
          county: property.county,
          phases: [],
          totalDurationMs: 0,
          overallStatus: 'partial',
          investabilityScore: null,
          recommendationBucket: null,
          pipelineVersion: PIPELINE_VERSION,
          isDuplicate: true
        }
      } else {
        // Stale run - mark as failed and continue
        if (!dryRun) {
          await prisma.pipelineRun.update({
            where: { id: existingRun.id },
            data: { status: 'failed', error_message: 'Timed out - exceeded 5 minutes' }
          })
        }
      }
    } else if (existingRun.status === 'completed' && !force) {
      // Already completed for this version
      const completedPhases = JSON.parse(existingRun.phases_completed || '[]') as PipelinePhase[]
      const allRequestedCompleted = phases.every(p => completedPhases.includes(p))

      if (allRequestedCompleted) {
        if (verbose) {
          console.log(`[Pipeline] Already completed for version ${PIPELINE_VERSION}, skipping (use force=true to re-run)`)
        }
        return {
          propertyId,
          parcelNumber: property.parcel_number,
          county: property.county,
          phases: [],
          totalDurationMs: 0,
          overallStatus: 'complete',
          investabilityScore: existingRun.investability_score,
          recommendationBucket: existingRun.recommendation_bucket,
          pipelineVersion: PIPELINE_VERSION,
          isDuplicate: true
        }
      }
    }
  }

  // Create new pipeline run record
  const pipelineRun = dryRun ? null : await prisma.pipelineRun.create({
    data: {
      property_id: propertyId,
      county: property.county,
      pipeline_version: PIPELINE_VERSION,
      phases_requested: JSON.stringify(phases),
      phases_completed: JSON.stringify([]), // Initialized in application code
      status: 'running',
      started_at: new Date()
    }
  })

  const phaseResults: PhaseResult[] = []
  const completedPhases: PipelinePhase[] = []

  try {
    // Execute each requested phase
    for (const phase of phases) {
      const phaseStart = Date.now()
      let result: PhaseResult

      try {
        // Phase execution will be implemented in separate files
        result = await executePhase(phase, prisma, propertyId, { dryRun, verbose })
      } catch (error) {
        result = {
          phase,
          status: 'failed' as PhaseStatus,
          fieldsSet: [],
          dataGapsRecorded: [],
          notes: [`Phase failed: ${(error as Error).message}`],
          durationMs: Date.now() - phaseStart
        }
      }

      result.durationMs = Date.now() - phaseStart
      phaseResults.push(result)
      completedPhases.push(phase)

      if (verbose) {
        console.log(`[Pipeline] Phase ${phase}: ${result.status} (${result.durationMs}ms)`)
      }

      // Update pipeline run progress atomically
      if (pipelineRun && !dryRun) {
        await prisma.pipelineRun.update({
          where: { id: pipelineRun.id },
          data: {
            phases_completed: JSON.stringify(completedPhases),
            current_phase: phase
          }
        })
      }

      // Stop on critical failure
      if (result.status === 'failed' && phase === 'ingest') {
        break
      }
    }

    // Calculate overall status
    const failedPhases = phaseResults.filter(p => p.status === 'failed')
    const hasPartial = phaseResults.some(p => p.status === 'partial')

    const overallStatus: PipelineResult['overallStatus'] =
      failedPhases.length > 0 ? 'failed' :
      hasPartial ? 'partial' :
      'complete'

    // Get final scores
    const finalProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        investability_score: true,
        recommendation_bucket: true
      }
    })

    // Update pipeline run as completed
    if (pipelineRun && !dryRun) {
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: overallStatus === 'failed' ? 'failed' : 'completed',
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          investability_score: finalProperty?.investability_score,
          recommendation_bucket: finalProperty?.recommendation_bucket
        }
      })
    }

    return {
      propertyId,
      parcelNumber: property.parcel_number,
      county: property.county,
      phases: phaseResults,
      totalDurationMs: Date.now() - startTime,
      overallStatus,
      investabilityScore: finalProperty?.investability_score ?? null,
      recommendationBucket: finalProperty?.recommendation_bucket ?? null,
      pipelineVersion: PIPELINE_VERSION,
      isDuplicate: false
    }

  } catch (error) {
    // Update pipeline run as failed
    if (pipelineRun && !dryRun) {
      await prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: 'failed',
          completed_at: new Date(),
          error_message: (error as Error).message
        }
      })
    }
    throw error
  }
}

/**
 * Execute a single phase - dispatches to implementation
 */
async function executePhase(
  phase: PipelinePhase,
  prisma: PrismaClient,
  propertyId: string,
  options: { dryRun?: boolean; verbose?: boolean }
): Promise<PhaseResult> {
  switch (phase) {
    case 'ingest':
      return runIngestPhase(prisma, propertyId, options)
    case 'physical':
      return runPhysicalPhase(prisma, propertyId, options)
    case 'location':
      return runLocationPhase(prisma, propertyId, options)
    case 'title':
      return runTitlePhase(prisma, propertyId, options)
    case 'gaps':
      return runGapsPhase(prisma, propertyId, options)
    case 'score':
      return runScorePhase(prisma, propertyId, options)
    default:
      throw new Error(`Unknown phase: ${phase}`)
  }
}

/**
 * Run pipeline for multiple properties in batch
 */
export async function runPipelineBatch(
  prisma: PrismaClient,
  propertyIds: string[],
  options: PipelineOptions = {}
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = []
  const { verbose = false } = options

  for (let i = 0; i < propertyIds.length; i++) {
    const propertyId = propertyIds[i]

    if (verbose) {
      console.log(`[Pipeline Batch] ${i + 1}/${propertyIds.length}: ${propertyId}`)
    }

    try {
      const result = await runPipeline(prisma, propertyId, options)
      results.push(result)
    } catch (error) {
      console.error(`[Pipeline Batch] Failed for ${propertyId}:`, error)
      results.push({
        propertyId,
        parcelNumber: 'unknown',
        county: 'unknown',
        phases: [],
        totalDurationMs: 0,
        overallStatus: 'failed',
        investabilityScore: null,
        recommendationBucket: null,
        pipelineVersion: PIPELINE_VERSION,
        isDuplicate: false
      })
    }

    // Small delay to avoid rate limits
    if (i < propertyIds.length - 1) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return results
}

/**
 * Resume incomplete pipeline runs (e.g., after server restart)
 * Safely continues existing runs instead of creating new ones
 */
export async function resumeIncompletePipelines(
  prisma: PrismaClient,
  options: PipelineOptions = {}
): Promise<number> {
  const staleThreshold = new Date(Date.now() - 300000) // 5 minutes ago

  const incompleteRuns = await prisma.pipelineRun.findMany({
    where: {
      status: 'running',
      started_at: { lt: staleThreshold }
    },
    select: {
      id: true,
      property_id: true,
      phases_completed: true,
      phases_requested: true
    }
  })

  for (const run of incompleteRuns) {
    // Mark stale run as failed
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        error_message: 'Resumed after timeout - previous run marked as failed'
      }
    })

    // Determine remaining phases
    const completed = JSON.parse(run.phases_completed || '[]') as PipelinePhase[]
    const requested = JSON.parse(run.phases_requested) as PipelinePhase[]
    const remaining = requested.filter(p => !completed.includes(p))

    if (remaining.length > 0) {
      // Continue from where it left off
      await runPipeline(prisma, run.property_id, {
        ...options,
        phases: remaining
      })
    }
  }

  return incompleteRuns.length
}
