// Washington County enricher.
// Uses Washington County EagleWeb (Tyler Technologies) via public guest session.
// Provides: owner name, mailing address, legal description, acres, market value, taxes.
// 2-step lookup: POST parcel search → GET account detail page.

import { fetchWashingtonParcelDetail } from '@/lib/sources/washington-eagleweb'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'

export async function enrichWashington(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  const parcelId = listing.parcel_ids[0]
  if (!parcelId) return null

  const detail = await fetchWashingtonParcelDetail(parcelId)
  if (!detail) return null
  if (!detail.owner_name && !detail.market_value && !detail.legal_description) return null

  return {
    source: 'washington_eagleweb',
    fetched_at: new Date().toISOString(),
    owner_name: detail.owner_name,
    mailing_address: detail.mailing_address,
    situs_address: detail.situs_address,
    account_number: detail.account_number,
    assessed_value: null,
    market_value: detail.market_value,
    tax_year: null,
    taxes_owed: detail.taxes_owed,
    property_class: null,
    legal_description: detail.legal_description,
    acres: detail.acres,
    subdivision: null,
    source_url: `https://eweb.washco.utah.gov:8443/recorder/taxweb/account.jsp?accountNum=${detail.account_number}`,
    notes: null,
  }
}
