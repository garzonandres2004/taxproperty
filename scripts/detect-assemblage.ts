// Script to detect assemblage opportunities for micro-parcels
// Run with: npx tsx scripts/detect-assemblage.ts

import { prisma } from '@/lib/db'
import { detectAssemblageForMicroParcels, batchDetectAssemblage } from '@/lib/assemblage/detector'

async function main() {
  console.log('Starting assemblage detection for micro-parcels...\n')

  // Get count of micro-parcels
  const microParcelCount = await prisma.property.count({
    where: {
      lot_size_sqft: { lt: 2000 },
      property_type: { not: 'condo' },
      is_seed: false
    }
  })

  console.log(`Found ${microParcelCount} micro-parcels to process\n`)

  // Run detection
  const processed = await detectAssemblageForMicroParcels()

  // Get results summary
  const propertiesWithAssemblage = await prisma.property.count({
    where: {
      assemblage_opportunity: true,
      is_seed: false
    }
  })

  const adjacentParcelCount = await prisma.adjacentParcel.count()
  const taxSaleAdjacentCount = await prisma.adjacentParcel.count({
    where: { is_in_tax_sale: true }
  })

  console.log('\n=== Assemblage Detection Complete ===')
  console.log(`Micro-parcels processed: ${processed}`)
  console.log(`Properties with assemblage opportunity: ${propertiesWithAssemblage}`)
  console.log(`Total adjacent parcels found: ${adjacentParcelCount}`)
  console.log(`Adjacent parcels in tax sale: ${taxSaleAdjacentCount}`)

  // Show some examples
  const examples = await prisma.property.findMany({
    where: { assemblage_opportunity: true },
    include: {
      adjacent_parcels: {
        where: { is_in_tax_sale: true }
      }
    },
    take: 5
  })

  if (examples.length > 0) {
    console.log('\n=== Example Properties ===')
    examples.forEach(p => {
      console.log(`\n${p.parcel_number} (${p.lot_size_sqft} sq ft)`)
      console.log(`  Adjacent tax sale parcels: ${p.adjacent_parcels.length}`)
      p.adjacent_parcels.forEach(ap => {
        console.log(`    - ${ap.adjacent_parcel_number}`)
      })
    })
  }
}

main()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nError:', error)
    process.exit(1)
  })
