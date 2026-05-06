#!/usr/bin/env tsx
// build-properties — reads utah_auctions.csv, enriches each listing via AGRC,
// generates InvestorMemos, and writes JSON + Markdown to output/.
//
// Usage:
//   npm run build:properties
//   npm run build:properties -- --county box_elder
//   npm run build:properties -- --county salt_lake --no-memos
//   npm run build:properties -- --limit 10 --verbose

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { parseCsvToListings, enrichListing } from '@/lib/pipeline/auction-enricher'
import { fullRecordToPropertyForMemo } from '@/lib/pipeline/memo-bridge'
import { generateInvestorMemo } from '@/lib/memo/generate'
import { renderMemoMarkdown } from '@/lib/memo/render'
import type { FullPropertyRecord } from '@/lib/pipeline/auction-types'
import type { InvestorMemo } from '@/lib/memo/types'

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function flag(name: string): boolean { return args.includes(`--${name}`) }
function opt(name: string): string | undefined {
  const i = args.indexOf(`--${name}`); return i !== -1 ? args[i + 1] : undefined
}

const COUNTY_FILTER = opt('county') ?? null
const LIMIT = opt('limit') ? parseInt(opt('limit')!) : null
const NO_MEMOS = flag('no-memos')
const VERBOSE = flag('verbose')

// ── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.join(process.cwd())
const CSV_PATH = path.join(ROOT, 'output', 'utah_auctions.csv')
const OUT_DIR = path.join(ROOT, 'output')
const MEMOS_DIR = path.join(OUT_DIR, 'memos')
const RECORDS_PATH = path.join(OUT_DIR, 'full_property_records.json')
const SUMMARY_PATH = path.join(OUT_DIR, 'build_summary.json')

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number | null): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

// ── Summary stats ────────────────────────────────────────────────────────────

interface BuildSummary {
  run_id: string
  generated_at: string
  csv_source: string
  total_listings: number
  enriched: number
  agrc_hits: number
  memos_generated: number
  by_county: Array<{
    county: string
    county_display: string
    readiness: string
    listings: number
    agrc_hits: number
    with_market_value: number
    rec_counts: Record<string, number>
    earliest_end: string | null
    price_range: string
  }>
  memo_breakdown: { live: number; near_live: number; partial: number; planned: number }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    console.error('Run `npx tsx scripts/scrape-publicsurplus.ts` first.')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (!NO_MEMOS) fs.mkdirSync(MEMOS_DIR, { recursive: true })

  const runId = crypto.randomUUID()
  console.log(`\nBuild Properties Pipeline — run ${runId.slice(0, 8)}`)
  console.log(`CSV: ${CSV_PATH}`)

  // ── Load listings ──────────────────────────────────────────────────────────
  let listings = parseCsvToListings(CSV_PATH)
  console.log(`Loaded ${listings.length} listings from CSV`)

  if (COUNTY_FILTER) {
    listings = listings.filter(l => l.county === COUNTY_FILTER)
    console.log(`Filtered to county "${COUNTY_FILTER}": ${listings.length} listings`)
  }
  if (LIMIT) {
    listings = listings.slice(0, LIMIT)
    console.log(`Limiting to first ${LIMIT} listings`)
  }

  // ── Enrich ─────────────────────────────────────────────────────────────────
  console.log(`\nEnriching ${listings.length} listings via AGRC...`)
  const records: FullPropertyRecord[] = []
  const memos: InvestorMemo[] = []

