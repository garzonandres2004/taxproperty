// Tooele County Recorder Scraper
// https://erecording.tooeleco.gov/eaglesoftware/web/login.jsp
// Level C / Manual — EagleWeb requires browser automation
// Manual flow: login.jsp -> Enter Public Viewer -> Accept Terms -> Search -> Results

import { PrismaClient } from '@prisma/client'

export interface TooeleRecorderResult {
  hasRecords: boolean
  documentCount5yr: number
  lastTransferDate?: string
  lastTransferType?: string
  mortgageDocsFound: number
  lienDocsFound: number
  releaseDocsFound: number
  redFlags: string[]
  yellowFlags: string[]
}

// Tooele EagleWeb URLs
export const TOOELE_RECORDER_URLS = {
  login: 'https://erecording.tooeleco.gov/eaglesoftware/web/login.jsp',
  search: 'https://erecording.tooeleco.gov/eaglesoftware/web/documentSearch.jsp',
  mediciland: 'https://search.tooeleco.gov.mediciland.com/',
  parcelDirect: (parcel: string) => `https://erecording.tooeleco.gov/eaglesoftware/web/documentSearch.jsp?searchType=parcel&parcelNumber=${parcel}`
}

// Document type mappings
const DEED_TYPES = new Set(['WD', 'WARRANTY DEED', 'DEED', 'QD', 'QUIT CLAIM DEED', 'TRUSTEE DEED', 'TD'])
const MORTGAGE_TYPES = new Set(['MORTGAGE', 'DEED OF TRUST', 'DOT', 'TRUST DEED'])
const LIEN_TYPES = new Set(['LIEN', 'TAX LIEN', 'MECHANICS LIEN', 'JUDGMENT LIEN'])
const RELEASE_TYPES = new Set(['RELEASE', 'RECONVEYANCE', 'LIEN RELEASE', 'FULL RELEASE'])

interface ParsedDoc {
  date: Date | null
  docType: string
  docNumber: string
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

function parseDocumentTable(html: string): ParsedDoc[] {
  const docs: ParsedDoc[] = []

  // Look for results table
  const tableMatch = html.match(/<table[^>]*class="[^"]*(?:documentList|resultsTable|searchResults)[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
  if (!tableMatch) {
    // Try any table with doc-like content
    const allTables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)]
    for (const table of allTables) {
      if (table[1].includes('Document') || table[1].includes('Doc #') || table[1].includes('Recorded')) {
        return parseTableRows(table[1])
      }
    }
    return []
  }

  return parseTableRows(tableMatch[1])
}

function parseTableRows(tableHtml: string): ParsedDoc[] {
  const docs: ParsedDoc[] = []
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]

  for (let i = 1; i < rowMatches.length; i++) {
    const rowHtml = rowMatches[i][1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]

    if (cells.length < 3) continue

    const docNumber = stripTags(cells[0][1])
    const dateStr = stripTags(cells[1][1])
    const docType = stripTags(cells[2][1]).toUpperCase()

    if (!docNumber || !dateStr) continue

    let date: Date | null = null
    const datePatterns = [
      { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, yearIndex: 3, monthIndex: 1, dayIndex: 2 },
      { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, yearIndex: 3, monthIndex: 1, dayIndex: 2 },
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, yearIndex: 1, monthIndex: 2, dayIndex: 3 },
    ]

    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern.regex)
      if (match) {
        const year = parseInt(match[pattern.yearIndex])
        const month = parseInt(match[pattern.monthIndex]) - 1
        const day = parseInt(match[pattern.dayIndex])
        date = new Date(year, month, day)
        break
      }
    }

    docs.push({ date, docType: docType || 'UNKNOWN', docNumber })
  }

  return docs
}

function mapDocTypeToFriendly(docType: string): string {
  const upperType = docType.toUpperCase()

  if (upperType.includes('WARRANTY') || upperType === 'WD') return 'Warranty Deed'
  if (upperType.includes('QUIT CLAIM') || upperType === 'QD') return 'Quit Claim Deed'
  if (upperType.includes('TRUSTEE')) return "Trustee's Deed"
  if (upperType.includes('DEED OF TRUST') || upperType === 'DOT') return 'Deed of Trust'
  if (upperType.includes('DEED')) return 'Deed'
  if (upperType.includes('MORTGAGE')) return 'Mortgage'
  if (upperType.includes('LIEN')) return 'Lien'
  if (upperType.includes('RELEASE')) return 'Release'

  return docType
}

/**
 * Attempts to scrape Tooele County recorder.
 * NOTE: EagleWeb requires session management that may fail with simple fetch.
 * This function attempts automated extraction but will return null if blocked.
 * Manual lookup via the returned URLs is the reliable fallback.
 */
