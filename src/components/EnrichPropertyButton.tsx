'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, MapPin, DollarSign, Image as ImageIcon } from 'lucide-react'

interface EnrichPropertyButtonProps {
  propertyId: string
  county?: string
  onSuccess?: () => void
}

export default function EnrichPropertyButton({ propertyId, county, onSuccess }: EnrichPropertyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    enrichment?: {
      estimated_market_value?: number | null
      latitude?: number | null
      longitude?: number | null
      zoning?: string | null
      jurisdiction?: string | null
      confidence?: number
      data_source?: string
      notes?: string
    }
    images?: { streetViewUrl?: string; aerialUrl?: string }
  } | null>(null)

  const handleEnrich = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/enrich`, {
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
        message: 'Failed to enrich property data. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const getCountyLabel = () => {
    switch (county) {
      case 'tooele': return 'Tooele County'
      case 'utah': return 'Utah County'
      default: return 'County'
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleEnrich}
        disabled={loading}
        variant="outline"
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enriching from {getCountyLabel()}...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Auto-Enrich Property Data
          </span>
        )}
      </Button>

      {result && (
        <div className={`p-4 rounded-lg text-sm ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className={`font-medium ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
            {result.success ? '✓ Enrichment Complete' : '⚠ Partial Success'}
          </div>
          <div className={`mt-1 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
            {result.message}
          </div>

          {result.enrichment && (
            <div className="mt-4 space-y-3">
              {/* Market Value */}
              {result.enrichment.estimated_market_value && (
                <div className="flex items-center gap-3 p-2 bg-white rounded border">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Market Value: ${result.enrichment.estimated_market_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Source: {result.enrichment.data_source || 'County Records'}
                    </div>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              {result.enrichment.latitude && result.enrichment.longitude && (
                <div className="flex items-center gap-3 p-2 bg-white rounded border">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Coordinates: {result.enrichment.latitude.toFixed(6)}, {result.enrichment.longitude.toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      For Street View and mapping
                    </div>
                  </div>
                </div>
              )}

              {/* Jurisdiction */}
              {result.enrichment.jurisdiction && (
                <div className="flex items-center gap-3 p-2 bg-white rounded border">
                  <div className="h-4 w-4 rounded-full bg-amber-500" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Jurisdiction: {result.enrichment.jurisdiction}
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.enrichment.zoning || 'Zoning requires manual verification'}
                    </div>
                  </div>
                </div>
              )}

              {/* Images */}
              {result.images && (
                <div className="flex items-center gap-3 p-2 bg-white rounded border">
                  <ImageIcon className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Street View & Aerial Images
                    </div>
                    <div className="text-xs text-gray-500">
                      Generated from coordinates
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Data Confidence:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (result.enrichment.confidence || 0) >= 80 ? 'bg-green-500' :
                      (result.enrichment.confidence || 0) >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${result.enrichment.confidence || 0}%` }}
                  />
                </div>
                <span className="font-medium">{result.enrichment.confidence || 0}%</span>
              </div>

              {/* Notes */}
              {result.enrichment.notes && (
                <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <span className="font-medium">Notes: </span>
                  {result.enrichment.notes}
                </div>
              )}
            </div>
          )}

          {result.success && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page to See Updated Data
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
