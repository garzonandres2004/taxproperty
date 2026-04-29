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
  RefreshCw,
  Play,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PropertyImage, ParcelMapImage } from '@/components/PropertyImage'
import { cn, formatCurrency, getScoreColor, getRiskColor, getRecommendationStyle, cleanHtmlEntities } from '@/lib/ui-utils'

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
  source_last_checked_at: string | null
  sale_date: string | null
  photo_url: string | null
}

interface SyncStatus {
  lastCheckedAt: string | null
  staleCount: number
  daysUntilSale: number
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [filterType, setFilterType] = useState('All')
  const [filterCounty, setFilterCounty] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [bidCount, setBidCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false)
  const [bulkActionProgress, setBulkActionProgress] = useState({ current: 0, total: 0 })
  const [syncResult, setSyncResult] = useState<{ redeemed: number; amountChanged: number } | null>(null)

  useEffect(() => {
    fetchProperties()
    fetchBidCount()
    fetchSyncStatus()
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

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/cron/redemption-check')
      const data = await res.json()
      if (data.success) {
        setSyncStatus({
          lastCheckedAt: data.lastCheckedAt,
          staleCount: data.staleCount,
          daysUntilSale: data.daysUntilSale
        })
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  }

  const handleSyncStatus = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/cron/redemption-check?mode=stale', {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setSyncResult({
          redeemed: data.summary.redeemed,
          amountChanged: data.summary.amountChanged
        })
        // Refresh properties to show updated status
        await fetchProperties()
        await fetchSyncStatus()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRecheckStatus = async () => {
    if (selectedProperties.length === 0) return
    setIsBulkActionRunning(true)
    setBulkActionProgress({ current: 0, total: selectedProperties.length })

    try {
      const res = await fetch(`/api/cron/redemption-check?mode=selected&propertyIds=${selectedProperties.join(',')}`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setSyncResult({
          redeemed: data.summary.redeemed,
          amountChanged: data.summary.amountChanged
        })
        await fetchProperties()
        await fetchSyncStatus()
        setSelectedProperties([])
      }
    } catch (error) {
      console.error('Bulk recheck failed:', error)
    } finally {
      setIsBulkActionRunning(false)
      setBulkActionProgress({ current: 0, total: 0 })
    }
  }

