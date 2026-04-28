'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, Search, CheckCircle, AlertCircle, SkipForward, Eye } from 'lucide-react'

interface AnalysisResult {
  parcelNumber: string
  propertyAddress: string
  totalPayoff: number
  marketValue: number
  redemptionRisk: 'low' | 'medium' | 'high'
  recommendation: 'bid' | 'bid_cautious' | 'research_more' | 'skip'
  maxBid?: number
  reasoning: string[]
  hasPartialPayments: boolean
  partialPaymentYears: number[]
  yearsDelinquent: number
  hasFreshHeirs: boolean
  isCondo: boolean
  landRecordsUrl: string
}

interface AnalysisSummary {
  total: number
  byRecommendation: {
    bid: number
    bid_cautious: number
    research_more: number
    skip: number
  }
  byRedemptionRisk: {
    low: number
    medium: number
    high: number
  }
}

interface AnalysisResponse {
  success: boolean
  dryRun: boolean
  duration: string
  summary: AnalysisSummary
  results: AnalysisResult[]
}

export default function LandRecordsAnalysisButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentParcel, setCurrentParcel] = useState('')
  const [results, setResults] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(true)

  const handleOpen = () => {
    setIsOpen(true)
    setResults(null)
    setError(null)
    setProgress(0)
    setCurrentParcel('')
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setResults(null)
    setError(null)
    setProgress(20)

    try {
      // Get the top candidates first
      const propsResponse = await fetch('/api/properties?limit=20&sortBy=score')
      if (!propsResponse.ok) throw new Error('Failed to fetch properties')

      const properties = await propsResponse.json()
      const topParcels = properties
        .filter((p: any) => p.total_amount_due <= 5000 && p.total_amount_due > 0)
        .slice(0, 10)
        .map((p: any) => p.parcel_number)
        .join(',')

      setProgress(40)

      // Run analysis
      const response = await fetch(
        `/api/analysis/land-records?parcelNumbers=${encodeURIComponent(topParcels)}&dryRun=${dryRun}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const data: AnalysisResponse = await response.json()
      setResults(data)
      setProgress(100)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'medium':
        return <Eye className="h-4 w-4 text-amber-500" />
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'bid':
        return 'text-green-600 bg-green-50'
      case 'bid_cautious':
        return 'text-amber-600 bg-amber-50'
      case 'research_more':
        return 'text-blue-600 bg-blue-50'
      case 'skip':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="gap-2">
        <Search className="h-4 w-4" />
        Land Records Analysis
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Utah County Land Records Analysis</DialogTitle>
            <DialogDescription>
              Automatically scrape and analyze property data from Utah County Land Records.
              Detects partial payments, fresh heirs, transfer history, and redemption risk.
            </DialogDescription>
          </DialogHeader>

          {!results && !error && !isAnalyzing && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Dry run (preview only, don't save to database)
                </label>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">What this analyzes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Tax payment history (partial payments = redemption risk)</li>
                  <li>Years of delinquency (more years = less likely to redeem)</li>
                  <li>Recent transfers (quit claim deeds, inheritances)</li>
                  <li>Fresh heirs ( affidavit of death = will redeem)</li>
                  <li>Payment patterns (sporadic vs consistent)</li>
                  <li>Condo status (HOA complexity)</li>
                </ul>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scraping Utah County Land Records...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentParcel && (
                <p className="text-sm text-muted-foreground truncate">{currentParcel}</p>
              )}
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          )}

          {error && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <p className="font-medium">Analysis failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {results && (
            <div className="py-2 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.byRecommendation.bid}
                  </div>
                  <div className="text-xs text-green-700">Bid</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {results.summary.byRecommendation.bid_cautious}
                  </div>
                  <div className="text-xs text-amber-700">Cautious</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.summary.byRecommendation.research_more}
                  </div>
                  <div className="text-xs text-blue-700">Research</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.byRecommendation.skip}
                  </div>
                  <div className="text-xs text-red-700">Skip</div>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Parcel</th>
                      <th className="text-left p-3 font-medium">Payoff</th>
                      <th className="text-left p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Risk</th>
                      <th className="text-left p-3 font-medium">Rec</th>
                      <th className="text-left p-3 font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.results.map((r) => (
                      <tr key={r.parcelNumber} className="hover:bg-muted/50">
                        <td className="p-3">
                          <a
                            href={r.landRecordsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 hover:underline"
                          >
                            {r.parcelNumber}
                          </a>
                        </td>
                        <td className="p-3">${r.totalPayoff.toLocaleString()}</td>
                        <td className="p-3">${(r.marketValue / 1000).toFixed(0)}k</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {getRiskIcon(r.redemptionRisk)}
                            <span className="capitalize">{r.redemptionRisk}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRecColor(
                              r.recommendation
                            )}`}
                          >
                            {r.recommendation.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {r.hasPartialPayments && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                Partial
                              </span>
                            )}
                            {r.hasFreshHeirs && (
                              <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                Heirs
                              </span>
                            )}
                            {r.isCondo && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                Condo
                              </span>
                            )}
                            {r.yearsDelinquent >= 4 && !r.hasPartialPayments && (
                              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                {r.yearsDelinquent}y delinq
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Analysis */}
              <div className="space-y-3">
                <h4 className="font-medium">Detailed Analysis</h4>
                {results.results.map((r) => (
                  <div key={r.parcelNumber} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-medium">{r.parcelNumber}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRecColor(
                            r.recommendation
                          )}`}
                        >
                          {r.recommendation.replace('_', ' ')}
                        </span>
                        {r.maxBid && (
                          <span className="text-sm font-medium">
                            Max bid: ${r.maxBid.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.propertyAddress || 'No address'}
                    </div>
                    <div className="text-sm space-y-1">
                      {r.reasoning.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                    {r.hasPartialPayments && r.partialPaymentYears.length > 0 && (
                      <div className="text-sm text-amber-600">
                        Partial payments in: {r.partialPaymentYears.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {results.dryRun && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                  <p className="font-medium">Dry Run Mode</p>
                  <p className="text-sm">
                    This was a preview. No changes were saved to the database. Uncheck "Dry
                    run" and run again to save results.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!results && !isAnalyzing && (
              <>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAnalyze}>Start Analysis</Button>
              </>
            )}
            {(results || error) && (
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
