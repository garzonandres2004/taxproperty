#!/usr/bin/env ts-node
/**
 * Backfill Utah County Title Signals
 * Scrapes Utah County Recorder for all Utah County properties
 *
 * Usage:
 *   npx ts-node scripts/backfill-utah-title-signals.ts
 */

import { PrismaClient } from '@prisma/client'
import { batchScrapeUtahCounty } from '../src/lib/title/scrapers/utah-county'

const prisma = new PrismaClient()

async function main() {
  console.log('═'.repeat(60))
  console.log('Utah County Title Signals Backfill')
  console.log('═'.repeat(60))

  // Get Utah County properties without title signals
  const properties = await prisma.property.findMany({
    where: {
      county: 'utah',
      is_seed: false,
      titleSignals: null
    },
    select: { id: true, parcel_number: true }
  })

  console.log(`Found ${properties.length} properties without title signals`)

  if (properties.length === 0) {
    console.log('No properties to process. Exiting.')
    return
  }

  const propertyIds = properties.map(p => p.id)

  console.log('\nStarting batch scrape...')
  const result = await batchScrapeUtahCounty(prisma, propertyIds, {
    verbose: true
  })

  console.log('\n' + '═'.repeat(60))
  console.log('Backfill Complete')
  console.log('═'.repeat(60))
  console.log(`Processed: ${result.processed}`)
  console.log(`Failed: ${result.failed}`)
  console.log('═'.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
