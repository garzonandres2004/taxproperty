#!/usr/bin/env tsx
// Rich County title debug — AGRC parcel info + live recorder title signals.
// Requires: RICH_COUNTY_RECORDER_EMAIL, RICH_COUNTY_RECORDER_PASSWORD env vars.
//
// Usage:
//   npm run debug:rich-title
//   npm run debug:rich-title -- 41-30-090-0106

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { RichCountyScraper } from '../src/lib/title/scrapers/rich-county'

const DEFAULT_PARCEL = '41-30-090-0106'
const parcel = process.argv[2] ?? DEFAULT_PARCEL

const AGRC_URL = 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Rich_LIR/FeatureServer/0/query'
const RECORDER_URL = 'http://search.richcounty.gov/RecordingsSearch.aspx'

async function queryAGRC(parcelId: string): Promise<any> {
  const where = `PARCEL_ID='${parcelId}'`.replace(/=/g, '%3D').replace(/'/g, '%27')
  const outFields = 'PARCEL_ID,SERIAL_NUM,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES,TOTAL_MKT_VALUE,LAND_MKT_VALUE,BLDG_SQFT,BUILT_YR,PROP_CLASS,ASSESSOR_SRC,BOUNDARY_SRC'
  const url = `${AGRC_URL}?where=${where}&outFields=${outFields}&returnGeometry=true&outSR=4326&f=json`
  const res = await fetch(url, { headers: { 'User-Agent': 'TaxProperty-Utah/1.0' } })
  if (!res.ok) throw new Error(`AGRC HTTP ${res.status}`)
  return res.json()
}

function centroid(rings: number[][][]): { lat: number; lng: number } | null {
  if (!rings?.length) return null
  const ring = rings[0]
  const xs = ring.map(p => p[0])
  const ys = ring.map(p => p[1])
  return {
    lng: xs.reduce((a, b) => a + b, 0) / xs.length,
    lat: ys.reduce((a, b) => a + b, 0) / ys.length
  }
}

async function main() {
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  RICH COUNTY TITLE DEBUG`)
  console.log(`  Parcel: ${parcel}`)
  console.log(`${'═'.repeat(55)}\n`)

  // ── AGRC ──
  console.log('── AGRC Rich LIR ───────────────────────────────────')
  let ownerName: string | null = null
  let agrcFound = false

  try {
    const data = await queryAGRC(parcel)
    if (data?.error) {
      console.log(`  AGRC error: ${data.error.message}`)
    } else if (data?.features?.length > 0) {
      const f = data.features[0]
      const a = f.attributes
      const geo = centroid(f.geometry?.rings)

      console.log(`  PARCEL_ID:    ${a.PARCEL_ID ?? '-'}`)
      console.log(`  Address:      ${a.PARCEL_ADD ?? '(none)'}, ${a.PARCEL_CITY ?? '-'}`)
      console.log(`  Acres:        ${a.PARCEL_ACRES ?? '-'}`)
      console.log(`  Market value: $${a.TOTAL_MKT_VALUE?.toLocaleString() ?? '-'}`)
      console.log(`  Land value:   $${a.LAND_MKT_VALUE?.toLocaleString() ?? '-'}`)
      console.log(`  Prop class:   ${a.PROP_CLASS ?? '-'}`)
      if (geo) console.log(`  Centroid:     lat=${geo.lat.toFixed(6)}, lng=${geo.lng.toFixed(6)}`)
      agrcFound = true
    } else {
      console.log('  No AGRC match for this parcel ID.')
    }
  } catch (err) {
    console.log(`  AGRC query failed: ${(err as Error).message}`)
  }

  // ── Recorder title signals ──
  console.log('\n── Rich County Recorder Title Signals ──────────────')
  console.log(`  Source: ${RECORDER_URL}`)

  const email = process.env.RICH_COUNTY_RECORDER_EMAIL
  const password = process.env.RICH_COUNTY_RECORDER_PASSWORD

  if (!email || !password) {
    console.log('\n  OFFLINE — credentials not set.')
    console.log('  Set env vars to enable live title lookup:')
    console.log('    RICH_COUNTY_RECORDER_EMAIL=your@email.com')
    console.log('    RICH_COUNTY_RECORDER_PASSWORD=yourpassword')
    console.log('  Register free at: http://search.richcounty.gov/GuestCredentials.aspx')
    console.log()
    process.exit(0)
  }

  const scraper = new RichCountyScraper()
  const startMs = Date.now()

  try {
    await scraper.init()

    // Try to look up owner name from PropertyTaxSearch first
    const resolvedOwner = ownerName ?? await scraper.lookupOwnerName(parcel)
    if (resolvedOwner) console.log(`  Owner name:   ${resolvedOwner}`)

    const result = await scraper.searchParcel(parcel, resolvedOwner ?? undefined)
    const elapsed = Date.now() - startMs

    if (!result) {
      console.log(`  FAILED — scraper returned null (${elapsed}ms)`)
      console.log('  Check /tmp/rich-recorder-form.html and /tmp/rich-recorder-results.html')
      process.exit(1)
    }

    console.log(`\n  Results (${elapsed}ms):`)
    console.log(`  Has records:         ${result.hasRecords ? 'YES' : 'NO'}`)
    console.log(`  Docs (5yr window):   ${result.documentCount5yr}`)
    console.log(`  Last transfer date:  ${result.lastTransferDate ?? '-'}`)
    console.log(`  Last transfer type:  ${result.lastTransferType ?? '-'}`)
    console.log(`  Mortgage docs:       ${result.mortgageDocsFound}`)
    console.log(`  Lien docs:           ${result.lienDocsFound}`)
    console.log(`  Release docs:        ${result.releaseDocsFound}`)
    console.log(`  Red flags:           ${result.redFlags.length}`)
    if (result.redFlags.length > 0) result.redFlags.forEach(f => console.log(`    - ${f}`))
    console.log(`  Yellow flags:        ${result.yellowFlags.length}`)

    if (result.rawDocuments.length > 0) {
      console.log(`\n  Raw documents (${result.rawDocuments.length} total):`)
      result.rawDocuments.slice(0, 10).forEach((doc, i) => {
        console.log(`  [${i + 1}] ${doc.date || '-'} | ${doc.docType} | ${doc.grantor || '-'} → ${doc.grantee || '-'}`)
      })
      if (result.rawDocuments.length > 10) {
        console.log(`  ... and ${result.rawDocuments.length - 10} more (see /tmp/rich-recorder-results.html)`)
      }
    }

    console.log('\n  TitleSignals JSON:')
    const signals = {
      has_deed_records: result.hasRecords,
      document_count_5yr: result.documentCount5yr,
      last_transfer_date: result.lastTransferDate ?? null,
      last_transfer_type: result.lastTransferType ?? null,
      mortgage_docs_found: result.mortgageDocsFound,
      lien_docs_found: result.lienDocsFound,
      release_docs_found: result.releaseDocsFound,
      red_flags_count: result.redFlags.length,
      yellow_flags_count: result.yellowFlags.length,
      data_source: 'rich_county_recorder'
    }
    console.log('  ' + JSON.stringify(signals, null, 2).replace(/\n/g, '\n  '))

  } finally {
    await scraper.close()
  }

  console.log()
}

main().catch(err => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
