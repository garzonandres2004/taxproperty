#!/usr/bin/env tsx
// Generate InvestorMemo JSON + Markdown for all properties in one county.
//
// Usage:
//   npx tsx scripts/generate-memos.ts --county tooele
//   npx tsx scripts/generate-memos.ts --county rich
//   npx tsx scripts/generate-memos.ts --county sanpete
//   npx tsx scripts/generate-memos.ts --county tooele --parcel 0610100015

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'
import type { PropertyForMemo } from '../src/lib/memo/generate'
import { generateInvestorMemo } from '../src/lib/memo/generate'
import { renderReportMarkdown, renderMemoMarkdown } from '../src/lib/memo/render'

const prisma = new PrismaClient()

function parseArgs(): { county: string; parcel?: string } {
  const args = process.argv.slice(2)
  let county = ''
  let parcel: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--county' && args[i + 1]) county = args[i + 1].toLowerCase()
    if (args[i] === '--parcel' && args[i + 1]) parcel = args[i + 1]
  }

  if (!county) {
    console.error('Usage: generate-memos.ts --county <tooele|rich|sanpete> [--parcel <id>]')
    process.exit(1)
  }

  return { county, parcel }
}

async function loadProperties(county: string, parcel?: string): Promise<PropertyForMemo[]> {
  const where = parcel
    ? { county, parcel_number: parcel }
    : { county, status: { notIn: ['removed', 'redeemed'] } }

  const properties = await prisma.property.findMany({
    where,
    include: {
      titleSignals: true,
      zoningProfile: true,
      data_gaps: { where: { resolved: false } },
      titleAnalysis: true,
      red_flags: { where: { is_resolved: false } },
    },
    orderBy: { investability_score: 'desc' },
  })

  return properties as unknown as PropertyForMemo[]
}

async function main() {
  const { county, parcel } = parseArgs()

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  INVESTOR MEMO GENERATOR`)
  console.log(`  County: ${county}${parcel ? `  Parcel: ${parcel}` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)

  const properties = await loadProperties(county, parcel)

  if (properties.length === 0) {
    console.log(`No active properties found for county="${county}"${parcel ? ` parcel="${parcel}"` : ''}.`)
    process.exit(0)
  }

  console.log(`Loaded ${properties.length} properties. Generating memos...`)

  const memos = properties.map(p => {
    try {
      return generateInvestorMemo(p)
    } catch (err) {
      console.error(`  Error generating memo for ${p.parcel_number}: ${(err as Error).message}`)
      return null
    }
  }).filter(Boolean) as ReturnType<typeof generateInvestorMemo>[]

  const sorted = [...memos].sort((a, b) => b.scores.total - a.scores.total)

  // Print summary to console
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  SUMMARY — ${memos.length} memos (sorted by score)`)
  console.log(`${'─'.repeat(60)}`)
  const colW = [14, 22, 10, 6]
  console.log(
    'Parcel'.padEnd(colW[0]) +
    'Owner'.padEnd(colW[1]) +
    'Rec'.padEnd(colW[2]) +
    'Score'.padEnd(colW[3])
  )
  console.log('─'.repeat(colW.reduce((a, b) => a + b, 0)))
  for (const m of sorted) {
    const owner = (m.keyFacts.owner ?? '—').slice(0, 20)
    console.log(
      m.parcelId.padEnd(colW[0]) +
      owner.padEnd(colW[1]) +
      m.recommendation.padEnd(colW[2]) +
      `${m.scores.total}/18`.padEnd(colW[3])
    )
  }
  console.log('')

  // Write output files
  const outDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const dateStr = new Date().toISOString().slice(0, 10)
  const baseName = parcel
    ? `memo-${county}-${parcel}-${dateStr}`
    : `memos-${county}-${dateStr}`

  const jsonPath = path.join(outDir, `${baseName}.json`)
  const mdPath = path.join(outDir, `${baseName}.md`)

  fs.writeFileSync(jsonPath, JSON.stringify(sorted, null, 2))

  const md = parcel && sorted.length === 1
    ? renderMemoMarkdown(sorted[0])
    : renderReportMarkdown(sorted, county, dateStr)
  fs.writeFileSync(mdPath, md)

  console.log(`Output written:`)
  console.log(`  JSON: ${jsonPath}`)
  console.log(`  MD:   ${mdPath}`)

  // Print the first memo to stdout if single parcel mode
  if (parcel && sorted.length === 1) {
    console.log('\n' + '═'.repeat(60))
    console.log(renderMemoMarkdown(sorted[0]))
  }

  // GO/CAUTION parcels callout
  const goParcels = sorted.filter(m => m.recommendation === 'GO')
  const cautionParcels = sorted.filter(m => m.recommendation === 'CAUTION')
  if (goParcels.length > 0) {
    console.log(`\nGO parcels (${goParcels.length}):`)
    for (const m of goParcels) {
      console.log(`  ${m.parcelId} — ${m.keyFacts.owner ?? '—'} — score ${m.scores.total}/18 — max bid ${m.maxBidInclusivePremium ? `$${m.maxBidInclusivePremium.toLocaleString()}` : '—'}`)
    }
  }
  if (cautionParcels.length > 0) {
    console.log(`\nCAUTION parcels (${cautionParcels.length}):`)
    for (const m of cautionParcels) {
      console.log(`  ${m.parcelId} — ${m.keyFacts.owner ?? '—'} — score ${m.scores.total}/18`)
    }
  }
  console.log('')
}

main()
  .catch(err => { console.error('FATAL:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
