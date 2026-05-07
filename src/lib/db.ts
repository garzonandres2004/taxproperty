import 'server-only'

import { PrismaClient } from '@prisma/client'
import { existsSync, copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// SQLite on Vercel requires copying DB to /tmp for write access
function setupDatabase() {
  if (process.env.VERCEL) {
    const dbPath = '/tmp/dev.db'

    // Try multiple possible source paths for the database
    const possiblePaths = [
      join(process.cwd(), 'prisma', 'dev.db'),
      join(process.cwd(), '..', 'prisma', 'dev.db'),
      '/var/task/prisma/dev.db',
      './prisma/dev.db',
    ]

    // Ensure /tmp directory exists
    try {
      if (!existsSync('/tmp')) {
        mkdirSync('/tmp', { recursive: true })
      }

      // Copy database to /tmp if it doesn't exist there yet
      if (!existsSync(dbPath)) {
        for (const sourceDb of possiblePaths) {
          if (existsSync(sourceDb)) {
            console.log(`[DB] Copying database from ${sourceDb} to ${dbPath}`)
            copyFileSync(sourceDb, dbPath)
            console.log('[DB] Database copied successfully')
            break
          }
        }

        if (!existsSync(dbPath)) {
          console.error('[DB] Could not find source database. Searched:', possiblePaths)
        }
      } else {
        console.log('[DB] Using existing database at', dbPath)
      }
    } catch (error) {
      console.error('[DB] Error setting up database:', error)
    }

    return dbPath
  }
  return process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'
}

// Set up database path for Vercel
if (process.env.VERCEL && !process.env.DATABASE_URL?.includes('/tmp')) {
  const dbPath = setupDatabase()
  process.env.DATABASE_URL = `file:${dbPath}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
