#!/usr/bin/env tsx
/**
 * Test canonical Tooele parcel via EagleWeb Public Viewer
 * Parcel: 0610100015 (JUNE OSBAHR JT)
 */

import { scrapeTooeleEagleWeb } from '../src/lib/title/scrapers/tooele-eagleweb'

const CANONICAL_PARCEL = '0610100015'

async function main() {
  console.log('='.repeat(70))
  console.log('TOOELE EAGLEWEB - CANONICAL TEST')
  console.log(`Parcel: ${CANONICAL_PARCEL}`)
  console.log('Method: Public Web Limited Viewer (no login required)')
  console.log('='.repeat(70))
  console.log('')

  const startTime = Date.now()

  try {
    const result = await scrapeTooeleEagleWeb(CANONICAL_PARCEL)
    const duration = Date.now() - startTime

    if (!result) {
      console.log('❌ Scraping failed')
      process.exit(1)
    }

    console.log(`✅ Success (${duration}ms)`)
    console.log('')
    console.log('--- Title Signals ---')
    console.log(`Has Records:           ${result.hasRecords ? '✅ YES' : '❌ NO'}`)
    console.log(`Documents (5 years):     ${result.documentCount5yr}`)
    console.log(`Last Transfer Date:      ${result.lastTransferDate || 'N/A'}`)
    console.log(`Last Transfer Type:      ${result.lastTransferType || 'N/A'}`)
    console.log(`Mortgage Documents:      ${result.mortgageDocsFound}`)
    console.log(`Lien Documents:          ${result.lienDocsFound}`)
    console.log(`Release Documents:       ${result.releaseDocsFound}`)

    if (result.redFlags.length > 0) {
      console.log('')
      console.log('🚩 RED FLAGS:')
      result.redFlags.forEach(flag => console.log(`  • ${flag}`))
    }

    if (result.yellowFlags.length > 0) {
      console.log('')
      console.log('⚠️  YELLOW FLAGS:')
      result.yellowFlags.forEach(flag => console.log(`  • ${flag}`))
    }

    if (result.rawDocuments.length > 0) {
      console.log('')
      console.log('--- Recent Documents ---')
      result.rawDocuments.slice(0, 5).forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.date} - ${doc.type}`)
        if (doc.grantor || doc.grantee) {
          console.log(`      ${doc.grantor} → ${doc.grantee}`)
        }
      })
    }

    console.log('')
    console.log('--- Verification ---')
    console.log('Owner: JUNE OSBAHR JT')
    console.log('Mailing: PO BOX 834 TOOELE, UT 84074')
    console.log('Platform: Public Surplus (Tooele County Tax Sale)')
    console.log('')
    console.log('Compare with manual lookup at:')
    console.log('  https://erecording.tooeleco.gov/eaglesoftware/web/login.jsp')
    console.log('  → Click "Public Web Limited Viewer" → Enter → Search 0610100015')
    console.log('')
    console.log('='.repeat(70))

    process.exit(0)

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