export async function scrapeTooeleCountyRecorder(
  parcelNumber: string
): Promise<TooeleRecorderResult | null> {
  try {
    const normalized = parcelNumber.replace(/[^0-9]/g, '').trim()

    if (!normalized || normalized.length < 9) {
      console.error(`Invalid parcel number: ${parcelNumber}`)
      return null
    }

    // Attempt to fetch via direct URL with session simulation
    // EagleWeb may block this - if so, manual lookup is required
    const searchUrl = `${TOOELE_RECORDER_URLS.search}?${new URLSearchParams({
      searchType: 'parcel',
      parcelNumber: normalized,
      submit: 'Search'
    }).toString()}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TaxProperty-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      console.error(`Tooele fetch failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check for session/login required
    if (html.includes('login') || html.includes('Login') || html.includes('session') || html.includes('Session')) {
      console.error('Tooele EagleWeb requires session/login - manual lookup needed')
      return null
    }

    // Check for no results
    if (html.includes('No documents found') || html.includes('No results') || html.includes('not found')) {
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

    const docs = parseDocumentTable(html)

    if (docs.length === 0) {
      // Could be parse failure or no documents
      return {
        hasRecords: false,
        documentCount5yr: 0,
        mortgageDocsFound: 0,
        lienDocsFound: 0,
        releaseDocsFound: 0,
        redFlags: ['Automated scraping may have failed - verify manually'],
        yellowFlags: []
      }
    }

    const result: TooeleRecorderResult = {
      hasRecords: true,
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: [],
      yellowFlags: []
    }

    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeedDate: Date | null = null
    let latestDeedType = ''

    for (const doc of docs) {
      if (doc.date && doc.date >= fiveYearsAgo) {
        result.documentCount5yr++
      }

      if (MORTGAGE_TYPES.has(doc.docType)) result.mortgageDocsFound++
      if (LIEN_TYPES.has(doc.docType)) result.lienDocsFound++
      if (RELEASE_TYPES.has(doc.docType)) result.releaseDocsFound++

      if (DEED_TYPES.has(doc.docType) && doc.date) {
        if (!latestDeedDate || doc.date > latestDeedDate) {
          latestDeedDate = doc.date
          latestDeedType = doc.docType
        }
      }
    }

    if (latestDeedDate) {
      const m = latestDeedDate.getMonth() + 1
      const d = latestDeedDate.getDate()
      const y = latestDeedDate.getFullYear()
      result.lastTransferDate = `${m}/${d}/${y}`
      result.lastTransferType = mapDocTypeToFriendly(latestDeedType)
    }

    const netLiens = result.lienDocsFound - result.releaseDocsFound
    if (netLiens > 0) {
      result.redFlags.push(`${netLiens} unreleased lien(s)`)
    }

    return result

  } catch (error) {
    console.error(`Tooele scraper error:`, error)
    return null
  }
}

export function getManualLookupInstructions(parcelNumber: string): string {
  const normalized = parcelNumber.replace(/[^0-9]/g, '').trim()

  return `
MANUAL TOOELE TITLE LOOKUP REQUIRED
=====================================
Parcel: ${parcelNumber}

Steps:
1. Visit: ${TOOELE_RECORDER_URLS.login}
2. Click "Enter" under "Public Web Limited Viewer"
3. Click "Accept" on the terms
4. Enter parcel: ${normalized}
5. Review document history

Backup: ${TOOELE_RECORDER_URLS.mediciland}?q=${normalized}
`
}

export async function saveTitleSignals(
  prisma: PrismaClient,
  propertyId: string,
  data: TooeleRecorderResult
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
    data_source: 'tooele_county_recorder'
  }

  await prisma.titleSignals.upsert({
    where: { property_id: propertyId },
    create: { property_id: propertyId, ...shared },
    update: { ...shared, scraped_at: new Date() }
  })
}

export async function batchScrapeTooeleCounty(
  prisma: PrismaClient,
  propertyIds: string[],
  options: { verbose?: boolean } = {}
): Promise<{ processed: number; failed: number; manualRequired: number }> {
  const { verbose = false } = options
  let processed = 0
  let failed = 0
  let manualRequired = 0

  for (const propertyId of propertyIds) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { parcel_number: true }
      })

      if (!property?.parcel_number) { failed++; continue }

      const result = await scrapeTooeleCountyRecorder(property.parcel_number)

      if (result) {
        await saveTitleSignals(prisma, propertyId, result)
        processed++
        if (verbose) {
          if (result.redFlags.some(f => f.includes('manual'))) {
            console.log(`[Tooele] ${property.parcel_number}: ⚠️  Manual verification recommended`)
            manualRequired++
          } else {
            console.log(`[Tooele] ${property.parcel_number}: ${result.documentCount5yr} docs, liens=${result.lienDocsFound}`)
          }
        }
      } else {
        // Save placeholder indicating manual lookup needed
        await saveTitleSignals(prisma, propertyId, {
          hasRecords: false,
          documentCount5yr: 0,
          mortgageDocsFound: 0,
          lienDocsFound: 0,
          releaseDocsFound: 0,
          redFlags: ['Manual lookup required - EagleWeb blocks automated access'],
          yellowFlags: []
        })
        failed++
        manualRequired++
      }

      await new Promise(r => setTimeout(r, 1000))

    } catch (error) {
      console.error(`Failed to scrape ${propertyId}:`, error)
      failed++
    }
  }

  return { processed, failed, manualRequired }
}
