import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// All 29 Utah counties with their AGRC LIR endpoints
// AGRC pattern: Parcels_[CountyName]_LIR (camelCase, no spaces)
const UTAH_COUNTIES = [
  { name: 'beaver', display: 'Beaver County', agrc: 'Parcels_Beaver_LIR' },
  { name: 'box_elder', display: 'Box Elder County', agrc: 'Parcels_BoxElder_LIR' },
  { name: 'cache', display: 'Cache County', agrc: 'Parcels_Cache_LIR' },
  { name: 'carbon', display: 'Carbon County', agrc: 'Parcels_Carbon_LIR' },
  { name: 'daggett', display: 'Daggett County', agrc: 'Parcels_Daggett_LIR' },
  { name: 'davis', display: 'Davis County', agrc: 'Parcels_Davis_LIR' },
  { name: 'duchesne', display: 'Duchesne County', agrc: 'Parcels_Duchesne_LIR' },
  { name: 'emery', display: 'Emery County', agrc: 'Parcels_Emery_LIR' },
  { name: 'garfield', display: 'Garfield County', agrc: 'Parcels_Garfield_LIR' },
  { name: 'grand', display: 'Grand County', agrc: 'Parcels_Grand_LIR' },
  { name: 'iron', display: 'Iron County', agrc: 'Parcels_Iron_LIR' },
  { name: 'juab', display: 'Juab County', agrc: 'Parcels_Juab_LIR' },
  { name: 'kane', display: 'Kane County', agrc: 'Parcels_Kane_LIR' },
  { name: 'millard', display: 'Millard County', agrc: 'Parcels_Millard_LIR' },
  { name: 'morgan', display: 'Morgan County', agrc: 'Parcels_Morgan_LIR' },
  { name: 'piute', display: 'Piute County', agrc: 'Parcels_Piute_LIR' },
  { name: 'rich', display: 'Rich County', agrc: 'Parcels_Rich_LIR' },
  { name: 'salt_lake', display: 'Salt Lake County', agrc: 'Parcels_SaltLake_LIR' },
  { name: 'san_juan', display: 'San Juan County', agrc: 'Parcels_SanJuan_LIR' },
  { name: 'sanpete', display: 'Sanpete County', agrc: 'Parcels_Sanpete_LIR' },
  { name: 'sevier', display: 'Sevier County', agrc: 'Parcels_Sevier_LIR' },
  { name: 'summit', display: 'Summit County', agrc: 'Parcels_Summit_LIR' },
  { name: 'tooele', display: 'Tooele County', agrc: 'Parcels_Tooele_LIR' },
  { name: 'uintah', display: 'Uintah County', agrc: 'Parcels_Uintah_LIR' },
  { name: 'utah', display: 'Utah County', agrc: 'Parcels_Utah_LIR' },
  { name: 'wasatch', display: 'Wasatch County', agrc: 'Parcels_Wasatch_LIR' },
  { name: 'washington', display: 'Washington County', agrc: 'Parcels_Washington_LIR' },
  { name: 'wayne', display: 'Wayne County', agrc: 'Parcels_Wayne_LIR' },
  { name: 'weber', display: 'Weber County', agrc: 'Parcels_Weber_LIR' },
]

async function main() {
  console.log('Seeding all 29 Utah counties...\n')

  for (const county of UTAH_COUNTIES) {
    // Utah and Tooele already seeded - they'll update
    // Others will be created inactive until we get their data
    const isActive = ['utah', 'tooele'].includes(county.name)

    await prisma.countyConfig.upsert({
      where: { county_name: county.name },
      create: {
        county_name: county.name,
        display_name: county.display,
        state: 'Utah',
        parcel_api_url: `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/${county.agrc}/FeatureServer/0/query`,
        parcel_api_layer: county.agrc,
        sale_type: 'deed',
        is_active: isActive,
        notes: isActive
          ? 'Active - tax sale data imported'
          : 'Pending - awaiting tax sale list and auction details',
      },
      update: {
        // Update existing with correct AGRC URLs
        parcel_api_url: `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/${county.agrc}/FeatureServer/0/query`,
        parcel_api_layer: county.agrc,
      }
    })

    console.log(`✓ ${county.display}: ${isActive ? 'ACTIVE' : 'pending'}`)
  }

  // Verify count
  const count = await prisma.countyConfig.count()
  console.log(`\n✓ Total counties in database: ${count}`)

  // Show active counties
  const active = await prisma.countyConfig.findMany({
    where: { is_active: true },
    orderBy: { county_name: 'asc' }
  })
  console.log(`\nActive counties (${active.length}):`)
  active.forEach(c => console.log(`  - ${c.display_name}`))

  // Show pending
  const pending = await prisma.countyConfig.count({ where: { is_active: false } })
  console.log(`\nPending counties: ${pending}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
