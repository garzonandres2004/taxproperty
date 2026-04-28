'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Property {
  id: string
  parcel_number: string
  county: string
  property_type: string
  total_amount_due: number | null
  estimated_market_value: number | null
  opportunity_score: number | null
  risk_score: number | null
  final_score: number | null
  recommendation: string | null
  status: string
  capitalFit: {
    score: number
    budgetUsagePercent: number
    estimatedTotalCost: number
  }
}

interface PropertiesTableProps {
  properties: Property[]
}

export default function PropertiesTable({ properties }: PropertiesTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const toggleAll = () => {
    if (selected.size === properties.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(properties.map(p => p.id)))
    }
  }

  const getRecommendationColor = (rec: string | null) => {
    switch (rec) {
      case 'bid': return 'bg-green-100 text-green-800 border-green-200'
      case 'research_more': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'avoid': return 'bg-red-100 text-red-800 border-red-200'
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

  const getCapitalFitColor = (score: number, budgetUsage: number) => {
    if (score === 0) return 'bg-red-100 text-red-800 border-red-200'
    if (score <= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (budgetUsage > 50) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getCapitalFitLabel = (score: number, budgetUsage: number) => {
    if (score === 0) return 'Over'
    if (score <= 5) return 'Tight'
    if (budgetUsage > 50) return 'Mod'
    return 'Good'
  }

  // Score color functions - consistent scale
  // Opp Score: 0-40 red, 41-65 amber, 66-80 blue, 81-100 green
  const getOppScoreColor = (score: number | null) => {
    if (!score) return ''
    if (score <= 40) return 'text-red-600 font-semibold'
    if (score <= 65) return 'text-amber-600 font-semibold'
    if (score <= 80) return 'text-blue-600 font-semibold'
    return 'text-green-600 font-semibold'
  }

  // Risk Score: INVERSE - lower is better
  // 0-30 green (low risk), 31-50 blue (moderate), 51-70 amber (elevated), 71-100 red (high)
  const getRiskScoreColor = (score: number | null) => {
    if (!score) return ''
    if (score <= 30) return 'text-green-600 font-semibold'
    if (score <= 50) return 'text-blue-600 font-semibold'
    if (score <= 70) return 'text-amber-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  // Final Score: same scale as Opp Score
  const getFinalScoreColor = (score: number | null) => {
    if (!score) return ''
    if (score <= 40) return 'text-red-600 font-semibold'
    if (score <= 65) return 'text-amber-600 font-semibold'
    if (score <= 80) return 'text-blue-600 font-semibold'
    return 'text-green-600 font-semibold'
  }

  const selectedIds = Array.from(selected).join(',')

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {selected.size} of {properties.length} selected
          </span>
          {selected.size > 0 && (
            <Link
              href={`/reports?ids=${selectedIds}`}
              target="_blank"
            >
              <Button variant="outline" size="sm">
                Generate Report
              </Button>
            </Link>
          )}
        </div>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear Selection
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr className="text-left">
              <th className="px-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === properties.length && properties.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 font-medium">Parcel #</th>
              <th className="px-4 py-3 font-medium">County</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount Due</th>
              <th className="px-4 py-3 font-medium">Est. Value</th>
              <th className="px-4 py-3 font-medium">Opp Score</th>
              <th className="px-4 py-3 font-medium">Risk Score</th>
              <th className="px-4 py-3 font-medium">Final</th>
              <th className="px-4 py-3 font-medium">Cap Fit</th>
              <th className="px-4 py-3 font-medium">Recommendation</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {properties.map((prop) => (
              <tr key={prop.id} className="hover:bg-gray-50">
                <td className="px-2 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(prop.id)}
                    onChange={() => toggleSelection(prop.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/properties/${prop.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {prop.parcel_number}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{prop.county.replace('_', ' ')}</td>
                <td className="px-4 py-3 capitalize">{prop.property_type.replace('_', ' ')}</td>
                <td className="px-4 py-3">${prop.total_amount_due?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3">${prop.estimated_market_value?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3">
                  <span className={getOppScoreColor(prop.opportunity_score)}>
                    {prop.opportunity_score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={getRiskScoreColor(prop.risk_score)}>
                    {prop.risk_score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={getFinalScoreColor(prop.final_score)}>
                    {prop.final_score}
                  </span>
                </td>
                <td className="px-4 py-3" title={`${prop.capitalFit.budgetUsagePercent.toFixed(0)}% of budget`}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCapitalFitColor(prop.capitalFit.score, prop.capitalFit.budgetUsagePercent)}`}>
                    {getCapitalFitLabel(prop.capitalFit.score, prop.capitalFit.budgetUsagePercent)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRecommendationColor(prop.recommendation)}`}>
                    {(prop.recommendation || '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(prop.status)}`}>
                    {prop.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {properties.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No properties found.{' '}
          <Link href="/new" className="text-blue-600 hover:underline">
            Add your first property
          </Link>.
        </div>
      )}
    </div>
  )
}
