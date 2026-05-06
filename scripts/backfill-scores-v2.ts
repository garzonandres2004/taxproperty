// Backfill Scoring V2 for all active properties
// Usage: npx ts-node --project tsconfig.scripts.json scripts/backfill-scores-v2.ts

import { PrismaClient } from '@prisma/client'
import { scoreAndSaveV2 } from '../src/lib/scoring/scoring-v2'

const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({
    where: { is_seed: false },
    select: { id: true, parcel_number: true, county: true }
  })

  console.log(`Backfilling V2 scores for ${properties.length} properties...`)

  const counts: Record<string, number> = {
    TOP_TARGET: 0,
    BID_CANDIDATE: 0,
    WATCHLIST: 0,
    RESEARCH: 0,
    AVOID: 0,
    error: 0
  }

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    try {
      const scores = await scoreAndSaveV2(prisma, prop.id)
      if (scores) {
        counts[scores.recommendation_bucket] = (counts[scores.recommendation_bucket] ?? 0) + 1
      }
    } catch (err) {
      counts.error++
      console.error(`  Error on ${prop.parcel_number} (${prop.county}): ${(err as Error).message}`)
    }

    if ((i + 1) % 50 === 0 || i === properties.length - 1) {
      console.log(`  [${i + 1}/${properties.length}] processed`)
    }
  }

  console.log('\nDone. Distribution:')
  for (const [bucket, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${bucket}: ${count}`)
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
