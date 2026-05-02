import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileSearch, FileText, Calculator, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { countyConfigs, propertyTypeLabels, occupancyLabels, statusLabels } from '@/lib/counties/config'
import { getTooeleResearchLinks } from '@/lib/counties/adapters/tooele'
import { calculateCapitalFit, getDefaultSettings } from '@/lib/scoring'
import OutcomeTracker from '@/components/outcomes/OutcomeTracker'
import ZoningAutoFillButton from '@/components/ZoningAutoFillButton'
import EnrichPropertyButton from '@/components/EnrichPropertyButton'
import { MaxBidCalculator } from '@/components/MaxBidCalculator'
import { DueDiligenceChecklist } from '@/components/DueDiligenceChecklist'
import { PropertyAlert, ScoreBadge, RecommendationBadge, DataConfidenceIndicator, generatePropertyAlerts } from '@/components/DataTrustIndicators'
import { PropertyImage } from '@/components/PropertyImage'
import { SafeImageWithLink } from '@/components/SafeImage'
import { cleanHtmlEntities } from '@/lib/ui-utils'
import { CountyLinksPanel } from '@/components/property/CountyLinksPanel'
import { TitleAnalysisCard } from '@/components/title/TitleAnalysisCard'
import { TitleResearchChecklist } from '@/components/property/TitleResearchChecklist'
import { RiskIndicators } from '@/components/property/RiskIndicators'
import { ZillowStyleImageHero } from '@/components/property/ZillowStyleImageHero'
import { MarketSignalsCard } from '@/components/property/MarketSignalsCard'
import { scoreProperty } from '@/lib/scoring'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [property, settings, zoningProfile, adjacentParcels, redFlags, thirdPartyEnrichment] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: {
        sources: true,
        outcomes: {
          orderBy: { event_date: 'desc' }
        }
      }
    }),
    prisma.userSettings.findUnique({ where: { id: 'default' } }),
    prisma.zoningProfile.findUnique({ where: { property_id: id } }),
    prisma.adjacentParcel.findMany({
      where: { property_id: id },
      orderBy: { distance_meters: 'asc' }
    }),
    prisma.redFlag.findMany({
      where: { property_id: id, is_resolved: false },
      orderBy: { created_at: 'desc' }
    }),
    prisma.thirdPartyEnrichment.findUnique({
      where: { property_id: id }
    })
  ])

  // Fetch adjacent parcel details if in tax sale
  const adjacentParcelNumbers = adjacentParcels.map(p => p.adjacent_parcel_number)
  const adjacentInTaxSale = adjacentParcelNumbers.length > 0
    ? await prisma.property.findMany({
        where: {
          parcel_number: { in: adjacentParcelNumbers },
          is_seed: false
        },
        select: {
          id: true,
          parcel_number: true,
          total_amount_due: true,
          estimated_market_value: true,
          recommendation: true,
          final_score: true,
          micro_parcel: true
        }
      })
    : []

  const taxSaleMap = new Map(adjacentInTaxSale.map(p => [p.parcel_number, p]))

  if (!property) {
    notFound()
  }

  // Calculate capital fit using current settings
  const userSettings = settings || getDefaultSettings()
  const capitalFitResult = calculateCapitalFit({
    total_amount_due: property.total_amount_due,
    estimated_repair_cost: property.estimated_repair_cost,
    estimated_cleanup_cost: property.estimated_cleanup_cost,
    estimated_closing_cost: property.estimated_closing_cost,
    deposit_required: property.deposit_required
  }, userSettings)

  // Provide fallback when budget is not configured
  const capitalFit = capitalFitResult || {
    score: 0,
    estimatedTotalCost: (property.total_amount_due || 0) +
                       (property.estimated_repair_cost || 0) +
                       (property.estimated_cleanup_cost || 0) +
                       (property.estimated_closing_cost || 0) +
                       (property.deposit_required || 0),
    budgetUsagePercent: 0,
    notes: userSettings.totalBudget === null
      ? ['Budget not configured. Go to Settings to enable Capital Fit scoring.']
      : ['Budget configuration error']
  }

  // Calculate enhanced scoring with redemption risk and too-good-to-be-true detection
  const scoringResult = scoreProperty({
    county: property.county,
    total_amount_due: property.total_amount_due,
    estimated_market_value: property.estimated_market_value,
    estimated_repair_cost: property.estimated_repair_cost,
    estimated_cleanup_cost: property.estimated_cleanup_cost,
    estimated_closing_cost: property.estimated_closing_cost,
    property_type: property.property_type,
    occupancy_status: property.occupancy_status,
    zoning: property.zoning,
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
    years_delinquent: property.sale_year ? Math.max(1, new Date().getFullYear() - property.sale_year) : 1,
    outcomes: property.outcomes,
    is_unincorporated: !zoningProfile || zoningProfile?.jurisdiction === 'Unincorporated Utah County',
    has_zoning_profile: !!zoningProfile,
    buildability_score: zoningProfile?.buildability_score ?? null
  }, userSettings)

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'bid': return 'bg-green-100 text-green-800 border-green-300'
      case 'research_more': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'avoid': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800'
      case 'researching': return 'bg-blue-100 text-blue-800'
      case 'new': return 'bg-gray-100 text-gray-800'
      case 'redeemed': return 'bg-gray-100 text-gray-600'
      case 'removed': return 'bg-red-100 text-red-800'
      case 'passed': return 'bg-gray-100 text-gray-600'
      case 'sold': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  const totalCost = (property.total_amount_due || 0) +
                    (property.estimated_repair_cost || 0) +
                    (property.estimated_cleanup_cost || 0) +
                    (property.estimated_closing_cost || 0)

  const equitySpread = (property.estimated_market_value || 0) - totalCost
  const spreadPercent = property.estimated_market_value
    ? (equitySpread / property.estimated_market_value) * 100
    : 0

  // Tax Sanity Check: Payoff ratio
  const payoffRatio = property.total_amount_due && property.estimated_market_value
    ? (property.total_amount_due / property.estimated_market_value) * 100
    : null

  const getPayoffRatioLabel = (ratio: number) => {
    if (ratio < 1.5) return { text: 'Very low payoff relative to estimated value', color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (ratio < 5) return { text: 'Normal payoff ratio', color: 'text-blue-600', bg: 'bg-blue-50' }
    return { text: 'High payoff ratio - verify with county', color: 'text-amber-600', bg: 'bg-amber-50' }
  }

  const payoffInfo = payoffRatio ? getPayoffRatioLabel(payoffRatio) : null

  // Convert parcel number format: 03:060:0016 → 30600016001 for Utah County Land Records
  const parcelToSerial = (parcel: string) => {
    // Remove colons and pad with zeros to match Utah County's format
    const clean = parcel.replace(/:/g, '')
    // Pad to 11 characters as needed
    return clean.padStart(11, '0')
  }

  // County-specific URLs for due diligence
  let landRecordsUrl: string
  let recorderUrl: string
  let countyLinks: { taxSale?: string; mediciland?: string } = {}

  if (property.county === 'tooele') {
    // Tooele County uses Mediciland (requires Google Auth)
    const tooeleLinks = getTooeleResearchLinks(property.parcel_number, property.owner_name || undefined)
    landRecordsUrl = tooeleLinks.mediciland
    recorderUrl = tooeleLinks.recorder
    countyLinks = { taxSale: tooeleLinks.taxSale, mediciland: tooeleLinks.mediciland }
  } else {
    // Utah County (default)
    landRecordsUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelToSerial(property.parcel_number)}`
    recorderUrl = 'https://www.utahcounty.gov/LandRecords/Index.asp'
  }

  // Calculate staleness for warning banner
  const getStalenessWarning = () => {
    if (!property.status_last_verified_at || !property.sale_date) return null

    const now = Date.now()
    const verifiedTime = new Date(property.status_last_verified_at).getTime()
    const saleTime = new Date(property.sale_date).getTime()
    const daysSinceVerified = Math.floor((now - verifiedTime) / (1000 * 60 * 60 * 24))
    const daysUntilSale = Math.floor((saleTime - now) / (1000 * 60 * 60 * 24))

    // Warning if data is stale and sale is near
    if (daysSinceVerified > 7 && daysUntilSale <= 14) {
      return {
        severity: daysSinceVerified > 14 && daysUntilSale <= 7 ? 'high' : 'medium',
        message: `Data is ${daysSinceVerified} days old with ${daysUntilSale} days until sale. Verify status with county before bidding.`,
        daysSinceVerified,
        daysUntilSale
      }
    }
    return null
  }

  const stalenessWarning = getStalenessWarning()
  const propertyAlerts = generatePropertyAlerts(property)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Staleness Warning */}
      {stalenessWarning && (
        <Alert className={`mb-6 ${stalenessWarning.severity === 'high' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
          <AlertTitle className={stalenessWarning.severity === 'high' ? 'text-red-800' : 'text-yellow-800'}>
            ⚠ Stale Data Warning
          </AlertTitle>
          <AlertDescription className={stalenessWarning.severity === 'high' ? 'text-red-700' : 'text-yellow-700'}>
            {stalenessWarning.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Property Alerts */}
      {propertyAlerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {propertyAlerts.map((alert, index) => (
            <PropertyAlert
              key={index}
              type={alert.type}
              message={alert.message}
              details={alert.details}
            />
          ))}
        </div>
      )}

      {/* Red Flags from Database */}
      {redFlags.length > 0 && (
        <div className="space-y-3 mb-6">
          {redFlags.map((flag) => (
            <PropertyAlert
              key={flag.id}
              type={flag.flag_type as any}
              message={flag.message}
              details={flag.details || undefined}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{property.parcel_number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${getRecommendationColor(property.recommendation || '')}`}>
              {(property.recommendation || '').replace('_', ' ').toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${getStatusColor(property.status)}`}>
              {property.status}
            </span>
          </div>
          <p className="text-gray-600">
            {countyConfigs[property.county]?.name || property.county} • Sale: {property.sale_date || 'TBD'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${property.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Link href="/properties">
            <Button variant="outline">← Back to List</Button>
          </Link>
        </div>
      </div>

      {/* Score Summary with Data Trust Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <RecommendationBadge
          recommendation={property.recommendation}
          showLabel={true}
        />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Opportunity</span>
                <ScoreBadge score={property.opportunity_score} type="opportunity" size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk</span>
                <ScoreBadge score={property.risk_score} type="risk" size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Final</span>
                <ScoreBadge score={property.final_score} type="final" size="md" />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <DataConfidenceIndicator confidence={property.data_confidence} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analysis - Redemption Risk & Too Good To Be True */}
      <div className="mb-8">
        <RiskIndicators
          redemptionRisk={scoringResult.redemption_risk}
          tooGoodToBeTrue={scoringResult.too_good_to_be_true}
        />
      </div>

      {/* Property Visual Hero - Zillow Style High Quality Street View */}
      <div className="mb-8">
        <ZillowStyleImageHero
          address={property.property_address}
          parcelNumber={property.parcel_number}
          photoUrl={property.photo_url}
          zillowUrl={thirdPartyEnrichment?.zillow_url}
          latitude={property.latitude}
          longitude={property.longitude}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Cost breakdown and equity analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Tax Amount Due</div>
                  <div className="text-xl font-semibold">${property.total_amount_due?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Est. Repairs</div>
                  <div className="text-xl font-semibold">${property.estimated_repair_cost?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Est. Cleanup</div>
                  <div className="text-xl font-semibold">${property.estimated_cleanup_cost?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Est. Market Value</div>
                  <div className="text-xl font-semibold">${property.estimated_market_value?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Project Cost</div>
                  <div className="text-xl font-semibold">${totalCost.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Equity Spread</div>
                  <div className={`text-xl font-semibold ${equitySpread >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${equitySpread.toLocaleString()} ({spreadPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Deposit Required:</span>{' '}
                  <span className="font-medium">${property.deposit_required?.toLocaleString() || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Assessed Value:</span>{' '}
                  <span className="font-medium">${property.assessed_value?.toLocaleString() || '-'}</span>
                </div>
              </div>

              {/* Due Diligence Links */}
              <Separator className="my-4" />
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Due Diligence Links</h4>
                <div className="flex flex-wrap gap-3">
                  {property.county === 'tooele' ? (
                    <>
                      <a
                        href={landRecordsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Mediciland (Google Auth Required)
                      </a>
                      <a
                        href={recorderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <FileSearch size={14} />
                        Tooele County Recorder
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href={landRecordsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Utah County Land Records
                      </a>
                      <a
                        href={recorderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <FileSearch size={14} />
                        Recorder / Documents
                      </a>
                    </>
                  )}
                </div>

                {/* Tax Sanity Check */}
                {payoffInfo && (
                  <div className={`mt-3 p-3 rounded ${payoffInfo.bg} border border-slate-200`}>
                    <div className="flex items-center gap-2">
                      <Calculator size={14} className={payoffInfo.color} />
                      <span className="text-sm font-medium text-gray-700">
                        Payoff Ratio: {payoffRatio?.toFixed(2)}%
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${payoffInfo.color}`}>
                      {payoffInfo.text}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Property Type:</span>{' '}
                  <span className="font-medium capitalize">{propertyTypeLabels[property.property_type] || property.property_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Occupancy:</span>{' '}
                  <span className="font-medium capitalize">{occupancyLabels[property.occupancy_status] || property.occupancy_status}</span>
                </div>
                <div>
                  <span className="text-gray-600">Zoning:</span>{' '}
                  <span className="font-medium">{property.zoning || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Year Built:</span>{' '}
                  <span className="font-medium">{property.year_built || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Building SqFt:</span>{' '}
                  <span className="font-medium">{property.building_sqft?.toLocaleString() || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Lot Size:</span>{' '}
                  <span className="font-medium">{property.lot_size_sqft ? `${property.lot_size_sqft.toLocaleString()} sqft` : '-'}</span>
                </div>
              </div>

              {property.property_address && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <span className="text-gray-600 text-sm">Property Address:</span>
                    <p className="font-medium">{cleanHtmlEntities(property.property_address)}</p>
                  </div>
                </>
              )}

              {property.legal_description && (
                <div className="mt-2">
                  <span className="text-gray-600 text-sm">Legal Description:</span>
                  <p className="font-medium text-sm">{property.legal_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zoning & Land Use */}
          <Card>
            <CardHeader>
              <CardTitle>Zoning & Land Use</CardTitle>
              <CardDescription>
                {zoningProfile ? `Last updated: ${new Date(zoningProfile.updated_at).toLocaleDateString()}` : 'No zoning data available'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* City Zoning Warning */}
              {zoningProfile?.jurisdiction && zoningProfile.jurisdiction !== 'Unincorporated Utah County' && (
                <PropertyAlert
                  type="city-zoning"
                  message="This property is within city limits. Zoning rules are set by the city planning department, not Utah County."
                  details="Always verify directly with the city planning department before purchasing. Auto-fill data is for reference only."
                />
              )}
              {zoningProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <span className="text-gray-600 text-sm">Jurisdiction</span>
                      <p className="font-medium">{zoningProfile.jurisdiction}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <span className="text-gray-600 text-sm">Zoning Code</span>
                      <p className="font-medium">{zoningProfile.zoning_code || 'Not identified'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <span className="text-gray-600 text-sm">Buildability Score</span>
                      <p className={`font-semibold ${
                        (zoningProfile.buildability_score || 0) >= 70 ? 'text-green-600' :
                        (zoningProfile.buildability_score || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {zoningProfile.buildability_score || 'N/A'}/100
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <span className="text-gray-600 text-sm">Difficulty</span>
                      <p className="font-medium capitalize">{zoningProfile.use_difficulty || 'Unknown'}</p>
                    </div>
                  </div>

                  {zoningProfile.best_use_ideas && (
                    <div>
                      <span className="text-gray-600 text-sm">Suggested Uses:</span>
                      <ul className="mt-1 space-y-1">
                        {JSON.parse(zoningProfile.best_use_ideas).slice(0, 3).map((idea: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {idea}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {zoningProfile.next_steps && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="text-blue-700 text-sm font-medium">Next Steps:</span>
                      <p className="text-sm text-blue-700 mt-1">{zoningProfile.next_steps}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No zoning data yet for this property.</p>
                  <p className="text-sm mt-1">Click below to auto-fetch from Utah County.</p>
                </div>
              )}

              <div className="mt-6">
                <ZoningAutoFillButton propertyId={id} />
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/properties/${id}/zoning/edit`}>Edit Zoning</Link>
                </Button>
                {zoningProfile?.zoning_map_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={zoningProfile.zoning_map_url} target="_blank" rel="noopener noreferrer">
                      View Zoning Map
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Title Analysis - Automated Document Analysis */}
          <TitleAnalysisCard propertyId={property.id} parcelNumber={property.parcel_number} />

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Access Risk</span>
                  <span className={`font-semibold capitalize ${getRiskColor(property.access_risk)}`}>{property.access_risk}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Title Risk</span>
                  <span className={`font-semibold capitalize ${getRiskColor(property.title_risk)}`}>{property.title_risk}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Legal Risk</span>
                  <span className={`font-semibold capitalize ${getRiskColor(property.legal_risk)}`}>{property.legal_risk}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Marketability</span>
                  <span className={`font-semibold capitalize ${getRiskColor(property.marketability_risk)}`}>{property.marketability_risk}</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Adjacent Parcels - Assemblage Section */}
          {(adjacentParcels.length > 0 || property.micro_parcel) && (
            <Card className={property.assemblage_opportunity ? 'border-purple-300' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Adjacent Parcels
                  {property.assemblage_opportunity && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      Assemblage Opportunity
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {property.micro_parcel
                    ? `This micro-parcel (${property.lot_size_sqft?.toLocaleString()} sq ft) may benefit from assemblage`
                    : 'Neighboring parcels that could enable larger development'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adjacentParcels.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No adjacent parcels found.</p>
                    <p className="text-sm mt-1">Run assemblage detection to search for neighboring properties.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">
                      Found {adjacentParcels.length} adjacent parcel{adjacentParcels.length > 1 ? 's' : ''}
                      {adjacentInTaxSale.length > 0 && (
                        <span className="text-purple-600 font-medium">
                          {' '}— {adjacentInTaxSale.length} in tax sale
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {adjacentParcels.map((adjacent) => {
                        const taxSaleProperty = taxSaleMap.get(adjacent.adjacent_parcel_number)
                        return (
                          <div
                            key={adjacent.id}
                            className={`p-3 rounded-lg border ${
                              adjacent.is_in_tax_sale
                                ? 'bg-purple-50 border-purple-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {adjacent.adjacent_parcel_number}
                                </span>
                                {adjacent.is_in_tax_sale && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                    In Tax Sale
                                  </span>
                                )}
                              </div>
                              {taxSaleProperty ? (
                                <Link
                                  href={`/properties/${taxSaleProperty.id}`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View →
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Not in database
                                </span>
                              )}
                            </div>
                            {taxSaleProperty && (
                              <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                                <span>
                                  Due: ${taxSaleProperty.total_amount_due?.toLocaleString() || 'N/A'}
                                </span>
                                <span>
                                  Score: {taxSaleProperty.final_score?.toFixed(0) || 'N/A'}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {property.micro_parcel && adjacentInTaxSale.length > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800 font-medium">
                          Combined Opportunity
                        </p>
                        <p className="text-xs text-purple-700 mt-1">
                          Combined lot size could support development that this micro-parcel alone cannot.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Capital Fit */}
          <Card>
            <CardHeader>
              <CardTitle>Capital Fit</CardTitle>
              <CardDescription>Budget alignment based on your settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${
                    capitalFit.score >= 10 ? 'bg-green-50' :
                    capitalFit.score >= 5 ? 'bg-yellow-50' : 'bg-red-50'
                  }`}>
                    <div className="text-sm text-gray-600 mb-1">Capital Fit Score</div>
                    <div className={`text-3xl font-bold ${
                      capitalFit.score >= 10 ? 'text-green-700' :
                      capitalFit.score >= 5 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {capitalFit.score}/15
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Budget Usage</div>
                    <div className="text-3xl font-bold text-gray-800">
                      {capitalFit.budgetUsagePercent.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Estimated Total Cost</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${capitalFit.estimatedTotalCost.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Includes tax due, repairs, cleanup, closing costs, and deposit
                  </p>
                </div>

                {capitalFit.notes.length > 0 && (
                  <div className="space-y-1">
                    {capitalFit.notes.map((note, i) => (
                      <div key={i} className={`text-sm flex items-start gap-2 ${
                        i === 0 && capitalFit.score < 5 ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        <span>{i === 0 && capitalFit.score < 5 ? '⚠' : '•'}</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Your Settings:</span>
                  <Link href="/settings" className="text-blue-600 hover:underline">
                    Edit →
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div>Total: ${userSettings.totalBudget?.toLocaleString() ?? 'Not set'}</div>
                  <div>Max/Property: ${userSettings.maxPerProperty?.toLocaleString() ?? 'Not set'}</div>
                  <div>Reserve: ${userSettings.reserveBuffer?.toLocaleString() ?? 'Not set'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{property.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Title Research Checklist - Expert Investor 9-Step Process */}
          <TitleResearchChecklist
            propertyId={id}
            parcelNumber={property.parcel_number}
            ownerName={property.owner_name}
            address={cleanHtmlEntities(property.property_address)}
            hasStreetView={!!property.photo_url}
            hasAerial={!!property.aerial_url}
            estimatedMarketValue={property.estimated_market_value}
            county={property.county}
          />

          {/* Due Diligence Checklist - Expert Investor Workflow */}
          <DueDiligenceChecklist
            propertyId={id}
            parcelNumber={property.parcel_number}
            address={cleanHtmlEntities(property.property_address)}
            amountDue={property.total_amount_due}
            marketValue={property.estimated_market_value}
            county={property.county}
          />

          {/* Max Bid Calculator - Expert Investor Formula */}
          <MaxBidCalculator
            propertyId={id}
            arv={property.estimated_market_value}
            amountDue={property.total_amount_due}
            savedRepairEstimate={property.repair_estimate}
            savedDesiredProfit={property.desired_profit}
            savedMaxBidCalculated={property.max_bid_calculated}
          />
        </div>

        {/* Right Column - Owner & Sources */}
        <div className="space-y-6">
          {/* Owner Info */}
          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{property.owner_name || 'Unknown'}</p>
                </div>
                {property.owner_mailing_address && (
                  <div>
                    <span className="text-gray-600">Mailing Address:</span>
                    <p className="font-medium">{cleanHtmlEntities(property.owner_mailing_address)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {property.sources.map((source) => (
                  <div key={source.id} className="flex items-center gap-2 text-sm">
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                        {source.label} →
                      </a>
                    ) : (
                      <span>{source.label}</span>
                    )}
                    <Badge variant="outline" className="text-xs">{source.source_type}</Badge>
                  </div>
                ))}
                {property.sources.length === 0 && (
                  <p className="text-gray-500 text-sm">No sources added</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle>Outcome History</CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeTracker
                propertyId={property.id}
                initialOutcomes={property.outcomes}
              />
            </CardContent>
          </Card>

          {/* County Links Panel - Direct access to research tools */}
          {property.county === 'tooele' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building size={18} className="text-blue-600" />
                  Tooele County Resources
                </CardTitle>
                <CardDescription>
                  Direct links to Tooele County research tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <a
                    href={`https://search.tooeleco.gov.mediciland.com/?q=${property.parcel_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                  >
                    <div className="p-2 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
                      <FileSearch size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-700 group-hover:text-blue-700">Mediciland Parcel Search</span>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div className="text-xs text-slate-500">Search property records (Google Auth required)</div>
                    </div>
                  </a>
                  <a
                    href="https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                  >
                    <div className="p-2 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
                      <FileText size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-700 group-hover:text-blue-700">Recorder Search</span>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div className="text-xs text-slate-500">Search recorded documents</div>
                    </div>
                  </a>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <a
                    href="https://tooeleco.gov/departments/administration/auditor/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Visit Tooele County Auditor website
                    <ExternalLink size={12} />
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CountyLinksPanel
              ownerName={property.owner_name}
              parcelNumber={property.parcel_number}
            />
          )}

          {/* Property Enrichment - CountyAdapter Auto-Fill */}
          <Card>
            <CardHeader>
              <CardTitle>Property Enrichment</CardTitle>
              <CardDescription>
                Auto-fetch market value, coordinates, and images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnrichPropertyButton
                propertyId={id}
                county={property.county}
              />
            </CardContent>
          </Card>

          {/* Market Signals - Third Party Enrichment (Zillow) */}
          <MarketSignalsCard
            propertyId={property.id}
            countyValue={property.estimated_market_value}
            enrichment={thirdPartyEnrichment}
          />

          {/* County Info */}
          <Card>
            <CardHeader>
              <CardTitle>County Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-600">County:</span>{' '}
                  <span className="font-medium">{countyConfigs[property.county]?.name || property.county}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sale Year:</span>{' '}
                  <span className="font-medium">{property.sale_year}</span>
                </div>
                {property.sale_date && (
                  <div>
                    <span className="text-gray-600">Sale Date:</span>{' '}
                    <span className="font-medium">{property.sale_date}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Platform:</span>{' '}
                  <span className="font-medium">{property.auction_platform || 'TBD'}</span>
                </div>
                <div className="pt-2">
                  <a
                    href={countyConfigs[property.county]?.urls.main}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    County Website →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
