// Fix property types for existing properties
// Run with: npx ts-node scripts/fix-property-types.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPropertyTypes() {
  const properties = await prisma.property.findMany({
    where: { is_seed: false },
    select: {
      id: true,
      parcel_number: true,
      property_address: true,
      property_type: true,
      building_sqft: true,
      year_built: true,
      zoning: true,
      legal_description: true
    }
  })

  let updated = 0
  const typeCounts: Record<string, number> = {}

  for (const prop of properties) {
    let newType = prop.property_type

    // Detect condos from address
    if (prop.property_address) {
      const addr = prop.property_address.toUpperCase()
      if (addr.includes('UNIT') || addr.includes('#') || addr.includes('APT')) {
        newType = 'condo'
      }
    }

    // Detect condos from legal description
    if (prop.legal_description) {
      const legal = prop.legal_description.toUpperCase()
      if (legal.includes('CONDO') || legal.includes('UNIT')) {
        newType = 'condo'
      }
    }

    // Detect land: no building and no year built
    if (newType === 'unknown' || newType === 'single_family') {
      if ((!prop.building_sqft || prop.building_sqft === 0) &&
          (!prop.year_built || prop.year_built === 0)) {
        newType = 'vacant_land'
      }
    }

    // Detect commercial from zoning
    if (prop.zoning && (newType === 'unknown' || newType === 'single_family')) {
      const zoneUpper = prop.zoning.toUpperCase()
      if (zoneUpper.startsWith('C-') || zoneUpper.startsWith('CC') || zoneUpper.startsWith('CO')) {
        newType = 'commercial'
      }
    }

    // Update if changed
    if (newType !== prop.property_type) {
      await prisma.property.update({
        where: { id: prop.id },
        data: { property_type: newType }
      })
      updated++
      console.log(`Updated ${prop.parcel_number}: ${prop.property_type} -> ${newType}`)
    }

    // Count final types
    typeCounts[newType] = (typeCounts[newType] || 0) + 1
  }

  console.log(`\nUpdated ${updated} properties`)
  console.log('\nFinal type distribution:')
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`)
  }

  await prisma.$disconnect()
}

fixPropertyTypes().catch(console.error)
