// Title Signals Phase
// Determines what title data we have and what we can still get.
// This is NOT the full TitleAnalysis scraper — it's the "what do we know" check.

import { PrismaClient } from '@prisma/client'
import { getRecorderEntry } from './recorder-catalog'

export type TitleSignalStatus =
  | 'full_analysis'      // TitleAnalysis record exists with documents
  | 'basic_signals'      // title_risk is set (non-unknown) but no full analysis
  | 'recorder_available' // no signals yet, but county recorder is online (Level B)
  | 'no_source'          // county recorder not available online (Level C)

export interface TitleSignalResult {
  status: TitleSignalStatus
  recorderUrl: string | null
  automationLevel: 'A' | 'B' | 'C'
  existingScore: number | null
  existingRecommendation: string | null
  notes: string
}

export async function checkTitleSignals(
  prisma: PrismaClient,
  propertyId: string,
  county: string,
  titleRisk: string
): Promise<TitleSignalResult> {
  const recorder = getRecorderEntry(county)

  // Check for existing TitleAnalysis
  const ta = await prisma.titleAnalysis.findUnique({
    where: { property_id: propertyId },
    select: { score: true, recommendation: true, analyzedAt: true }
  })

  if (ta) {
    return {
      status: 'full_analysis',
      recorderUrl: recorder.recorderUrl,
      automationLevel: 'A',
      existingScore: ta.score,
      existingRecommendation: ta.recommendation,
      notes: `Full title analysis exists (score: ${ta.score}, rec: ${ta.recommendation})`
    }
  }

  if (titleRisk !== 'unknown') {
    return {
      status: 'basic_signals',
      recorderUrl: recorder.recorderUrl,
      automationLevel: 'A',
      existingScore: null,
      existingRecommendation: null,
      notes: `Basic title signal: title_risk=${titleRisk}`
    }
  }

  if (recorder.recorderUrl) {
    return {
      status: 'recorder_available',
      recorderUrl: recorder.recorderUrl,
      automationLevel: 'B',
      existingScore: null,
      existingRecommendation: null,
      notes: `County recorder available (${recorder.vendor ?? 'online'}). Needs playbook to extract signals. URL: ${recorder.recorderUrl}`
    }
  }

  return {
    status: 'no_source',
    recorderUrl: null,
    automationLevel: 'C',
    existingScore: null,
    existingRecommendation: null,
    notes: recorder.notes
  }
}
