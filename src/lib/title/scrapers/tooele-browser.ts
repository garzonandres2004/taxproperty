// Tooele County Recorder - Browser Automation
// Uses Playwright to automate EagleWeb Public Viewer
// Session persistence for batch operations

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { TooeleRecorderResult } from './tooele-county'
import * as fs from 'fs'
import * as path from 'path'

const EAGLEWEB_URLS = {
  base: 'https://erecording.tooeleco.gov',
  web: 'https://erecording.tooeleco.gov/web',
  taxweb: 'https://erecording.tooeleco.gov/web/taxweb',
  login: 'https://erecording.tooeleco.gov/web/login.jsp',
  splash: 'https://erecording.tooeleco.gov/web/splash.jsp',
  search: 'https://erecording.tooeleco.gov/web/docSearch.jsp'
}

const SESSION_FILE = path.join(process.cwd(), '.tooele-session.json')

// Document type mappings
const DEED_TYPES = ['DEED', 'WARRANTY DEED', 'QUIT CLAIM DEED', 'TRUSTEE DEED', 'SPECIAL WARRANTY DEED']
const MORTGAGE_TYPES = ['MORTGAGE', 'DEED OF TRUST', 'TRUST DEED']
const LIEN_TYPES = ['LIEN', 'TAX LIEN', 'MECHANICS LIEN', 'JUDGMENT', 'NOTICE OF LIEN']
const RELEASE_TYPES = ['RELEASE', 'RECONVEYANCE', 'LIEN RELEASE', 'FULL RELEASE', 'SUBSTITUTION OF TRUSTEE']

interface EagleWebDoc {
  entry: string
  recordedDate: string
  documentDate: string
  docType: string
  grantor: string
  grantee: string
  bookPage: string
}

