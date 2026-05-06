#!/usr/bin/env tsx
// Run the full 6-phase pipeline for a single property.
// Usage:
//   npm run run:pipeline <propertyId>
//   tsx scripts/run-pipeline.ts <propertyId>
//
// If no propertyId is given, picks the first Utah County property from the DB.

import { PrismaClient } from '@prisma/client'
import { runPipeline } from '../src/lib/pipeline/orchestrator'

const prisma = new PrismaClient()

async function main() {
  let propertyId = process.argv[2]

  if (!propertyId) {
    const fallback = await prisma.property.findFirst({
      where: { county: 'utah', is_seed: false },
      select: { id: true, parcel_number: true }
    })
    if (!fallback) {
      console.error('No Utah County properties found in database.')
      process.exit(1)
    }
    propertyId = fallback.id
    console.log(`No propertyId given — using: ${fallback.parcel_number} (${propertyId})`)
  }

  // Verify property exists
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { parcel_number: true, county: true, property_address: true }
  })
  if (!prop) {
    console.error(`Property not found: ${propertyId}`)
    process.exit(1)
  }

  console.log(`\nRunning pipeline for:`)
  console.log(`  Parcel:  ${prop.parcel_number}`)
  console.log(`  County:  ${prop.county}`)
  console.log(`  Address: ${prop.property_address ?? '(none)'}`)
  console.log()

  const result = await runPipeline(prisma, propertyId, {
    phases: ['ingest', 'physical', 'location', 'title', 'gaps', 'score'],
    force: true,
    verbose: true
  })

  console.log('\n── Pipeline Result ──────────────────────────────────')
  console.log(JSON.stringify({
    propertyId: result.propertyId,
    parcelNumber: result.parcelNumber,
    county: result.county,
    overallStatus: result.overallStatus,
    investabilityScore: result.investabilityScore,
    recommendationBucket: result.recommendationBucket,
    totalDurationMs: result.totalDurationMs,
    isDuplicate: result.isDuplicate,
    phases: result.phases.map(p => ({
      phase: p.phase,
      status: p.status,
      fieldsSet: p.fieldsSet,
      dataGapsRecorded: p.dataGapsRecorded,
      notes: p.notes,
      durationMs: p.durationMs
    }))
  }, null, 2))

  // Post-run DB checks
  const run = await prisma.pipelineRun.findFirst({
    where: { property_id: propertyId },
    orderBy: { started_at: 'desc' }
  })
  const ts = await prisma.titleSignals.findUnique({
    where: { property_id: propertyId }
  })
  const dg = await prisma.dataGap.findMany({
    where: { property_id: propertyId },
    select: { phase: true, field: true, reason: true, level: true, resolved: true }
  })

  console.log('\n── DB State ─────────────────────────────────────────')
  console.log('PipelineRun:', run ? `${run.status} | phases: ${run.phases_completed}` : 'NONE')
  console.log('TitleSignals:', ts
    ? `has_deed_records=${ts.has_deed_records} docs5yr=${ts.document_count_5yr} liens=${ts.lien_docs_found} releases=${ts.release_docs_found} redFlags=${ts.red_flags_count}`
    : 'NONE')
  console.log(`DataGaps (${dg.length} total):`)
  dg.forEach(g => console.log(`  [${g.level}] ${g.phase}:${g.field} — ${g.reason} (resolved=${g.resolved})`))
}

main()
  .catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
