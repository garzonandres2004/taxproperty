import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Pattern for Utah County serials: NN:NNN:NNNN
const UTAH_SERIAL_PATTERN = /^\d{2}:\d{3}:\d{4}$/

export async function POST() {
  try {
    // Find all properties that don't match Utah County serial pattern
    const allProperties = await prisma.property.findMany({
      select: { id: true, parcel_number: true }
    })

    const fakeIds: string[] = []
    const realIds: string[] = []

    for (const prop of allProperties) {
      if (UTAH_SERIAL_PATTERN.test(prop.parcel_number)) {
        realIds.push(prop.id)
      } else {
        fakeIds.push(prop.id)
      }
    }

    // Mark real Utah County properties as is_seed = false
    if (realIds.length > 0) {
      await prisma.property.updateMany({
        where: { id: { in: realIds } },
        data: { is_seed: false }
      })
    }

    // Mark non-Utah pattern properties as is_seed = true
    if (fakeIds.length > 0) {
      await prisma.property.updateMany({
        where: { id: { in: fakeIds } },
        data: { is_seed: true }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete: ${realIds.length} real properties marked, ${fakeIds.length} fake properties marked as seed`,
      details: {
        realProperties: realIds.length,
        fakeProperties: fakeIds.length,
        fakeParcelNumbers: allProperties
          .filter(p => !UTAH_SERIAL_PATTERN.test(p.parcel_number))
          .map(p => p.parcel_number)
      }
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup seed data' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to permanently remove seed data
export async function DELETE() {
  try {
    // Delete all properties marked as seed
    const result = await prisma.property.deleteMany({
      where: { is_seed: true }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} seed/fake properties`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete seed data' },
      { status: 500 }
    )
  }
}
