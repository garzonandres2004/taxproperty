import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Create the outcome event
    const outcome = await prisma.outcomeEvent.create({
      data: {
        property_id: data.property_id,
        event_type: data.event_type,
        event_date: data.event_date,
        details: data.details || null
      }
    })

    // Update property status if the event type maps to a status
    const statusMap: Record<string, string> = {
      redeemed: 'redeemed',
      removed: 'removed',
      sold: 'sold',
      passed: 'passed',
      struck_off: 'struck_off'
    }

    if (statusMap[data.event_type]) {
      await prisma.property.update({
        where: { id: data.property_id },
        data: { status: statusMap[data.event_type] }
      })
    }

    return NextResponse.json(outcome)
  } catch (error) {
    console.error('Error creating outcome:', error)
    return NextResponse.json({ error: 'Failed to create outcome' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    const outcomes = await prisma.outcomeEvent.findMany({
      where: { property_id: propertyId },
      orderBy: { event_date: 'desc' }
    })

    return NextResponse.json(outcomes)
  } catch (error) {
    console.error('Error fetching outcomes:', error)
    return NextResponse.json({ error: 'Failed to fetch outcomes' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Outcome ID required' }, { status: 400 })
    }

    await prisma.outcomeEvent.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting outcome:', error)
    return NextResponse.json({ error: 'Failed to delete outcome' }, { status: 500 })
  }
}
