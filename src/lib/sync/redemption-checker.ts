/**
 * Redemption Checker - Automated status checking for Utah County properties
 * Scrapes Utah County Land Records to detect if taxes have been paid (redeemed)
 */

import * as cheerio from 'cheerio'
import { prisma } from '@/lib/db'

export interface RedemptionCheckResult {
  parcelNumber: string
  propertyId: string
  status: 'unchanged' | 'redeemed' | 'amount_changed' | 'error'
  previousStatus: string
  newStatus?: string
  previousAmount: number | null
  newAmount: number | null
  message: string
  checkedAt: Date
  landRecordsUrl: string
}

export interface RedemptionCheckSummary {
  totalChecked: number
  redeemed: number
  amountChanged: number
  unchanged: number
  errors: number
  checkedAt: Date
  details: RedemptionCheckResult[]
}

/**
 * Build Utah County Land Records URL from parcel number
 */
export function buildLandRecordsUrl(parcelNumber: string): string {
  const serial = parcelNumber.replace(/:/g, '')
  return `https://www.utahcounty.gov/LandRecords/property.asp?av_serial=${serial}`
}

/**
 * Fetch and parse redemption status from Utah County Land Records
 * Returns the total amount due and any redemption status indicators
 */
export async function fetchRedemptionStatus(
  parcelNumber: string
): Promise<{ amountDue: number | null; isRedeemed: boolean; error?: string }> {
  try {
    const url = buildLandRecordsUrl(parcelNumber)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaxProperty-Utah/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    return parseRedemptionHtml(html)
  } catch (error) {
    console.error(`Failed to fetch redemption status for ${parcelNumber}:`, error)
    return {
      amountDue: null,
      isRedeemed: false,
      error: (error as Error).message
    }
  }
}

/**
 * Parse HTML to extract redemption status
 * Looks for:
 * - Total amount due in tax tables
 * - "REDEEMED" text indicators
 * - Zero balance indicators
 */
function parseRedemptionHtml(html: string): { amountDue: number | null; isRedeemed: boolean } {
  const $ = cheerio.load(html)

  let amountDue: number | null = null
  let isRedeemed = false

  // Check for "REDEEMED" text anywhere on the page
  const pageText = $('body').text().toUpperCase()
  if (pageText.includes('REDEEMED') || pageText.includes('PAID IN FULL')) {
    isRedeemed = true
  }

  // Parse tax history table for total balance due
  $('table').each((_, table) => {
    const $table = $(table)
    const headerText = $table.find('tr:first-child').text()

    if (headerText.includes('Year') && headerText.includes('Balance Due')) {
      // Find the most recent year with a balance
      let totalBalanceDue = 0

      $table.find('tr').slice(1).each((_, row) => {
        const $cells = $(row).find('td')
        if ($cells.length >= 8) {
          const balanceText = $cells.eq(7).text().trim()
          const balance = parseMoney(balanceText)

          // Check year to see if this is recent
          const yearText = $cells.eq(0).text().trim()
          const year = parseInt(yearText)

          if (!isNaN(year) && year >= 2024) {
            totalBalanceDue += balance
          }
        }
      })

      amountDue = totalBalanceDue > 0 ? totalBalanceDue : 0

      // If total balance is 0, property is likely redeemed
      if (totalBalanceDue === 0 && !isRedeemed) {
        isRedeemed = true
      }
    }
  })

  // Also check for "Total Due: $0.00" or similar patterns
  const totalDueMatch = html.match(/Total[^$]*\$[\s,]*([\d,]+\.\d{2})/i)
  if (totalDueMatch) {
    const totalDue = parseMoney(totalDueMatch[0])
    if (totalDue === 0) {
      isRedeemed = true
      amountDue = 0
    }
  }

  return { amountDue, isRedeemed }
}

/**
 * Parse money string to number
 */
