// Tooele County EagleWeb - Public Web Limited Viewer Automation
// Uses Playwright to automate the ACTUAL public access path
// Target: Button inside form with name="guest" value="true"

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const LOGIN_URL = 'https://erecording.tooeleco.gov/eaglesoftware/web/login.jsp'
const TAXWEB_BASE = 'https://erecording.tooeleco.gov/eaglesoftware/taxweb'
const SESSION_FILE = path.join(process.cwd(), '.tooele-eagleweb-session.json')

// Document type mappings
const DEED_TYPES = ['DEED', 'WARRANTY DEED', 'QUIT CLAIM DEED', 'TRUSTEE DEED', 'SPECIAL WARRANTY DEED']
const MORTGAGE_TYPES = ['MORTGAGE', 'DEED OF TRUST', 'TRUST DEED']
const LIEN_TYPES = ['LIEN', 'TAX LIEN', 'MECHANICS LIEN', 'JUDGMENT']
const RELEASE_TYPES = ['RELEASE', 'RECONVEYANCE', 'LIEN RELEASE', 'FULL RELEASE']

export interface EagleWebResult {
  hasRecords: boolean
  documentCount5yr: number
  lastTransferDate?: string
  lastTransferType?: string
  mortgageDocsFound: number
  lienDocsFound: number
  releaseDocsFound: number
  redFlags: string[]
  yellowFlags: string[]
  rawDocuments: any[]
}

