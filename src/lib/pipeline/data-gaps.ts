// Data Gap Scanner
// Examines a property after enrichment and records structural gaps.
// A gap = a field we want but don't have, with a reason explaining WHY.

import { PrismaClient } from '@prisma/client'
import { DataGapReason, DATA_GAP_LEVELS } from './types'
import { getRecorderEntry } from './recorder-catalog'

interface GapSpec {
  phase: string
  field: string
  reason: DataGapReason
  sourceHint: string
  missingWhen: (p: PropertySnapshot) => boolean
}

type PropertySnapshot = {
  estimated_market_value: number | null
  assessed_value: number | null
  year_built: number | null
  building_sqft: number | null
  lot_size_sqft: number | null
  property_type: string
  occupancy_status: string
  latitude: number | null
  longitude: number | null
  property_address: string | null
  zoning: string | null
  title_risk: string
  county: string
}

// Fields the pipeline expects every property to have.
// Reason is default; coordinator may override for specific county situations.
function buildGapSpecs(county: string): GapSpec[] {
  const recorder = getRecorderEntry(county)

  return [
    // Physical
    {
      phase: 'physical', field: 'year_built', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API — retry enrichment',
      missingWhen: p => p.year_built == null
    },
    {
      phase: 'physical', field: 'building_sqft', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API — retry enrichment',
      missingWhen: p => p.building_sqft == null
    },
    {
      phase: 'physical', field: 'lot_size_sqft', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API — retry enrichment',
      missingWhen: p => p.lot_size_sqft == null
    },
    {
      phase: 'physical', field: 'property_type', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API or county assessor portal',
      missingWhen: p => p.property_type === 'unknown'
    },
    // Valuation
    {
      phase: 'valuation', field: 'estimated_market_value', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API — retry enrichment',
      missingWhen: p => p.estimated_market_value == null
    },
    {
      phase: 'valuation', field: 'assessed_value', reason: 'API_NO_MATCH',
      sourceHint: 'AGRC LIR API or county assessor portal',
      missingWhen: p => p.assessed_value == null
    },
    // Location
    {
      phase: 'location', field: 'coordinates', reason: 'GEOCODE_FAILED',
      sourceHint: 'Requires valid property_address for geocoding',
      missingWhen: p => p.latitude == null || p.longitude == null
    },
    {
      phase: 'location', field: 'property_address', reason: 'CSV_MISSING_COLUMN',
      sourceHint: 'AGRC PARCEL_ADD field or county assessor portal',
      missingWhen: p => !p.property_address
    },
    // Title
    {
      phase: 'title', field: 'title_signals',
      reason: recorder.recorderUrl
        ? 'RECORDER_NEEDS_PLAYBOOK'
        : 'NO_ONLINE_SOURCE',
      sourceHint: recorder.recorderUrl
        ? `${recorder.vendor ?? 'County Recorder'}: ${recorder.recorderUrl}`
        : recorder.notes,
      missingWhen: p => p.title_risk === 'unknown'
    },
    // Zoning
    {
      phase: 'zoning', field: 'zoning', reason: 'PORTAL_SPECIFIC_FLOW',
      sourceHint: 'Utah County GIS Zoning Identify API (unincorporated) or city planning dept',
      missingWhen: p => !p.zoning
    }
  ]
}

export interface GapRecord {
  phase: string
  field: string
  reason: DataGapReason
  level: string
  sourceHint: string
}

export async function scanAndRecordDataGaps(
  prisma: PrismaClient,
  propertyId: string,
  property: PropertySnapshot
): Promise<GapRecord[]> {
  const specs = buildGapSpecs(property.county)
  const gaps: GapRecord[] = []

  for (const spec of specs) {
    if (!spec.missingWhen(property)) {
      // Field is present — if a gap existed, mark it resolved
      await prisma.dataGap.updateMany({
        where: { property_id: propertyId, phase: spec.phase, field: spec.field, resolved: false },
        data: { resolved: true, resolved_at: new Date(), resolved_by: 'pipeline' }
      }).catch(() => { /* ignore — gap may not exist */ })
      continue
    }

    const level = DATA_GAP_LEVELS[spec.reason]
    gaps.push({ phase: spec.phase, field: spec.field, reason: spec.reason, level, sourceHint: spec.sourceHint })

    // Upsert: don't create duplicates, don't overwrite resolved gaps
    await prisma.dataGap.upsert({
      where: { property_id_phase_field: { property_id: propertyId, phase: spec.phase, field: spec.field } },
      create: {
        property_id: propertyId,
        phase: spec.phase,
        field: spec.field,
        reason: spec.reason,
        level,
        source_hint: spec.sourceHint
      },
      update: {
        reason: spec.reason,
        level,
        source_hint: spec.sourceHint,
        resolved: false,
        resolved_at: null,
        resolved_by: null
      }
    })
  }

  return gaps
}
