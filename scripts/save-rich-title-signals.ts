#!/usr/bin/env tsx
// One-off: run the Rich County recorder scraper for all Rich properties
// and save TitleSignals to the DB.
//
// Usage: npx tsx scripts/save-rich-title-signals.ts

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'
import { scrapeRichCounty, saveRichTitleSignals } from '../src/lib/title/scrapers/rich-county'

const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({
    where: { county: 'rich', parcel_number: { not: undefined } },
    select: { id: true, parcel_number: true, owner_name: true }
  })

  console.log(`Found ${properties.length} Rich County properties`)

  for (const p of properties) {
    console.log(`\n[${p.parcel_number}] ${p.owner_name ?? '—'}`)
    try {
      const result = await scrapeRichCounty(p.parcel_number)
      if (result) {
        await saveRichTitleSignals(prisma, p.id, result)
        console.log(`  Saved: hasRecords=${result.hasRecords}, docs5yr=${result.documentCount5yr}, redFlags=${result.redFlags.length}`)
      } else {
        console.log('  No result (scraper returned null)')
      }
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`)
    }
  }
}

main()
  .catch(err => { console.error('FATAL:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