  const handleRerunAutofill = async () => {
    if (selectedProperties.length === 0) return
    setIsBulkActionRunning(true)
    setBulkActionProgress({ current: 0, total: selectedProperties.length })

    try {
      // Run land records analysis on selected properties
      const res = await fetch('/api/analysis/land-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: selectedProperties })
      })
      const data = await res.json()
      if (data.success) {
        await fetchProperties()
        setSelectedProperties([])
      }
    } catch (error) {
      console.error('Bulk autofill failed:', error)
    } finally {
      setIsBulkActionRunning(false)
      setBulkActionProgress({ current: 0, total: 0 })
    }
  }

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      cleanHtmlEntities(p.property_address).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.parcel_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'All' || p.property_type === filterType
    const matchesCounty = filterCounty === 'All' || p.county === filterCounty
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus
    return matchesSearch && matchesType && matchesCounty && matchesStatus
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
  const statuses = ['All', 'new', 'researching', 'ready', 'redeemed', 'removed', 'sold', 'passed', 'struck_off']

  const formatPropertyType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatRecommendation = (rec: string | null) => {
    if (!rec) return 'Pending'
    if (rec === 'research_more') return 'Research'
    return rec.charAt(0).toUpperCase() + rec.slice(1)
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'redeemed':
        return 'bg-emerald-100 text-emerald-700'
      case 'sold':
        return 'bg-blue-100 text-blue-700'
      case 'passed':
      case 'struck_off':
        return 'bg-amber-100 text-amber-700'
      case 'removed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const isStale = (lastChecked: string | null) => {
    if (!lastChecked) return true
    const daysSince = Math.floor((Date.now() - new Date(lastChecked).getTime()) / (1000 * 60 * 60 * 24))
    return daysSince > 7
  }

  const formatLastChecked = (lastChecked: string | null) => {
    if (!lastChecked) return 'Never'
    const date = new Date(lastChecked)
    const daysSince = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    return `${daysSince} days ago`
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
            {/* Sync Status Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncStatus}
                disabled={isSyncing}
                className={cn(
                  'btn gap-2',
                  syncStatus?.staleCount && syncStatus.staleCount > 0
                    ? 'btn-warning'
                    : 'btn-secondary'
                )}
              >
                <RefreshCw size={18} className={cn(isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing...' : 'Sync Status'}
              </button>
              {syncStatus && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={12} />
                  <span>{formatLastChecked(syncStatus.lastCheckedAt)}</span>
                  {syncStatus.staleCount > 0 && (
                    <span className="text-amber-600 font-medium">
                      ({syncStatus.staleCount} stale)
                    </span>
                  )}
                </div>
              )}
            </div>

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

        {/* Sync Result Toast */}
        {syncResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700">
              <Check size={18} />
              <span className="font-medium">
                Sync complete: {syncResult.redeemed} redeemed, {syncResult.amountChanged} amount changes
              </span>
            </div>
          </div>
        )}

        {/* Sale Date Warning */}
        {syncStatus && syncStatus.daysUntilSale <= 7 && syncStatus.daysUntilSale >= 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={18} />
              <span className="font-medium">
                Sale date approaching: {syncStatus.daysUntilSale} days remaining
              </span>
            </div>
          </div>
        )}

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
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[140px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="new">New</option>
              <option value="researching">Researching</option>
              <option value="ready">Ready</option>
              <option value="redeemed">Redeemed</option>
            </select>
            <button className="btn btn-secondary px-3">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedProperties.length > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-emerald-700">
                  {selectedProperties.length} properties selected
                </span>
                {isBulkActionRunning && (
                  <span className="text-xs text-emerald-600">
                    Processing {bulkActionProgress.current} of {bulkActionProgress.total}...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRecheckStatus}
                  disabled={isBulkActionRunning}
                  className="btn btn-secondary gap-2 text-sm"
                >
                  <RefreshCw size={16} className={cn(isBulkActionRunning && 'animate-spin')} />
                  Re-check Status
                </button>
                <button
                  onClick={handleRerunAutofill}
                  disabled={isBulkActionRunning}
                  className="btn btn-secondary gap-2 text-sm"
                >
                  <Play size={16} />
                  Re-run Auto-fill
                </button>
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
                  Clear
                </button>
              </div>
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
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">
                      Amount Due <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Verified</div>
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
                      selectedProperties.includes(property.id) ? 'bg-slate-50' : '',
                      property.status === 'redeemed' ? 'opacity-50' : ''
                    )}
                  >
                    <td className="px-6 py-4 action-button">
                      <button
                        onClick={() => toggleSelection(property.id)}
                        disabled={property.status === 'redeemed'}
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                          selectedProperties.includes(property.id)
                            ? 'bg-slate-900 border-slate-900'
                            : 'bg-white border-slate-300',
                          property.status === 'redeemed' && 'opacity-30 cursor-not-allowed'
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
                          photoUrl={property.photo_url}
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
                          {cleanHtmlEntities(property.property_address) || 'No address'}
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
                      <span className={cn(
                        'px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight',
                        getStatusColor(property.status)
                      )}>
                        {formatStatus(property.status)}
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
                      <div className="flex items-center gap-1">
                        {isStale(property.source_last_checked_at) ? (
                          <AlertTriangle size={12} className="text-amber-500" />
                        ) : (
                          <Check size={12} className="text-emerald-500" />
                        )}
                        <span className={cn(
                          'text-xs font-medium',
                          isStale(property.source_last_checked_at) ? 'text-amber-600' : 'text-slate-500'
                        )}>
                          {formatLastChecked(property.source_last_checked_at)}
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
