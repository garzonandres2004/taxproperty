#!/usr/bin/env tsx
// Tooele County Auction Triage — 2026-05-07
// Outputs a ranked decision table for all Tooele properties.
// Usage:
//   npm run tooele:triage
//   tsx scripts/tooele-triage.ts [minScore]
//
// Columns: rank | parcel | address | due | mkt_value | equity% | score | bucket | gaps | title_status

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const MIN_SCORE = parseFloat(process.argv[2] ?? '0')
const EAGLE_SOFTWARE_URL = 'https://erecording.tooeleco.gov/eaglesoftware/web/'

function fmt(n: number | null | undefined, prefix = '$'): string {
  if (n == null) return '-'
  if (prefix === '$') return `$${n.toLocaleString()}`
  return n.toFixed(1)
}

function equityPct(mkt: number | null, due: number | null): string {
  if (!mkt || !due) return '-'
  return Math.round(((mkt - due) / mkt) * 100) + '%'
}

function bucketShort(bucket: string | null): string {
  switch (bucket) {
    case 'TOP_TARGET':    return 'TOP'
    case 'BID_CANDIDATE': return 'BID'
    case 'WATCHLIST':     return 'WATCH'
    case 'RESEARCH':      return 'RES'
    case 'AVOID':         return 'AVOID'
    default:              return '?'
  }
}

async function main() {
  const properties = await prisma.property.findMany({
    where: {
      county: 'tooele',
      is_seed: false,
      ...(MIN_SCORE > 0 ? { investability_score: { gte: MIN_SCORE } } : {})
    },
    orderBy: { investability_score: 'desc' },
    include: {
      titleSignals: true,
      dataGaps: {
        where: { resolved: false },
        select: { level: true, phase: true, reason: true }
      }
    }
  })

  if (properties.length === 0) {
    console.error('No Tooele properties found.')
    process.exit(1)
  }

  const auctionDate = '2026-05-07 (Thu)'
  console.log(`\n═══════════════════════════════════════════════════════════════════`)
  console.log(`  TOOELE COUNTY AUCTION TRIAGE — ${auctionDate}`)
  console.log(`  Platform: Public Surplus  |  ${properties.length} properties ranked by V2 score`)
  console.log(`  ⚠ Title: manual lookup required — ${EAGLE_SOFTWARE_URL}`)
  console.log(`═══════════════════════════════════════════════════════════════════\n`)

  const bucketGroups: Record<string, typeof properties> = {
    TOP_TARGET: [],
    BID_CANDIDATE: [],
    WATCHLIST: [],
    RESEARCH: [],
    AVOID: []
  }

  for (const p of properties) {
    const bucket = p.recommendation_bucket ?? 'RESEARCH'
    if (!bucketGroups[bucket]) bucketGroups[bucket] = []
    bucketGroups[bucket].push(p)
  }

  let rank = 0
  for (const [bucket, props] of Object.entries(bucketGroups)) {
    if (props.length === 0) continue

    const header = bucket === 'TOP_TARGET' ? '★ TOP TARGETS' :
                   bucket === 'BID_CANDIDATE' ? '▶ BID CANDIDATES' :
                   bucket === 'WATCHLIST' ? '◎ WATCHLIST' :
                   bucket === 'RESEARCH' ? '? RESEARCH NEEDED' : '✗ AVOID'

    console.log(`── ${header} ──────────────────────────────────────────────`)

    for (const p of props) {
      rank++
      const gapLevels = [...new Set(p.dataGaps.map(g => g.level))].sort().join('')
      const gapStr = gapLevels ? `gaps:${gapLevels}` : 'no-gaps'
      const titleStr = p.titleSignals ? 'title:auto' : 'title:MANUAL'

      const addr = p.property_address
        ? p.property_address.replace(/\n/g, ' ').slice(0, 35)
        : '(no address)'

      console.log(
        `  #${String(rank).padEnd(2)} ${p.parcel_number.padEnd(14)} ` +
        `${fmt(p.total_amount_due).padEnd(12)} ` +
        `mkt:${fmt(p.estimated_market_value).padEnd(12)} ` +
        `eq:${equityPct(p.estimated_market_value, p.total_amount_due).padStart(5)} ` +
        `score:${fmt(p.investability_score, '').padEnd(5)} ` +
        `[${bucketShort(p.recommendation_bucket)}] ` +
        `${gapStr} ${titleStr}`
      )
      console.log(`       ${addr}`)
      console.log(`       Recorder: ${EAGLE_SOFTWARE_URL} (search by parcel: ${p.parcel_number})`)
    }
    console.log()
  }

  // Summary stats
  const topBid = properties.filter(p => ['TOP_TARGET', 'BID_CANDIDATE'].includes(p.recommendation_bucket ?? ''))
  const totalDue = topBid.reduce((s, p) => s + (p.total_amount_due ?? 0), 0)
  const avgEquity = topBid
    .filter(p => p.estimated_market_value && p.total_amount_due)
    .map(p => ((p.estimated_market_value! - p.total_amount_due!) / p.estimated_market_value!) * 100)
    .reduce((s, v, _, a) => s + v / a.length, 0)

  console.log('── Triage Summary ──────────────────────────────────────────')
  console.log(`  Properties ranked:      ${properties.length}`)
  console.log(`  TOP + BID candidates:   ${topBid.length}`)
  console.log(`  Total due (top+bid):    ${fmt(Math.round(totalDue))}`)
  console.log(`  Avg equity (top+bid):   ${avgEquity.toFixed(0)}%`)
  console.log(`  Properties w/ title:    ${properties.filter(p => p.titleSignals).length} auto / ${properties.filter(p => !p.titleSignals).length} manual`)
  console.log()
  console.log('  ACTION REQUIRED before auction:')
  console.log(`  1. Log into Eagle Software: ${EAGLE_SOFTWARE_URL}`)
  console.log('  2. Search each BID+ parcel by parcel number')
  console.log('  3. Check for active liens, recent deeds, title issues')
  console.log('  4. Verify redemption status with Tooele County Treasurer')
  console.log(`     Treasurer: https://tooeleco.gov/departments/administration/treasurer/`)
  console.log()
}

main()
  .catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
