'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  Calendar,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn, formatCurrency, formatNumber } from '@/lib/ui-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// County readiness status types
type ReadinessStatus = 'LIVE' | 'NEAR_LIVE' | 'PARTIAL' | 'PLANNED'

interface CountySummary {
  id: string
  name: string
  displayName: string
  state: string
  status: ReadinessStatus
  propertyCount: number
  auctionDate: string | null
  auctionPlatform: string | null
  totalMarketValue: number
  totalPayoff: number
  recommendationCounts: {
    TOP_TARGET: number
    BID_CANDIDATE: number
    WATCHLIST: number
    RESEARCH: number
    AVOID: number
  }
  readinessScore: number // 0-100
  lastUpdated: string | null
  dataQuality: 'high' | 'medium' | 'low'
}

const statusConfig: Record<ReadinessStatus, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  LIVE: {
    label: 'Live',
    color: 'bg-emerald-500 text-white',
    icon: <CheckCircle2 size={14} />,
    description: 'Full data available, auction active'
  },
  NEAR_LIVE: {
    label: 'Near Live',
    color: 'bg-blue-500 text-white',
    icon: <Clock size={14} />,
    description: 'List imported, enrichment in progress'
  },
  PARTIAL: {
    label: 'Partial',
    color: 'bg-amber-500 text-white',
    icon: <AlertCircle size={14} />,
    description: 'Basic data available, gaps noted'
  },
  PLANNED: {
    label: 'Planned',
    color: 'bg-slate-400 text-white',
    icon: <Database size={14} />,
    description: 'County identified, awaiting data'
  }
}

const getStatusFromConfig = (county: CountySummary): ReadinessStatus => {
  if (county.readinessScore >= 80 && county.propertyCount > 0) return 'LIVE'
  if (county.readinessScore >= 50 && county.propertyCount > 0) return 'NEAR_LIVE'
  if (county.propertyCount > 0) return 'PARTIAL'
  return 'PLANNED'
}

export default function CountiesPage() {
  const [counties, setCounties] = useState<CountySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<ReadinessStatus | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'properties' | 'readiness'>('readiness')

  useEffect(() => {
    fetchCounties()
  }, [])

  const fetchCounties = async () => {
    try {
      // Fetch from API
      const res = await fetch('/api/counties/summary')
      if (res.ok) {
        const data = await res.json()
        setCounties(data.counties || [])
      } else {
        // Fallback to empty state
        setCounties([])
      }
    } catch (error) {
      console.error('Failed to fetch counties:', error)
      setCounties([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCounties = counties.filter(county => {
    const matchesSearch = county.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         county.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'ALL' || getStatusFromConfig(county) === filterStatus
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
    if (sortBy === 'properties') return b.propertyCount - a.propertyCount
    if (sortBy === 'readiness') return b.readinessScore - a.readinessScore
    return 0
  })

  // Calculate stats
  const totalProperties = counties.reduce((sum, c) => sum + c.propertyCount, 0)
  const liveCounties = counties.filter(c => getStatusFromConfig(c) === 'LIVE').length
  const totalTopTargets = counties.reduce((sum, c) => sum + c.recommendationCounts.TOP_TARGET, 0)
  const totalBidCandidates = counties.reduce((sum, c) => sum + c.recommendationCounts.BID_CANDIDATE, 0)

  const formatAuctionDate = (date: string | null) => {
    if (!date) return 'TBD'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntil = (date: string | null) => {
    if (!date) return null
    const auction = new Date(date).getTime()
    const now = Date.now()
    const days = Math.ceil((auction - now) / (1000 * 60 * 60 * 24))
    return days
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Multi-County Coverage
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              County Registry
            </h1>
            <p className="text-slate-500 mt-1">
              Tax sale coverage across Utah counties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/import" className="btn btn-primary gap-2">
              <Database size={18} /> Import County
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  <Building2 size={20} />
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600">
                  {liveCounties} Live
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900">{counties.length}</div>
                <div className="text-sm text-slate-500">Total Counties</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  <Database size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900">{formatNumber(totalProperties)}</div>
                <div className="text-sm text-slate-500">Total Properties</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-emerald-600">{totalTopTargets + totalBidCandidates}</div>
                <div className="text-sm text-slate-500">Bid Opportunities</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900">
                  {counties.filter(c => c.auctionDate && getDaysUntil(c.auctionDate) !== null && getDaysUntil(c.auctionDate)! > 0).length}
                </div>
                <div className="text-sm text-slate-500">Upcoming Sales</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search counties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ReadinessStatus | 'ALL')}>
              <SelectTrigger className="w-[160px]">
                <Filter size={16} className="mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="NEAR_LIVE">Near Live</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PLANNED">Planned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="readiness">Readiness</SelectItem>
                <SelectItem value="properties">Properties</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Counties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCounties.map((county) => {
            const status = getStatusFromConfig(county)
            const statusInfo = statusConfig[status]
            const daysUntil = getDaysUntil(county.auctionDate)

            return (
              <Card key={county.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">
                          {county.displayName}
                        </CardTitle>
                        <p className="text-xs text-slate-500">{county.state}</p>
                      </div>
                    </div>
                    <Badge className={cn('font-medium', statusInfo.color)}>
                      <span className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Auction Info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={14} />
                      <span>{formatAuctionDate(county.auctionDate)}</span>
                    </div>
                    {daysUntil !== null && daysUntil > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {daysUntil} days
                      </Badge>
                    )}
                  </div>

                  {/* Property Count */}
                  <div className="flex items-center justify-between py-2 border-y border-slate-100">
                    <span className="text-sm text-slate-500">Properties</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatNumber(county.propertyCount)}
                    </span>
                  </div>

                  {/* Recommendation Distribution */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">GO</span>
                      <span className="font-medium text-emerald-600">
                        {county.recommendationCounts.TOP_TARGET + county.recommendationCounts.BID_CANDIDATE}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">CAUTION</span>
                      <span className="font-medium text-amber-600">
                        {county.recommendationCounts.WATCHLIST + county.recommendationCounts.RESEARCH}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">SKIP</span>
                      <span className="font-medium text-red-600">
                        {county.recommendationCounts.AVOID}
                      </span>
                    </div>
                  </div>

                  {/* Readiness Score Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Readiness</span>
                      <span className="font-medium">{county.readinessScore}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          county.readinessScore >= 80 ? 'bg-emerald-500' :
                          county.readinessScore >= 50 ? 'bg-blue-500' :
                          county.readinessScore >= 30 ? 'bg-amber-500' : 'bg-slate-400'
                        )}
                        style={{ width: `${county.readinessScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Platform Info */}
                  {county.auctionPlatform && (
                    <p className="text-xs text-slate-400 truncate">
                      Platform: {county.auctionPlatform}
                    </p>
                  )}

                  {/* Action Button */}
                  <Link href={`/properties?county=${county.id}`}>
                    <Button variant="outline" className="w-full mt-2 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      View Properties
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredCounties.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="p-4 bg-slate-50 rounded-full inline-block mb-4">
              <Database size={48} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No counties found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Try adjusting your filters or import a new county to get started.
            </p>
            <Link href="/import" className="btn btn-primary mt-4 inline-flex">
              Import County
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
