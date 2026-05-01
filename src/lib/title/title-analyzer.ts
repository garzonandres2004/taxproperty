/**
 * Title Analysis Engine
 * Analyzes document chain and produces title report with score
 */

import { DocumentRecord } from './utah-county-scraper'
import { classifyDocument, isRedFlag, isPositiveSignal, getRiskAdjustment, DocumentCategory } from './document-classifier'
import { PDFAnalysisResult, analyzePropertyDocuments } from './pdf-analyzer'

export interface OwnershipEvent {
  date: string
  from: string
  to: string
  type: string
  documentRef: string
}

export interface RedFlag {
  type: string
  severity: 'critical' | 'high' | 'medium'
  description: string
  documentRef: string
  date: string
}

export interface YellowFlag {
  type: string
  description: string
  documentRef: string
  date: string
}

export interface GreenFlag {
  type: string
  description: string
  documentRef: string
  date: string
}

export interface Lien {
  type: string
  holder: string
  amount?: string
  date: string
  documentRef: string
  survivesTaxDeed: boolean
}

export interface PDFDocumentAnalysis {
  entry: string
  year: string
  analysis: PDFAnalysisResult | null
}

export interface TitleAnalysis {
  score: number // 0-100
  recommendation: 'clean' | 'caution' | 'danger' | 'avoid'
  summary: string
  redFlags: RedFlag[]
  yellowFlags: YellowFlag[]
  greenFlags: GreenFlag[]
  ownershipChain: OwnershipEvent[]
  activeLiens: Lien[]
  mortgageStatus: 'paid_off' | 'active' | 'unclear'
  lastCleanTransfer: string | null
  yearsSameOwner: number | null
  titleComplexity: 'simple' | 'moderate' | 'complex'
  estimatedQuietTitleCost: number
  recommendedActions: string[]
  documentCount: number
  analyzedAt: Date
  // PDF analysis results
  pdfAnalyses?: PDFDocumentAnalysis[]
  pdfWarnings?: string[]
  hasPDFCriticalIssues?: boolean
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim()

