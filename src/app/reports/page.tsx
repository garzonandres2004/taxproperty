'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ZoningProfile {
  jurisdiction: string
  is_unincorporated: boolean
  zoning_code: string | null
  zoning_name: string | null
  land_use_designation: string | null
  permitted_uses: string | null
  conditional_uses: string | null
  prohibited_uses: string | null
  min_lot_size_sqft: number | null
  min_lot_size_acres: number | null
  front_setback_ft: number | null
  side_setback_ft: number | null
  rear_setback_ft: number | null
  max_height_ft: number | null
  max_lot_coverage_percent: number | null
  frontage_required_ft: number | null
  has_slope_restrictions: boolean
  has_floodplain_restrictions: boolean
  has_wildfire_restrictions: boolean
  overlays: string | null
  has_legal_access: boolean
  access_type: string | null
  utilities_status: string
  water_source: string | null
  sewer_type: string | null
  slope_percent: number | null
  buildability_score: number
  buildability_notes: string | null
  best_use_ideas: string | null
  use_difficulty: string
  estimated_time_to_entitlement: string | null
  next_steps: string | null
  zoning_map_url: string | null
  data_last_verified: string | null
}

interface Property {
  id: string
  parcel_number: string
  county: string
  owner_name: string | null
  owner_mailing_address: string | null
  property_address: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  assessed_value: number | null
  lot_size_sqft: number | null
  property_type: string
  opportunity_score: number | null
  risk_score: number | null
  final_score: number | null
  recommendation: string | null
  notes: string | null
  status: string
  sources: { label: string; url: string | null }[]
  zoningProfile?: ZoningProfile | null
}

