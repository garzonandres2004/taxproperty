// Phase 4: enrichTitleSignals
// Extract basic title signals from county recorders

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'
import { getRecorderEntry } from '../recorder-catalog'
import { scanAndRecordDataGaps } from '../data-gaps'
import { scrapeUtahCountyRecorder, saveTitleSignals } from '@/lib/title/scrapers/utah-county'
import { scrapeRichCounty, saveRichTitleSignals } from '@/lib/title/scrapers/rich-county'

export interface TitlePhaseOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Title Phase: Extract basic title signals from recorder portals
 *
 * Two-tier architecture:
 * - Basic Title Signals (this phase): Automated scraping of recorder data
 * - Full Title Analysis: Manual/OCR-based deep analysis (separate process)
 *
 * Counties by automation level:
 * - Level A (auto): Utah County (direct URL patterns)
 * - Level B (implemented): Rich County (Playwright + guest login, DevExpress)
 * - Level B (playbook): Davis, Weber, Tooele, Salt Lake (portal scraping needed)
 * - Level C (manual): Sanpete and unknown counties (no online source)
 */
export async function runTitlePhase(
  prisma: PrismaClient,
  propertyId: string,
  options: TitlePhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'title',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { titleSignals: true }
    })

    if (!property) {
      throw new Error(`Property not found: ${propertyId}`)
    }

    const recorder = getRecorderEntry(property.county)

    // Check automation level
    if (!recorder.recorderUrl) {
      // Level C: No online source
      result.status = 'skipped'
      result.notes.push(`No online recorder for ${property.county} - manual research required`)

      // Record data gap
      if (!dryRun) {
        await prisma.dataGap.upsert({
          where: {
            property_id_phase_field: {
              property_id: propertyId,
              phase: 'title',
              field: 'title_signals'
            }
          },
          create: {
            property_id: propertyId,
            phase: 'title',
            field: 'title_signals',
            reason: 'NO_ONLINE_SOURCE',
            level: 'C',
            source_hint: recorder.notes || 'County has no online recorder'
          },
          update: {
            resolved: false
          }
        })
      }
      result.dataGapsRecorded.push('title:title_signals')

      result.durationMs = Date.now() - startTime
      return result
    }

    // Rich County: Playwright-based scraper (free guest login, DevExpress controls)
    if (property.county === 'rich' && property.parcel_number) {
      const email = process.env.RICH_COUNTY_RECORDER_EMAIL
      const password = process.env.RICH_COUNTY_RECORDER_PASSWORD

      if (!email || !password) {
        result.status = 'partial'
        result.notes.push('Rich County recorder requires credentials — set RICH_COUNTY_RECORDER_EMAIL + RICH_COUNTY_RECORDER_PASSWORD')

        if (!dryRun) {
          await prisma.dataGap.upsert({
            where: { property_id_phase_field: { property_id: propertyId, phase: 'title', field: 'title_signals' } },
            create: {
              property_id: propertyId, phase: 'title', field: 'title_signals',
              reason: 'REQUIRES_LOGIN', level: 'B',
              source_hint: `Rich County recorder: ${recorder.recorderUrl} — set RICH_COUNTY_RECORDER_EMAIL + PASSWORD`
            },
            update: { resolved: false }
          })
        }
        result.dataGapsRecorded.push('title:title_signals')
        result.durationMs = Date.now() - startTime
        return result
      }

      try {
        const scrapeResult = await scrapeRichCounty(property.parcel_number)

        if (scrapeResult) {
          if (!dryRun) {
            await saveRichTitleSignals(prisma, propertyId, scrapeResult)
          }
          result.fieldsSet.push('title_signals')
          result.notes.push(`Rich County recorder: ${scrapeResult.rawDocuments.length} docs found, ${scrapeResult.documentCount5yr} in 5yr window`)
          if (scrapeResult.redFlags.length > 0) {
            result.notes.push(`Red flags: ${scrapeResult.redFlags.join(', ')}`)
          }
          if (verbose) {
            console.log(`[Title Phase] rich/${property.parcel_number}: ${scrapeResult.documentCount5yr} docs (5yr), liens=${scrapeResult.lienDocsFound}`)
          }
        } else {
          result.status = 'partial'
          result.notes.push('Rich County recorder: scraper returned no results — check credentials or recorder availability')
        }
      } catch (error) {
        result.status = 'partial'
        result.notes.push(`Rich County scraper failed: ${(error as Error).message}`)

        if (!dryRun) {
          await prisma.dataGap.upsert({
            where: { property_id_phase_field: { property_id: propertyId, phase: 'title', field: 'title_signals' } },
            create: {
              property_id: propertyId, phase: 'title', field: 'title_signals',
              reason: 'SCRAPER_ERROR', level: 'B',
              source_hint: `Rich County scraper error: ${(error as Error).message}`
            },
            update: { resolved: false }
          })
        }
        result.dataGapsRecorded.push('title:title_signals')
      }

      result.durationMs = Date.now() - startTime
      return result
    }

    // Level A: Utah County has direct scraper
    if (property.county === 'utah' && property.parcel_number) {
      try {
        const scrapeResult = await scrapeUtahCountyRecorder(property.parcel_number)

        if (scrapeResult) {
          if (!dryRun) {
            await saveTitleSignals(prisma, propertyId, scrapeResult)
          }

          result.fieldsSet.push('title_signals')
          result.notes.push(`Title signals scraped from Utah County Recorder`)
          result.notes.push(`Documents found: ${scrapeResult.documentCount5yr}, Red flags: ${scrapeResult.redFlags.length}`)

          if (scrapeResult.redFlags.length > 0) {
            result.notes.push(`Red flags: ${scrapeResult.redFlags.join(', ')}`)
          }

          if (verbose) {
            console.log(`[Title Phase] Utah County: ${scrapeResult.documentCount5yr} docs, ${scrapeResult.redFlags.length} red flags`)
          }
        } else {
          result.status = 'partial'
          result.notes.push('No title signals found in Utah County Recorder')
        }
      } catch (error) {
        result.status = 'partial'
        result.notes.push(`Utah scraper failed: ${(error as Error).message}`)
      }

      result.durationMs = Date.now() - startTime
      return result
    }

    // Level B: County recorder exists online but needs login or playbook
    result.status = 'partial'

    const reason = recorder.requiresLogin ? 'REQUIRES_LOGIN' : 'RECORDER_NEEDS_PLAYBOOK'
    const note = recorder.requiresLogin
      ? `${property.county} recorder requires login (${recorder.vendor}) — manual access at ${recorder.recorderUrl}`
      : `Title signals require playbook for ${property.county}`
    result.notes.push(note)

    if (!dryRun) {
      await prisma.dataGap.upsert({
        where: {
          property_id_phase_field: {
            property_id: propertyId,
            phase: 'title',
            field: 'title_signals'
          }
        },
        create: {
          property_id: propertyId,
          phase: 'title',
          field: 'title_signals',
          reason,
          level: 'B',
          source_hint: `${recorder.vendor}: ${recorder.recorderUrl}`
        },
        update: {
          resolved: false
        }
      })
    }
    result.dataGapsRecorded.push('title:title_signals')

    if (verbose) {
      console.log(`[Title Phase] ${property.county}/${property.parcel_number}: ${recorder.vendor} - ${reason}`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
