import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/properties/[id]/zoning - Get zoning profile for a property
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const zoningProfile = await prisma.zoningProfile.findUnique({
      where: { property_id: id }
    })

    if (!zoningProfile) {
      return NextResponse.json({ error: 'Zoning profile not found' }, { status: 404 })
    }

    return NextResponse.json(zoningProfile)
  } catch (error) {
    console.error('Error fetching zoning profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zoning profile' },
      { status: 500 }
    )
  }
}

// POST /api/properties/[id]/zoning - Create zoning profile for a property
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if zoning profile already exists
    const existing = await prisma.zoningProfile.findUnique({
      where: { property_id: id }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Zoning profile already exists. Use PUT to update.' },
        { status: 409 }
      )
    }

    const zoningProfile = await prisma.zoningProfile.create({
      data: {
        property_id: id,
        jurisdiction: data.jurisdiction,
        is_unincorporated: data.is_unincorporated ?? true,
        zoning_code: data.zoning_code,
        zoning_name: data.zoning_name,
        land_use_designation: data.land_use_designation,
        permitted_uses: data.permitted_uses ? JSON.stringify(data.permitted_uses) : null,
        conditional_uses: data.conditional_uses ? JSON.stringify(data.conditional_uses) : null,
        prohibited_uses: data.prohibited_uses ? JSON.stringify(data.prohibited_uses) : null,
        min_lot_size_sqft: data.min_lot_size_sqft,
        min_lot_size_acres: data.min_lot_size_acres,
        front_setback_ft: data.front_setback_ft,
        side_setback_ft: data.side_setback_ft,
        rear_setback_ft: data.rear_setback_ft,
        max_height_ft: data.max_height_ft,
        max_height_stories: data.max_height_stories,
        max_lot_coverage_percent: data.max_lot_coverage_percent,
        frontage_required_ft: data.frontage_required_ft,
        has_slope_restrictions: data.has_slope_restrictions ?? false,
        has_floodplain_restrictions: data.has_floodplain_restrictions ?? false,
        has_wildfire_restrictions: data.has_wildfire_restrictions ?? false,
        has_open_space_requirements: data.has_open_space_requirements ?? false,
        overlays: data.overlays ? JSON.stringify(data.overlays) : null,
        has_legal_access: data.has_legal_access ?? false,
        access_type: data.access_type,
        utilities_status: data.utilities_status ?? 'unknown',
        water_source: data.water_source,
        sewer_type: data.sewer_type,
        slope_percent: data.slope_percent,
        buildable_area_sqft: data.buildable_area_sqft,
        buildability_score: data.buildability_score ?? 0,
        buildability_notes: data.buildability_notes,
        best_use_ideas: data.best_use_ideas ? JSON.stringify(data.best_use_ideas) : null,
        use_difficulty: data.use_difficulty ?? 'unknown',
        estimated_time_to_entitlement: data.estimated_time_to_entitlement,
        next_steps: data.next_steps,
        zoning_map_url: data.zoning_map_url,
        zoning_ordinance_url: data.zoning_ordinance_url,
        data_last_verified: data.data_last_verified ? new Date(data.data_last_verified) : null,
        notes: data.notes
      }
    })

    return NextResponse.json(zoningProfile)
  } catch (error) {
    console.error('Error creating zoning profile:', error)
    return NextResponse.json(
      { error: 'Failed to create zoning profile' },
      { status: 500 }
    )
  }
}

