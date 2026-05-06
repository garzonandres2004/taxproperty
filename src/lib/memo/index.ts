// InvestorMemo System - Agent B: Memo/Recommendation Engine Owner
// Professional parcel-level investment outputs for all counties

export * from './types'
export * from './generate'
export * from './render'

// Re-export main function with clear naming
export { generateInvestorMemo } from './generate'
export { renderMemoMarkdown, renderReportMarkdown } from './render'

// Utility to generate memo for a property ID (requires Prisma)
import { prisma } from '../db'
import { generateInvestorMemo, PropertyForMemo } from './generate'
import type { InvestorMemo } from './types'

export async function generateMemoForProperty(
  propertyId: string,
  countyConfig?: { status: string } | null
): Promise<InvestorMemo | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      titleSignals: true,
      zoningProfile: true,
      data_gaps: true,
      titleAnalysis: true,
      red_flags: true
    }
  })

  if (!property) return null

  // Attach countyConfig if provided
  const enrichedProperty = {
    ...property,
    countyConfig
  } as PropertyForMemo

  return generateInvestorMemo(enrichedProperty)
}

// Batch generate memos for multiple properties
export async function generateMemosForProperties(
  propertyIds: string[]
): Promise<InvestorMemo[]> {
  const properties = await prisma.property.findMany({
    where: { id: { in: propertyIds } },
    include: {
      titleSignals: true,
      zoningProfile: true,
      data_gaps: true,
      titleAnalysis: true,
      red_flags: true
    }
  })

  return properties.map(p => generateInvestorMemo(p as PropertyForMemo))
}

// County readiness helper
export { DEFAULT_READINESS_CONFIG } from './types'
export type { CountyReadiness, CountyReadinessConfig } from './types'
