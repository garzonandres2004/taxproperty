// County-specific enricher dispatcher.
// Called after AGRC lookup in enrichListing() when data gaps remain.
// Each county function returns AssessorEnrichment | null.
// agrcRaw is the raw_attributes object from AgrcParcelData — passed through for
// enrichers that need AGRC identifiers not present in AuctionListing (e.g. SERIAL_NUM).

import type { AuctionListing, AssessorEnrichment } from '../auction-types'
import { enrichSanpete } from './sanpete'
import { enrichSaltLake } from './salt-lake'
import { enrichBoxElder } from './box-elder'
import { enrichIron } from './iron'
import { enrichWashington } from './washington'
import { enrichJuab } from './juab'
import { enrichBeaver } from './beaver'
import { enrichSevier } from './sevier'
import { enrichWasatch } from './wasatch'

export type AgrcRaw = Record<string, unknown> | null

type CountyEnricher = (listing: AuctionListing, agrcRaw?: AgrcRaw) => Promise<AssessorEnrichment | null>

const COUNTY_ENRICHERS: Record<string, CountyEnricher> = {
  sanpete: enrichSanpete,
  salt_lake: enrichSaltLake,
  box_elder: enrichBoxElder,
  iron: enrichIron,
  washington: enrichWashington,
  juab: enrichJuab,
  beaver: enrichBeaver,
  sevier: enrichSevier,
  wasatch: enrichWasatch,
}

export async function runCountyEnricher(
  listing: AuctionListing,
  agrcRaw?: AgrcRaw
): Promise<AssessorEnrichment | null> {
  const fn = COUNTY_ENRICHERS[listing.county]
  if (!fn) return null
  try {
    return await fn(listing, agrcRaw)
  } catch {
    return null
  }
}
