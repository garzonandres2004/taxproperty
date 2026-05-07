import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { ReportData, ReportProperty } from './types'

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  navy:       '#1B2E4B',
  navyLight:  '#243D63',
  gold:       '#C9963A',
  goldLight:  '#F5E6C8',
  white:      '#FFFFFF',
  offWhite:   '#F8F9FA',
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray300:    '#D1D5DB',
  gray500:    '#6B7280',
  gray700:    '#374151',
  gray900:    '#111827',
  green:      '#15803D',
  greenBg:    '#DCFCE7',
  amber:      '#B45309',
  amberBg:    '#FEF3C7',
  red:        '#B91C1C',
  redBg:      '#FEE2E2',
  blue:       '#1D4ED8',
  blueBg:     '#DBEAFE',
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingBottom: 56,
  },

  // Header stripe on every page
  pageHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderBrand: {
    color: C.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  pageHeaderSub: {
    color: C.gold,
    fontSize: 7,
    letterSpacing: 0.5,
  },

  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: C.gray50,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6.5,
    color: C.gray500,
  },

  // Content area
  content: {
    paddingHorizontal: 36,
    paddingTop: 20,
  },

  // ── Cover page ──────────────────────────────────────────────────────────
  coverHero: {
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingTop: 48,
    paddingBottom: 40,
    marginBottom: 0,
  },
  coverEyebrow: {
    color: C.gold,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  coverTitle: {
    color: C.white,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.25,
    marginBottom: 6,
  },
  coverCounty: {
    color: C.gold,
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverMeta: {
    color: '#94A3B8',
    fontSize: 8.5,
    lineHeight: 1.7,
  },

  // Stats bar on cover
  statsBar: {
    flexDirection: 'row',
    backgroundColor: C.goldLight,
    paddingHorizontal: 36,
    paddingVertical: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: C.gold,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 7,
    color: C.gray700,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // Cover body section
  coverBodySection: {
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 9,
    color: C.gray700,
    lineHeight: 1.6,
    marginBottom: 6,
  },

  // Disclaimer box
  disclaimerBox: {
    backgroundColor: C.amberBg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 4,
    padding: 10,
    marginHorizontal: 36,
    marginTop: 8,
  },
  disclaimerTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.amber,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 7,
    color: C.amber,
    lineHeight: 1.5,
  },

  // ── Methodology page ────────────────────────────────────────────────────
  methodSection: {
    marginBottom: 14,
  },
  methodTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  methodText: {
    fontSize: 8.5,
    color: C.gray700,
    lineHeight: 1.65,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 8.5,
    color: C.gold,
    marginRight: 6,
    lineHeight: 1.65,
  },
  bulletText: {
    fontSize: 8.5,
    color: C.gray700,
    lineHeight: 1.65,
    flex: 1,
  },

  // Score legend
  scoreLegendRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  scoreLegendItem: {
    flex: 1,
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  scoreLegendLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  scoreLegendRange: {
    fontSize: 6.5,
  },

  // ── Property card ────────────────────────────────────────────────────────
  propertyCard: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 6,
    overflow: 'hidden',
  },

  propHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propNum: {
    color: C.gold,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  propParcel: {
    color: C.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  propAddress: {
    color: '#94A3B8',
    fontSize: 7.5,
    marginTop: 1,
  },

  // Score badge
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeNum: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  scoreBadgeLabel: {
    fontSize: 5.5,
    color: C.white,
    letterSpacing: 0.5,
  },

  // Financials strip
  financialsStrip: {
    flexDirection: 'row',
    backgroundColor: C.gray50,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  finCell: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: C.gray200,
  },
  finCellLast: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  finValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    marginBottom: 2,
  },
  finLabel: {
    fontSize: 6.5,
    color: C.gray500,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  finHighlight: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
    marginBottom: 2,
  },

  // Property body
  propBody: {
    padding: 14,
  },
  propGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  propCol: {
    flex: 1,
  },
  propFieldLabel: {
    fontSize: 6.5,
    color: C.gray500,
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  propFieldValue: {
    fontSize: 8.5,
    color: C.gray900,
    lineHeight: 1.4,
  },
  propFieldValueMuted: {
    fontSize: 8.5,
    color: C.gray500,
    lineHeight: 1.4,
  },

  // Key facts
  factsSection: {
    marginBottom: 10,
  },
  factsTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },

  // Risk flags
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  flagPill: {
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  flagPillText: {
    fontSize: 6.5,
    color: C.red,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  noFlagPill: {
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  noFlagText: {
    fontSize: 6.5,
    color: C.green,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },

  // Our take
  ourTakeBox: {
    backgroundColor: C.blueBg,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    padding: 8,
    marginBottom: 10,
    borderRadius: 2,
  },
  ourTakeLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  ourTakeText: {
    fontSize: 8,
    color: C.gray700,
    lineHeight: 1.55,
  },

  // Next steps
  nextStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  nextStepDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  nextStepText: {
    fontSize: 7.5,
    color: C.gray700,
  },

  // Recommendation badge
  bucketBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
    marginTop: 2,
  },
  bucketText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },

  // ── Resources page ───────────────────────────────────────────────────────
  resourcesSection: {
    marginBottom: 14,
  },
  resourceLink: {
    fontSize: 8,
    color: C.blue,
    marginBottom: 3,
  },
  resourceLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.gray700,
  },

  // ── Quick Reference Table ────────────────────────────────────────────────
  tblPage: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  tblTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    marginBottom: 2,
  },
  tblSubtitle: {
    fontSize: 8,
    color: C.gray500,
    marginBottom: 12,
  },
  tblHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tblHeaderCell: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tblRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    alignItems: 'center',
  },
  tblRowAlt: {
    backgroundColor: C.gray50,
  },
  tblCell: {
    fontSize: 7.5,
    color: C.gray900,
    lineHeight: 1.3,
  },
  tblCellMuted: {
    fontSize: 7.5,
    color: C.gray500,
    lineHeight: 1.3,
  },
  tblScorePill: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tblScoreText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  tblBucketPill: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tblBucketText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  tblSummaryRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 4,
    gap: 16,
  },
  tblSumStat: {
    alignItems: 'center',
  },
  tblSumVal: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
  },
  tblSumLabel: {
    fontSize: 6.5,
    color: C.gray500,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  // Page break helpers
  pageBreakBefore: {
    break: 'before',
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtAcres(sqft: number | null | undefined): string {
  if (!sqft) return 'N/A'
  const acres = sqft / 43560
  if (acres >= 0.5) return `${acres.toFixed(2)} ac`
  return `${sqft.toLocaleString()} sqft`
}

function fmtType(type: string): string {
  switch (type) {
    case 'single_family': return 'Single-Family Residential'
    case 'condo': return 'Condominium'
    case 'multifamily': return 'Multi-Family'
    case 'vacant_land': return 'Vacant Land'
    case 'commercial': return 'Commercial'
    default: return 'Unknown'
  }
}

function bucketStyle(bucket: string | null): { bg: string; text: string; label: string } {
  switch (bucket) {
    case 'TOP_TARGET':
      return { bg: C.navy, text: C.gold, label: 'TOP TARGET' }
    case 'BID_CANDIDATE':
      return { bg: C.green, text: C.white, label: 'BID CANDIDATE' }
    case 'WATCHLIST':
      return { bg: C.blueBg, text: C.blue, label: 'WATCHLIST' }
    case 'RESEARCH':
      return { bg: C.amberBg, text: C.amber, label: 'RESEARCH' }
    case 'AVOID':
      return { bg: C.redBg, text: C.red, label: 'AVOID' }
    default:
      return { bg: C.gray100, text: C.gray700, label: bucket ?? 'UNSCORED' }
  }
}

function scoreColor(score: number | null): string {
  if (!score) return C.gray500
  if (score >= 70) return '#166534'
  if (score >= 55) return C.green
  if (score >= 40) return C.amber
  return C.red
}

function scoreBg(score: number | null): string {
  if (!score) return C.gray200
  if (score >= 70) return '#14532D'
  if (score >= 55) return C.green
  if (score >= 40) return '#92400E'
  return '#991B1B'
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Column widths (pts) — total usable width after 28pt margins each side ≈ 540pt
const COL = {
  num:    22,
  parcel: 86,
  addr:   136,
  bid:    56,
  value:  66,
  em:     40,
  score:  36,
  bucket: 78,
}

function QuickReferenceTable({ data }: { data: ReportData }) {
  const props = data.properties

  // Summary stats for footer bar
  const bidCandidates = props.filter(p =>
    p.recommendation_bucket === 'TOP_TARGET' || p.recommendation_bucket === 'BID_CANDIDATE'
  ).length
  const totalBid = props.reduce((sum, p) => sum + (p.total_amount_due ?? 0), 0)
  const topEM = Math.max(...props.map(p => p.equity_multiple ?? 0))

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader reportType={`${data.county_display} County · May 2026`} />
      <View style={s.tblPage}>
        <Text style={s.tblTitle}>Quick Reference — All {props.length} Opportunities</Text>
        <Text style={s.tblSubtitle}>
          Ranked by Investability Score · {data.county_display} County · May 2026 Tax Sale
        </Text>

        {/* Column headers */}
        <View style={s.tblHeaderRow}>
          <Text style={[s.tblHeaderCell, { width: COL.num }]}>#</Text>
          <Text style={[s.tblHeaderCell, { width: COL.parcel }]}>Parcel</Text>
          <Text style={[s.tblHeaderCell, { width: COL.addr }]}>Address</Text>
          <Text style={[s.tblHeaderCell, { width: COL.bid, textAlign: 'right' }]}>Bid</Text>
          <Text style={[s.tblHeaderCell, { width: COL.value, textAlign: 'right' }]}>Mkt Value</Text>
          <Text style={[s.tblHeaderCell, { width: COL.em, textAlign: 'center' }]}>Eq. Mult</Text>
          <Text style={[s.tblHeaderCell, { width: COL.score, textAlign: 'center' }]}>Score</Text>
          <Text style={[s.tblHeaderCell, { width: COL.bucket }]}>Rating</Text>
        </View>

        {/* Data rows */}
        {props.map((p, i) => {
          const bStyle = bucketStyle(p.recommendation_bucket)
          const alt = i % 2 === 1
          return (
            <View key={p.parcel_number} style={[s.tblRow, alt ? s.tblRowAlt : {}]}>
              {/* # */}
              <Text style={[s.tblCellMuted, { width: COL.num, fontSize: 7 }]}>{i + 1}</Text>

              {/* Parcel */}
              <Text style={[s.tblCell, { width: COL.parcel, fontFamily: 'Helvetica-Bold', fontSize: 7 }]}>
                {p.parcel_number}
              </Text>

              {/* Address — truncate long values to keep row single-line */}
              <Text
                style={[
                  p.property_address ? s.tblCell : s.tblCellMuted,
                  { width: COL.addr, fontSize: 7.5 },
                ]}
              >
                {(p.property_address || 'No address on record').slice(0, 38)}
              </Text>

              {/* Opening Bid */}
              <Text style={[s.tblCell, { width: COL.bid, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                {p.total_amount_due != null ? '$' + Math.round(p.total_amount_due).toLocaleString() : 'N/A'}
              </Text>

              {/* Market Value */}
              <Text style={[s.tblCell, { width: COL.value, textAlign: 'right' }]}>
                {p.estimated_market_value != null ? '$' + Math.round(p.estimated_market_value).toLocaleString() : '—'}
              </Text>

              {/* Equity Multiple */}
              <Text
                style={[
                  s.tblCell,
                  {
                    width: COL.em,
                    textAlign: 'center',
                    fontFamily: 'Helvetica-Bold',
                    color: (p.equity_multiple ?? 0) >= 5 ? C.green : C.gray700,
                  },
                ]}
              >
                {p.equity_multiple != null ? `${p.equity_multiple.toFixed(1)}x` : '—'}
              </Text>

              {/* Score pill */}
              <View style={{ width: COL.score, alignItems: 'center', justifyContent: 'center' }}>
                <View style={[s.tblScorePill, { backgroundColor: scoreBg(p.investability_score) }]}>
                  <Text style={s.tblScoreText}>
                    {p.investability_score != null ? Math.round(p.investability_score) : '—'}
                  </Text>
                </View>
              </View>

              {/* Rating badge */}
              <View style={{ width: COL.bucket, justifyContent: 'center' }}>
                <View style={[s.tblBucketPill, { backgroundColor: bStyle.bg }]}>
                  <Text style={[s.tblBucketText, { color: bStyle.text }]}>{bStyle.label}</Text>
                </View>
              </View>
            </View>
          )
        })}

        {/* Summary footer bar */}
        <View style={[s.tblSummaryRow, { marginTop: 12, borderTopWidth: 1.5, borderTopColor: C.navy, paddingTop: 10 }]}>
          <View style={s.tblSumStat}>
            <Text style={s.tblSumVal}>{props.length}</Text>
            <Text style={s.tblSumLabel}>TOTAL OPPORTUNITIES</Text>
          </View>
          <View style={s.tblSumStat}>
            <Text style={[s.tblSumVal, { color: C.green }]}>{bidCandidates}</Text>
            <Text style={s.tblSumLabel}>BID CANDIDATE+</Text>
          </View>
          <View style={s.tblSumStat}>
            <Text style={s.tblSumVal}>${Math.round(totalBid).toLocaleString()}</Text>
            <Text style={s.tblSumLabel}>TOTAL CAPITAL REQUIRED</Text>
          </View>
          <View style={s.tblSumStat}>
            <Text style={[s.tblSumVal, { color: C.green }]}>{topEM > 0 ? `${topEM.toFixed(1)}x` : 'N/A'}</Text>
            <Text style={s.tblSumLabel}>TOP EQUITY MULTIPLE</Text>
          </View>
          <View style={[s.tblSumStat, { flex: 1 }]}>
            <Text style={[s.tblCellMuted, { fontSize: 6.5, lineHeight: 1.5 }]}>
              Detailed profiles with key facts, risk flags, and due diligence steps appear in pages 4+.
              {'\n'}Equity multiple = assessed market value ÷ opening bid.
            </Text>
          </View>
        </View>
      </View>
      <PageFooter />
    </Page>
  )
}

function PageHeader({ reportType }: { reportType: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderBrand}>UTAH TAX SALE RESEARCH</Text>
      <Text style={s.pageHeaderSub}>{reportType} — CONFIDENTIAL</Text>
    </View>
  )
}

function PageFooter({ disclaimer }: { disclaimer?: boolean }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.footerText}>
        {disclaimer
          ? 'This report is for informational purposes only. Not legal or financial advice. Verify all data independently.'
          : 'Utah Tax Sale Research  •  May 2026 Auction Series'}
      </Text>
      <Text style={s.footerText} render={({ pageNumber }) => `Page ${pageNumber}`} />
    </View>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>▸</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

function PropertyCard({ prop, index }: { prop: ReportProperty; index: number }) {
  const bStyle = bucketStyle(prop.recommendation_bucket)
  const score = prop.investability_score
  const em = prop.equity_multiple
  const hasCoords = prop.latitude && prop.longitude

  return (
    <View style={s.propertyCard} wrap={false}>
      {/* Header */}
      <View style={s.propHeader}>
        <View style={s.propHeaderLeft}>
          <View>
            <Text style={s.propNum}>PROPERTY #{index + 1}</Text>
            <Text style={s.propParcel}>{prop.parcel_number}</Text>
            <Text style={s.propAddress}>
              {prop.property_address || 'No address on record'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Bucket badge */}
          <View style={[s.bucketBadge, { backgroundColor: bStyle.bg }]}>
            <Text style={[s.bucketText, { color: bStyle.text }]}>{bStyle.label}</Text>
          </View>
          {/* Score badge */}
          <View style={[s.scoreBadge, { backgroundColor: scoreBg(score) }]}>
            <Text style={s.scoreBadgeNum}>{score != null ? Math.round(score) : '—'}</Text>
            <Text style={s.scoreBadgeLabel}>SCORE</Text>
          </View>
        </View>
      </View>

      {/* Financials strip */}
      <View style={s.financialsStrip}>
        <View style={s.finCell}>
          <Text style={s.finValue}>{fmt$(prop.total_amount_due)}</Text>
          <Text style={s.finLabel}>OPENING BID</Text>
        </View>
        <View style={s.finCell}>
          <Text style={s.finValue}>{fmt$(prop.estimated_market_value)}</Text>
          <Text style={s.finLabel}>ASSESSED MARKET VALUE</Text>
        </View>
        <View style={s.finCell}>
          <Text style={em && em > 0 ? s.finHighlight : s.finValue}>
            {em ? `${em.toFixed(1)}x` : 'N/A'}
          </Text>
          <Text style={s.finLabel}>EQUITY MULTIPLE</Text>
        </View>
        <View style={s.finCellLast}>
          <Text style={s.finValue}>{fmtAcres(prop.lot_size_sqft)}</Text>
          <Text style={s.finLabel}>LOT SIZE</Text>
        </View>
      </View>

      {/* Body */}
      <View style={s.propBody}>
        {/* Location + Owner + Property details grid */}
        <View style={s.propGrid}>
          <View style={s.propCol}>
            <Text style={s.propFieldLabel}>Location</Text>
            <Text style={prop.property_address ? s.propFieldValue : s.propFieldValueMuted}>
              {prop.property_address || 'No address on record'}
            </Text>
            <Text style={s.propFieldValue}>{formatCounty(prop.county)} County, UT</Text>
            {hasCoords && (
              <Text style={[s.propFieldValue, { fontSize: 7, color: C.gray500, marginTop: 2 }]}>
                {prop.latitude?.toFixed(5)}, {prop.longitude?.toFixed(5)}
              </Text>
            )}
          </View>
          <View style={s.propCol}>
            <Text style={s.propFieldLabel}>Owner of Record</Text>
            <Text style={prop.owner_name ? s.propFieldValue : s.propFieldValueMuted}>
              {prop.owner_name || 'Not on record'}
            </Text>
            {prop.absentee_owner && (
              <Text style={[s.propFieldValue, { fontSize: 7, color: C.amber, marginTop: 2 }]}>
                ⚠ Absentee owner
              </Text>
            )}
          </View>
          <View style={s.propCol}>
            <Text style={s.propFieldLabel}>Property Type</Text>
            <Text style={s.propFieldValue}>{fmtType(prop.property_type)}</Text>
            {prop.building_sqft ? (
              <Text style={[s.propFieldValue, { color: C.gray500 }]}>
                {prop.building_sqft.toLocaleString()} sqft{prop.year_built ? ` · Built ${prop.year_built}` : ''}
              </Text>
            ) : null}
          </View>
          <View style={s.propCol}>
            <Text style={s.propFieldLabel}>Score Breakdown</Text>
            <Text style={[s.propFieldValue, { fontSize: 7.5 }]}>
              Opp: {prop.opportunity_score_v2 ?? '—'}  ·  Risk: {prop.risk_score_v2 ?? '—'}
            </Text>
            <Text style={[s.propFieldValue, { fontSize: 7.5 }]}>
              Title: {prop.title_score_v2 ?? '—'}  ·  Conf: {prop.confidence_score_v2 ?? '—'}
            </Text>
          </View>
        </View>

        {/* Key Facts */}
        <View style={s.factsSection}>
          <Text style={s.factsTitle}>Key Facts</Text>
          {prop.key_facts.map((fact, i) => (
            <Bullet key={i} text={fact} />
          ))}
        </View>

        {/* Risk Flags */}
        <Text style={[s.factsTitle, { marginBottom: 5 }]}>Risk Flags</Text>
        <View style={s.flagsRow}>
          {prop.risk_flags.length === 0 ? (
            <View style={s.noFlagPill}>
              <Text style={s.noFlagText}>NO FLAGS IDENTIFIED</Text>
            </View>
          ) : (
            prop.risk_flags.map((flag, i) => (
              <View key={i} style={s.flagPill}>
                <Text style={s.flagPillText}>{flag}</Text>
              </View>
            ))
          )}
        </View>

        {/* Our Take */}
        <View style={s.ourTakeBox}>
          <Text style={s.ourTakeLabel}>Our Take</Text>
          <Text style={s.ourTakeText}>{prop.our_take}</Text>
        </View>

        {/* Next Steps */}
        <Text style={[s.factsTitle, { marginBottom: 5 }]}>Next Steps</Text>
        <View style={s.nextStepsRow}>
          {[
            `Verify title at ${formatCounty(prop.county)} County Recorder`,
            'Street View + in-person condition check',
            'Run comps (CMA) within 0.5 miles',
            prop.county_source_url ? 'Review original listing (PublicSurplus)' : 'Register for auction',
            'Check for liens at county treasurer',
          ].map((step, i) => (
            <View key={i} style={[s.nextStep, { width: '48%' }]}>
              <View style={s.nextStepDot} />
              <Text style={s.nextStepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function formatCounty(county: string): string {
  return county.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Main Document ─────────────────────────────────────────────────────────────

export function ReportDocument({ data }: { data: ReportData }) {
  const reportType = `${data.county_display} County · May 2026`

  const countyLinks = getCountyLinks(data.params.county)

  return (
    <Document
      title={`Utah Tax Sale Research — ${data.county_display} County May 2026`}
      author="Utah Tax Sale Research"
      subject="Tax Sale Investment Opportunity Report"
    >
      {/* ─── PAGE 1: COVER ──────────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        {/* Cover hero — no standard page header on cover */}
        <View style={s.coverHero}>
          <Text style={s.coverEyebrow}>UTAH TAX SALE RESEARCH  ·  CONFIDENTIAL</Text>
          <Text style={s.coverTitle}>May 2026 Tax Sale{'\n'}Opportunity Report</Text>
          <Text style={s.coverCounty}>{data.county_display} County</Text>
          <Text style={s.coverMeta}>
            Generated: {data.generated_at}  ·  Auction: {data.sale_date_display}
          </Text>
          <Text style={[s.coverMeta, { marginTop: 4 }]}>
            Platform: {data.auction_platform}  ·  State: Utah
          </Text>
        </View>

        {/* Stats bar */}
        <View style={s.statsBar}>
          {[
            { val: data.total_screened.toString(), label: 'PARCELS\nSCREENED' },
            { val: data.total_identified.toString(), label: 'OPPORTUNITIES\nIDENTIFIED' },
            {
              val: data.properties[0]?.equity_multiple
                ? `${data.properties[0].equity_multiple.toFixed(1)}x`
                : 'N/A',
              label: 'TOP EQUITY\nMULTIPLE'
            },
            {
              val: data.properties[0]?.investability_score
                ? Math.round(data.properties[0].investability_score).toString()
                : 'N/A',
              label: 'TOP\nINVESTABILITY SCORE'
            },
          ].map((stat, i) => (
            <View key={i} style={[s.statItem, i > 0 ? s.statBorder : {}]}>
              <Text style={s.statValue}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Executive Summary */}
        <View style={s.coverBodySection}>
          <Text style={s.sectionTitle}>Executive Summary</Text>
          <Text style={s.bodyText}>
            This report analyzes {data.total_screened} tax-delinquent parcels from the May 2026 {data.county_display} County auction
            and identifies the {data.total_identified} highest-potential opportunities for real estate investors.
            Properties were ranked by investability score — a composite of equity spread, title risk, data
            confidence, and market conditions.
          </Text>
          <Text style={s.bodyText}>
            The top opportunity shows an equity multiple of{' '}
            {data.properties[0]?.equity_multiple
              ? `${data.properties[0].equity_multiple.toFixed(1)}x`
              : 'N/A'}{' '}
            (assessed market value vs. opening bid).{' '}
            {data.properties.filter(p => ['TOP_TARGET', 'BID_CANDIDATE'].includes(p.recommendation_bucket ?? '')).length} properties
            are rated BID CANDIDATE or higher. All properties require independent due diligence before bidding.
          </Text>
        </View>

        {/* How to use this report */}
        <View style={s.coverBodySection}>
          <Text style={s.sectionTitle}>How to Use This Report</Text>
          {[
            'Review each property profile starting on page 3 — they are ranked by investability score.',
            'Properties rated TOP TARGET or BID CANDIDATE should be your priority due diligence focus.',
            'Verify all data independently with the county recorder, assessor, and treasurer before bidding.',
            'Check the county source URL for each property for current auction status and bid amounts.',
          ].map((text, i) => <Bullet key={i} text={text} />)}
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerTitle}>⚠ IMPORTANT DISCLAIMER</Text>
          <Text style={s.disclaimerText}>
            This report is for informational and research purposes only. It does not constitute legal, financial, or investment
            advice. All property data should be independently verified with the county assessor, recorder, and treasurer prior to
            bidding. Tax sale investing carries substantial risk including title defects, liens, encumbrances, and property condition
            issues. Past auction results do not guarantee future outcomes. Buyer assumes all risk.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* ─── PAGE 2: QUICK REFERENCE TABLE ──────────────────────────────── */}
      <QuickReferenceTable data={data} />

      {/* ─── PAGE 3: METHODOLOGY ─────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <PageHeader reportType={reportType} />
        <View style={s.content}>
          <Text style={[s.sectionTitle, { fontSize: 12, marginBottom: 16 }]}>Methodology &amp; Data Sources</Text>

          <View style={s.methodSection}>
            <Text style={s.methodTitle}>How Properties Were Screened</Text>
            <Text style={s.methodText}>
              All tax-delinquent parcels listed for the May 2026 {data.county_display} County auction were imported
              from the county&apos;s official auction platform. Each parcel was then enriched with data from multiple
              sources and scored on a 0–100 investability scale.
            </Text>
          </View>

          <View style={s.methodSection}>
            <Text style={s.methodTitle}>Data Sources</Text>
            {[
              'County Auction Listings — official parcel list, opening bids, and auction dates',
              'AGRC (Utah Automated Geographic Reference Center) — market values, building data, coordinates',
              'Utah County Assessor / GIS — assessed values, property type, lot dimensions',
              'PublicSurplus Auction Platform — owner names, legal descriptions, deposit requirements',
              'EagleWeb / County Recorders — supplemental ownership and recorder data where available',
            ].map((text, i) => <Bullet key={i} text={text} />)}
          </View>

          <View style={s.methodSection}>
            <Text style={s.methodTitle}>The Investability Score (0–100)</Text>
            <Text style={s.methodText}>
              Each property receives a composite score based on four weighted components:
            </Text>
            {[
              'Opportunity Score (50% weight) — equity spread, price-to-value ratio, lot size, building characteristics',
              'Title Score (25% weight) — title risk indicators, legal complexity flags, existing encumbrances',
              'Risk Score (15% weight, inverted) — access difficulty, marketability, environmental concerns',
              'Data Confidence (10% weight) — completeness of available data; penalizes missing critical fields',
            ].map((text, i) => <Bullet key={i} text={text} />)}
          </View>

          {/* Score Legend */}
          <Text style={[s.methodTitle, { marginBottom: 6 }]}>Score Interpretation</Text>
          <View style={s.scoreLegendRow}>
            {[
              { range: '70–100', label: 'TOP TARGET', bg: '#14532D', text: C.white },
              { range: '60–69', label: 'BID CANDIDATE', bg: C.green, text: C.white },
              { range: '50–59', label: 'WATCHLIST', bg: C.blueBg, text: C.blue },
              { range: '40–49', label: 'RESEARCH', bg: C.amberBg, text: C.amber },
              { range: '0–39', label: 'AVOID', bg: C.redBg, text: C.red },
            ].map((item, i) => (
              <View key={i} style={[s.scoreLegendItem, { backgroundColor: item.bg }]}>
                <Text style={[s.scoreLegendLabel, { color: item.text }]}>{item.label}</Text>
                <Text style={[s.scoreLegendRange, { color: item.text }]}>{item.range}</Text>
              </View>
            ))}
          </View>

          <View style={[s.methodSection, { marginTop: 14 }]}>
            <Text style={s.methodTitle}>Risk Flag Reference</Text>
            {[
              'HIGH TITLE RISK — title complexity indicators found; deep title search recommended',
              'ACCESS ISSUES — property may have limited or contested access',
              'LEGAL COMPLEXITY — unusual legal description, boundary dispute, or subdivision issue',
              'NO MARKET VALUE ON RECORD — assessed value unavailable; use comps to estimate ARV',
              'NO SITUS ADDRESS — property address not in county records; use coordinates for lookup',
              'MICRO PARCEL — lot under 2,000 sqft; limited development potential',
              'OVER-THE-COUNTER — property was passed at a prior auction; now available direct from county',
              'TITLE UNVERIFIED — title risk has not been assessed; treat as unknown',
            ].map((text, i) => <Bullet key={i} text={text} />)}
          </View>

          <View style={s.methodSection}>
            <Text style={s.methodTitle}>Important Limitations</Text>
            {[
              'Market values are assessor estimates and may not reflect actual market conditions.',
              'Title defects, liens, and encumbrances are not fully disclosed in public records.',
              'Property condition, occupancy, and access are not verified in this report.',
              'Opening bids may change before auction day — verify current amounts with the county.',
            ].map((text, i) => <Bullet key={i} text={text} />)}
          </View>
        </View>
        <PageFooter disclaimer />
      </Page>

      {/* ─── PAGES 3+: PROPERTY PROFILES ─────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <PageHeader reportType={reportType} />
        <View style={[s.content, { paddingTop: 16 }]}>
          <Text style={[s.sectionTitle, { fontSize: 11, marginBottom: 14 }]}>
            Top {data.properties.length} Opportunities — {data.county_display} County
          </Text>
          {data.properties.map((prop, i) => (
            <PropertyCard key={prop.parcel_number} prop={prop} index={i} />
          ))}
        </View>
        <PageFooter disclaimer />
      </Page>

      {/* ─── LAST PAGE: RESOURCES ─────────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <PageHeader reportType={reportType} />
        <View style={s.content}>
          <Text style={[s.sectionTitle, { fontSize: 12, marginBottom: 16 }]}>Resources &amp; Next Steps</Text>

          <View style={s.resourcesSection}>
            <Text style={s.methodTitle}>{data.county_display} County Official Links</Text>
            {countyLinks.map((link, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                <Text style={[s.resourceLabel, { width: 100 }]}>{link.label}:</Text>
                <Text style={s.resourceLink}>{link.url}</Text>
              </View>
            ))}
          </View>

          <View style={s.resourcesSection}>
            <Text style={s.methodTitle}>Auction Details</Text>
            {[
              { label: 'Auction Date', val: data.sale_date_display },
              { label: 'Platform', val: data.auction_platform === 'public_surplus' ? 'PublicSurplus (www.publicsurplus.com)' : data.auction_platform },
              { label: 'Registration', val: 'Required before bidding — create account at auction platform' },
              { label: 'Deposit', val: 'Typically required per parcel — verify per listing before auction day' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                <Text style={[s.resourceLabel, { width: 100 }]}>{item.label}:</Text>
                <Text style={s.methodText}>{item.val}</Text>
              </View>
            ))}
          </View>

          <View style={s.resourcesSection}>
            <Text style={s.methodTitle}>Due Diligence Checklist</Text>
            {[
              'Verify current opening bid and auction status at the platform before bidding day',
              'Search title at county recorder — look for IRS liens, HOA liens, mechanics liens',
              'Check for municipal liens, code violations, and utility arrears at city/county',
              'Run comparable sales (CMA) within 0.5 miles using MLS, Zillow, or local agent',
              'Visit or view property via Street View — assess condition, access, and neighborhood',
              'Verify lot dimensions and legal description match county GIS records',
              'Confirm zoning at county/city planning department — check for any use restrictions',
              'Calculate your maximum bid: ARV × 70% − repairs − closing costs − desired profit',
            ].map((text, i) => <Bullet key={i} text={text} />)}
          </View>

          {/* Full disclaimer */}
          <View style={[s.disclaimerBox, { marginHorizontal: 0, marginTop: 16 }]}>
            <Text style={s.disclaimerTitle}>FULL LEGAL DISCLAIMER</Text>
            <Text style={s.disclaimerText}>
              This report is produced by Utah Tax Sale Research for informational and educational purposes only. It does not
              constitute legal, financial, real estate, or investment advice. The data contained herein is sourced from public
              records and third-party databases; accuracy is not guaranteed and all information must be independently verified.
              Tax sale properties may be subject to title defects, liens, encumbrances, environmental issues, code violations,
              and other undisclosed risks. Purchasing property at a tax sale is a high-risk activity that may result in total loss
              of invested capital. No representation is made regarding the current condition, occupancy, or marketability of any
              property. Past research results do not predict future auction outcomes. This report is for the sole use of the
              intended recipient and may not be redistributed without permission. Utah Tax Sale Research assumes no liability
              for decisions made based on this report.
            </Text>
          </View>
        </View>
        <PageFooter />
      </Page>
    </Document>
  )
}

function getCountyLinks(county: string): Array<{ label: string; url: string }> {
  const links: Record<string, Array<{ label: string; url: string }>> = {
    salt_lake: [
      { label: 'Assessor', url: 'https://slco.org/assessor/' },
      { label: 'Recorder', url: 'https://recorder.slco.org/' },
      { label: 'Treasurer', url: 'https://tax.slco.org/' },
      { label: 'Tax Sale', url: 'https://slco.org/auditor/tax-sale/' },
      { label: 'GIS', url: 'https://maps.slco.org/' },
    ],
    utah: [
      { label: 'Assessor', url: 'https://www.utahcounty.gov/dept/Assessor/' },
      { label: 'Recorder', url: 'https://www.utahcounty.gov/LandRecords/' },
      { label: 'Tax Sale', url: 'https://auditor.utahcounty.gov/may-tax-sale/' },
      { label: 'GIS', url: 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html' },
    ],
    box_elder: [
      { label: 'Assessor', url: 'https://www.boxeldercounty.org/assessor/' },
      { label: 'Recorder', url: 'https://www.boxeldercounty.org/recorder/' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current?orgid=59749' },
    ],
    iron: [
      { label: 'Assessor', url: 'https://ironcounty.utah.gov/departments/assessor/' },
      { label: 'EagleWeb', url: 'https://eagleweb.ironcounty.utah.gov/eaglesoftware/web/login.jsp' },
      { label: 'Recorder', url: 'https://ironcounty.utah.gov/departments/recorder/' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
    weber: [
      { label: 'Assessor', url: 'https://www.webercountyutah.gov/Assessor/' },
      { label: 'Recorder', url: 'https://www.webercountyutah.gov/Recorder/' },
      { label: 'Tax Sale', url: 'https://www.webercountyutah.gov/Auditor/TaxSale/' },
    ],
    duchesne: [
      { label: 'Assessor', url: 'https://www.duchesnecounty.org/government/assessor/' },
      { label: 'Recorder', url: 'https://www.duchesnecounty.org/government/recorder/' },
      { label: 'Tax Sale', url: 'https://www.duchesnecounty.org/government/auditor/' },
    ],
    wasatch: [
      { label: 'Assessor', url: 'https://wasatch.utah.gov/assessor/' },
      { label: 'Recorder', url: 'https://wasatch.utah.gov/recorder/' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
    tooele: [
      { label: 'Assessor', url: 'https://www.tooelecounty.net/174/Assessor' },
      { label: 'Recorder', url: 'https://www.tooelecounty.net/175/Recorder' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
    sanpete: [
      { label: 'Assessor', url: 'https://sanpetecounty.net/assessor/' },
      { label: 'Recorder', url: 'https://sanpetecounty.net/recorder/' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/sanpeteco,ut/list/current' },
    ],
    davis: [
      { label: 'Assessor', url: 'https://www.daviscountyutah.gov/assessor' },
      { label: 'Recorder', url: 'https://www.daviscountyutah.gov/recorder' },
      { label: 'Tax Sale', url: 'https://www.daviscountyutah.gov/auditor/tax-sale' },
    ],
    washington: [
      { label: 'Assessor', url: 'https://www.washco.utah.gov/departments/assessor/' },
      { label: 'EagleWeb', url: 'https://eagleweb.washco.utah.gov/eaglesoftware/web/login.jsp' },
      { label: 'Recorder', url: 'https://www.washco.utah.gov/departments/recorder/' },
      { label: 'Tax Sale', url: 'https://www.washco.utah.gov/departments/auditor/tax-sale/' },
    ],
    juab: [
      { label: 'Assessor', url: 'https://www.juabcounty.com/assessor' },
      { label: 'EagleWeb', url: 'https://eagleweb.juabcounty.com/eaglesoftware/web/login.jsp' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
    sevier: [
      { label: 'Assessor', url: 'https://seviercounty.net/assessor/' },
      { label: 'EagleWeb', url: 'https://eagleweb.seviercounty.net/eaglesoftware/web/login.jsp' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
    beaver: [
      { label: 'Assessor', url: 'https://beaver.utah.gov/assessor/' },
      { label: 'EagleWeb', url: 'https://eagleweb.beaver.utah.gov/eaglesoftware/web/login.jsp' },
      { label: 'Tax Sale', url: 'https://www.publicsurplus.com/sms/all,ut/list/current' },
    ],
  }
  return links[county] ?? [{ label: 'County Website', url: `https://utah.gov` }]
}
