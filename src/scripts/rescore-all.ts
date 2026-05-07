#!/usr/bin/env tsx
// One-time script: run scoreAndSaveV2 on every non-seed property.
// Run: npx tsx src/scripts/rescore-all.ts

import { PrismaClient } from '@prisma/client'
import { scoreAndSaveV2 } from '../lib/scoring/scoring-v2'

const prisma = new PrismaClient()

async function main() {
  const ids = await prisma.property.findMany({
    where: { is_seed: false },
    select: { id: true, parcel_number: true, county: true }
  })

  console.log(`Scoring ${ids.length} properties...`)
  let ok = 0, fail = 0

  for (const { id, parcel_number, county } of ids) {
    try {
      await scoreAndSaveV2(prisma, id)
      ok++
    } catch (e) {
      console.error(`FAIL ${county}/${parcel_number}: ${(e as Error).message}`)
      fail++
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
