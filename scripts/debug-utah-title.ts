#!/usr/bin/env tsx
// Debug script: fetch Utah County recorder HTML and print parsed title signals.
// Usage:
//   npm run debug:utah-title [parcelNumber]
//
// Default: first Utah County property in the DB.

import { PrismaClient } from '@prisma/client'
import { scrapeUtahCountyRecorder } from '../src/lib/title/scrapers/utah-county'

const prisma = new PrismaClient()

async function main() {
  let parcelNumber = process.argv[2]

  if (!parcelNumber) {
    const prop = await prisma.property.findFirst({
      where: { county: 'utah', is_seed: false },
      select: { parcel_number: true, property_address: true }
    })
    if (!prop) {
      console.error('No Utah County properties in DB.')
      process.exit(1)
    }
    parcelNumber = prop.parcel_number!
    console.log(`No parcel given — using: ${parcelNumber} (${prop.property_address ?? 'no address'})`)
  }

  console.log(`\nFetching recorder data for: ${parcelNumber}`)
  console.log(`URL: https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelNumber.replace(/:/g, '')}`)
  console.log()

  const result = await scrapeUtahCountyRecorder(parcelNumber)

  if (!result) {
    console.error('Scraper returned null — fetch failed or network error.')
    process.exit(1)
  }

  console.log('── Parsed TitleSignals ────────────────────────────')
  console.log(`  hasRecords:        ${result.hasRecords}`)
  console.log(`  documentCount5yr:  ${result.documentCount5yr}`)
  console.log(`  lastTransferDate:  ${result.lastTransferDate ?? '(none)'}`)
  console.log(`  lastTransferType:  ${result.lastTransferType ?? '(none)'}`)
  console.log(`  mortgageDocsFound: ${result.mortgageDocsFound}`)
  console.log(`  lienDocsFound:     ${result.lienDocsFound}`)
  console.log(`  releaseDocsFound:  ${result.releaseDocsFound}`)
  console.log(`  redFlags (${result.redFlags.length}):    ${result.redFlags.join(', ') || '(none)'}`)
  console.log(`  yellowFlags (${result.yellowFlags.length}): ${result.yellowFlags.join(', ') || '(none)'}`)

  if (!result.hasRecords) {
    console.log('\nNo document table found. Check HTML manually.')
  }
}

main()
  .catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
