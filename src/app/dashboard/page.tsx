'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ChevronRight,
  Clock,
  Wallet,
  MapPin,
  ArrowUpRight,
  Target,
  AlertOctagon,
  Search,
  FileText
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn, formatCurrency, getScoreColor, cleanHtmlEntities } from '@/lib/ui-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Property {
  id: string
  parcel_number: string
  county: string
  property_address: string | null
  total_amount_due: number | null
  estimated_market_value: number | null
  investability_score: number | null
  max_bid_calculated: number | null
  property_type: string
  recommendation_bucket: string | null
  recommendation: string | null
  photo_url: string | null
}

interface CountySummary {
  id: string
  name: string
  displayName: string
  propertyCount: number
  auctionDate: string | null
  readinessScore: number
  status: 'LIVE' | 'NEAR_LIVE' | 'PARTIAL' | 'PLANNED'
}

interface DashboardStats {
  totalProperties: number
  totalCounties: number
  recommendationCounts: {
    TOP_TARGET: number
    BID_CANDIDATE: number
    WATCHLIST: number
    RESEARCH: number
    AVOID: number
  }
  totalMarketValue: number
  totalPayoff: number
}

interface UserSettings {
  totalBudget: number
  maxPerProperty: number
  reserveBuffer: number
}

const StatCard = ({
  label,
  value,
  subtext,
  icon,
  trend,
  isPositive,
  href
}: {
  label: string
  value: string
  subtext: string
  icon: React.ReactNode
  trend?: string
  isPositive?: boolean
  href?: string
}) => (
  <Card className={cn('transition-shadow', href && 'hover:shadow-lg cursor-pointer')}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
          {label}
        </h3>
        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
      {href && (
        <Link href={href} className="absolute inset-0" aria-label={`View ${label}`} />
      )}
    </CardContent>
  </Card>
)

