/**
 * Utah County Land Records Scraper
 * Fetches and analyzes property data from Utah County Land Records
 */

import * as cheerio from 'cheerio'

export interface TaxYearData {
  year: number
  generalTaxes: number
  adjustments: number
  netTaxes: number
  fees: number
  payments: number
  taxBalance: number
  balanceDue: number
  taxArea: string
}

export interface DocumentEntry {
  entryNumber: string
  dateRecorded: string
  documentDate: string
  type: string
  party1: string
  party2: string
}

export interface PropertyDetails {
  serialNumber: string
  propertyAddress: string
  mailingAddress: string
  acreage: number
  ownerNames: string[]
  taxHistory: TaxYearData[]
  documents: DocumentEntry[]
  valueHistory: { year: number; value: number }[]
}

export interface RiskAnalysis {
  parcelNumber: string
  propertyAddress: string
  totalPayoff: number
  marketValue: number

  // Risk flags
  hasPartialPayments: boolean
  partialPaymentYears: number[]

  yearsDelinquent: number
  delinquentYearsList: number[]

  hasRecentTransfer: boolean
  recentTransferDate?: string
  transferType?: string

  hasFreshHeirs: boolean
  heirTransferDate?: string

  isCondo: boolean
  condoComplex?: string

  sporadicPaymentPattern: boolean
  paymentConsistencyScore: number // 0-100, higher = more consistent

  // NEW: Owner analysis
  isAbsenteeOwner: boolean
  ownerMailingAddress?: string

  // Recommendation
  redemptionRisk: 'low' | 'medium' | 'high'
  recommendation: 'bid' | 'bid_cautious' | 'research_more' | 'skip'
  reasoning: string[]
  maxBidRecommendation?: number
}

/**
 * Convert parcel number to Utah County serial format
 * e.g., "37:010:0002" -> "370100002"
 */
export function parcelToSerial(parcelNumber: string): string {
  return parcelNumber.replace(/:/g, '')
}

/**
 * Build Utah County Land Records URL
 */
export function buildLandRecordsUrl(parcelNumber: string): string {
  const serial = parcelToSerial(parcelNumber)
  return `https://www.utahcounty.gov/LandRecords/property.asp?av_serial=${serial}`
}

/**
 * Fetch and parse property details from Utah County
 */
export async function fetchPropertyDetails(parcelNumber: string): Promise<PropertyDetails | null> {
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
    return parsePropertyHtml(html, parcelNumber)
  } catch (error) {
    console.error(`Failed to fetch ${parcelNumber}:`, error)
    return null
  }
}

/**
 * Parse HTML from Utah County Land Records
 */
