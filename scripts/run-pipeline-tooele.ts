#!/usr/bin/env tsx
// Run the full pipeline on all Tooele County properties.
// Usage:
//   npm run run:pipeline:tooele [batchSize]
//
// Default: all 29 Tooele properties, sorted by investability_score DESC.

import { PrismaClient } from '@prisma/client'
import { runPipeline } from '../src/lib/pipeline/orchestrator'

const prisma = new PrismaClient()
const BATCH_SIZE = parseInt(process.argv[2] ?? '100', 10)

async function main() {
  const properties = await prisma.property.findMany({
    where: { county: 'tooele', is_seed: false },
    orderBy: { investability_score: 'desc' },
    take: BATCH_SIZE,
    select: { id: true, parcel_number: true, county: true }
  })

  if (properties.length === 0) {
    console.error('No Tooele County properties found.')
    process.exit(1)
  }

  console.log(`\nTooele County pipeline — ${properties.length} properties (force=true)`)
  console.log('Phases: ingest → physical → location → title → gaps → score\n')

  let succeeded = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    process.stdout.write(`  [${i + 1}/${properties.length}] ${prop.parcel_number} ... `)

    try {
      const result = await runPipeline(prisma, prop.id, {
        phases: ['ingest', 'physical', 'location', 'title', 'gaps', 'score'],
        force: true
      })

      const icon = result.overallStatus === 'complete' ? '✓' :
                   result.overallStatus === 'partial' ? '~' : '✗'
      const score = result.investabilityScore != null
        ? ` score=${result.investabilityScore.toFixed(1)}`
        : ''
      const bucket = result.recommendationBucket ? ` [${result.recommendationBucket}]` : ''
      console.log(`${icon} ${result.overallStatus}${score}${bucket} (${result.totalDurationMs}ms)`)

      if (result.overallStatus !== 'failed') succeeded++
      else failed++
    } catch (err) {
      console.log(`✗ ERROR: ${(err as Error).message}`)
      failed++
      errors.push(`${prop.parcel_number}: ${(err as Error).message}`)
    }
  }

  const propIds = properties.map(p => p.id)

  const gapsByLevel = await prisma.dataGap.groupBy({
    by: ['level'],
    where: { property_id: { in: propIds }, resolved: false },
    _count: { id: true }
  })

  const tsCount = await prisma.titleSignals.count({
    where: { property_id: { in: propIds } }
  })

  console.log('\n── Tooele Pipeline Summary ──────────────────────────')
  console.log(`  Properties:      ${properties.length}`)
  console.log(`  Succeeded:       ${succeeded}`)
  console.log(`  Failed:          ${failed}`)
  console.log(`  TitleSignals:    ${tsCount} (${tsCount === 0 ? 'none — Eagle Software login required' : 'present'})`)
  console.log()
  console.log('  DataGaps this batch:')
  for (const g of gapsByLevel) {
    const meaning = g.level === 'A' ? '(retry-able)' :
                    g.level === 'B' ? '(needs login/playbook)' : '(structural limit)'
    console.log(`    Level ${g.level} ${meaning}: ${g._count.id}`)
  }

  const topProps = await prisma.property.findMany({
    where: { county: 'tooele', is_seed: false, investability_score: { not: null } },
    orderBy: { investability_score: 'desc' },
    take: 5,
    select: {
      parcel_number: true,
      property_address: true,
      investability_score: true,
      recommendation_bucket: true,
      total_amount_due: true,
      estimated_market_value: true
    }
  })

  console.log('\n── Top 5 Tooele by V2 score ─────────────────────────')
  topProps.forEach(p => {
    const equity = p.estimated_market_value && p.total_amount_due
      ? Math.round(((p.estimated_market_value - p.total_amount_due) / p.estimated_market_value) * 100)
      : null
    const equityStr = equity != null ? ` equity=${equity}%` : ''
    console.log(`  ${p.parcel_number}: score=${p.investability_score?.toFixed(1)} [${p.recommendation_bucket}]${equityStr} due=$${p.total_amount_due?.toLocaleString()}`)
  })

  if (errors.length > 0) {
    console.log('\n── Errors ───────────────────────────────────────────')
    errors.forEach(e => console.log(`  ${e}`))
  }
}

main()
  .catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
