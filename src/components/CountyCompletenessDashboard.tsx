// County Completeness Dashboard
// Visual overview of data completeness by county

'use client'

import { useState, useEffect } from 'react'

interface CountyMetrics {
  county: string
  totalProperties: number
  physicalCompleteness: number
  valuationCompleteness: number
  locationCompleteness: number
  titleCompleteness: number
  completenessScore: number
  automationPotential: string
  manualPlaybookRequired: boolean
  derivedStatus: string
  statusLabel: string
}

interface CompletenessReport {
  counties: CountyMetrics[]
  globalCompleteness: number
  totalProperties: number
  lastUpdated: string
}

export function CountyCompletenessDashboard() {
  const [report, setReport] = useState<CompletenessReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/counties/completeness-report')
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }
      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-400">
        Loading completeness report...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Error: {error}
        <button
          onClick={fetchReport}
          className="ml-4 text-blue-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-6 text-slate-400">
        No report available
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      production: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      beta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      alpha: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
    return colors[status] || colors.pending
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Global Completeness</div>
          <div className={`text-3xl font-bold ${getScoreColor(report.globalCompleteness)}`}>
            {report.globalCompleteness}%
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Total Properties</div>
          <div className="text-3xl font-bold text-white">
            {report.totalProperties.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Counties</div>
          <div className="text-3xl font-bold text-white">
            {report.counties.length}
          </div>
        </div>
      </div>

      {/* Counties Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left p-4 text-slate-400 font-medium">County</th>
                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                <th className="text-center p-4 text-slate-400 font-medium">Properties</th>
                <th className="text-center p-4 text-slate-400 font-medium">Score</th>
                <th className="text-center p-4 text-slate-400 font-medium">Physical</th>
                <th className="text-center p-4 text-slate-400 font-medium">Valuation</th>
                <th className="text-center p-4 text-slate-400 font-medium">Location</th>
                <th className="text-center p-4 text-slate-400 font-medium">Title</th>
                <th className="text-left p-4 text-slate-400 font-medium">Automation</th>
              </tr>
            </thead>
            <tbody>
              {report.counties.map((county) => (
                <tr
                  key={county.county}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="p-4">
                    <div className="font-medium text-white capitalize">
                      {county.county.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded border ${getStatusBadge(county.derivedStatus)}`}>
                      {county.statusLabel}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-300">
                    {county.totalProperties}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden w-20">
                        <div
                          className={`h-full ${getScoreBarColor(county.completenessScore)}`}
                          style={{ width: `${county.completenessScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getScoreColor(county.completenessScore)}`}>
                        {county.completenessScore}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-sm ${getScoreColor(county.physicalCompleteness)}`}>
                      {county.physicalCompleteness}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-sm ${getScoreColor(county.valuationCompleteness)}`}>
                      {county.valuationCompleteness}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-sm ${getScoreColor(county.locationCompleteness)}`}>
                      {county.locationCompleteness}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-sm ${getScoreColor(county.titleCompleteness)}`}>
                      {county.titleCompleteness}%
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 capitalize">
                        {county.automationPotential}
                      </span>
                      {county.manualPlaybookRequired && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Playbook
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>{'>= 85% (Production)'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>60-84% (Beta)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>40-59% (Alpha)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>&lt; 40% (Pending)</span>
        </div>
      </div>
    </div>
  )
}
