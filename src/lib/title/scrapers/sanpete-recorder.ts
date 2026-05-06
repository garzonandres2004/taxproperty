// Sanpete County Recorder - Tyler Technologies Self-Service Portal
// URL: https://selfservice.sanpetecountyutah.gov/web/

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const RECORDER_URL = 'https://selfservice.sanpetecountyutah.gov/web/user/disclaimer'
const SEARCH_URL = 'https://selfservice.sanpetecountyutah.gov/web/search'
const SESSION_FILE = path.join(process.cwd(), '.sanpete-recorder-session.json')

export interface SanpeteRecorderResult {
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

export class SanpeteRecorderScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionInitialized = false

  async init(): Promise<void> {
    console.log('[SanpeteRecorder] Initializing...')

    this.browser = await chromium.launch({
      headless: true,
      slowMo: 200
    })

    let storageState = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[SanpeteRecorder] Loaded existing session')
      } catch {
        console.log('[SanpeteRecorder] No valid session file')
      }
    }

    this.context = await this.browser.newContext({
      storageState: storageState as any,
      viewport: { width: 1280, height: 720 }
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(30000)

    if (!storageState) {
      await this.initializeSession()
    } else {
      try {
        await this.page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
        const url = this.page.url()
        if (url.includes('disclaimer') || url.includes('login')) {
          console.log('[SanpeteRecorder] Session expired, reinitializing...')
          await this.initializeSession()
        } else {
          console.log('[SanpeteRecorder] Session valid')
          this.sessionInitialized = true
        }
      } catch {
        console.log('[SanpeteRecorder] Session check failed, reinitializing...')
        await this.initializeSession()
      }
    }
  }

  private async initializeSession(): Promise<void> {
    console.log('[SanpeteRecorder] Initializing session...')

    await this.page!.goto(RECORDER_URL, { waitUntil: 'networkidle' })
    console.log('[SanpeteRecorder] At disclaimer page')

    try {
      // Accept disclaimer
      const acceptButton = this.page!.locator('button:has-text("I Accept"), input[value*="Accept"]').first()
      if (await acceptButton.isVisible({ timeout: 5000 })) {
        console.log('[SanpeteRecorder] Clicking Accept...')
        await acceptButton.click()
        await this.page!.waitForLoadState('networkidle')
        await this.page!.waitForTimeout(1000)
      }

      const currentUrl = this.page!.url()
      if (currentUrl.includes('search') || currentUrl.includes('home')) {
        console.log('[SanpeteRecorder] Successfully reached search area')
        this.sessionInitialized = true
      } else {
        throw new Error('Still on disclaimer page - access failed')
      }
    } catch (error: any) {
      console.error('[SanpeteRecorder] Failed to initialize:', error.message)
      throw error
    }

    await this.saveSession()
    console.log('[SanpeteRecorder] Session initialized and saved')
  }

  private async saveSession(): Promise<void> {
    if (!this.context) return
    const storage = await this.context.storageState()
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2))
  }

  async searchByName(name: string): Promise<SanpeteRecorderResult | null> {
    if (!this.sessionInitialized) {
      throw new Error('Scraper not initialized')
    }

    console.log(`[SanpeteRecorder] Searching name: ${name}`)

    try {
      // Navigate to search if not already there
      const currentUrl = this.page!.url()
      if (!currentUrl.includes('search')) {
        await this.page!.goto(SEARCH_URL, { waitUntil: 'networkidle' })
      }

      // Find and fill name search
      const nameInput = this.page!.locator('input[name*="name"], input[placeholder*="name" i]').first()
      if (await nameInput.isVisible({ timeout: 5000 })) {
        await nameInput.fill('')
        await nameInput.fill(name)
        console.log(`[SanpeteRecorder] Entered name: ${name}`)
      }

      // Submit search
      const searchButton = this.page!.locator('button[type="submit"], input[type="submit"]').first()
      if (await searchButton.isVisible({ timeout: 3000 })) {
        await searchButton.click()
        await this.page!.waitForLoadState('networkidle')
        await this.page!.waitForTimeout(2000)
      }

      return await this.extractResults()
    } catch (error: any) {
      console.error(`[SanpeteRecorder] Error searching:`, error)
      return null
    }
  }

  private async extractResults(): Promise<SanpeteRecorderResult> {
    const result: SanpeteRecorderResult = {
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

    // Check for no results
    if (html.includes('No results') || html.includes('not found') || html.includes('0 records')) {
      console.log('[SanpeteRecorder] No results found')
      return result
    }

    // Look for document table
    const tableRows = await this.page!.locator('table tbody tr, .results tr').all()
    if (tableRows.length > 0) {
      result.hasRecords = true
      console.log(`[SanpeteRecorder] Found ${tableRows.length} result rows`)
    }

    return result
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.saveSession()
      await this.context.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
    console.log('[SanpeteRecorder] Closed')
  }
}

// Convenience function
export async function searchSanpeteRecorder(name: string): Promise<SanpeteRecorderResult | null> {
  const scraper = new SanpeteRecorderScraper()
  try {
    await scraper.init()
    return await scraper.searchByName(name)
  } finally {
    await scraper.close()
  }
}
