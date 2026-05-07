// Sevier County enricher.
// Uses Sevier County's TylerHost EagleWeb system at qdocs.sevier.utah.gov (public guest session).
// AGRC SERIAL_NUM is the account number (already 7 digits, e.g. 0020129).
// Provides: owner name, mailing address, situs, legal description, acres, market value, taxes.

import { fetchEagleWebDetail } from '@/lib/sources/eagleweb-tyler'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'
import type { AgrcRaw } from './index'

const SEVIER_BASE = 'https://qdocs.sevier.utah.gov/recorder'

export async function enrichSevier(listing: AuctionListing, agrcRaw?: AgrcRaw): Promise<AssessorEnrichment | null> {
  const serial = agrcRaw?.SERIAL_NUM as string | undefined
  if (!serial) return null

  // Sevier AGRC serial is already 7-digit zero-padded (e.g. '0020129')
  const accountNum = serial.replace(/\D/g, '').padStart(7, '0')
  if (!accountNum || accountNum === '0000000') return null

  const detail = await fetchEagleWebDetail(SEVIER_BASE, accountNum)
  if (!detail) return null
  if (!detail.owner_name && !detail.market_value && !detail.legal_description) return null

  return {
    source: 'sevier_eagleweb',
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
    source_url: `${SEVIER_BASE}/taxweb/account.jsp?accountNum=${detail.account_number}`,
    notes: null,
  }
}
