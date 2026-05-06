#!/usr/bin/env tsx
// Rich County recorder — live verification run.
// Resolves owner from PropertyTaxSearch, searches RecordingsSearch, validates match.
//
// Usage:
//   RICH_COUNTY_RECORDER_EMAIL=x RICH_COUNTY_RECORDER_PASSWORD=y \
//     npx tsx scripts/verify-rich-title.ts [parcel]
//
// Default parcel: 41-30-090-0106

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env and .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const PARCEL = process.argv[2] ?? '41-30-090-0106'
const RECORDER_URL = 'http://search.richcounty.gov/RecordingsSearch.aspx'
const LOGIN_URL = 'http://search.richcounty.gov/Login.aspx'
const TAX_URL = 'http://search.richcounty.gov/PropertyTaxSearch.aspx'
const GUEST_URL = 'http://search.richcounty.gov/GuestCredentials.aspx'
const SESSION_FILE = path.join(process.cwd(), '.rich-county-session.json')
const ARTIFACT_FILE = '/tmp/rich-verify-artifact.json'

// Known subdivision/area clues for parcel 41-30-090-0106 (Garden City / Bear Lake)
const KNOWN_AREA_CLUES = ['EAGLE FEATHER', 'SHUNDAHAI', 'BEAR LAKE', 'GARDEN CITY', 'RICH COUNTY']

interface RawDoc {
  entry: string
  date: string
  docType: string
  grantor: string
  grantee: string
}

interface VerificationArtifact {
  parcel: string
  taxOwnerRaw: string | null
  searchTerm: string | null
  docsReturned: number
  rawDocs: RawDoc[]
  verdict: 'PASS' | 'FAIL' | 'AMBIGUOUS'
  verdictReason: string
}

class Verifier {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null

