// Beaver County enricher.
// PublicSurplus listing descriptions include "Last known owner: NAME [ADDRESS]".
// Owner name is separated from address by detecting where a street number begins.
// Notes that this is the "last known" owner, not necessarily current.

import type { AuctionListing, AssessorEnrichment } from '../auction-types'

const PS_BASE = 'https://www.publicsurplus.com/sms/beaverco,ut/auction/view'

export async function enrichBeaver(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  let html: string
  try {
    const resp = await fetch(`${PS_BASE}?auc=${listing.listing_id}`)
    html = await resp.text()
  } catch {
    return null
  }

  // Extract paragraphs from PS description area
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 5)

  let ownerName: string | null = null
  let mailingAddress: string | null = null

  for (const para of paras) {
    const m = para.match(/[Ll]ast known owner\s*:?\s*(.+)/i)
    if (!m) continue
    const raw = m[1].trim()
    // Split name from address at first occurrence of a street number (digit+ followed by space+letter)
    const addrStart = raw.search(/\b\d+\s+[A-Z]/i)
    if (addrStart > 0) {
      ownerName = raw.slice(0, addrStart).trim().replace(/,\s*$/, '')
      mailingAddress = raw.slice(addrStart).trim()
    } else {
      ownerName = raw.replace(/,\s*$/, '').trim()
    }
    break
  }

  if (!ownerName) return null

  return {
    source: 'beaver_publicsurplus',
    fetched_at: new Date().toISOString(),
    owner_name: ownerName,
    mailing_address: mailingAddress,
    situs_address: null,
    account_number: null,
    assessed_value: null,
    market_value: null,
    tax_year: null,
    taxes_owed: null,
    property_class: null,
    legal_description: null,
    acres: null,
    subdivision: null,
    source_url: `${PS_BASE}?auc=${listing.listing_id}`,
    notes: '"Last known owner" — may not reflect current ownership.',
  }
}
