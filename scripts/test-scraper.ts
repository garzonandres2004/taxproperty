/**
 * Quick test of the fixed scraper
 */

import { scrapeDocumentList } from '../src/lib/title/utah-county-scraper'

async function testScraper() {
  console.log('=== Testing Fixed Utah County Scraper ===\n')

  // Test with property 03:060:0016
  const parcelNumber = '03:060:0016'
  console.log(`Fetching documents for parcel: ${parcelNumber}`)

  const documents = await scrapeDocumentList(parcelNumber)

  console.log(`\n✅ Found ${documents.length} documents\n`)

  console.log('First 10 documents:')
  documents.slice(0, 10).forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.entry}-${doc.year} | ${doc.type} | ${doc.date} | ${doc.party1.substring(0, 30)} → ${doc.party2.substring(0, 30)}`)
  })

  console.log('\n=== Document Types Found ===')
  const typeCounts = new Map<string, number>()
  documents.forEach(d => {
    typeCounts.set(d.type, (typeCounts.get(d.type) || 0) + 1)
  })
  typeCounts.forEach((count, type) => {
    console.log(`  ${type}: ${count}`)
  })
}

testScraper().catch(console.error)
