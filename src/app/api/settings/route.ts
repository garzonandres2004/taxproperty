import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get settings if they exist - no defaults, user must set their own budget
    const settings = await prisma.userSettings.findUnique({
      where: { id: 'default' }
    })

    // Return null values if not configured - user must set their own budget
    return NextResponse.json(settings || {
      id: 'default',
      totalBudget: null,
      maxPerProperty: null,
      reserveBuffer: null
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    console.log('Settings PUT received:', data)

    // Handle both string and number inputs, allow null
    const totalBudget = data.totalBudget === null || data.totalBudget === undefined
      ? null
      : (typeof data.totalBudget === 'string' ? parseFloat(data.totalBudget) : data.totalBudget)

    const maxPerProperty = data.maxPerProperty === null || data.maxPerProperty === undefined
      ? null
      : (typeof data.maxPerProperty === 'string' ? parseFloat(data.maxPerProperty) : data.maxPerProperty)

    const reserveBuffer = data.reserveBuffer === null || data.reserveBuffer === undefined
      ? null
      : (typeof data.reserveBuffer === 'string' ? parseFloat(data.reserveBuffer) : data.reserveBuffer)

    console.log('Parsed values:', { totalBudget, maxPerProperty, reserveBuffer })

    // Validate constraints only if values are provided
    if (totalBudget !== null && isNaN(totalBudget)) {
      return NextResponse.json(
        { error: 'Invalid number format for total budget' },
        { status: 400 }
      )
    }

    if (maxPerProperty !== null && isNaN(maxPerProperty)) {
      return NextResponse.json(
        { error: 'Invalid number format for max per property' },
        { status: 400 }
      )
    }

    if (reserveBuffer !== null && isNaN(reserveBuffer)) {
      return NextResponse.json(
        { error: 'Invalid number format for reserve buffer' },
        { status: 400 }
      )
    }

    // Validate business rules only if all values are provided
    if (totalBudget !== null && maxPerProperty !== null && maxPerProperty > totalBudget) {
      return NextResponse.json(
        { error: 'Max per property cannot exceed total budget' },
        { status: 400 }
      )
    }

    if (totalBudget !== null && reserveBuffer !== null && reserveBuffer >= totalBudget) {
      return NextResponse.json(
        { error: 'Reserve buffer must be less than total budget' },
        { status: 400 }
      )
    }

    // Upsert settings - allow null values
    const settings = await prisma.userSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        totalBudget,
        maxPerProperty,
        reserveBuffer
      },
      update: {
        totalBudget,
        maxPerProperty,
        reserveBuffer
      }
    })

    console.log('Settings saved:', settings)
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json({
      error: 'Failed to update settings',
      details: error.message || String(error)
    }, { status: 500 })
  }
}
