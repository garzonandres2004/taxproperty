#!/usr/bin/env tsx
/**
 * Auction Triage - Tooele County (May 7, 2026)
 * Fast assessment for auction bidding decisions
 *
 * Usage:
 *   npm run triage:tooele
 *   npm run triage:tooele --limit=10
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TriageResult {
  propertyId: string
  parcelNumber: string
  address: string | null
  owner: string | null
  amountDue: number | null
  marketValue: number | null
  investabilityScore: number | null
  scoreV2: number | null
  dataGaps: { reason: string; level: string }[]
  hasTitleSignals: boolean
  lastTransferDate: string | null
  manualLookupUrl: string
  status: 'GO' | 'CAUTION' | 'RESEARCH' | 'SKIP'
  notes: string[]
}

async function triageProperty(property: any): Promise<TriageResult> {
  const normalizedParcel = property.parcel_number?.replace(/[^0-9]/g, '').trim() || ''

  const result: TriageResult = {
    propertyId: property.id,
    parcelNumber: property.parcel_number,
    address: property.property_address,
    owner: property.owner_name,
    amountDue: property.total_amount_due,
    marketValue: property.estimated_market_value,
    investabilityScore: property.investability_score,
    scoreV2: property.confidence_score_v2,
    dataGaps: [],
    hasTitleSignals: false,
    lastTransferDate: null,
    eagleWebUrl: `https://erecording.tooeleco.gov/eaglesoftware/taxweb/accountSearch.jsp`,
    status: 'RESEARCH',
    notes: []
  }

  // Get data gaps
  const dataGaps = await prisma.dataGap.findMany({
    where: { property_id: property.id, resolved: false },
    select: { reason: true, level: true }
  })
  result.dataGaps = dataGaps

  // Parse title signals from notes (EagleWeb data)
  const notes = property.notes || ''
  const eagleWebMatch = notes.match(/EagleWeb: (\d+) docs, Last: ([^,]+) \(([^)]+)\)/)
  if (eagleWebMatch) {
    result.hasTitleSignals = true
    result.lastTransferDate = eagleWebMatch[2] !== 'N/A' ? eagleWebMatch[2] : null
  }

  // Determine status for auction
  const hasCriticalGaps = dataGaps.some(g => g.level === 'C')
  const noMarketValue = !property.estimated_market_value
  const noCoords = !property.latitude
  const lowScore = (property.investability_score || 0) < 30
  const missingPhysical = !property.year_built && !property.building_sqft

  if (hasCriticalGaps) {
    result.status = 'SKIP'
    result.notes.push('Critical data gaps - avoid')
  } else if (noMarketValue || noCoords || missingPhysical) {
    result.status = 'CAUTION'
    result.notes.push('Missing key data - verify before bidding')
  } else if (property.investability_score && property.investability_score >= 60) {
    result.status = 'GO'
    result.notes.push('Good candidate - verify title manually')
  } else {
    result.status = 'RESEARCH'
    result.notes.push('Needs more research')
  }

  if (!result.hasTitleSignals) {
    result.notes.push('No title records in EagleWeb')
  }

  return result
}

async function runTriage(options: { limit?: number }) {
  console.log('═'.repeat(80))
  console.log('TOOELE COUNTY AUCTION TRIAGE')
  console.log('Auction Date: May 7, 2026 (2 days)')
  console.log('Platform: Public Surplus')
  console.log('Deposit: $500 per property')
  console.log('═'.repeat(80))

  // Get Tooele properties
  const properties = await prisma.property.findMany({
    where: { county: 'tooele' },
    take: options.limit || 29,
    select: {
      id: true,
      parcel_number: true,
      property_address: true,
      owner_name: true,
      total_amount_due: true,
      estimated_market_value: true,
      investability_score: true,
      confidence_score_v2: true,
      latitude: true,
      year_built: true,
      building_sqft: true,
      notes: true
    }
  })

  console.log(`\nProcessing ${properties.length} Tooele properties...\n`)

  // Run triage
  const results: TriageResult[] = []
  for (const property of properties) {
    const triage = await triageProperty(property)
    results.push(triage)
  }

  // Summary
  const byStatus = {
    GO: results.filter(r => r.status === 'GO'),
    CAUTION: results.filter(r => r.status === 'CAUTION'),
    RESEARCH: results.filter(r => r.status === 'RESEARCH'),
    SKIP: results.filter(r => r.status === 'SKIP')
  }

  console.log('═'.repeat(80))
  console.log('TRIAGE SUMMARY')
  console.log('═'.repeat(80))
  console.log(`\n📊 Status Distribution:`)
  console.log(`  🟢 GO:        ${byStatus.GO.length} properties`)
  console.log(`  🟡 CAUTION:   ${byStatus.CAUTION.length} properties`)
  console.log(`  🔵 RESEARCH:  ${byStatus.RESEARCH.length} properties`)
  console.log(`  🔴 SKIP:      ${byStatus.SKIP.length} properties`)

  // Quick reference table
  console.log(`\n📋 QUICK REFERENCE LIST`)
  console.log('-'.repeat(100))
  console.log(`${'Status'.padEnd(10)} ${'Parcel'.padEnd(15)} ${'Score'.padEnd(6)} ${'Amount Due'.padEnd(12)} ${'Market Value'.padEnd(14)} ${'Title'.padEnd(8)} Address`)
  console.log('-'.repeat(100))

  for (const r of results) {
    const score = r.investabilityScore ? Math.round(r.investabilityScore).toString() : 'N/A'
    const amount = r.amountDue ? `$${Math.round(r.amountDue).toLocaleString()}` : 'N/A'
    const market = r.marketValue ? `$${Math.round(r.marketValue/1000)}k` : 'N/A'
    const title = r.hasTitleSignals ? '✓ Auto' : '⚠ Manual'
    const addr = (r.address || 'N/A').slice(0, 25)
    console.log(`${r.status.padEnd(10)} ${r.parcelNumber.slice(0, 14).padEnd(15)} ${score.padEnd(6)} ${amount.padEnd(12)} ${market.padEnd(14)} ${title.padEnd(8)} ${addr}`)
  }

  // GO candidates
  if (byStatus.GO.length > 0) {
    console.log(`\n\n🟢 GO CANDIDATES (Ready for bidding)`)
    console.log('═'.repeat(80))
    for (const r of byStatus.GO) {
      console.log(`\nParcel: ${r.parcelNumber}`)
      console.log(`  Address: ${r.address || 'N/A'}`)
      console.log(`  Owner: ${r.owner || 'N/A'}`)
      console.log(`  Amount Due: $${r.amountDue?.toLocaleString() || 'N/A'}`)
      console.log(`  Est. Market Value: $${r.marketValue?.toLocaleString() || 'N/A'}`)
      console.log(`  Score: ${r.investabilityScore ? Math.round(r.investabilityScore) : 'N/A'}`)
      console.log(`  Title: ${r.hasTitleSignals ? 'EagleWeb ✓' : 'No records'}`)
      console.log(`  Last Transfer: ${r.lastTransferDate || 'N/A'}`)
    }
  }

  // CAUTION list
  if (byStatus.CAUTION.length > 0) {
    console.log(`\n\n🟡 CAUTION (Verify before bidding)`)
    console.log('═'.repeat(80))
    for (const r of byStatus.CAUTION) {
      console.log(`\nParcel: ${r.parcelNumber}`)
      console.log(`  Address: ${r.address || 'N/A'}`)
      console.log(`  Score: ${r.investabilityScore ? Math.round(r.investabilityScore) : 'N/A'}`)
      console.log(`  Notes: ${r.notes.join(', ')}`)
      console.log(`  EagleWeb: ${r.eagleWebUrl}`)
    }
  }

  console.log('\n' + '═'.repeat(80))
  console.log('AUCTION CHECKLIST')
  console.log('═'.repeat(80))
  console.log('✓ Review GO candidates manually in EagleWeb')
  console.log('✓ Verify title for CAUTION properties')
  console.log('✓ Confirm deposit ($500) via wire transfer')
  console.log('✓ Check Public Surplus platform for updates')
  console.log('✓ Note: 8% buyer premium added to winning bid')
  console.log('═'.repeat(80))
}

// Parse args
const args = process.argv.slice(2)
const options: { limit?: number } = {}

for (const arg of args) {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1])
  }
}

runTriage(options)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
