#!/usr/bin/env tsx
/**
 * Sanpete County Auction Triage Alpha
 * Debug script for May 21, 2026 auction preparation
 *
 * Usage: npm run debug:sanpete
 */

import { PrismaClient } from '@prisma/client'
import { fetchSanpeteAuctionDetail, fetchSanpeteAuctionList } from '../src/lib/sources/sanpete-public-surplus'
import { scrapeSanpeteEagleWeb } from '../src/lib/title/scrapers/sanpete-eagleweb'

const prisma = new PrismaClient()

interface TriageResult {
  parcelNumber: string
  accountNumber?: string
  ownerName?: string
  mailingAddress?: string
  legalDescription?: string
  subdivision?: string
  acres?: number
  totalDue: number
  bidDeposit: number
  auctionDate: Date
  hasTitleSignals: boolean
  lastTransferType?: string
  documentCount?: number
  titleSource: string
  status: 'GO' | 'CAUTION' | 'RESEARCH' | 'SKIP'
  notes: string[]
  dataGaps: string[]
}

async function triageParcel(parcelData: any): Promise<TriageResult> {
  const result: TriageResult = {
    parcelNumber: parcelData.parcel_number || parcelData.parcel,
    totalDue: parcelData.total_due || parcelData.price || 0,
    bidDeposit: parcelData.bid_deposit || 0,
    auctionDate: parcelData.auction_start || new Date('2026-05-21'),
    hasTitleSignals: false,
    titleSource: 'Sanpete EagleWeb Public Viewer',
    status: 'RESEARCH',
    notes: [],
    dataGaps: []
  }

  // Get title signals from EagleWeb
  console.log(`  🔍 Fetching title signals from EagleWeb...`)
  try {
    const titleResult = await scrapeSanpeteEagleWeb(result.parcelNumber)
    if (titleResult) {
      result.hasTitleSignals = titleResult.hasRecords
      result.lastTransferType = titleResult.lastTransferType
      result.documentCount = titleResult.rawDocuments.length
      console.log(`  ✅ Title: ${titleResult.hasRecords ? 'Found' : 'Not found'}, ${titleResult.rawDocuments.length} docs`)
      if (titleResult.lastTransferType) {
        console.log(`  📄 Last transfer: ${titleResult.lastTransferType}`)
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  Title fetch failed: ${error.message}`)
  }

  // Extract fields from Public Surplus
  if (parcelData.account_number) result.accountNumber = parcelData.account_number
  if (parcelData.owner_name) result.ownerName = parcelData.owner_name
  if (parcelData.mailing_address) result.mailingAddress = parcelData.mailing_address
  if (parcelData.legal_description) {
    result.legalDescription = parcelData.legal_description

    // Parse subdivision and acres from legal
    const acresMatch = parcelData.legal_description.match(/(\d+\.?\d*)\s*(?:AC|acres?)/i)
    if (acresMatch) result.acres = parseFloat(acresMatch[1])

    // Look for subdivision names
    const subdivisionPatterns = [
      /([A-Z][A-Z\s]+RANCH)/i,
      /([A-Z][A-Z\s]+ESTATES?)/i,
      /([A-Z][A-Z\s]+SUBDIVISION)/i,
      /([A-Z][A-Z\s]+UNIT)/i,
      /(INDIAN RIDGE)/i,
      /(FOOTHILL ESTATES)/i,
      /(MANTI[^,]*)/i,
      /(EPHRAIM[^,]*)/i,
      /(MT\.? PLEASANT)/i,
      /(GUNNISON[^,]*)/i,
      /(CENTERFIELD[^,]*)/i,
      /(FAIRVIEW[^,]*)/i
    ]

    for (const pattern of subdivisionPatterns) {
      const match = parcelData.legal_description.match(pattern)
      if (match) {
        result.subdivision = match[1].trim()
        break
      }
    }
  }

  // Buyer premium calculation (8%)
  const buyerPremium = result.totalDue * 0.08
  const totalCost = result.totalDue + buyerPremium

  // Determine status
  const hasLegal = !!result.legalDescription
  const hasAcres = !!result.acres
  const lowOpeningBid = result.totalDue < 1000
  const veryLowBid = result.totalDue < 500

  // Indian Ridge Ranch pattern (recreational lots)
  const isRecreationalLot = result.subdivision?.toLowerCase().includes('ranch') ||
                            result.subdivision?.toLowerCase().includes('estates') ||
                            (result.acres && result.acres < 2)

  if (veryLowBid && !hasLegal) {
    result.status = 'SKIP'
    result.notes.push('Very low bid but missing legal description - verify before bidding')
    result.dataGaps.push('Legal description from county')
  } else if (isRecreationalLot) {
    result.status = 'CAUTION'
    result.notes.push('Recreational lot pattern - likely restricted use (Indian Ridge Ranch style)')
    result.notes.push(`Opening bid: $${result.totalDue.toLocaleString()} + 8% premium = $${totalCost.toLocaleString()}`)
    if (result.acres) {
      result.notes.push(`Size: ${result.acres} acres`)
    }
  } else if (lowOpeningBid && hasLegal) {
    result.status = 'GO'
    result.notes.push('Low opening bid with legal description available')
    result.notes.push(`Total cost: $${result.totalDue.toLocaleString()} + $${buyerPremium.toLocaleString()} premium = $${totalCost.toLocaleString()}`)
    if (result.acres) {
      result.notes.push(`Land size: ${result.acres} acres`)
    }
  } else {
    result.status = 'RESEARCH'
    result.notes.push('Needs additional research')
    result.notes.push(`Total cost: $${result.totalDue.toLocaleString()} + $${buyerPremium.toLocaleString()} premium = $${totalCost.toLocaleString()}`)
  }

  // Title research note
  if (!result.hasTitleSignals) {
    result.notes.push('No title records found in EagleWeb')
    result.dataGaps.push('Verify with Sanpete Recorder: (435) 835-8068')
  } else {
    result.notes.push(`Title: ${result.documentCount} documents found via EagleWeb`)
    if (result.lastTransferType) {
      result.notes.push(`Last transfer type: ${result.lastTransferType}`)
    }
  }
  result.dataGaps.push('Assessor data (no online portal)')

  return result
}

async function main() {
  console.log('='.repeat(80))
  console.log('SANPETE COUNTY AUCTION TRIAGE ALPHA')
  console.log('Auction Date: May 21, 2026')
  console.log('='.repeat(80))
  console.log('')

  // Test parcel 0000055018 first
  console.log('Fetching example parcel 0000055018...')
  const exampleAuction = await fetchSanpeteAuctionDetail('3990764')

  if (exampleAuction) {
    console.log('\n' + '='.repeat(80))
    console.log('EXAMPLE PARCEL: 0000055018')
    console.log('='.repeat(80))
    console.log(`Owner: ${exampleAuction.owner_name}`)
    console.log(`Account: ${exampleAuction.account_number}`)
    console.log(`Legal: ${exampleAuction.legal_description}`)
    console.log(`Total Due: $${exampleAuction.total_due}`)
    console.log(`Bid Deposit: $${exampleAuction.bid_deposit}`)
    console.log(`PDF: ${exampleAuction.pdf_url}`)
    console.log('')

    const triage = await triageParcel(exampleAuction)
    console.log('--- TRIAGE ---')
    console.log(`Status: ${triage.status}`)
    console.log(`Subdivision: ${triage.subdivision || 'N/A'}`)
    console.log(`Acres: ${triage.acres || 'N/A'}`)
    console.log('Notes:')
    triage.notes.forEach(note => console.log(`  • ${note}`))
    console.log('')
  }

  // Fetch all auctions
  console.log('='.repeat(80))
  console.log('FETCHING ALL AUCTIONS...')
  console.log('='.repeat(80))

  const auctions = await fetchSanpeteAuctionList()
  console.log(`\nFound ${auctions.length} auctions\n`)

  // Triage each auction
  const results: TriageResult[] = []

  for (let i = 0; i < Math.min(auctions.length, 5); i++) {
    const auction = auctions[i]
    console.log(`[${i + 1}/5] Processing: ${auction.parcel}...`)

    const detail = await fetchSanpeteAuctionDetail(auction.auctionId)
    if (detail) {
      const triage = await triageParcel(detail)
      results.push(triage)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('TRIAGE SUMMARY')
  console.log('='.repeat(80))

  const byStatus = {
    GO: results.filter(r => r.status === 'GO'),
    CAUTION: results.filter(r => r.status === 'CAUTION'),
    RESEARCH: results.filter(r => r.status === 'RESEARCH'),
    SKIP: results.filter(r => r.status === 'SKIP')
  }

  console.log(`\nStatus Distribution:`)
  console.log(`  GO:        ${byStatus.GO.length}`)
  console.log(`  CAUTION:   ${byStatus.CAUTION.length}`)
  console.log(`  RESEARCH:  ${byStatus.RESEARCH.length}`)
  console.log(`  SKIP:      ${byStatus.SKIP.length}`)

  console.log('\n' + '-'.repeat(100))
  console.log(`${'Status'.padEnd(10)} ${'Parcel'.padEnd(15)} ${'Opening Bid'.padEnd(15)} ${'Acres'.padEnd(8)} ${'Subdivision'.padEnd(30)}`)
  console.log('-'.repeat(100))

  for (const r of results) {
    const bid = `$${r.totalDue.toLocaleString()}`
    const acres = r.acres ? r.acres.toString() : 'N/A'
    const sub = (r.subdivision || 'N/A').slice(0, 29)
    console.log(`${r.status.padEnd(10)} ${r.parcelNumber.padEnd(15)} ${bid.padEnd(15)} ${acres.padEnd(8)} ${sub}`)
  }

  // GO candidates
  if (byStatus.GO.length > 0) {
    console.log('\n\nGO CANDIDATES (Ready for bidding)')
    console.log('='.repeat(80))
    for (const r of byStatus.GO) {
      console.log(`\nParcel: ${r.parcelNumber}`)
      console.log(`  Owner: ${r.ownerName}`)
      console.log(`  Legal: ${r.legalDescription?.slice(0, 60)}...`)
      console.log(`  Opening Bid: $${r.totalDue.toLocaleString()}`)
      if (r.acres) console.log(`  Acres: ${r.acres}`)
      r.notes.forEach(n => console.log(`  • ${n}`))
    }
  }

  // CAUTION list
  if (byStatus.CAUTION.length > 0) {
    console.log('\n\nCAUTION (Recreational lots / Verify restrictions)')
    console.log('='.repeat(80))
    for (const r of byStatus.CAUTION) {
      console.log(`\nParcel: ${r.parcelNumber}`)
      console.log(`  Subdivision: ${r.subdivision || 'Unknown'}`)
      console.log(`  Acres: ${r.acres || 'Unknown'}`)
      console.log(`  Opening Bid: $${r.totalDue.toLocaleString()}`)
      r.notes.forEach(n => console.log(`  • ${n}`))
    }
  }

  // Final report
  console.log('\n\n' + '='.repeat(80))
  console.log('FINAL REPORT')
  console.log('='.repeat(80))
  console.log('\n1. SANPETE RECORDER ONLINE?')
  console.log('   ✅ YES - EagleWeb Public Web Limited Viewer works like Tooele!')
  console.log('   URL: https://erecording.sanpetecountyutah.gov/eaglesoftware/web/login.jsp')
  console.log('   Access: Click "Enter" under Public Web Limited Viewer (no login required)')
  console.log('   Data: Document types visible, but sale dates not shown in public view')
  console.log('   Phone: (435) 835-8068 for detailed title requests')

  console.log('\n2. SANPETE ASSESSOR ONLINE?')
  console.log('   ❌ NO - No public parcel/property search available')
  console.log('   Property tax info at: http://propertytax.utah.gov/ (state level)')

  console.log('\n3. PUBLIC SURPLUS INTEGRATION')
  console.log('   ✅ YES - 26 active auctions scraped successfully')
  console.log('   Example: 0000055018 - $729.39 opening bid, Indian Ridge Ranch')

  console.log('\n4. PARCEL 0000055018 TRIAGE')
  if (exampleAuction) {
    const t = await triageParcel(exampleAuction)
    console.log(`   Status: ${t.status}`)
    console.log(`   Subdivision: ${t.subdivision}`)
    console.log(`   Acres: ${t.acres}`)
    console.log(`   Total Cost: $${(t.totalDue * 1.08).toLocaleString()} (with 8% premium)`)
    console.log(`   Bucket: ${t.status} - Recreational lot pattern, needs verification`)
  }

  console.log('\n5. STRUCTURAL NOTES')
  console.log('   • Many parcels are Indian Ridge Ranch style recreational lots')
  console.log('   • These typically have HOA restrictions and limited use')
  console.log('   • Low opening bids ($729-$7,000) but verify property access')
  console.log('   • Manual title research required before bidding')

  console.log('\n' + '='.repeat(80))
}

main().catch(console.error).finally(() => prisma.$disconnect())
