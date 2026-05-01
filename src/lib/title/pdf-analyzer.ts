/**
 * PDF Document Analyzer
 * Fetches document data from Utah County BMI document viewer and analyzes content
 * Falls back to HTML parsing since PDF downloads have authentication restrictions
 */

import * as cheerio from 'cheerio'

export interface PDFAnalysisResult {
  documentType: string
  grantor?: string
  grantee?: string
  consideration?: string
  legalDescription?: string
  propertyAddress?: string
  parcelNumber?: string
  keyFindings: string[]
  warnings: string[]
  isComplete: boolean
  rawText: string
  analyzedAt: Date
}

export interface BMIDocumentInfo {
  pdfUrl?: string
  documentNumber?: string
  recordingDate?: string
  documentType?: string
  pageContent?: string
}

/**
 * Fetch the BMI document viewer page and extract information
 * URL format: https://bmiwebdocs.utahcounty.gov/DocView.aspx?DB=DC&Doc=NNNNN-YYYY
 */
export async function fetchBMIDocumentInfo(entry: string, year: string): Promise<BMIDocumentInfo | null> {
  const url = `https://bmiwebdocs.utahcounty.gov/DocView.aspx?DB=DC&Doc=${entry}-${year}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch BMI page: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const info: BMIDocumentInfo = {
      pageContent: html
    }

    // Look for PDF iframe or direct PDF link
    const iframeSrc = $('iframe[src*=".pdf"]').attr('src')
    if (iframeSrc) {
      info.pdfUrl = iframeSrc.startsWith('http') ? iframeSrc : `https://bmiwebdocs.utahcounty.gov${iframeSrc}`
    }

    // Look for direct PDF link
    const pdfLink = $('a[href$=".pdf"]').attr('href')
    if (pdfLink && !info.pdfUrl) {
      info.pdfUrl = pdfLink.startsWith('http') ? pdfLink : `https://bmiwebdocs.utahcounty.gov${pdfLink}`
    }

    // Try to extract document info from page
    const titleText = $('title').text()
    if (titleText) {
      info.documentNumber = `${entry}-${year}`
    }

    return info
  } catch (error) {
    console.error('Error fetching BMI document:', error)
    return null
  }
}

/**
 * Extract text from BMI page HTML
 * Parses the document details shown in the viewer
 */
export async function extractDocumentText(entry: string, year: string): Promise<string | null> {
  const docInfo = await fetchBMIDocumentInfo(entry, year)
  if (!docInfo) return null

  // Try to get text from the page content if available
  if (docInfo.pageContent) {
    const $ = cheerio.load(docInfo.pageContent)

    // Look for document metadata in the page
    const metadata: string[] = []

    // Look for tables with document info
    $('table tr').each((_, row) => {
      const $row = $(row)
      const label = $row.find('td:first-child').text().trim()
      const value = $row.find('td:last-child').text().trim()
      if (label && value && label !== value) {
        metadata.push(`${label}: ${value}`)
      }
    })

    // Look for any visible text that might be document content
    const pageText = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000)

    if (metadata.length > 0) {
      return metadata.join('\n') + '\n\nPage Content:\n' + pageText
    }

    return pageText
  }

  return null
}

/**
 * Analyze document content for key information
 * Uses the document detail page data (which is what we can access)
 */
