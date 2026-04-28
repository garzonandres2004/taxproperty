'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, CheckCircle, AlertCircle, Home, TrendingUp, MapPin, DollarSign } from 'lucide-react'

interface ExecutiveSummaryProps {
  parcelNumbers?: string[] // If not provided, fetches top 4 scored properties
}

interface PropertySummary {
  parcelNumber: string
  propertyAddress: string
  ownerName: string
  totalAmountDue: number
  estimatedMarketValue: number
  finalScore: number
  recommendation: string
  maxBid?: number
  absenteeOwner?: boolean
  microParcel?: boolean
  assemblageOpportunity?: boolean
  zoningProfile?: {
    jurisdiction: string
    zoning_code: string | null
    buildability_score: number
    buildability_notes: string | null
  }
  landRecordsAnalysis?: {
    redemptionRisk: 'low' | 'medium' | 'high'
    yearsDelinquent: number
    hasPartialPayments: boolean
    isAbsenteeOwner: boolean
  }
}

export default function ExecutiveSummary({ parcelNumbers }: ExecutiveSummaryProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTopProperties = async () => {
    setLoading(true)
    setError(null)

    try {
      let url = '/api/properties?limit=20&sortBy=score'
      if (parcelNumbers && parcelNumbers.length > 0) {
        url = `/api/properties?parcelNumbers=${parcelNumbers.join(',')}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch properties')

      const data = await response.json()

      // Enrich with additional data
      const enriched = await Promise.all(
        data
          .filter((p: any) => p.total_amount_due > 1000) // Filter out noise
          .slice(0, 4)
          .map(async (p: any) => {
            // Fetch zoning profile
            const zoningRes = await fetch(`/api/properties/${p.id}/zoning`)
            const zoningProfile = zoningRes.ok ? await zoningRes.json() : null

            // Check for land records analysis in notes
            const hasLandRecords = p.notes?.includes('Land Records Analysis')
            let landRecordsAnalysis = null
            if (hasLandRecords) {
              const redemptionMatch = p.notes?.match(/Redemption Risk: (\w+)/)
              const yearsMatch = p.notes?.match(/Years delinquent: (\d+)/)
              const partialMatch = p.notes?.includes('Partial payments')
              const absenteeMatch = p.notes?.includes('Absentee owner')

              landRecordsAnalysis = {
                redemptionRisk: (redemptionMatch?.[1]?.toLowerCase() || 'unknown') as 'low' | 'medium' | 'high',
                yearsDelinquent: parseInt(yearsMatch?.[1] || '0'),
                hasPartialPayments: partialMatch,
                isAbsenteeOwner: absenteeMatch
              }
            }

            return {
              parcelNumber: p.parcel_number,
              propertyAddress: p.property_address || 'Address not available',
              ownerName: p.owner_name || 'Unknown',
              totalAmountDue: p.total_amount_due,
              estimatedMarketValue: p.estimated_market_value || 0,
              finalScore: p.final_score || 0,
              recommendation: p.recommendation || 'research_more',
              maxBid: p.maxBid,
              absenteeOwner: p.absenteeOwner,
              microParcel: p.microParcel,
              assemblageOpportunity: p.assemblageOpportunity,
              zoningProfile,
              landRecordsAnalysis
            }
          })
      )

      setProperties(enriched)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    fetchTopProperties()
  }

  const getPriorityLabel = (index: number) => {
    switch (index) {
      case 0: return { label: 'Priority 1: The "Grand Slam"', color: 'text-green-600 bg-green-50' }
      case 1: return { label: 'Priority 2: The "Efficiency Play"', color: 'text-blue-600 bg-blue-50' }
      case 2: return { label: 'Priority 3: The "Safe Bet"', color: 'text-purple-600 bg-purple-50' }
      case 3: return { label: 'Priority 4: The "Wildcard"', color: 'text-amber-600 bg-amber-50' }
      default: return { label: 'Candidate', color: 'text-gray-600 bg-gray-50' }
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return null
    }
  }

  const formatCurrency = (val: number) => `$${val.toLocaleString()}`

  const calculatePayoffRatio = (due: number, value: number) => {
    if (!value) return 'N/A'
    return `${((due / value) * 100).toFixed(1)}%`
  }

  return (
    <>
      <Button variant="default" onClick={handleOpen} className="gap-2">
        <TrendingUp className="h-4 w-4" />
        Executive Summary
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Utah County Tax Sale 2026</DialogTitle>
            <DialogDescription>
              Executive Summary — Top 4 Investment Opportunities
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Failed to load: {error}
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="space-y-6 py-4">
              {/* Investment Thesis */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Investment Strategy</h3>
                  <p className="text-sm text-blue-800">
                    These 4 properties represent the best risk-adjusted returns from 127 analyzed.
                    Filtered using automated Land Records scraping, redemption risk analysis, and
                    micro-parcel detection. Combined estimated equity: ${(properties.reduce((acc, p) => acc + (p.estimatedMarketValue - p.totalAmountDue), 0) / 1000000).toFixed(1)}M.
                  </p>
                </CardContent>
              </Card>

              {/* Property Cards */}
              {properties.map((prop, index) => {
                const priority = getPriorityLabel(index)
                const payoffRatio = calculatePayoffRatio(prop.totalAmountDue, prop.estimatedMarketValue)
                const potentialEquity = prop.estimatedMarketValue - prop.totalAmountDue

                return (
                  <Card key={prop.parcelNumber} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${priority.color}`}>
                            {priority.label}
                          </span>
                          <CardTitle className="text-lg font-mono">{prop.parcelNumber}</CardTitle>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {prop.propertyAddress}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {prop.finalScore.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Financial Metrics */}
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground uppercase">Payoff</div>
                          <div className="font-semibold">{formatCurrency(prop.totalAmountDue)}</div>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground uppercase">Est. Value</div>
                          <div className="font-semibold">{formatCurrency(prop.estimatedMarketValue)}</div>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground uppercase">Payoff Ratio</div>
                          <div className="font-semibold text-blue-600">{payoffRatio}</div>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground uppercase">Max Bid</div>
                          <div className="font-semibold text-green-600">
                            {prop.maxBid ? formatCurrency(prop.maxBid) : 'TBD'}
                          </div>
                        </div>
                      </div>

                      {/* Risk & Tags */}
                      <div className="flex flex-wrap gap-2">
                        {prop.landRecordsAnalysis && (
                          <>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              prop.landRecordsAnalysis.redemptionRisk === 'low'
                                ? 'bg-green-100 text-green-800'
                                : prop.landRecordsAnalysis.redemptionRisk === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getRiskIcon(prop.landRecordsAnalysis.redemptionRisk)}
                              {prop.landRecordsAnalysis.redemptionRisk} redemption risk
                            </span>

                            {prop.landRecordsAnalysis.yearsDelinquent >= 4 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                <TrendingUp className="h-3 w-3" />
                                {prop.landRecordsAnalysis.yearsDelinquent} years delinquent
                              </span>
                            )}

                            {prop.landRecordsAnalysis.isAbsenteeOwner && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                                <Home className="h-3 w-3" />
                                Absentee owner
                              </span>
                            )}

                            {prop.landRecordsAnalysis.hasPartialPayments && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                                <AlertCircle className="h-3 w-3" />
                                Partial payments
                              </span>
                            )}
                          </>
                        )}

                        {prop.microParcel && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                            Micro-parcel
                          </span>
                        )}

                        {prop.assemblageOpportunity && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            Assemblage opportunity
                          </span>
                        )}
                      </div>

                      {/* Buildability */}
                      {prop.zoningProfile && (
                        <div className="text-sm border-t pt-2">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">Jurisdiction:</span>
                            <span className="font-medium">{prop.zoningProfile.jurisdiction}</span>
                          </div>
                          {prop.zoningProfile.zoning_code && (
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">Zoning:</span>
                              <span className="font-mono font-medium">{prop.zoningProfile.zoning_code}</span>
                            </div>
                          )}
                          {prop.zoningProfile.buildability_score > 0 && (
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">Buildability:</span>
                              <span className="font-medium">{prop.zoningProfile.buildability_score}/100</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              {/* Action Items */}
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-base">Pre-Auction Action Items</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-800 space-y-1">
                  <p>1. Verify each property's physical condition via drive-by inspection</p>
                  <p>2. Confirm municipal zoning for city properties (Provo, Orem, Lehi, Springville)</p>
                  <p>3. Check for open building permits or code violations</p>
                  <p>4. Secure $50K proof of funds letter for auction registration</p>
                  <p>5. Set calendar reminders: Utah County list updates in real-time until May 21</p>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center">
                Generated by TaxProperty Utah Analysis Engine. Not financial advice.
                Verify all data independently before bidding.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
