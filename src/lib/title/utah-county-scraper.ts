/**
 * Utah County Land Records Document Scraper
 * Scrapes recorded documents for a property from the public records
 */

import * as cheerio from 'cheerio'

export interface DocumentRecord {
  entry: string
  year: string
  date: string
  recordedDate: string
  type: string
  party1: string // Grantor
  party2: string // Grantee
  consideration?: string
}

export interface DocumentDetail {
  kindOfInstrument: string
  grantors: string[]
  grantees: string[]
  consideration: string
  recordingDate: string
  releases: string
  pdfUrl?: string
}

/**
 * Normalize parcel number for URL
 * 03:060:0016 -> 030600016
 */
function normalizeParcelNumber(parcelNumber: string): string {
  return parcelNumber.replace(/:/g, '').trim()
}

/**
 * Scrape document list from property page
 */
export async function scrapeDocumentList(parcelNumber: string): Promise<DocumentRecord[]> {
  const normalizedParcel = normalizeParcelNumber(parcelNumber)
  const url = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalizedParcel}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch property page: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Find the Documents table
    // Based on debug: Table structure is:
    // Entry # | Date | Recorded | Type | Party1 (Grantor) | Party2 (Grantee)
    const documents: DocumentRecord[] = []

    // Look for the Documents table by finding the table with Entry/Type headers
    $('table').each((_, table) => {
      const $table = $(table)
      const headerText = $table.find('tr').first().text().toLowerCase()

      // Check if this is the documents table
      if (headerText.includes('entry') && headerText.includes('grantor') && headerText.includes('grantee')) {
        $table.find('tr').slice(1).each((_, row) => {
          const $cells = $(row).find('td')
          if ($cells.length >= 6) {
            const entryText = $cells.eq(0).text().trim()
            const date = $cells.eq(1).text().trim()
            const recordedDate = $cells.eq(2).text().trim()
            const type = $cells.eq(3).text().trim()
            const party1 = $cells.eq(4).text().trim()
            const party2 = $cells.eq(5).text().trim()

            // Skip rows that don't have a valid entry number format (e.g. "Property Information")
            // Valid format: "187386-2020" (numbers-year)
            const entryMatch = entryText.match(/^(\d+)-(\d{4})$/)
            if (!entryMatch) {
              return // Skip this row
            }

            const [, entry, year] = entryMatch

            if (entry && year) {
              documents.push({
                entry: entry.trim(),
                year: year.trim(),
                date,
                recordedDate,
                type,
                party1,
                party2
              })
            }
          }
        })
      }
    })

    // Deduplicate documents by entry-year (sometimes multiple tables match)
    const seen = new Set<string>()
    const uniqueDocs = documents.filter(doc => {
      const key = `${doc.entry}-${doc.year}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return uniqueDocs
  } catch (error) {
    console.error('Error scraping document list:', error)
    return []
  }
}

/**
 * Scrape document detail page
 */
export async function scrapeDocumentDetail(entry: string, year: string): Promise<DocumentDetail | null> {
  const url = `https://www.utahcounty.gov/LandRecords/Document.asp?aventry=${entry}&avyear=${year}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch document detail: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const detail: DocumentDetail = {
      kindOfInstrument: '',
      grantors: [],
      grantees: [],
      consideration: '',
      recordingDate: '',
      releases: ''
    }

    // Parse the detail table
    $('table tr').each((_, row) => {
      const $row = $(row)
      const label = $row.find('td:first-child').text().trim()
      const value = $row.find('td:last-child').text().trim()

      switch (label) {
        case 'Kind of Instrument:':
          detail.kindOfInstrument = value
          break
        case 'Grantor(s):':
          detail.grantors = value.split('\n').map(s => s.trim()).filter(Boolean)
          break
        case 'Grantee(s):':
          detail.grantees = value.split('\n').map(s => s.trim()).filter(Boolean)
          break
        case 'Consideration:':
          detail.consideration = value
          break
        case 'Recording Date:':
          detail.recordingDate = value
          break
        case 'Releases:':
          detail.releases = value
          break
      }
    })

    // Try to find PDF link
    const pdfLink = $('a[href*=".pdf"], a[href*="PDF"]').attr('href')
    if (pdfLink) {
      detail.pdfUrl = pdfLink.startsWith('http') ? pdfLink : `https://www.utahcounty.gov${pdfLink}`
    }

    return detail
  } catch (error) {
    console.error('Error scraping document detail:', error)
    return null
  }
}

/**
 * Scrape all documents with full details for a property
 */
export async function scrapeAllDocuments(parcelNumber: string): Promise<{
  documents: DocumentRecord[]
  details: Map<string, DocumentDetail>
}> {
  const documents = await scrapeDocumentList(parcelNumber)
  const details = new Map<string, DocumentDetail>()

  // Fetch details for each document (with rate limiting)
  for (const doc of documents.slice(0, 20)) { // Limit to 20 most recent
    const detail = await scrapeDocumentDetail(doc.entry, doc.year)
    if (detail) {
      details.set(`${doc.entry}-${doc.year}`, detail)
    }
    // Rate limit: 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return { documents, details }
}