function parsePropertyHtml(html: string, parcelNumber: string): PropertyDetails {
  const $ = cheerio.load(html)

  // Basic property info
  const serialNumber = $('td:contains("Serial Number:")').next().text().trim() || parcelNumber
  const propertyAddress = $('td:contains("Property Address:")').next().text().trim()
  const mailingAddress = $('td:contains("Mailing Address:")').next().text().trim()
  const acreageText = $('td:contains("Acreage:")').next().text().trim()
  const acreage = parseFloat(acreageText) || 0

  // Extract owner names from the owner list
  const ownerNames: string[] = []
  $('a[href*="namesearch.asp"]').each((_, el) => {
    const name = $(el).text().trim()
    if (name && !ownerNames.includes(name)) {
      ownerNames.push(name)
    }
  })

  // Parse tax history table
  const taxHistory: TaxYearData[] = []
  $('table').each((_, table) => {
    const $table = $(table)
    const headerText = $table.find('tr:first-child').text()

    if (headerText.includes('Year') && headerText.includes('General Taxes')) {
      $table.find('tr').slice(1).each((_, row) => {
        const $cells = $(row).find('td')
        if ($cells.length >= 8) {
          const yearText = $cells.eq(0).text().trim()
          const year = parseInt(yearText)
          if (!isNaN(year)) {
            taxHistory.push({
              year,
              generalTaxes: parseMoney($cells.eq(1).text()),
              adjustments: parseMoney($cells.eq(2).text()),
              netTaxes: parseMoney($cells.eq(3).text()),
              fees: parseMoney($cells.eq(4).text()),
              payments: parseMoney($cells.eq(5).text()),
              taxBalance: parseMoney($cells.eq(6).text()),
              balanceDue: parseMoney($cells.eq(7).text()),
              taxArea: $cells.eq(8).text().trim() || ''
            })
          }
        }
      })
    }
  })

  // Parse documents
  const documents: DocumentEntry[] = []
  $('table').each((_, table) => {
    const $table = $(table)
    const headerText = $table.find('tr:first-child').text()

    if (headerText.includes('Entry #') && headerText.includes('Date Recorded')) {
      $table.find('tr').slice(1).each((_, row) => {
        const $cells = $(row).find('td')
        if ($cells.length >= 6) {
          documents.push({
            entryNumber: $cells.eq(0).text().trim(),
            dateRecorded: $cells.eq(1).text().trim(),
            documentDate: $cells.eq(2).text().trim(),
            type: $cells.eq(3).text().trim(),
            party1: $cells.eq(4).text().trim(),
            party2: $cells.eq(5).text().trim()
          })
        }
      })
    }
  })

  // Parse value history
  const valueHistory: { year: number; value: number }[] = []
  // Note: Value history requires a separate page or tab
  // For now, we'll extract what we can from the current page

  return {
    serialNumber,
    propertyAddress,
    mailingAddress,
    acreage,
    ownerNames,
    taxHistory,
    documents,
    valueHistory
  }
}

/**
 * Parse money string to number
 */
