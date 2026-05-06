#!/usr/bin/env tsx
/**
 * Debug script: Tooele County Title Signals via Browser Automation
 * Usage:
 *   npm run debug:tooele-title [parcelNumber]
 *
 * Default: canonical test case 0610100015 (JUNE OSBAHR JT)
 */

import { scrapeTooeleWithBrowser, TooeleBrowserScraper } from '../src/lib/title/scrapers/tooele-browser'
import { TOOELE_RECORDER_URLS } from '../src/lib/title/scrapers/tooele-county'

const CANONICAL_TEST_PARCEL = '0610100015'  // JUNE OSBAHR JT

async function main() {
  const parcelNumber = process.argv[2] || CANONICAL_TEST_PARCEL

  console.log('='.repeat(70))
  console.log(`Tooele County Title Signals - Browser Automation`)
  console.log(`Parcel: ${parcelNumber}`)
  console.log('='.repeat(70))
  console.log('Source: EagleWeb (Playwright automation)')
  console.log('')

  const startTime = Date.now()

  try {
    const result = await scrapeTooeleWithBrowser(parcelNumber)
    const duration = Date.now() - startTime

    if (!result) {
      console.log('❌ Browser automation failed - see errors above')
      console.log('')
      console.log('FALLBACK: Manual lookup via:')
      console.log(`  ${TOOELE_RECORDER_URLS.login}`)
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

    console.log('')
    console.log('--- Source Links ---')
    console.log(`EagleWeb: ${TOOELE_RECORDER_URLS.login}`)
    console.log(`Mediciland: ${TOOELE_RECORDER_URLS.mediciland}?q=${parcelNumber}`)
    console.log('')

    // Canonical test case
    if (parcelNumber === CANONICAL_TEST_PARCEL) {
      console.log('--- Canonical Test Case ---')
      console.log('Parcel: 0610100015')
      console.log('Owner: JUNE OSBAHR JT')
      console.log('Mailing: PO BOX 834 TOOELE, UT 84074')
      console.log('Platform: Public Surplus (Tooele County Tax Sale)')
      console.log('')
      console.log('VERIFICATION:')
      console.log('Compare document counts above with manual EagleWeb lookup')
    }

    console.log('')
    console.log('='.repeat(70))

    // Exit with success
    process.exit(0)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
