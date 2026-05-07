// Wasatch County enricher.
// Uses maps.wasatch.utah.gov Web_Map_Parcels MapServer (public, no auth).
// Query by TaxParcel (the parcel_number from listing, e.g. '00-0015-1238').
// Provides: owner name, mailing address, situs, legal description, acres.
// Market value comes from AGRC LIR (agrcRaw.TOTAL_MKT_VALUE).

import type { AuctionListing, AssessorEnrichment } from '../auction-types'
import type { AgrcRaw } from './index'

const WEB_MAP_PARCELS =
  'https://maps.wasatch.utah.gov/arcgis/rest/services/MapLayers/Web_Map_Parcels/MapServer/20/query'

const OUT_FIELDS = 'Name1,Name2,MailAddress,Add1,Add2,City,State,ZIP,PropertyAddress,PropertyCity,BriefTaxingDescription,TaxSerial,TaxAcres,SubName'

export async function enrichWasatch(listing: AuctionListing, agrcRaw?: AgrcRaw): Promise<AssessorEnrichment | null> {
  const parcelId = listing.parcel_ids?.[0]
  if (!parcelId) return null

  const params = new URLSearchParams({
    where: `TaxParcel = '${parcelId}'`,
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    f: 'json',
  })

  let data: Record<string, unknown>
  try {
    const resp = await fetch(`${WEB_MAP_PARCELS}?${params}`)
    if (!resp.ok) return null
    data = await resp.json() as Record<string, unknown>
  } catch {
    return null
  }

  const features = data.features as Array<{ attributes: Record<string, unknown> }> | undefined
  if (!features?.length) return null

  const attr = features[0].attributes
  const ownerName = str(attr.Name1) || str(attr.Name2)
  if (!ownerName) return null

  // Build mailing address from components
  const parts = [str(attr.Add1), str(attr.Add2)].filter(Boolean)
  const cityLine = [str(attr.City), str(attr.State)].filter(Boolean).join(', ')
  const zip = str(attr.ZIP)
  if (cityLine) parts.push(zip ? `${cityLine} ${zip}` : cityLine)
  const mailingAddress = parts.join(', ') || str(attr.MailAddress)

  const situs = [str(attr.PropertyAddress), str(attr.PropertyCity)].filter(Boolean).join(', ') || null
  const acres = typeof attr.TaxAcres === 'number' ? attr.TaxAcres : null
  const marketValue = typeof agrcRaw?.TOTAL_MKT_VALUE === 'number' ? agrcRaw.TOTAL_MKT_VALUE : null

  return {
    source: 'wasatch_gis',
    fetched_at: new Date().toISOString(),
    owner_name: ownerName,
    mailing_address: mailingAddress || null,
    situs_address: situs,
    account_number: null,
    assessed_value: null,
    market_value: marketValue,
    tax_year: null,
    taxes_owed: null,
    property_class: null,
    legal_description: str(attr.BriefTaxingDescription),
    acres,
    subdivision: str(attr.SubName),
    source_url: `https://maps.wasatch.utah.gov/arcgis/rest/services/MapLayers/Web_Map_Parcels/MapServer/20/query?where=TaxParcel%3D'${encodeURIComponent(parcelId)}'&f=json`,
    notes: null,
  }
}

function str(v: unknown): string | null {
  if (v == null || v === '') return null
  const s = String(v).trim()
  return s || null
}