function parseMoney(str: string): number {
  const cleaned = str.replace(/[$,\s]/g, '').replace(/\[|\]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Check a single property for redemption status
 */
export async function checkPropertyRedemption(
  property: {
    id: string
    parcel_number: string
    total_amount_due: number | null
    status: string
  }
): Promise<RedemptionCheckResult> {
  const checkedAt = new Date()
  const landRecordsUrl = buildLandRecordsUrl(property.parcel_number)

  const result: RedemptionCheckResult = {
    parcelNumber: property.parcel_number,
    propertyId: property.id,
    status: 'unchanged',
    previousStatus: property.status,
    previousAmount: property.total_amount_due,
    newAmount: null,
    message: '',
    checkedAt,
    landRecordsUrl
  }

  try {
    const { amountDue, isRedeemed, error } = await fetchRedemptionStatus(
      property.parcel_number
    )

    if (error) {
      result.status = 'error'
      result.message = `Error checking status: ${error}`
      return result
    }

    result.newAmount = amountDue

    // Determine new status
    const newStatus = isRedeemed || amountDue === 0 ? 'redeemed' : property.status

    // Check if status changed
    if (newStatus === 'redeemed' && property.status !== 'redeemed') {
      result.status = 'redeemed'
      result.newStatus = 'redeemed'
      result.message = `Property has been REDEEMED. Previous amount: $${property.total_amount_due?.toLocaleString() || 'unknown'}`
    }
    // Check if amount changed significantly (more than $1 difference)
    else if (amountDue !== null && property.total_amount_due !== null) {
      const amountDiff = Math.abs(amountDue - property.total_amount_due)
      if (amountDiff > 1) {
        result.status = 'amount_changed'
        result.message = `Amount changed from $${property.total_amount_due.toLocaleString()} to $${amountDue.toLocaleString()}`
      } else {
        result.message = 'No changes detected'
      }
    } else {
      result.message = 'No changes detected'
    }

    return result
  } catch (error) {
    result.status = 'error'
    result.message = `Unexpected error: ${(error as Error).message}`
    return result
  }
}

/**
 * Update property in database based on redemption check result
 */
export async function updatePropertyFromCheck(
  result: RedemptionCheckResult
): Promise<void> {
  if (result.status === 'error') {
    // Just update the last checked timestamp
    await prisma.property.update({
      where: { id: result.propertyId },
      data: {
        source_last_checked_at: result.checkedAt
      }
    })
    return
  }

  if (result.status === 'redeemed') {
    // Update status to redeemed and record the outcome
    await prisma.$transaction([
      prisma.property.update({
        where: { id: result.propertyId },
        data: {
          status: 'redeemed',
          status_reason: `Redeemed on ${result.checkedAt.toISOString().split('T')[0]}`,
          status_last_verified_at: result.checkedAt,
          source_last_checked_at: result.checkedAt,
          is_active_sale_candidate: false,
          total_amount_due: result.newAmount
        }
      }),
      prisma.outcomeEvent.create({
        data: {
          property_id: result.propertyId,
          event_type: 'redeemed',
          event_date: result.checkedAt.toISOString().split('T')[0],
          details: result.message
        }
      })
    ])
  } else if (result.status === 'amount_changed') {
    // Update amount and timestamp
    await prisma.property.update({
      where: { id: result.propertyId },
      data: {
        total_amount_due: result.newAmount,
        source_last_checked_at: result.checkedAt,
        status_last_verified_at: result.checkedAt
      }
    })
  } else {
    // Just update the checked timestamp
    await prisma.property.update({
      where: { id: result.propertyId },
      data: {
        source_last_checked_at: result.checkedAt,
        status_last_verified_at: result.checkedAt
      }
    })
  }
}

/**
 * Check multiple properties for redemption status
 * Respects rate limits with delay between requests
 */
export async function checkPropertiesRedemption(
  propertyIds?: string[],
  options: { delayMs?: number; updateDatabase?: boolean } = {}
): Promise<RedemptionCheckSummary> {
  const { delayMs = 1000, updateDatabase = true } = options

  // Build query
  const where: { is_seed: boolean; id?: { in: string[] } } = { is_seed: false }
  if (propertyIds && propertyIds.length > 0) {
    where.id = { in: propertyIds }
  }

  // Get properties to check
  const properties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      parcel_number: true,
      total_amount_due: true,
      status: true
    }
  })

  const results: RedemptionCheckResult[] = []
  let redeemed = 0
  let amountChanged = 0
  let unchanged = 0
  let errors = 0

  for (const property of properties) {
    const result = await checkPropertyRedemption(property)
    results.push(result)

    // Update counts
    if (result.status === 'redeemed') redeemed++
    else if (result.status === 'amount_changed') amountChanged++
    else if (result.status === 'error') errors++
    else unchanged++

    // Update database if requested
    if (updateDatabase) {
      await updatePropertyFromCheck(result)
    }

    // Delay between requests to be respectful to the county server
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return {
    totalChecked: properties.length,
    redeemed,
    amountChanged,
    unchanged,
    errors,
    checkedAt: new Date(),
    details: results
  }
}

