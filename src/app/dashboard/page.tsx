import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn, formatCurrency, getScoreColor } from '@/lib/ui-utils'

const StatCard = ({
  label,
  value,
  subtext,
  icon,
  trend,
  isPositive,
}: {
  label: string
  value: string
  subtext: string
  icon: React.ReactNode
  trend?: string
  isPositive?: boolean
}) => (
  <div className="card p-6 flex flex-col gap-4">
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
    <div>
      <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
        {label}
      </h3>
      <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
  </div>
)

export default async function DashboardPage() {
  // Aggregate stats from database
  const totalProperties = await prisma.property.count({ where: { is_seed: false } })
  const highScoring = await prisma.property.count({
    where: { is_seed: false, final_score: { gte: 80 } },
  })

  const marketValueAgg = await prisma.property.aggregate({
    where: { is_seed: false },
    _sum: { estimated_market_value: true },
  })
  const totalMarketValue = marketValueAgg._sum.estimated_market_value || 0

  const payoffAgg = await prisma.property.aggregate({
    where: { is_seed: false },
    _sum: { total_amount_due: true },
  })
  const totalPayoff = payoffAgg._sum.total_amount_due || 0

  // Score distribution
  const scoreRanges = [
    { range: '0-40', min: 0, max: 40, color: '#ef4444' },
    { range: '41-65', min: 41, max: 65, color: '#f59e0b' },
    { range: '66-80', min: 66, max: 80, color: '#3b82f6' },
    { range: '81-100', min: 81, max: 100, color: '#10b981' },
  ]

  const distributionData = await Promise.all(
    scoreRanges.map(async (r) => ({
      ...r,
      count: await prisma.property.count({
        where: {
          is_seed: false,
          final_score: { gte: r.min, lte: r.max },
        },
      }),
    }))
  )

  // Top properties
  const topProperties = await prisma.property.findMany({
    where: { is_seed: false },
    orderBy: { final_score: 'desc' },
    take: 5,
  })

  // Research queue (RESEARCH_MORE recommendation)
  const researchQueue = await prisma.property.findMany({
    where: { is_seed: false, recommendation: 'research_more' },
    orderBy: { final_score: 'desc' },
    take: 3,
  })

  // BID count
  const bidCount = await prisma.property.count({
    where: { is_seed: false, recommendation: 'bid' },
  })

  return (
    <AppLayout>
      <div className="flex flex-col gap-10">
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Market Overview
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Investment Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary gap-2">
              <Filter size={18} /> Filters
            </button>
            <Link href="/import" className="btn btn-primary gap-2">
              Import County List
            </Link>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Properties"
            value={totalProperties.toString()}
            subtext="In Utah County 2026 Sale"
            icon={<Building2 size={20} />}
          />
          <StatCard
            label="Total Market Value"
            value={formatCurrency(totalMarketValue)}
            subtext="Aggregate value of auction"
            icon={<TrendingUp size={20} />}
            trend="+12%"
            isPositive={true}
          />
          <StatCard
            label="Auction Payoff"
            value={formatCurrency(totalPayoff)}
            subtext="Opening bid aggregate"
            icon={<AlertTriangle size={20} />}
          />
          <StatCard
            label="Top Opportunities"
            value={highScoring.toString()}
            subtext="Scored above 80/100"
            icon={<CheckCircle2 size={20} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Distribution Chart */}
          <div className="lg:col-span-2 card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Score Distribution</h3>
                <p className="text-sm text-slate-500">
                  Distribution of property investment scores
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Optimal
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    High Risk
                  </span>
                </div>
              </div>
            </div>

            {/* Simple bar chart */}
            <div className="h-[300px] w-full flex items-end gap-8 px-4">
              {distributionData.map((item) => (
                <div key={item.range} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      backgroundColor: item.color,
                      height: `${Math.max(
                        (item.count / Math.max(...distributionData.map((d) => d.count))) * 250,
                        20
                      )}px`,
                    }}
                  />
                  <div className="text-center">
                    <div className="text-lg font-black text-slate-900">{item.count}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {item.range}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Properties List */}
          <div className="card flex flex-col h-full">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Top Rated Bid-Targets</h3>
              <p className="text-sm text-slate-500">Highest scores for next auction</p>
            </div>
            <div className="flex-grow overflow-auto">
              {topProperties.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 border-b border-slate-50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold',
                      (property.final_score || 0) >= 80
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <span className="text-[10px] uppercase opacity-60 leading-none mb-0.5">
                      Scr
                    </span>
                    <span className="text-lg leading-none">
                      {Math.round(property.final_score || 0)}
                    </span>
                  </div>
                  <div className="flex-grow flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {property.property_address || property.parcel_number}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {property.parcel_number}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              ))}
            </div>
            <Link
              href="/properties"
              className="p-4 text-sm font-bold text-slate-500 hover:text-slate-900 text-center uppercase tracking-widest border-t border-slate-100 transition-colors"
            >
              View All Properties
            </Link>
          </div>
        </div>

        {/* Market Activity / Recent Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Research Queue */}
          <div className="card p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Research Queue</h3>
              <span className="badge bg-amber-50 text-amber-600">Action Required</span>
            </div>
            <div className="flex flex-col gap-4">
              {researchQueue.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-slate-900">
                      {p.property_address || p.parcel_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500 text-white">
                      RESEARCH
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Score: {Math.round(p.final_score || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={12} /> {p.property_type}
                    </span>
                  </div>
                </div>
              ))}
              {researchQueue.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No properties in research queue
                </p>
              )}
            </div>
          </div>

          {/* Portfolio Generator CTA */}
          <div className="card p-6 bg-slate-900 text-white flex flex-col justify-center gap-6 relative overflow-hidden">
            <div className="z-10">
              <h3 className="text-xl font-bold mb-2">Portfolio Generator</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Create a custom investment fund report based on your selected properties.
                Formatted for institutional investors.
              </p>
              <Link
                href="/reports"
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none w-fit px-8 py-3 font-black uppercase tracking-widest text-sm"
              >
                Generate Portfolio Report
              </Link>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
              <TrendingUp size={180} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
