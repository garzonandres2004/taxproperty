// Manual enrichment for Davis County properties
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enrichDavisProperties() {
  console.log('Enriching Davis County properties...\n')

  const properties = await prisma.property.findMany({
    where: { county: 'davis' },
    select: {
      id: true,
      parcel_number: true,
      property_address: true
    }
  })

  console.log(`Found ${properties.length} properties to enrich`)

  let enriched = 0
  let failed = 0

  for (const prop of properties) {
    try {
      // AGRC endpoint for Davis County
      const parcelId = prop.parcel_number
      const whereValue = `PARCEL_ID='${parcelId}'`.replace(/'/g, '%27')
      const outFields = 'PARCEL_ID,TOTAL_MKT_VALUE,PARCEL_ACRES,BLDG_SQFT,BUILT_YR,PARCEL_ADD,PARCEL_CITY'
      const agrcUrl = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Davis_LIR/FeatureServer/0/query?where=${whereValue}&outFields=${outFields}&returnGeometry=false&f=json`

      const response = await fetch(agrcUrl, {
        headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
      })

      if (!response.ok) {
        console.log(`  ${prop.parcel_number}: HTTP ${response.status}`)
        failed++
        continue
      }

      const data = await response.json()

      if (data?.features?.length > 0) {
        const attrs = data.features[0].attributes

        const updates: any = {}

        if (attrs.TOTAL_MKT_VALUE) {
          updates.estimated_market_value = Math.round(attrs.TOTAL_MKT_VALUE)
        }
        if (attrs.BLDG_SQFT) {
          updates.building_sqft = Math.round(attrs.BLDG_SQFT)
        }
        if (attrs.BUILT_YR) {
          updates.year_built = attrs.BUILT_YR
        }
        if (attrs.PARCEL_ACRES) {
          updates.lot_size_sqft = Math.round(attrs.PARCEL_ACRES * 43560)
        }

        if (Object.keys(updates).length > 0) {
          await prisma.property.update({
            where: { id: prop.id },
            data: updates
          })
          enriched++
          console.log(`  ✅ ${prop.parcel_number}: Market value $${updates.estimated_market_value?.toLocaleString() || 'N/A'}`)
        } else {
          console.log(`  ⚠️ ${prop.parcel_number}: No data from AGRC`)
          failed++
        }
      } else {
        console.log(`  ❌ ${prop.parcel_number}: Not found in AGRC`)
        failed++
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.log(`  ❌ ${prop.parcel_number}: ${error}`)
      failed++
    }
  }

  console.log(`\n✅ Enrichment complete!`)
  console.log(`   Enriched: ${enriched}`)
  console.log(`   Failed: ${failed}`)
}

enrichDavisProperties()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
