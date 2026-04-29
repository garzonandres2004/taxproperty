import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { countyConfigs, propertyTypeLabels, occupancyLabels, statusLabels } from '@/lib/counties/config'
import { calculateCapitalFit, getDefaultSettings } from '@/lib/scoring'
import OutcomeTracker from '@/components/outcomes/OutcomeTracker'
import ZoningAutoFillButton from '@/components/ZoningAutoFillButton'
import { MaxBidCalculator } from '@/components/MaxBidCalculator'
import { DueDiligenceChecklist } from '@/components/DueDiligenceChecklist'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [property, settings, zoningProfile] = await Promise.all([
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
    prisma.zoningProfile.findUnique({ where: { property_id: id } })
  ])

  if (!property) {
    notFound()
  }

  // Calculate capital fit using current settings
  const userSettings = settings || getDefaultSettings()
  const capitalFit = calculateCapitalFit({
    total_amount_due: property.total_amount_due,
    estimated_repair_cost: property.estimated_repair_cost,
    estimated_cleanup_cost: property.estimated_cleanup_cost,
    estimated_closing_cost: property.estimated_closing_cost,
    deposit_required: property.deposit_required
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

      {/* Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className={property.opportunity_score && property.opportunity_score >= 75 ? 'border-green-300 bg-green-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Opportunity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{property.opportunity_score}</div>
            <p className="text-sm text-gray-500 mt-1">out of 100</p>
          </CardContent>
        </Card>

        <Card className={property.risk_score && property.risk_score > 50 ? 'border-red-300 bg-red-50' : property.risk_score && property.risk_score > 30 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${property.risk_score && property.risk_score > 50 ? 'text-red-600' : property.risk_score && property.risk_score > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
              {property.risk_score}
            </div>
            <p className="text-sm text-gray-500 mt-1">lower is better</p>
          </CardContent>
        </Card>

        <Card className={property.final_score && property.final_score >= 75 ? 'border-green-300 bg-green-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Final Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{property.final_score}</div>
            <p className="text-sm text-gray-500 mt-1">
              {property.final_score && property.final_score >= 75 ? 'Strong candidate' : property.final_score && property.final_score >= 55 ? 'Moderate' : 'Weak'}
            </p>
          </CardContent>
        </Card>
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
                    <p className="font-medium">{property.property_address}</p>
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

              <div className="mt-4">
                <span className="text-gray-600 text-sm">Data Confidence:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${property.data_confidence || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{property.data_confidence}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <div>Total: ${userSettings.totalBudget.toLocaleString()}</div>
                  <div>Max/Property: ${userSettings.maxPerProperty.toLocaleString()}</div>
                  <div>Reserve: ${userSettings.reserveBuffer.toLocaleString()}</div>
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

          {/* Due Diligence Checklist - Dustin Hahn Workflow */}
          <DueDiligenceChecklist
            propertyId={id}
            parcelNumber={property.parcel_number}
            address={property.property_address}
            amountDue={property.total_amount_due}
            marketValue={property.estimated_market_value}
          />

          {/* Max Bid Calculator - Dustin Hahn Formula */}
          <MaxBidCalculator
            propertyId={id}
            arv={property.estimated_market_value}
            amountDue={property.total_amount_due}
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
                    <p className="font-medium">{property.owner_mailing_address}</p>
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
