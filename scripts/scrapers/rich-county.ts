// Rich County Recorder Scraper
// http://search.richcounty.gov/RecordingsSearch.aspx
// Custom ASP.NET WebForms + DevExpress controls. Requires free guest login.
// Plain HTTP POST doesn't work — DevExpress updates VIEWSTATE client-side.
//
// Search strategy: parcel-number field (txtParcelNumber) on RecordingsSearch.aspx.
// Parcel search is exact — no owner-name overmatch risk.
// Owner-name lookup (PropertyTaxSearch) is kept as fallback context only.
//
// DevExpress quirks:
//   - Input must use .type({ delay: 60 }) not .fill() (fires keyboard events)
//   - Submit button has readonly="readonly" — use page.evaluate(() => btn.click())
//   - Set up waitForNavigation BEFORE the JS click to avoid the race condition

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const RECORDER_URL = 'http://search.richcounty.gov/RecordingsSearch.aspx'
const LOGIN_URL = 'http://search.richcounty.gov/Login.aspx'
const TAX_SEARCH_URL = 'http://search.richcounty.gov/PropertyTaxSearch.aspx'
const GUEST_URL = 'http://search.richcounty.gov/GuestCredentials.aspx'
const SESSION_FILE = path.join(process.cwd(), '.rich-county-session.json')

const DEED_TYPES = ['WARRANTY DEED', 'QUIT CLAIM DEED', 'TRUSTEE DEED', 'SPECIAL WARRANTY DEED', 'DEED']
const MORTGAGE_TYPES = ['DEED OF TRUST', 'TRUST DEED', 'MORTGAGE']
const LIEN_TYPES = ['LIEN', 'TAX LIEN', 'MECHANICS LIEN', 'JUDGMENT', 'NOTICE OF LIEN']
const RELEASE_TYPES = ['RELEASE', 'RECONVEYANCE', 'FULL RELEASE', 'LIEN RELEASE', 'SUBSTITUTION OF TRUSTEE']

export interface RichCountyResult {
  hasRecords: boolean
  documentCount5yr: number
  lastTransferDate?: string
  lastTransferType?: string
  mortgageDocsFound: number
  lienDocsFound: number
  releaseDocsFound: number
  redFlags: string[]
  yellowFlags: string[]
  rawDocuments: { date: string; docType: string; grantor?: string; grantee?: string; entry?: string }[]
}

