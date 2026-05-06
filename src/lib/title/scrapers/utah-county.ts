// Utah County Recorder Scraper
// https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={serial}
// Level B Automation — direct URL, no login, no CAPTCHA

import { PrismaClient } from '@prisma/client'

export interface UtahRecorderResult {
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

const RECORDER_BASE_URL = 'https://www.utahcounty.gov/LandRecords/Property.asp'

// Doc types that represent ownership transfers (triggers has_deed_records + lastTransfer)
const DEED_TYPES = new Set(['WD', 'DQT'])
// Trust deeds = mortgages in Utah
const MORTGAGE_TYPES = new Set(['D TR'])
// Active lien notices
const LIEN_TYPES = new Set(['N LN', 'W LN'])
// Preliminary lien intent (yellow flag only)
const LIEN_INTENT_TYPES = new Set(['NI PREL'])
// Releases, reconveyances, trustee substitutions
const RELEASE_TYPES = new Set(['REC', 'P REC', 'R LN', 'R NOT', 'RSUBTEE'])

interface ParsedDoc {
  date: Date | null
  docType: string
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function parseDocTable(html: string): ParsedDoc[] {
  // Table 9 is identified by its header cell
  const anchorIdx = html.indexOf('<td><em><strong>Entry #</strong></em></td>')
  if (anchorIdx === -1) return []

  const tableStart = html.lastIndexOf('<table>', anchorIdx)
  if (tableStart === -1) return []

  // Table 9 is the last table in the document
  const tableEnd = html.lastIndexOf('</table>') + '</table>'.length
  const tableHtml = html.substring(tableStart, tableEnd)

  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const docs: ParsedDoc[] = []

  // rowMatches[0] is the header row — skip it
  for (let i = 1; i < rowMatches.length; i++) {
    const cellMatches = [...rowMatches[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    if (cellMatches.length < 4) continue

    const dateStr = stripTags(cellMatches[1][1])
    const docType = stripTags(cellMatches[3][1]).toUpperCase()

    const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    const date = dateMatch
      ? new Date(parseInt(dateMatch[3]), parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]))
      : null

    docs.push({ date, docType })
  }

  return docs
}

export async function scrapeUtahCountyRecorder(
  parcelNumber: string
): Promise<UtahRecorderResult | null> {
  try {
    const normalizedParcel = parcelNumber.replace(/:/g, '').trim()
    if (!normalizedParcel || normalizedParcel.length < 9) {
      console.error(`Invalid parcel number: ${parcelNumber}`)
      return null
    }

    const url = `${RECORDER_BASE_URL}?av_serial=${normalizedParcel}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaxProperty-Utah/1.0 (Research Bot)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })

    if (!response.ok) {
      console.error(`Recorder fetch failed: ${response.status} for ${parcelNumber}`)
      return null
    }

    const html = await response.text()

    const docs = parseDocTable(html)

    const result: UtahRecorderResult = {
      hasRecords: docs.length > 0,
      documentCount5yr: 0,
      mortgageDocsFound: 0,
      lienDocsFound: 0,
      releaseDocsFound: 0,
      redFlags: [],
      yellowFlags: []
    }

    if (docs.length === 0) return result

    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    let latestDeedDate: Date | null = null

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
          result.lastTransferType = doc.docType
        }
      }
    }

    if (latestDeedDate) {
      const m = latestDeedDate.getMonth() + 1
      const d = latestDeedDate.getDate()
      const y = latestDeedDate.getFullYear()
      result.lastTransferDate = `${m}/${d}/${y}`
    }

    // Red flags: unreleased liens (net positive lien balance)
    const netLiens = result.lienDocsFound - result.releaseDocsFound
    if (netLiens > 0) {
      result.redFlags.push(`${netLiens} unreleased lien(s) detected`)
    }

    // Yellow flags: preliminary lien intent
    const niPrelCount = docs.filter(d => LIEN_INTENT_TYPES.has(d.docType)).length
    if (niPrelCount > 0) {
      result.yellowFlags.push(`${niPrelCount} preliminary lien notice(s) on record`)
    }

    return result

  } catch (error) {
    console.error(`Utah County scraper error for ${parcelNumber}:`, error)
    return null
  }
}

export async function saveTitleSignals(
  prisma: PrismaClient,
  propertyId: string,
  data: UtahRecorderResult
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
    data_source: 'utah_county_recorder'
  }

  await prisma.titleSignals.upsert({
    where: { property_id: propertyId },
    create: { property_id: propertyId, ...shared },
    update: { ...shared, scraped_at: new Date() }
  })
}

export async function batchScrapeUtahCounty(
  prisma: PrismaClient,
  propertyIds: string[],
  options: { verbose?: boolean } = {}
): Promise<{ processed: number; failed: number }> {
  const { verbose = false } = options
  let processed = 0
  let failed = 0

  for (const propertyId of propertyIds) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { parcel_number: true }
      })

      if (!property?.parcel_number) { failed++; continue }

      const result = await scrapeUtahCountyRecorder(property.parcel_number)

      if (result) {
        await saveTitleSignals(prisma, propertyId, result)
        processed++
        if (verbose) {
          console.log(`[Utah Scraper] ${property.parcel_number}: ${result.documentCount5yr} docs (5yr), liens=${result.lienDocsFound} releases=${result.releaseDocsFound} redFlags=${result.redFlags.length}`)
        }
      } else {
        failed++
      }

      await new Promise(r => setTimeout(r, 500))

    } catch (error) {
      console.error(`Failed to scrape ${propertyId}:`, error)
      failed++
    }
  }

  return { processed, failed }
}
