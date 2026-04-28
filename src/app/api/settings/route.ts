import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULT_SETTINGS = {
  id: 'default',
  totalBudget: 50000,
  maxPerProperty: 25000,
  reserveBuffer: 5000
}

export async function GET() {
  try {
    // Get or create default settings
    let settings = await prisma.userSettings.findUnique({
      where: { id: 'default' }
    })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: DEFAULT_SETTINGS
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    console.log('Settings PUT received:', data)

    // Handle both string and number inputs
    const totalBudget = typeof data.totalBudget === 'string'
      ? parseFloat(data.totalBudget)
      : (typeof data.totalBudget === 'number' ? data.totalBudget : DEFAULT_SETTINGS.totalBudget)

    const maxPerProperty = typeof data.maxPerProperty === 'string'
      ? parseFloat(data.maxPerProperty)
      : (typeof data.maxPerProperty === 'number' ? data.maxPerProperty : DEFAULT_SETTINGS.maxPerProperty)

    const reserveBuffer = typeof data.reserveBuffer === 'string'
      ? parseFloat(data.reserveBuffer)
      : (typeof data.reserveBuffer === 'number' ? data.reserveBuffer : DEFAULT_SETTINGS.reserveBuffer)

    console.log('Parsed values:', { totalBudget, maxPerProperty, reserveBuffer })

    // Validate constraints
    if (isNaN(totalBudget) || isNaN(maxPerProperty) || isNaN(reserveBuffer)) {
      return NextResponse.json(
        { error: 'Invalid number format for budget values' },
        { status: 400 }
      )
    }

    if (maxPerProperty > totalBudget) {
      return NextResponse.json(
        { error: 'Max per property cannot exceed total budget' },
        { status: 400 }
      )
    }

    if (reserveBuffer >= totalBudget) {
      return NextResponse.json(
        { error: 'Reserve buffer must be less than total budget' },
        { status: 400 }
      )
    }

    // Upsert settings
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
