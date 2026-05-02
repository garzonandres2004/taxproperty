import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const counties = await prisma.countyConfig.findMany({
      orderBy: { display_name: 'asc' }
    })

    return NextResponse.json({
      counties: counties.map(c => ({
        county_name: c.county_name,
        display_name: c.display_name,
        state: c.state,
        is_active: c.is_active,
        auction_platform: c.auction_platform,
        auction_date: c.auction_date
      }))
    })
  } catch (error) {
    console.error('Error fetching counties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch counties' },
      { status: 500 }
    )
  }
}
