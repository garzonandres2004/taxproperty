// Davis County Market Value Scraper
// Uses Playwright to extract property values from county website
// Usage: npx ts-node scripts/davis-market-value-scraper.ts

import { chromium, Browser, Page } from 'playwright'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ScrapingResult {
  parcel_number: string
  property_address?: string
  market_value?: number
  year_built?: number
  acres?: number
  sqft?: number
  status: 'success' | 'not_found' | 'error'
  error?: string
}

async function scrapeDavisProperty(page: Page, parcelNumber: string): Promise<ScrapingResult> {
  const result: ScrapingResult = {
    parcel_number: parcelNumber,
    status: 'error'
  }

  try {
    // Navigate to property search
    await page.goto('https://www.daviscountyutah.gov/property-search', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Wait for search form to load
    await page.waitForSelector('input[type="text"], input[name*="parcel"], input[name*="search"]',
      { timeout: 10000 })

    // Find and fill search input
    const searchInput = await page.locator('input[type="text"]').first()
    await searchInput.fill(parcelNumber)

    // Submit search (look for search button or press Enter)
    const searchButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Search")').first()

    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click()
    } else {
      await searchInput.press('Enter')
    }

    // Wait for results
    await page.waitForTimeout(3000)

    // Check for "no results" message
    const noResults = await page.locator('text=/no results|not found|no matches/i').isVisible().catch(() => false)

    if (noResults) {
      result.status = 'not_found'
      return result
    }

    // Try to extract market value from the page
    // Common patterns for market value display
    const valuePatterns = [
      /market\s*value:?\s*\$?([\d,]+\.?\d*)/i,
      /total\s*value:?\s*\$?([\d,]+\.?\d*)/i,
      /assessed\s*value:?\s*\$?([\d,]+\.?\d*)/i,
      /\$([\d,]+\.?\d*)\s*-?\s*(?:market|total|assessed)/i
    ]

    const pageText = await page.locator('body').textContent() || ''

    for (const pattern of valuePatterns) {
      const match = pageText.match(pattern)
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(value) && value > 1000) {
          result.market_value = value
          break
        }
      }
    }

    // Try to extract address
    const addressMatch = pageText.match(/(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way)\s*,?\s*[\w\s]+)/i)
    if (addressMatch) {
      result.property_address = addressMatch[1].trim()
    }

    // Try to extract year built
    const yearMatch = pageText.match(/(?:year\s*built|built\s*in):?\s*(\d{4})/i)
    if (yearMatch) {
      result.year_built = parseInt(yearMatch[1])
    }

    // Try to extract acres
    const acresMatch = pageText.match(/(\d+\.?\d*)\s*(?:acres?|ac\.?)/i)
    if (acresMatch) {
      result.acres = parseFloat(acresMatch[1])
    }

    // Try to extract sqft
    const sqftMatch = pageText.match(/(\d+,?\d*)\s*(?:sq\.?\s*ft\.?|square\s*feet|sf)/i)
    if (sqftMatch) {
      result.sqft = parseInt(sqftMatch[1].replace(/,/g, ''))
    }

    result.status = result.market_value ? 'success' : 'not_found'

  } catch (error) {
    result.status = 'error'
    result.error = String(error)
  }

  return result
}

async function main() {
  console.log('🏛️  Davis County Market Value Scraper\n')

  // Get properties from database
  const properties = await prisma.property.findMany({
    where: {
      county: 'davis',
      estimated_market_value: null // Only get properties without market value
    },
    select: {
      id: true,
      parcel_number: true,
      property_address: true
    }
  })

  if (properties.length === 0) {
    console.log('✅ All Davis County properties already have market values!')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${properties.length} properties to scrape\n`)

  // Launch browser
  const browser = await chromium.launch({
    headless: true // Set to false to see browser
  })

  const page = await browser.newPage()

  // Set viewport and user agent
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  })

  const results: ScrapingResult[] = []
  let success = 0
  let notFound = 0
  let errors = 0

  // Scrape each property
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    console.log(`[${i + 1}/${properties.length}] Scraping: ${prop.parcel_number}...`)

    const result = await scrapeDavisProperty(page, prop.parcel_number)
    results.push(result)

    if (result.status === 'success') {
      success++
      console.log(`  ✅ Market Value: $${result.market_value?.toLocaleString()}`)

      // Update database
      await prisma.property.update({
        where: { id: prop.id },
        data: {
          estimated_market_value: result.market_value,
          year_built: result.year_built,
          lot_size_sqft: result.acres ? result.acres * 43560 : undefined,
          building_sqft: result.sqft
        }
      })
    } else if (result.status === 'not_found') {
      notFound++
      console.log(`  ⚠️  Property not found on county website`)
    } else {
      errors++
      console.log(`  ❌ Error: ${result.error}`)
    }

    // Random delay between requests (1-3 seconds)
    await page.waitForTimeout(1000 + Math.random() * 2000)
  }

  await browser.close()

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('Scraping Complete!')
  console.log('='.repeat(50))
  console.log(`Total properties: ${properties.length}`)
  console.log(`✅ Success: ${success}`)
  console.log(`⚠️  Not Found: ${notFound}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(50))

  // Show sample results
  if (success > 0) {
    console.log('\nSample results:')
    results
      .filter(r => r.status === 'success')
      .slice(0, 5)
      .forEach(r => {
        console.log(`  ${r.parcel_number}: $${r.market_value?.toLocaleString()}`)
      })
  }

  await prisma.$disconnect()
}

main()
  .catch(async (error) => {
    console.error('Fatal error:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