  // Try MM/DD/YYYY format
  const parts = cleaned.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // Try other formats
  const date = new Date(cleaned)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Calculate years between two dates
 */
function yearsBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

/**
 * Analyze title chain from documents
 * Enhanced with optional PDF analysis
 */
export async function analyzeTitleChain(
  documents: DocumentRecord[],
  options?: { analyzePDFs?: boolean; maxPDFs?: number }
): Promise<TitleAnalysis> {
  // Sort documents by date (oldest first for chain analysis)
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = parseDate(a.date)
    const dateB = parseDate(b.date)
    if (!dateA || !dateB) return 0
    return dateA.getTime() - dateB.getTime()
  })

  const redFlags: RedFlag[] = []
  const yellowFlags: YellowFlag[] = []
  const greenFlags: GreenFlag[] = []
  const ownershipChain: OwnershipEvent[] = []
  const activeLiens: Lien[] = []

  let score = 100
  let hasActiveMortgage = false
  let hasReconveyance = false
  let lastCleanTransfer: string | null = null
  let currentOwner = ''
  let oldestTransfer: Date | null = null

  // Track mortgages to see if they're released
  const mortgages = new Map<string, { date: string, released: boolean }>()

  for (const doc of sortedDocs) {
    const classification = classifyDocument(doc.type)
    const riskAdj = getRiskAdjustment(doc.type)

    // Apply risk adjustment to score
    score += riskAdj

    // Track red flags
    if (classification.risk === 'critical') {
      redFlags.push({
        type: classification.name,
        severity: 'critical',
        description: classification.note || `${classification.name} found - major title issue`,
        documentRef: `${doc.entry}-${doc.year}`,
        date: doc.date
      })
    } else if (classification.risk === 'high') {
      redFlags.push({
        type: classification.name,
        severity: 'high',
        description: classification.note || `${classification.name} found - investigate further`,
        documentRef: `${doc.entry}-${doc.year}`,
        date: doc.date
      })
    }

    // Track yellow flags
    if (classification.risk === 'medium') {
      yellowFlags.push({
        type: classification.name,
        description: classification.note || `${classification.name} found`,
        documentRef: `${doc.entry}-${doc.year}`,
        date: doc.date
      })
    }

    // Track positive signals
    if (classification.risk === 'positive') {
      greenFlags.push({
        type: classification.name,
        description: classification.note || `${classification.name} - debt paid off`,
        documentRef: `${doc.entry}-${doc.year}`,
        date: doc.date
      })
    }

    // Build ownership chain
    if (classification.category === 'ownership_transfer') {
      ownershipChain.push({
        date: doc.date,
        from: doc.party1,
        to: doc.party2,
        type: doc.type,
        documentRef: `${doc.entry}-${doc.year}`
      })

      // Track clean transfers (Warranty Deed)
      if (doc.type === 'WD' || doc.type === 'SP WD') {
        lastCleanTransfer = doc.date
      }

      // Track current owner and ownership duration
      currentOwner = doc.party2
      if (!oldestTransfer) {
        const transferDate = parseDate(doc.date)
        if (transferDate) oldestTransfer = transferDate
      }
    }

    // Track mortgages
    if (classification.category === 'mortgage') {
      mortgages.set(`${doc.entry}-${doc.year}`, { date: doc.date, released: false })
      hasActiveMortgage = true
    }

    // Track mortgage releases
    if (classification.category === 'lien_release') {
      hasReconveyance = true
      // Mark any recent mortgage as released
      mortgages.forEach((mortgage, key) => {
        if (!mortgage.released) {
          mortgage.released = true
        }
      })
    }

    // Track federal liens (may survive tax deed)
    if (classification.category === 'federal_lien') {
      activeLiens.push({
        type: classification.name,
        holder: 'US Government / IRS',
        date: doc.date,
        documentRef: `${doc.entry}-${doc.year}`,
        survivesTaxDeed: true
      })
    }

    // Track other liens (state/local liens - federal already tracked above)
    if (classification.category === 'lien') {
      activeLiens.push({
        type: classification.name,
        holder: doc.party1,
        date: doc.date,
        documentRef: `${doc.entry}-${doc.year}`,
        survivesTaxDeed: false // Most state liens wiped by tax deed
      })
    }
  }

  // Calculate years same owner
  let yearsSameOwner: number | null = null
  if (oldestTransfer && currentOwner) {
    yearsSameOwner = yearsBetween(oldestTransfer, new Date())
  }

  // Determine mortgage status
  const hasUnreleasedMortgage = Array.from(mortgages.values()).some(m => !m.released)
  const mortgageStatus: 'paid_off' | 'active' | 'unclear' =
    hasReconveyance && !hasUnreleasedMortgage ? 'paid_off' :
    hasActiveMortgage && hasReconveyance ? 'paid_off' :
    hasUnreleasedMortgage ? 'active' : 'unclear'

  // Determine title complexity
  const docCount = documents.length
  const uniqueCategories = new Set(documents.map(d => classifyDocument(d.type).category))
  const titleComplexity: 'simple' | 'moderate' | 'complex' =
    docCount <= 5 && uniqueCategories.size <= 3 ? 'simple' :
    docCount <= 15 && uniqueCategories.size <= 6 ? 'moderate' :
    'complex'

  // Calculate quiet title cost estimate
  const baseCost = 1500
  const complexityMultiplier =
    titleComplexity === 'simple' ? 1 :
    titleComplexity === 'moderate' ? 1.5 :
    2.5
  const redFlagMultiplier = redFlags.filter(f => f.severity === 'critical').length > 0 ? 2 : 1
  const estimatedQuietTitleCost = Math.round(baseCost * complexityMultiplier * redFlagMultiplier)

  // PDF Analysis (if enabled)
  let pdfAnalyses: PDFDocumentAnalysis[] | undefined
  let pdfWarnings: string[] | undefined
  let hasPDFCriticalIssues = false

  if (options?.analyzePDFs) {
    const pdfDocs = documents.map(d => ({
      entry: d.entry,
      year: d.year,
      type: d.type,
      party1: d.party1,
      party2: d.party2
    }))
    const pdfResults = await analyzePropertyDocuments(pdfDocs, options.maxPDFs || 5)

    pdfAnalyses = pdfResults.analyses
    pdfWarnings = pdfResults.aggregatedWarnings
    hasPDFCriticalIssues = pdfResults.hasCriticalIssues

    // Adjust score based on PDF findings
    if (hasPDFCriticalIssues) {
      score -= 30
      redFlags.push({
        type: 'PDF_CRITICAL_ISSUE',
        severity: 'critical',
        description: 'Critical issues found in actual document review',
        documentRef: 'PDF_ANALYSIS',
        date: new Date().toISOString()
      })
    }

    if (pdfWarnings && pdfWarnings.length > 0) {
      score -= (pdfWarnings.length * 5)
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  // Determine recommendation
  const hasCritical = redFlags.some(f => f.severity === 'critical')
  const hasHighRisk = redFlags.some(f => f.severity === 'high')

  let recommendation: 'clean' | 'caution' | 'danger' | 'avoid'
  if (hasCritical) {
    recommendation = 'avoid'
  } else if (hasHighRisk || score < 50) {
    recommendation = 'danger'
  } else if (score < 75 || yellowFlags.length > 2) {
    recommendation = 'caution'
  } else {
    recommendation = 'clean'
  }

  // Generate summary
  const summary = generateSummary(
    recommendation,
    currentOwner,
    yearsSameOwner,
    mortgageStatus,
    redFlags.length,
    yellowFlags.length,
    greenFlags.length,
    options?.analyzePDFs ? pdfAnalyses?.length : undefined
  )

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(
    redFlags,
    yellowFlags,
    activeLiens,
    titleComplexity,
    pdfWarnings
  )

  return {
    score,
    recommendation,
    summary,
    redFlags,
    yellowFlags,
    greenFlags,
    ownershipChain,
    activeLiens,
    mortgageStatus,
    lastCleanTransfer,
    yearsSameOwner,
    titleComplexity,
    estimatedQuietTitleCost,
    recommendedActions,
    documentCount: documents.length,
    analyzedAt: new Date(),
    pdfAnalyses,
    pdfWarnings,
    hasPDFCriticalIssues
  }
}

/**
 * Generate plain English summary
 */
function generateSummary(
  recommendation: string,
  currentOwner: string,
  yearsSameOwner: number | null,
  mortgageStatus: string,
  redCount: number,
  yellowCount: number,
  greenCount: number,
  pdfCount?: number
): string {
  const parts: string[] = []

  // Base status
  switch (recommendation) {
    case 'clean':
      parts.push('Title appears clear with minimal red flags.')
      break
    case 'caution':
      parts.push('Title has some issues requiring investigation.')
      break
    case 'danger':
      parts.push('Title has significant issues - proceed with extreme caution.')
      break
    case 'avoid':
      parts.push('Title has critical issues - recommend avoiding this property.')
      break
  }

  // Ownership info
  if (yearsSameOwner && yearsSameOwner > 10) {
    parts.push(`Long-term ownership (${yearsSameOwner} years) is a positive signal.`)
  } else if (yearsSameOwner && yearsSameOwner < 2) {
    parts.push('Recent ownership change may indicate issues.')
  }

  // Mortgage status
  if (mortgageStatus === 'paid_off') {
    parts.push('Mortgages appear to be paid off.')
  } else if (mortgageStatus === 'active') {
    parts.push('Active mortgage may exist - verify lien status.')
  }

  // Flag summary
  if (redCount > 0) {
    parts.push(`${redCount} red flag${redCount > 1 ? 's' : ''} identified.`)
  }
  if (yellowCount > 0) {
    parts.push(`${yellowCount} item${yellowCount > 1 ? 's' : ''} require${yellowCount === 1 ? 's' : ''} review.`)
  }
  if (greenCount > 0) {
    parts.push(`${greenCount} positive finding${greenCount > 1 ? 's' : ''}.`)
  }

  // PDF analysis note
  if (pdfCount !== undefined) {
    parts.push(`${pdfCount} documents analyzed from county records.`)
  }

  return parts.join(' ')
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(
  redFlags: RedFlag[],
  yellowFlags: YellowFlag[],
  activeLiens: Lien[],
  complexity: string,
  pdfWarnings?: string[]
): string[] {
  const actions: string[] = []

  // Critical actions
  const criticalFlags = redFlags.filter(f => f.severity === 'critical')
  if (criticalFlags.length > 0) {
    actions.push(`Address ${criticalFlags.length} critical issue(s) before proceeding`)
  }

  // High risk actions
  const highFlags = redFlags.filter(f => f.severity === 'high')
  if (highFlags.length > 0) {
    actions.push(`Investigate ${highFlags.length} high-risk item(s)`)
  }

  // Federal lien check
  const federalLiens = activeLiens.filter(l => l.survivesTaxDeed)
  if (federalLiens.length > 0) {
    actions.push('Verify federal lien status - may require IRS release')
  }

  // PDF warnings
  if (pdfWarnings && pdfWarnings.length > 0) {
    actions.push(`Review ${pdfWarnings.length} warning(s) from document analysis`)
  }

  // Complexity-based actions
  if (complexity === 'complex') {
    actions.push('Consider professional title review due to complex history')
  }

  // Yellow flag review
  if (yellowFlags.length > 0) {
    actions.push(`Review ${yellowFlags.length} flagged document(s)`)
  }

  // Standard recommendations
  if (actions.length === 0) {
    actions.push('Title appears clean - standard due diligence recommended')
    actions.push('Verify no unrecorded liens or encumbrances')
  }

  actions.push('Obtain title insurance policy before closing')

  return actions
}