function parseMoney(str: string): number {
  const cleaned = str.replace(/[$,\s]/g, '').replace(/\[|\]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Analyze risk factors from property details
 */
export function analyzeRisk(
  parcelNumber: string,
  details: PropertyDetails,
  existingData: {
    totalPayoff: number
    marketValue: number
    propertyType: string
    buildingSqft: number
    yearBuilt: number
  }
): RiskAnalysis {
  const analysis: RiskAnalysis = {
    parcelNumber,
    propertyAddress: details.propertyAddress,
    totalPayoff: existingData.totalPayoff,
    marketValue: existingData.marketValue,

    hasPartialPayments: false,
    partialPaymentYears: [],

    yearsDelinquent: 0,
    delinquentYearsList: [],

    hasRecentTransfer: false,

    hasFreshHeirs: false,

    isCondo: false,

    sporadicPaymentPattern: false,
    paymentConsistencyScore: 100,

    isAbsenteeOwner: false,
    ownerMailingAddress: details.mailingAddress,
    propertyAddress: details.propertyAddress,

    redemptionRisk: 'low',
    recommendation: 'bid',
    reasoning: []
  }

  // ABSENTEE OWNER DETECTION: Compare mailing vs property address
  if (details.mailingAddress && details.propertyAddress) {
    const mailing = details.mailingAddress.toUpperCase().replace(/\s+/g, ' ').replace(/,/g, '')
    const property = details.propertyAddress.toUpperCase().replace(/\s+/g, ' ').replace(/,/g, '')

    // Extract street number from both
    const mailingNum = mailing.match(/(\d+)/)?.[0]
    const propertyNum = property.match(/(\d+)/)?.[0]

    // If street numbers differ or mailing has "PO BOX" / different city, it's absentee
    if (mailingNum && propertyNum && mailingNum !== propertyNum) {
      analysis.isAbsenteeOwner = true
    } else if (mailing.includes('PO BOX') || mailing.includes('PMB')) {
      analysis.isAbsenteeOwner = true
    }
  }

  // Check for condo
  if (details.propertyAddress.toUpperCase().includes('UNIT') ||
      details.propertyAddress.toUpperCase().includes('CONDO') ||
      existingData.propertyType === 'condo') {
    analysis.isCondo = true
    const match = details.propertyAddress.match(/([^,]+)\s+CONDOMINIUMS?/i)
    if (match) {
      analysis.condoComplex = match[1].trim()
    }
  }

  // Analyze tax history for delinquencies and partial payments
  if (details.taxHistory.length > 0) {
    const currentYear = 2026
    const recentYears = details.taxHistory.filter(t => t.year >= currentYear - 10)

    // Find delinquent years (balance due > 0)
    const delinquentYears = recentYears.filter(t => t.balanceDue > 100)
    analysis.yearsDelinquent = delinquentYears.length
    analysis.delinquentYearsList = delinquentYears.map(t => t.year).sort((a, b) => b - a)

    // Find partial payments (small payments made but balance remains)
    const partialPaymentYears = recentYears.filter(t => {
      // Payment made but still has significant balance
      return t.payments > 0 && t.balanceDue > 100 && t.payments < t.netTaxes * 0.5
    })
    analysis.hasPartialPayments = partialPaymentYears.length > 0
    analysis.partialPaymentYears = partialPaymentYears.map(t => t.year)

    // Calculate payment consistency score
    const paidYears = recentYears.filter(t => t.balanceDue < 100).length
    analysis.paymentConsistencyScore = Math.round((paidYears / recentYears.length) * 100)

    // Detect sporadic pattern (paid some years, skipped others)
    const hasSporadicPattern = recentYears.some((t, i) => {
      if (i === 0) return false
      const prevYear = recentYears[i - 1]
      const wasPaid = prevYear.balanceDue < 100
      const isNowDelinquent = t.balanceDue > 100
      return wasPaid && isNowDelinquent
    })
    analysis.sporadicPaymentPattern = hasSporadicPattern
  }

  // Analyze documents for transfers and heirs
  if (details.documents.length > 0) {
    const recentDocs = details.documents.slice(0, 10)

    // Check for recent transfers (last 2 years)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const recentTransfer = recentDocs.find(d => {
      const docDate = new Date(d.dateRecorded)
      const isTransfer = ['QCD', 'WD', 'SUB TEE', 'AF DC', 'TR D'].includes(d.type)
      return docDate > twoYearsAgo && isTransfer
    })

    if (recentTransfer) {
      analysis.hasRecentTransfer = true
      analysis.recentTransferDate = recentTransfer.dateRecorded
      analysis.transferType = recentTransfer.type

      // Check for fresh heirs (AF DC = Affidavit of Death of Co-Trustee)
      if (recentTransfer.type === 'AF DC' ||
          recentTransfer.party1.toUpperCase().includes('DEC') ||
          recentTransfer.party1.toUpperCase().includes('TRUST')) {
        analysis.hasFreshHeirs = true
        analysis.heirTransferDate = recentTransfer.dateRecorded
      }
    }
  }

  // Determine redemption risk
  analysis.redemptionRisk = calculateRedemptionRisk(analysis)

  // Generate recommendation
  const rec = generateRecommendation(analysis, existingData)
  analysis.recommendation = rec.recommendation
  analysis.reasoning = rec.reasoning
  analysis.maxBidRecommendation = rec.maxBid

  return analysis
}

/**
 * Calculate redemption risk based on factors
 */
function calculateRedemptionRisk(analysis: RiskAnalysis): 'low' | 'medium' | 'high' {
  let riskScore = 0

  // Partial payments = owner still engaged = higher redemption risk
  if (analysis.hasPartialPayments) riskScore += 3

  // Fresh heirs = very likely to redeem
  if (analysis.hasFreshHeirs) riskScore += 4

  // Recent transfer (but not death) = medium risk
  if (analysis.hasRecentTransfer && !analysis.hasFreshHeirs) riskScore += 2

  // Few years delinquent = owner might still care
  if (analysis.yearsDelinquent <= 2) riskScore += 1
  if (analysis.yearsDelinquent >= 5) riskScore -= 1

  // Sporadic payments = owner trying but struggling
  if (analysis.sporadicPaymentPattern) riskScore += 2

  // High consistency score = owner usually pays, might redeem
  if (analysis.paymentConsistencyScore > 70) riskScore += 1

  // Absentee owner = lower redemption risk (reduce score)
  if (analysis.isAbsenteeOwner) riskScore -= 1

  if (riskScore >= 4) return 'high'
  if (riskScore >= 2) return 'medium'
  return 'low'
}