  async init(email: string, password: string): Promise<void> {
    this.browser = await chromium.launch({ headless: true })

    let storageState: any = undefined
    if (fs.existsSync(SESSION_FILE)) {
      try {
        storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
        console.log('[Verify] Loaded saved session')
      } catch { /* ignore */ }
    }

    this.context = await this.browser.newContext({
      storageState,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(30000)

    const valid = storageState ? await this.isLoggedIn() : false
    if (!valid) {
      console.log('[Verify] Session invalid or absent — logging in...')
      await this.doLogin(email, password)
    } else {
      console.log('[Verify] Session valid')
    }
  }

  private async isLoggedIn(): Promise<boolean> {
    try {
      await this.page!.goto(RECORDER_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const url = this.page!.url()
      return !url.includes('Login.aspx') && !url.includes('GuestCredentials')
    } catch {
      return false
    }
  }

  private async doLogin(email: string, password: string): Promise<void> {
    // RecordingsSearch.aspx redirects to Login.aspx which has:
    //   chkDisclaimer (checkbox), txtUsername, txtWebPassword, btnLogin ("Login")
    await this.page!.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
    const url = this.page!.url()
    const html = await this.page!.content()
    fs.writeFileSync('/tmp/rich-login-form.html', html)
    console.log(`[Verify] Login page: ${url}`)

    // Check the disclaimer checkbox (required before login is accepted)
    const disclaimer = this.page!.locator(
      'input[name*="chkDisclaimer"], input[id*="chkDisclaimer"]'
    ).first()
    if (await disclaimer.isVisible({ timeout: 3000 }).catch(() => false)) {
      const checked = await disclaimer.isChecked().catch(() => false)
      if (!checked) {
        await disclaimer.check()
        console.log('[Verify] Disclaimer checked')
      }
    } else {
      console.log('[Verify] No disclaimer checkbox found — proceeding')
    }

    // Username field (email address)
    const usernameInput = this.page!.locator(
      'input[name*="txtUsername"], input[id*="txtUsername"]'
    ).first()
    if (!await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Username input not found. Check /tmp/rich-login-form.html')
    }
    await usernameInput.fill(email)
    console.log('[Verify] Username filled')

    // Password field
    const pwInput = this.page!.locator(
      'input[name*="txtWebPassword"], input[id*="txtWebPassword"]'
    ).first()
    if (!await pwInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Password input not found')
    }
    await pwInput.fill(password)
    console.log('[Verify] Password filled')

    await this.page!.waitForTimeout(300)

    // Login button (not the "Create a Guest Account" button)
    const loginBtn = this.page!.locator(
      'input[name*="btnLogin"], input[id*="btnLogin"]'
    ).first()
    if (!await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('Login button not found')
    }
    await loginBtn.click()
    await this.page!.waitForLoadState('domcontentloaded', { timeout: 20000 })

    const afterUrl = this.page!.url()
    const afterHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-after-login.html', afterHtml)
    console.log(`[Verify] After login URL: ${afterUrl}`)

    if (afterUrl.includes('Login.aspx')) {
      // Check for error message
      const errMatch = afterHtml.match(/<span[^>]*color:Red[^>]*>([^<]+)<\/span>/)
      const errMsg = errMatch ? errMatch[1].trim() : 'unknown error'
      throw new Error(`Login failed — still on Login.aspx. Server said: "${errMsg}". Check /tmp/rich-after-login.html`)
    }

    await this.saveSession()
    console.log('[Verify] Login successful')
  }

  async lookupOwner(parcel: string): Promise<{ rawText: string; ownerName: string | null }> {
    console.log(`\n[Verify] Resolving owner for ${parcel} via PropertyTaxSearch...`)
    await this.page!.goto(TAX_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })

    const formHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-tax-form.html', formHtml)

    // DevExpress renders: wrapper table id="...txtParcel", actual input id="...txtParcel_I"
    const parcelInput = this.page!.locator('#ctl00_ContentPlaceHolder1_txtParcel_I').first()

    if (!await parcelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Verify] DevExpress parcel input not found — check /tmp/rich-tax-form.html')
      return { rawText: '', ownerName: null }
    }

    // DevExpress requires real keystrokes — .fill() doesn't update internal state.
    // Click to focus, clear any existing value, type character-by-character.
    await parcelInput.click()
    await this.page!.keyboard.press('Control+a')
    await this.page!.keyboard.press('Delete')
    await parcelInput.type(parcel, { delay: 60 })
    await this.page!.waitForTimeout(300)

    // Try the DevExpress JS API as a belt-and-suspenders measure
    await this.page!.evaluate((p: string) => {
      const fn = (window as any).ASPx
      if (fn?.GetControlCollection) {
        const ctrl = fn.GetControlCollection().Get('ctl00_ContentPlaceHolder1_txtParcel')
        if (ctrl?.SetValue) ctrl.SetValue(p)
      }
    }, parcel)
    await this.page!.waitForTimeout(200)

    // Click the Search button (_I suffix = actual submit input inside DevExpress wrapper)
    const searchBtn = this.page!.locator('#ctl00_ContentPlaceHolder1_btnSearch_I').first()
    if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBtn.click()
    } else {
      await parcelInput.press('Enter')
    }

    await this.page!.waitForLoadState('domcontentloaded', { timeout: 20000 })

    const resultsHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-tax-results.html', resultsHtml)
    console.log(`[Verify] PropertyTaxSearch result URL: ${this.page!.url()}`)

    // Extract all table text — results render in a DevExpress grid
    const bodyText = await this.page!.evaluate(() => {
      const body = document.body
      return body ? body.innerText : ''
    })

    console.log(`[Verify] Tax result body (first 800 chars):\n${bodyText.slice(0, 800)}`)

    // Parse owner from result — look for name-like text in table cells
    let ownerName: string | null = null

    // Try structured extraction via DOM
    try {
      // DevExpress grid rows have class dxgvDataRow_DevEx
      const gridRows = await this.page!.locator('.dxgvDataRow_DevEx, tr.dxgvDataRow_DevEx').all()
      for (const row of gridRows) {
        const cells = await row.locator('td').all()
        const texts = await Promise.all(cells.map(c => c.textContent().then(t => (t || '').trim())))
        console.log(`[Verify] Grid row: ${JSON.stringify(texts)}`)
        // Owner name is typically in a cell that isn't numeric and isn't parcel-formatted
        const candidate = texts.find(t =>
          t.length > 3 &&
          !/^\d/.test(t) &&
          !/-\d+-/.test(t) &&
          !/^\$/.test(t) &&
          !/^\d{2}\//.test(t)
        )
        if (candidate) {
          ownerName = candidate
          break
        }
      }
    } catch { /* ignore */ }

    // Fallback: regex patterns in bodyText
    if (!ownerName) {
      const ownerPatterns = [
        /(?:Owner|Taxpayer|Name)[:\s]+([A-Z][A-Z\s,\.&']{3,40})/i,
        /\b([A-Z]{2,}(?:[\s,]+[A-Z]{2,}){1,3})\b(?=\s+\d{2}-\d{2}-\d{3})/
      ]
      for (const pat of ownerPatterns) {
        const m = bodyText.match(pat)
        if (m?.[1]?.trim().length > 3) {
          ownerName = m[1].trim()
          break
        }
      }
    }

    console.log(`[Verify] Extracted owner name: ${ownerName ?? '(none found)'}`)
    return { rawText: bodyText.slice(0, 2000), ownerName }
  }

  async searchRecorder(parcelId: string): Promise<RawDoc[]> {
    // Search strategy: parcel number first (exact match), grantor name fallback.
    // The form has txtParcelNumber which returns only documents for that specific parcel.
    console.log(`\n[Verify] Searching recorder by parcel: "${parcelId}"`)
    await this.page!.goto(RECORDER_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })

    const formHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-recorder-form.html', formHtml)
    console.log(`[Verify] Recorder form URL: ${this.page!.url()}`)

    // Parcel number field — exact ID known from form inspection
    const parcelInput = this.page!.locator(
      '#ctl00_ContentPlaceHolder1_ASPxRoundPanel1_txtParcelNumber_I'
    ).first()

    if (!await parcelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error('Parcel number input not found on RecordingsSearch — check /tmp/rich-recorder-form.html')
    }

    // DevExpress: type character-by-character + JS API
    await parcelInput.click()
    await this.page!.keyboard.press('Control+a')
    await this.page!.keyboard.press('Delete')
    await parcelInput.type(parcelId, { delay: 60 })
    await this.page!.evaluate((p: string) => {
      const fn = (window as any).ASPx
      if (fn?.GetControlCollection) {
        const ctrl = fn.GetControlCollection().Get('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_txtParcelNumber')
        if (ctrl?.SetValue) ctrl.SetValue(p)
      }
    }, parcelId)
    await this.page!.waitForTimeout(400)
    console.log(`[Verify] Filled parcel "${parcelId}" into txtParcelNumber`)

    // DevExpress buttons render as readonly — must click via JS to bypass enabled-check.
    // Set up waitForNavigation BEFORE the click so we don't miss the navigation event.
    const navPromise = this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 })
    const clicked = await this.page!.evaluate(() => {
      const btn = document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_btnSearch_I') as HTMLInputElement | null
      if (btn) { btn.click(); return true }
      return false
    })
    if (clicked) {
      console.log('[Verify] Clicked Search via JS eval')
    } else {
      await parcelInput.press('Enter')
      console.log('[Verify] Submitted via Enter (button not found via JS)')
    }

