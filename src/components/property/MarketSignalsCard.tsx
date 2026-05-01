'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, TrendingUp, Home, DollarSign, Edit2, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/ui-utils'
import { calculateValueGap } from '@/lib/third-party-enrichment'

interface MarketSignalsCardProps {
  propertyId: string
  countyValue: number | null
  enrichment: {
    id: string
    zillow_url: string | null
    zillow_zpid: string | null
    zillow_zestimate: number | null
    zillow_rent_estimate: number | null
    zillow_beds: number | null
    zillow_baths: number | null
    zillow_sqft: number | null
    zillow_confidence: string | null
    zillow_last_synced: Date | string | null
  } | null
}

export function MarketSignalsCard({ propertyId, countyValue, enrichment }: MarketSignalsCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    zillow_url: enrichment?.zillow_url || '',
    zillow_zpid: enrichment?.zillow_zpid || '',
    zillow_zestimate: enrichment?.zillow_zestimate?.toString() || '',
    zillow_rent_estimate: enrichment?.zillow_rent_estimate?.toString() || '',
    zillow_beds: enrichment?.zillow_beds?.toString() || '',
    zillow_baths: enrichment?.zillow_baths?.toString() || '',
    zillow_sqft: enrichment?.zillow_sqft?.toString() || '',
    zillow_confidence: enrichment?.zillow_confidence || ''
  })

  const { gapPercent, label, color } = calculateValueGap(countyValue, enrichment?.zillow_zestimate)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/third-party`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zillow_url: formData.zillow_url || undefined,
          zillow_zpid: formData.zillow_zpid || undefined,
          zillow_zestimate: formData.zillow_zestimate ? Number(formData.zillow_zestimate) : undefined,
          zillow_rent_estimate: formData.zillow_rent_estimate ? Number(formData.zillow_rent_estimate) : undefined,
          zillow_beds: formData.zillow_beds ? Number(formData.zillow_beds) : undefined,
          zillow_baths: formData.zillow_baths ? Number(formData.zillow_baths) : undefined,
          zillow_sqft: formData.zillow_sqft ? Number(formData.zillow_sqft) : undefined,
          zillow_confidence: formData.zillow_confidence || undefined
        })
      })

      if (response.ok) {
        setIsEditing(false)
        // Reload page to show updated data (Server Component refresh)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null
    const colors: Record<string, string> = {
      high: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-red-100 text-red-700'
    }
    return (
      <Badge className={colors[confidence] || 'bg-slate-100 text-slate-700'}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
      </Badge>
    )
  }

  if (isEditing) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Market Signals (Third-Party)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Add Zillow market data manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-slate-300">Zillow URL</Label>
              <Input
                value={formData.zillow_url}
                onChange={(e) => setFormData({ ...formData, zillow_url: e.target.value })}
                placeholder="https://www.zillow.com/..."
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Zillow ZPID</Label>
              <Input
                value={formData.zillow_zpid}
                onChange={(e) => setFormData({ ...formData, zillow_zpid: e.target.value })}
                placeholder="e.g., 12345678"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Confidence</Label>
              <select
                value={formData.zillow_confidence}
                onChange={(e) => setFormData({ ...formData, zillow_confidence: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100"
              >
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Zestimate ($)</Label>
              <Input
                type="number"
                value={formData.zillow_zestimate}
                onChange={(e) => setFormData({ ...formData, zillow_zestimate: e.target.value })}
                placeholder="390000"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Rent Estimate ($/mo)</Label>
              <Input
                type="number"
                value={formData.zillow_rent_estimate}
                onChange={(e) => setFormData({ ...formData, zillow_rent_estimate: e.target.value })}
                placeholder="1850"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Beds</Label>
              <Input
                type="number"
                value={formData.zillow_beds}
                onChange={(e) => setFormData({ ...formData, zillow_beds: e.target.value })}
                placeholder="3"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Baths</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.zillow_baths}
                onChange={(e) => setFormData({ ...formData, zillow_baths: e.target.value })}
                placeholder="2"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Sqft</Label>
              <Input
                type="number"
                value={formData.zillow_sqft}
                onChange={(e) => setFormData({ ...formData, zillow_sqft: e.target.value })}
                placeholder="1500"
                className="bg-slate-900 border-slate-600 text-slate-100"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-600 text-slate-300">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Market Signals (Third-Party)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Zillow market reference data
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="border-slate-600 text-slate-300">
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrichment?.zillow_zestimate ? (
          <>
            {/* Comparison Row */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 rounded-lg">
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  County Value (Official)
                </div>
                <div className="text-lg font-bold text-slate-200">
                  {countyValue ? formatCurrency(countyValue) : <span className="text-slate-500 text-sm">Not available</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Zestimate (Third-party)
                </div>
                <div className="text-lg font-bold text-blue-400">
                  {formatCurrency(enrichment.zillow_zestimate)}
                </div>
              </div>
            </div>

            {/* Value Gap */}
            {gapPercent !== null && (
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <span className="text-sm text-slate-400">Value Gap</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${color}`}>
                    {gapPercent > 0 ? '+' : ''}{gapPercent.toFixed(1)}%
                  </span>
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs" title={`Zillow is ${gapPercent > 0 ? 'higher' : 'lower'} than county value`}>
                    {label}
                  </Badge>
                </div>
              </div>
            )}

            {/* Rent Estimate */}
            {enrichment.zillow_rent_estimate && (
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Rent Estimate</span>
                </div>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(enrichment.zillow_rent_estimate)}/mo
                </span>
              </div>
            )}

            {/* Property Facts */}
            {(enrichment.zillow_beds || enrichment.zillow_baths || enrichment.zillow_sqft) && (
              <div className="flex flex-wrap gap-2">
                {enrichment.zillow_beds && (
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {enrichment.zillow_beds} beds
                  </Badge>
                )}
                {enrichment.zillow_baths && (
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {enrichment.zillow_baths} baths
                  </Badge>
                )}
                {enrichment.zillow_sqft && (
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {enrichment.zillow_sqft.toLocaleString()} sqft
                  </Badge>
                )}
              </div>
            )}

            {/* Confidence & Last Synced */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getConfidenceBadge(enrichment.zillow_confidence)}
                <Badge variant="outline" className="border-slate-600 text-slate-500 text-xs">
                  Manual Zillow Entry
                </Badge>
              </div>
              {enrichment.zillow_last_synced && (
                <span className="text-xs text-slate-500">
                  Updated: {enrichment.zillow_last_synced instanceof Date
                    ? enrichment.zillow_last_synced.toLocaleDateString()
                    : new Date(enrichment.zillow_last_synced).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Open Zillow Button */}
            {enrichment.zillow_url && (
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <a href={enrichment.zillow_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Zillow
                </a>
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-400 mb-4">No third-party market data yet.</p>
            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-slate-600 text-slate-300">
              <Edit2 className="h-4 w-4 mr-2" />
              Add Zillow Data
            </Button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 italic border-t border-slate-700 pt-3">
          Market signals shown here are third-party references and may differ from county-assessed values.
          Not investment advice.
        </p>
      </CardContent>
    </Card>
  )
}
