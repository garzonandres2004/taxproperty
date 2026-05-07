import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  ArrowLeft,
  DollarSign,
  Clock,
  Target,
  AlertOctagon,
  Search,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getCountyAdapter } from '@/lib/counties'
import { getCountyLinkList } from '@/lib/county-links'
import { PropertyImage } from '@/components/PropertyImage'
import { scoreProperty } from '@/lib/scoring'
import { formatCurrency, cn, cleanHtmlEntities } from '@/lib/ui-utils'

// Types for the investment memo
interface PropertyData {
  id: string
  parcel_number: string
  county: string
  property_address: string | null
  owner_name: string | null
  owner_mailing_address: string | null
  legal_description: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  assessed_value: number | null
  property_type: string
  lot_size_sqft: number | null
  building_sqft: number | null
  year_built: number | null
  zoning: string | null
  recommendation: string | null
  recommendation_bucket: string | null
  investability_score: number | null
  risk_score: number | null
  final_score: number | null
  max_bid_calculated: number | null
  status: string
  sale_date: string | null
  auction_platform: string | null
  deposit_required: number | null
  is_otc: boolean
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  access_risk: string
  title_risk: string
  legal_risk: string
  marketability_risk: string
  data_confidence: number | null
  notes: string | null
  county_source_url: string | null
}

// Generate metadata for the page
export async function generateMetadata({
  params
}: {
  params: Promise<{ county: string; parcelId: string }>
}) {
  const { county, parcelId } = await params
  return {
    title: `${parcelId} | ${county} County | TaxProperty`,
    description: `Investment analysis for ${parcelId} in ${county} County tax sale`
  }
}

