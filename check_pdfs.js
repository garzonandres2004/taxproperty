const { chromium } = require('playwright');

async function checkPDFs() {
  const browser = await chromium.launch({ headless: true });
  
  // PDF URLs found
  const pdfUrls = [
    { county: 'Iron County', url: 'https://ironcountyut.gov/files/treasurer/delinquent-tax-list' },
    { county: 'Washington County 2025', url: 'https://www.washco.utah.gov/departments/treasurer/tax-sale/2025' },
    { county: 'Washington County 2024', url: 'https://www.washco.utah.gov/departments/treasurer/tax-sale/2024' }
  ];
  
  for (const item of pdfUrls) {
    console.log(`\n=== ${item.county} ===`);
    console.log(`URL: ${item.url}`);
    
    try {
      const page = await browser.newPage();
      const response = await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      
      console.log(`Status: ${response?.status()}`);
      console.log(`Content-Type: ${response?.headers?.()['content-type'] || 'N/A'}`);
      
      // Check if it's actually a PDF
      const isPDF = response?.headers?.()['content-type']?.includes('pdf');
      console.log(`Is PDF: ${isPDF}`);
      
      await page.close();
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
  
  await browser.close();
}

async function checkMoreCounties() {
  const browser = await chromium.launch({ headless: true });
  
  const counties = [
    { name: 'Sanpete County', url: 'https://www.sanpetecountyutah.gov/' },
    { name: 'Sevier County', url: 'https://www.sevierutah.net/' },
    { name: 'Millard County', url: 'https://www.millardcounty.org/' },
    { name: 'Juab County', url: 'https://www.juabcounty.gov/' },
    { name: 'Wasatch County', url: 'https://www.wasatch.utah.gov/' },
    { name: 'Duchesne County', url: 'https://duchesne.utah.gov/' }
  ];
  
  for (const county of counties) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Checking: ${county.name}`);
    console.log(`URL: ${county.url}`);
    
    try {
      const page = await browser.newPage();
      await page.goto(county.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      // Get links
      const links = await page.$$eval('a', links => 
        links.filter(l => 
          /treasurer|tax|auction|sale/i.test(l.innerText) ||
          /treasurer|tax|auction/i.test(l.href)
        ).map(l => ({
          text: l.innerText.trim().substring(0, 50),
          href: l.href
        }))
      );
      
      if (links.length > 0) {
        console.log(`Found ${links.length} relevant links:`);
        links.slice(0, 5).forEach(l => console.log(`  ${l.text}: ${l.href.substring(0, 60)}`));
      } else {
        console.log('No treasurer/tax links found');
      }
      
      await page.close();
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
  
  await browser.close();
}

async function main() {
  console.log('=== CHECKING PDF URLs ===');
  await checkPDFs();
  
  console.log('\n\n=== CHECKING MORE COUNTIES ===');
  await checkMoreCounties();
}

main().catch(console.error);
