// Script to add Davis County to the database
// Run with: npx ts-node scripts/add-davis-county.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Davis County to database...\n')

  // Check if already exists
  const existing = await prisma.countyConfig.findUnique({
    where: { county_name: 'davis' }
  })

  if (existing) {
    console.log('Davis County already exists in database')
    console.log('Updating configuration...\n')

    await prisma.countyConfig.update({
      where: { county_name: 'davis' },
      data: {
        display_name: 'Davis County',
        state: 'Utah',
        is_active: true,
        auction_platform: 'In-person Auction',
        auction_date: '2026-05-13',
        auction_format: 'bid_up',
        sale_type: 'deed',
        parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Davis_LIR/FeatureServer/0/query',
        land_records_url: 'https://www.daviscountyutah.gov/assessor/',
        parcel_id_format: '^\\d{2}-\\d{3}-\\d{4}$',
        parcel_id_separator: '-',
        parcel_id_for_api: 'as_is',
        csv_source_url: 'https://www.daviscountyutah.gov/controller/tax-administration-group/tax-sale/delinquent-tax-sale',
        csv_format_notes: 'Extracted from PowerPoint/PDF via Chrome Extension OCR. May 13, 2026 auction. Contact: 801-451-3329',
        notes: 'Tax sale May 13, 2026 @ 10:00 AM. In-person auction at Davis County Admin Building, Room 303. Data extracted from PowerPoint/PDF via OCR.'
      }
    })

    console.log('✅ Davis County configuration updated!\n')
  } else {
    console.log('Creating new Davis County entry...\n')

    await prisma.countyConfig.create({
      data: {
        county_name: 'davis',
        display_name: 'Davis County',
        state: 'Utah',
        is_active: true,
        auction_platform: 'In-person Auction',
        auction_date: '2026-05-13',
        auction_format: 'bid_up',
        sale_type: 'deed',
        parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Davis_LIR/FeatureServer/0/query',
        land_records_url: 'https://www.daviscountyutah.gov/assessor/',
        parcel_id_format: '^\\d{2}-\\d{3}-\\d{4}$',
        parcel_id_separator: '-',
        parcel_id_for_api: 'as_is',
        csv_source_url: 'https://www.daviscountyutah.gov/controller/tax-administration-group/tax-sale/delinquent-tax-sale',
        csv_format_notes: 'Extracted from PowerPoint/PDF via Chrome Extension OCR. Parcel format: XX-XXX-XXXX. Example: 01-113-0049. May 13, 2026 auction. Contact: 801-451-3329',
        notes: 'Tax sale May 13, 2026 @ 10:00 AM. In-person auction at Davis County Admin Building, Room 303, 61 South Main Street, Farmington, UT 84025. Data extracted from PowerPoint/PDF via Chrome Extension OCR.'
      }
    })

    console.log('✅ Davis County added successfully!\n')
  }

  // Show current counties
  const counties = await prisma.countyConfig.findMany({
    orderBy: { county_name: 'asc' },
    select: {
      county_name: true,
      display_name: true,
      is_active: true,
      auction_date: true
    }
  })

  console.log('Current counties in database:')
  console.log('─'.repeat(60))
  counties.forEach(c => {
    const status = c.is_active ? '✅' : '⏸️'
    console.log(`${status} ${c.display_name.padEnd(20)} | Auction: ${c.auction_date || 'N/A'}`)
  })
  console.log('─'.repeat(60))
  console.log(`\nTotal: ${counties.length} counties\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
