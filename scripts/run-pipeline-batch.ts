#!/usr/bin/env tsx
// Run the full 6-phase pipeline for a batch of Utah County properties.
// Usage:
//   npm run run:pipeline:batch
//   tsx scripts/run-pipeline-batch.ts [batchSize]
//
// Default batch size: 10 Utah County properties (highest final_score first).

import { PrismaClient } from '@prisma/client'
import { runPipeline } from '../src/lib/pipeline/orchestrator'

const prisma = new PrismaClient()

const BATCH_SIZE = parseInt(process.argv[2] ?? '10', 10)

async function main() {
  const properties = await prisma.property.findMany({
    where: { county: 'utah', is_seed: false },
    orderBy: [{ final_score: 'desc' }],
    take: BATCH_SIZE,
    select: { id: true, parcel_number: true, county: true }
  })

  if (properties.length === 0) {
    console.error('No Utah County properties found.')
    process.exit(1)
  }

  console.log(`\nRunning full pipeline on ${properties.length} Utah County properties (force=true)`)
  console.log(`Phases: ingest → physical → location → title → gaps → score\n`)

  let succeeded = 0
  let failed = 0
  let titleSignalsCreated = 0
  const errors: string[] = []

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    process.stdout.write(`  [${i + 1}/${properties.length}] ${prop.parcel_number} ... `)

    try {
      const result = await runPipeline(prisma, prop.id, {
        phases: ['ingest', 'physical', 'location', 'title', 'gaps', 'score'],
        force: true
      })

      const statusIcon = result.overallStatus === 'complete' ? '✓' :
                         result.overallStatus === 'partial' ? '~' : '✗'
      const score = result.investabilityScore != null
        ? ` score=${result.investabilityScore.toFixed(1)}`
        : ''
      const bucket = result.recommendationBucket ? ` [${result.recommendationBucket}]` : ''
      console.log(`${statusIcon} ${result.overallStatus}${score}${bucket} (${result.totalDurationMs}ms)`)

      if (result.overallStatus !== 'failed') succeeded++
      else failed++
    } catch (err) {
      console.log(`✗ ERROR: ${(err as Error).message}`)
      failed++
      errors.push(`${prop.parcel_number}: ${(err as Error).message}`)
    }
  }

  // Count TitleSignals created for these properties
  const propIds = properties.map(p => p.id)
  const tsCount = await prisma.titleSignals.count({
    where: { property_id: { in: propIds } }
  })
  titleSignalsCreated = tsCount

  // Count total PipelineRuns in DB
  const totalRuns = await prisma.pipelineRun.count()
  const completedRuns = await prisma.pipelineRun.count({ where: { status: 'completed' } })

  // Count DataGaps for this batch
  const gapsByLevel = await prisma.dataGap.groupBy({
    by: ['level'],
    where: { property_id: { in: propIds }, resolved: false },
    _count: { id: true }
  })

  console.log('\n── Batch Summary ────────────────────────────────────')
  console.log(`  Properties processed:  ${properties.length}`)
  console.log(`  Succeeded:             ${succeeded}`)
  console.log(`  Failed:                ${failed}`)
  console.log(`  TitleSignals records:  ${titleSignalsCreated}`)
  console.log()
  console.log('  DataGaps this batch:')
  for (const g of gapsByLevel) {
    const meaning = g.level === 'A' ? '(retry-able)' :
                    g.level === 'B' ? '(needs playbook)' : '(structural limit)'
    console.log(`    Level ${g.level} ${meaning}: ${g._count.id}`)
  }
  console.log()
  console.log(`  Total PipelineRuns in DB: ${totalRuns} (${completedRuns} completed)`)

  if (errors.length > 0) {
    console.log('\n── Errors ───────────────────────────────────────────')
    errors.forEach(e => console.log(`  ${e}`))
  }

  // Spot-check: show top 3 properties by investability
  const topProps = await prisma.property.findMany({
    where: { county: 'utah', is_seed: false, investability_score: { not: null } },
    orderBy: { investability_score: 'desc' },
    take: 3,
    select: { parcel_number: true, investability_score: true, recommendation_bucket: true, final_score: true }
  })
  console.log('\n── Top 3 Utah properties by V2 score ───────────────')
  topProps.forEach(p =>
    console.log(`  ${p.parcel_number}: investability=${p.investability_score?.toFixed(1)} [${p.recommendation_bucket}] (V1 final=${p.final_score?.toFixed(1)})`)
  )
}

main()
  .catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
