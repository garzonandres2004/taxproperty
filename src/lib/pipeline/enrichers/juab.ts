// Juab County enricher.
// Uses Juab County's TylerHost EagleWeb system (public guest session).
// Requires AGRC SERIAL_NUM to construct the account number (zero-padded to 7 digits).
// Provides: owner name, mailing address, situs, legal description, acres, market value, taxes.

import { fetchEagleWebDetail } from '@/lib/sources/eagleweb-tyler'
import type { AuctionListing, AssessorEnrichment } from '../auction-types'
import type { AgrcRaw } from './index'

const JUAB_BASE = 'https://juabcountyut-recorder.tylerhost.net/recorder'

export async function enrichJuab(listing: AuctionListing, agrcRaw?: AgrcRaw): Promise<AssessorEnrichment | null> {
  const serial = agrcRaw?.SERIAL_NUM as string | undefined
  if (!serial) return null

  // EagleWeb account numbers are 7-digit zero-padded numeric strings
  const numericSerial = serial.replace(/\D/g, '')
  if (!numericSerial) return null
  const accountNum = numericSerial.padStart(7, '0')

  const detail = await fetchEagleWebDetail(JUAB_BASE, accountNum)
  if (!detail) return null
  if (!detail.owner_name && !detail.market_value && !detail.legal_description) return null

  return {
    source: 'juab_eagleweb',
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
    source_url: `${JUAB_BASE}/taxweb/account.jsp?accountNum=${detail.account_number}`,
    notes: null,
  }
}
