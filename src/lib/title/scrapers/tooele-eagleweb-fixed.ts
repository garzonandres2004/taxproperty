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
      const currentUrl = this.page!.url()
      console.log(`[EagleWeb] Current page: ${currentUrl}`)

      const searchLinks = [
        'a:has-text("Search")',
        'a:has-text("Account")',
        'a:has-text("Document")',
        'a[href*="search"]',
        'a[href*="account"]'
      ]

      let foundSearch = false
      for (const selector of searchLinks) {
        try {
          const link = this.page!.locator(selector).first()
          if (await link.isVisible({ timeout: 2000 })) {
            console.log(`[EagleWeb] Found search link: ${selector}`)
            await link.click()
            await this.page!.waitForLoadState('networkidle')
            await this.handleTermsPage()
            foundSearch = true
            break
          }
        } catch {}
      }

      if (!foundSearch) {
        const possibleUrls = [
          `${TAXWEB_BASE}/accountSearch.jsp`,
          `${TAXWEB_BASE}/search.jsp`,
          `${TAXWEB_BASE}/docSearch.jsp`,
          `${TAXWEB_BASE}/`
        ]

        for (const url of possibleUrls) {
          try {
            await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
            const urlAfter = this.page!.url()
            if (!urlAfter.includes('login') && !urlAfter.includes('error')) {
              console.log(`[EagleWeb] Successfully loaded: ${urlAfter}`)
              await this.handleTermsPage()
              break
            }
          } catch {}
        }
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

      if (html.includes('Document') || html.includes('document') || html.includes('history')) {
        console.log('[EagleWeb] Looking for Document link...')

        const docSelectors = [
          'a:has-text("Document")',
          'a:has-text("History")',
          'a[href*="document"]',
          'a[href*="history"]',
          'a:has-text("View")'
        ]

        for (const selector of docSelectors) {
          try {
            const link = this.page!.locator(selector).first()
            if (await link.isVisible({ timeout: 3000 })) {
              console.log(`[EagleWeb] Found document link: ${selector}`)
              await link.click()
              await this.page!.waitForLoadState('networkidle')
              await this.page!.waitForTimeout(2000)
              console.log('[EagleWeb] Navigated to document history')
              break
            }
          } catch {}
        }
      }

      return await this.extractResults()

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

    // Look for "Document" link to view document history
    const docLinkSelectors = [
      'a:has-text("Document")',
      'a:has-text("History")',
      'a:has-text("View")',
      'a[href*="document"]',
      'a[href*="history"]'
    ]

    let foundDocLink = false
    for (const selector of docLinkSelectors) {
      try {
        const link = this.page!.locator(selector).first()
        if (await link.isVisible({ timeout: 3000 })) {
          console.log(`[EagleWeb] Found document link: ${selector}`)
          await link.click()
          await this.page!.waitForLoadState('networkidle')
          await this.page!.waitForTimeout(2000)
          foundDocLink = true
          break
        }
      } catch {}
    }

    // Now extract document data
    console.log('[EagleWeb] Extracting document data...')

    // Try different table structures
    const tableSelectors = [
      'table tbody tr',
      'table.results tbody tr',
      'table.documentList tbody tr',
      '.results table tr',
      '[class*="result"] table tr'
    ]

    let rows: any[] = []
    for (const selector of tableSelectors) {
      try {
        rows = await this.page!.locator(selector).all()
        if (rows.length > 1) {
          console.log(`[EagleWeb] Found ${rows.length} rows with: ${selector}`)
          break
        }
      } catch {}
    }

    if (rows.length === 0) {
      console.log('[EagleWeb] No table rows found')
      // Check if we at least found account info
      if (html.includes('parcel') || html.includes('Parcel') || html.includes('ACCOUNT')) {
        result.hasRecords = true
        console.log('[EagleWeb] Account found but no document table')
      }
      return result
    }

    result.hasRecords = true
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeed: { date: Date; type: string } | null = null

    for (let i = 1; i < Math.min(rows.length, 50); i++) {
      try {
        const cells = await rows[i].locator('td').all()
        if (cells.length < 3) continue

        const cellTexts = await Promise.all(
          cells.map(async (cell: any) => (await cell.textContent() || '').trim())
        )

        // Different column layouts possible
        // Try to identify date and doc type columns
        let recordedDate = ''
        let docType = ''

        for (const text of cellTexts) {
          if (!recordedDate && text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
            recordedDate = text
          }
          if (!docType && (text.toUpperCase().includes('DEED') ||
              text.toUpperCase().includes('MORTGAGE') ||
              text.toUpperCase().includes('LIEN') ||
              text.toUpperCase().includes('RELEASE'))) {
            docType = text
          }
        }

        if (!docType) continue

        // Parse date
        let date: Date | null = null
        const dateMatch = recordedDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
        if (dateMatch) {
          const month = parseInt(dateMatch[1]) - 1
          const day = parseInt(dateMatch[2])
          let year = parseInt(dateMatch[3])
          if (year < 100) year += year < 50 ? 2000 : 1900
          date = new Date(year, month, day)
        }

        const docTypeUpper = docType.toUpperCase()

        result.rawDocuments.push({
          date: recordedDate,
          type: docType,
          raw: cellTexts.join(' | ')
        })

        if (date && date >= fiveYearsAgo) {
          result.documentCount5yr++
        }

        if (MORTGAGE_TYPES.some(t => docTypeUpper.includes(t))) result.mortgageDocsFound++
        if (LIEN_TYPES.some(t => docTypeUpper.includes(t))) result.lienDocsFound++
        if (RELEASE_TYPES.some(t => docTypeUpper.includes(t))) result.releaseDocsFound++

        if (DEED_TYPES.some(t => docTypeUpper.includes(t)) && date) {
          if (!latestDeed || date > latestDeed.date) {
            latestDeed = { date, type: docType }
          }
        }
      } catch {}
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
