// Iron County enricher.
// Uses IronGIS1's Parcels_Public FeatureServer — publicly accessible, no auth required.
// Queried by SERIAL field (APN), which matches the AGRC parcel ID format (e.g. E-1229-0003-0023).
// Covers all Iron County prefixes (B-, C-, D-, E-). Hit rate: ~100% for tax sale parcels.

import type { AuctionListing, AssessorEnrichment } from '../auction-types'

const PARCELS_PUBLIC =
  'https://services.arcgis.com/xGNWaeXY0POVazgT/arcgis/rest/services/Parcels_Public/FeatureServer/0/query'

export async function enrichIron(listing: AuctionListing): Promise<AssessorEnrichment | null> {
  const parcelId = listing.parcel_ids[0]
  if (!parcelId) return null

  const params = new URLSearchParams({
    where: `SERIAL = '${parcelId}'`,
    outFields: 'OWNER,SERIAL,ACCOUNT,SITUS,Acres,subdiv,MAIL_ADD1,MAIL_ADD2,MAIL_CITY,MAIL_ST,MAIL_ZIP',
    f: 'json',
  })

  let data: Record<string, unknown>
  try {
    const res = await fetch(`${PARCELS_PUBLIC}?${params}`)
    data = await res.json() as Record<string, unknown>
  } catch {
    return null
  }

  const features = data.features as Array<{ attributes: Record<string, unknown> }> | undefined
  if (!features?.length) return null
  const attrs = features[0].attributes

  const owner = cleanStr(attrs.OWNER)
  const situs = cleanStr(attrs.SITUS)
  const mailParts = [attrs.MAIL_ADD1, attrs.MAIL_ADD2, attrs.MAIL_CITY, attrs.MAIL_ST, attrs.MAIL_ZIP]
    .map(v => cleanStr(v))
    .filter(Boolean)
  const mailingAddress = mailParts.length ? mailParts.join(', ').replace(/,\s*,/g, ',') : null

  return {
    source: 'iron_gis_parcels_public',
    fetched_at: new Date().toISOString(),
    owner_name: owner,
    mailing_address: mailingAddress,
    situs_address: situs,
    account_number: cleanStr(attrs.ACCOUNT),
    assessed_value: null,
    market_value: null,
    tax_year: null,
    taxes_owed: null,
    property_class: null,
    legal_description: null,
    acres: typeof attrs.Acres === 'number' ? attrs.Acres : null,
    subdivision: cleanStr(attrs.subdiv),
    source_url: `https://services.arcgis.com/xGNWaeXY0POVazgT/arcgis/rest/services/Parcels_Public/FeatureServer`,
    notes: null,
  }
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/\s+/g, ' ')
  // Deduplicate semicolon-separated repeated values (e.g. "NAME;;;NAME")
  const parts = s.split(/;+/).map(p => p.trim()).filter(Boolean)
  const unique = [...new Set(parts)]
  const result = unique.join(' / ')
  return result || null
}
