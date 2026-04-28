'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ZoningAutoFillButtonProps {
  propertyId: string
  onSuccess?: () => void
}

export default function ZoningAutoFillButton({ propertyId, onSuccess }: ZoningAutoFillButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: any
    results?: any
    zoningProfile?: any
  } | null>(null)

  const handleAutoFill = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/zoning/auto-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      setResult(data)

      if (data.success && onSuccess) {
        onSuccess()
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to fetch zoning data. Please try again or enter manually.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAutoFill}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⟳</span>
            Fetching Zoning Data...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>🌐</span>
            Auto-fill Zoning (AGRC + Utah County)
          </span>
        )}
      </Button>

      {result && (
        <div className={`p-3 rounded text-sm ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className={`font-medium ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
            {result.success ? '✓ Success' : '⚠ Partial Data'}
          </div>
          <div className={`mt-1 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
            {result.message}
          </div>

          {result.success && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page to See Updated Zoning Data
              </Button>
            </div>
          )}

          {result.data && (
            <div className="mt-3 space-y-2 text-xs">
              {/* Jurisdiction */}
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[100px]">Jurisdiction:</span>
                <span>
                  {result.data.isUnincorporated ? (
                    <span className="text-green-600">Unincorporated Utah County</span>
                  ) : (
                    <span className="text-orange-600">{result.data.jurisdiction} (City)</span>
                  )}
                </span>
              </div>

              {/* Zone */}
              {result.data.zoneCode && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[100px]">Zone:</span>
                  <span>{result.data.zoneCode} {result.data.zoneName ? `- ${result.data.zoneName}` : ''}</span>
                </div>
              )}

              {/* Buildability */}
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[100px]">Buildability:</span>
                <span>
                  Score: {result.data.buildabilityScore}/100
                  {result.data.buildabilityScore >= 70 && ' ✓ Good'}
                  {result.data.buildabilityScore < 40 && ' ⚠ Poor'}
                </span>
              </div>

              {/* Use Ideas */}
              {result.data.useIdeas?.ideas?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[100px]">Use Ideas:</span>
                  <ul className="list-disc list-inside">
                    {result.data.useIdeas.ideas.slice(0, 3).map((idea: string, i: number) => (
                      <li key={i}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.results?.warnings?.length > 0 && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <div className="font-medium text-orange-800">Notes:</div>
                  <ul className="list-disc list-inside text-orange-700">
                    {result.results.warnings.map((warning: string, i: number) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags */}
              {result.data.useIdeas?.redFlags?.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-red-800">⚠ Red Flags:</div>
                  <ul className="list-disc list-inside text-red-700">
                    {result.data.useIdeas.redFlags.map((flag: string, i: number) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {result.data.useIdeas?.nextSteps && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-medium text-blue-800">Recommended Next Steps:</div>
                  <div className="text-blue-700">{result.data.useIdeas.nextSteps}</div>
                </div>
              )}

              {/* Sources */}
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="text-gray-500">Data Sources:</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <a
                    href="https://maps.utahcounty.gov/CommDev/Zoning/Zoning.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Utah County Zoning Map
                  </a>
                  <a
                    href="https://opendata.gis.utah.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    AGRC Open Data
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