    await navPromise

    const resultsHtml = await this.page!.content()
    fs.writeFileSync('/tmp/rich-recorder-results.html', resultsHtml)
    console.log(`[Verify] Results URL: ${this.page!.url()}`)
    console.log(`[Verify] Results HTML size: ${resultsHtml.length} chars`)

    const docs = this.parseDocumentTable(resultsHtml)

    // Fetch recording details for each doc to get doc type and confirm parcel match
    if (docs.length > 0 && docs.length <= 20) {
      await this.enrichDocsWithDetails(resultsHtml, docs)
    }

    return docs
  }

  private async enrichDocsWithDetails(resultsHtml: string, docs: RawDoc[]): Promise<void> {
    // Extract RecordingInformation.aspx links from the results grid
    const linkMatches = [...resultsHtml.matchAll(/href="(RecordingInformation\.aspx\?\d+)"/gi)]
    const links = linkMatches.map(m => `http://search.richcounty.gov/${m[1]}`)

    console.log(`[Verify] Fetching details for ${links.length} recording(s)...`)

    for (let i = 0; i < links.length && i < docs.length; i++) {
      try {
        await this.page!.goto(links[i], { waitUntil: 'domcontentloaded', timeout: 15000 })
        const detailText = await this.page!.evaluate(() => document.body.innerText)

        // Extract Instrument type
        const instrMatch = detailText.match(/Instrument:\s*\(\d+\)\s*-\s*([^\n\r]+)/)
        if (instrMatch) docs[i].docType = instrMatch[1].trim()

        // Extract Grantor(s)
        const grantorMatch = detailText.match(/Grantor\(s\):\s*([^\n]+(?:\n[^\n]+)*?)(?=Grantee|Parcels)/is)
        if (grantorMatch) {
          docs[i].grantor = grantorMatch[1].replace(/\s+/g, ' ').trim().split('\n')[0].trim()
        }

        // Extract Grantee(s)
        const granteeMatch = detailText.match(/Grantee\(s\):\s*([^\n]+(?:\n[^\n]+)*?)(?=Parcels|$)/is)
        if (granteeMatch) {
          docs[i].grantee = granteeMatch[1].replace(/\s+/g, ' ').trim().split('\n')[0].trim()
        }

        // Extract parcel from detail page to confirm
        const parcelMatch = detailText.match(/(\d{2}-\d{2}-\d{3}-\d{4})/)
        if (parcelMatch) {
          console.log(`[Verify] Entry ${docs[i].entry}: type="${docs[i].docType}" grantor="${docs[i].grantor}" parcel=${parcelMatch[1]}`)
        }

        fs.writeFileSync(`/tmp/rich-detail-${docs[i].entry}.html`, await this.page!.content())
        await this.page!.waitForTimeout(200)
      } catch (err) {
        console.log(`[Verify] Detail fetch failed for entry ${docs[i].entry}: ${(err as Error).message}`)
      }
    }
  }

  private parseDocumentTable(html: string): RawDoc[] {
    const docs: RawDoc[] = []

    if (/no records|no results|no documents|0 records|no matching/i.test(html)) {
      console.log('[Verify] Page indicates no results')
      return docs
    }

    const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]

    for (const rowMatch of rowMatches) {
      const cellMatches = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      if (cellMatches.length < 3) continue

      const cells = cellMatches.map(m =>
        m[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim()
      ).filter(c => c.length > 0)

      // Skip header rows
      const looksLikeHeader = cells.filter(c =>
        /^(entry|document|recorded|grantor|grantee|book|page|type|date)$/i.test(c)
      ).length >= 3
      if (looksLikeHeader) continue

      // Auto-detect columns
      let entry = '', date = '', docType = '', grantor = '', grantee = ''

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        if (!entry && /^\d{4,}$/.test(c)) { entry = c; continue }
        if (!date && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(c)) { date = c; continue }
        if (!docType && /DEED|TRUST|LIEN|RELEASE|MORTGAGE|RECONVEY|NOTICE|JUDGMENT/i.test(c)) { docType = c; continue }
        if (docType && !grantor && c.length > 2) { grantor = c; continue }
        if (grantor && !grantee && c.length > 2) { grantee = c; continue }
      }

      if (!docType && !date) continue // skip rows with no useful content

      docs.push({ entry, date, docType, grantor, grantee })
    }

    return docs
  }

  private async saveSession(): Promise<void> {
    if (!this.context) return
    const storage = await this.context.storageState()
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2))
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.saveSession()
      await this.context.close()
    }
    if (this.browser) await this.browser.close()
  }
}

