#!/usr/bin/env tsx
// Import full_property_records.json into the database
// Usage: npx tsx scripts/import-full-records.ts

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RECORDS_PATH = path.join(process.cwd(), 'output', 'full_property_records.json')

async function main() {
  console.log('Importing full property records...')

  if (!fs.existsSync(RECORDS_PATH)) {
    console.error(`Records file not found: ${RECORDS_PATH}`)
    process.exit(1)
  }

  const records = JSON.parse(fs.readFileSync(RECORDS_PATH, 'utf-8'))
  console.log(`Loaded ${records.length} records from ${RECORDS_PATH}`)

  let imported = 0
  let errors = 0
  let skipped = 0

  for (const record of records) {
    try {
      // Skip if already exists
      const existing = await prisma.property.findUnique({
        where: { parcel_number: record.parcel_id }
      })

      if (existing) {
        // Update the existing property instead of skipping
        console.log(`  Updating existing: ${record.parcel_id}`)
      }

      // Map property type
      let propertyType = record.property_type || 'unknown'
      if (propertyType === 'unknown' && record.property_class) {
        const cls = record.property_class.toLowerCase()
        if (cls.includes('residential')) propertyType = 'single_family'
        else if (cls.includes('vacant')) propertyType = 'vacant_land'
        else if (cls.includes('commercial')) propertyType = 'commercial'
      }

      // Calculate simple scores inline (can't import from lib due to server-only)
      const dataConfidence = record.market_value ? 50 : 20
      const bid = record.opening_bid || 0
      const market = record.market_value || bid * 2
      const equity = market - bid
      const equityPct = market > 0 ? (equity / market) * 100 : 0

      // Simple scoring
      let finalScore = 50
      if (equityPct > 30) finalScore += 20
      else if (equityPct > 15) finalScore += 10
      if (record.market_value) finalScore += 15
      if (record.acres && record.acres > 0.1) finalScore += 5

      finalScore = Math.min(100, Math.max(0, finalScore))

      let recommendation = 'research_more'
      if (finalScore >= 70) recommendation = 'bid'
      else if (finalScore < 40) recommendation = 'avoid'

      let recommendationBucket = 'RESEARCH'
      if (finalScore >= 80) recommendationBucket = 'TOP_TARGET'
      else if (finalScore >= 65) recommendationBucket = 'BID_CANDIDATE'
      else if (finalScore >= 45) recommendationBucket = 'WATCHLIST'
      else recommendationBucket = 'AVOID'

      const propertyData = {
        county: record.county,
        sale_year: 2026,
        sale_date: record.auction_end || null,
        parcel_number: record.parcel_id,
        owner_name: record.owner_name,
        owner_mailing_address: record.assessor_enrichment?.mailing_address || null,
        property_address: record.situs_address || record.assessor_enrichment?.situs_address || null,
        legal_description: record.legal_description,
        total_amount_due: record.opening_bid,
        assessed_value: record.assessed_value,
        estimated_market_value: record.market_value,
        property_type: propertyType,
        lot_size_sqft: record.acres ? record.acres * 43560 : null,
        building_sqft: record.building_sqft,
        year_built: record.year_built,
        zoning: record.zoning,
        latitude: record.latitude,
        longitude: record.longitude,
        auction_platform: record.auction_platform === 'public_surplus' ? 'public_surplus' : null,
        deposit_required: null,
        access_risk: 'unknown',
        title_risk: 'unknown',
        legal_risk: 'unknown',
        marketability_risk: 'unknown',
        data_confidence: dataConfidence,
        opportunity_score: finalScore,
        risk_score: 100 - finalScore,
        final_score: finalScore,
        investability_score: finalScore,
        recommendation: recommendation,
        recommendation_bucket: recommendationBucket,
        status: 'new',
        is_seed: false,
        county_source_url: record.auction_url,
        source_last_checked_at: record.enriched_at || new Date().toISOString()
      }

      let property
      if (existing) {
        property = await prisma.property.update({
          where: { parcel_number: record.parcel_id },
          data: propertyData
        })
      } else {
        property = await prisma.property.create({
          data: propertyData
        })
      }

      // Add source
      await prisma.source.upsert({
        where: {
          property_id_label: {
            property_id: property.id,
            label: `${record.county_display} County Tax Sale`
          }
        },
        update: {
          source_type: 'county_tax_sale',
          url: record.auction_url
        },
        create: {
          property_id: property.id,
          label: `${record.county_display} County Tax Sale`,
          source_type: 'county_tax_sale',
          url: record.auction_url
        }
      })

      imported++
      if (imported % 50 === 0) {
        console.log(`  ...${imported} imported`)
      }
    } catch (error) {
      console.error(`Error importing ${record.parcel_id}:`, (error as Error).message)
      errors++
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Skipped: ${skipped}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
