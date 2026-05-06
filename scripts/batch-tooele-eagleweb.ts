#!/usr/bin/env tsx
/**
 * Batch process all Tooele County properties through EagleWeb
 * Generates title signals for auction triage
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import { TooeleEagleWebScraper, EagleWebResult } from '../src/lib/title/scrapers/tooele-eagleweb'

const prisma = new PrismaClient()
const SESSION_FILE = '.tooele-eagleweb-session.json'

// Clear any stale session file before starting
if (fs.existsSync(SESSION_FILE)) {
  fs.unlinkSync(SESSION_FILE)
  console.log('Cleared stale session file')
}

interface PropertyResult {
  parcelNumber: string
  propertyId: string
  ownerName?: string
  address?: string
  success: boolean
  eagleWebResult?: EagleWebResult
  error?: string
}

async function main() {
  console.log('='.repeat(80))
  console.log('TOOELE EAGLEWEB - BATCH PROCESSING')
  console.log('='.repeat(80))
  console.log('')

  // Get all Tooele properties
  const properties = await prisma.property.findMany({
    where: { county: 'tooele' },
    orderBy: { total_amount_due: 'desc' }
  })

  console.log(`Found ${properties.length} Tooele County properties`)
  console.log('')

  const results: PropertyResult[] = []
  const scraper = new TooeleEagleWebScraper()

  try {
    await scraper.init()
    console.log('EagleWeb session initialized')
    console.log('')

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i]
      console.log(`\n[${i + 1}/${properties.length}] Processing: ${prop.parcel_number}`)
      console.log(`  Owner: ${prop.owner_name || 'N/A'}`)
      console.log(`  Address: ${prop.property_address || 'N/A'}`)

      const result: PropertyResult = {
        parcelNumber: prop.parcel_number,
        propertyId: prop.id,
        ownerName: prop.owner_name || undefined,
        address: prop.property_address || undefined,
        success: false
      }

      try {
        const eagleResult = await scraper.searchParcel(prop.parcel_number)

        if (eagleResult) {
          result.success = true
          result.eagleWebResult = eagleResult

          console.log(`  ✅ Records: ${eagleResult.hasRecords ? 'YES' : 'NO'}`)
          console.log(`  📄 Documents: ${eagleResult.rawDocuments.length}`)
          console.log(`  📅 Last Transfer: ${eagleResult.lastTransferDate || 'N/A'} (${eagleResult.lastTransferType || 'N/A'})`)

          if (eagleResult.redFlags.length > 0) {
            console.log(`  🚩 Red Flags: ${eagleResult.redFlags.join(', ')}`)
          }

          // Update database with title signals
          const titleNotes = `EagleWeb: ${eagleResult.rawDocuments.length} docs, Last: ${eagleResult.lastTransferDate || 'N/A'} (${eagleResult.lastTransferType || 'N/A'}), Red flags: ${eagleResult.redFlags.join('; ') || 'None'}`

          await prisma.property.update({
            where: { id: prop.id },
            data: {
              notes: titleNotes,
              // Set title_risk based on findings
              title_risk: eagleResult.redFlags.length > 0 ? 'high' : 'low'
            }
          })

          // Create RedFlag records for any title issues
          for (const flag of eagleResult.redFlags) {
            await prisma.redFlag.create({
              data: {
                property_id: prop.id,
                flag_type: 'title_issue',
                description: flag,
                severity: 'high',
                detected_at: new Date(),
                status: 'open'
              }
            })
          }
        } else {
          result.error = 'Scraper returned null'
          console.log('  ❌ Scraper returned null')
        }
      } catch (error: any) {
        result.error = error.message
        console.log(`  ❌ Error: ${error.message}`)
      }

      results.push(result)

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

  } finally {
    await scraper.close()
  }

  // Generate summary report
  console.log('')
  console.log('='.repeat(80))
  console.log('BATCH PROCESSING COMPLETE')
  console.log('='.repeat(80))
  console.log('')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`Total Properties: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)
  console.log('')

  // Show properties with red flags
  const withRedFlags = successful.filter(r =>
    r.eagleWebResult?.redFlags && r.eagleWebResult.redFlags.length > 0
  )

  if (withRedFlags.length > 0) {
    console.log('--- Properties with Red Flags ---')
    withRedFlags.forEach(r => {
      console.log(`  ${r.parcelNumber}: ${r.eagleWebResult!.redFlags.join(', ')}`)
    })
    console.log('')
  }

  // Show top 10 by last transfer date (most recent first)
  const withTransferDates = successful
    .filter(r => r.eagleWebResult?.lastTransferDate)
    .sort((a, b) => {
      const dateA = new Date(a.eagleWebResult!.lastTransferDate!)
      const dateB = new Date(b.eagleWebResult!.lastTransferDate!)
      return dateB.getTime() - dateA.getTime()
    })

  console.log('--- Recent Transfers (Top 10) ---')
  withTransferDates.slice(0, 10).forEach(r => {
    console.log(`  ${r.parcelNumber}: ${r.eagleWebResult!.lastTransferDate} - ${r.eagleWebResult!.lastTransferType}`)
  })
  console.log('')

  // Show oldest transfers (potential red flags)
  const oldestTransfers = [...withTransferDates]
    .sort((a, b) => {
      const dateA = new Date(a.eagleWebResult!.lastTransferDate!)
      const dateB = new Date(b.eagleWebResult!.lastTransferDate!)
      return dateA.getTime() - dateB.getTime()
    })
    .slice(0, 10)

  console.log('--- Oldest Transfers (Long-term ownership) ---')
  oldestTransfers.forEach(r => {
    console.log(`  ${r.parcelNumber}: ${r.eagleWebResult!.lastTransferDate} - ${r.eagleWebResult!.lastTransferType}`)
  })
  console.log('')

  // Failed properties
  if (failed.length > 0) {
    console.log('--- Failed Properties ---')
    failed.forEach(r => {
      console.log(`  ${r.parcelNumber}: ${r.error}`)
    })
    console.log('')
  }

  console.log('='.repeat(80))

  // Save detailed results to file
  const reportPath = '/tmp/tooele-eagleweb-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nDetailed report saved to: ${reportPath}`)

  // Generate CSV for triage
  const csvPath = '/tmp/tooele-eagleweb-triage.csv'
  const csvHeader = 'Parcel,Owner,Address,Has Records,Last Transfer Date,Last Transfer Type,Documents Count,Red Flags,Error\n'
  const csvRows = results.map(r => {
    const ewr = r.eagleWebResult
    return `"${r.parcelNumber}","${r.ownerName || ''}","${r.address || ''}",${ewr?.hasRecords || false},"${ewr?.lastTransferDate || ''}","${ewr?.lastTransferType || ''}",${ewr?.rawDocuments.length || 0},"${ewr?.redFlags.join('; ') || ''}","${r.error || ''}"`
  }).join('\n')
  fs.writeFileSync(csvPath, csvHeader + csvRows)
  console.log(`CSV triage file saved to: ${csvPath}`)

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('Fatal error:', error)
  await prisma.$disconnect()
  process.exit(1)
})
