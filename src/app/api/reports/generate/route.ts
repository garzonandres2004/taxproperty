import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { buildReportData } from '@/lib/reports/data'
import { ReportDocument } from '@/lib/reports/pdf-template'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_COUNTIES = [
  'salt_lake', 'utah', 'box_elder', 'iron', 'weber', 'duchesne',
  'tooele', 'sanpete', 'davis', 'wasatch', 'washington', 'juab',
  'sevier', 'beaver', 'rich', 'summit', 'cache',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const county = (body.county ?? 'salt_lake').toString().toLowerCase()
    const topN = Math.min(Math.max(parseInt(body.topN ?? '10'), 1), 20)
    const minScore = Math.min(Math.max(parseFloat(body.minScore ?? '40'), 0), 100)
    const excludeFlags: string[] = Array.isArray(body.excludeFlags) ? body.excludeFlags : []

    if (!VALID_COUNTIES.includes(county)) {
      return NextResponse.json({ error: `Unknown county: ${county}` }, { status: 400 })
    }

    const data = await buildReportData({ county, topN, minScore, excludeFlags })

    if (data.properties.length === 0) {
      return NextResponse.json({ error: 'No properties matched the filters for this county.' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ReportDocument as any, { data }) as any
    const buffer: Buffer = await renderToBuffer(element)
    const uint8 = new Uint8Array(buffer)

    const countyDisplay = data.county_display.replace(/\s+/g, '_')
    const filename = `Utah_Tax_Sale_${countyDisplay}_County_May2026.pdf`

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': uint8.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json(
      { error: 'Report generation failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Support GET for quick testing: /api/reports/generate?county=salt_lake&topN=10
  const { searchParams } = new URL(request.url)
  const county = searchParams.get('county') ?? 'salt_lake'
  const topN = parseInt(searchParams.get('topN') ?? '10')
  const minScore = parseFloat(searchParams.get('minScore') ?? '40')
  const excludeFlags = searchParams.get('excludeFlags')?.split(',').filter(Boolean) ?? []

  const fakeRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ county, topN, minScore, excludeFlags }),
  })

  return POST(new NextRequest(fakeRequest))
}