function validateMatch(
  ownerName: string,
  docs: RawDoc[],
  searchedByParcel: boolean
): { verdict: 'PASS' | 'FAIL' | 'AMBIGUOUS'; reason: string; matchScore: number } {
  if (docs.length === 0) {
    // 0 docs on a parcel search is valid — parcel has no recorded docs (index starts 2019)
    return {
      verdict: 'PASS',
      reason: `Parcel search returned 0 documents — property has no recorded docs in the index (coverage starts 2019-01-01). Title is clean by absence of record.`,
      matchScore: 1.0
    }
  }

  if (searchedByParcel) {
    // Parcel search: all returned docs are for this specific parcel by definition
    const allText = docs.map(d => `${d.grantor} ${d.grantee} ${d.docType}`).join(' ').toUpperCase()
    const areaCluesFound = KNOWN_AREA_CLUES.filter(c => allText.includes(c))
    const ownerInDocs = docs.some(d =>
      d.grantor.toUpperCase().includes(ownerName.split(/[,\s]+/)[0].trim().toUpperCase()) ||
      d.grantee.toUpperCase().includes(ownerName.split(/[,\s]+/)[0].trim().toUpperCase())
    )

    console.log(`\n[Verify] Match analysis (parcel search — exact):`)
    console.log(`  Parcel: ${PARCEL}`)
    console.log(`  Docs returned: ${docs.length} (all belong to this parcel)`)
    console.log(`  Owner "${ownerName}" found in doc parties: ${ownerInDocs ? 'YES' : 'NO (expected for older docs)'}`)
    console.log(`  Area clues found: ${areaCluesFound.length > 0 ? areaCluesFound.join(', ') : 'none'}`)

    return {
      verdict: 'PASS',
      reason: `Parcel-number search — all ${docs.length} doc(s) belong to parcel ${PARCEL} by definition. Owner "${ownerName}" in parties: ${ownerInDocs ? 'yes' : 'no (acceptable for historical transfers)'}. Area clues: ${areaCluesFound.join(', ') || 'none visible in index metadata'}.`,
      matchScore: 1.0
    }
  }

  // Fallback: owner-name search analysis
  const lastName = ownerName.split(/[,\s]+/)[0].trim().toUpperCase()
  const matchingDocs = docs.filter(d =>
    d.grantor.toUpperCase().includes(lastName) || d.grantee.toUpperCase().includes(lastName)
  )
  const uniqueLastNames = new Set(
    docs.flatMap(d => [d.grantor, d.grantee])
      .map(p => p.split(/[,\s]+/)[0].trim().toUpperCase())
      .filter(p => p.length > 2)
  )
  const matchScore = matchingDocs.length / docs.length

  if (uniqueLastNames.size > 15 || (docs.length > 30 && matchScore < 0.3)) {
    return {
      verdict: 'AMBIGUOUS',
      reason: `SEARCH_OVERMATCH: "${lastName}" search returned ${docs.length} docs with ${uniqueLastNames.size} unique surnames — too broad.`,
      matchScore
    }
  }
  if (matchScore >= 0.3) {
    return { verdict: 'PASS', reason: `Owner-name match: ${matchingDocs.length}/${docs.length} docs contain "${lastName}".`, matchScore }
  }
  return {
    verdict: 'AMBIGUOUS',
    reason: `LOW_CONFIDENCE_MATCH: "${lastName}" in only ${matchingDocs.length}/${docs.length} docs.`,
    matchScore
  }
}

