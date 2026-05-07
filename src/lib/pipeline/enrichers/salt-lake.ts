// Salt Lake County enricher.
// PublicSurplus auction pages contain labeled "Current Owner:", "Legal Description:",
// "Location:", and "Property Type:" fields — reliable source for owner and legal data.
// Market value is already fully covered by AGRC (174/174 hit rate).
// This enricher only runs when owner_name is missing (i.e., always, since AGRC has no NAME).

import { fetchPublicSurplusDetail } from '@/lib/sources/publicsurplus-detail'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'

export async function enrichSaltLake(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  const detail = await fetchPublicSurplusDetail(listing.listing_id)
  if (!detail) return null
  if (!detail.owner_name && !detail.legal_description && !detail.location) return null

  return {
    source: 'publicsurplus_detail',
    fetched_at: new Date().toISOString(),
    owner_name: detail.owner_name,
    mailing_address: null,
    situs_address: detail.location,
    account_number: detail.account_number,
    assessed_value: null,
    market_value: null,     // already filled by AGRC for Salt Lake
    tax_year: null,
    taxes_owed: detail.total_due,
    property_class: detail.property_type,
    legal_description: detail.legal_description,
    acres: detail.acres,
    subdivision: detail.subdivision,
    source_url: detail.source_url,
    notes: null,
  }
}
