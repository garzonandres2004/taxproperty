import { prisma } from './db'

export interface ThirdPartyEnrichmentInput {
  zillow_url?: string
  zillow_zpid?: string
  zillow_zestimate?: number
  zillow_rent_estimate?: number
  zillow_beds?: number
  zillow_baths?: number
  zillow_sqft?: number
  zillow_confidence?: 'high' | 'medium' | 'low' | null
}

export async function getThirdPartyEnrichment(propertyId: string) {
  return prisma.thirdPartyEnrichment.findUnique({
    where: { property_id: propertyId }
  })
}

export async function upsertThirdPartyEnrichment(
  propertyId: string,
  input: ThirdPartyEnrichmentInput
) {
  const data = {
    ...input,
    zillow_last_synced: new Date()
  }

  return prisma.thirdPartyEnrichment.upsert({
    where: { property_id: propertyId },
    create: {
      property_id: propertyId,
      ...data
    },
    update: data
  })
}

// Calculate value gap between county and Zillow
export function calculateValueGap(
  countyValue: number | null | undefined,
  zestimate: number | null | undefined
): { gapPercent: number | null; label: string; color: string } {
  if (!countyValue || !zestimate || countyValue === 0) {
    return { gapPercent: null, label: 'N/A', color: 'text-slate-400' }
  }

  const gapPercent = ((zestimate - countyValue) / countyValue) * 100
  const absGap = Math.abs(gapPercent)

  let label: string
  let color: string

  if (absGap < 5) {
    label = 'In line'
    color = 'text-emerald-600'
  } else if (absGap < 20) {
    label = gapPercent > 0 ? 'Above county' : 'Below county'
    color = 'text-amber-600'
  } else {
    label = gapPercent > 0 ? 'Well above' : 'Well below'
    color = 'text-red-600'
  }

  return { gapPercent, label, color }
}