  let agrcHits = 0
  let memosGenerated = 0

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]
    process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${listings.length}] ${padEnd(listing.county_display, 14)} ${padEnd(listing.parcel_id?.slice(0, 18) ?? '', 20)}`)

    const record = await enrichListing(listing, runId, 150)
    records.push(record)

    if (record.agrc_hit) agrcHits++

    if (VERBOSE) {
      const mv = record.market_value ? `MV:${fmt$(record.market_value)}` : 'NO_MV'
      const bid = fmt$(record.opening_bid)
      console.log(`\n    ${record.county_display} | ${record.parcel_id} | ${bid} bid | ${mv} | ${record.property_type} | ${record.county_readiness}`)
    }

    // Generate memo
    if (!NO_MEMOS) {
      try {
        const propForMemo = fullRecordToPropertyForMemo(record)
        const memo = generateInvestorMemo(propForMemo)
        memos.push(memo)
        memosGenerated++

        // Write markdown memo
        const mdFile = path.join(MEMOS_DIR, `${record.county}_${record.parcel_id.replace(/[^a-zA-Z0-9]/g, '_')}.md`)
        fs.writeFileSync(mdFile, renderMemoMarkdown(memo))
      } catch (err) {
        if (VERBOSE) console.log(`\n    MEMO ERROR: ${(err as Error).message.slice(0, 80)}`)
      }
    }
  }

  console.log('\n')

  // ── Write records JSON ─────────────────────────────────────────────────────
  fs.writeFileSync(RECORDS_PATH, JSON.stringify(records, null, 2))
  console.log(`Wrote ${records.length} records → ${RECORDS_PATH}`)

  // ── Build summary ──────────────────────────────────────────────────────────
  const countyMap = new Map<string, FullPropertyRecord[]>()
  for (const r of records) {
    if (!countyMap.has(r.county)) countyMap.set(r.county, [])
    countyMap.get(r.county)!.push(r)
  }

  const memo_breakdown = { live: 0, near_live: 0, partial: 0, planned: 0 }
  for (const m of memos) {
    const key = m.countyReadiness.toLowerCase().replace('-', '_') as keyof typeof memo_breakdown
    if (key in memo_breakdown) memo_breakdown[key]++
  }

  const byCounty = Array.from(countyMap.entries()).map(([county, recs]) => {
    const withMV = recs.filter(r => r.market_value != null).length
    const agrcHitsC = recs.filter(r => r.agrc_hit).length
    const ends = recs.map(r => r.auction_end).filter(Boolean).sort()
    const prices = recs.map(r => r.opening_bid).filter((n): n is number => n != null)
    const rec_counts: Record<string, number> = {}
    for (const m of memos.filter(m => m.county === county)) {
      rec_counts[m.recommendation] = (rec_counts[m.recommendation] ?? 0) + 1
    }
    return {
      county,
      county_display: recs[0].county_display,
      readiness: recs[0].county_readiness,
      listings: recs.length,
      agrc_hits: agrcHitsC,
      with_market_value: withMV,
      rec_counts,
      earliest_end: ends[0] ?? null,
      price_range: prices.length
        ? `${fmt$(Math.min(...prices))} – ${fmt$(Math.max(...prices))}`
        : '—',
    }
  }).sort((a, b) => (a.earliest_end ?? '9') < (b.earliest_end ?? '9') ? -1 : 1)

  const summary: BuildSummary = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    csv_source: CSV_PATH,
    total_listings: listings.length,
    enriched: records.length,
    agrc_hits: agrcHits,
    memos_generated: memosGenerated,
    by_county: byCounty,
    memo_breakdown,
  }

  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2))

  // ── Console report ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(90)}`)
  console.log('  PROPERTY BUILD SUMMARY')
  console.log(`${'═'.repeat(90)}`)
  console.log(`${'County'.padEnd(18)} ${'Ready'.padEnd(10)} ${'Listings'.padEnd(9)} ${'AGRC'.padEnd(6)} ${'w/MV'.padEnd(6)} ${'Recs'.padEnd(30)} ${'Earliest End'}`)
  console.log('─'.repeat(90))

  for (const c of byCounty) {
    const recStr = Object.entries(c.rec_counts).map(([r, n]) => `${r}:${n}`).join(' ') || '—'
    const endStr = c.earliest_end ? new Date(c.earliest_end).toLocaleDateString() : '—'
    console.log(
      `${padEnd(c.county_display, 18)} ${padEnd(c.readiness, 10)} ${String(c.listings).padEnd(9)} ${String(c.agrc_hits).padEnd(6)} ${String(c.with_market_value).padEnd(6)} ${padEnd(recStr, 30)} ${endStr}`
    )
  }

  console.log('─'.repeat(90))
  console.log(`Total: ${records.length} records | ${agrcHits} AGRC hits | ${memosGenerated} memos`)
  console.log(`\nMemo breakdown: LIVE=${memo_breakdown.live} NEAR_LIVE=${memo_breakdown.near_live} PARTIAL=${memo_breakdown.partial} PLANNED=${memo_breakdown.planned}`)
  console.log(`\nOutputs:`)
  console.log(`  ${RECORDS_PATH}`)
  console.log(`  ${SUMMARY_PATH}`)
  if (!NO_MEMOS) console.log(`  ${MEMOS_DIR}/ (${memosGenerated} markdown files)`)
  console.log('')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
