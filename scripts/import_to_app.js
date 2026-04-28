#!/usr/bin/env node
/**
 * Import scraped CSV data into the app database
 * Usage: node import_to_app.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Scoring functions (simplified from lib/scoring)
function calculateDataConfidence(data) {
  let confidence = 0
  if (data.estimated_market_value) confidence += 30
  if (data.total_amount_due) confidence += 25
  if (data.property_type && data.property_type !== 'unknown') confidence += 15
  if (data.lot_size_sqft) confidence += 15
  if (data.assessed_value) confidence += 15
  return Math.min(confidence, 100)
}

function scoreProperty(data) {
  let opportunityScore = 50
  let riskScore = 20

  // Market value score (higher value = more opportunity, up to a point)
  if (data.estimated_market_value) {
    if (data.estimated_market_value >= 150000 && data.estimated_market_value <= 350000) {
      opportunityScore += 30
    } else if (data.estimated_market_value > 350000) {
      opportunityScore += 20
    } else if (data.estimated_market_value >= 100000) {
      opportunityScore += 15
    }
  }

  // Payoff ratio bonus
  if (data.estimated_market_value && data.total_amount_due) {
    const ratio = data.total_amount_due / data.estimated_market_value
    if (ratio < 0.04) opportunityScore += 20
    else if (ratio < 0.05) opportunityScore += 15
    else if (ratio < 0.10) opportunityScore += 5
    else riskScore += 10
  }

  // Property type risk
  if (data.property_type === 'condo') riskScore += 15
  if (data.property_type === 'single_family') riskScore -= 5

  // Data confidence affects opportunity
  if (data.data_confidence) {
    opportunityScore += (data.data_confidence - 50) / 10
  }

  const finalScore = Math.max(0, Math.min(100, opportunityScore - riskScore))

  let recommendation = 'research_more'
  if (finalScore >= 70) recommendation = 'bid'
  else if (finalScore <= 30) recommendation = 'avoid'

  return {
    opportunity_score: Math.round(opportunityScore),
    risk_score: Math.round(riskScore),
    final_score: Math.round(finalScore),
    recommendation
  }
}

async function importCSV() {
  const csvPath = path.join(__dirname, 'output_parcels_scored.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())

  console.log(`Found ${lines.length - 1} rows to import`)

  let imported = 0
  let updated = 0
  let skipped = 0
  let errors = []

  for (let i = 1; i < lines.length; i++) {
    try {
      // Parse CSV line properly
      const values = parseCSVLine(lines[i])
      const row = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })

      const serial = row.serial?.replace(/^"|"$/g, '')

      // Skip seed/fake data
      if (!/^\d{2}:\d{3}:\d{4}$/.test(serial)) {
        skipped++
        console.log(`  Skipping ${serial} - not Utah pattern`)
        continue
      }

      const marketValue = parseFloat(row.market_value) || null
      const balanceDue = parseFloat(row.balance_due) || 0
      const acres = parseFloat(row.acres) || null
      const landValue = parseFloat(row.land_value) || null
      const buildingValue = parseFloat(row.building_value) || null

      // Calculate scores
      const dataConfidence = calculateDataConfidence({
        estimated_market_value: marketValue,
        total_amount_due: balanceDue,
        property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
        lot_size_sqft: acres ? acres * 43560 : null,
        assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue
      })

      const scores = scoreProperty({
        estimated_market_value: marketValue,
        total_amount_due: balanceDue,
        property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
        lot_size_sqft: acres ? acres * 43560 : null,
        data_confidence: dataConfidence
      })

      // Check if property exists
      const existing = await prisma.property.findUnique({
        where: { parcel_number: serial }
      })

      const propertyData = {
        county: 'utah',
        sale_year: 2026,
        total_amount_due: balanceDue,
        estimated_market_value: marketValue,
        assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue,
        lot_size_sqft: acres ? acres * 43560 : null,
        owner_name: row.owner_name?.replace(/^"|"$/g, '') || null,
        property_address: row.situs_address?.replace(/^"|"$/g, '') || null,
        owner_mailing_address: row.mailing_address?.replace(/^"|"$/g, '') || null,
        property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        final_score: scores.final_score,
        recommendation: scores.recommendation,
        data_confidence: dataConfidence,
        is_seed: false
      }

      let property
      if (existing) {
        property = await prisma.property.update({
          where: { parcel_number: serial },
          data: propertyData
        })
        updated++
        console.log(`  Updated: ${serial} - Score ${scores.final_score}`)
      } else {
        property = await prisma.property.create({
          data: {
            ...propertyData,
            parcel_number: serial,
            status: 'new'
          }
        })
        imported++
        console.log(`  Imported: ${serial} - Score ${scores.final_score}`)
      }

      // Add source (delete existing first to avoid duplicates)
      await prisma.source.deleteMany({
        where: {
          property_id: property.id,
          label: 'Utah County Scraper v2'
        }
      })

      await prisma.source.create({
        data: {
          property_id: property.id,
          label: 'Utah County Scraper v2',
          source_type: 'county_listing',
          url: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${serial.replace(/:/g, '')}`
        }
      })

    } catch (error) {
      errors.push(`Row ${i + 1}: ${error.message}`)
      console.error(`  Error on row ${i + 1}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('IMPORT COMPLETE')
  console.log('='.repeat(50))
  console.log(`Imported: ${imported}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors.length}`)

  await prisma.$disconnect()
}

// Simple CSV line parser
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

importCSV().catch(console.error)