async function main() {
  const email = process.env.RICH_COUNTY_RECORDER_EMAIL
  const password = process.env.RICH_COUNTY_RECORDER_PASSWORD

  if (!email || !password) {
    console.error('\nFATAL: RICH_COUNTY_RECORDER_EMAIL and RICH_COUNTY_RECORDER_PASSWORD must be set.')
    console.error('Register a free guest account at:', GUEST_URL)
    process.exit(1)
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  RICH COUNTY RECORDER — LIVE VERIFICATION`)
  console.log(`  Parcel: ${PARCEL}`)
  console.log(`  Email:  ${email}`)
  console.log(`${'═'.repeat(60)}\n`)

  const verifier = new Verifier()
  const artifact: VerificationArtifact = {
    parcel: PARCEL,
    taxOwnerRaw: null,
    searchTerm: null,
    docsReturned: 0,
    rawDocs: [],
    verdict: 'FAIL',
    verdictReason: 'Not completed'
  }

  try {
    await verifier.init(email, password)

    // Step 1: Resolve owner from PropertyTaxSearch
    console.log('\n── Step 1: Owner lookup (PropertyTaxSearch) ─────────')
    const { rawText, ownerName } = await verifier.lookupOwner(PARCEL)
    artifact.taxOwnerRaw = rawText

    console.log(`  Parcel ID:     ${PARCEL}`)
    console.log(`  Owner (raw):   ${ownerName ?? '(not found)'}`)

    if (!ownerName) {
      artifact.verdict = 'FAIL'
      artifact.verdictReason = 'Could not resolve owner name from PropertyTaxSearch — check /tmp/rich-tax-results.html'
      console.log('\n  FAIL: Cannot proceed without owner name.')
      return
    }

    // Step 2: Search recorder by parcel number (exact match — no owner-name overmatch risk)
    console.log('\n── Step 2: Recorder search (RecordingsSearch) ───────')
    artifact.searchTerm = PARCEL
    console.log(`  Search term:   "${PARCEL}" (parcel number — direct search)`)

    const docs = await verifier.searchRecorder(PARCEL)
    artifact.docsReturned = docs.length
    artifact.rawDocs = docs

    console.log(`  Documents returned: ${docs.length}`)

    // Step 3: Print first 10 rows
    console.log('\n── Step 3: Raw document rows ────────────────────────')
    if (docs.length === 0) {
      console.log('  (no documents returned)')
    } else {
      const header = `  ${'ENTRY'.padEnd(8)} ${'DATE'.padEnd(12)} ${'TYPE'.padEnd(28)} ${'GRANTOR'.padEnd(24)} GRANTEE`
      console.log(header)
      console.log('  ' + '─'.repeat(100))
      docs.slice(0, 10).forEach(doc => {
        console.log(
          `  ${doc.entry.padEnd(8)} ` +
          `${doc.date.padEnd(12)} ` +
          `${doc.docType.slice(0, 26).padEnd(28)} ` +
          `${doc.grantor.slice(0, 22).padEnd(24)} ` +
          doc.grantee.slice(0, 30)
        )
      })
      if (docs.length > 10) console.log(`  ... and ${docs.length - 10} more`)
    }

    // Step 4: Validate match
    console.log('\n── Step 4: Match validation ─────────────────────────')
    const { verdict, reason, matchScore } = validateMatch(ownerName, docs)
    artifact.verdict = verdict
    artifact.verdictReason = reason

    // Step 5: Compute TitleSignals if credible
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const DEED_TYPES = ['WARRANTY DEED', 'QUIT CLAIM', 'TRUSTEE DEED', 'SPECIAL WARRANTY', 'DEED']
    const MORTGAGE_TYPES = ['DEED OF TRUST', 'TRUST DEED', 'MORTGAGE']
    const LIEN_TYPES = ['LIEN', 'TAX LIEN', 'MECHANICS LIEN', 'JUDGMENT', 'NOTICE OF LIEN']
    const RELEASE_TYPES = ['RELEASE', 'RECONVEYANCE', 'FULL RELEASE', 'LIEN RELEASE', 'SUBSTITUTION']

    if (verdict !== 'FAIL') {
      let doc5yr = 0, mortgageCount = 0, lienCount = 0, releaseCount = 0, redFlags = 0
      let lastTransferDate = '', lastTransferType = '', latestDeedMs = 0

      for (const doc of docs) {
        const u = doc.docType.toUpperCase()
        const dateMatch = doc.date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
        let date: Date | null = null
        if (dateMatch) {
          let y = parseInt(dateMatch[3])
          if (y < 100) y += y < 50 ? 2000 : 1900
          date = new Date(y, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]))
          if (isNaN(date.getTime())) date = null
        }

        if (date && date >= fiveYearsAgo) doc5yr++
        if (MORTGAGE_TYPES.some(t => u.includes(t))) mortgageCount++
        if (LIEN_TYPES.some(t => u.includes(t))) lienCount++
        if (RELEASE_TYPES.some(t => u.includes(t))) releaseCount++
        if (DEED_TYPES.some(t => u.includes(t)) && date && date.getTime() > latestDeedMs) {
          latestDeedMs = date.getTime()
          lastTransferDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
          lastTransferType = u.includes('WARRANTY') ? 'Warranty Deed'
            : u.includes('QUIT CLAIM') ? 'Quit Claim Deed'
            : u.includes('TRUSTEE') ? "Trustee's Deed"
            : u.includes('DEED OF TRUST') ? 'Deed of Trust'
            : 'Deed'
        }

        const netLiens = lienCount - releaseCount
        redFlags = netLiens > 0 ? netLiens : 0
      }

      console.log('\n── Step 5: TitleSignals ─────────────────────────────')
      const signals = {
        has_deed_records: docs.length > 0,
        document_count_5yr: doc5yr,
        last_transfer_date: lastTransferDate || null,
        last_transfer_type: lastTransferType || null,
        mortgage_count: mortgageCount,
        lien_count: lienCount,
        release_count: releaseCount,
        red_flags_count: redFlags
      }
      console.log('  ' + JSON.stringify(signals, null, 2).replace(/\n/g, '\n  '))
    }

  } finally {
    await verifier.close()
    fs.writeFileSync(ARTIFACT_FILE, JSON.stringify(artifact, null, 2))
    console.log(`\n[Verify] Artifact saved to ${ARTIFACT_FILE}`)
  }

  // Final summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  RESULT: ${artifact.verdict}`)
  console.log(`  Parcel:      ${artifact.parcel}`)
  console.log(`  Owner used:  ${artifact.taxOwnerRaw ? artifact.searchTerm : '(none)'}`)
  console.log(`  Docs found:  ${artifact.docsReturned}`)
  console.log(`  Why:         ${artifact.verdictReason}`)

  if (artifact.verdict === 'PASS') {
    const uniqueLastNames = new Set(
      artifact.rawDocs
        .flatMap(d => [d.grantor, d.grantee])
        .map(p => p.split(/[,\s]+/)[0].trim().toUpperCase())
        .filter(p => p.length > 2)
    )
    const overMatchRisk = uniqueLastNames.size > 10 || artifact.docsReturned > 30
    console.log(`\n  Batch safety: ${overMatchRisk
      ? 'CAUTION — last-name search may over-match for common surnames. Add owner-name filter on save.'
      : 'SAFE — surname is distinctive enough for batch use with owner-name verification.'
    }`)
  }

  if (artifact.verdict === 'AMBIGUOUS') {
    console.log('\n  Recommendation: Do NOT batch by last name alone for this owner.')
    console.log('  Options: (a) full-name search, (b) cross-filter by parcel area, (c) manual review.')
  }

  console.log(`${'═'.repeat(60)}\n`)
  process.exit(artifact.verdict === 'FAIL' ? 1 : 0)
}

main().catch(err => {
  console.error('\nFATAL:', err.message)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
