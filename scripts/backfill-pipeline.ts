#!/usr/bin/env ts-node
/**
 * Backfill Pipeline Script
 * Runs the complete pipeline for all properties
 * Resume-capable with checkpointing
 *
 * Usage:
 *   npx ts-node scripts/backfill-pipeline.ts
 *   npx ts-node scripts/backfill-pipeline.ts --county=utah --batch-size=50
 */

import { PrismaClient } from '@prisma/client'
import { runPipeline, PIPELINE_VERSION } from '../src/lib/pipeline/orchestrator'

const prisma = new PrismaClient()

interface BackfillOptions {
  county?: string
  batchSize: number
  phases: string[]
  dryRun: boolean
  resume: boolean
}

async function parseArgs(): Promise<BackfillOptions> {
  const args = process.argv.slice(2)
  const options: BackfillOptions = {
    batchSize: 50,
    phases: ['physical', 'location', 'title', 'gaps', 'score'], // Skip ingest for existing
    dryRun: false,
    resume: true
  }

  for (const arg of args) {
    if (arg.startsWith('--county=')) {
      options.county = arg.split('=')[1]
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--phases=')) {
      options.phases = arg.split('=')[1].split(',')
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--no-resume') {
      options.resume = false
    }
  }

  return options
}

async function getPropertiesToProcess(options: BackfillOptions): Promise<string[]> {
  const where: any = { is_seed: false }

  if (options.county) {
    where.county = options.county
  }

  if (options.resume) {
    // Exclude properties with recent completed runs
    const recentRuns = await prisma.pipelineRun.findMany({
      where: {
        pipeline_version: PIPELINE_VERSION,
        status: 'completed',
        completed_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
        }
      },
      select: { property_id: true }
    })

    const recentIds = new Set(recentRuns.map(r => r.property_id))

    const properties = await prisma.property.findMany({
      where,
      select: { id: true }
    })

    return properties
      .map(p => p.id)
      .filter(id => !recentIds.has(id))
  }

  const properties = await prisma.property.findMany({
    where,
    select: { id: true }
  })

  return properties.map(p => p.id)
}

async function main() {
  const options = await parseArgs()

  console.log('═'.repeat(60))
  console.log('Pipeline Backfill Script')
  console.log('═'.repeat(60))
  console.log(`Pipeline Version: ${PIPELINE_VERSION}`)
  console.log(`County: ${options.county || 'all'}`)
  console.log(`Batch Size: ${options.batchSize}`)
  console.log(`Phases: ${options.phases.join(', ')}`)
  console.log(`Dry Run: ${options.dryRun}`)
  console.log(`Resume: ${options.resume}`)
  console.log('═'.repeat(60))

  const propertyIds = await getPropertiesToProcess(options)

  console.log(`\nProperties to process: ${propertyIds.length}`)

  if (propertyIds.length === 0) {
    console.log('No properties to process. Exiting.')
    return
  }

  // Process in batches
  let processed = 0
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < propertyIds.length; i += options.batchSize) {
    const batch = propertyIds.slice(i, i + options.batchSize)
    const batchNum = Math.floor(i / options.batchSize) + 1
    const totalBatches = Math.ceil(propertyIds.length / options.batchSize)

    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} properties) ---`)

    for (const propertyId of batch) {
      try {
        const result = await runPipeline(prisma, propertyId, {
          phases: options.phases as any,
          dryRun: options.dryRun,
          verbose: false
        })

        processed++

        if (result.isDuplicate) {
          skipped++
          process.stdout.write('.')
        } else if (result.overallStatus === 'complete') {
          succeeded++
          process.stdout.write('✓')
        } else if (result.overallStatus === 'partial') {
          succeeded++ // Partial is still success
          process.stdout.write('~')
        } else {
          failed++
          process.stdout.write('✗')
        }
      } catch (error) {
        failed++
        processed++
        process.stdout.write('!')
        console.error(`\nError processing ${propertyId}:`, error)
      }
    }

    // Checkpoint log every batch
    console.log(`\n  Checkpoint: ${processed}/${propertyIds.length} processed`)
    console.log(`  ✓=${succeeded} ✗=${failed} o=${skipped}`)

    // Small delay between batches
    if (i + options.batchSize < propertyIds.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('Backfill Complete')
  console.log('═'.repeat(60))
  console.log(`Total Processed: ${processed}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed}`)
  console.log(`Skipped (already done): ${skipped}`)
  console.log('═'.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
