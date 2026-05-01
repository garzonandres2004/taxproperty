'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  FileSearch,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Clock,
  Shield,
  DollarSign,
  Users,
  Home,
  FileText,
  FileCheck,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface TitleAnalysisProps {
  propertyId: string
  parcelNumber: string
}

interface TitleAnalysisData {
  id: string
  score: number
  recommendation: 'clean' | 'caution' | 'danger' | 'avoid'
  summary: string
  redFlags: Array<{
    type: string
    severity: 'critical' | 'high' | 'medium'
    description: string
    documentRef: string
    date: string
  }>
  yellowFlags: Array<{
    type: string
    description: string
    documentRef: string
    date: string
  }>
  greenFlags: Array<{
    type: string
    description: string
    documentRef: string
    date: string
  }>
  ownershipChain: Array<{
    date: string
    from: string
    to: string
    type: string
    documentRef: string
  }>
  activeLiens: Array<{
    type: string
    holder: string
    amount?: string
    date: string
    documentRef: string
    survivesTaxDeed: boolean
  }>
  mortgageStatus: 'paid_off' | 'active' | 'unclear'
  lastCleanTransfer: string | null
  yearsSameOwner: number | null
  titleComplexity: 'simple' | 'moderate' | 'complex'
  estimatedQuietTitleCost: number
  recommendedActions: string[]
  documentCount: number
  analyzedAt: Date
  // PDF Analysis
  pdfAnalyses?: Array<{
    entry: string
    year: string
    analysis: {
      documentType: string
      grantor?: string
      grantee?: string
      consideration?: string
      keyFindings: string[]
      warnings: string[]
      isComplete: boolean
    } | null
  }>
  pdfWarnings?: string[]
  hasPDFCriticalIssues?: boolean
}

