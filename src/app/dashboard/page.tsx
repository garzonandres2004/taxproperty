import { prisma } from '@/lib/db'
import { countyConfigs } from '@/lib/counties/config'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function Dashboard() {
  // Get statistics
  const [
    totalProperties,
    readyProperties,
    researchingProperties,
    redeemedCount,
    removedCount,
    passedCount,
    bidProperties,
    topProperties
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'ready' } }),
    prisma.property.count({ where: { status: 'researching' } }),
    prisma.property.count({ where: { status: 'redeemed' } }),
    prisma.property.count({ where: { status: 'removed' } }),
    prisma.property.count({ where: { status: 'passed' } }),
    prisma.property.count({ where: { recommendation: 'bid' } }),
    prisma.property.findMany({
      where: { status: { notIn: ['redeemed', 'removed', 'passed'] } },
      orderBy: [{ final_score: 'desc' }],
      take: 10,
      include: { sources: true }
    })
  ])

  const capitalNeeded = await prisma.property.aggregate({
    where: { status: { in: ['ready', 'researching'] } },
    _sum: { total_amount_due: true, deposit_required: true }
  })

  const totalCapital = (capitalNeeded._sum.total_amount_due || 0) +
                       (capitalNeeded._sum.deposit_required || 0)

  const redFlags = await prisma.property.count({
    where: {
      OR: [
        { risk_score: { gte: 60 } },
        { access_risk: 'high' },
        { title_risk: 'high' },
        { legal_risk: 'high' }
      ]
    }
  })

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'bid': return 'bg-green-100 text-green-800 border-green-200'
      case 'research_more': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'avoid': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800'
      case 'researching': return 'bg-blue-100 text-blue-800'
      case 'new': return 'bg-gray-100 text-gray-800'
      case 'redeemed': return 'bg-gray-100 text-gray-600'
      case 'removed': return 'bg-red-100 text-red-800'
      case 'passed': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Tax sale property analyzer for Utah County & Salt Lake County</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProperties}</div>
            <p className="text-sm text-gray-500 mt-1">{bidProperties} recommended to bid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ready to Bid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{readyProperties}</div>
            <p className="text-sm text-gray-500 mt-1">{researchingProperties} still researching</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Capital Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalCapital.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1">Taxes + deposits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Red Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{redFlags}</div>
            <p className="text-sm text-gray-500 mt-1">High risk properties</p>
          </CardContent>
        </Card>
      </div>

      {/* Sale Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Utah County</span>
              <Badge variant="outline">May 21, 2026</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Redemption allowed until bidding starts. High pre-sale volatility - list changes frequently.
            </p>
            <div className="flex gap-2 text-sm">
              <a href={countyConfigs.utah.urls.propertyList} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                Property List →
              </a>
              <a href={countyConfigs.utah.urls.policies} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                Policies →
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Salt Lake County</span>
              <Badge variant="outline">May 27, 2026</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Redemption allowed until sale date. Medium pre-sale volatility - verify current list.
            </p>
            <div className="text-sm text-gray-600">
              Deposit Required: <span className="font-semibold">${countyConfigs.salt_lake.depositRequired?.amount}</span>
              {!countyConfigs.salt_lake.depositRequired?.verified && (
                <span className="text-xs text-yellow-600 ml-2">(unverified)</span>
              )}
            </div>
            <div className="flex gap-2 text-sm">
              <a href={countyConfigs.salt_lake.urls.main} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                Sale Info →
              </a>
              <a href={countyConfigs.salt_lake.urls.policies} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                Rules →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outcomes Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Outcome Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm">Redeemed: {redeemedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-sm">Removed: {removedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm">Passed: {passedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Top Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">Parcel</th>
                  <th className="pb-3 font-medium">County</th>
                  <th className="pb-3 font-medium">Amount Due</th>
                  <th className="pb-3 font-medium">Est. Value</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Risk</th>
                  <th className="pb-3 font-medium">Recommendation</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <Link href={`/properties/${prop.id}`} className="text-blue-600 hover:underline font-medium">
                        {prop.parcel_number}
                      </Link>
                    </td>
                    <td className="py-3 capitalize">{prop.county.replace('_', ' ')}</td>
                    <td className="py-3">${prop.total_amount_due?.toLocaleString() || '-'}</td>
                    <td className="py-3">${prop.estimated_market_value?.toLocaleString() || '-'}</td>
                    <td className="py-3">
                      <span className={(prop.final_score || 0) >= 75 ? 'text-green-600 font-semibold' : ''}>
                        {prop.final_score || '-'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={(prop.risk_score || 0) > 50 ? 'text-red-600' : (prop.risk_score || 0) > 30 ? 'text-yellow-600' : 'text-green-600'}>
                        {prop.risk_score || '-'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRecommendationColor(prop.recommendation || '')}`}>
                        {(prop.recommendation || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(prop.status)}`}>
                        {prop.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
