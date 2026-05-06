// Sanpete County EagleWeb - Public Web Limited Viewer Automation
// Identical structure to Tooele County EagleWeb

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const LOGIN_URL = 'https://erecording.sanpetecountyutah.gov/eaglesoftware/web/login.jsp'
const TAXWEB_BASE = 'https://erecording.sanpetecountyutah.gov/eaglesoftware/taxweb'
const SESSION_FILE = path.join(process.cwd(), '.sanpete-eagleweb-session.json')

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

export class SanpeteEagleWebScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionInitialized = false

  async init(): Promise<void> {
    console.log('[SanpeteEagleWeb] Initializing...')

    this.browser = await chromium.launch({
      headless: true,
      slowMo: 200
    })

    let storageState = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[SanpeteEagleWeb] Loaded existing session')
      } catch {
        console.log('[SanpeteEagleWeb] No valid session file')
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
        await this.page.goto(`${TAXWEB_BASE}/search.jsp`, { waitUntil: 'domcontentloaded', timeout: 10000 })
        const url = this.page.url()
        if (url.includes('login') || url.includes('Login')) {
          console.log('[SanpeteEagleWeb] Session expired, reinitializing...')
          await this.initializePublicSession()
        } else {
          console.log('[SanpeteEagleWeb] Session valid')
          this.sessionInitialized = true
        }
      } catch {
        console.log('[SanpeteEagleWeb] Session check failed, reinitializing...')
        await this.initializePublicSession()
      }
    }
  }

  private async initializePublicSession(): Promise<void> {
    console.log('[SanpeteEagleWeb] Initializing public session...')

    await this.page!.goto(LOGIN_URL, { waitUntil: 'networkidle' })
    console.log('[SanpeteEagleWeb] At login page')

    try {
      // Find the Public Web Limited Viewer section and click Enter
      await this.page!.waitForSelector('#middle_left', { timeout: 10000 })
      console.log('[SanpeteEagleWeb] Found Public Web Limited Viewer section')

      const publicViewerButton = this.page!.locator('#middle_left input[type="submit"]').first()

      if (await publicViewerButton.isVisible({ timeout: 5000 })) {
        console.log('[SanpeteEagleWeb] Clicking Public Web Limited Viewer Enter button...')
        await publicViewerButton.click()
        await this.page!.waitForLoadState('networkidle')
        console.log('[SanpeteEagleWeb] Button clicked, page loaded')
      } else {
        throw new Error('Public Web Limited Viewer button not visible')
      }
    } catch (error: any) {
      console.error('[SanpeteEagleWeb] Failed to click Public Web Viewer:', error.message)
      throw error
    }

    await this.handleTermsPage()

    const currentUrl = this.page!.url()
    console.log(`[SanpeteEagleWeb] Current URL after init: ${currentUrl}`)

    if (currentUrl.includes('taxweb') || currentUrl.includes('search')) {
      console.log('[SanpeteEagleWeb] Successfully reached taxweb area')
      this.sessionInitialized = true
    } else if (currentUrl.includes('login')) {
      throw new Error('Still on login page - public access failed')
    } else {
      const hasSearch = await this.page!.locator('input[name*="search"], input[name*="parcel"], input[name*="account"]').count() > 0
      if (hasSearch) {
        console.log('[SanpeteEagleWeb] Search interface found on current page')
        this.sessionInitialized = true
      } else {
        throw new Error('Cannot locate search interface')
      }
    }

    await this.saveSession()
    console.log('[SanpeteEagleWeb] Session initialized and saved')
  }

  private async handleTermsPage(): Promise<void> {
    const pageContent = await this.page!.content()
    const currentUrl = this.page!.url()

    if (pageContent.includes('Terms') ||
        pageContent.includes('Conditions') ||
        pageContent.includes('Agreement') ||
        currentUrl.includes('terms') ||
        currentUrl.includes('agreement')) {

      console.log('[SanpeteEagleWeb] Terms page detected, accepting...')

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
            console.log(`[SanpeteEagleWeb] Clicking accept: ${selector}`)
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
    console.log(`[SanpeteEagleWeb] Searching parcel: ${normalized}`)

    try {
      // Navigate to search page
      const currentUrl = this.page!.url()
      if (!currentUrl.includes('taxweb')) {
        await this.page!.goto(`${TAXWEB_BASE}/search.jsp`, { waitUntil: 'networkidle' })
        await this.handleTermsPage()
      }

      // Find and fill parcel search input
      console.log('[SanpeteEagleWeb] Looking for parcel input...')

      const parcelSelectors = [
        'input[name*="parcel"]',
        'input[name*="Parcel"]',
        'input[id*="parcel"]',
        'input[id*="Parcel"]',
        'input[name*="account"]',
        'input[name*="Account"]'
      ]

      let searchInput: any = null
      for (const selector of parcelSelectors) {
        try {
          const input = this.page!.locator(selector).first()
          if (await input.isVisible({ timeout: 2000 })) {
            searchInput = input
            console.log(`[SanpeteEagleWeb] Found parcel input: ${selector}`)
            break
          }
        } catch {}
      }

      if (!searchInput) {
        console.log('[SanpeteEagleWeb] Parcel input not found')
        return null
      }

      await searchInput.fill('')
      await searchInput.fill(normalized)
      console.log(`[SanpeteEagleWeb] Entered parcel: ${normalized}`)

      // Submit search
      const submitButton = this.page!.locator('input[type="submit"], button[type="submit"]').first()
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click()
        console.log('[SanpeteEagleWeb] Clicked submit')
      } else {
        await searchInput.press('Enter')
        console.log('[SanpeteEagleWeb] Submitted via Enter key')
      }

      await this.page!.waitForLoadState('networkidle')
      await this.page!.waitForTimeout(2000)

      // Navigate to account page and extract
      return await this.extractFromAccountPage()

    } catch (error: any) {
      console.error(`[SanpeteEagleWeb] Error searching parcel:`, error)
      return null
    }
  }

  private async extractFromAccountPage(): Promise<EagleWebResult> {
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

    // Check if we're on account page or results page
    if (html.includes('Account Number') || html.includes('Parcel Number')) {
      console.log('[SanpeteEagleWeb] Account page found')
    }

    // Click account link if present
    const accountLink = this.page!.locator('a[href*="account.jsp"]').first()
    try {
      if (await accountLink.isVisible({ timeout: 3000 })) {
        console.log('[SanpeteEagleWeb] Clicking account link...')
        await accountLink.click()
        await this.page!.waitForLoadState('networkidle')
        await this.page!.waitForTimeout(2000)
      }
    } catch {}

    // Save HTML for debugging
    const debugHtml = await this.page!.content()
    const fs = require('fs')
    fs.writeFileSync('/tmp/sanpete-account-debug.html', debugHtml)
    console.log('[SanpeteEagleWeb] Saved account page HTML')

    // Extract transfer history
    const accountHtml = await this.page!.content()

    // Look for Sale Date table
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeed: { date: Date; type: string } | null = null

    // Try to parse transfer history table
    try {
      // Find table with Sale Date header
      const saleDateHeader = this.page!.locator('td:has-text("Sale Date"), th:has-text("Sale Date")').first()
      if (await saleDateHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[SanpeteEagleWeb] Found Sale Date header')

        const table = saleDateHeader.locator('xpath=ancestor::table').first()
        const rows = await table.locator('tbody tr, tr').all()
        console.log(`[SanpeteEagleWeb] Found ${rows.length} rows`)

        for (const row of rows) {
          try {
            const cells = await row.locator('td').all()
            if (cells.length < 3) continue

            const cellTexts = await Promise.all(
              cells.map(async (cell: any) => (await cell.textContent() || '').trim())
            )

            // Sanpete structure: [Sale Date (often empty), blank, Doc Description]
            let saleDate = cellTexts[0] || ''
            let docDesc = cellTexts[2] || ''

            // Skip header rows
            if (docDesc.toUpperCase().includes('DOC DESCRIPTION')) continue
            if (!docDesc) continue
            if (docDesc.length > 100) continue // Skip junk text
            if (!['DEED', 'MORTGAGE', 'LIEN', 'RELEASE', 'TRUST', 'AFFIDAVIT'].some(k => docDesc.toUpperCase().includes(k))) continue

            // Try to parse date if present
            let date: Date | null = null
            if (saleDate && saleDate.match(/\w+/)) {
              try {
                date = new Date(saleDate)
                if (isNaN(date.getTime())) date = null
              } catch {}
            }

            result.rawDocuments.push({ date: saleDate || 'N/A', type: docDesc })

            if (date && date >= fiveYearsAgo) {
              result.documentCount5yr++
            }

            const docUpper = docDesc.toUpperCase()
            if (MORTGAGE_TYPES.some(t => docUpper.includes(t))) result.mortgageDocsFound++
            if (LIEN_TYPES.some(t => docUpper.includes(t))) result.lienDocsFound++
            if (RELEASE_TYPES.some(t => docUpper.includes(t))) result.releaseDocsFound++

            // Track latest deed even without date
            if (DEED_TYPES.some(t => docUpper.includes(t))) {
              if (!latestDeed || (date && date > latestDeed.date)) {
                latestDeed = { date: date || new Date('1900-01-01'), type: docDesc }
              }
            }
          } catch {}
        }
      }
    } catch (error: any) {
      console.log('[SanpeteEagleWeb] Error extracting transfer history:', error.message)
    }

    if (result.rawDocuments.length > 0) {
      result.hasRecords = true
    }

    if (latestDeed) {
      if (latestDeed.date.getFullYear() > 1900) {
        result.lastTransferDate = `${latestDeed.date.getMonth() + 1}/${latestDeed.date.getDate()}/${latestDeed.date.getFullYear()}`
      }
      result.lastTransferType = this.mapDocType(latestDeed.type)
    }

    const netLiens = result.lienDocsFound - result.releaseDocsFound
    if (netLiens > 0) {
      result.redFlags.push(`${netLiens} unreleased lien(s)`)
    }

    console.log(`[SanpeteEagleWeb] Extracted ${result.rawDocuments.length} documents`)
    console.log(`[SanpeteEagleWeb] Last transfer: ${result.lastTransferDate || 'N/A'}`)

    // Navigate back to search for next property
    await this.page!.goto(`${TAXWEB_BASE}/search.jsp`, { waitUntil: 'networkidle' })

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
    console.log('[SanpeteEagleWeb] Closed')
  }
}

// Convenience function
export async function scrapeSanpeteEagleWeb(parcelNumber: string): Promise<EagleWebResult | null> {
  const scraper = new SanpeteEagleWebScraper()
  try {
    await scraper.init()
    return await scraper.searchParcel(parcelNumber)
  } finally {
    await scraper.close()
  }
}
