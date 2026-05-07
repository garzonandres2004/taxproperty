import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const diagnostics: Record<string, unknown> = {
      env: {
        DATABASE_URL: process.env.DATABASE_URL?.substring(0, 50) + '...',
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
      },
      fileChecks: {} as Record<string, boolean>,
      dbTest: {} as Record<string, unknown>,
    }

    // Check file existence
    const pathsToCheck = [
      '/tmp/dev.db',
      './prisma/dev.db',
      '/var/task/prisma/dev.db',
    ]

    for (const path of pathsToCheck) {
      diagnostics.fileChecks[path] = existsSync(path)
    }

    // Test database connection
    try {
      const count = await prisma.property.count({ where: { is_seed: false } })
      diagnostics.dbTest.success = true
      diagnostics.dbTest.propertyCount = count
    } catch (dbError) {
      diagnostics.dbTest.success = false
      diagnostics.dbTest.error = dbError instanceof Error ? dbError.message : 'Unknown error'
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
