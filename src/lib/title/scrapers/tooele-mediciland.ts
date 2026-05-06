// Tooele County Recorder - Mediciland Scraper
// https://search.tooeleco.gov.mediciland.com/
// Public access, simpler interface than EagleWeb

import { chromium } from 'playwright'
import { TooeleRecorderResult } from './tooele-county'

const MEDICILAND_URL = 'https://search.tooeleco.gov.mediciland.com/'

export async function scrapeMediciland(
  parcelNumber: string
): Promise<TooeleRecorderResult | null> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const normalized = parcelNumber.replace(/[^0-9]/g, '').trim()
    console.log(`[Mediciland] Searching: ${normalized}`)

    // Navigate to Mediciland
    await page.goto(MEDICILAND_URL, { waitUntil: 'networkidle' })
    console.log('[Mediciland] Page loaded')

    // Look for search input
    await page.waitForTimeout(2000)

    // Take screenshot to debug
    await page.screenshot({ path: '/tmp/mediciland-page.png' })
    console.log('[Mediciland] Screenshot saved')

    // Try to find and fill search input
    const searchSelectors = [
      'input[type="search"]',
      'input[name*="search"]',
      'input[placeholder*="parcel"]',
      'input[placeholder*="search"]',
      '#search',
      '.search-input',
      'input'
    ]

    let searchInput: any = null
    for (const selector of searchSelectors) {
      try {
        const input = page.locator(selector).first()
        if (await input.isVisible({ timeout: 2000 })) {
          searchInput = input
          console.log(`[Mediciland] Found search input: ${selector}`)
          break
        }
      } catch {}
    }

    if (!searchInput) {
      console.log('[Mediciland] Could not find search input')
      const html = await page.content()
      require('fs').writeFileSync('/tmp/mediciland-html.html', html)
      return null
    }

    // Enter parcel number
    await searchInput.fill(normalized)
    await searchInput.press('Enter')
    await page.waitForTimeout(3000)

    // Check for results
    const html = await page.content()
    const url = page.url()

    console.log(`[Mediciland] Current URL: ${url}`)

    // Save final state
    await page.screenshot({ path: '/tmp/mediciland-results.png' })
    require('fs').writeFileSync('/tmp/mediciland-results.html', html)

    // Parse results if available
    // This is where we'd extract document data
    // For now, return placeholder
    return {
      hasRecords: html.includes('parcel') || html.includes('result'),
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: ['Mediciland parsing not yet implemented'],
      yellowFlags: []
    }

  } catch (error) {
    console.error('[Mediciland] Error:', error)
    return null
  } finally {
    await browser.close()
  }
}
