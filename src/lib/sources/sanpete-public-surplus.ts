// Sanpete County Public Surplus Auction Source
// Scraper for https://www.publicsurplus.com/sms/sanpeteco,ut/

import * as cheerio from 'cheerio'

export interface SanpeteAuctionData {
  auction_id: string
  parcel_number: string
  account_number: string
  owner_name: string
  mailing_address: string
  legal_description: string
  total_due: number
  bid_deposit: number
  auction_start: Date
  auction_end: Date
  pdf_url: string
  property_address?: string
  city?: string
  state?: string
  zip?: string
  acres?: number
  subdivision?: string
}

const PUBLIC_SURPLUS_BASE = 'https://www.publicsurplus.com'

/**
 * Fetch auction list from Sanpete County Public Surplus
 */
export async function fetchSanpeteAuctionList(): Promise<{ auctionId: string; parcel: string; price: number }[]> {
  const url = `${PUBLIC_SURPLUS_BASE}/sms/sanpeteco,ut/list/current?orgid=972771`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const auctions: { auctionId: string; parcel: string; price: number }[] = []

    // Parse auction items from the list
    $('.auction-item, [data-role="auction"], .item').each((_, el) => {
      const link = $(el).find('a[href*="/auction/view"]').first()
      const href = link.attr('href')
      const title = link.text().trim()

      if (href && title.includes('Parcel')) {
        const auctionMatch = href.match(/auc=(\d+)/)
        const parcelMatch = title.match(/Parcel\s+(\S+)/)
        const priceText = $(el).find('.price, .current-price').text()

        if (auctionMatch && parcelMatch) {
          const price = parseFloat(priceText.replace(/[$,]/g, '')) || 0
          auctions.push({
            auctionId: auctionMatch[1],
            parcel: parcelMatch[1],
            price
          })
        }
      }
    })

    // If no items found with standard selectors, try alternative
    if (auctions.length === 0) {
      // Look for any links containing auction IDs
      $('a[href*="/auction/view"]').each((_, el) => {
        const href = $(el).attr('href')
        const text = $(el).text().trim()

        if (href && text.includes('Parcel')) {
          const auctionMatch = href.match(/auc=(\d+)/)
          const parcelMatch = text.match(/Parcel\s+(\S+)/)

          if (auctionMatch && parcelMatch) {
            auctions.push({
              auctionId: auctionMatch[1],
              parcel: parcelMatch[1],
              price: 0
            })
          }
        }
      })
    }

    return auctions
  } catch (error: any) {
    console.error('[SanpeteAuctionSource] Failed to fetch list:', error.message)
    return []
  }
}

/**
 * Fetch detailed auction data from a specific auction page.
 *
 * Page structure (paragraph sequence):
 *   "Parcel Number: XXXXXXXXXX"
 *   "Account Number: RXXXXXX"
 *   (optional filler paragraphs)
 *   "XXXXXXXXXX"             ← internal parcel ID, unlabeled
 *   "OWNER NAME ETAL JT"     ← owner name, unlabeled, immediately after internal parcel
 *   "Last known mailing address:"
 *   "STREET"
 *   "CITY, ST ZIP"
 *   "Legal Description:"
 *   "BEG 2.31 CH W, ..."     ← legal text
 *   "Total Due: $X,XXX.XX"
 */
