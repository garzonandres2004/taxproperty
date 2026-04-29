/**
 * Cron API Route - Redemption Check
 * POST /api/cron/redemption-check
 *
 * Triggers a redemption status check for properties.
 * Can be called:
 * - Manually via UI
 * - By a cron job service (Vercel Cron, GitHub Actions, etc.)
 * - With specific property IDs for bulk actions
 *
 * Query Parameters:
 * - mode: 'stale' | 'all' | 'selected' - which properties to check
 * - propertyIds: comma-separated IDs when mode=selected
 * - dryRun: 'true' to preview without updating database
 */

import { NextResponse } from 'next/server'
import {
  checkPropertiesRedemption,
  checkStaleProperties,
  getStaleProperties,
  getDaysUntilSale,
  RedemptionCheckSummary
} from '@/lib/sync/redemption-checker'

// Simple auth check - in production, use proper API key validation
function isAuthorized(request: Request): boolean {
  // Check for a secret header or query param
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret') || request.headers.get('x-cron-secret')

  // In production, compare against env variable
  // For now, allow if no secret is set in env, or if secret matches
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) return true
  return secret === expectedSecret
}

/**
 * POST /api/cron/redemption-check
 * Run redemption check
 */
export async function POST(request: Request) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') || 'stale'
    const propertyIdsParam = url.searchParams.get('propertyIds')
    const dryRun = url.searchParams.get('dryRun') === 'true'

    const propertyIds = propertyIdsParam?.split(',').filter(Boolean)

    let result: RedemptionCheckSummary
    const startTime = Date.now()

    switch (mode) {
      case 'stale':
        // Check only properties not checked in last 7 days
        result = await checkStaleProperties(7, { updateDatabase: !dryRun })
        break

      case 'all':
        // Check all active properties
        result = await checkPropertiesRedemption(undefined, {
          delayMs: 1000,
          updateDatabase: !dryRun
        })
        break

      case 'selected':
        // Check specific property IDs
        if (!propertyIds || propertyIds.length === 0) {
          return NextResponse.json(
            { error: 'No propertyIds provided for selected mode' },
            { status: 400 }
          )
        }
        result = await checkPropertiesRedemption(propertyIds, {
          delayMs: 1000,
          updateDatabase: !dryRun
        })
        break

      default:
        return NextResponse.json(
          { error: `Unknown mode: ${mode}. Use 'stale', 'all', or 'selected'` },
          { status: 400 }
        )
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const daysUntilSale = await getDaysUntilSale()

    return NextResponse.json({
      success: true,
      dryRun,
      mode,
      duration: `${duration}s`,
      daysUntilSale,
      summary: {
        totalChecked: result.totalChecked,
        redeemed: result.redeemed,
        amountChanged: result.amountChanged,
        unchanged: result.unchanged,
        errors: result.errors
      },
      details: dryRun ? result.details : undefined
    })

  } catch (error) {
    console.error('Redemption check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run redemption check',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/redemption-check
 * Get status and stale properties info
 */
export async function GET(request: Request) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const [staleProperties, daysUntilSale] = await Promise.all([
      getStaleProperties(7),
      getDaysUntilSale()
    ])

    // Get last check timestamp from any property
    const lastChecked = await prisma.property.findFirst({
      where: { source_last_checked_at: { not: null } },
      orderBy: { source_last_checked_at: 'desc' },
      select: { source_last_checked_at: true }
    })

    return NextResponse.json({
      success: true,
      status: 'ready',
      daysUntilSale,
      lastCheckedAt: lastChecked?.source_last_checked_at || null,
      staleCount: staleProperties.length,
      staleProperties: staleProperties.slice(0, 10).map(p => ({
        id: p.id,
        parcelNumber: p.parcel_number
      }))
    })

  } catch (error) {
    console.error('Redemption check status error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}

// Need to import prisma at the top
import { prisma } from '@/lib/db'
