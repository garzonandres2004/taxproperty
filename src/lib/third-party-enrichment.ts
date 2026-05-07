import 'server-only'

import { prisma } from './db'
export { calculateValueGap } from './value-gap'

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