export async function fetchSanpeteAuctionDetail(auctionId: string): Promise<SanpeteAuctionData | null> {
  const url = `${PUBLIC_SURPLUS_BASE}/sms/sanpeteco,ut/auction/view?auc=${auctionId}`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const html = await response.text()
    const $ = cheerio.load(html)

    const data: Partial<SanpeteAuctionData> = { auction_id: auctionId }

    // Collect all non-empty paragraph texts in document order
    const paras: string[] = []
    $('p').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) paras.push(text)
    })

    let internalParcelIdx = -1

    for (let i = 0; i < paras.length; i++) {
      const p = paras[i]

      // "Parcel Number: 0000032599"
      const parcelM = p.match(/^Parcel Number\s*:\s*(\S+)/i)
      if (parcelM) { data.parcel_number = parcelM[1]; continue }

      // "Account Number: R015616"
      const accountM = p.match(/^Account Number\s*:\s*(\S+)/i)
      if (accountM) { data.account_number = accountM[1]; continue }

      // "Bid Deposit is $194.70..."
      const depositM = p.match(/Bid Deposit is \$?([\d,]+\.?\d*)/i)
      if (depositM) { data.bid_deposit = parseFloat(depositM[1].replace(/,/g, '')); continue }

      // Internal parcel ID paragraph: standalone alphanumeric string (no spaces, 6+ chars)
      // Appears after account number. Owner follows immediately.
      if (data.account_number && internalParcelIdx === -1 && /^[A-Z0-9]{5,}$/i.test(p)) {
        internalParcelIdx = i
        // Next paragraph is the owner name
        const ownerCandidate = paras[i + 1] ?? ''
        if (
          ownerCandidate.length > 2 &&
          !/^Last known/i.test(ownerCandidate) &&
          !/^Legal/i.test(ownerCandidate) &&
          !/^Total Due/i.test(ownerCandidate) &&
          !/^For more/i.test(ownerCandidate)
        ) {
          data.owner_name = ownerCandidate.replace(/\s+/g, ' ').trim()
        }
        continue
      }

      // "Last known mailing address:" — collect next non-section lines as address
      if (/^Last known mailing address\s*:?\s*$/i.test(p)) {
        const lines: string[] = []
        for (let j = i + 1; j < Math.min(i + 6, paras.length); j++) {
          if (/^Legal Description/i.test(paras[j]) || /^Total Due/i.test(paras[j]) || /^For more/i.test(paras[j])) break
          lines.push(paras[j])
        }
        if (lines.length) data.mailing_address = lines.join(', ')
        continue
      }

      // "Legal Description:" is its own paragraph; content is the next
      if (/^Legal Description\s*:?\s*$/i.test(p)) {
        data.legal_description = paras[i + 1] ?? ''
        continue
      }

      // "Total Due: $3,894.09"
      const totalM = p.match(/^Total Due\s*:\s*\$?([\d,]+\.?\d*)/i)
      if (totalM) { data.total_due = parseFloat(totalM[1].replace(/,/g, '')); continue }
    }

    // PDF Attachment
    const pdfLink = $('a[href*=".pdf"]').first().attr('href')
    if (pdfLink) {
      data.pdf_url = pdfLink.startsWith('http') ? pdfLink : `${PUBLIC_SURPLUS_BASE}${pdfLink}`
    }

    // Parse acres from legal description
    if (data.legal_description) {
      const acresM = data.legal_description.match(/CONT\s+([\d.]+)\s*AC/i)
        ?? data.legal_description.match(/([\d.]+)\s*(?:AC|ACRES?)\b/i)
      if (acresM) data.acres = parseFloat(acresM[1])

      // Named subdivision: "HIDEAWAY VALLEY SUBDIVISION", "INDIAN RIDGE RANCH", etc.
      const subM = data.legal_description.match(/\b([A-Z][A-Z\s]+(?:SUBDIVISION|RANCH|RIDGE|ESTATES|HILLS|PARK|RESORT|VILLAGE|ACRES))\b/i)
      if (subM) data.subdivision = subM[1].trim()
    }

    return data as SanpeteAuctionData
  } catch (error: any) {
    console.error(`[SanpeteAuctionSource] Failed to fetch auction ${auctionId}:`, error.message)
    return null
  }
}

/**
 * Import all Sanpete auctions into database
 */
export async function importSanpeteAuctions(): Promise<{ imported: number; failed: number }> {
  const list = await fetchSanpeteAuctionList()
  console.log(`[SanpeteAuctionSource] Found ${list.length} auctions`)

  let imported = 0
  let failed = 0

  for (const item of list) {
    const detail = await fetchSanpeteAuctionDetail(item.auctionId)
    if (detail) {
      console.log(`[SanpeteAuctionSource] Imported: ${detail.parcel_number} - ${detail.owner_name}`)
      imported++
    } else {
      failed++
    }
  }

  return { imported, failed }
}
