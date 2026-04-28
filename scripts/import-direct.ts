// Direct import script using Prisma
// Bypasses the API and inserts directly

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const CSV_PATH = '/Users/andres/Desktop/utah_county_2026_full.csv';

interface CSVRow {
  parcel_number: string;
  total_amount_due: string;
  sale_year: string;
  sale_date: string;
  county: string;
  owner_name: string;
  owner_mailing_address: string;
  status_last_verified_at: string;
  county_source_url: string;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const row: any = {};
    headers.forEach((header: string, i: number) => {
      row[header] = values[i] || '';
    });

    return row as CSVRow;
  });
}

async function calculateScores(row: CSVRow) {
  // Simplified scoring - just calculate basic scores
  const amountDue = parseFloat(row.total_amount_due) || 0;

  // Opportunity score (simplified)
  const opportunityScore = 50; // Default mid score

  // Risk score - base 30 + presale volatility
  const presaleVolatility = 10; // Utah County default
  const riskScore = 30 + presaleVolatility;

  // Final score
  const finalScore = opportunityScore - (riskScore * 0.5);

  // Recommendation
  let recommendation = 'research_more';
  if (finalScore >= 70) recommendation = 'bid';
  else if (finalScore < 40) recommendation = 'avoid';

  return {
    opportunity_score: opportunityScore,
    risk_score: riskScore,
    final_score: finalScore,
    recommendation,
    presale_volatility_risk: presaleVolatility
  };
}

async function importRow(row: CSVRow) {
  const scores = await calculateScores(row);

  return prisma.property.create({
    data: {
      county: row.county,
      sale_year: parseInt(row.sale_year) || 2026,
      sale_date: row.sale_date || null,
      parcel_number: row.parcel_number,
      owner_name: row.owner_name || null,
      owner_mailing_address: row.owner_mailing_address || null,
      total_amount_due: parseFloat(row.total_amount_due) || 0,
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
      data_confidence: 0.3, // Low confidence since minimal data
      county_source_url: row.county_source_url,
      source_last_checked_at: new Date(row.status_last_verified_at),
      status_last_verified_at: new Date(row.status_last_verified_at),
      presale_volatility_risk: scores.presale_volatility_risk,
      is_active_sale_candidate: true,
      status: 'new'
    }
  });
}

async function main() {
  console.log('Reading CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Found ${rows.length} properties to import\n`);

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      await importRow(rows[i]);
      imported++;
      process.stdout.write('.');
    } catch (err) {
      errors++;
      process.stdout.write('x');
      if (errors <= 3) {
        console.error(`\nError on row ${i + 1}:`, err);
      }
    }

    if ((i + 1) % 50 === 0) {
      console.log(` ${i + 1}/${rows.length}`);
    }
  }

  console.log(`\n\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