function ReportContent() {
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ids) {
      setError('No properties selected. Go back and select properties to report.')
      setLoading(false)
      return
    }

    const fetchProperties = async () => {
      try {
        const idList = ids.split(',')
        const data = await Promise.all(
          idList.map(async (id) => {
            const propRes = await fetch(`/api/properties/${id}`)
            const property = await propRes.json()
            if (property.error) return null

            // Fetch zoning profile if exists
            const zoningRes = await fetch(`/api/properties/${id}/zoning`)
            if (zoningRes.ok) {
              property.zoningProfile = await zoningRes.json()
            }
            return property
          })
        )
        setProperties(data.filter((p): p is Property => p !== null))
      } catch (err) {
        setError('Failed to load properties')
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [ids])

  const handlePrint = () => {
    window.print()
  }

  // Helper functions
  const parseJsonArray = (str: string | null): string[] => {
    if (!str) return []
    try {
      return JSON.parse(str)
    } catch {
      return []
    }
  }

  const getBuildabilityColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUseDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600'
      case 'moderate': return 'text-yellow-600'
      case 'difficult': return 'text-orange-600'
      case 'prohibitive': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getJurisdictionDisplay = (profile: ZoningProfile | null | undefined) => {
    if (!profile) return { text: 'Unknown', warning: false }
    if (profile.is_unincorporated) {
      return { text: 'Unincorporated Utah County', warning: false }
    }
    return { text: profile.jurisdiction || 'City Jurisdiction', warning: true }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <p className="text-red-600 mb-4">{error}</p>
      <Link href="/properties" className="text-blue-600 hover:underline">
        Back to Properties
      </Link>
    </div>
  )

  if (properties.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <p className="text-gray-600 mb-4">No properties found</p>
      <Link href="/properties" className="text-blue-600 hover:underline">
        Back to Properties
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls */}
      <div className="no-print fixed top-0 left-0 right-0 bg-gray-100 border-b border-gray-300 p-4 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Property Investment Report</h1>
            <p className="text-sm text-gray-600">{properties.length} properties selected</p>
          </div>
          <div className="space-x-3">
            <Link href="/properties" className="px-4 py-2 text-gray-700 hover:text-gray-900">
              Cancel
            </Link>
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-5xl mx-auto p-8 pt-24 print:pt-0">
        {/* Header */}
        <header className="mb-8 border-b-2 border-gray-900 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Tax Sale Investment Report</h1>
          <p className="text-gray-600 mt-1">
            Generated {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-gray-600">{properties.length} properties • Utah County Tax Sale 2026</p>
        </header>

        {/* Executive Summary Table */}
        <section className="mb-10 print:mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-900 border-b border-gray-400 pb-2">Executive Summary</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-2 font-semibold">#</th>
                <th className="text-left py-2 font-semibold">Parcel</th>
                <th className="text-left py-2 font-semibold">Address</th>
                <th className="text-right py-2 font-semibold">Payoff</th>
                <th className="text-right py-2 font-semibold">Est. Value</th>
                <th className="text-center py-2 font-semibold">Score</th>
                <th className="text-left py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p, idx) => {
                const ratio = p.estimated_market_value && p.total_amount_due
                  ? (p.total_amount_due / p.estimated_market_value * 100).toFixed(1)
                  : 'N/A'
                return (
                  <tr key={p.id} className="border-b border-gray-300">
                    <td className="py-2 font-semibold">{idx + 1}</td>
                    <td className="py-2 font-mono text-xs">{p.parcel_number}</td>
                    <td className="py-2 text-xs truncate max-w-[200px]">{p.property_address || 'N/A'}</td>
                    <td className="py-2 text-right">{p.total_amount_due?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || 'N/A'}</td>
                    <td className="py-2 text-right">{p.estimated_market_value?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) || 'N/A'}</td>
                    <td className="py-2 text-center font-bold">{p.final_score?.toFixed(0) || 'N/A'}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        p.recommendation === 'bid' ? 'bg-green-100 text-green-800' :
                        p.recommendation === 'research_more' ? 'bg-yellow-100 text-yellow-800' :
                        p.recommendation === 'avoid' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.recommendation === 'bid' ? 'BID' :
                         p.recommendation === 'research_more' ? 'RESEARCH' :
                         p.recommendation === 'avoid' ? 'AVOID' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* PORTFOLIO OVERVIEW */}
        <section className="mb-12 print:mb-8 border-t-2 border-gray-900 pt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-xs text-gray-600 uppercase tracking-wide">Total Properties</div>
              <div className="text-2xl font-bold">{properties.length}</div>
              <div className="text-xs text-gray-500">in this report</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-xs text-gray-600 uppercase tracking-wide">BID Recommended</div>
              <div className="text-2xl font-bold text-green-600">
                {properties.filter(p => p.recommendation === 'bid').length}
              </div>
              <div className="text-xs text-gray-500">properties</div>
            </div>
            <div className="bg-amber-50 p-4 rounded">
              <div className="text-xs text-gray-600 uppercase tracking-wide">Total Payoff Required</div>
              <div className="text-2xl font-bold text-amber-600">
                ${Math.round(properties
                  .filter(p => p.recommendation === 'bid')
                  .reduce((sum, p) => sum + (p.total_amount_due || 0), 0)
                ).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">all BID properties</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-xs text-gray-600 uppercase tracking-wide">Combined Est. Value</div>
              <div className="text-2xl font-bold text-purple-600">
                ${Math.round(properties
                  .filter(p => p.recommendation === 'bid')
                  .reduce((sum, p) => sum + (p.estimated_market_value || 0), 0) / 1000000
                ).toFixed(1)}M
              </div>
              <div className="text-xs text-gray-500">market value</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded mb-4">
            <div className="grid grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Average Payoff Ratio</div>
                <div className="text-xl font-bold">
                  {(properties
                    .filter(p => p.recommendation === 'bid' && (p.estimated_market_value || 0) > 0 && p.total_amount_due)
                    .reduce((sum, p) => sum + ((p.total_amount_due || 0) / (p.estimated_market_value || 1) * 100), 0) /
                    properties.filter(p => p.recommendation === 'bid' && (p.estimated_market_value || 0) > 0).length || 1
                  ).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Average Score</div>
                <div className="text-xl font-bold">
                  {(properties
                    .filter(p => p.recommendation === 'bid')
                    .reduce((sum, p) => sum + (p.final_score || 0), 0) /
                    properties.filter(p => p.recommendation === 'bid').length || 1
                  ).toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Auction Date</div>
                <div className="text-xl font-bold">May 21, 2026</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Generated</div>
                <div className="text-xl font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Utah County Tax Sale • Generated {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </section>

        {/* Individual Property Reports */}
        {properties.map((property, idx) => {
          const zoning = property.zoningProfile
          const jurisdiction = getJurisdictionDisplay(zoning)

          return (
            <section key={property.id} className="mb-12 print:mb-8 border-t-2 border-gray-900 pt-6 print:break-before-page">
              {/* Property Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">Property #{idx + 1}</h2>
                    <span className="text-2xl font-mono font-bold text-blue-600">{property.parcel_number}</span>
                  </div>
                  <p className="text-lg text-gray-700 mt-1">{property.property_address || 'Address not available'}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{property.final_score?.toFixed(0) || 'N/A'}</div>
                  <div className="text-sm text-gray-500">Investment Score</div>
                </div>
              </div>

              {/* SECTION 1: Investment Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4">1. Investment Summary</h3>
                <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total Due</div>
                    <div className="text-xl font-bold">{property.total_amount_due?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Est. Market Value</div>
                    <div className="text-xl font-bold">{property.estimated_market_value?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Payoff Ratio</div>
                    <div className="text-xl font-bold">
                      {property.estimated_market_value && property.total_amount_due
                        ? (property.total_amount_due / property.estimated_market_value * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Lot Size</div>
                    <div className="text-xl font-bold">
                      {property.lot_size_sqft ? (property.lot_size_sqft / 43560).toFixed(2) + ' acres' : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Owner</div>
                    <div className="font-semibold">{property.owner_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Property Type</div>
                    <div className="font-semibold capitalize">{property.property_type?.replace(/_/g, ' ') || 'N/A'}</div>
                  </div>
                </div>

                {/* Property Notes / Analysis */}
                {property.notes && (
                  <div className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Analysis Notes</div>
                    <div className="text-sm whitespace-pre-wrap text-gray-800">{property.notes}</div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Land Use & Zoning */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4">2. Land Use & Zoning</h3>

                {jurisdiction.warning && (
                  <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600">⚠️</span>
                      <div>
                        <div className="font-semibold text-yellow-800">City Jurisdiction</div>
                        <div className="text-sm text-yellow-700">This property is within city limits. Use municipal zoning sources, not Utah County.</div>
                      </div>
                    </div>
                  </div>
                )}

                {!zoning ? (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                    <p className="text-blue-800 font-medium">Zoning analysis not yet completed.</p>
                    <p className="text-sm text-blue-600 mt-1">Check Utah County Zoning Map: https://maps.utahcounty.gov/CommDev/Zoning/Zoning.html</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Jurisdiction</div>
                        <div className="font-semibold">{jurisdiction.text}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Zoning Code</div>
                        <div className="font-semibold font-mono">{zoning.zoning_code || 'TBD'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Zoning Name</div>
                        <div className="font-semibold">{zoning.zoning_name || 'TBD'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Land Use Designation</div>
                      <div className="font-semibold">{zoning.land_use_designation || 'To be determined'}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Permitted Uses</div>
                        <ul className="text-sm space-y-1">
                          {parseJsonArray(zoning.permitted_uses).slice(0, 3).map((use, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-600">✓</span> {use}
                            </li>
                          ))}
                          {parseJsonArray(zoning.permitted_uses).length === 0 && <li className="text-gray-400 italic">Not yet documented</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Conditional Uses</div>
                        <ul className="text-sm space-y-1">
                          {parseJsonArray(zoning.conditional_uses).slice(0, 3).map((use, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-yellow-600">~</span> {use}
                            </li>
                          ))}
                          {parseJsonArray(zoning.conditional_uses).length === 0 && <li className="text-gray-400 italic">None documented</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Prohibited Uses</div>
                        <ul className="text-sm space-y-1">
                          {parseJsonArray(zoning.prohibited_uses).slice(0, 3).map((use, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-600">✗</span> {use}
                            </li>
                          ))}
                          {parseJsonArray(zoning.prohibited_uses).length === 0 && <li className="text-gray-400 italic">Standard restrictions</li>}
                        </ul>
                      </div>
                    </div>

                    {zoning.data_last_verified && (
                      <div className="text-xs text-gray-500 mt-2">
                        Data verified: {new Date(zoning.data_last_verified).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: Building Rules */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4">3. Building Rules & Requirements</h3>
                {!zoning ? (
                  <p className="text-gray-500 italic">Building rules data pending zoning analysis.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Min Lot Size</div>
                      <div className="font-semibold">
                        {zoning.min_lot_size_acres ? `${zoning.min_lot_size_acres.toFixed(2)} acres` :
                         zoning.min_lot_size_sqft ? `${zoning.min_lot_size_sqft.toLocaleString()} sqft` : 'TBD'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Front Setback</div>
                      <div className="font-semibold">{zoning.front_setback_ft ? `${zoning.front_setback_ft} ft` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Side Setback</div>
                      <div className="font-semibold">{zoning.side_setback_ft ? `${zoning.side_setback_ft} ft` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Rear Setback</div>
                      <div className="font-semibold">{zoning.rear_setback_ft ? `${zoning.rear_setback_ft} ft` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Max Height</div>
                      <div className="font-semibold">{zoning.max_height_ft ? `${zoning.max_height_ft} ft` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Max Lot Coverage</div>
                      <div className="font-semibold">{zoning.max_lot_coverage_percent ? `${zoning.max_lot_coverage_percent}%` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Required Frontage</div>
                      <div className="font-semibold">{zoning.frontage_required_ft ? `${zoning.frontage_required_ft} ft` : 'TBD'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Overlays</div>
                      <div className="font-semibold text-xs">
                        {zoning.has_slope_restrictions && 'Slope '}
                        {zoning.has_floodplain_restrictions && 'Flood '}
                        {zoning.has_wildfire_restrictions && 'Fire '}
                        {!zoning.has_slope_restrictions && !zoning.has_floodplain_restrictions && !zoning.has_wildfire_restrictions && 'None'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Buildability & Viability */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4">4. Buildability & Viability Assessment</h3>
                {!zoning ? (
                  <p className="text-gray-500 italic">Buildability assessment pending.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`p-4 rounded border-2 ${zoning.buildability_score >= 70 ? 'border-green-500 bg-green-50' : zoning.buildability_score >= 40 ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50'}`}>
                        <div className="text-xs text-gray-600 uppercase tracking-wide">Buildability Score</div>
                        <div className={`text-3xl font-bold ${getBuildabilityColor(zoning.buildability_score)}`}>{zoning.buildability_score}/100</div>
                        <div className="text-xs mt-1">
                          {zoning.buildability_score >= 70 ? 'Highly Buildable' :
                           zoning.buildability_score >= 40 ? 'Moderately Buildable' : 'Significant Constraints'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Legal Access</div>
                        <div className="font-semibold flex items-center gap-2">
                          {zoning.has_legal_access ? (
                            <><span className="text-green-600">✓</span> Yes - {zoning.access_type || 'road'}</>
                          ) : (
                            <><span className="text-red-600">✗</span> No / Unclear</>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Utilities Status</div>
                        <div className="font-semibold capitalize">{zoning.utilities_status}</div>
                        {zoning.water_source && <div className="text-sm text-gray-600">Water: {zoning.water_source}</div>}
                        {zoning.sewer_type && <div className="text-sm text-gray-600">Sewer: {zoning.sewer_type}</div>}
                      </div>
                    </div>

                    {zoning.slope_percent && (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600">⚠️</span>
                          <div>
                            <div className="font-semibold text-orange-800">Slope Consideration</div>
                            <div className="text-sm text-orange-700">Average slope: {zoning.slope_percent}% - May require engineering review</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {zoning.buildability_notes && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Buildability Notes</div>
                        <p className="text-sm whitespace-pre-wrap">{zoning.buildability_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 5: Use Ideas & Strategy */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-2 mb-4">5. Use Ideas & Strategy</h3>
                {!zoning ? (
                  <p className="text-gray-500 italic">Strategy analysis pending zoning data.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Development Difficulty</div>
                        <div className={`font-bold text-lg capitalize ${getUseDifficultyColor(zoning.use_difficulty)}`}>
                          {zoning.use_difficulty}
                        </div>
                      </div>
                      {zoning.estimated_time_to_entitlement && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Est. Time to Entitlement</div>
                          <div className="font-semibold">{zoning.estimated_time_to_entitlement}</div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Best Use Ideas</div>
                      <div className="grid grid-cols-2 gap-3">
                        {parseJsonArray(zoning.best_use_ideas).map((idea, i) => (
                          <div key={i} className="bg-blue-50 border border-blue-200 p-3 rounded flex items-start gap-2">
                            <span className="text-blue-600 font-bold">{i + 1}</span>
                            <span className="text-sm">{idea}</span>
                          </div>
                        ))}
                        {parseJsonArray(zoning.best_use_ideas).length === 0 && (
                          <div className="col-span-2 text-gray-500 italic">No use ideas documented yet.</div>
                        )}
                      </div>
                    </div>

                    {zoning.next_steps && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded">
                        <div className="text-xs text-green-700 uppercase tracking-wide mb-1">Recommended Next Steps</div>
                        <p className="text-sm text-green-800">{zoning.next_steps}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Red Flags */}
              {(!zoning || zoning.buildability_score < 30 || !zoning.has_legal_access || zoning.use_difficulty === 'prohibitive') && (
                <div className="bg-red-50 border-2 border-red-400 p-4 rounded mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-red-600 text-xl">🚩</span>
                    <div>
                      <div className="font-bold text-red-800">Red Flags</div>
                      <ul className="text-sm text-red-700 mt-1 space-y-1">
                        {!zoning && <li>• Zoning analysis not completed</li>}
                        {(zoning?.buildability_score || 0) < 30 && <li>• Very low buildability score</li>}
                        {zoning && !zoning.has_legal_access && <li>• No confirmed legal access</li>}
                        {zoning?.use_difficulty === 'prohibitive' && <li>• Development appears prohibitive</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources */}
              <div className="border-t border-gray-300 pt-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Data Sources</div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <a href={`https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${property.parcel_number.replace(/:/g, '')}`}
                     target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Utah County Land Records
                  </a>
                  {zoning?.zoning_map_url && (
                    <a href={zoning.zoning_map_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Zoning Map
                    </a>
                  )}
                  {zoning?.jurisdiction?.toLowerCase().includes('provo') && (
                    <a href="https://www.provo.org/home/showdocument?id=10728" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Provo Zoning (if applicable)
                    </a>
                  )}
                </div>
              </div>
            </section>
          )
        })}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t-2 border-gray-400 text-center text-sm text-gray-500">
          <p className="font-semibold">TaxProperty Utah • Investment Analysis Report</p>
          <p className="mt-2">This report is for informational purposes only. Verify all data with official county and municipal sources.</p>
          <p className="mt-1">For unincorporated Utah County: consult Utah County Planning & Zoning • For city properties: consult municipal zoning</p>
        </footer>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 0.5in; size: letter; }
          section { break-inside: avoid; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  )
}
