import { prisma } from '../src/lib/db'

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.source.deleteMany()
  await prisma.outcomeEvent.deleteMany()
  await prisma.property.deleteMany()

  // Seed properties
  const properties = [
    // Utah County - Strong opportunity
    {
      county: 'utah',
      sale_year: 2026,
      sale_date: '2026-05-21',
      parcel_number: '55-123-4567',
      owner_name: 'John Smith',
      owner_mailing_address: '123 Main St, Provo, UT 84601',
      property_address: '456 Oak Ave, Provo, UT 84604',
      legal_description: 'Lot 5, Block 2, Oak Hills Subdivision',
      total_amount_due: 8500,
      assessed_value: 285000,
      estimated_market_value: 320000,
      estimated_repair_cost: 5000,
      estimated_cleanup_cost: 1000,
      estimated_closing_cost: 2500,
      property_type: 'single_family',
      occupancy_status: 'owner_occupied',
      zoning: 'R-1 Residential',
      lot_size_sqft: 7840,
      building_sqft: 2100,
      year_built: 1985,
      auction_platform: 'Public Surplus',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'low',
      data_confidence: 85,
      notes: 'Clean title, owner occupied, well-maintained neighborhood. Quick redemption likely but good interest rate.',
      status: 'ready',
      sources: {
        create: [
          { label: 'Utah County Tax Sale List', url: 'https://auditor.utahcounty.gov/may-tax-sale/property-list', source_type: 'county_listing' },
          { label: 'Assessor Record', url: 'https://www.utahcounty.gov/assessor', source_type: 'assessor' }
        ]
      }
    },
    // Utah County - Vacant land, medium opportunity
    {
      county: 'utah',
      sale_year: 2026,
      sale_date: '2026-05-21',
      parcel_number: '55-234-5678',
      owner_name: 'Desert Holdings LLC',
      owner_mailing_address: 'PO Box 123, Salt Lake City, UT 84101',
      property_address: null,
      legal_description: 'S1/2 NW1/4 Section 15, T7S R2E',
      total_amount_due: 3200,
      assessed_value: 45000,
      estimated_market_value: 60000,
      estimated_repair_cost: 0,
      estimated_cleanup_cost: 500,
      estimated_closing_cost: 1500,
      property_type: 'vacant_land',
      occupancy_status: 'vacant',
      zoning: 'A-1 Agricultural',
      lot_size_sqft: 871200,
      building_sqft: null,
      year_built: null,
      auction_platform: 'Public Surplus',
      deposit_required: 500,
      access_risk: 'medium',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'medium',
      data_confidence: 60,
      notes: '20-acre parcel. Dirt road access. Need to verify utilities availability.',
      status: 'researching',
      sources: {
        create: [
          { label: 'Utah County Tax Sale List', url: 'https://auditor.utahcounty.gov/may-tax-sale/property-list', source_type: 'county_listing' }
        ]
      }
    },
    // Utah County - Redeemed (already paid)
    {
      county: 'utah',
      sale_year: 2026,
      sale_date: '2026-05-21',
      parcel_number: '55-345-6789',
      owner_name: 'Maria Garcia',
      owner_mailing_address: '789 Maple Dr, Orem, UT 84057',
      property_address: '789 Maple Dr, Orem, UT 84057',
      legal_description: 'Lot 12, Block 4, Maple Heights',
      total_amount_due: 12000,
      assessed_value: 310000,
      estimated_market_value: 350000,
      estimated_repair_cost: 8000,
      estimated_cleanup_cost: 2000,
      estimated_closing_cost: 3000,
      property_type: 'single_family',
      occupancy_status: 'owner_occupied',
      zoning: 'R-1 Residential',
      lot_size_sqft: 7200,
      building_sqft: 1850,
      year_built: 1992,
      auction_platform: 'Public Surplus',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'low',
      data_confidence: 90,
      notes: 'Owner paid taxes on 2026-04-15. Property removed from sale list.',
      status: 'redeemed',
      sources: {
        create: [
          { label: 'Utah County Tax Sale List', source_type: 'county_listing' }
        ]
      },
      outcomes: {
        create: [
          { event_type: 'redeemed', event_date: '2026-04-15', details: 'Owner paid delinquent taxes' }
        ]
      }
    },
    // Salt Lake County - Strong opportunity
    {
      county: 'salt_lake',
      sale_year: 2026,
      sale_date: '2026-05-27',
      parcel_number: '22-11-33-444',
      owner_name: 'Robert Johnson Estate',
      owner_mailing_address: 'Care of Attorney, 555 Legal Ave, SLC, UT 84101',
      property_address: '2221 E 3300 S, Salt Lake City, UT 84109',
      legal_description: 'Lot 8, Block 3, Millcreek Estates',
      total_amount_due: 15200,
      assessed_value: 425000,
      estimated_market_value: 475000,
      estimated_repair_cost: 15000,
      estimated_cleanup_cost: 2000,
      estimated_closing_cost: 3500,
      property_type: 'single_family',
      occupancy_status: 'vacant',
      zoning: 'R-1 Residential',
      lot_size_sqft: 10000,
      building_sqft: 2400,
      year_built: 1978,
      auction_platform: 'bid4assets.com',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'medium',
      legal_risk: 'medium',
      marketability_risk: 'low',
      data_confidence: 75,
      notes: 'Estate sale. Property vacant. May need probate clearance. Good neighborhood, strong resale potential.',
      status: 'ready',
      sources: {
        create: [
          { label: 'Salt Lake County Tax Sale', url: 'https://www.saltlakecounty.gov/property-tax/property-tax-sale/', source_type: 'county_listing' },
          { label: 'SLC Assessor', source_type: 'assessor' }
        ]
      }
    },
    // Salt Lake County - High risk, low opportunity
    {
      county: 'salt_lake',
      sale_year: 2026,
      sale_date: '2026-05-27',
      parcel_number: '22-22-44-555',
      owner_name: 'Unknown Owner',
      owner_mailing_address: null,
      property_address: null,
      legal_description: 'Lot 99, Unrecorded Plat',
      total_amount_due: 850,
      assessed_value: 5000,
      estimated_market_value: 8000,
      estimated_repair_cost: 0,
      estimated_cleanup_cost: 500,
      estimated_closing_cost: 1000,
      property_type: 'vacant_land',
      occupancy_status: 'unknown',
      zoning: 'Unknown',
      lot_size_sqft: 2178,
      building_sqft: null,
      year_built: null,
      auction_platform: 'bid4assets.com',
      deposit_required: 500,
      access_risk: 'high',
      title_risk: 'high',
      legal_risk: 'high',
      marketability_risk: 'high',
      data_confidence: 20,
      notes: 'Very small odd-shaped lot. Unclear if buildable. No known address. High legal risk.',
      status: 'new',
      sources: {
        create: [
          { label: 'Salt Lake County Tax Sale List', source_type: 'county_listing' }
        ]
      }
    },
    // Salt Lake County - Commercial, medium opportunity
    {
      county: 'salt_lake',
      sale_year: 2026,
      sale_date: '2026-05-27',
      parcel_number: '22-33-55-666',
      owner_name: 'ABC Investments LLC',
      owner_mailing_address: '1000 Business Pkwy, SLC, UT 84116',
      property_address: '4500 S State St, Murray, UT 84107',
      legal_description: 'Unit 3A, Commerce Plaza',
      total_amount_due: 28000,
      assessed_value: 650000,
      estimated_market_value: 720000,
      estimated_repair_cost: 25000,
      estimated_cleanup_cost: 5000,
      estimated_closing_cost: 8000,
      property_type: 'commercial',
      occupancy_status: 'tenant',
      zoning: 'C-2 Commercial',
      lot_size_sqft: 15000,
      building_sqft: 4500,
      year_built: 1998,
      auction_platform: 'bid4assets.com',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'medium',
      data_confidence: 70,
      notes: 'Commercial retail with tenant in place. Higher entry cost but good income potential.',
      status: 'researching',
      sources: {
        create: [
          { label: 'SLC Tax Sale Listing', source_type: 'county_listing' },
          { label: 'County Assessor', source_type: 'assessor' },
          { label: 'GIS Map', source_type: 'gis' }
        ]
      }
    },
    // Utah County - Condo
    {
      county: 'utah',
      sale_year: 2026,
      sale_date: '2026-05-21',
      parcel_number: '55-456-7890',
      owner_name: 'Sarah Williams',
      owner_mailing_address: '555 Condo Ln, Provo, UT 84606',
      property_address: '555 Condo Ln Unit 302, Provo, UT 84606',
      legal_description: 'Unit 302, Building B, Mountain View Condos',
      total_amount_due: 4200,
      assessed_value: 175000,
      estimated_market_value: 195000,
      estimated_repair_cost: 3000,
      estimated_cleanup_cost: 500,
      estimated_closing_cost: 1500,
      property_type: 'condo',
      occupancy_status: 'tenant',
      zoning: 'R-3 Residential Multi',
      lot_size_sqft: null,
      building_sqft: 980,
      year_built: 2005,
      auction_platform: 'Public Surplus',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'low',
      data_confidence: 80,
      notes: 'Near BYU, strong rental market. HOA fees need verification.',
      status: 'ready',
      sources: {
        create: [
          { label: 'Utah County Tax Sale', source_type: 'county_listing' },
          { label: 'Condo Assoc Info', source_type: 'manual_note' }
        ]
      }
    },
    // Utah County - Mobile home
    {
      county: 'utah',
      sale_year: 2026,
      sale_date: '2026-05-21',
      parcel_number: '55-567-8901',
      owner_name: 'David Brown',
      owner_mailing_address: '789 Park Rd #12, Spanish Fork, UT 84660',
      property_address: '789 Park Rd #12, Spanish Fork, UT 84660',
      legal_description: 'Space 12, Riverview Mobile Home Park',
      total_amount_due: 1800,
      assessed_value: 35000,
      estimated_market_value: 45000,
      estimated_repair_cost: 2000,
      estimated_cleanup_cost: 300,
      estimated_closing_cost: 800,
      property_type: 'mobile_home',
      occupancy_status: 'vacant',
      zoning: 'MHP Mobile Home Park',
      lot_size_sqft: 6000,
      building_sqft: 980,
      year_built: 1995,
      auction_platform: 'Public Surplus',
      deposit_required: 500,
      access_risk: 'medium',
      title_risk: 'medium',
      legal_risk: 'low',
      marketability_risk: 'medium',
      data_confidence: 65,
      notes: 'Mobile home in park. Space rent $450/mo. Unit needs cosmetic work.',
      status: 'researching',
      sources: {
        create: [
          { label: 'Utah County List', source_type: 'county_listing' }
        ]
      }
    },
    // Salt Lake County - Multi-family
    {
      county: 'salt_lake',
      sale_year: 2026,
      sale_date: '2026-05-27',
      parcel_number: '22-44-66-777',
      owner_name: 'Westside Properties Inc',
      owner_mailing_address: 'PO Box 789, SLC, UT 84102',
      property_address: '1200 W 200 S, Salt Lake City, UT 84104',
      legal_description: 'Lot 4-6, Block 10, Glendale',
      total_amount_due: 18500,
      assessed_value: 380000,
      estimated_market_value: 420000,
      estimated_repair_cost: 30000,
      estimated_cleanup_cost: 5000,
      estimated_closing_cost: 5000,
      property_type: 'multifamily',
      occupancy_status: 'tenant',
      zoning: 'R-2 Residential Multi',
      lot_size_sqft: 7200,
      building_sqft: 3200,
      year_built: 1965,
      auction_platform: 'bid4assets.com',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'medium',
      data_confidence: 70,
      notes: 'Duplex with tenants. One unit needs significant repair. C+ neighborhood.',
      status: 'researching',
      sources: {
        create: [
          { label: 'SLC Tax Sale', source_type: 'county_listing' },
          { label: 'Property Inspection', source_type: 'manual_note' }
        ]
      }
    },
    // Salt Lake County - Already passed on
    {
      county: 'salt_lake',
      sale_year: 2026,
      sale_date: '2026-05-27',
      parcel_number: '22-55-77-888',
      owner_name: 'Thomas Anderson',
      owner_mailing_address: '321 Hillside Dr, SLC, UT 84103',
      property_address: '321 Hillside Dr, SLC, UT 84103',
      legal_description: 'Lot 7, The Avenues',
      total_amount_due: 22000,
      assessed_value: 580000,
      estimated_market_value: 650000,
      estimated_repair_cost: 80000,
      estimated_cleanup_cost: 5000,
      estimated_closing_cost: 6000,
      property_type: 'single_family',
      occupancy_status: 'vacant',
      zoning: 'R-1 Residential',
      lot_size_sqft: 5400,
      building_sqft: 2100,
      year_built: 1920,
      auction_platform: 'bid4assets.com',
      deposit_required: 500,
      access_risk: 'low',
      title_risk: 'low',
      legal_risk: 'low',
      marketability_risk: 'low',
      data_confidence: 75,
      notes: 'Historic home in Avenues. Needs major structural repairs. Too much rehab for my budget.',
      status: 'passed',
      sources: {
        create: [
          { label: 'SLC Tax Sale', source_type: 'county_listing' },
          { label: 'Walk-through Notes', source_type: 'manual_note' }
        ]
      },
      outcomes: {
        create: [
          { event_type: 'passed', event_date: '2026-04-20', details: 'Too much rehab needed. Passed on this one.' }
        ]
      }
    }
  ]

  for (const property of properties) {
    // Calculate scores before creating
    const { scoreProperty, calculateDataConfidence } = await import('../src/lib/scoring')
    const dataConf = calculateDataConfidence({
      total_amount_due: property.total_amount_due,
      estimated_market_value: property.estimated_market_value,
      property_type: property.property_type,
      occupancy_status: property.occupancy_status,
      zoning: property.zoning,
      lot_size_sqft: property.lot_size_sqft,
      building_sqft: property.building_sqft,
      year_built: property.year_built,
      assessed_value: property.assessed_value
    })

    const scores = scoreProperty({
      total_amount_due: property.total_amount_due,
      estimated_market_value: property.estimated_market_value,
      estimated_repair_cost: property.estimated_repair_cost,
      estimated_cleanup_cost: property.estimated_cleanup_cost,
      estimated_closing_cost: property.estimated_closing_cost,
      property_type: property.property_type,
      occupancy_status: property.occupancy_status,
      zoning: property.zoning,
      lot_size_sqft: property.lot_size_sqft,
      building_sqft: property.building_sqft,
      year_built: property.year_built,
      assessed_value: property.assessed_value,
      deposit_required: property.deposit_required,
      data_confidence: dataConf,
      access_risk: property.access_risk,
      title_risk: property.title_risk,
      legal_risk: property.legal_risk,
      marketability_risk: property.marketability_risk
    })

    await prisma.property.create({
      data: {
        ...property,
        data_confidence: dataConf,
        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        final_score: scores.final_score,
        recommendation: scores.recommendation
      }
    })
  }

  console.log('Seeded 10 properties')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
