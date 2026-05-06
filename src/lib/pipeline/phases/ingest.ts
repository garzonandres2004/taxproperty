// Phase 1: ingestBaseRow
// Creates or updates a property from raw county data (CSV/import)

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'

export interface IngestPhaseOptions {
  dryRun?: boolean
  verbose?: boolean
  sourceData?: Record<string, any> // Raw data from CSV/import
}

/**
 * Ingest Phase: Transform raw county data into Property record
 *
 * Responsibilities:
 * - Validate parcel number format per county
 * - Normalize address fields
 * - Set default values (status, dates, risk flags)
 * - Record DataGaps for missing required fields
 */
export async function runIngestPhase(
  prisma: PrismaClient,
  propertyId: string,
  options: IngestPhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'ingest',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    // TODO: Implement ingest logic
    // 1. Get property or create from sourceData
    // 2. Validate parcel format for county
    // 3. Normalize addresses
    // 4. Record gaps for missing required fields
    // 5. Save property record

    result.notes.push('Ingest phase: implementation pending')

    if (verbose) {
      console.log(`[Ingest Phase] Processed property ${propertyId}`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
