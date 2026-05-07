'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  FileSearch,
  Zap,
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
  owner_name: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  opportunity_score: number | null
  risk_score: number | null
  final_score: number | null
  recommendation: string | null
  // V2 scoring
  investability_score: number | null
  recommendation_bucket: string | null
  score_version: string | null
  status: string
  source_last_checked_at: string | null
  sale_date: string | null
  photo_url: string | null
  is_otc: boolean
  notes: string | null
  max_bid_calculated: number | null
  titleAnalysis?: {
    score: number
    recommendation: string
  } | null
}

interface SyncStatus {
  lastCheckedAt: string | null
  staleCount: number
  daysUntilSale: number
}

interface UserSettings {
  totalBudget: number
  maxPerProperty: number
  reserveBuffer: number
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [filterType, setFilterType] = useState('All')
  const [filterCounty, setFilterCounty] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterOTC, setFilterOTC] = useState('All')
  const [filterRecommendation, setFilterRecommendation] = useState('All')
  const [bidCount, setBidCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false)
  const [bulkActionProgress, setBulkActionProgress] = useState({ current: 0, total: 0 })
  const [isAnalyzingTitles, setIsAnalyzingTitles] = useState(false)
  const [titleAnalysisProgress, setTitleAnalysisProgress] = useState({ current: 0, total: 0 })
  const [titleAnalysisSummary, setTitleAnalysisSummary] = useState<{clean: number, caution: number, danger: number, avoid: number} | null>(null)
  const [syncResult, setSyncResult] = useState<{ redeemed: number; amountChanged: number } | null>(null)
  const [enrichResult, setEnrichResult] = useState<{ done: number; errors: number } | null>(null)
  const [sortMode, setSortMode] = useState<'bestOverall' | 'bestForMyBudget' | 'lowestAmount' | 'highestScore'>('bestOverall')
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)

  // Derived from fetched data — automatically includes any county that has properties
  const availableCounties = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of properties) {
      if (!seen.has(p.county)) { seen.add(p.county); out.push(p.county) }
    }
    return out.sort()
  }, [properties])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  function formatCountyName(county: string): string {
    return county.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' County'
  }

  useEffect(() => {
    fetchProperties()
    fetchBidCount()
    fetchSyncStatus()
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setUserSettings(data)
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    }
  }

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties')
      const data = await res.json()
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProperties(data)
      } else if (data && Array.isArray(data.properties)) {
        setProperties(data.properties)
      } else {
        console.error('Unexpected API response format:', data)
        setProperties([])
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const fetchBidCount = async () => {
    try {
      const res = await fetch('/api/properties?recommendation=bid')
      const data = await res.json()
      const count = Array.isArray(data) ? data.length : (data.properties?.length || 0)
      setBidCount(count)
    } catch (error) {
      console.error('Failed to fetch bid count:', error)
      setBidCount(0)
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

  const ENRICH_BATCH_LIMIT = 20
  const ENRICH_TIMEOUT_MS = 25000

  const handleEnrichSelected = async () => {
    if (selectedProperties.length === 0 || selectedProperties.length > ENRICH_BATCH_LIMIT) return

    const ids = [...selectedProperties]  // snapshot — immune to selection changes mid-run

    setIsBulkActionRunning(true)
    setBulkActionProgress({ current: 0, total: ids.length })
    setEnrichResult(null)

    let done = 0
    let errors = 0

    for (let i = 0; i < ids.length; i++) {
      if (!mountedRef.current) break

      const id = ids[i]
      if (mountedRef.current) setBulkActionProgress({ current: i + 1, total: ids.length })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS)

      try {
        const res = await fetch(`/api/properties/${id}/enrich`, {
          method: 'POST',
          signal: controller.signal
        })
        if (res.ok) {
          done++
        } else {
          errors++
        }
      } catch {
        errors++
      } finally {
        clearTimeout(timeoutId)
      }
    }

    if (!mountedRef.current) return

    setEnrichResult({ done, errors })
    await fetchProperties()
    setSelectedProperties([])
    setIsBulkActionRunning(false)
    setBulkActionProgress({ current: 0, total: 0 })
  }

  const handleAnalyzeAllTitles = async () => {
    if (!confirm('Run title analysis on all properties? This scrapes recorder records for each supported county. ~3-5 minutes.')) return

    setIsAnalyzingTitles(true)
    const totalProps = Array.isArray(properties) ? properties.length : 0
    setTitleAnalysisProgress({ current: 0, total: totalProps })
    setTitleAnalysisSummary(null)

    const summary = { clean: 0, caution: 0, danger: 0, avoid: 0 }

    try {
      for (let i = 0; i < totalProps; i++) {
        const property = properties[i]
        setTitleAnalysisProgress({ current: i + 1, total: totalProps })

        const SUPPORTED_TITLE_COUNTIES = ['utah', 'tooele', 'rich']
        if (SUPPORTED_TITLE_COUNTIES.includes(property.county)) {
          try {
            const res = await fetch(`/api/properties/${property.id}/title-analysis`, {
              method: 'POST'
            })
            const data = await res.json()
            if (data.success) {
              const rec = data.analysis.recommendation
              if (rec === 'clean') summary.clean++
              else if (rec === 'caution') summary.caution++
              else if (rec === 'danger') summary.danger++
              else if (rec === 'avoid') summary.avoid++
            }
          } catch (err) {
            console.error(`Failed to analyze ${property.parcel_number}:`, err)
          }

          // Rate limit: 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setTitleAnalysisSummary(summary)
      await fetchProperties()
    } catch (error) {
      console.error('Title analysis failed:', error)
    } finally {
      setIsAnalyzingTitles(false)
    }
  }

  const filteredProperties = Array.isArray(properties) ? properties.filter((p) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      cleanHtmlEntities(p.property_address || '').toLowerCase().includes(searchLower) ||
      p.parcel_number.toLowerCase().includes(searchLower) ||
      (p.owner_name && p.owner_name.toLowerCase().includes(searchLower))
    const matchesType = filterType === 'All' || p.property_type === filterType
    const matchesCounty = filterCounty === 'All' || p.county === filterCounty
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus
    const matchesOTC = filterOTC === 'All' ||
      (filterOTC === 'OTC' && p.is_otc) ||
      (filterOTC === 'Regular' && !p.is_otc)
    const matchesRecommendation = filterRecommendation === 'All' || p.recommendation === filterRecommendation
    return matchesSearch && matchesType && matchesCounty && matchesStatus && matchesOTC && matchesRecommendation
  }).sort((a, b) => {
    // Sort logic based on sortMode
    // Use investability_score (V2) when available, fall back to final_score (V1)
    const scoreA = a.investability_score ?? a.final_score
    const scoreB = b.investability_score ?? b.final_score

    if (sortMode === 'bestOverall') {
      // Default: by primary score DESC, then amountDue ASC
      const scoreDiff = (scoreB ?? -Infinity) - (scoreA ?? -Infinity)
      if (scoreDiff !== 0) return scoreDiff
      return (a.total_amount_due || 0) - (b.total_amount_due || 0)
    }

    if (sortMode === 'bestForMyBudget') {
      if (!userSettings) {
        const scoreDiff = (scoreB ?? -Infinity) - (scoreA ?? -Infinity)
        if (scoreDiff !== 0) return scoreDiff
        return (a.total_amount_due || 0) - (b.total_amount_due || 0)
      }

      const availableToBid = userSettings.totalBudget - userSettings.reserveBuffer

      const aFitsMax = (a.total_amount_due || 0) <= userSettings.maxPerProperty
      const aFitsCash = (a.total_amount_due || 0) <= availableToBid
      const aAffordable = aFitsMax && aFitsCash

      const bFitsMax = (b.total_amount_due || 0) <= userSettings.maxPerProperty
      const bFitsCash = (b.total_amount_due || 0) <= availableToBid
      const bAffordable = bFitsMax && bFitsCash

      // Affordable properties first
      if (aAffordable && !bAffordable) return -1
      if (!aAffordable && bAffordable) return 1

      // Within affordable group, sort by primary score DESC, then amountDue ASC
      const scoreDiff = (scoreB ?? -Infinity) - (scoreA ?? -Infinity)
      if (scoreDiff !== 0) return scoreDiff
      return (a.total_amount_due || 0) - (b.total_amount_due || 0)
    }

    if (sortMode === 'lowestAmount') {
      return (a.total_amount_due || 0) - (b.total_amount_due || 0)
    }

    if (sortMode === 'highestScore') {
      return (scoreB ?? -Infinity) - (scoreA ?? -Infinity)
    }

    return 0
  }) : []

  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('All')
    setFilterCounty('All')
    setFilterStatus('All')
    setFilterOTC('All')
    setFilterRecommendation('All')
  }

  const hasActiveFilters = searchTerm || filterType !== 'All' || filterCounty !== 'All' ||
    filterStatus !== 'All' || filterOTC !== 'All' || filterRecommendation !== 'All'

  const getBudgetFit = (amountDue: number | null) => {
    if (!userSettings || !amountDue) return null
    const availableToBid = userSettings.totalBudget - userSettings.reserveBuffer
    const fitsMax = amountDue <= userSettings.maxPerProperty
    const fitsCash = amountDue <= availableToBid
    return {
      fitsMax,
      fitsCash,
      affordable: fitsMax && fitsCash
    }
  }

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
    const bidIds = Array.isArray(properties)
      ? properties.filter((p) => p.recommendation === 'bid').map((p) => p.id)
      : []
    return `/reports?ids=${bidIds.join(',')}`
  }

  const propertyTypes = ['All', 'single_family', 'condo', 'vacant_land', 'commercial', 'multifamily', 'mobile_home']
  const counties = ['All', 'utah', 'salt_lake', 'tooele', 'davis']
  const statuses = ['All', 'new', 'researching', 'ready', 'redeemed', 'removed', 'sold', 'passed', 'struck_off']

  const formatPropertyType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatRecommendation = (rec: string | null) => {
    if (!rec) return 'Pending'
    if (rec === 'research_more') return 'Research'
    return rec.charAt(0).toUpperCase() + rec.slice(1)
  }

  const bucketLabel: Record<string, string> = {
    TOP_TARGET: 'Top Target',
    BID_CANDIDATE: 'Bid',
    WATCHLIST: 'Watchlist',
    RESEARCH: 'Research',
    AVOID: 'Avoid'
  }
  const bucketStyle: Record<string, string> = {
    TOP_TARGET: 'bg-emerald-600 text-white',
    BID_CANDIDATE: 'bg-blue-500 text-white',
    WATCHLIST: 'bg-amber-400 text-white',
    RESEARCH: 'bg-slate-400 text-white',
    AVOID: 'bg-red-500 text-white'
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

        {/* Enrich Result Toast */}
        {enrichResult && (
          <div className={cn(
            'p-4 border rounded-xl',
            enrichResult.errors > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className={cn(
              'flex items-center gap-2 font-medium',
              enrichResult.errors > 0 ? 'text-amber-700' : 'text-emerald-700'
            )}>
              <Zap size={18} />
              <span>
                Done: {enrichResult.done}/{enrichResult.done + enrichResult.errors} enriched
                {enrichResult.errors > 0 && `, ${enrichResult.errors} error${enrichResult.errors > 1 ? 's' : ''}`}
              </span>
              <button
                onClick={() => setEnrichResult(null)}
                className="ml-auto text-xs opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
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
              placeholder="Search address, parcel or owner..."
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
              {availableCounties.map(c => (
                <option key={c} value={c}>{formatCountyName(c)}</option>
              ))}
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
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[140px]"
              value={filterRecommendation}
              onChange={(e) => setFilterRecommendation(e.target.value)}
            >
              <option value="All">All Recommendations</option>
              <option value="bid">Bid</option>
              <option value="research_more">Research</option>
              <option value="avoid">Avoid</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-secondary px-3 text-xs whitespace-nowrap"
              >
                Clear
              </button>
            )}
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[160px]"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
            >
              <option value="bestOverall">Best Overall</option>
              <option value="bestForMyBudget">Best for My Budget</option>
              <option value="lowestAmount">Lowest Amount Due</option>
              <option value="highestScore">Highest Final Score</option>
            </select>
            <button className="btn btn-secondary px-3" title="Advanced filters coming soon">
              <Filter size={18} />
            </button>
            <button
              onClick={handleAnalyzeAllTitles}
              disabled={isAnalyzingTitles}
              className="btn btn-secondary gap-2 text-sm"
              title="Analyze titles for all supported counties (Utah, Tooele, Rich)"
            >
              <FileSearch size={16} className={cn(isAnalyzingTitles && 'animate-spin')} />
              {isAnalyzingTitles ? `Analyzing ${titleAnalysisProgress.current}/${titleAnalysisProgress.total}` : 'Analyze All Titles'}
            </button>
          </div>
        </div>

        {/* Title Analysis Summary */}
        {titleAnalysisSummary && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Title Analysis Complete</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-emerald-100 rounded p-2">
                <div className="text-2xl font-bold text-emerald-700">{titleAnalysisSummary.clean}</div>
                <div className="text-xs text-emerald-600">CLEAN (80-100)</div>
              </div>
              <div className="bg-yellow-100 rounded p-2">
                <div className="text-2xl font-bold text-yellow-700">{titleAnalysisSummary.caution}</div>
                <div className="text-xs text-yellow-600">CAUTION (60-79)</div>
              </div>
              <div className="bg-orange-100 rounded p-2">
                <div className="text-2xl font-bold text-orange-700">{titleAnalysisSummary.danger}</div>
                <div className="text-xs text-orange-600">DANGER (40-59)</div>
              </div>
              <div className="bg-red-100 rounded p-2">
                <div className="text-2xl font-bold text-red-700">{titleAnalysisSummary.avoid}</div>
                <div className="text-xs text-red-600">AVOID (&lt;40)</div>
              </div>
            </div>
          </div>
        )}

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
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    onClick={handleEnrichSelected}
                    disabled={isBulkActionRunning || selectedProperties.length > ENRICH_BATCH_LIMIT}
                    className="btn btn-secondary gap-2 text-sm"
                  >
                    <Zap size={16} className={cn(isBulkActionRunning && 'animate-pulse')} />
                    Enrich Selected
                  </button>
                  {selectedProperties.length > ENRICH_BATCH_LIMIT ? (
                    <span className="text-[10px] text-red-600 font-medium">Max {ENRICH_BATCH_LIMIT} per batch</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Up to {ENRICH_BATCH_LIMIT} per batch</span>
                  )}
                </div>
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
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Score</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Title</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Recommendation</div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Max Bid</div>
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
                      <Link href={`/memo/${property.county}/${property.parcel_number}`} className="flex flex-col">
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
                      <div className="flex flex-col gap-1.5">
                        <span className={cn(
                          'px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight',
                          getStatusColor(property.status)
                        )}>
                          {formatStatus(property.status)}
                        </span>
                        {property.is_otc && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-tight">
                            OTC
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(property.total_amount_due)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          Est. Mkt: {formatCurrency(property.estimated_market_value)}
                        </span>
                        {(() => {
                          const budgetFit = getBudgetFit(property.total_amount_due)
                          if (budgetFit?.affordable) {
                            return (
                              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
                                Fits My Budget
                              </span>
                            )
                          }
                          if (budgetFit && !budgetFit.fitsMax) {
                            return (
                              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mt-0.5">
                                Above Max Per Property
                              </span>
                            )
                          }
                          if (budgetFit && !budgetFit.fitsCash) {
                            return (
                              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mt-0.5">
                                Above Available Cash
                              </span>
                            )
                          }
                          return null
                        })()}
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
                      {property.investability_score != null ? (
                        <div
                          className="flex flex-col gap-1"
                          title={`Investability V2: ${Math.round(property.investability_score)} | V1 Final: ${property.final_score != null ? Math.round(property.final_score) : '—'}`}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border',
                              getScoreColor(property.investability_score)
                            )}
                          >
                            {Math.round(property.investability_score)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            v2
                          </span>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col gap-1"
                          title={`Final: ${property.final_score != null ? Math.round(property.final_score) : '—'} | Opp: ${property.opportunity_score != null ? Math.round(property.opportunity_score) : '—'} | Risk: ${property.risk_score != null ? Math.round(property.risk_score) : '—'}`}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border',
                              getScoreColor(property.final_score)
                            )}
                          >
                            {property.final_score != null ? Math.round(property.final_score) : '—'}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            Opp: {property.opportunity_score != null ? Math.round(property.opportunity_score) : '—'} | Risk: {property.risk_score != null ? Math.round(property.risk_score) : '—'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {property.titleAnalysis ? (
                        <Link href={`/memo/${property.county}/${property.parcel_number}`}>
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center font-black transition-transform group-hover:scale-110 border text-xs cursor-pointer',
                              property.titleAnalysis.score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              property.titleAnalysis.score >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              property.titleAnalysis.score >= 40 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-red-100 text-red-800 border-red-300'
                            )}
                            title={`Title: ${property.titleAnalysis.recommendation.toUpperCase()}`}
                          >
                            {property.titleAnalysis.score}
                          </div>
                        </Link>
                      ) : (
                        <Link
                          href={`/memo/${property.county}/${property.parcel_number}`}
                          className="text-xs text-slate-400 hover:text-blue-600 underline"
                        >
                          Analyze
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {property.recommendation_bucket ? (
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase',
                              bucketStyle[property.recommendation_bucket] ?? 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {bucketLabel[property.recommendation_bucket] ?? property.recommendation_bucket}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase',
                              getRecommendationStyle(property.recommendation)
                            )}
                          >
                            {formatRecommendation(property.recommendation)}
                          </span>
                        )}
                        {property.total_amount_due === 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-tight w-fit">
                            Verify
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {property.max_bid_calculated ? (
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(property.max_bid_calculated)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                        <span className="text-[10px] text-slate-400">Max Bid</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right action-button">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/memo/${property.county}/${property.parcel_number}`}
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
              Showing {filteredProperties.length} of {Array.isArray(properties) ? properties.length : 0} properties
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
