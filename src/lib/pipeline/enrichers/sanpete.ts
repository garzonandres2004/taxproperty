// Sanpete County assessor enrichment.
// AGRC has geometry for some Sanpete parcels but NO assessed values (TOTAL_MKT_VALUE absent).
// This enricher fetches owner name, legal description, acres, and tax-owed from
// the PublicSurplus auction detail page — the only public data source for Sanpete.
// Market value remains null until a public assessor portal becomes available.

import { fetchSanpeteAuctionDetail } from '@/lib/sources/sanpete-public-surplus'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'

const PS_BASE = 'https://www.publicsurplus.com/sms/sanpeteco,ut/auction/view'

export async function enrichSanpete(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  const detail = await fetchSanpeteAuctionDetail(listing.listing_id)
  if (!detail) return null

  return {
    source: 'sanpete_publicsurplus',
    fetched_at: new Date().toISOString(),
    owner_name: detail.owner_name?.trim() || null,
    mailing_address: detail.mailing_address?.trim() || null,
    situs_address: null,
    account_number: detail.account_number?.trim() || null,
    assessed_value: null,
    market_value: null,
    tax_year: null,
    taxes_owed: detail.total_due || null,
    property_class: null,
    legal_description: detail.legal_description?.trim() || null,
    acres: detail.acres || null,
    subdivision: detail.subdivision?.trim() || null,
    source_url: `${PS_BASE}?auc=${listing.listing_id}`,
    notes: 'Sanpete County has no public assessor portal. Market value unavailable.',
  }
}