// PUT /api/properties/[id]/zoning - Update zoning profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    // Check if zoning profile exists
    const existing = await prisma.zoningProfile.findUnique({
      where: { property_id: id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Zoning profile not found. Use POST to create.' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    // Only update fields that are provided
    if (data.jurisdiction !== undefined) updateData.jurisdiction = data.jurisdiction
    if (data.is_unincorporated !== undefined) updateData.is_unincorporated = data.is_unincorporated
    if (data.zoning_code !== undefined) updateData.zoning_code = data.zoning_code
    if (data.zoning_name !== undefined) updateData.zoning_name = data.zoning_name
    if (data.land_use_designation !== undefined) updateData.land_use_designation = data.land_use_designation
    if (data.permitted_uses !== undefined) updateData.permitted_uses = JSON.stringify(data.permitted_uses)
    if (data.conditional_uses !== undefined) updateData.conditional_uses = JSON.stringify(data.conditional_uses)
    if (data.prohibited_uses !== undefined) updateData.prohibited_uses = JSON.stringify(data.prohibited_uses)
    if (data.min_lot_size_sqft !== undefined) updateData.min_lot_size_sqft = data.min_lot_size_sqft
    if (data.min_lot_size_acres !== undefined) updateData.min_lot_size_acres = data.min_lot_size_acres
    if (data.front_setback_ft !== undefined) updateData.front_setback_ft = data.front_setback_ft
    if (data.side_setback_ft !== undefined) updateData.side_setback_ft = data.side_setback_ft
    if (data.rear_setback_ft !== undefined) updateData.rear_setback_ft = data.rear_setback_ft
    if (data.max_height_ft !== undefined) updateData.max_height_ft = data.max_height_ft
    if (data.max_height_stories !== undefined) updateData.max_height_stories = data.max_height_stories
    if (data.max_lot_coverage_percent !== undefined) updateData.max_lot_coverage_percent = data.max_lot_coverage_percent
    if (data.frontage_required_ft !== undefined) updateData.frontage_required_ft = data.frontage_required_ft
    if (data.has_slope_restrictions !== undefined) updateData.has_slope_restrictions = data.has_slope_restrictions
    if (data.has_floodplain_restrictions !== undefined) updateData.has_floodplain_restrictions = data.has_floodplain_restrictions
    if (data.has_wildfire_restrictions !== undefined) updateData.has_wildfire_restrictions = data.has_wildfire_restrictions
    if (data.has_open_space_requirements !== undefined) updateData.has_open_space_requirements = data.has_open_space_requirements
    if (data.overlays !== undefined) updateData.overlays = JSON.stringify(data.overlays)
    if (data.has_legal_access !== undefined) updateData.has_legal_access = data.has_legal_access
    if (data.access_type !== undefined) updateData.access_type = data.access_type
    if (data.utilities_status !== undefined) updateData.utilities_status = data.utilities_status
    if (data.water_source !== undefined) updateData.water_source = data.water_source
    if (data.sewer_type !== undefined) updateData.sewer_type = data.sewer_type
    if (data.slope_percent !== undefined) updateData.slope_percent = data.slope_percent
    if (data.buildable_area_sqft !== undefined) updateData.buildable_area_sqft = data.buildable_area_sqft
    if (data.buildability_score !== undefined) updateData.buildability_score = data.buildability_score
    if (data.buildability_notes !== undefined) updateData.buildability_notes = data.buildability_notes
    if (data.best_use_ideas !== undefined) updateData.best_use_ideas = JSON.stringify(data.best_use_ideas)
    if (data.use_difficulty !== undefined) updateData.use_difficulty = data.use_difficulty
    if (data.estimated_time_to_entitlement !== undefined) updateData.estimated_time_to_entitlement = data.estimated_time_to_entitlement
    if (data.next_steps !== undefined) updateData.next_steps = data.next_steps
    if (data.zoning_map_url !== undefined) updateData.zoning_map_url = data.zoning_map_url
    if (data.zoning_ordinance_url !== undefined) updateData.zoning_ordinance_url = data.zoning_ordinance_url
    if (data.data_last_verified !== undefined) updateData.data_last_verified = new Date(data.data_last_verified)
    if (data.notes !== undefined) updateData.notes = data.notes

    const zoningProfile = await prisma.zoningProfile.update({
      where: { property_id: id },
      data: updateData
    })

    return NextResponse.json(zoningProfile)
  } catch (error) {
    console.error('Error updating zoning profile:', error)
    return NextResponse.json(
      { error: 'Failed to update zoning profile' },
      { status: 500 }
    )
  }
}

// DELETE /api/properties/[id]/zoning - Delete zoning profile
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.zoningProfile.delete({
      where: { property_id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting zoning profile:', error)
    return NextResponse.json(
      { error: 'Failed to delete zoning profile' },
      { status: 500 }
    )
  }
}