/**
 * Generate recommendation based on analysis
 */
function generateRecommendation(
  analysis: RiskAnalysis,
  existingData: { marketValue: number; totalPayoff: number; yearBuilt: number }
): { recommendation: RiskAnalysis['recommendation']; reasoning: string[]; maxBid?: number } {
  const reasoning: string[] = []
  let maxBid: number | undefined

  // High redemption risk cases
  if (analysis.redemptionRisk === 'high') {
    if (analysis.hasFreshHeirs) {
      reasoning.push(`Fresh heirs transferred property on ${analysis.heirTransferDate} - likely to redeem to protect inheritance`)
      return { recommendation: 'skip', reasoning, maxBid: 0 }
    }

    if (analysis.hasPartialPayments) {
      reasoning.push(`Owner making partial payments in years: ${analysis.partialPaymentYears.join(', ')} - still engaged with property`)
      reasoning.push('Treat as interest yield play only')
      maxBid = Math.min(existingData.totalPayoff * 1.1, 5000)
      return { recommendation: 'bid_cautious', reasoning, maxBid }
    }

    reasoning.push('High redemption risk based on payment history and ownership patterns')
    return { recommendation: 'research_more', reasoning }
  }

  // Medium risk
  if (analysis.redemptionRisk === 'medium') {
    reasoning.push('Medium redemption risk - proceed with caution')
    maxBid = Math.min(existingData.totalPayoff * 1.5, 3500)
    return { recommendation: 'bid_cautious', reasoning, maxBid }
  }

  // Low risk - good candidates
  if (analysis.yearsDelinquent >= 4) {
    reasoning.push(`${analysis.yearsDelinquent} years delinquent - owner appears disengaged`)
  }

  if (analysis.isAbsenteeOwner) {
    reasoning.push('Absentee owner (mailing address differs from property) - lower redemption risk')
  }

  if (existingData.marketValue / existingData.totalPayoff > 100) {
    reasoning.push(`Excellent value ratio: $${(existingData.marketValue/1000).toFixed(0)}K value vs $${existingData.totalPayoff.toFixed(0)} payoff`)
  }

  if (analysis.isCondo) {
    reasoning.push(`Condo unit${analysis.condoComplex ? ` in ${analysis.condoComplex}` : ''} - verify HOA status`)
    maxBid = Math.min(existingData.totalPayoff * 1.3, 3000)
    return { recommendation: 'bid_cautious', reasoning, maxBid }
  }

  // Good candidate
  maxBid = Math.min(existingData.totalPayoff * 2, 5000)
  return { recommendation: 'bid', reasoning, maxBid }
}

/**
 * Batch analyze multiple properties
 */
export async function batchAnalyzeProperties(
  properties: { parcel_number: string; total_amount_due: number; estimated_market_value: number; property_type: string; year_built: number; building_sqft: number }[]
): Promise<RiskAnalysis[]> {
  const results: RiskAnalysis[] = []

  for (const prop of properties) {
    console.log(`Analyzing ${prop.parcel_number}...`)

    const details = await fetchPropertyDetails(prop.parcel_number)

    if (details) {
      const analysis = analyzeRisk(prop.parcel_number, details, {
        totalPayoff: prop.total_amount_due,
        marketValue: prop.estimated_market_value,
        propertyType: prop.property_type,
        yearBuilt: prop.year_built,
        buildingSqft: prop.building_sqft
      })

      results.push(analysis)
    }

    // Delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
