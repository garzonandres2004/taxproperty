// Box Elder County enricher.
// Some PublicSurplus pages include "Owner of Record: NAME" — present for ~25% of listings.
// Market value is already 100% covered by AGRC. Owner name is the only gap.

import { fetchPublicSurplusDetail } from '@/lib/sources/publicsurplus-detail'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'

export async function enrichBoxElder(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  const detail = await fetchPublicSurplusDetail(listing.listing_id)
  if (!detail?.owner_name) return null   // only useful when owner is present

  return {
    source: 'publicsurplus_detail',
    fetched_at: new Date().toISOString(),
    owner_name: detail.owner_name,
    mailing_address: null,
    situs_address: detail.location,
    account_number: detail.account_number,
    assessed_value: null,
    market_value: null,
    tax_year: null,
    taxes_owed: null,
    property_class: null,
    legal_description: detail.legal_description,
    acres: detail.acres,
    subdivision: detail.subdivision,
    source_url: detail.source_url,
    notes: null,
  }
}
