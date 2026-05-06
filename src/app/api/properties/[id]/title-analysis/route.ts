import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scrapeDocumentList, scrapeDocumentDetail } from '@/lib/title/utah-county-scraper'
import { analyzeTitleChain } from '@/lib/title/title-analyzer'

// Supported counties and their scraper types
const TITLE_SCRAPER_SUPPORTED = ['utah', 'tooele', 'rich']

// Type for scraper results
type ScraperResult = {
  hasRecords: boolean
  documentCount5yr: number
  lastTransferDate?: string
  lastTransferType?: string
  mortgageDocsFound: number
  lienDocsFound: number
  releaseDocsFound: number
  redFlags: string[]
  yellowFlags: string[]
  rawDocuments: any[]
}

// Convert scraper result to a TitleAnalysis-compatible record
function synthesizeTitleAnalysis(result: ScraperResult, county: string) {
  const netLiens = result.lienDocsFound - result.releaseDocsFound
  const hasActiveMortgage = result.mortgageDocsFound > result.releaseDocsFound

  let score = 75
  let recommendation: 'clean' | 'caution' | 'danger' | 'avoid' = 'clean'

  if (result.redFlags.length > 0) { score -= 30; recommendation = 'danger' }
  else if (netLiens > 1) { score -= 25; recommendation = 'danger' }
  else if (netLiens > 0 || hasActiveMortgage) { score -= 15; recommendation = 'caution' }
  else if (!result.hasRecords) { score += 15; recommendation = 'clean' }

  const yellowPenalty = Math.min(result.yellowFlags.length * 5, 15)
  score = Math.max(0, Math.min(100, score - yellowPenalty))

  if (score >= 70) recommendation = 'clean'
  else if (score >= 50) recommendation = 'caution'
  else if (score >= 30) recommendation = 'danger'
  else recommendation = 'avoid'

  const mortgageStatus: 'paid_off' | 'active' | 'unclear' =
    result.mortgageDocsFound === 0 ? 'paid_off'
    : result.mortgageDocsFound <= result.releaseDocsFound ? 'paid_off'
    : 'active'

  const titleComplexity: 'simple' | 'moderate' | 'complex' =
    result.rawDocuments.length === 0 ? 'simple'
    : result.rawDocuments.length <= 3 ? 'simple'
    : result.rawDocuments.length <= 8 ? 'moderate'
    : 'complex'

  const summaryParts: string[] = []
  if (!result.hasRecords) {
    summaryParts.push(`No recorded documents found in ${county} County index — title appears clean by absence of record.`)
  } else {
    summaryParts.push(`${result.rawDocuments.length} document(s) found in recorder index.`)
    if (result.lastTransferType) summaryParts.push(`Last recorded instrument: ${result.lastTransferType}.`)
    if (netLiens > 0) summaryParts.push(`${netLiens} potentially unreleased lien(s).`)
    if (mortgageStatus === 'paid_off' && result.mortgageDocsFound > 0) summaryParts.push('Mortgage/deed of trust appears paid off.')
  }
  if (result.redFlags.length > 0) summaryParts.push(`Red flags: ${result.redFlags.join('; ')}.`)

  return {
    score,
    recommendation,
    summary: summaryParts.join(' '),
    redFlags: result.redFlags.map(f => ({ description: f, severity: 'high' })),
    yellowFlags: result.yellowFlags.map(f => ({ description: f })),
    greenFlags: !result.hasRecords ? [{ description: 'No encumbrances found in recorder index' }]
      : result.lienDocsFound <= result.releaseDocsFound ? [{ description: 'Liens appear released' }] : [],
    ownershipChain: result.rawDocuments.map(d => ({
      date: d.date,
      docType: d.docType,
      grantor: d.grantor || '',
      grantee: d.grantee || '',
    })),
    activeLiens: netLiens > 0 ? [{ description: `${netLiens} unreleased lien(s) in recorder index` }] : [],
    mortgageStatus,
    yearsSameOwner: null,
    titleComplexity,
    estimatedQuietTitleCost: null,
    recommendedActions: result.redFlags.length > 0
      ? ['Obtain full title search before bidding', 'Consult title company about identified red flags']
      : ['Confirm no off-index encumbrances with county recorder'],
    hasPDFCriticalIssues: false,
    pdfAnalyses: null,
    pdfWarnings: null,
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// Load scrapers dynamically (server-only, playwright not available in production)
async function loadScrapers() {
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  try {
    const [{ scrapeTooeleEagleWeb }, { scrapeRichCounty, saveRichTitleSignals }] = await Promise.all([
      import('@/lib/title/scrapers/tooele-eagleweb'),
      import('@/lib/title/scrapers/rich-county')
    ])
    return { scrapeTooeleEagleWeb, scrapeRichCounty, saveRichTitleSignals }
  } catch (error) {
    console.error('Failed to load scrapers:', error)
    return null
  }
}

/**
 * POST /api/properties/[id]/title-analysis
 * Run automated title analysis on a property
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get property
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        parcel_number: true,
        county: true,
        property_address: true,
        owner_name: true,
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // ── Non-Utah counties: dispatch to county-specific scrapers ─────────────
    if (property.county === 'tooele' || property.county === 'rich') {
      const scrapers = await loadScrapers()
      if (!scrapers) {
        return NextResponse.json({
          error: `${property.county} scraper not available in production. Use local development for title scraping.`
        }, { status: 503 })
      }

      if (property.county === 'tooele') {
        const result = await scrapers.scrapeTooeleEagleWeb(property.parcel_number)
        if (!result) {
          return NextResponse.json({ error: 'Tooele EagleWeb scraper returned no data' }, { status: 502 })
        }
        const analysis = synthesizeTitleAnalysis(result, 'Tooele')
        const saved = await prisma.titleAnalysis.upsert({
          where: { property_id: id },
          create: { property_id: id, ...analysis,
            redFlags: JSON.stringify(analysis.redFlags), yellowFlags: JSON.stringify(analysis.yellowFlags),
            greenFlags: JSON.stringify(analysis.greenFlags), ownershipChain: JSON.stringify(analysis.ownershipChain),
            activeLiens: JSON.stringify(analysis.activeLiens), recommendedActions: JSON.stringify(analysis.recommendedActions),
            rawDocuments: JSON.stringify(result.rawDocuments.slice(0, 20)), analyzedAt: new Date() },
          update: { ...analysis,
            redFlags: JSON.stringify(analysis.redFlags), yellowFlags: JSON.stringify(analysis.yellowFlags),
            greenFlags: JSON.stringify(analysis.greenFlags), ownershipChain: JSON.stringify(analysis.ownershipChain),
            activeLiens: JSON.stringify(analysis.activeLiens), recommendedActions: JSON.stringify(analysis.recommendedActions),
            rawDocuments: JSON.stringify(result.rawDocuments.slice(0, 20)), analyzedAt: new Date() },
        })
        return NextResponse.json({ success: true, analysis: { ...analysis, id: saved.id, propertyId: id }, documentsScraped: result.rawDocuments.length })
      }

      if (property.county === 'rich') {
        const result = await scrapers.scrapeRichCounty(property.parcel_number)
        if (!result) {
          return NextResponse.json({ error: 'Rich County recorder scraper returned no data' }, { status: 502 })
        }
        await scrapers.saveRichTitleSignals(prisma, id, result)
        const analysis = synthesizeTitleAnalysis(result, 'Rich')
        const saved = await prisma.titleAnalysis.upsert({
          where: { property_id: id },
          create: { property_id: id, ...analysis,
            redFlags: JSON.stringify(analysis.redFlags), yellowFlags: JSON.stringify(analysis.yellowFlags),
            greenFlags: JSON.stringify(analysis.greenFlags), ownershipChain: JSON.stringify(analysis.ownershipChain),
            activeLiens: JSON.stringify(analysis.activeLiens), recommendedActions: JSON.stringify(analysis.recommendedActions),
            rawDocuments: JSON.stringify(result.rawDocuments.slice(0, 20)), analyzedAt: new Date() },
          update: { ...analysis,
            redFlags: JSON.stringify(analysis.redFlags), yellowFlags: JSON.stringify(analysis.yellowFlags),
            greenFlags: JSON.stringify(analysis.greenFlags), ownershipChain: JSON.stringify(analysis.ownershipChain),
            activeLiens: JSON.stringify(analysis.activeLiens), recommendedActions: JSON.stringify(analysis.recommendedActions),
            rawDocuments: JSON.stringify(result.rawDocuments.slice(0, 20)), analyzedAt: new Date() },
        })
        return NextResponse.json({ success: true, analysis: { ...analysis, id: saved.id, propertyId: id }, documentsScraped: result.rawDocuments.length })
      }
    }

    if (property.county !== 'utah') {
      return NextResponse.json(
        { error: `Title analysis is not yet configured for ${property.county} county. Supported: ${TITLE_SCRAPER_SUPPORTED.join(', ')}.` },
        { status: 400 }
      )
    }

    // ── Utah County: existing recorder scraper ───────────────────────────────
    // Scrape documents
    const documents = await scrapeDocumentList(property.parcel_number)

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found for this property' },
        { status: 404 }
      )
    }

    // Fetch details for first few documents (rate limited)
    const documentDetails: Record<string, any> = {}
    const detailLimit = Math.min(documents.length, 10)

    for (let i = 0; i < detailLimit; i++) {
      const doc = documents[i]
      const detail = await scrapeDocumentDetail(doc.entry, doc.year)
      if (detail) {
        documentDetails[`${doc.entry}-${doc.year}`] = detail
      }
      // Rate limit: 300ms between requests
      if (i < detailLimit - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // Parse query params for PDF analysis
    const { searchParams } = new URL(request.url)
    const analyzePDFs = searchParams.get('analyzePDFs') === 'true'

    // Analyze title chain (with optional PDF analysis)
    const analysis = await analyzeTitleChain(documents, {
      analyzePDFs,
      maxPDFs: analyzePDFs ? 5 : 0
    })

    // Save to database
    const savedAnalysis = await prisma.titleAnalysis.upsert({
      where: { property_id: id },
      create: {
        property_id: id,
        score: analysis.score,
        recommendation: analysis.recommendation,
        summary: analysis.summary,
        redFlags: JSON.stringify(analysis.redFlags),
        yellowFlags: JSON.stringify(analysis.yellowFlags),
        greenFlags: JSON.stringify(analysis.greenFlags),
        ownershipChain: JSON.stringify(analysis.ownershipChain),
        activeLiens: JSON.stringify(analysis.activeLiens),
        mortgageStatus: analysis.mortgageStatus,
        yearsSameOwner: analysis.yearsSameOwner,
        titleComplexity: analysis.titleComplexity,
        estimatedQuietTitleCost: analysis.estimatedQuietTitleCost,
        recommendedActions: JSON.stringify(analysis.recommendedActions),
        rawDocuments: JSON.stringify(documents.slice(0, 20).map(d => ({
          entry: d.entry,
          year: d.year,
          type: d.type,
          date: d.date,
          recordedDate: d.recordedDate,
          party1: d.party1?.substring(0, 100),
          party2: d.party2?.substring(0, 100),
          detail: documentDetails[`${d.entry}-${d.year}`] || null
        }))),
        pdfAnalyses: analysis.pdfAnalyses ? JSON.stringify(analysis.pdfAnalyses) : null,
        pdfWarnings: analysis.pdfWarnings ? JSON.stringify(analysis.pdfWarnings) : null,
        hasPDFCriticalIssues: analysis.hasPDFCriticalIssues || false,
        analyzedAt: new Date(),
      },
      update: {
        score: analysis.score,
        recommendation: analysis.recommendation,
        summary: analysis.summary,
        redFlags: JSON.stringify(analysis.redFlags),
        yellowFlags: JSON.stringify(analysis.yellowFlags),
        greenFlags: JSON.stringify(analysis.greenFlags),
        ownershipChain: JSON.stringify(analysis.ownershipChain),
        activeLiens: JSON.stringify(analysis.activeLiens),
        mortgageStatus: analysis.mortgageStatus,
        yearsSameOwner: analysis.yearsSameOwner,
        titleComplexity: analysis.titleComplexity,
        estimatedQuietTitleCost: analysis.estimatedQuietTitleCost,
        recommendedActions: JSON.stringify(analysis.recommendedActions),
        rawDocuments: JSON.stringify(documents.slice(0, 20).map(d => ({
          entry: d.entry,
          year: d.year,
          type: d.type,
          date: d.date,
          recordedDate: d.recordedDate,
          party1: d.party1?.substring(0, 100),
          party2: d.party2?.substring(0, 100),
          detail: documentDetails[`${d.entry}-${d.year}`] || null
        }))),
        pdfAnalyses: analysis.pdfAnalyses ? JSON.stringify(analysis.pdfAnalyses) : null,
        pdfWarnings: analysis.pdfWarnings ? JSON.stringify(analysis.pdfWarnings) : null,
        hasPDFCriticalIssues: analysis.hasPDFCriticalIssues || false,
        analyzedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        id: savedAnalysis.id,
        propertyId: id,
      },
      documentsScraped: documents.length,
      documentsWithDetails: Object.keys(documentDetails).length,
    })

  } catch (error) {
    console.error('Title analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze title', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/properties/[id]/title-analysis
 * Get existing title analysis for a property
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const analysis = await prisma.titleAnalysis.findUnique({
      where: { property_id: id },
    })

    if (!analysis) {
      return NextResponse.json(
        { error: 'No title analysis found. Run POST to create one.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        redFlags: analysis.redFlags ? JSON.parse(analysis.redFlags) : [],
        yellowFlags: analysis.yellowFlags ? JSON.parse(analysis.yellowFlags) : [],
        greenFlags: analysis.greenFlags ? JSON.parse(analysis.greenFlags) : [],
        ownershipChain: analysis.ownershipChain ? JSON.parse(analysis.ownershipChain) : [],
        activeLiens: analysis.activeLiens ? JSON.parse(analysis.activeLiens) : [],
        recommendedActions: analysis.recommendedActions ? JSON.parse(analysis.recommendedActions) : [],
        rawDocuments: analysis.rawDocuments ? JSON.parse(analysis.rawDocuments) : [],
        pdfAnalyses: analysis.pdfAnalyses ? JSON.parse(analysis.pdfAnalyses) : [],
        pdfWarnings: analysis.pdfWarnings ? JSON.parse(analysis.pdfWarnings) : [],
        hasPDFCriticalIssues: analysis.hasPDFCriticalIssues,
      },
    })

  } catch (error) {
    console.error('Get title analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to get title analysis' },
      { status: 500 }
    )
  }
}