// Main page component
export default async function ParcelDetailPage({
  params
}: {
  params: Promise<{ county: string; parcelId: string }>
}) {
  const { county, parcelId } = await params

  // Fetch property from database
  const property = await prisma.property.findFirst({
    where: {
      county: county,
      parcel_number: parcelId
    },
    include: {
      sources: true,
      outcomes: { orderBy: { event_date: 'desc' } },
      zoningProfile: true,
      titleAnalysis: true,
      titleSignals: true,
      adjacent_parcels: true,
      red_flags: { where: { is_resolved: false } }
    }
  })

  if (!property) {
    notFound()
  }

  // Get county adapter for legacy zoning links
  const adapter = getCountyAdapter(county)
  const legacyLinks = adapter.makeExternalLinks(
    property.parcel_number,
    property.property_address || '',
    property.zoningProfile?.jurisdiction
  )
  // Use new registry for source links — works for all counties
  const countyLinkList = getCountyLinkList(county, property.parcel_number)

  // Calculate scores
  const scoringResult = scoreProperty({
    county: property.county,
    total_amount_due: property.total_amount_due,
    estimated_market_value: property.estimated_market_value,
    estimated_repair_cost: null,
    estimated_cleanup_cost: null,
    estimated_closing_cost: null,
    property_type: property.property_type,
    lot_size_sqft: property.lot_size_sqft,
    building_sqft: property.building_sqft,
    year_built: property.year_built,
    assessed_value: property.assessed_value,
    deposit_required: property.deposit_required,
    data_confidence: property.data_confidence,
    access_risk: property.access_risk,
    title_risk: property.title_risk,
    legal_risk: property.legal_risk,
    marketability_risk: property.marketability_risk,
    owner_name: property.owner_name,
    owner_mailing_address: property.owner_mailing_address,
    property_address: property.property_address,
    occupancy_status: 'unknown',
    zoning: property.zoning
  })

  // Determine readiness level
  const readinessLevel = property.data_confidence && property.data_confidence >= 80
    ? 'LIVE'
    : property.data_confidence && property.data_confidence >= 50
    ? 'NEAR_LIVE'
    : 'PARTIAL'

  // Format recommendations
  const bucketColors: Record<string, string> = {
    TOP_TARGET: 'bg-emerald-500',
    BID_CANDIDATE: 'bg-blue-500',
    WATCHLIST: 'bg-amber-500',
    RESEARCH: 'bg-slate-400',
    AVOID: 'bg-red-500'
  }

  const bucketLabels: Record<string, string> = {
    TOP_TARGET: 'TOP TARGET',
    BID_CANDIDATE: 'BID CANDIDATE',
    WATCHLIST: 'WATCHLIST',
    RESEARCH: 'RESEARCH REQUIRED',
    AVOID: 'AVOID'
  }

  const bucket = property.recommendation_bucket || 'RESEARCH'
  const recommendationColor = bucketColors[bucket] || 'bg-slate-400'
  const recommendationLabel = bucketLabels[bucket] || 'PENDING'

  // Calculate financials
  const totalCost = (property.total_amount_due || 0) + 3500 // Including quiet title estimate
  const equity = (property.estimated_market_value || 0) - totalCost
  const equityPercent = property.estimated_market_value
    ? (equity / property.estimated_market_value) * 100
    : 0

  // Generate one-line thesis
  const getThesis = () => {
    const parts: string[] = []

    if (bucket === 'TOP_TARGET') {
      parts.push('Strong buy opportunity')
    } else if (bucket === 'BID_CANDIDATE') {
      parts.push('Viable investment')
    } else if (bucket === 'WATCHLIST') {
      parts.push('Proceed with caution')
    } else if (bucket === 'RESEARCH') {
      parts.push('Requires due diligence')
    } else {
      parts.push('Not recommended')
    }

    if (property.property_type === 'single_family') {
      parts.push('single-family residence')
    } else if (property.property_type === 'vacant_land') {
      parts.push('vacant land parcel')
    }

    if (equityPercent > 30) {
      parts.push(`with ${equityPercent.toFixed(0)}% equity spread`)
    }

    if (property.is_otc) {
      parts.push('(OTC - less competition)')
    }

    return parts.join(' ')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/properties" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{property.parcel_number}</h1>
              <p className="text-xs text-slate-500">{county} County • Investment Memo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {property.max_bid_calculated && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                <DollarSign size={16} />
                <span className="font-bold">Max Bid: {formatCurrency(property.max_bid_calculated)}</span>
              </div>
            )}
            {(countyLinkList[0] || legacyLinks.recorderUrl) && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={countyLinkList[0]?.url ?? legacyLinks.recorderUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} className="mr-1" />
                  {countyLinkList[0]?.label ?? 'County Records'}
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Readiness Banner */}
          {readinessLevel !== 'LIVE' && (
            <Alert className={cn(
              readinessLevel === 'NEAR_LIVE' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
            )}>
              <AlertTriangle className={cn(
                'h-4 w-4',
                readinessLevel === 'NEAR_LIVE' ? 'text-blue-600' : 'text-amber-600'
              )} />
              <AlertTitle className={cn(
                readinessLevel === 'NEAR_LIVE' ? 'text-blue-800' : 'text-amber-800'
              )}>
                {readinessLevel === 'NEAR_LIVE' ? 'Data Enrichment In Progress' : 'Partial Data Available'}
              </AlertTitle>
              <AlertDescription className={cn(
                readinessLevel === 'NEAR_LIVE' ? 'text-blue-700' : 'text-amber-700'
              )}>
                {readinessLevel === 'NEAR_LIVE'
                  ? 'Core data loaded. Market values and zoning details are being updated.'
                  : 'Basic property information available. Run enrichment for complete analysis.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Hero Section - Recommendation */}
          <div className={cn(
            'rounded-2xl p-8 text-white',
            recommendationColor
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-white/20 text-white border-0 font-bold text-lg px-4 py-1">
                    {recommendationLabel}
                  </Badge>
                  {property.is_otc && (
                    <Badge className="bg-amber-400 text-amber-900 border-0 font-bold">
                      OTC
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-medium opacity-90">{getThesis()}</p>
                <p className="text-sm opacity-75">
                  {cleanHtmlEntities(property.property_address) || 'Address not available'}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-black">{Math.round(property.investability_score || 0)}</div>
                  <div className="text-sm opacity-80">Investability Score</div>
                </div>
                <div className="hidden md:block w-px h-16 bg-white/30" />
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatCurrency(property.total_amount_due)}</div>
                  <div className="text-sm opacity-80">Opening Bid</div>
                </div>
              </div>
            </div>
          </div>

          {/* Property Image Row */}
          {(property.photo_url || property.latitude) && (
            <div className="flex gap-4">
              <div className="w-64 h-40 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <PropertyImage
                  address={property.property_address}
                  parcelNumber={property.parcel_number}
                  propertyType={property.property_type}
                  size="lg"
                  photoUrl={property.photo_url}
                  latitude={property.latitude}
                  longitude={property.longitude}
                  className="w-full h-full rounded-none"
                />
              </div>
              {property.latitude && property.longitude && (
                <div className="flex-1 h-40 rounded-xl overflow-hidden border border-slate-200">
                  {/* Static satellite map showing context */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${property.latitude},${property.longitude}&zoom=15&size=600x160&maptype=satellite&markers=color:red%7C${property.latitude},${property.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`}
                    alt="Satellite map"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Max Bid Callout */}
          {property.max_bid_calculated && (
            <Card className="border-2 border-emerald-500 bg-emerald-50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 text-white rounded-xl">
                      <Target size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Recommended Maximum Bid</p>
                      <p className="text-3xl font-black text-emerald-900">{formatCurrency(property.max_bid_calculated)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-700">Based on ARV × 80% - Costs - Profit</p>
                    <p className="text-sm text-emerald-600">Do not exceed this amount</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Key Facts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Facts Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 size={20} />
                    Key Facts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Property Type</p>
                      <p className="font-bold text-slate-900 capitalize">{property.property_type.replace('_', ' ')}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Lot Size</p>
                      <p className="font-bold text-slate-900">
                        {property.lot_size_sqft
                          ? `${(property.lot_size_sqft / 43560).toFixed(2)} acres`
                          : 'Unknown'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Year Built</p>
                      <p className="font-bold text-slate-900">{property.year_built || 'Unknown'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Building SqFt</p>
                      <p className="font-bold text-slate-900">
                        {property.building_sqft?.toLocaleString() || 'Unknown'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Zoning</p>
                      <p className="font-bold text-slate-900">{property.zoning || 'Unknown'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Jurisdiction</p>
                      <p className="font-bold text-slate-900">
                        {property.zoningProfile?.is_unincorporated
                          ? 'Unincorporated County'
                          : property.zoningProfile?.jurisdiction || 'Unknown'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Auction Date</p>
                      <p className="font-bold text-slate-900">
                        {property.sale_date
                          ? new Date(property.sale_date).toLocaleDateString()
                          : 'TBD'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Platform</p>
                      <p className="font-bold text-slate-900">{property.auction_platform || 'TBD'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What's Good / What's Risky */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-emerald-200">
                  <CardHeader className="bg-emerald-50">
                    <CardTitle className="flex items-center gap-2 text-emerald-900">
                      <CheckCircle2 size={20} />
                      What's Good
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-3">
                      {scoringResult.reasons.length > 0 ? (
                        scoringResult.reasons.slice(0, 5).map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-slate-500 italic">No positive signals recorded</li>
                      )}
                      {equityPercent > 20 && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Strong equity position ({equityPercent.toFixed(0)}% spread)</span>
                        </li>
                      )}
                      {property.is_otc && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>OTC property - less competition expected</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <AlertOctagon size={20} />
                      What's Risky
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-3">
                      {scoringResult.warnings.length > 0 ? (
                        scoringResult.warnings.slice(0, 5).map((warning, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <span>{warning}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-slate-500 italic">No major risks identified</li>
                      )}
                      {property.red_flags.length > 0 && property.red_flags.map((flag) => (
                        <li key={flag.id} className="flex items-start gap-2 text-sm">
                          <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                          <span>{flag.message}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Title Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} />
                    Title Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.titleAnalysis ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold text-white',
                          property.titleAnalysis.score >= 80 ? 'bg-emerald-500' :
                          property.titleAnalysis.score >= 60 ? 'bg-amber-500' :
                          property.titleAnalysis.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        )}>
                          <span className="text-xs">Title</span>
                          <span className="text-xl">{property.titleAnalysis.score}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {property.titleAnalysis.recommendation.toUpperCase()}
                          </p>
                          <p className="text-sm text-slate-500">{property.titleAnalysis.summary}</p>
                        </div>
                      </div>

                      {property.titleAnalysis.mortgageStatus && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Mortgage Status:</span>
                          <Badge variant="outline">
                            {property.titleAnalysis.mortgageStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : property.titleSignals ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">Title Signals Available</p>
                          <p className="text-xs text-blue-700">
                            {property.titleSignals.document_count_5yr || 0} documents found in 5 years
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={legacyLinks.recorderUrl} target="_blank" rel="noopener noreferrer">
                          <Search size={14} className="mr-1" />
                          View Recorder Records
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Search size={48} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 mb-3">No title analysis yet</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={legacyLinks.recorderUrl} target="_blank" rel="noopener noreferrer">
                          Check County Records
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Opening Bid</span>
                    <span className="font-bold">{formatCurrency(property.total_amount_due)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Est. Market Value</span>
                    <span className="font-bold">{formatCurrency(property.estimated_market_value)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Est. Quiet Title</span>
                    <span className="font-bold">$3,500</span>
                  </div>
                  <div className={cn(
                    'flex justify-between items-center py-3 rounded-lg px-3',
                    equity >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  )}>
                    <span className={cn('font-medium', equity >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      Equity Spread
                    </span>
                    <span className={cn('font-bold', equity >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      {formatCurrency(equity)} ({equityPercent.toFixed(1)}%)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Name</p>
                    <p className="font-medium">{property.owner_name || 'Unknown'}</p>
                  </div>
                  {property.owner_mailing_address && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Mailing Address</p>
                      <p className="font-medium text-sm">{cleanHtmlEntities(property.owner_mailing_address)}</p>
                    </div>
                  )}
                  {scoringResult.absenteeOwner && (
                    <Badge className="bg-blue-50 text-blue-700">Absentee Owner</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Next Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap size={18} />
                    Next Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>Verify title at county recorder</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>Check for municipal liens</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>Drive-by or Street View verification</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>Confirm zoning with {property.zoningProfile?.is_unincorporated ? 'county' : 'city'}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>Calculate final max bid</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Source Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Official Sources</CardTitle>
                  <CardDescription className="text-xs">{county.replace('_', ' ')} County</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {countyLinkList.map(link => (
                    <Button key={link.label} variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} className="mr-2 shrink-0" />
                        {link.label}
                      </a>
                    </Button>
                  ))}
                  {property.county_source_url && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={property.county_source_url} target="_blank" rel="noopener noreferrer">
                        <FileText size={12} className="mr-2 shrink-0" />
                        Original Listing
                      </a>
                    </Button>
                  )}
                  {legacyLinks.parcelMapUrl && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={legacyLinks.parcelMapUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin size={12} className="mr-2 shrink-0" />
                        Parcel Map
                      </a>
                    </Button>
                  )}
                  {property.zoningProfile?.zoning_map_url && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={property.zoningProfile.zoning_map_url} target="_blank" rel="noopener noreferrer">
                        <TrendingUp size={12} className="mr-2 shrink-0" />
                        Zoning Map
                      </a>
                    </Button>
                  )}
                  {countyLinkList.length === 0 && !property.county_source_url && (
                    <p className="text-xs text-slate-400 text-center py-2">No public sources configured for this county</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
