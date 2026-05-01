import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/properties/[id]/title-research - Get checklist for property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: { id, user_id: session.user.id },
      select: { id: true, photo_url: true, aerial_url: true }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get or create checklist
    let checklist = await prisma.titleResearchChecklist.findUnique({
      where: { property_id: id }
    })

    if (!checklist) {
      // Auto-verify based on existing data
      const hasStreetView = !!property.photo_url
      const hasAerial = !!property.aerial_url

      checklist = await prisma.titleResearchChecklist.create({
        data: {
          property_id: id,
          drive_by_status: hasStreetView ? 'clear' : 'pending',
          drive_by_auto_verified: hasStreetView,
          drive_by_completed_at: hasStreetView ? new Date() : null,
          gis_verified_status: hasAerial ? 'clear' : 'pending',
          gis_auto_verified: hasAerial,
          gis_verified_completed_at: hasAerial ? new Date() : null,
          total_completed: (hasStreetView ? 1 : 0) + (hasAerial ? 1 : 0)
        }
      })
    }

    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error fetching title research checklist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist' },
      { status: 500 }
    )
  }
}

// POST /api/properties/[id]/title-research - Update checklist item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { item, status, notes } = body

    if (!item || !status) {
      return NextResponse.json(
        { error: 'Item and status are required' },
        { status: 400 }
      )
    }

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: { id, user_id: session.user.id }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Valid items and their field names
    const itemFieldMap: Record<string, { status: string; notes: string; completed: string }> = {
      'drive_by': { status: 'drive_by_status', notes: 'drive_by_notes', completed: 'drive_by_completed_at' },
      'deed_search': { status: 'deed_search_status', notes: 'deed_search_notes', completed: 'deed_search_completed_at' },
      'grantor_grantee': { status: 'grantor_grantee_status', notes: 'grantor_grantee_notes', completed: 'grantor_grantee_completed_at' },
      'municipal_liens': { status: 'municipal_liens_status', notes: 'municipal_liens_notes', completed: 'municipal_liens_completed_at' },
      'owner_lien_search': { status: 'owner_lien_search_status', notes: 'owner_lien_search_notes', completed: 'owner_lien_search_completed_at' },
      'hoa': { status: 'hoa_status', notes: 'hoa_notes', completed: 'hoa_completed_at' },
      'arv_verified': { status: 'arv_verified_status', notes: 'arv_verified_notes', completed: 'arv_verified_completed_at' },
      'gis_verified': { status: 'gis_verified_status', notes: 'gis_verified_notes', completed: 'gis_verified_completed_at' },
      'lawsuit_search': { status: 'lawsuit_search_status', notes: 'lawsuit_search_notes', completed: 'lawsuit_search_completed_at' }
    }

    if (!itemFieldMap[item]) {
      return NextResponse.json(
        { error: 'Invalid checklist item' },
        { status: 400 }
      )
    }

    const fields = itemFieldMap[item]

    // Build update data
    const updateData: Record<string, unknown> = {
      [fields.status]: status,
      [fields.completed]: status === 'clear' || status === 'flagged' ? new Date() : null
    }

    if (notes !== undefined) {
      updateData[fields.notes] = notes
    }

    // Get current checklist to calculate total_completed
    const current = await prisma.titleResearchChecklist.findUnique({
      where: { property_id: id }
    })

    if (!current) {
      // Create new checklist with this item's status
      const completedCount = (status === 'clear' || status === 'flagged') ? 1 : 0
      const checklist = await prisma.titleResearchChecklist.create({
        data: {
          property_id: id,
          ...updateData,
          total_completed: completedCount
        }
      })
      return NextResponse.json(checklist)
    }

    // Calculate new total_completed
    const statusFields = Object.values(itemFieldMap).map(f => f.status)
    let completedCount = 0

    for (const field of statusFields) {
      const fieldKey = field as keyof typeof current
      const currentStatus = current[fieldKey] as string
      if (field === fields.status) {
        // Use the new status for the item being updated
        if (status === 'clear' || status === 'flagged') completedCount++
      } else {
        // Use existing status for other items
        if (currentStatus === 'clear' || currentStatus === 'flagged') completedCount++
      }
    }

    updateData.total_completed = completedCount

    // Update checklist
    const checklist = await prisma.titleResearchChecklist.update({
      where: { property_id: id },
      data: updateData
    })

    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error updating title research checklist:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    )
  }
}

// PATCH /api/properties/[id]/title-research - Bulk update multiple items
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { items } = body as { items: Array<{ item: string; status: string; notes?: string }> }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: { id, user_id: session.user.id }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get or create checklist
    let checklist = await prisma.titleResearchChecklist.findUnique({
      where: { property_id: id }
    })

    if (!checklist) {
      checklist = await prisma.titleResearchChecklist.create({
        data: { property_id: id }
      })
    }

    // Build bulk update
    const updateData: Record<string, unknown> = {}

    for (const { item, status, notes } of items) {
      const fieldMap: Record<string, { status: string; notes: string; completed: string }> = {
        'drive_by': { status: 'drive_by_status', notes: 'drive_by_notes', completed: 'drive_by_completed_at' },
        'deed_search': { status: 'deed_search_status', notes: 'deed_search_notes', completed: 'deed_search_completed_at' },
        'grantor_grantee': { status: 'grantor_grantee_status', notes: 'grantor_grantee_notes', completed: 'grantor_grantee_completed_at' },
        'municipal_liens': { status: 'municipal_liens_status', notes: 'municipal_liens_notes', completed: 'municipal_liens_completed_at' },
        'owner_lien_search': { status: 'owner_lien_search_status', notes: 'owner_lien_search_notes', completed: 'owner_lien_search_completed_at' },
        'hoa': { status: 'hoa_status', notes: 'hoa_notes', completed: 'hoa_completed_at' },
        'arv_verified': { status: 'arv_verified_status', notes: 'arv_verified_notes', completed: 'arv_verified_completed_at' },
        'gis_verified': { status: 'gis_verified_status', notes: 'gis_verified_notes', completed: 'gis_verified_completed_at' },
        'lawsuit_search': { status: 'lawsuit_search_status', notes: 'lawsuit_search_notes', completed: 'lawsuit_search_completed_at' }
      }

      const fields = fieldMap[item]
      if (!fields) continue

      updateData[fields.status] = status
      updateData[fields.completed] = status === 'clear' || status === 'flagged' ? new Date() : null
      if (notes !== undefined) {
        updateData[fields.notes] = notes
      }
    }

    // Recalculate total_completed
    const allFields = [
      'drive_by_status', 'deed_search_status', 'grantor_grantee_status',
      'municipal_liens_status', 'owner_lien_search_status', 'hoa_status',
      'arv_verified_status', 'gis_verified_status', 'lawsuit_search_status'
    ]

    let completedCount = 0
    for (const field of allFields) {
      const newStatus = updateData[field] as string | undefined
      const currentStatus = checklist[field as keyof typeof checklist] as string
      const effectiveStatus = newStatus !== undefined ? newStatus : currentStatus
      if (effectiveStatus === 'clear' || effectiveStatus === 'flagged') {
        completedCount++
      }
    }

    updateData.total_completed = completedCount

    // Update checklist
    const updated = await prisma.titleResearchChecklist.update({
      where: { property_id: id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error bulk updating title research checklist:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    )
  }
}