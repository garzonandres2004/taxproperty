/**
 * Batch Municipal Lien Checker
 * 
 * Checks all properties for municipal liens and updates database.
 * Usage: npm run check-municipal-liens
 */

import { PrismaClient } from '@prisma/client'
import { 
  checkMunicipalLiens, 
  calculateLienRiskLevel,
  batchCheckMunicipalLiens 
} from '../src/lib/municipal-liens'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Batch Municipal Lien Checker')
  console.log('================================\n')

  // Get all unincorporated properties (only ones we can auto-check)
  const properties = await prisma.property.findMany({
    where: {
      county: 'utah',
      is_seed: false,
      status: {
        notIn: ['redeemed', 'removed', 'sold']
      }
    },
    select: {
      id: true,
      parcel_number: true,
      property_address: true,
      municipal_lien_risk: true,
      municipal_lien_checked_at: true,
    }
  })

  console.log(`Found ${properties.length} properties to check\n`)

  // Identify unincorporated properties (can be auto-checked)
  const unincorporatedProps = properties.filter(p => {
    if (!p.property_address) return false
    const addr = p.property_address.toUpperCase()
    // Check for city indicators
    const cities = [
      'PROVO', 'OREM', 'LEHI', 'AMERICAN FORK', 'PLEASANT GROVE',
      'SPANISH FORK', 'SPRINGVILLE', 'HIGHLAND', 'ALPINE', 'LINDON',
      'MAPLETON', 'PAYSON', 'SARATOGA SPRINGS', 'EAGLE MOUNTAIN',
      'VINEYARD', 'CEDAR HILLS', 'GOSHEN', 'SANTAQUIN', 'SALEM'
    ]
    return !cities.some(city => addr.includes(city))
  })

  const cityProps = properties.filter(p => !unincorporatedProps.includes(p))

  console.log(`  📍 Unincorporated (auto-checkable): ${unincorporatedProps.length}`)
  console.log(`  🏙️  City properties (manual only): ${cityProps.length}\n`)

  // Process unincorporated properties
  if (unincorporatedProps.length > 0) {
    console.log('Checking unincorporated properties...')
    
    let checked = 0
    let withViolations = 0
    let withLiens = 0

    for (const prop of unincorporatedProps) {
      try {
        const result = await checkMunicipalLiens(
          prop.parcel_number,
          prop.property_address
        )

        const riskLevel = calculateLienRiskLevel(result)

        // Update database
        await prisma.property.update({
          where: { id: prop.id },
          data: {
            municipal_lien_risk: riskLevel.toLowerCase(),
            code_violations_found: result.hasViolations,
            code_violations_balance_due: result.totalBalanceDue > 0 ? result.totalBalanceDue : null,
            utility_lien_notes: result.notes,
            municipal_lien_checked_at: new Date(),
          }
        })

        if (result.hasViolations) {
          withViolations++
          console.log(`  ⚠️  ${prop.parcel_number}: ${result.violationCount} violation(s), $${result.totalBalanceDue} due`)
        }

        if (result.hasActiveLien) {
          withLiens++
          console.log(`  🚨 ${prop.parcel_number}: ACTIVE LIEN`)
        }

        checked++

        // Rate limiting
        if (checked % 5 === 0) {
          console.log(`  ... ${checked}/${unincorporatedProps.length} checked`)
          await new Promise(r => setTimeout(r, 1000))
        }
      } catch (error) {
        console.error(`  ❌ Error checking ${prop.parcel_number}:`, error)
      }
    }

    console.log(`\n✅ Completed: ${checked} checked`)
    console.log(`   ${withViolations} with violations`)
    console.log(`   ${withLiens} with active liens\n`)
  }

  // Update city properties as "manual required"
  if (cityProps.length > 0) {
    console.log('Marking city properties as manual check required...')
    
    for (const prop of cityProps) {
      await prisma.property.update({
        where: { id: prop.id },
        data: {
          municipal_lien_risk: 'unknown',
          utility_lien_notes: `City property - manual verification required. Check with city code enforcement department.`,
          municipal_lien_checked_at: new Date(),
        }
      })
    }
    
    console.log(`✅ ${cityProps.length} city properties marked\n`)
  }

  // Print summary
  const summary = await prisma.property.groupBy({
    by: ['municipal_lien_risk'],
    _count: { municipal_lien_risk: true },
    where: { county: 'utah', is_seed: false }
  })

  console.log('Summary by Risk Level:')
  console.log('---------------------')
  summary.forEach(row => {
    console.log(`  ${row.municipal_lien_risk?.padEnd(10)}: ${row._count.municipal_lien_risk}`)
  })

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('Error:', error)
  await prisma.$disconnect()
  process.exit(1)
})
