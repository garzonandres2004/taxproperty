import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateCapitalFit, getDefaultSettings } from '@/lib/scoring'
import PropertiesTable from './PropertiesTable'
import ZoningAutoFillAllButton from '@/components/ZoningAutoFillAllButton'
import LandRecordsAnalysisButton from '@/components/LandRecordsAnalysisButton'
import ExecutiveSummary from '@/components/ExecutiveSummary'

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const county = searchParams.county as string | undefined
  const status = searchParams.status as string | undefined
  const type = searchParams.type as string | undefined
  const minScore = searchParams.minScore as string | undefined
  const maxRisk = searchParams.maxRisk as string | undefined

  // Build where clause - always filter out seed/demo data
  const where: any = { is_seed: false }
  if (county) where.county = county
  if (status) where.status = status
  if (type) where.property_type = type
  if (minScore) where.final_score = { gte: parseInt(minScore) }
  if (maxRisk) where.risk_score = { lte: parseInt(maxRisk) }

  // Get user settings for capital fit calculation
  const userSettings = await prisma.userSettings.findUnique({
    where: { id: 'default' }
  }) || getDefaultSettings()

  const properties = await prisma.property.findMany({
    where,
    orderBy: [{ final_score: 'desc' }],
    include: { sources: { take: 1 } }
  })

  // Get all BID properties for the Export Report button
  const bidProperties = await prisma.property.findMany({
    where: { recommendation: 'bid', is_seed: false },
    select: { id: true }
  })
  const bidPropertyIds = bidProperties.map(p => p.id).join(',')

  // Calculate capital fit for each property
  const propertiesWithCapitalFit = properties.map(prop => ({
    ...prop,
    capitalFit: calculateCapitalFit({
      total_amount_due: prop.total_amount_due,
      estimated_repair_cost: prop.estimated_repair_cost,
      estimated_cleanup_cost: prop.estimated_cleanup_cost,
      estimated_closing_cost: prop.estimated_closing_cost,
      deposit_required: prop.deposit_required
    }, userSettings)
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Properties</h1>
        <div className="flex items-center gap-3">
          <ExecutiveSummary />
          <Link href={`/reports?ids=${bidPropertyIds}`}>
            <Button variant="secondary" className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Generate Investor Report
            </Button>
          </Link>
          <LandRecordsAnalysisButton />
          <ZoningAutoFillAllButton />
          <Link href="/new">
            <Button>+ Add Property</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4">
            <Select name="county" defaultValue={county || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                <SelectItem value="utah">Utah County</SelectItem>
                <SelectItem value="salt_lake">Salt Lake County</SelectItem>
              </SelectContent>
            </Select>

            <Select name="status" defaultValue={status || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="researching">Researching</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
              </SelectContent>
            </Select>

            <Select name="type" defaultValue={type || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="multifamily">Multifamily</SelectItem>
                <SelectItem value="vacant_land">Vacant Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="mobile_home">Mobile Home</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              name="minScore"
              placeholder="Min Score"
              defaultValue={minScore}
              className="w-[120px]"
            />

            <Input
              type="number"
              name="maxRisk"
              placeholder="Max Risk"
              defaultValue={maxRisk}
              className="w-[120px]"
            />

            <Button type="submit">Apply</Button>
            <Link href="/properties">
              <Button variant="outline">Clear</Button>
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardContent className="p-0">
          <PropertiesTable properties={propertiesWithCapitalFit} />
        </CardContent>
      </Card>
    </div>
  )
}
