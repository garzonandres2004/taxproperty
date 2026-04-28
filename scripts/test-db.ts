// Test database connection and create a property directly
import { prisma } from '../src/lib/db';
import { scoreProperty, getDefaultSettings } from '../src/lib/scoring';

async function test() {
  try {
    console.log('Testing database connection...');

    // Count existing properties
    const count = await prisma.property.count();
    console.log(`Current property count: ${count}`);

    // Get default settings
    const settings = getDefaultSettings();
    console.log('Settings:', settings);

    // Test scoring
    const scores = scoreProperty({
      county: 'utah',
      total_amount_due: 1000,
      estimated_market_value: null,
      estimated_repair_cost: null,
      estimated_cleanup_cost: null,
      estimated_closing_cost: null,
      property_type: 'unknown',
      occupancy_status: 'unknown',
      zoning: null,
      lot_size_sqft: null,
      building_sqft: null,
      year_built: null,
      assessed_value: null,
      deposit_required: null,
      data_confidence: 0.5,
      access_risk: 'unknown',
      title_risk: 'unknown',
      legal_risk: 'unknown',
      marketability_risk: 'unknown',
      is_active_sale_candidate: true,
      presale_volatility_risk: 10
    }, settings);

    console.log('Scores:', scores);

    // Try to create a property
    console.log('\nCreating test property...');
    const property = await prisma.property.create({
      data: {
        county: 'utah',
        sale_year: 2026,
        sale_date: '2026-05-21',
        parcel_number: 'TEST:001',
        owner_name: 'Test Owner',
        total_amount_due: 1000,
        property_type: 'unknown',
        occupancy_status: 'unknown',
        access_risk: 'unknown',
        title_risk: 'unknown',
        legal_risk: 'unknown',
        marketability_risk: 'unknown',
        opportunity_score: scores.opportunity_score,
        risk_score: scores.risk_score,
        final_score: scores.final_score,
        recommendation: scores.recommendation,
        data_confidence: 0.5,
        presale_volatility_risk: 10,
        is_active_sale_candidate: true
      }
    });

    console.log('Created property:', property.id);
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
