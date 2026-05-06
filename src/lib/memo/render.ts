import type { InvestorMemo, MemoScores } from './types'

function fmt$(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function scoreBar(value: number, max: number): string {
  const filled = '█'.repeat(value)
  const empty = '░'.repeat(max - value)
  return `${filled}${empty} ${value}/${max}`
}

function recLabel(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.85) return 'Strong'
  if (pct >= 0.65) return 'Good'
  if (pct >= 0.45) return 'Moderate'
  if (pct >= 0.25) return 'Weak'
  return 'Poor'
}

function recEmoji(rec: string): string {
  const emojis: Record<string, string> = {
    GO: '✅ GO',
    CAUTION: '⚠️ CAUTION',
    RESEARCH: '🔍 RESEARCH',
    AVOID: '⛔ AVOID',
    SKIP: '⏭️ SKIP'
  }
  return emojis[rec] ?? rec
}

function readinessBadge(readiness: string): string {
  const badges: Record<string, string> = {
    LIVE: '',
    NEAR_LIVE: '〔NEAR-LIVE〕',
    PARTIAL: '〔PARTIAL DATA〕',
    PLANNED: '〔NOT ONBOARDED〕'
  }
  return badges[readiness] ?? ''
}

export function renderMemoMarkdown(memo: InvestorMemo): string {
  const { county, parcelId, headline, recommendation, maxBidInclusivePremium, maxBid, scores, keyFacts, good, bad, nextActions, countyReadiness, readinessCaveat, confidenceScore } = memo

  const countyTitle = county.charAt(0).toUpperCase() + county.slice(1)
  const recBadge = recEmoji(recommendation)

  const lines: string[] = []

  // Header
  lines.push(`## ${headline}`)
  lines.push('')

  // Readiness caveat (if not LIVE)
  if (countyReadiness !== 'LIVE' && readinessCaveat) {
    lines.push(`> **County Status:** ${readinessBadge(countyReadiness)} ${readinessCaveat.message}`)
    lines.push(`> **Confidence Impact:** -${readinessCaveat.confidenceAdjustment}% (Current: ${confidenceScore}%)`)
    if (readinessCaveat.dataGaps.length > 0) {
      lines.push(`> **Data Gaps:** ${readinessCaveat.dataGaps.join(', ')}`)
    }
    lines.push('')
  }

  lines.push(`**Recommendation:** ${recBadge}  `)
  lines.push(`**Confidence Score:** ${confidenceScore}%  `)

  // Max Bid Analysis
  if (maxBid.suggestedMaxBid) {
    lines.push(`**Suggested Max Bid:** ${fmt$(maxBid.suggestedMaxBid)}  `)
    lines.push(`**Viability:** ${maxBid.viability.toUpperCase()} — ${maxBid.reasoning}  `)
    if (maxBid.openingBidRatio) {
      lines.push(`**Opening Bid Ratio:** ${(maxBid.openingBidRatio * 100).toFixed(0)}%  `)
    }
  }
  lines.push('')

  // Scores table
  lines.push('### Scores')
  lines.push('')
  lines.push('| Dimension | Score | Signal |')
  lines.push('|-----------|-------|--------|')
  lines.push(`| Equity | ${scoreBar(scores.equity, 4)} | ${recLabel(scores.equity, 4)} |`)
  lines.push(`| Title quality | ${scoreBar(scores.titleRisk, 4)} | ${recLabel(scores.titleRisk, 4)} |`)
  lines.push(`| Ownership recency | ${scoreBar(scores.recency, 3)} | ${recLabel(scores.recency, 3)} |`)
  lines.push(`| Property quality | ${scoreBar(scores.propertyQuality, 4)} | ${recLabel(scores.propertyQuality, 4)} |`)
  lines.push(`| Data completeness | ${scoreBar(scores.dataCompleteness, 3)} | ${recLabel(scores.dataCompleteness, 3)} |`)
  lines.push(`| **Total** | **${scores.total}/18** | — |`)
  lines.push('')

  // Max Bid Formula Breakdown
  if (maxBid.suggestedMaxBid) {
    lines.push('### Max Bid Formula')
    lines.push('')
    lines.push(`\`${maxBid.formula}\``)
    lines.push('')
    lines.push('| Component | Value |')
    lines.push('|-----------|-------|')
    lines.push(`| ARV (After Repair Value) | ${fmt$(maxBid.breakdown.arv)} |`)
    lines.push(`| Quick Sale Price (${maxBid.breakdown.quickSalePercent}% of ARV) | ${fmt$(maxBid.breakdown.arv ? maxBid.breakdown.arv * maxBid.breakdown.quickSalePercent / 100 : null)} |`)
    lines.push(`| Municipal Liens | -${fmt$(maxBid.breakdown.municipalLiens)} |`)
    lines.push(`| Quiet Title Cost | -${fmt$(maxBid.breakdown.quietTitleCost)} |`)
    if (maxBid.breakdown.repairEstimate) {
      lines.push(`| Repair Estimate | -${fmt$(maxBid.breakdown.repairEstimate)} |`)
    }
    if (maxBid.breakdown.desiredProfit) {
      lines.push(`| Desired Profit | -${fmt$(maxBid.breakdown.desiredProfit)} |`)
    }
    if (maxBid.breakdown.buyerPremium > 0) {
      lines.push(`| Buyer's Premium (${maxBid.breakdown.buyerPremium}%) | Adjusted |`)
    }
    lines.push(`| **Suggested Max Bid** | **${fmt$(maxBid.suggestedMaxBid)}** |`)
    lines.push('')
  }

  // Key facts
  lines.push('### Key Facts')
  lines.push('')
  lines.push(`- **County:** ${countyTitle}`)
  lines.push(`- **Parcel:** ${parcelId}`)
  if (keyFacts.owner) lines.push(`- **Owner:** ${keyFacts.owner}`)
  if (keyFacts.subdivision) lines.push(`- **Subdivision:** ${keyFacts.subdivision}`)
  if (keyFacts.acres != null) lines.push(`- **Acres:** ${keyFacts.acres.toFixed(2)}`)
  if (keyFacts.class) lines.push(`- **Class:** ${keyFacts.class}`)
  lines.push(`- **Opening bid:** ${fmt$(keyFacts.openingBid)}`)
  if (keyFacts.buyersPremiumPercent != null) {
    lines.push(`- **Buyer's premium:** ${keyFacts.buyersPremiumPercent}%`)
  }
  lines.push(`- **Est. market value:** ${fmt$(keyFacts.estMarketValue)}`)
  if (keyFacts.locationSummary) lines.push(`- **Location:** ${keyFacts.locationSummary}`)
  lines.push('')

  // Title summary
  lines.push('#### Title Summary')
  if (keyFacts.titleSummary.notes) {
    lines.push(`${keyFacts.titleSummary.notes}`)
  } else {
    lines.push('No title research data available yet.')
  }
  lines.push('')

  // Good
  if (good.length > 0) {
    lines.push('### Good')
    lines.push('')
    for (const b of good) lines.push(`- ${b}`)
    lines.push('')
  }

  // Bad
  if (bad.length > 0) {
    lines.push('### Bad / Watchpoints')
    lines.push('')
    for (const b of bad) lines.push(`- ${b}`)
    lines.push('')
  }

  // Next actions
  if (nextActions.length > 0) {
    lines.push('### Next Actions')
    lines.push('')
    for (let i = 0; i < nextActions.length; i++) {
      lines.push(`${i + 1}. ${nextActions[i]}`)
    }
    lines.push('')
  }

  // Footer with metadata
  lines.push('---')
  lines.push('')
  lines.push(`*Generated: ${new Date(memo._meta.generatedAt).toLocaleString()}*`)
  if (memo._meta.dataSources?.length > 0) {
    lines.push(`*Data Sources: ${memo._meta.dataSources.join(', ')}*`)
  }
  if (memo._meta.analystNotes) {
    lines.push(`*Analyst Notes: ${memo._meta.analystNotes}*`)
  }
  if (memo._meta.investability_v2 != null) {
    lines.push(`*Investability Score: ${memo._meta.investability_v2.toFixed(1)}*`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

export function renderReportMarkdown(memos: InvestorMemo[], county: string, date: string): string {
  const countyTitle = county.charAt(0).toUpperCase() + county.slice(1)
  const sorted = [...memos].sort((a, b) => b.scores.total - a.scores.total)

  const header = [
    `# ${countyTitle} County — Investor Memo Report`,
    `**Generated:** ${date}`,
    `**Properties analyzed:** ${memos.length}`,
    '',
    '## Summary',
    '',
    '| Parcel | Owner | Rec | Score | Equity | Market Value | Opening Bid |',
    '|--------|-------|-----|-------|--------|-------------|-------------|',
    ...sorted.map(m => {
      const eq = fmt$(m.keyFacts.estMarketValue)
      const bid = fmt$(m.keyFacts.openingBid)
      return `| ${m.parcelId} | ${m.keyFacts.owner ?? '—'} | ${m.recommendation} | ${m.scores.total}/18 | ${eq} | ${eq} | ${bid} |`
    }),
    '',
    '---',
    '',
    '## Full Memos',
    '',
  ]

  return header.join('\n') + sorted.map(renderMemoMarkdown).join('\n')
}
