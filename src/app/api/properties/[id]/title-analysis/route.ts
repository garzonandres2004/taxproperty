import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scrapeDocumentList, scrapeDocumentDetail } from '@/lib/title/utah-county-scraper'
import { analyzeTitleChain } from '@/lib/title/title-analyzer'

interface RouteParams {
  params: Promise<{ id: string }>
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

    // Only support Utah County for now
    if (property.county !== 'utah') {
      return NextResponse.json(
        { error: 'Title analysis currently only supports Utah County' },
        { status: 400 }
      )
    }

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
