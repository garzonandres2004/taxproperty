import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreProperty, calculateDataConfidence } from '@/lib/scoring'
import { promises as fs } from 'fs'
import path from 'path'

interface ScrapedRow {
  serial: string
  situs_address: string
  mailing_address: string
  owner_name: string
  owner_type_tag: string
  acres: string
  market_value: string
  land_value: string
  building_value: string
  tax_area: string
  subdivision_map: string
  taxing_description: string
  balance_due: string
  payoff_to_value_ratio: string
  is_micro_parcel: string
  is_likely_condo: string
  score: string
  data_source: string
}

export async function POST(request: Request) {
  try {
    // Read the CSV file from scripts directory
    const csvPath = path.join(process.cwd(), 'scripts', 'output_parcels_scored.csv')
    const csvContent = await fs.readFile(csvPath, 'utf-8')

    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        if (values.length !== headers.length) {
          results.skipped++
          continue
        }

        const row: ScrapedRow = {} as ScrapedRow
        headers.forEach((header, idx) => {
          row[header as keyof ScrapedRow] = values[idx]?.replace(/^"|"$/g, '') || ''
        })

        // Skip seed/fake data (non-Utah pattern)
        const serial = row.serial?.replace(/"/g, '')
        if (!/^\d{2}:\d{3}:\d{4}$/.test(serial)) {
          results.skipped++
          continue
        }

        const marketValue = parseFloat(row.market_value) || null
        const balanceDue = parseFloat(row.balance_due) || 0
        const acres = parseFloat(row.acres) || null
        const landValue = parseFloat(row.land_value) || null
        const buildingValue = parseFloat(row.building_value) || null

        // Calculate scores using existing scoring engine
        const dataConfidence = calculateDataConfidence({
          total_amount_due: balanceDue,
          estimated_market_value: marketValue,
          property_type: row.is_likely_condo === 'True' ? 'condo' : 'unknown',
          occupancy_status: 'unknown',
          zoning: null,
          lot_size_sqft: acres ? acres * 43560 : null,
          building_sqft: null,
          year_built: null,
          assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue
        })

        const scores = scoreProperty({
          total_amount_due: balanceDue,
          estimated_market_value: marketValue,
          estimated_repair_cost: null,
          estimated_cleanup_cost: null,
          estimated_closing_cost: null,
          property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
          occupancy_status: 'unknown',
          zoning: null,
          lot_size_sqft: acres ? acres * 43560 : null,
          building_sqft: null,
          year_built: null,
          assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue,
          deposit_required: null,
          data_confidence: dataConfidence,
          access_risk: 'unknown',
          title_risk: 'unknown',
          legal_risk: 'unknown',
          marketability_risk: 'unknown'
        })

        // Determine recommendation based on scraper score
        const scraperScore = parseInt(row.score) || 0
        let recommendation = scores.recommendation
        if (scraperScore >= 80) {
          recommendation = 'bid'
        } else if (scraperScore >= 40) {
          recommendation = 'research_more'
        } else if (scraperScore < 0) {
          recommendation = 'avoid'
        }

        // Upsert property
        const property = await prisma.property.upsert({
          where: { parcel_number: serial },
          update: {
            county: 'utah',
            sale_year: 2026,
            total_amount_due: balanceDue,
            estimated_market_value: marketValue,
            assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue,
            lot_size_sqft: acres ? acres * 43560 : null,
            owner_name: row.owner_name || null,
            property_address: row.situs_address || null,
            owner_mailing_address: row.mailing_address || null,
            property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
            opportunity_score: scores.opportunity_score,
            risk_score: scores.risk_score,
            final_score: scores.final_score,
            recommendation: recommendation,
            data_confidence: dataConfidence,
            is_seed: false,
            updated_at: new Date()
          },
          create: {
            county: 'utah',
            sale_year: 2026,
            parcel_number: serial,
            total_amount_due: balanceDue,
            estimated_market_value: marketValue,
            assessed_value: landValue && buildingValue ? landValue + buildingValue : marketValue,
            lot_size_sqft: acres ? acres * 43560 : null,
            owner_name: row.owner_name || null,
            property_address: row.situs_address || null,
            owner_mailing_address: row.mailing_address || null,
            property_type: row.is_likely_condo === 'True' ? 'condo' : 'single_family',
            opportunity_score: scores.opportunity_score,
            risk_score: scores.risk_score,
            final_score: scores.final_score,
            recommendation: recommendation,
            data_confidence: dataConfidence,
            is_seed: false,
            status: 'new'
          }
        })

        // Add source tracking
        await prisma.source.upsert({
          where: {
            property_id_label: {
              property_id: property.id,
              label: 'Utah County Scraper v2'
            }
          },
          update: {
            source_type: 'county_listing',
            url: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${serial.replace(/:/g, '')}`
          },
          create: {
            property_id: property.id,
            label: 'Utah County Scraper v2',
            source_type: 'county_listing',
            url: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${serial.replace(/:/g, '')}`
          }
        })

        results.imported++
      } catch (error) {
        const err = error as Error
        results.errors.push(`Row ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
      details: results
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import scraped data' },
      { status: 500 }
    )
  }
}

// Simple CSV line parser (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
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