export class RichCountyScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private loggedIn = false

  async init(): Promise<void> {
    const email = process.env.RICH_COUNTY_RECORDER_EMAIL
    const password = process.env.RICH_COUNTY_RECORDER_PASSWORD

    if (!email || !password) {
      throw new Error(
        'RICH_COUNTY_RECORDER_EMAIL and RICH_COUNTY_RECORDER_PASSWORD must be set. ' +
        'Register a free guest account at ' + GUEST_URL
      )
    }

    console.log('[RichRecorder] Initializing...')

    this.browser = await chromium.launch({ headless: true })

    let storageState: any = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[RichRecorder] Loaded existing session')
      } catch {
        console.log('[RichRecorder] Session file unreadable, will log in fresh')
      }
    }

    this.context = await this.browser.newContext({
      storageState,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(30000)

    if (storageState && await this.isSessionValid()) {
      console.log('[RichRecorder] Session still valid')
      this.loggedIn = true
    } else {
      await this.login(email, password)
    }
  }

  private async isSessionValid(): Promise<boolean> {
    try {
      await this.page!.goto(RECORDER_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const url = this.page!.url()
      return !url.includes('Login.aspx') && !url.includes('GuestCredentials')
    } catch {
      return false
    }
  }

  private async login(email: string, password: string): Promise<void> {
    console.log('[RichRecorder] Logging in via Login.aspx...')
    // RecordingsSearch redirects to Login.aspx which has:
    //   chkDisclaimer (checkbox), txtUsername, txtWebPassword, btnLogin
    await this.page!.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })

    const html = await this.page!.content()
    fs.writeFileSync('/tmp/rich-login-page.html', html)
    console.log(`[RichRecorder] Login page: ${this.page!.url()}`)

    // Disclaimer checkbox must be checked before login
    const disclaimer = this.page!.locator('input[name*="chkDisclaimer"], input[id*="chkDisclaimer"]').first()
    if (await disclaimer.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (!await disclaimer.isChecked().catch(() => false)) {
        await disclaimer.check()
        console.log('[RichRecorder] Disclaimer checked')
      }
    }

    // Username = email address
    const usernameInput = this.page!.locator('input[name*="txtUsername"], input[id*="txtUsername"]').first()
    if (!await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Username input not found — check /tmp/rich-login-page.html')
    }
    await usernameInput.fill(email)

    // Password
    const pwInput = this.page!.locator('input[name*="txtWebPassword"], input[id*="txtWebPassword"]').first()
    if (!await pwInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Password input not found')
    }
    await pwInput.fill(password)

    await this.page!.waitForTimeout(300)

    // Click Login button (not "Create a Guest Account")
    const loginBtn = this.page!.locator('input[name*="btnLogin"], input[id*="btnLogin"]').first()
    if (!await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Login button not found')
    }
    await loginBtn.click()
    await this.page!.waitForLoadState('domcontentloaded', { timeout: 20000 })

    const afterUrl = this.page!.url()
    const afterHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-after-login.html', afterHtml)
    console.log(`[RichRecorder] After login URL: ${afterUrl}`)

    if (afterUrl.includes('Login.aspx')) {
      const errMatch = afterHtml.match(/<span[^>]*color:Red[^>]*>([^<]+)<\/span>/)
      const errMsg = errMatch ? errMatch[1].trim() : 'unknown error'
      throw new Error(`Login failed: "${errMsg}" — check /tmp/rich-after-login.html`)
    }

    await this.saveSession()
    this.loggedIn = true
    console.log('[RichRecorder] Logged in successfully')
  }

  // Look up owner name from the public PropertyTaxSearch (Playwright needed for DevExpress)
  async lookupOwnerName(parcelId: string): Promise<string | null> {
    console.log(`[RichRecorder] Looking up owner name for ${parcelId}...`)

    try {
      await this.page!.goto(TAX_SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })

      // DevExpress _I suffix: actual <input> id is the wrapper id + "_I"
      const parcelInput = this.page!.locator('#ctl00_ContentPlaceHolder1_txtParcel_I').first()
      const fallbackInput = this.page!.locator('input[name*="txtParcel"]').first()

      const input = await parcelInput.isVisible({ timeout: 3000 }).catch(() => false)
        ? parcelInput
        : fallbackInput

      if (!await (input as typeof parcelInput).isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[RichRecorder] Parcel input not found on PropertyTaxSearch — skipping owner lookup')
        fs.writeFileSync('/tmp/rich-tax-search.html', await this.page!.content())
        return null
      }

      // DevExpress requires keystroke-by-keystroke typing to update internal state
      await (input as typeof parcelInput).click()
      await this.page!.keyboard.press('Control+a')
      await this.page!.keyboard.press('Delete')
      await (input as typeof parcelInput).type(parcelId, { delay: 60 })
      await this.page!.waitForTimeout(300)

      const navPromiseTax = this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
      const taxBtnClicked = await this.page!.evaluate(() => {
        const btn = document.getElementById('ctl00_ContentPlaceHolder1_btnSearch_I') as HTMLInputElement | null
        if (btn) { btn.click(); return true }
        return false
      })
      if (!taxBtnClicked) {
        await (input as typeof parcelInput).press('Enter')
      }
      await navPromiseTax

      const html = await this.page!.content()
      fs.writeFileSync('/tmp/rich-tax-results.html', html)

      // SearchResults.aspx renders a grid: Parcel | Year | Owner | Situs Address
      // Use innerText regex — matches "41-30-090-0106\t2025\tTOONE, JAMES AVARD\t"
      const bodyText = await this.page!.evaluate(() => document.body.innerText)
      const gridMatch = bodyText.match(new RegExp(
        parcelId.replace(/-/g, '[\\-]') + '\\s+\\d{4}\\s+([A-Z][A-Z,\\s]+?)(?:\\t|\\n)'
      ))
      if (gridMatch) {
        const name = gridMatch[1].trim()
        console.log(`[RichRecorder] Owner name: ${name}`)
        return name
      }

      // Broader fallback: any capitalized sequence after "Owner"
      const ownerMatch = bodyText.match(/Owner\s+([A-Z][A-Z,\s]{3,40})/)
      if (ownerMatch) {
        const name = ownerMatch[1].trim()
        console.log(`[RichRecorder] Owner name (fallback): ${name}`)
        return name
      }

      console.log('[RichRecorder] Could not extract owner name from PropertyTaxSearch')
      return null

    } catch (err) {
      console.log(`[RichRecorder] Owner lookup error: ${(err as Error).message}`)
      return null
    }
  }

  async searchParcel(parcelId: string, ownerName?: string): Promise<RichCountyResult | null> {
    if (!this.loggedIn) throw new Error('[RichRecorder] Not logged in — call init() first')

    console.log(`[RichRecorder] Searching for parcel ${parcelId}...`)

    try {
      await this.page!.goto(RECORDER_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })

      const url = this.page!.url()
      if (url.includes('GuestCredentials') || url.includes('Login')) {
        throw new Error('Session expired — re-login required')
      }

      const html = await this.page!.content()
      fs.writeFileSync('/tmp/rich-recorder-form.html', html)
      console.log(`[RichRecorder] On recorder form. URL: ${url}`)

      // Try search strategies in order of reliability:
      // 1. Parcel/serial number field (most precise)
      // 2. Owner/grantor name
      const searched = await this.tryParcelSearch(parcelId) ||
                       (ownerName ? await this.tryNameSearch(ownerName) : false)

      if (!searched) {
        console.log('[RichRecorder] All search strategies failed — check /tmp/rich-recorder-form.html')
        return null
      }

      // Navigation is handled inside submitSearch — content is ready
      const resultsHtml = await this.page!.content()
      fs.writeFileSync('/tmp/rich-recorder-results.html', resultsHtml)
      console.log(`[RichRecorder] Results page URL: ${this.page!.url()}`)

      return this.parseResults(resultsHtml)

    } catch (err) {
      console.error(`[RichRecorder] searchParcel error: ${(err as Error).message}`)
      return null
    }
  }

  private async tryParcelSearch(parcelId: string): Promise<boolean> {
    // DevExpress _I suffix convention: the actual <input> id is the wrapper id + "_I"
    const selectors = [
      '#ctl00_ContentPlaceHolder1_ASPxRoundPanel1_txtParcelNumber_I',
      'input[name*="txtParcelNumber"]',
      'input[id*="txtParcelNumber"]',
      'input[name*="Parcel" i]:not([id*="btn"])',
      'input[id*="Parcel" i]:not([id*="btn"])',
    ]

    for (const sel of selectors) {
      const el = this.page!.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[RichRecorder] Parcel input found: ${sel}`)
        await el.click()
        await this.page!.keyboard.press('Control+a')
        await this.page!.keyboard.press('Delete')
        await el.type(parcelId, { delay: 60 })
        await this.page!.evaluate((p: string) => {
          const fn = (window as any).ASPx
          if (fn?.GetControlCollection) {
            const ctrl = fn.GetControlCollection().Get('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_txtParcelNumber')
            if (ctrl?.SetValue) ctrl.SetValue(p)
          }
        }, parcelId)
        await this.page!.waitForTimeout(400)
        await this.submitSearch()
        return true
      }
    }
    return false
  }

  private async tryNameSearch(name: string): Promise<boolean> {
    // Grantor and grantee fields are typical on document search forms
    const nameSelectors = [
      'input[name*="Grantor" i]',
      'input[id*="Grantor" i]',
      'input[name*="Name" i]',
      'input[id*="Name" i]',
      'input[name*="grantee" i]',
      'input[id*="grantee" i]',
      'input[name*="owner" i]'
    ]

    for (const sel of nameSelectors) {
      const el = this.page!.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[RichRecorder] Name input found: ${sel}`)
        // Use last name only for broader match
        const lastName = name.split(/[,\s]+/)[0].trim()
        await el.fill(lastName)
        await this.page!.waitForTimeout(300)
        await this.submitSearch()
        return true
      }
    }

    // Last resort: fill the first visible text input
    const firstInput = this.page!.locator('input[type="text"]').first()
    if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[RichRecorder] Using first text input as fallback')
      const lastName = name.split(/[,\s]+/)[0].trim()
      await firstInput.fill(lastName)
      await this.page!.waitForTimeout(300)
      await this.submitSearch()
      return true
    }

    return false
  }

  private async submitSearch(): Promise<void> {
    // Set up navigation listener BEFORE click to avoid race condition
    const navPromise = this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 })

    // DevExpress submit buttons have readonly="readonly" — Playwright's click()
    // waits for "enabled" which never resolves. Must use JS eval to bypass.
    const clicked = await this.page!.evaluate(() => {
      const btn = document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_btnSearch_I') as HTMLInputElement | null
      if (btn) { btn.click(); return true }
      return false
    })

    if (!clicked) {
      await this.page!.locator('input[type="text"]').first().press('Enter')
      console.log('[RichRecorder] Search submitted via Enter')
    } else {
      console.log('[RichRecorder] Search submitted via JS eval click')
    }

    await navPromise
  }

  private parseResults(html: string): RichCountyResult {
    const result: RichCountyResult = {
      hasRecords: false,
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: [],
      yellowFlags: [],
      rawDocuments: []
    }

    if (html.toLowerCase().includes('no records') ||
        html.toLowerCase().includes('no results') ||
        html.toLowerCase().includes('no documents') ||
        html.toLowerCase().includes('0 record')) {
      console.log('[RichRecorder] No documents found')
      return result
    }

    // Extract all table rows — RecordingsSearch renders a grid with columns:
    // Entry #, Recorded Date, Document Type, Grantor, Grantee, Book, Page
    const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeed: { date: Date; type: string } | null = null

    for (const rowMatch of rowMatches) {
      const cellMatches = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      if (cellMatches.length < 3) continue

      const cells = cellMatches.map(m =>
        m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
      )

      // Skip header rows
      if (cells.some(c => /entry|document type|recorded|grantor|grantee/i.test(c) && cells.length > 2)) {
        const looksLikeHeader = cells.filter(c => /entry|type|date|grantor|grantee/i.test(c)).length >= 2
        if (looksLikeHeader) continue
      }

      // Detect which column is which based on content patterns
      let dateStr = '', docType = '', grantor = '', grantee = '', entry = ''

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        if (!entry && /^\d+$/.test(c)) entry = c
        else if (!dateStr && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(c)) dateStr = c
        else if (!docType && /DEED|TRUST|LIEN|RELEASE|MORTGAGE|RECONVEY/i.test(c)) docType = c
        else if (!grantor && docType && !grantee) grantor = c
        else if (!grantee && grantor) grantee = c
      }

      if (!docType) continue

      const docTypeUpper = docType.toUpperCase()

      // Parse date
      const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
      let date: Date | null = null
      if (dateMatch) {
        const [, m, d, y] = dateMatch
        let year = parseInt(y)
        if (year < 100) year += year < 50 ? 2000 : 1900
        date = new Date(year, parseInt(m) - 1, parseInt(d))
        if (isNaN(date.getTime())) date = null
      }

      result.rawDocuments.push({ date: dateStr, docType, grantor, grantee, entry })

      if (date && date >= fiveYearsAgo) result.documentCount5yr++

      if (MORTGAGE_TYPES.some(t => docTypeUpper.includes(t))) result.mortgageDocsFound++
      if (LIEN_TYPES.some(t => docTypeUpper.includes(t))) result.lienDocsFound++
      if (RELEASE_TYPES.some(t => docTypeUpper.includes(t))) result.releaseDocsFound++

      if (DEED_TYPES.some(t => docTypeUpper.includes(t)) && date) {
        if (!latestDeed || date > latestDeed.date) {
          latestDeed = { date, type: docType }
        }
      }
    }

    result.hasRecords = result.rawDocuments.length > 0

    if (latestDeed) {
      const { date, type } = latestDeed
      result.lastTransferDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      result.lastTransferType = mapDocType(type)
    }

    const netLiens = result.lienDocsFound - result.releaseDocsFound
    if (netLiens > 0) {
      result.redFlags.push(`${netLiens} unreleased lien(s)`)
    }

    console.log(`[RichRecorder] Parsed ${result.rawDocuments.length} docs, ${result.documentCount5yr} in 5yr window`)
    return result
  }

  private async saveSession(): Promise<void> {
    if (!this.context) return
    const storage = await this.context.storageState()
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2))
    console.log('[RichRecorder] Session saved')
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.saveSession()
      await this.context.close()
    }
    if (this.browser) await this.browser.close()
    console.log('[RichRecorder] Closed')
  }
}

