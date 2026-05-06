const { chromium } = require('playwright');

async function visitPage(name, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    const text = await page.evaluate(() => document.body.innerText);
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 80)
    })));
    
    // Date detection
    const datePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[456]/gi,
      /\d{1,2}\/\d{1,2}\/202[456]/g,
      /20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}/g
    ];
    
    const foundDates = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) foundDates.push(...matches);
    }
    
    const uniqueDates = [...new Set(foundDates)];
    if (uniqueDates.length > 0) {
      console.log(`\n*** Auction Dates: ${uniqueDates.join(', ')} ***`);
    }
    
    // PDFs
    const pdfLinks = links.filter(l => l.href.toLowerCase().endsWith('.pdf'));
    console.log(`\nPDF Links: ${pdfLinks.length}`);
    pdfLinks.slice(0, 5).forEach(l => {
      const isPropertyList = /property|parcel|list|202[456]/i.test(l.href) || /list|property/i.test(l.text);
      const marker = isPropertyList ? '*** ' : '';
      console.log(`  ${marker}${l.text.substring(0, 40)}: ${l.href.substring(l.href.lastIndexOf('/') + 1)}`);
    });
    
    // Tables
    const tables = await page.$$('table');
    console.log(`\nHTML Tables: ${tables.length}`);
    
    // Vendor
    const vendors = ['Bid4Assets', 'RealAuction', 'SRI', 'Grant Street', 'BillTrax'];
    const foundVendor = vendors.find(v => text.toLowerCase().includes(v.toLowerCase()));
    console.log(`Vendor: ${foundVendor || 'None detected'}`);
    
    // GIS
    const gisLinks = links.filter(l => /assessor|gis|parcel|map/i.test(l.text + l.href));
    console.log(`GIS/Assessor Links: ${gisLinks.length}`);
    
    // Determine format
    let listType = 'Unknown';
    let ease = 'Unknown';
    
    if (pdfLinks.length > 0) {
      listType = 'PDF';
      ease = 'Medium';
    } else if (tables.length > 0) {
      listType = 'HTML Table';
      ease = 'Easy';
    } else if (foundVendor) {
      listType = 'Vendor Hosted';
      ease = 'Hard';
    }
    
    console.log(`\nList Format: ${listType}`);
    console.log(`Automation: ${ease}`);
    
    // Preview
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 15 && l.length < 100 && /sale|auction|property|date|202[456]/i.test(l))
      .slice(0, 8);
    
    if (lines.length > 0) {
      console.log(`\n--- Content Preview ---`);
      lines.forEach(l => console.log(`  ${l}`));
    }
    
    // Screenshot
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({ path: `${safeName}.png`, fullPage: true });
    console.log(`\nScreenshot: ${safeName}.png`);
    
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  await browser.close();
}

async function main() {
  const counties = [
    { name: 'Juab County Tax Sale', url: 'https://juabcounty.gov/residents/tax-sale/' },
    { name: 'Sanpete County Treasurer', url: 'https://www.sanpetecountyutah.gov/treasurer.html' },
    { name: 'Duchesne County Treasurer', url: 'https://duchesne.utah.gov/gov/elected-officials/treasurer/' },
    { name: 'Washington County 2025 List', url: 'https://www.washco.utah.gov/departments/treasurer/tax-sale/2025' }
  ];
  
  for (const county of counties) {
    await visitPage(county.name, county.url);
  }
}

main().catch(console.error);