export class TooeleEagleWebScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionInitialized = false

  async init(): Promise<void> {
    console.log('[EagleWeb] Initializing...')

    this.browser = await chromium.launch({
      headless: true,
      slowMo: 200
    })

    let storageState = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[EagleWeb] Loaded existing session')
      } catch {
        console.log('[EagleWeb] No valid session file')
      }
    }

    this.context = await this.browser.newContext({
      storageState: storageState as any,
      viewport: { width: 1280, height: 720 }
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(30000)

    if (!storageState) {
      await this.initializePublicSession()
    } else {
      try {
        await this.page.goto(`${TAXWEB_BASE}/accountSearch.jsp`, { waitUntil: 'domcontentloaded', timeout: 10000 })
        const url = this.page.url()
        if (url.includes('login') || url.includes('Login')) {
          console.log('[EagleWeb] Session expired, reinitializing...')
          await this.initializePublicSession()
        } else {
          console.log('[EagleWeb] Session valid')
          this.sessionInitialized = true
        }
      } catch {
        console.log('[EagleWeb] Session check failed, reinitializing...')
        await this.initializePublicSession()
      }
    }
  }

  private async initializePublicSession(): Promise<void> {
    console.log('[EagleWeb] Initializing public session...')

    await this.page!.goto(LOGIN_URL, { waitUntil: 'networkidle' })
    console.log('[EagleWeb] At login page')

    try {
      await this.page!.waitForSelector('#middle_left', { timeout: 10000 })
      console.log('[EagleWeb] Found Public Web Limited Viewer section')

      const publicViewerButton = this.page!.locator('#middle_left button[type="submit"]').first()

      if (await publicViewerButton.isVisible({ timeout: 5000 })) {
        console.log('[EagleWeb] Clicking Public Web Limited Viewer Enter button...')
        await publicViewerButton.click()
        await this.page!.waitForLoadState('networkidle')
        console.log('[EagleWeb] Button clicked, page loaded')
      } else {
        throw new Error('Public Web Limited Viewer button not visible')
      }
    } catch (error: any) {
      console.error('[EagleWeb] Failed to click Public Web Viewer:', error.message)
      throw error
    }

    await this.handleTermsPage()

    const currentUrl = this.page!.url()
    console.log(`[EagleWeb] Current URL after init: ${currentUrl}`)

    if (currentUrl.includes('taxweb') || currentUrl.includes('search')) {
      console.log('[EagleWeb] Successfully reached taxweb area')
      this.sessionInitialized = true
    } else if (currentUrl.includes('login')) {
      throw new Error('Still on login page - public access failed')
    } else {
      const hasSearch = await this.page!.locator('input[name*="search"], input[name*="parcel"], input[name*="account"]').count() > 0
      if (hasSearch) {
        console.log('[EagleWeb] Search interface found on current page')
        this.sessionInitialized = true
      } else {
        throw new Error('Cannot locate search interface')
      }
    }

    await this.saveSession()
    console.log('[EagleWeb] Session initialized and saved')
  }

  private async handleTermsPage(): Promise<void> {
    const pageContent = await this.page!.content()
    const currentUrl = this.page!.url()

    if (pageContent.includes('Terms') ||
        pageContent.includes('Conditions') ||
        pageContent.includes('Agreement') ||
        currentUrl.includes('terms') ||
        currentUrl.includes('agreement')) {

      console.log('[EagleWeb] Terms page detected, accepting...')

      const acceptSelectors = [
        'button:has-text("Accept")',
        'button:has-text("I Agree")',
        'button:has-text("Agree")',
        'input[type="submit"][value*="Accept"]',
        'input[type="submit"][value*="Agree"]',
        'button[type="submit"]'
      ]

      for (const selector of acceptSelectors) {
        try {
          const button = this.page!.locator(selector).first()
          if (await button.isVisible({ timeout: 3000 })) {
            console.log(`[EagleWeb] Clicking accept: ${selector}`)
            await button.click()
            await this.page!.waitForLoadState('networkidle')
            await this.page!.waitForTimeout(1000)
            break
          }
        } catch {}
      }
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.context) return
    const storage = await this.context.storageState()
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2))
  }

  async searchParcel(parcelNumber: string): Promise<EagleWebResult | null> {
    if (!this.sessionInitialized) {
      throw new Error('Scraper not initialized')
    }

    const normalized = parcelNumber.replace(/[^0-9]/g, '').trim()
    console.log(`[EagleWeb] Searching parcel: ${normalized}`)

    try {
      let currentUrl = this.page!.url()
      console.log(`[EagleWeb] Current page: ${currentUrl}`)

      // If we're on wrong portal, navigate directly to taxweb
      if (currentUrl.includes('geodata') || currentUrl.includes('tooelecountyonline.org')) {
        console.log('[EagleWeb] Wrong portal detected, navigating to taxweb...')
        await this.page!.goto(`${TAXWEB_BASE}/accountSearch.jsp`, { waitUntil: 'networkidle' })
        await this.handleTermsPage()
        currentUrl = this.page!.url()
      }

      // If not on taxweb search page, try to navigate there
      if (!currentUrl.includes('taxweb')) {
        console.log('[EagleWeb] Navigating to taxweb search...')
        await this.page!.goto(`${TAXWEB_BASE}/accountSearch.jsp`, { waitUntil: 'networkidle' })
        await this.handleTermsPage()
      }

      console.log('[EagleWeb] Looking for parcel input...')

      const parcelSelectors = [
        'input[name*="parcel"]',
        'input[name*="Parcel"]',
        'input[id*="parcel"]',
        'input[id*="Parcel"]',
        'input[name*="account"]',
        'input[name*="Account"]',
        'input[placeholder*="parcel" i]',
        'input[placeholder*="account" i]'
      ]

      let searchInput: any = null
      for (const selector of parcelSelectors) {
        try {
          const input = this.page!.locator(selector).first()
          if (await input.isVisible({ timeout: 2000 })) {
            searchInput = input
            console.log(`[EagleWeb] Found parcel input: ${selector}`)
            break
          }
        } catch {}
      }

      if (!searchInput) {
        const html = await this.page!.content()
        fs.writeFileSync('/tmp/eagleweb-search-fail.html', html)
        console.log('[EagleWeb] Parcel input not found, saved HTML to /tmp/eagleweb-search-fail.html')
        return null
      }

      await searchInput.fill('')
      await searchInput.fill(normalized)
      console.log(`[EagleWeb] Entered parcel: ${normalized}`)

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Search")',
        'button:has-text("Submit")',
        'a:has-text("Search")'
      ]

      let submitted = false
      for (const selector of submitSelectors) {
        try {
          const button = this.page!.locator(selector).first()
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click()
            submitted = true
            console.log(`[EagleWeb] Clicked submit: ${selector}`)
            break
          }
        } catch {}
      }

      if (!submitted) {
        await searchInput.press('Enter')
        console.log('[EagleWeb] Submitted via Enter key')
      }

      await this.page!.waitForLoadState('networkidle')
      await this.page!.waitForTimeout(2000)

      // Debug: Save page HTML for inspection
      const debugHtml = await this.page!.content()
      fs.writeFileSync('/tmp/eagleweb-search-results.html', debugHtml)
      console.log('[EagleWeb] Saved search results HTML to /tmp/eagleweb-search-results.html')

      // Step 5: Navigate to Document history if account found
      const html = await this.page!.content()
      console.log('[EagleWeb] Page content snippet:', html.substring(0, 500))

      // Step 5: Click on account link to view account details
      const accountLink = this.page!.locator('a[href*="account.jsp"]').first()
      try {
        if (await accountLink.isVisible({ timeout: 3000 })) {
          console.log('[EagleWeb] Clicking account link...')
          await accountLink.click()
          await this.page!.waitForLoadState('networkidle')
          await this.page!.waitForTimeout(2000)
          console.log(`[EagleWeb] Account page loaded: ${this.page!.url()}`)
          // Save account page for debugging
          const acctHtml = await this.page!.content()
          fs.writeFileSync('/tmp/eagleweb-account-page.html', acctHtml)
          console.log('[EagleWeb] Saved account page HTML')
        }
      } catch {}

      // Step 6: Extract title signals from account page (transfer history)
      // Note: Document history link goes to treasurer portal, so we extract
      // what we can from the account page's transfer/sale history table
      const result = await this.extractResults()

      // Navigate back to search page for next property
      await this.page!.goto(`${TAXWEB_BASE}/search.jsp`, { waitUntil: 'networkidle' })

      return result

    } catch (error: any) {
      console.error(`[EagleWeb] Error searching parcel:`, error)
      return null
    }
  }

  private async extractResults(): Promise<EagleWebResult> {
    const result: EagleWebResult = {
      hasRecords: false,
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: [],
      yellowFlags: [],
      rawDocuments: []
    }

    const html = await this.page!.content()
    const url = this.page!.url()

    // Save HTML for debugging
    fs.writeFileSync('/tmp/eagleweb-result-page.html', html)

    // Check for no results
    if (html.includes('No results') ||
        html.includes('not found') ||
        html.includes('No matches') ||
        html.includes('0 records')) {
      console.log('[EagleWeb] No results found')
      return result
    }

    // Check if we have account data
    if (html.includes('Account Number') || html.includes('Parcel Number')) {
      result.hasRecords = true
      console.log('[EagleWeb] Account page found')
    }

    // Extract transfer history from account page
    // Look for table with Sale Date and Doc Description
    console.log('[EagleWeb] Extracting transfer history...')

    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeed: { date: Date; type: string } | null = null

    // Try to find transfer history table with Sale Date column
    try {
      // Look for table cells containing "Sale Date" header
      const saleDateHeader = this.page!.locator('td:has-text("Sale Date"), th:has-text("Sale Date")').first()
      if (await saleDateHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[EagleWeb] Found Sale Date header')

        // Get the parent table
        const table = saleDateHeader.locator('xpath=ancestor::table').first()
        const rows = await table.locator('tbody tr, tr').all()
        console.log(`[EagleWeb] Found ${rows.length} rows in transfer table`)

        for (const row of rows) {
          try {
            const cells = await row.locator('td').all()
            if (cells.length < 2) continue

            const cellTexts = await Promise.all(
              cells.map(async (cell: any) => (await cell.textContent() || '').trim())
            )

            // Look for date and doc description
            // Format: Sale Date | (empty) | Doc Description
            let saleDate = ''
            let docDesc = ''

            for (const text of cellTexts) {
              // Match dates like "Wed May 27 12:00:00 MDT 1992" or "Fri Dec 01 12:00:00 MST 1995"
              if (!saleDate && text.match(/\w{3}\s+\w{3}\s+\d{1,2}/)) {
                saleDate = text
              }
              // Match document types
              if (!docDesc && (text.toUpperCase().includes('DEED') ||
                  text.toUpperCase().includes('MORTGAGE') ||
                  text.toUpperCase().includes('LIEN') ||
                  text.toUpperCase().includes('RELEASE'))) {
                docDesc = text
              }
            }

            if (!docDesc || !saleDate) continue

            // Parse the date
            let date: Date | null = null
            try {
              date = new Date(saleDate)
              if (isNaN(date.getTime())) date = null
            } catch {}

            const docTypeUpper = docDesc.toUpperCase()

            // Skip header rows
            if (docTypeUpper.includes('SALE DATE') || docTypeUpper.includes('DOC DESCRIPTION')) continue

            result.rawDocuments.push({
              date: saleDate,
              type: docDesc
            })

            if (date && date >= fiveYearsAgo) {
              result.documentCount5yr++
            }

            if (MORTGAGE_TYPES.some(t => docTypeUpper.includes(t))) result.mortgageDocsFound++
            if (LIEN_TYPES.some(t => docTypeUpper.includes(t))) result.lienDocsFound++
            if (RELEASE_TYPES.some(t => docTypeUpper.includes(t))) result.releaseDocsFound++

            if (DEED_TYPES.some(t => docTypeUpper.includes(t)) && date) {
              if (!latestDeed || date > latestDeed.date) {
                latestDeed = { date, type: docDesc }
              }
            }
          } catch {}
        }
      }
    } catch (error: any) {
      console.log('[EagleWeb] Error extracting transfer table:', error.message)
    }

    if (latestDeed) {
      result.lastTransferDate = `${latestDeed.date.getMonth() + 1}/${latestDeed.date.getDate()}/${latestDeed.date.getFullYear()}`
      result.lastTransferType = this.mapDocType(latestDeed.type)
    }

    const netLiens = result.lienDocsFound - result.releaseDocsFound
    if (netLiens > 0) {
      result.redFlags.push(`${netLiens} unreleased lien(s)`)
    }

    console.log(`[EagleWeb] Extracted ${result.rawDocuments.length} documents`)
    console.log(`[EagleWeb] Last 5 years: ${result.documentCount5yr}, Liens: ${result.lienDocsFound}`)
    if (result.lastTransferDate) {
      console.log(`[EagleWeb] Last transfer: ${result.lastTransferDate} (${result.lastTransferType})`)
    }

    return result
  }

  private mapDocType(docType: string): string {
    const upper = docType.toUpperCase()
    if (upper.includes('WARRANTY')) return 'Warranty Deed'
    if (upper.includes('QUIT CLAIM')) return 'Quit Claim Deed'
    if (upper.includes('TRUSTEE')) return "Trustee's Deed"
    if (upper.includes('SPECIAL WARRANTY')) return 'Special Warranty Deed'
    if (upper.includes('DEED')) return 'Deed'
    return docType
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.saveSession()
      await this.context.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
    console.log('[EagleWeb] Closed')
  }
}

// Convenience function
export async function scrapeTooeleEagleWeb(parcelNumber: string): Promise<EagleWebResult | null> {
  const scraper = new TooeleEagleWebScraper()
  try {
    await scraper.init()
    return await scraper.searchParcel(parcelNumber)
  } finally {
    await scraper.close()
  }
}
