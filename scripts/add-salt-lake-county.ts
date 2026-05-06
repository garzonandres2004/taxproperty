// Script to add Salt Lake County to the database
// Run with: npx ts-node scripts/add-salt-lake-county.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Salt Lake County to database...')

  // Check if already exists
  const existing = await prisma.countyConfig.findUnique({
    where: { county_name: 'salt_lake' }
  })

  if (existing) {
    console.log('Salt Lake County already exists in database')
    console.log('Updating configuration...')

    await prisma.countyConfig.update({
      where: { county_name: 'salt_lake' },
      data: {
        display_name: 'Salt Lake County',
        state: 'Utah',
        is_active: true,
        auction_platform: 'Public Surplus',
        auction_date: '2026-05-21', // Verify with county
        parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query',
        land_records_url_template: 'https://slco.org/assessor/search/?parcel={parcel_id}',
        notes: 'High-priority county. Verify sale date with treasurer.',
        config_json: JSON.stringify({
          redemption_period: 'until_bidding',
          deposit_required: 500,
          buyer_premium: 0,
          deed_type: 'tax_deed',
          pre_sale_volatility: 'high',
          data_quality: 'good',
          agrc_endpoint: 'Parcels_SaltLake_LIR'
        })
      }
    })

    console.log('Salt Lake County configuration updated!')
  } else {
    console.log('Creating new Salt Lake County entry...')

    await prisma.countyConfig.create({
      data: {
        county_name: 'salt_lake',
        display_name: 'Salt Lake County',
        state: 'Utah',
        is_active: true,
        auction_platform: 'Public Surplus',
        auction_date: '2026-05-21', // TODO: Verify with county
        parcel_api_url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query',
        land_records_url_template: 'https://slco.org/assessor/search/?parcel={parcel_id}',
        notes: 'High-priority county. ~500 properties annually. Verify sale date with treasurer.',
        config_json: JSON.stringify({
          redemption_period: 'until_bidding',
          deposit_required: 500,
          buyer_premium: 0,
          deed_type: 'tax_deed',
          pre_sale_volatility: 'high',
          data_quality: 'good',
          agrc_endpoint: 'Parcels_SaltLake_LIR',
          parcel_format: '9-12 digits numeric',
          parcel_example: '22-33-277-017'
        })
      }
    })

    console.log('Salt Lake County added successfully!')
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

  console.log('\nCurrent counties in database:')
  console.table(counties)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