export async function analyzePDFContent(
  entry: string,
  year: string,
  documentType: string,
  party1: string,
  party2: string
): Promise<PDFAnalysisResult> {
  const keyFindings: string[] = []
  const warnings: string[] = []

  // Get document text from BMI page
  const text = await extractDocumentText(entry, year)
  const normalizedText = (text || '').toUpperCase()

  // Extract consideration amount
  let consideration: string | undefined
  const considerationMatch = text?.match(/\$([\d,]+(?:\.\d{2})?)/)
  if (considerationMatch) {
    consideration = `$${considerationMatch[1]}`
    keyFindings.push(`Consideration: ${consideration}`)
  }

  // Document type analysis
  const grantor = party1
  const grantee = party2

  if (grantor && grantee) {
    keyFindings.push(`Parties: ${grantor} → ${grantee}`)
  }

  // Check document type specific warnings
  if (documentType === 'WD') {
    keyFindings.push('Warranty Deed - full title protection')
  } else if (documentType === 'QCD') {
    warnings.push('Quitclaim Deed - no title warranties')
    keyFindings.push('Quitclaim transfer - verify chain of title')
  } else if (documentType === 'D TR' || documentType === 'TR D') {
    keyFindings.push('Deed of Trust - mortgage instrument')
  } else if (documentType === 'REC') {
    keyFindings.push('Reconveyance - mortgage released')
  }

  // Check for red flags in available text
  const redFlagKeywords = [
    { term: 'LIS PENDENS', warning: 'Lawsuit filed against property' },
    { term: 'IRS LIEN', warning: 'Federal tax lien present' },
    { term: 'FEDERAL TAX LIEN', warning: 'Federal tax lien present' },
    { term: 'MECHANICS LIEN', warning: 'Contractor lien present' },
    { term: 'JUDGMENT', warning: 'Court judgment present' },
    { term: 'PROBATE', warning: 'Probate/estate issue' },
    { term: 'BANKRUPTCY', warning: 'Bankruptcy filing mentioned' },
    { term: 'FORECLOSURE', warning: 'Foreclosure mentioned' },
    { term: 'RESTRAINING ORDER', warning: 'Court order present' }
  ]

  for (const { term, warning } of redFlagKeywords) {
    if (normalizedText.includes(term)) {
      warnings.push(warning)
    }
  }

  // Extract parcel/APN from text
  let parcelNumber: string | undefined
  const parcelPatterns = [
    /APN[\s:]+([\d:]+)/i,
    /PARCEL[\s#:]+([\d:]+)/i,
    /(\d{2}:\d{3}:\d{4})/,
    /SERIAL[\s#:]+([\d:]+)/i
  ]

  for (const pattern of parcelPatterns) {
    const match = text?.match(pattern)
    if (match) {
      parcelNumber = match[1]
      keyFindings.push(`Parcel: ${parcelNumber}`)
      break
    }
  }

  // Check document completeness (we got some text)
  const isComplete = !!(text && text.length > 100)

  return {
    documentType,
    grantor,
    grantee,
    consideration,
    legalDescription: undefined,
    propertyAddress: undefined,
    parcelNumber,
    keyFindings,
    warnings,
    isComplete,
    rawText: (text || '').substring(0, 2000),
    analyzedAt: new Date()
  }
}

/**
 * Complete document analysis pipeline
 * Uses available data (doesn't require PDF download)
 */
export async function analyzeDocumentPDF(
  entry: string,
  year: string,
  documentType: string,
  party1: string = '',
  party2: string = ''
): Promise<PDFAnalysisResult | null> {
  try {
    const analysis = await analyzePDFContent(entry, year, documentType, party1, party2)
    return analysis
  } catch (error) {
    console.error(`Error analyzing document ${entry}-${year}:`, error)
    return null
  }
}

/**
 * Analyze multiple documents for a property
 * Returns analysis for each document plus aggregated findings
 */
export async function analyzePropertyDocuments(
  documents: Array<{ entry: string; year: string; type: string; party1?: string; party2?: string }>,
  maxDocuments = 5
): Promise<{
  analyses: Array<{ entry: string; year: string; analysis: PDFAnalysisResult | null }>
  aggregatedWarnings: string[]
  hasCriticalIssues: boolean
}> {
  const analyses: Array<{ entry: string; year: string; analysis: PDFAnalysisResult | null }> = []
  const allWarnings = new Set<string>()
  let hasCriticalIssues = false

  // Limit to most recent documents
  const docsToAnalyze = documents.slice(0, maxDocuments)

  for (const doc of docsToAnalyze) {
    const analysis = await analyzeDocumentPDF(
      doc.entry,
      doc.year,
      doc.type,
      doc.party1 || '',
      doc.party2 || ''
    )

    if (analysis) {
      analyses.push({
        entry: doc.entry,
        year: doc.year,
        analysis
      })

      // Aggregate warnings
      for (const warning of analysis.warnings) {
        allWarnings.add(warning)
        if (warning.includes('Federal') || warning.includes('Lawsuit') || warning.includes('Bankruptcy')) {
          hasCriticalIssues = true
        }
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return {
    analyses,
    aggregatedWarnings: Array.from(allWarnings),
    hasCriticalIssues
  }
}
