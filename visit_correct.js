const { chromium } = require('playwright');

async function visitCounty(name, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Status: ${response.status()}`);
    
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Get content
    const text = await page.evaluate(() => document.body.innerText);
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 100)
    })));
    
    // Check if it's actually a tax sale page
    if (/tax sale|public auction/i.test(text)) {
      console.log(`\n✓ TAX SALE PAGE CONFIRMED`);
      
      // Date detection
      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
        /\d{1,2}\/\d{1,2}\/\d{4}/,
        /(May|June|July|August|September)\s+\d{1,2}/i,
        /20\d{6}/
      ];
      
      let auctionDate = 'NOT FOUND';
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          auctionDate = match[0];
          break;
        }
      }
      console.log(`Auction Date: ${auctionDate}`);
      
      // PDF detection
      const pdfLinks = links.filter(l => l.href.toLowerCase().endsWith('.pdf'));
      console.log(`PDF Links: ${pdfLinks.length}`);
      if (pdfLinks.length > 0) {
        pdfLinks.slice(0, 3).forEach(l => console.log(`  - ${l.text.substring(0, 40)}: ${l.href.substring(0, 60)}`));
      }
      
      // Tables
      const tables = await page.$$('table');
      console.log(`HTML Tables: ${tables.length}`);
      
      // Vendor
      const vendors = [
        { name: 'Bid4Assets', pattern: /bid4assets/i },
        { name: 'RealAuction', pattern: /realauction/i },
        { name: 'SRI', pattern: /sri/i },
        { name: 'Grant Street', pattern: /grant/i }
      ];
      
      let vendor = 'None';
      for (const v of vendors) {
        if (v.pattern.test(text) || links.some(l => v.pattern.test(l.href))) {
          vendor = v.name;
          break;
        }
      }
      console.log(`Vendor Platform: ${vendor}`);
      
      // GIS/Assessor
      const gisLinks = links.filter(l => 
        /assessor|gis|parcel|map|records/i.test(l.text) ||
        /assessor|gis|parcel|map/i.test(l.href)
      );
      console.log(`GIS/Assessor Links: ${gisLinks.length}`);
      
      // Content preview
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 15 && l.length < 120)
        .slice(0, 8);
      console.log(`\n--- Content Preview ---`);
      lines.forEach(l => console.log(`  ${l}`));
      
      // Determine automation ease
      let ease = 'Medium';
      if (vendor !== 'None') {
        ease = 'Hard (vendor)';
      } else if (tables.length > 0 && pdfLinks.length === 0) {
        ease = 'Easy (HTML)';
      } else if (pdfLinks.length > 0) {
        ease = 'Medium (PDF)';
      }
      console.log(`\nAutomation Ease: ${ease}`);
      
    } else {
      console.log(`\n✗ NOT A TAX SALE PAGE`);
      console.log('Looking for tax sale links...');
      
      const taxLinks = links.filter(l => 
        /tax sale|auction|treasurer/i.test(l.text) ||
        /taxsale|auction/i.test(l.href)
      );
      
      if (taxLinks.length > 0) {
        console.log('Found links:');
        taxLinks.slice(0, 5).forEach(l => console.log(`  ${l.text.substring(0, 50)}: ${l.href}`));
      }
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
    // Try common patterns
    { name: 'Utah County', url: 'https://www.utahcounty.gov/Dept/Treas/Auctions.aspx' },
    { name: 'Summit County', url: 'https://www.summitcountyutah.gov/340/Tax-Sale' },
    { name: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/treasurer/tax-sale-property.html' },
    { name: 'Cache County', url: 'https://www.cachecounty.org/treasurer/' },
    { name: 'Davis County', url: 'https://www.daviscountyutah.gov/treasurer/tax-sale' },
    { name: 'Weber County', url: 'https://www.webercountyutah.gov/treasurer/tax-sale' }
  ];
  
  for (const county of counties) {
    await visitCounty(county.name, county.url);
  }
}

main().catch(console.error);
