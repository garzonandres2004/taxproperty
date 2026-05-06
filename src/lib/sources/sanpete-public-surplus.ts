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
 * Fetch detailed auction data from a specific auction page
 */
export async function fetchSanpeteAuctionDetail(auctionId: string): Promise<SanpeteAuctionData | null> {
  const url = `${PUBLIC_SURPLUS_BASE}/sms/sanpeteco,ut/auction/view?auc=${auctionId}`

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

    // Extract fields from the page
    const data: Partial<SanpeteAuctionData> = { auction_id: auctionId }

    // Helper to find field by label
    const findField = (labelPattern: RegExp): string => {
      const text = $('body').text()
      const lines = text.split('\n')
      for (const line of lines) {
        const clean = line.trim()
        if (labelPattern.test(clean)) {
          const match = clean.match(/:\s*(.+)$/) || clean.match(/\)\s*(.+)$/)
          if (match) return match[1].trim()
        }
      }
      return ''
    }

    // Parse from page text
    const pageText = $('body').text()

    // Parcel Number
    const parcelMatch = pageText.match(/Parcel Number["']?\s*[:\)]\s*["']?(\d+)/i)
    if (parcelMatch) data.parcel_number = parcelMatch[1].padStart(10, '0')

    // Account Number
    const accountMatch = pageText.match(/Account Number["']?\s*[:\)]\s*["']?([A-Z0-9]+)/i)
    if (accountMatch) data.account_number = accountMatch[1]

    // Owner Name - try multiple patterns
    const ownerPatterns = [
      /Owner["']?\s*[:\)]\s*["']?([^\n]+?)(?=\s*(?:Account|Address|Parcel)|$)/i,
      /Current Owner["']?\s*[:\)]\s*["']?([^\n]+?)(?=\s*(?:Account|Address|Parcel)|$)/i,
      /Taxpayer["']?\s*[:\)]\s*["']?([^\n]+?)(?=\s*(?:Account|Address|Parcel)|$)/i
    ]

    for (const pattern of ownerPatterns) {
      const ownerMatch = pageText.match(pattern)
      if (ownerMatch && ownerMatch[1].trim().length > 2) {
        data.owner_name = ownerMatch[1].trim().replace(/\s+/g, ' ')
        break
      }
    }

    // Legal Description
    const legalMatch = pageText.match(/Legal Description["']?\s*[:\)]\s*["']?([^\n]+)/i)
    if (legalMatch) data.legal_description = legalMatch[1].trim()

    // Total Due / Opening Bid - look for dollar amounts in various formats
    // Try multiple patterns
    const pricePatterns = [
      /Total Due[^\n]*?\$?([\d,]+\.\d{2})/i,
      /Opening Bid[^\n]*?\$?([\d,]+\.\d{2})/i,
      /Current Price[^\n]*?\$?([\d,]+\.\d{2})/i,
      /\$([\d,]+\.\d{2})/,
      /Price:\s*\$?([\d,]+\.?\d*)/i
    ]

    for (const pattern of pricePatterns) {
      const priceMatch = pageText.match(pattern)
      if (priceMatch) {
        data.total_due = parseFloat(priceMatch[1].replace(/,/g, ''))
        break
      }
    }

    // Bid Deposit - typically 5% of opening bid
    if (data.total_due) {
      data.bid_deposit = Math.round(data.total_due * 0.05 * 100) / 100
    }

    // Auction dates
    const dateMatch = pageText.match(/Start["']?\s*[:\)]\s*["']?([^\n]+)/i)
    if (dateMatch) {
      const startDate = new Date(dateMatch[1].trim())
      if (!isNaN(startDate.getTime())) data.auction_start = startDate
    }

    const endMatch = pageText.match(/End["']?\s*[:\)]\s*["']?([^\n]+)/i)
    if (endMatch) {
      const endDate = new Date(endMatch[1].trim())
      if (!isNaN(endDate.getTime())) data.auction_end = endDate
    }

    // PDF Attachment
    const pdfLink = $('a[href*=".pdf"]').first().attr('href')
    if (pdfLink) {
      data.pdf_url = pdfLink.startsWith('http') ? pdfLink : `${PUBLIC_SURPLUS_BASE}${pdfLink}`
    }

    // Parse legal description for subdivision and acres
    if (data.legal_description) {
      const acresMatch = data.legal_description.match(/(\d+\.?\d*)\s*(?:AC|acres?)/i)
      if (acresMatch) data.acres = parseFloat(acresMatch[1])

      const subdivisionMatch = data.legal_description.match(/(?:LOT\s+\d+,?\s+)?(?:SEC?\s*[A-Z]+,?\s+)?([^,]+)(?:\s+CONT)?/i)
      if (subdivisionMatch) data.subdivision = subdivisionMatch[1].trim()
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
