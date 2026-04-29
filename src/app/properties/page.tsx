'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Download,
  ChevronRight,
  ArrowUpDown,
  MoreVertical,
  Check,
  Building2,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PropertyImage, ParcelMapImage } from '@/components/PropertyImage'
import { cn, formatCurrency, getScoreColor, getRiskColor, getRecommendationStyle } from '@/lib/ui-utils'

interface Property {
  id: string
  parcel_number: string
  county: string
  property_type: string
  property_address: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  opportunity_score: number | null
  risk_score: number | null
  final_score: number | null
  recommendation: string | null
  status: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [filterType, setFilterType] = useState('All')
  const [filterCounty, setFilterCounty] = useState('All')
  const [bidCount, setBidCount] = useState(0)

  useEffect(() => {
    fetchProperties()
    fetchBidCount()
  }, [])

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties')
      const data = await res.json()
      setProperties(data)
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBidCount = async () => {
    try {
      const res = await fetch('/api/properties?recommendation=bid')
      const data = await res.json()
      setBidCount(data.length || 0)
    } catch (error) {
      console.error('Failed to fetch bid count:', error)
    }
  }

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      (p.property_address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      p.parcel_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'All' || p.property_type === filterType
    const matchesCounty = filterCounty === 'All' || p.county === filterCounty
    return matchesSearch && matchesType && matchesCounty
  })

  const toggleSelection = (id: string) => {
    setSelectedProperties((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([])
    } else {
      setSelectedProperties(filteredProperties.map((p) => p.id))
    }
  }

  const generateReportLink = () => {
    return `/reports?ids=${selectedProperties.join(',')}`
  }

  const generateBidReportLink = () => {
    const bidIds = properties.filter((p) => p.recommendation === 'bid').map((p) => p.id)
    return `/reports?ids=${bidIds.join(',')}`
  }

  const propertyTypes = ['All', 'single_family', 'condo', 'vacant_land', 'commercial', 'multifamily', 'mobile_home']
  const counties = ['All', 'utah', 'salt_lake']

  const formatPropertyType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatRecommendation = (rec: string | null) => {
    if (!rec) return 'Pending'
    if (rec === 'research_more') return 'Research'
    return rec.charAt(0).toUpperCase() + rec.slice(1)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Auction Items</h1>
            <p className="text-slate-500 font-medium">Utah County Tax Sale • May 21, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={generateBidReportLink()}
              className={cn(
                'btn gap-2',
                bidCount > 0 ? 'btn-primary' : 'btn-secondary opacity-50 pointer-events-none'
              )}
            >
              <Download size={18} /> Generate Bid Report ({bidCount})
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="card p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search address or parcel..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 focus:outline-none text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[140px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="vacant_land">Vacant Land</option>
              <option value="commercial">Commercial</option>
              <option value="multifamily">Multifamily</option>
              <option value="mobile_home">Mobile Home</option>
            </select>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[140px]"
              value={filterCounty}
              onChange={(e) => setFilterCounty(e.target.value)}
            >
              <option value="All">All Counties</option>
              <option value="utah">Utah County</option>
              <option value="salt_lake">Salt Lake County</option>
            </select>
            <button className="btn btn-secondary px-3">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedProperties.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-sm font-semibold text-emerald-700">
              {selectedProperties.length} properties selected
            </span>
            <div className="flex gap-2">
              <Link
                href={generateReportLink()}
                className="btn btn-primary gap-2 text-sm"
              >
                <Download size={16} />
                Generate Report
              </Link>
              <button
                onClick={() => setSelectedProperties([])}
                className="btn btn-secondary text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 w-12">
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                        selectedProperties.length === filteredProperties.length &&
                          filteredProperties.length > 0
                          ? 'bg-slate-900 border-slate-900'
                          : 'bg-white border-slate-300'
                      )}
                    >
                      {selectedProperties.length === filteredProperties.length &&
                        filteredProperties.length > 0 && <Check size={12} className="text-white" />}
                    </button>
                  </th>
                  <th className="px-6 py-4 w-20">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Photo</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">
                      Parcel & Address <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Type</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">
                      Amount Due <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Opp Score</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Risk Score</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Final Score</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommendation</div>
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((property) => (
                  <tr
                    key={property.id}
                    className={cn(
                      'hover:bg-slate-50/50 transition-colors group cursor-pointer',
                      selectedProperties.includes(property.id) ? 'bg-slate-50' : ''
                    )}
                  >
                    <td className="px-6 py-4 action-button">
                      <button
                        onClick={() => toggleSelection(property.id)}
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                          selectedProperties.includes(property.id)
                            ? 'bg-slate-900 border-slate-900'
                            : 'bg-white border-slate-300'
                        )}
                      >
                        {selectedProperties.includes(property.id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <PropertyImage
                          address={property.property_address}
                          parcelNumber={property.parcel_number}
                          propertyType={property.property_type}
                          size="sm"
                        />
                        <ParcelMapImage
                          parcelNumber={property.parcel_number}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/properties/${property.id}`} className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-slate-500 mb-0.5">
                          {property.parcel_number}
                        </span>
                        <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {property.property_address || 'No address'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium capitalize">
                          {property.county.replace('_', ' ')}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight">
                        {formatPropertyType(property.property_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(property.total_amount_due)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          Est. Mkt: {formatCurrency(property.estimated_market_value)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border',
                          getScoreColor(property.opportunity_score)
                        )}
                      >
                        {Math.round(property.opportunity_score || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border',
                          getRiskColor(property.risk_score)
                        )}
                      >
                        {Math.round(property.risk_score || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border',
                          getScoreColor(property.final_score)
                        )}
                      >
                        {Math.round(property.final_score || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase',
                          getRecommendationStyle(property.recommendation)
                        )}
                      >
                        {formatRecommendation(property.recommendation)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right action-button">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/properties/${property.id}`}
                          className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </Link>
                        <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination/Status */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing {filteredProperties.length} of {properties.length} properties
            </span>
            <div className="flex items-center gap-1">
              <button className="btn btn-secondary px-3 py-1.5 text-xs opacity-50">Previous</button>
              <button className="btn btn-primary px-3 py-1.5 text-xs shadow-none">1</button>
              <button className="btn btn-secondary px-3 py-1.5 text-xs">2</button>
              <button className="btn btn-secondary px-3 py-1.5 text-xs">Next</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
