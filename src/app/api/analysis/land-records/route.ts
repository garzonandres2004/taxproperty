import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { batchAnalyzeProperties, RiskAnalysis } from '@/lib/utah-county-scraper'

/**
 * POST /api/analysis/land-records
 * Run Utah County Land Records analysis on properties
 *
 * Query params:
 * - parcelNumbers: comma-separated list (optional, analyzes all if omitted)
 * - dryRun: 'true' to preview without saving (optional)
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const parcelNumbers = url.searchParams.get('parcelNumbers')?.split(',').filter(Boolean)
    const dryRun = url.searchParams.get('dryRun') === 'true'

    // Get properties to analyze
    let properties
    if (parcelNumbers && parcelNumbers.length > 0) {
      properties = await prisma.property.findMany({
        where: {
          parcel_number: { in: parcelNumbers },
          is_seed: false
        },
        select: {
          id: true,
          parcel_number: true,
          total_amount_due: true,
          estimated_market_value: true,
          property_type: true,
          year_built: true,
          building_sqft: true,
          recommendation: true
        }
      })
    } else {
      // Analyze all properties that don't have recent land records analysis
      properties = await prisma.property.findMany({
        where: {
          is_seed: false,
          OR: [
            { notes: { not: { contains: 'Land Records Analysis' } } },
            { notes: null }
          ]
        },
        select: {
          id: true,
          parcel_number: true,
          total_amount_due: true,
          estimated_market_value: true,
          property_type: true,
          year_built: true,
          building_sqft: true,
          recommendation: true
        },
        take: 10 // Limit batch size to avoid overwhelming the county server
      })
    }

    if (properties.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No properties found to analyze'
      })
    }

    // Map properties to scraper format (handling nulls)
    const scraperProperties = properties.map(p => ({
      parcel_number: p.parcel_number,
      total_amount_due: p.total_amount_due || 0,
      estimated_market_value: p.estimated_market_value || 0,
      property_type: p.property_type || 'unknown',
      year_built: p.year_built || 0,
      building_sqft: p.building_sqft || 0
    }))

    // Run analysis
    const startTime = Date.now()
    const results = await batchAnalyzeProperties(scraperProperties)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    // Update database unless dry run
    if (!dryRun) {
      for (const result of results) {
        const property = properties.find(p => p.parcel_number === result.parcelNumber)
        if (property) {
          const note = formatAnalysisNote(result)

          await prisma.property.update({
            where: { id: property.id },
            data: {
              notes: note,
              recommendation: result.recommendation
            }
          })
        }
      }
    }

    // Generate summary
    const summary = {
      total: results.length,
      byRecommendation: {
        bid: results.filter(r => r.recommendation === 'bid').length,
        bid_cautious: results.filter(r => r.recommendation === 'bid_cautious').length,
        research_more: results.filter(r => r.recommendation === 'research_more').length,
        skip: results.filter(r => r.recommendation === 'skip').length
      },
      byRedemptionRisk: {
        low: results.filter(r => r.redemptionRisk === 'low').length,
        medium: results.filter(r => r.redemptionRisk === 'medium').length,
        high: results.filter(r => r.redemptionRisk === 'high').length
      },
      hasPartialPayments: results.filter(r => r.hasPartialPayments).length,
      hasFreshHeirs: results.filter(r => r.hasFreshHeirs).length,
      isCondo: results.filter(r => r.isCondo).length
    }

    return NextResponse.json({
      success: true,
      dryRun,
      duration: `${duration}s`,
      summary,
      results: results.map(r => ({
        parcelNumber: r.parcelNumber,
        propertyAddress: r.propertyAddress,
        totalPayoff: r.totalPayoff,
        marketValue: r.marketValue,
        redemptionRisk: r.redemptionRisk,
        recommendation: r.recommendation,
        maxBid: r.maxBidRecommendation,
        reasoning: r.reasoning,
        hasPartialPayments: r.hasPartialPayments,
        partialPaymentYears: r.partialPaymentYears,
        yearsDelinquent: r.yearsDelinquent,
        hasFreshHeirs: r.hasFreshHeirs,
        isCondo: r.isCondo,
        landRecordsUrl: `https://www.utahcounty.gov/LandRecords/property.asp?av_serial=${r.parcelNumber.replace(/:/g, '')}`
      }))
    })

  } catch (error) {
    console.error('Land records analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to run land records analysis', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analysis/land-records
 * Get analysis results from database
 */
export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      where: {
        is_seed: false,
        notes: { contains: 'Land Records Analysis' }
      },
      select: {
        parcel_number: true,
        property_address: true,
        total_amount_due: true,
        estimated_market_value: true,
        recommendation: true,
        notes: true
      },
      orderBy: { total_amount_due: 'asc' }
    })

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties
    })
  } catch (error) {
    console.error('Error fetching analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis results' },
      { status: 500 }
    )
  }
}

/**
 * Format analysis result into a database note
 */
function formatAnalysisNote(result: RiskAnalysis): string {
  const lines: string[] = []

  lines.push('=== Land Records Analysis ===')
  lines.push(`Redemption Risk: ${result.redemptionRisk.toUpperCase()}`)
  lines.push(`Recommendation: ${result.recommendation.toUpperCase()}`)

  if (result.maxBidRecommendation) {
    lines.push(`Max Bid: $${result.maxBidRecommendation.toLocaleString()}`)
  }

  lines.push('')
  lines.push('Reasoning:')
  result.reasoning.forEach(r => lines.push(`- ${r}`))

  if (result.hasPartialPayments) {
    lines.push('')
    lines.push(`Partial payments in years: ${result.partialPaymentYears.join(', ')}`)
  }

  if (result.yearsDelinquent > 0) {
    lines.push(`Years delinquent: ${result.yearsDelinquent} (${result.delinquentYearsList.join(', ')})`)
  }

  if (result.hasFreshHeirs) {
    lines.push(`Fresh heirs transfer date: ${result.heirTransferDate}`)
  }

  if (result.isCondo) {
    lines.push(`Condo: ${result.condoComplex || 'Yes'}`)
  }

  lines.push('')
  lines.push(`Payment consistency score: ${result.paymentConsistencyScore}/100`)
  lines.push(`Land Records: https://www.utahcounty.gov/LandRecords/property.asp?av_serial=${result.parcelNumber.replace(/:/g, '')}`)

  return lines.join('\n')
}
