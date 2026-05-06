// Data Gaps API
// List and manage data gaps for properties

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/data-gaps?county=utah&status=open&level=A
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')
    const status = searchParams.get('status') // 'open' | 'resolved' | 'all'
    const level = searchParams.get('level') // 'A' | 'B' | 'C' | null
    const phase = searchParams.get('phase') // 'physical' | 'location' | 'title' | etc.

    const where: any = {}

    if (county) {
      where.property = { county }
    }

    if (status === 'open') {
      where.resolved = false
    } else if (status === 'resolved') {
      where.resolved = true
    }

    if (level) {
      where.level = level
    }

    if (phase) {
      where.phase = phase
    }

    const gaps = await prisma.dataGap.findMany({
      where,
      include: {
        property: {
          select: {
            parcel_number: true,
            county: true,
            property_address: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Aggregate statistics
    const stats = await prisma.dataGap.groupBy({
      by: ['phase', 'level', 'resolved'],
      where: county ? { property: { county } } : {},
      _count: { id: true }
    })

    return NextResponse.json({
      success: true,
      count: gaps.length,
      gaps: gaps.map(g => ({
        id: g.id,
        property_id: g.property_id,
        parcel_number: g.property.parcel_number,
        county: g.property.county,
        property_address: g.property.property_address,
        phase: g.phase,
        field: g.field,
        reason: g.reason,
        level: g.level,
        source_hint: g.source_hint,
        resolved: g.resolved,
        resolved_at: g.resolved_at,
        created_at: g.created_at
      })),
      stats: stats.map(s => ({
        phase: s.phase,
        level: s.level,
        resolved: s.resolved,
        count: s._count.id
      }))
    })

  } catch (error) {
    console.error('Error fetching data gaps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data gaps', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/data-gaps
// Body: { property_id, phase, field, reason, level, source_hint }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { property_id, phase, field, reason, level, source_hint } = body

    if (!property_id || !phase || !field || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: property_id, phase, field, reason' },
        { status: 400 }
      )
    }

    const gap = await prisma.dataGap.upsert({
      where: {
        property_id_phase_field: {
          property_id,
          phase,
          field
        }
      },
      create: {
        property_id,
        phase,
        field,
        reason,
        level: level || 'C',
        source_hint
      },
      update: {
        reason,
        level: level || 'C',
        source_hint,
        resolved: false,
        resolved_at: null,
        resolved_by: null
      }
    })

    return NextResponse.json({
      success: true,
      gap
    })

  } catch (error) {
    console.error('Error creating data gap:', error)
    return NextResponse.json(
      { error: 'Failed to create data gap', details: (error as Error).message },
      { status: 500 }
    )
  }
}
