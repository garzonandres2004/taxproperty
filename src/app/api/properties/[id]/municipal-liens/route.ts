import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  checkMunicipalLiens, 
  calculateLienRiskLevel, 
  getMunicipalLienScorePenalty,
  generateLienWarning 
} from '@/lib/municipal-liens'

/**
 * GET /api/properties/[id]/municipal-liens
 * Check municipal liens for a property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        parcel_number: true,
        property_address: true,
        municipal_lien_risk: true,
        code_violations_found: true,
        code_violations_balance_due: true,
        utility_lien_notes: true,
        municipal_lien_checked_at: true,
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check if we have recent cached data (less than 24 hours old)
    const checkedAt = property.municipal_lien_checked_at
    const isCacheValid = checkedAt && 
      (new Date().getTime() - new Date(checkedAt).getTime()) < 24 * 60 * 60 * 1000

    if (isCacheValid && property.municipal_lien_risk !== 'unknown') {
      return NextResponse.json({
        parcel_number: property.parcel_number,
        municipal_lien_risk: property.municipal_lien_risk,
        code_violations_found: property.code_violations_found,
        code_violations_balance_due: property.code_violations_balance_due,
        utility_lien_notes: property.utility_lien_notes,
        checked_at: property.municipal_lien_checked_at,
        cached: true,
      })
    }

    // Perform fresh check
    const result = await checkMunicipalLiens(
      property.parcel_number,
      property.property_address
    )

    // Calculate risk level
    const riskLevel = calculateLienRiskLevel(result)
    const scorePenalty = getMunicipalLienScorePenalty(riskLevel)
    const warning = generateLienWarning(result, riskLevel)

    // Update property record
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        municipal_lien_risk: riskLevel.toLowerCase(),
        code_violations_found: result.hasViolations,
        code_violations_balance_due: result.totalBalanceDue > 0 ? result.totalBalanceDue : null,
        utility_lien_notes: result.notes,
        municipal_lien_checked_at: new Date(),
      }
    })

    return NextResponse.json({
      parcel_number: property.parcel_number,
      municipal_lien_risk: riskLevel.toLowerCase(),
      code_violations_found: result.hasViolations,
      code_violations_balance_due: result.totalBalanceDue > 0 ? result.totalBalanceDue : null,
      utility_lien_notes: result.notes,
      warning,
      score_penalty: scorePenalty,
      cases: result.cases.slice(0, 5), // Limit to 5 cases for brevity
      checked_at: new Date().toISOString(),
      cached: false,
    })

  } catch (error) {
    console.error('Error checking municipal liens:', error)
    return NextResponse.json(
      { error: 'Failed to check municipal liens' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/properties/[id]/municipal-liens
 * Trigger a fresh check (bypass cache)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        parcel_number: true,
        property_address: true,
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Perform fresh check
    const result = await checkMunicipalLiens(
      property.parcel_number,
      property.property_address
    )

    // Calculate risk level
    const riskLevel = calculateLienRiskLevel(result)
    const scorePenalty = getMunicipalLienScorePenalty(riskLevel)
    const warning = generateLienWarning(result, riskLevel)

    // Update property record
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        municipal_lien_risk: riskLevel.toLowerCase(),
        code_violations_found: result.hasViolations,
        code_violations_balance_due: result.totalBalanceDue > 0 ? result.totalBalanceDue : null,
        utility_lien_notes: result.notes,
        municipal_lien_checked_at: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      parcel_number: property.parcel_number,
      municipal_lien_risk: riskLevel.toLowerCase(),
      code_violations_found: result.hasViolations,
      code_violations_balance_due: result.totalBalanceDue > 0 ? result.totalBalanceDue : null,
      utility_lien_notes: result.notes,
      warning,
      score_penalty: scorePenalty,
      cases: result.cases.slice(0, 5),
      checked_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error checking municipal liens:', error)
    return NextResponse.json(
      { error: 'Failed to check municipal liens' },
      { status: 500 }
    )
  }
}