export class TooeleBrowserScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionInitialized = false

  async init(): Promise<void> {
    console.log('[TooeleBrowser] Initializing...')

    this.browser = await chromium.launch({
      headless: true, // Can set to false for debugging
      slowMo: 100 // Slight delay for stability
    })

    // Try to load existing session
    let storageState = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[TooeleBrowser] Loaded existing session')
      } catch (e) {
        console.log('[TooeleBrowser] Failed to load session, will create new')
      }
    }

    this.context = await this.browser.newContext({
      storageState: storageState as any,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(30000)

    // Initialize session if needed
    if (!storageState || !(await this.isSessionValid())) {
      await this.initializePublicSession()
    }

    this.sessionInitialized = true
    console.log('[TooeleBrowser] Ready')
  }

  private async isSessionValid(): Promise<boolean> {
    try {
      await this.page!.goto(EAGLEWEB_URLS.search, { waitUntil: 'domcontentloaded', timeout: 10000 })
      const url = this.page!.url()
      return !url.includes('login') && !url.includes('Login')
    } catch {
      return false
    }
  }

  private async initializePublicSession(): Promise<void> {
    console.log('[TooeleBrowser] Initializing new session...')

    // Step 1: Navigate to TaxWeb directly
    // Try the main web interface entry point
    await this.page!.goto(EAGLEWEB_URLS.web, { waitUntil: 'networkidle' })
    console.log('[TooeleBrowser] At web interface')

    // Check if we're on splash page and need to click TaxWeb
    const currentUrl = this.page!.url()
    if (currentUrl.includes('splash') || await this.page!.locator('a:has-text("TaxWeb")').isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[TooeleBrowser] On splash page, clicking TaxWeb...')
      try {
        // Click the TaxWeb link using JavaScript evaluation
        await this.page!.evaluate(() => {
          const links = document.querySelectorAll('a')
          for (const link of links) {
            if (link.textContent?.includes('TaxWeb')) {
              link.click()
              return true
            }
          }
          return false
        })
        await this.page!.waitForLoadState('networkidle')
        await this.page!.waitForTimeout(2000)
      } catch (e) {
        console.log('[TooeleBrowser] Click failed, trying direct navigation...')
        await this.page!.goto(`${EAGLEWEB_URLS.web}/taxweb`, { waitUntil: 'networkidle' })
      }
    }

    // Step 2: Look for public access link/button
    const publicAccessSelectors = [
      'a:has-text("Public")',
      'a:has-text("Public Access")',
      'button:has-text("Public")',
      'a:has-text("Enter")',
      'input[value*="Public"]',
      'a[href*="public"]',
      'a[href*="guest"]'
    ]

    let clickedPublic = false
    for (const selector of publicAccessSelectors) {
      try {
        if (await this.page!.locator(selector).isVisible({ timeout: 5000 })) {
          await this.page!.locator(selector).click()
          console.log(`[TooeleBrowser] Clicked public access: ${selector}`)
          clickedPublic = true
          await this.page!.waitForLoadState('networkidle')
          break
        }
      } catch {
        continue
      }
    }

    if (!clickedPublic) {
      console.log('[TooeleBrowser] No public access button found - may need direct navigation')
      // Try navigating directly to search page
      await this.page!.goto(EAGLEWEB_URLS.search, { waitUntil: 'networkidle' })
    }

    // Step 3: Handle terms acceptance if present
    const acceptTermsSelectors = [
      'button:has-text("Accept")',
      'input[value*="Accept"]',
      'button:has-text("I Agree")',
      'a:has-text("Accept")',
      'button:has-text("Agree")',
      'input[type="submit"][value*="Accept"]'
    ]

    for (const selector of acceptTermsSelectors) {
      try {
        if (await this.page!.locator(selector).isVisible({ timeout: 5000 })) {
          await this.page!.locator(selector).click()
          console.log(`[TooeleBrowser] Clicked accept: ${selector}`)
          await this.page!.waitForLoadState('networkidle')
          await this.page!.waitForTimeout(1000)
          break
        }
      } catch {
        continue
      }
    }

    // Step 4: Save screenshot and full HTML for debugging
    await this.page!.screenshot({ path: '/tmp/tooele-session.png' })
    const finalHtml = await this.page!.content()
    fs.writeFileSync('/tmp/tooele-session.html', finalHtml)
    console.log('[TooeleBrowser] Screenshot saved to /tmp/tooele-session.png')

    // Step 5: Save session
    await this.saveSession()
    console.log('[TooeleBrowser] Session initialized and saved')
  }

  private async saveSession(): Promise<void> {
    if (!this.context) return
    const storage = await this.context.storageState()
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2))
  }

  async searchParcel(parcelNumber: string): Promise<TooeleRecorderResult | null> {
    if (!this.sessionInitialized) {
      throw new Error('Scraper not initialized. Call init() first.')
    }

    const normalized = parcelNumber.replace(/[^0-9]/g, '').trim()
    console.log(`[TooeleBrowser] Searching parcel: ${normalized}`)

    try {
      // Navigate directly to search page
      await this.page!.goto(EAGLEWEB_URLS.search, { waitUntil: 'networkidle' })
      console.log('[TooeleBrowser] At search page')
      await this.page!.waitForTimeout(1000)

      // Check if we got redirected to login/terms
      const url = this.page!.url()
      const html = await this.page!.content()

      if (html.includes('terms') || html.includes('Terms') || html.includes('Accept') || html.includes('conditions')) {
        console.log('[TooeleBrowser] Terms page detected, accepting...')
        const acceptButton = this.page!.locator('input[type="submit"], button').filter({ hasText: /Accept|Agree|Submit/i }).first()
        try {
          await acceptButton.click({ timeout: 5000 })
          await this.page!.waitForLoadState('networkidle')
        } catch {
          console.log('[TooeleBrowser] Could not find accept button')
        }
      }

      // Wait for search form

      // Look for parcel search form
      const parcelSelectors = [
        'input[name*="parcel"]', 'input[name*=" Parcel"]', 'input[name*="parcelNumber"]',
        'input[id*="parcel"]', '#parcel', '[placeholder*="parcel" i]'
      ]

      let parcelInput: any = null
      for (const selector of parcelSelectors) {
        try {
          if (await this.page!.locator(selector).isVisible({ timeout: 2000 })) {
            parcelInput = this.page!.locator(selector)
            break
          }
        } catch {}
      }

      if (!parcelInput) {
        console.log('[TooeleBrowser] Parcel input not found, dumping page content...')
        const html = await this.page!.content()
        fs.writeFileSync('/tmp/tooele-page-dump.html', html)
        console.log('Full HTML saved to /tmp/tooele-page-dump.html')
        console.log('First 3000 chars:', html.slice(0, 3000))
        return null
      }

      // Clear and enter parcel number
      await parcelInput.fill('')
      await parcelInput.fill(normalized)
      console.log(`[TooeleBrowser] Entered parcel: ${normalized}`)

      // Find and click search button
      const searchSelectors = [
        'button[type="submit"]', 'input[type="submit"]',
        'button:has-text("Search")', 'input[value*="Search"]',
        '#search', '.search', '[name="search"]'
      ]

      let searchClicked = false
      for (const selector of searchSelectors) {
        try {
          if (await this.page!.locator(selector).isVisible({ timeout: 2000 })) {
            await this.page!.locator(selector).click()
            searchClicked = true
            console.log(`[TooeleBrowser] Clicked search: ${selector}`)
            break
          }
        } catch {}
      }

      if (!searchClicked) {
        // Try pressing Enter
        await parcelInput.press('Enter')
        console.log('[TooeleBrowser] Pressed Enter to search')
      }

      // Wait for results
      await this.page!.waitForLoadState('networkidle')
      await this.page!.waitForTimeout(2000) // Give time for table to populate

      // Check for no results
      const pageContent = await this.page!.content()
      if (pageContent.includes('No results') || pageContent.includes('not found') || pageContent.includes('No matches')) {
        console.log('[TooeleBrowser] No results found')
        return {
          hasRecords: false,
          documentCount5yr: 0,
          mortgageDocsFound: 0,
          lienDocsFound: 0,
          releaseDocsFound: 0,
          redFlags: [],
          yellowFlags: []
        }
      }

      // Extract document data from results table
      const result = await this.extractDocumentData()
      console.log(`[TooeleBrowser] Found ${result.hasRecords ? 'records' : 'no records'}`)

      return result

    } catch (error) {
      console.error(`[TooeleBrowser] Error searching parcel ${parcelNumber}:`, error)
      return null
    }
  }

  private async extractDocumentData(): Promise<TooeleRecorderResult> {
    const result: TooeleRecorderResult = {
      hasRecords: false,
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: [],
      yellowFlags: []
    }

    try {
      // Look for results table
      const tableSelectors = [
        'table.results', 'table.documentList', '.results table',
        'table:has-text("Entry")', 'table:has-text("Document")',
        'table tbody tr', '.dataTable'
      ]

      let rows: any[] = []
      for (const selector of tableSelectors) {
        try {
          rows = await this.page!.locator(`${selector} tbody tr`).all()
          if (rows.length > 0) break
        } catch {}
      }

      if (rows.length === 0) {
        // Try generic table approach
        const allRows = await this.page!.locator('table tr').all()
        rows = allRows.filter(async (row) => {
          const text = await row.textContent()
          return text?.includes('DEED') || text?.includes('LIEN') || text?.includes('MORTGAGE')
        })
      }

      if (rows.length === 0) {
        return result
      }

      result.hasRecords = true
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

      let latestDeed: { date: Date; type: string } | null = null

      for (const row of rows) {
        const cells = await row.locator('td').all()
        if (cells.length < 4) continue

        const cellTexts = await Promise.all(cells.map(async (cell: any) => {
          return (await cell.textContent() || '').trim()
        }))

        // Typical EagleWeb columns: Entry #, Recorded Date, Document Date, Type, Grantor, Grantee
        const [entry, recordedDate, docDate, docType, grantor, grantee] = cellTexts

        if (!docType) continue

        const docTypeUpper = docType.toUpperCase()

        // Parse recorded date
        let date: Date | null = null
        const dateMatch = recordedDate?.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
        if (dateMatch) {
          const month = parseInt(dateMatch[1]) - 1
          const day = parseInt(dateMatch[2])
          let year = parseInt(dateMatch[3])
          if (year < 100) year += year < 50 ? 2000 : 1900
          date = new Date(year, month, day)
        }

        // Count by type
        if (date && date >= fiveYearsAgo) {
          result.documentCount5yr++
        }

        if (MORTGAGE_TYPES.some(t => docTypeUpper.includes(t))) result.mortgageDocsFound++
        if (LIEN_TYPES.some(t => docTypeUpper.includes(t))) result.lienDocsFound++
        if (RELEASE_TYPES.some(t => docTypeUpper.includes(t))) result.releaseDocsFound++

        // Track latest deed
        if (DEED_TYPES.some(t => docTypeUpper.includes(t)) && date) {
          if (!latestDeed || date > latestDeed.date) {
            latestDeed = { date, type: docType }
          }
        }
      }

      if (latestDeed) {
        result.lastTransferDate = `${latestDeed.date.getMonth() + 1}/${latestDeed.date.getDate()}/${latestDeed.date.getFullYear()}`
        result.lastTransferType = this.mapDocType(latestDeed.type)
      }

      // Red flags
      const netLiens = result.lienDocsFound - result.releaseDocsFound
      if (netLiens > 0) {
        result.redFlags.push(`${netLiens} unreleased lien(s)`)
      }

    } catch (error) {
      console.error('[TooeleBrowser] Error extracting data:', error)
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
    console.log('[TooeleBrowser] Closed')
  }
}

// Convenience function for single parcel lookup
export async function scrapeTooeleWithBrowser(parcelNumber: string): Promise<TooeleRecorderResult | null> {
  const scraper = new TooeleBrowserScraper()
  try {
    await scraper.init()
    return await scraper.searchParcel(parcelNumber)
  } finally {
    await scraper.close()
  }
}
