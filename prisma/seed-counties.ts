import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Utah County config
  await prisma.countyConfig.upsert({
    where: { county_name: 'utah' },
    create: {
      county_name: 'utah',
      display_name: 'Utah County',
      state: 'Utah',
      auction_date: '2026-05-21',
      auction_platform: 'county_website',
      auction_url: 'https://www.utahcounty.gov/dept/auditor/taxadmin/taxsale/index.html',
      auction_format: 'bid_up',
      sale_type: 'deed',
      parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query',
      parcel_api_layer: 'Parcels_Utah_LIR',
      zoning_api_url: 'https://maps.utahcounty.gov/arcgis/rest/services/CommunityDev-Fire/CountyZoning_wgs84/MapServer/identify',
      land_records_url: 'https://www.utahcounty.gov/LandRecords/Property.asp?av_serial={parcel_id}',
      land_records_requires_auth: false,
      parcel_id_format: '^\\d{2}:\\d{3}:\\d{4}$',
      parcel_id_separator: ':',
      parcel_id_for_api: 'numeric_only',
      csv_source_url: 'https://www.utahcounty.gov/dept/auditor/taxadmin/taxsale/index.html',
      is_active: true,
    },
    update: {}
  })

  // Tooele County config
  await prisma.countyConfig.upsert({
    where: { county_name: 'tooele' },
    create: {
      county_name: 'tooele',
      display_name: 'Tooele County',
      state: 'Utah',
      auction_date: '2026-05-07',
      auction_platform: 'public_surplus',
      auction_url: 'https://www.publicsurplus.com/sms/tooeleco,ut/list/current?orgid=94332',
      auction_format: 'bid_up',
      sale_type: 'deed',
      parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Tooele_LIR/FeatureServer/0/query',
      parcel_api_layer: 'Parcels_Tooele_LIR',
      zoning_api_url: null,
      land_records_url: 'https://search.tooeleco.gov.mediciland.com/?q={parcel_id}',
      land_records_requires_auth: true,
      parcel_id_format: '^\\d{2}-\\d{3}-\\d{1}-\\d{3,4}$',
      parcel_id_separator: '-',
      parcel_id_for_api: 'numeric_only',
      csv_source_url: 'https://docs.google.com/spreadsheets/d/1ksX-lebJPmy5tgLVPTkKnSa9_ifN_qaRCWrwQwzptAQ/edit',
      csv_format_notes: 'Google Sheets format. Parcel ID uses dashes: XX-XXX-X-XXXX. Download as CSV and import.',
      notes: 'Document records require Google auth via Mediciland. Title analysis not available without credentials. Auction uses PublicSurplus platform.',
      is_active: true,
    },
    update: {}
  })

  // Rich County (placeholder for future)
  await prisma.countyConfig.upsert({
    where: { county_name: 'rich' },
    create: {
      county_name: 'rich',
      display_name: 'Rich County',
      state: 'Utah',
      auction_date: '2026-05-15',
      auction_platform: 'county_website',
      auction_url: 'https://www.richcountyut.org/',
      auction_format: 'bid_up',
      sale_type: 'deed',
      parcel_api_url: null,
      zoning_api_url: null,
      land_records_url: null,
      land_records_requires_auth: false,
      csv_format_notes: 'Contact county clerk for data format. Rural county with smaller sales.',
      notes: 'Rural county with lower property volume. Smaller sale expected. Contact Clerk directly for CSV/data access.',
      is_active: false,
    },
    update: {}
  })

  // Sanpete County (placeholder for future)
  await prisma.countyConfig.upsert({
    where: { county_name: 'sanpete' },
    create: {
      county_name: 'sanpete',
      display_name: 'Sanpete County',
      state: 'Utah',
      auction_date: '2026-05-15',
      auction_platform: 'county_website',
      auction_url: 'https://www.sanpete.com/',
      auction_format: 'bid_up',
      sale_type: 'deed',
      parcel_api_url: null,
      zoning_api_url: null,
      land_records_url: null,
      land_records_requires_auth: false,
      csv_format_notes: 'Contact county auditor for data format.',
      notes: 'Central Utah. Smaller rural county. Contact Auditor directly for tax sale information and property data.',
      is_active: false,
    },
    update: {}
  })

  console.log('Counties seeded successfully.')

  // Verify
  const counties = await prisma.countyConfig.findMany()
  console.log('\nSeeded counties:')
  counties.forEach(c => {
    console.log(`  - ${c.display_name}: ${c.auction_platform} (${c.is_active ? 'active' : 'inactive'})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