/**
 * Get properties that haven't been checked recently
 */
export async function getStaleProperties(
  daysStale = 7
): Promise<{ id: string; parcel_number: string; total_amount_due: number | null; status: string }[]> {
  const staleDate = new Date()
  staleDate.setDate(staleDate.getDate() - daysStale)

  return await prisma.property.findMany({
    where: {
      is_seed: false,
      status: {
        not: 'redeemed'
      },
      OR: [
        { source_last_checked_at: { lt: staleDate } },
        { source_last_checked_at: null }
      ]
    },
    select: {
      id: true,
      parcel_number: true,
      total_amount_due: true,
      status: true
    }
  })
}

/**
 * Check only stale properties (not checked in last N days)
 */
export async function checkStaleProperties(
  daysStale = 7,
  options: { updateDatabase?: boolean } = {}
): Promise<RedemptionCheckSummary> {
  const staleProperties = await getStaleProperties(daysStale)

  if (staleProperties.length === 0) {
    return {
      totalChecked: 0,
      redeemed: 0,
      amountChanged: 0,
      unchanged: 0,
      errors: 0,
      checkedAt: new Date(),
      details: []
    }
  }

  return checkPropertiesRedemption(
    staleProperties.map((p) => p.id),
    options
  )
}

/**
 * Get sale date from database or use default
 */
export async function getSaleDate(): Promise<Date | null> {
  // Try to find a property with sale_date
  const property = await prisma.property.findFirst({
    where: { is_seed: false, sale_date: { not: null } },
    select: { sale_date: true }
  })

  if (property?.sale_date) {
    return new Date(property.sale_date)
  }

  // Default: May 21, 2026
  return new Date('2026-05-21')
}

/**
 * Calculate days until sale
 */
export async function getDaysUntilSale(): Promise<number> {
  const saleDate = await getSaleDate()
  if (!saleDate) return 999

  const now = new Date()
  const diffTime = saleDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get properties that need attention (stale data or sale approaching)
 */
export async function getPropertiesNeedingAttention(): Promise<{
  stale: { id: string; parcel_number: string }[]
  saleApproaching: { id: string; parcel_number: string }[]
  daysUntilSale: number
}> {
  const [staleProperties, daysUntilSale] = await Promise.all([
    getStaleProperties(7),
    getDaysUntilSale()
  ])

  // Properties with sale approaching (< 7 days)
  const saleApproaching = daysUntilSale <= 7 && daysUntilSale >= 0
    ? await prisma.property.findMany({
        where: {
          is_seed: false,
          status: { not: 'redeemed' }
        },
        select: { id: true, parcel_number: true },
        take: 10
      })
    : []

  return {
    stale: staleProperties.map((p) => ({ id: p.id, parcel_number: p.parcel_number })),
    saleApproaching: saleApproaching.map((p) => ({ id: p.id, parcel_number: p.parcel_number })),
    daysUntilSale
  }
}