export function TitleAnalysisCard({ propertyId, parcelNumber }: TitleAnalysisProps) {
  const [analysis, setAnalysis] = useState<TitleAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deepAnalysis, setDeepAnalysis] = useState(false)

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/title-analysis`)
      const data = await res.json()

      if (data.success) {
        setAnalysis(data.analysis)
        setError(null)
      } else {
        setError(data.error || 'No analysis found')
      }
    } catch (err) {
      setError('Failed to fetch analysis')
    }
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const url = `/api/properties/${propertyId}/title-analysis${deepAnalysis ? '?analyzePDFs=true' : ''}`
      const res = await fetch(url, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        setAnalysis(data.analysis)
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError('Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 text-white'
    if (score >= 60) return 'bg-yellow-500 text-white'
    if (score >= 40) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'clean': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'danger': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'avoid': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'clean': return <CheckCircle className="h-5 w-5" />
      case 'caution': return <AlertCircle className="h-5 w-5" />
      case 'danger': return <AlertTriangle className="h-5 w-5" />
      case 'avoid': return <XCircle className="h-5 w-5" />
    }
  }

  if (!analysis && !loading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Title Analysis
          </CardTitle>
          <CardDescription>
            Automated analysis of recorded documents for this property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              No title analysis has been run yet. This will scrape recorded documents
              from Utah County Land Records and analyze the title chain.
            </p>

            {/* Deep Analysis Option */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <input
                type="checkbox"
                id="deepAnalysis"
                checked={deepAnalysis}
                onChange={(e) => setDeepAnalysis(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="deepAnalysis" className="text-sm text-slate-600 cursor-pointer">
                Deep analysis with document review (slower, more thorough)
              </label>
            </div>

            <Button onClick={runAnalysis} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Run Title Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Title Analysis
            </CardTitle>
            <CardDescription>
              {analysis && (
                <span className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  Last analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={deepAnalysis}
                onChange={(e) => setDeepAnalysis(e.target.checked)}
                className="rounded border-slate-300"
              />
              Deep
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Re-analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <>
            {/* Score and Recommendation */}
            <div className="flex items-center gap-6">
              <div className={cn(
                'w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold',
                getScoreColor(analysis.score)
              )}>
                <span className="text-2xl">{analysis.score}</span>
                <span className="text-[10px] uppercase">Score</span>
              </div>
              <div>
                <Badge className={cn('text-sm px-3 py-1', getRecommendationColor(analysis.recommendation))}>
                  {getRecommendationIcon(analysis.recommendation)}
                  <span className="ml-2 capitalize">{analysis.recommendation}</span>
                </Badge>
                <p className="text-sm text-slate-600 mt-2 max-w-md">
                  {analysis.summary}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase">
                  <FileText className="h-3 w-3" />
                  Documents
                </div>
                <p className="text-lg font-bold">{analysis.documentCount}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase">
                  <Home className="h-3 w-3" />
                  Mortgage Status
                </div>
                <p className="text-lg font-bold capitalize">
                  {analysis.mortgageStatus.replace('_', ' ')}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase">
                  <Users className="h-3 w-3" />
                  Years Owned
                </div>
                <p className="text-lg font-bold">
                  {analysis.yearsSameOwner || 'Unknown'}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase">
                  <DollarSign className="h-3 w-3" />
                  Est. Quiet Title Cost
                </div>
                <p className="text-lg font-bold">
                  ${analysis.estimatedQuietTitleCost?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Red Flags */}
            {analysis.redFlags.length > 0 && (
              <Alert variant="destructive" className="border-red-300 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">
                  {analysis.redFlags.length} Red Flag{analysis.redFlags.length > 1 ? 's' : ''} Found
                </AlertTitle>
                <AlertDescription className="text-red-700">
                  <ul className="mt-2 space-y-1">
                    {analysis.redFlags.map((flag, i) => (
                      <li key={i} className="text-sm">
                        • {flag.description} ({flag.documentRef})
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Yellow Flags */}
            {analysis.yellowFlags.length > 0 && (
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">
                  {analysis.yellowFlags.length} Item{analysis.yellowFlags.length > 1 ? 's' : ''} Need Review
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  <ul className="mt-2 space-y-1">
                    {analysis.yellowFlags.slice(0, 3).map((flag, i) => (
                      <li key={i} className="text-sm">
                        • {flag.description} ({flag.documentRef})
                      </li>
                    ))}
                    {analysis.yellowFlags.length > 3 && (
                      <li className="text-sm italic">
                        ...and {analysis.yellowFlags.length - 3} more
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Green Flags */}
            {analysis.greenFlags.length > 0 && (
              <Alert className="border-emerald-300 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-800">
                  {analysis.greenFlags.length} Positive Finding{analysis.greenFlags.length > 1 ? 's' : ''}
                </AlertTitle>
                <AlertDescription className="text-emerald-700">
                  <ul className="mt-2 space-y-1">
                    {analysis.greenFlags.slice(0, 3).map((flag, i) => (
                      <li key={i} className="text-sm">
                        • {flag.description}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Active Liens */}
            {analysis.activeLiens.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Active Liens
                </h4>
                <div className="space-y-2">
                  {analysis.activeLiens.map((lien, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>
                        {lien.type} - {lien.holder}
                      </span>
                      {lien.survivesTaxDeed && (
                        <Badge variant="destructive" className="text-xs">
                          Survives Tax Deed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {analysis.recommendedActions.length > 0 && (
              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-semibold mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {analysis.recommendedActions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-slate-400">{i + 1}.</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PDF Analysis Results */}
            {analysis.pdfAnalyses && analysis.pdfAnalyses.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  Document PDF Analysis ({analysis.pdfAnalyses.length} reviewed)
                </h4>

                {/* PDF Warnings */}
                {analysis.pdfWarnings && analysis.pdfWarnings.length > 0 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      ⚠️ Warnings from actual document review:
                    </p>
                    <ul className="space-y-1">
                      {analysis.pdfWarnings.map((warning, i) => (
                        <li key={i} className="text-sm text-amber-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* PDF Analysis Details */}
                <div className="space-y-2">
                  {analysis.pdfAnalyses.slice(0, 3).map((pdf, i) => (
                    <div key={i} className="text-sm p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-3 w-3" />
                        {pdf.entry}-{pdf.year}
                        {pdf.analysis?.isComplete ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      {pdf.analysis?.keyFindings && pdf.analysis.keyFindings.length > 0 && (
                        <div className="mt-1 pl-5 text-slate-600">
                          {pdf.analysis.keyFindings.slice(0, 2).map((finding, j) => (
                            <div key={j} className="text-xs">• {finding}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {analysis.pdfAnalyses.length > 3 && (
                    <p className="text-xs text-slate-500 pl-2">
                      ...and {analysis.pdfAnalyses.length - 3} more documents analyzed
                    </p>
                  )}
                </div>

                {/* Link to view documents */}
                <div className="mt-3 pt-3 border-t">
                  <a
                    href={`https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelNumber.replace(/:/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View all documents on Utah County Records
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
