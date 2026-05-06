// Rich County 2026 May Tax Sale - 4 active properties
// Source: https://www.richcounty.gov/wp-content/uploads/may-tax-sale-list-rich-county-utah.pdf
// Auction: May 14, 2026 @ 10:00 AM MDT via Public Surplus

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const RICH_PROPERTIES = [
  {
    parcel_number: '36-04-050-0022',
    owner_name: 'SEALE, HENRY & CATHERINE',
    owner_mailing_address: 'PO BOX 878, EVANSTON, WY 82930',
    legal_description: 'LOT 22, SWEETWATER GOLF COURSE SUBDIVISION 5',
    total_amount_due: 1856.02,
  },
  {
    parcel_number: '36-05-130-0004',
    owner_name: 'TAYLOR, SHERRY & ALLEN',
    owner_mailing_address: 'PO BOX 569, GARDEN CITY, UT 84028',
    legal_description: 'LOT 4, OMEGA SUBDIVISION 2',
    total_amount_due: 9274.29,
  },
  {
    parcel_number: '37-17-010-0028',
    owner_name: 'HUMBERT, STEVEN T & JEPPSON, LISA',
    owner_mailing_address: '1354 W 1300 S, WOODS CROSS, UT 84087',
    legal_description: 'LOT 28, VISTA GRANDE ESTATES SUBDIVISION',
    total_amount_due: 8269.05,
  },
  {
    parcel_number: '41-30-090-0106',
    owner_name: 'TOONE, JAMES AVARD',
    owner_mailing_address: '10129 GRAND OAK CIR, MADEIRA BEACH, FL 33708',
    legal_description: 'PART OF THE OPEN SPACE, EAGLE FEATHER AT SHUNDAHAI SUBDIVISION',
    total_amount_due: 4374.15,
  },
]

async function main() {
  console.log('Importing 4 Rich County 2026 properties...\n')

  const ids: string[] = []

  for (const p of RICH_PROPERTIES) {
    // Upsert so re-running is safe
    const existing = await prisma.property.findUnique({ where: { parcel_number: p.parcel_number } })
    if (existing) {
      console.log(`  SKIP (exists): ${p.parcel_number}`)
      ids.push(existing.id)
      continue
    }

    const created = await prisma.property.create({
      data: {
        county: 'rich',
        sale_year: 2026,
        sale_date: '2026-05-14',
        parcel_number: p.parcel_number,
        owner_name: p.owner_name,
        owner_mailing_address: p.owner_mailing_address,
        legal_description: p.legal_description,
        total_amount_due: p.total_amount_due,
        property_type: 'unknown',
        occupancy_status: 'unknown',
        auction_platform: 'Public Surplus',
        deposit_required: 1000,
        status: 'new',
        is_seed: false,
        presale_volatility_risk: 10,
        is_active_sale_candidate: true,
      }
    })

    console.log(`  CREATED: ${p.parcel_number} (id: ${created.id})`)
    ids.push(created.id)
  }

  console.log(`\nImported IDs:\n${ids.join('\n')}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
