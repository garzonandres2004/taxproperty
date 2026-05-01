/**
 * Full end-to-end title analysis test
 */

import { scrapeDocumentList, scrapeDocumentDetail } from '../src/lib/title/utah-county-scraper'
import { analyzeTitleChain } from '../src/lib/title/title-analyzer'
import { analyzePropertyDocuments } from '../src/lib/title/pdf-analyzer'

async function testFullAnalysis() {
  const parcelNumber = '03:060:0016'

  console.log('=== Full Title Analysis Test ===\n')
  console.log(`Parcel: ${parcelNumber}\n`)

  // Step 1: Scrape document list
  console.log('Step 1: Scraping document list...')
  const documents = await scrapeDocumentList(parcelNumber)
  console.log(`✅ Found ${documents.length} documents\n`)

  // Show first 5 documents
  console.log('Sample documents:')
  documents.slice(0, 5).forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.entry}-${doc.year} | ${doc.type} | ${doc.recordedDate}`)
    console.log(`     ${doc.party1.substring(0, 40)} → ${doc.party2.substring(0, 40)}`)
  })
  console.log()

  // Step 2: Fetch document details for first few
  console.log('Step 2: Fetching document details (first 3)...')
  const documentDetails: Record<string, any> = {}
  for (let i = 0; i < Math.min(3, documents.length); i++) {
    const doc = documents[i]
    const detail = await scrapeDocumentDetail(doc.entry, doc.year)
    if (detail) {
      documentDetails[`${doc.entry}-${doc.year}`] = detail
      console.log(`✅ ${doc.entry}-${doc.year}: ${detail.kindOfInstrument || 'No details'}`)
    }
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  console.log()

  // Step 3: Try PDF analysis (may fail due to auth, that's OK)
  console.log('Step 3: Attempting document PDF analysis (first 2)...')
  let pdfResults: any = { analyses: [], aggregatedWarnings: [], hasCriticalIssues: false }
  try {
    const pdfDocs = documents.slice(0, 2).map(d => ({
      entry: d.entry,
      year: d.year,
      type: d.type,
      party1: d.party1,
      party2: d.party2
    }))
    pdfResults = await analyzePropertyDocuments(pdfDocs, 2)
    console.log(`✅ PDF analysis complete: ${pdfResults.analyses.length} documents`)
    if (pdfResults.aggregatedWarnings.length > 0) {
      console.log(`⚠️ Warnings: ${pdfResults.aggregatedWarnings.length}`)
    }
  } catch (error) {
    console.log('⚠️ PDF analysis skipped (BMI requires authentication)')
  }
  console.log()

  // Step 4: Run full title analysis
  console.log('Step 4: Running title chain analysis...')
  const analysis = await analyzeTitleChain(documents, { analyzePDFs: false })

  console.log('\n=== TITLE ANALYSIS RESULTS ===\n')
  console.log(`Score: ${analysis.score}/100`)
  console.log(`Recommendation: ${analysis.recommendation.toUpperCase()}`)
  console.log(`Complexity: ${analysis.titleComplexity}`)
  console.log(`Mortgage Status: ${analysis.mortgageStatus}`)
  console.log(`Years Same Owner: ${analysis.yearsSameOwner || 'Unknown'}`)
  console.log(`Est. Quiet Title Cost: $${analysis.estimatedQuietTitleCost.toLocaleString()}`)
  console.log()

  console.log('Summary:')
  console.log(analysis.summary)
  console.log()

  console.log(`Red Flags: ${analysis.redFlags.length}`)
  analysis.redFlags.slice(0, 3).forEach(flag => {
    console.log(`  ⚠️ [${flag.severity}] ${flag.type}: ${flag.description}`)
  })
  console.log()

  console.log(`Yellow Flags: ${analysis.yellowFlags.length}`)
  analysis.yellowFlags.slice(0, 3).forEach(flag => {
    console.log(`  ⚡ ${flag.type}: ${flag.description}`)
  })
  console.log()

  console.log(`Green Flags: ${analysis.greenFlags.length}`)
  analysis.greenFlags.slice(0, 3).forEach(flag => {
    console.log(`  ✅ ${flag.type}: ${flag.description}`)
  })
  console.log()

  console.log('Ownership Chain (recent):')
  analysis.ownershipChain.slice(-3).forEach((event, i) => {
    console.log(`  ${i + 1}. ${event.date}: ${event.type} ${event.from.substring(0, 30)} → ${event.to.substring(0, 30)}`)
  })
  console.log()

  console.log('Recommended Actions:')
  analysis.recommendedActions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action}`)
  })

  console.log('\n✅ Full analysis complete!')
}

testFullAnalysis().catch(console.error)
