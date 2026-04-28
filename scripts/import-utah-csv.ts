// Import script for Utah County 2026 CSV
// Usage: npx ts-node scripts/import-utah-csv.ts

const fs = require('fs');

const CSV_PATH = '/Users/andres/Desktop/utah_county_2026_full.csv';
const API_URL = 'http://localhost:3000/api/properties';

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

  return lines.slice(1).map((line: string, index: number) => {
    // Handle quoted fields with commas
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

async function importProperty(row: CSVRow, index: number): Promise<{ success: boolean; error?: string }> {
  // Send all values as strings - the API will parse them
  const propertyData = {
    parcel_number: row.parcel_number,
    total_amount_due: row.total_amount_due, // string
    sale_year: row.sale_year, // string
    sale_date: row.sale_date,
    county: row.county,
    owner_name: row.owner_name,
    owner_mailing_address: row.owner_mailing_address,
    status: 'new',
    property_type: 'unknown',
    county_source_url: row.county_source_url,
    source_last_checked_at: row.status_last_verified_at,
    status_last_verified_at: row.status_last_verified_at,
    presale_volatility_risk: '10', // string
    is_active_sale_candidate: 'true' // string
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText.substring(0, 200) };
      }
      return { success: false, error: JSON.stringify(errorJson) };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function main() {
  console.log('Reading CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Found ${rows.length} properties to import`);
  console.log('\nFirst 3 rows preview:');
  rows.slice(0, 3).forEach((row: CSVRow, i: number) => {
    console.log(`  ${i + 1}. ${row.parcel_number} - $${row.total_amount_due} - ${row.owner_name}`);
  });

  console.log('\n--- Field Mapping ---');
  console.log('CSV parcel_number → App parcel_number');
  console.log('CSV total_amount_due → App total_amount_due');
  console.log('CSV sale_year → App sale_year');
  console.log('CSV sale_date → App sale_date');
  console.log('CSV county → App county');
  console.log('CSV owner_name → App owner_name');
  console.log('CSV owner_mailing_address → App owner_mailing_address');
  console.log('Defaults: status=new, property_type=unknown, presale_volatility_risk=10');

  console.log('\nImporting...');
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const result = await importProperty(rows[i], i);
    if (result.success) {
      imported++;
      process.stdout.write('.');
    } else {
      skipped++;
      errors.push({ row: i + 1, error: result.error || 'Unknown error' });
      process.stdout.write('x');
    }

    if ((i + 1) % 50 === 0) {
      console.log(` ${i + 1}/${rows.length}`);
    }
  }

  console.log('\n\n--- Import Complete ---');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nFirst 5 errors:');
    errors.slice(0, 5).forEach(e => console.log(`  Row ${e.row}: ${e.error}`));
  }
}

main().catch(console.error);
