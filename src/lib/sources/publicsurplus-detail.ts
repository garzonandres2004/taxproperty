// Generic PublicSurplus auction detail page parser.
// Handles labeled-field format (Salt Lake, Box Elder) and unlabeled paragraph format (Sanpete).
//
// Labeled format (Salt Lake):
//   "Parcel Number: XX-XX-XXX-XXX"
//   "Property Type: CONDO"
//   "Location: 4520 S BELLA VERDE CT"
//   "Current Owner: MYRICK, TINA F"
//   "Legal Description: UNIT 31, ..."
//
// Partial labeled format (Box Elder):
//   "Owner of Record: GRESHAM GEARY"

import * as cheerio from 'cheerio'

export interface PublicSurplusDetail {
  auction_id: string
  parcel_number: string | null
  account_number: string | null
  owner_name: string | null
  property_type: string | null
  location: string | null       // situs address from "Location:" label
  legal_description: string | null
  acres: number | null
  subdivision: string | null
  total_due: number | null
  bid_deposit: number | null
  source_url: string
}

// orgSlug: "all,ut" for multi-county feed, "sanpeteco,ut" for Sanpete-specific
export async function fetchPublicSurplusDetail(
  auctionId: string,
  orgSlug = 'all,ut'
): Promise<PublicSurplusDetail | null> {
  const sourceUrl = `https://www.publicsurplus.com/sms/${orgSlug}/auction/view?auc=${auctionId}`

  try {
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // Collect all non-empty paragraph texts in document order
    const paras: string[] = []
    $('p').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) paras.push(text)
    })

    const data: PublicSurplusDetail = {
      auction_id: auctionId,
      parcel_number: null,
      account_number: null,
      owner_name: null,
      property_type: null,
      location: null,
      legal_description: null,
      acres: null,
      subdivision: null,
      total_due: null,
      bid_deposit: null,
      source_url: sourceUrl,
    }

    for (let i = 0; i < paras.length; i++) {
      const p = paras[i]

      // "Parcel Number: XX-XX-XXX"
      let m = p.match(/^Parcel (?:Number|#)\s*:\s*(.+)$/i)
      if (m) { data.parcel_number = m[1].trim(); continue }

      // "Account #: XXXXXXX" or "Account Number: XXXXXXX"
      m = p.match(/^Account\s*(?:#|Number)\s*:\s*(\S+)/i)
      if (m) { data.account_number = m[1]; continue }

      // "Current Owner: NAME" or "Owner of Record: NAME" or "Owner: NAME"
      m = p.match(/^(?:Current\s+)?Owner(?:\s+of\s+Record)?\s*:\s*(.+)$/i)
      if (m) { data.owner_name = m[1].trim(); continue }

      // "Property Type: CONDO"
      m = p.match(/^Property\s+Type\s*:\s*(.+)$/i)
      if (m) { data.property_type = m[1].trim(); continue }

      // "Location: 4520 S BELLA VERDE CT"
      m = p.match(/^Location\s*:\s*(.+)$/i)
      if (m) { data.location = m[1].trim(); continue }

      // "Legal Description: ..." — may be on same line or next paragraph
      m = p.match(/^Legal\s+Description\s*:\s*(.+)$/i)
      if (m) { data.legal_description = m[1].trim(); continue }

      // "Legal Description:" alone — content is next paragraph
      if (/^Legal\s+Description\s*:?\s*$/i.test(p) && i + 1 < paras.length) {
        data.legal_description = paras[i + 1]
        continue
      }

      // "Total Due: $X,XXX.XX"
      m = p.match(/^Total\s+Due\s*:\s*\$?([\d,]+\.?\d*)/i)
      if (m) { data.total_due = parseFloat(m[1].replace(/,/g, '')); continue }

      // "Bid Deposit is $XXX..."
      m = p.match(/Bid\s+Deposit\s+is\s+\$?([\d,]+\.?\d*)/i)
      if (m) { data.bid_deposit = parseFloat(m[1].replace(/,/g, '')); continue }
    }

    // Extract acres from legal description
    if (data.legal_description) {
      const acresM = data.legal_description.match(/CONT\s+([\d.]+)\s*AC/i)
        ?? data.legal_description.match(/([\d.]+)\s*(?:AC|ACRES?)\b/i)
      if (acresM) data.acres = parseFloat(acresM[1])

      const subM = data.legal_description.match(
        /\b([A-Z][A-Z\s]+(?:SUBDIVISION|RANCH|RIDGE|ESTATES|HILLS|PARK|RESORT|VILLAGE|ACRES|COMMONS|TOWNHOMES?|CONDM?N?))\b/i
      )
      if (subM) data.subdivision = subM[1].trim()
    }

    return data
  } catch {
    return null
  }
}