function mapDocType(docType: string): string {
  const u = docType.toUpperCase()
  if (u.includes('WARRANTY')) return 'Warranty Deed'
  if (u.includes('QUIT CLAIM')) return 'Quit Claim Deed'
  if (u.includes('TRUSTEE')) return "Trustee's Deed"
  if (u.includes('SPECIAL WARRANTY')) return 'Special Warranty Deed'
  if (u.includes('DEED OF TRUST') || u.includes('TRUST DEED')) return 'Deed of Trust'
  if (u.includes('DEED')) return 'Deed'
  if (u.includes('RECONVEY')) return 'Reconveyance'
  return docType
}

export async function scrapeRichCounty(
  parcelId: string,
  ownerName?: string
): Promise<RichCountyResult | null> {
  const scraper = new RichCountyScraper()
  try {
    await scraper.init()

    // If no owner name provided, try to look it up from PropertyTaxSearch
    const name = ownerName ?? await scraper.lookupOwnerName(parcelId)
    return await scraper.searchParcel(parcelId, name ?? undefined)
  } finally {
    await scraper.close()
  }
}

export async function saveRichTitleSignals(
  prisma: PrismaClient,
  propertyId: string,
  data: RichCountyResult
): Promise<void> {
  const shared = {
    has_deed_records: data.hasRecords,
    document_count_5yr: data.documentCount5yr,
    last_transfer_date: data.lastTransferDate ? new Date(data.lastTransferDate) : null,
    last_transfer_type: data.lastTransferType ?? null,
    mortgage_docs_found: data.mortgageDocsFound,
    lien_docs_found: data.lienDocsFound,
    release_docs_found: data.releaseDocsFound,
    red_flags_count: data.redFlags.length,
    yellow_flags_count: data.yellowFlags.length,
    data_source: 'rich_county_recorder',
    source_url: RECORDER_URL
  }

  await prisma.titleSignals.upsert({
    where: { property_id: propertyId },
    create: { property_id: propertyId, ...shared },
    update: { ...shared, scraped_at: new Date() }
  })
}
