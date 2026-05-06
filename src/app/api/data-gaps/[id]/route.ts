// Data Gap Detail API
// Resolve or update a specific data gap

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/data-gaps/[id]
// Body: { resolved: true, resolved_by: 'manual' | 'pipeline' }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { resolved, resolved_by } = body

    const gap = await prisma.dataGap.findUnique({
      where: { id }
    })

    if (!gap) {
      return NextResponse.json(
        { error: 'Data gap not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    if (resolved === true) {
      updateData.resolved = true
      updateData.resolved_at = new Date()
      updateData.resolved_by = resolved_by || 'manual'
    } else if (resolved === false) {
      updateData.resolved = false
      updateData.resolved_at = null
      updateData.resolved_by = null
    }

    const updated = await prisma.dataGap.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      gap: updated
    })

  } catch (error) {
    console.error('Error updating data gap:', error)
    return NextResponse.json(
      { error: 'Failed to update data gap', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET /api/data-gaps/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const gap = await prisma.dataGap.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            parcel_number: true,
            county: true,
            property_address: true
          }
        }
      }
    })

    if (!gap) {
      return NextResponse.json(
        { error: 'Data gap not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      gap: {
        ...gap,
        parcel_number: gap.property.parcel_number,
        county: gap.property.county,
        property_address: gap.property.property_address
      }
    })

  } catch (error) {
    console.error('Error fetching data gap:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data gap', details: (error as Error).message },
      { status: 500 }
    )
  }
}
