// Phase 2: enrichPhysicalAndValue
// Enrich property with physical characteristics and valuation data

import { PrismaClient } from '@prisma/client'
import { PhaseResult, PhaseStatus } from '../types'
import { getCountyAdapter } from '@/lib/counties'
import { scanAndRecordDataGaps } from '../data-gaps'
import { runCountyEnricher } from '../enrichers'
import type { AuctionListing } from '../auction-types'

export interface PhysicalPhaseOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Physical Phase: Enrich physical and valuation data
 *
 * Sources (in order of preference):
 * 1. AGRC LIR API (Level A - automatic)
 * 2. County assessor portal scraping (Level B - playbook)
 * 3. Manual entry (Level C)
 *
 * Fields populated:
 * - estimated_market_value
 * - assessed_value
 * - building_sqft
 * - year_built
 * - lot_size_sqft
 * - property_type
 */
export async function runPhysicalPhase(
  prisma: PrismaClient,
  propertyId: string,
  options: PhysicalPhaseOptions = {}
): Promise<PhaseResult> {
  const { dryRun = false, verbose = false } = options
  const startTime = Date.now()

  const result: PhaseResult = {
    phase: 'physical',
    status: 'ok' as PhaseStatus,
    fieldsSet: [],
    dataGapsRecorded: [],
    notes: [],
    durationMs: 0
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { sources: true }
    })

    if (!property) {
      throw new Error(`Property not found: ${propertyId}`)
    }

    // Get county adapter
    const adapter = getCountyAdapter(property.county as any)

    // Run enrichment
    const enrichmentInput = {
      id: property.id,
      parcel_number: property.parcel_number,
      county: property.county as any,
      property_address: property.property_address,
      city: property.property_address?.split(',')[1]?.trim() || null,
      owner_name: property.owner_name,
      assessed_value: property.assessed_value,
      total_amount_due: property.total_amount_due,
      legal_description: property.legal_description
    }

    const enrichmentResult = await adapter.enrichProperty(enrichmentInput)

    // Track fields that were populated
    const updates: any = {}

    if (enrichmentResult.estimated_market_value && enrichmentResult.estimated_market_value > 0) {
      updates.estimated_market_value = enrichmentResult.estimated_market_value
      result.fieldsSet.push('estimated_market_value')
    }

    if (enrichmentResult.building_sqft && enrichmentResult.building_sqft > 0) {
      updates.building_sqft = enrichmentResult.building_sqft
      result.fieldsSet.push('building_sqft')
    }

    if (enrichmentResult.year_built) {
      updates.year_built = enrichmentResult.year_built
      result.fieldsSet.push('year_built')
    }

    if (enrichmentResult.lot_size_sqft && enrichmentResult.lot_size_sqft > 0) {
      updates.lot_size_sqft = enrichmentResult.lot_size_sqft
      result.fieldsSet.push('lot_size_sqft')
    }

    // Also run the county-specific enricher (owner, address, legal) when the
    // county adapter didn't produce market value (i.e., not a full adapter).
    if (!enrichmentResult.estimated_market_value) {
      // Extract auction ID from county_source_url when available (e.g. publicsurplus ?auc=12345)
      const auctionIdMatch = property.county_source_url?.match(/[?&]auc=(\d+)/)
      const listingId = auctionIdMatch?.[1] ?? property.id

      const listing: AuctionListing = {
        listing_id: listingId,
        county: property.county,
        county_display: property.county.replace('_', ' '),
        parcel_ids: [property.parcel_number],
        parcel_raw: property.parcel_number,
        title: '',
        opening_bid: property.total_amount_due,
        start_date: null,
        end_date: null,
        end_date_parsed: null,
        status: 'unknown',
        url: '',
        description: '',
        address_hint: property.property_address,
        acres_hint: null,
        source_file: '',
        scraped_at: new Date().toISOString(),
      }
      try {
        const assessorData = await runCountyEnricher(listing)
        if (assessorData) {
          if (assessorData.owner_name && !property.owner_name) {
            updates.owner_name = assessorData.owner_name
            result.fieldsSet.push('owner_name')
          }
          if (assessorData.situs_address && !property.property_address) {
            updates.property_address = assessorData.situs_address
            result.fieldsSet.push('property_address')
          }
          if (assessorData.mailing_address && !property.owner_mailing_address) {
            updates.owner_mailing_address = assessorData.mailing_address
            result.fieldsSet.push('owner_mailing_address')
          }
          if (assessorData.legal_description && !property.legal_description) {
            updates.legal_description = assessorData.legal_description
            result.fieldsSet.push('legal_description')
          }
          if (assessorData.market_value && assessorData.market_value > 0 && !updates.estimated_market_value) {
            updates.estimated_market_value = assessorData.market_value
            result.fieldsSet.push('estimated_market_value')
          }
        }
      } catch {
        // county enricher failure is non-fatal
      }
    }

    // Apply updates
    if (!dryRun && Object.keys(updates).length > 0) {
      await prisma.property.update({
        where: { id: propertyId },
        data: updates
      })
    }

    // Scan and record data gaps
    const propertySnapshot = {
      estimated_market_value: updates.estimated_market_value || property.estimated_market_value,
      assessed_value: property.assessed_value,
      year_built: updates.year_built || property.year_built,
      building_sqft: updates.building_sqft || property.building_sqft,
      lot_size_sqft: updates.lot_size_sqft || property.lot_size_sqft,
      property_type: property.property_type,
      occupancy_status: property.occupancy_status,
      latitude: property.latitude,
      longitude: property.longitude,
      property_address: property.property_address,
      zoning: property.zoning,
      title_risk: property.title_risk,
      county: property.county
    }

    const gaps = await scanAndRecordDataGaps(prisma, propertyId, propertySnapshot)
    result.dataGapsRecorded = gaps.map(g => `${g.phase}:${g.field}`)

    // Determine status
    if (result.fieldsSet.length === 0 && gaps.length > 0) {
      result.status = 'partial'
      result.notes.push('No fields enriched, data gaps recorded')
    } else if (gaps.length > 0) {
      result.status = 'partial'
      result.notes.push(`Enriched ${result.fieldsSet.length} fields, ${gaps.length} gaps remain`)
    } else {
      result.status = 'ok'
      result.notes.push(`All physical fields populated`)
    }

    if (verbose) {
      console.log(`[Physical Phase] ${property.county}/${property.parcel_number}: ${result.fieldsSet.length} fields`)
    }

  } catch (error) {
    result.status = 'failed'
    result.notes.push(`Error: ${(error as Error).message}`)
  }

  result.durationMs = Date.now() - startTime
  return result
}