const RecommendationBadge = ({
  type,
  count,
  href
}: {
  type: 'GO' | 'CAUTION' | 'RESEARCH' | 'SKIP'
  count: number
  href: string
}) => {
  const config = {
    GO: {
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: <CheckCircle2 size={16} />,
      label: 'GO'
    },
    CAUTION: {
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: <AlertTriangle size={16} />,
      label: 'CAUTION'
    },
    RESEARCH: {
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: <Search size={16} />,
      label: 'RESEARCH'
    },
    SKIP: {
      color: 'bg-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: <AlertOctagon size={16} />,
      label: 'SKIP'
    }
  }

  const style = config[type]

  return (
    <Link href={href}>
      <div className={cn(
        'flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md',
        style.bg,
        'border-transparent hover:border-slate-200'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg text-white', style.color)}>
            {style.icon}
          </div>
          <div>
            <p className={cn('text-2xl font-black', style.text)}>{count}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{style.label}</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300" />
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [topProperties, setTopProperties] = useState<Property[]>([])
  const [counties, setCounties] = useState<CountySummary[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalCounties: 0,
    recommendationCounts: { TOP_TARGET: 0, BID_CANDIDATE: 0, WATCHLIST: 0, RESEARCH: 0, AVOID: 0 },
    totalMarketValue: 0,
    totalPayoff: 0
  })
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextAuction, setNextAuction] = useState<{ date: string; county: string; daysUntil: number } | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchUserSettings()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard data
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setTopProperties(data.topProperties || [])
        setCounties(data.counties || [])
        setStats(data.stats || {
          totalProperties: 0,
          totalCounties: 0,
          recommendationCounts: { TOP_TARGET: 0, BID_CANDIDATE: 0, WATCHLIST: 0, RESEARCH: 0, AVOID: 0 },
          totalMarketValue: 0,
          totalPayoff: 0
        })

        // Calculate next auction
        if (data.counties && data.counties.length > 0) {
          const upcoming = data.counties
            .filter((c: CountySummary) => c.auctionDate && new Date(c.auctionDate) > new Date())
            .sort((a: CountySummary, b: CountySummary) =>
              new Date(a.auctionDate!).getTime() - new Date(b.auctionDate!).getTime()
            )[0]

          if (upcoming && upcoming.auctionDate) {
            const daysUntil = Math.ceil(
              (new Date(upcoming.auctionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            setNextAuction({
              date: upcoming.auctionDate,
              county: upcoming.displayName,
              daysUntil
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setUserSettings(data)
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    }
  }

  const getBudgetFit = (amountDue: number | null) => {
    if (!userSettings || !amountDue) return null
    const availableToBid = userSettings.totalBudget - userSettings.reserveBuffer
    const fitsMax = amountDue <= userSettings.maxPerProperty
    const fitsCash = amountDue <= availableToBid
    return { fitsMax, fitsCash, affordable: fitsMax && fitsCash }
  }

  // Calculate GO count (TOP_TARGET + BID_CANDIDATE)
  const goCount = stats.recommendationCounts.TOP_TARGET + stats.recommendationCounts.BID_CANDIDATE
  // Calculate CAUTION count (WATCHLIST)
  const cautionCount = stats.recommendationCounts.WATCHLIST
  // Calculate RESEARCH count (RESEARCH)
  const researchCount = stats.recommendationCounts.RESEARCH
  // Calculate SKIP count (AVOID)
  const skipCount = stats.recommendationCounts.AVOID

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
              AI Tax Sale Deal Analyst
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Investment Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              {stats.totalCounties} counties • {stats.totalProperties} properties analyzed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {nextAuction && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                <Clock size={18} />
                <span className="text-sm font-medium">
                  Next Sale: {nextAuction.county} in {nextAuction.daysUntil} days
                </span>
              </div>
            )}
            <Link href="/properties" className="btn btn-primary gap-2">
              <Filter size={18} /> Browse Properties
            </Link>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Properties"
            value={stats.totalProperties.toString()}
            subtext="Across all counties"
            icon={<Building2 size={20} />}
            href="/properties"
          />
          <StatCard
            label="Total Market Value"
            value={formatCurrency(stats.totalMarketValue)}
            subtext="Aggregate estimated value"
            icon={<TrendingUp size={20} />}
            trend="+12%"
            isPositive={true}
          />
          <StatCard
            label="Total Payoff Due"
            value={formatCurrency(stats.totalPayoff)}
            subtext="Opening bids aggregate"
            icon={<AlertTriangle size={20} />}
          />
          <StatCard
            label="Active Counties"
            value={stats.totalCounties.toString()}
            subtext="With tax sale data"
            icon={<MapPin size={20} />}
            href="/counties"
          />
        </div>

        {/* Recommendation Summary - Key Feature */}
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            AI Recommendations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RecommendationBadge
              type="GO"
              count={goCount}
              href="/properties?recommendation=TOP_TARGET,BID_CANDIDATE"
            />
            <RecommendationBadge
              type="CAUTION"
              count={cautionCount}
              href="/properties?recommendation=WATCHLIST"
            />
            <RecommendationBadge
              type="RESEARCH"
              count={researchCount}
              href="/properties?recommendation=RESEARCH"
            />
            <RecommendationBadge
              type="SKIP"
              count={skipCount}
              href="/properties?recommendation=AVOID"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Top Opportunities</CardTitle>
                    <p className="text-sm text-slate-500">Highest scored properties ready for review</p>
                  </div>
                  <Link href="/properties?sort=highestScore">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {topProperties.slice(0, 5).map((property) => {
                  const budgetFit = getBudgetFit(property.total_amount_due)
                  const bucket = property.recommendation_bucket
                  const bucketColors: Record<string, string> = {
                    TOP_TARGET: 'bg-emerald-500 text-white',
                    BID_CANDIDATE: 'bg-blue-500 text-white',
                    WATCHLIST: 'bg-amber-500 text-white',
                    RESEARCH: 'bg-slate-400 text-white',
                    AVOID: 'bg-red-500 text-white'
                  }
                  const bucketLabels: Record<string, string> = {
                    TOP_TARGET: 'TOP TARGET',
                    BID_CANDIDATE: 'BID',
                    WATCHLIST: 'WATCH',
                    RESEARCH: 'RESEARCH',
                    AVOID: 'AVOID'
                  }

                  return (
                    <Link
                      key={property.id}
                      href={`/properties/${property.county}/${property.parcel_number}`}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group">
                        {/* Score */}
                        <div className={cn(
                          'w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold shrink-0',
                          getScoreColor(property.investability_score)
                        )}>
                          <span className="text-[10px] uppercase opacity-70">Score</span>
                          <span className="text-lg leading-none">{Math.round(property.investability_score || 0)}</span>
                        </div>

                        {/* Property Info */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400">{property.parcel_number}</span>
                            <span className="text-xs text-slate-400 capitalize">• {property.county.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                            {cleanHtmlEntities(property.property_address) || 'No address'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">
                              Due: {formatCurrency(property.total_amount_due)}
                            </span>
                            {property.max_bid_calculated && (
                              <span className="text-xs text-emerald-600 font-medium">
                                Max Bid: {formatCurrency(property.max_bid_calculated)}
                              </span>
                            )}
                            {budgetFit?.affordable && (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-[10px]">
                                Fits Budget
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="shrink-0">
                          <Badge className={cn('font-bold text-xs', bucketColors[bucket || ''] || 'bg-slate-200')}>
                            {bucketLabels[bucket || ''] || 'PENDING'}
                          </Badge>
                        </div>

                        <ChevronRight size={20} className="text-slate-300 shrink-0" />
                      </div>
                    </Link>
                  )
                })}
                {topProperties.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Target size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>No scored properties yet. Run analysis to see opportunities.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* County Readiness */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">County Readiness</CardTitle>
                    <p className="text-sm text-slate-500">Data completeness by county</p>
                  </div>
                  <Link href="/counties">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {counties.slice(0, 5).map((county) => {
                  const statusColors = {
                    LIVE: 'bg-emerald-500',
                    NEAR_LIVE: 'bg-blue-500',
                    PARTIAL: 'bg-amber-500',
                    PLANNED: 'bg-slate-400'
                  }

                  return (
                    <div key={county.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{county.displayName}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {county.propertyCount} properties
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full text-white',
                            statusColors[county.status]
                          )}>
                            {county.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-bold text-slate-700">{county.readinessScore}%</span>
                        </div>
                      </div>
                      <Progress value={county.readinessScore} className="h-2" />
                      {county.auctionDate && (
                        <p className="text-xs text-slate-400">
                          Auction: {new Date(county.auctionDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )
                })}
                {counties.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <MapPin size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>No counties configured yet. Import your first county.</p>
                    <Link href="/import">
                      <Button className="mt-4">Import County</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-slate-900 text-white">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold">Quick Actions</h3>
                <div className="space-y-2">
                  <Link href="/properties?recommendation=TOP_TARGET,BID_CANDIDATE">
                    <Button variant="secondary" className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-0">
                      <span className="flex items-center gap-2">
                        <Target size={16} />
                        View GO Properties
                      </span>
                      <ArrowUpRight size={16} />
                    </Button>
                  </Link>
                  <Link href="/reports">
                    <Button variant="secondary" className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-0">
                      <span className="flex items-center gap-2">
                        <FileText size={16} />
                        Generate Report
                      </span>
                      <ArrowUpRight size={16} />
                    </Button>
                  </Link>
                  <Link href="/import">
                    <Button variant="secondary" className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-0">
                      <span className="flex items-center gap-2">
                        <Building2 size={16} />
                        Import County
                      </span>
                      <ArrowUpRight size={16} />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Budget Status */}
            {userSettings && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet size={20} className="text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Budget Status</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Budget</span>
                      <span className="font-medium">{formatCurrency(userSettings.totalBudget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Reserve Buffer</span>
                      <span className="font-medium">{formatCurrency(userSettings.reserveBuffer)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Available</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(userSettings.totalBudget - userSettings.reserveBuffer)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Max/Property</span>
                      <span className="font-medium">{formatCurrency(userSettings.maxPerProperty)}</span>
                    </div>
                  </div>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Edit Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Getting Started */}
            {!userSettings && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-amber-900 mb-1">Set Your Budget</h3>
                      <p className="text-sm text-amber-700 mb-3">
                        Configure your investment budget to see personalized recommendations and capital fit scores.
                      </p>
                      <Link href="/settings">
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                          Configure Budget
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
