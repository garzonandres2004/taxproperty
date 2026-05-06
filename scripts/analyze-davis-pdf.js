// Analyze Davis County Tax Sale PDF
const pdfParse = require('pdf-parse');
const fs = require('fs');

const pdfPath = '/Users/andres/Downloads/davis_2026_tax_sale.pdf';

async function analyzePDF() {
  console.log('Analyzing Davis County Tax Sale PDF...\n');

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);

  console.log('=== PDF INFO ===');
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length, 'characters');
  console.log('');

  console.log('=== FIRST 2000 CHARACTERS ===');
  console.log(data.text.substring(0, 2000));
  console.log('');

  console.log('=== LOOKING FOR PROPERTY DATA ===');
  const lines = data.text.split('\n').filter(line => line.trim());

  // Buscar líneas que parecen datos de propiedades (tienen números y direcciones)
  const propertyLines = lines.filter(line => {
    // Tiene números y es más largo que 20 caracteres
    return line.match(/\d/) && line.length > 20 && line.length < 200;
  });

  console.log(`\nFound ${propertyLines.length} potential property lines`);
  console.log('\nFirst 10 property lines:');
  propertyLines.slice(0, 10).forEach((line, i) => {
    console.log(`${i + 1}. ${line}`);
  });
}

analyzePDF().catch(console.error);
