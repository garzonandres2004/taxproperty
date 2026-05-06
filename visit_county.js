const { chromium } = require('playwright');

async function visitCounty(name, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Get basic info
    const title = await page.title();
    console.log(`\nPage Title: ${title}`);
    
    // Get text content
    const text = await page.evaluate(() => document.body.innerText);
    const textLower = text.toLowerCase();
    
    // Look for auction date
    const datePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /(May|June|July|August|September|October)\s+\d{1,2}/i,
      /20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}/,
      /auction[^\n]{0,100}(May|June|July|August)\s+\d{1,2}/i
    ];
    
    let auctionDate = 'NOT FOUND';
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        auctionDate = match[0];
        break;
      }
    }
    console.log(`\nAuction Date: ${auctionDate}`);
    
    // Get all links
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 80)
    })));
    
    // Check for PDF links
    const pdfLinks = links.filter(l => l.href.toLowerCase().endsWith('.pdf'));
    console.log(`\nPDF Links: ${pdfLinks.length}`);
    if (pdfLinks.length > 0) {
      pdfLinks.slice(0, 3).forEach(l => console.log(`  - ${l.text}: ${l.href.substring(0, 60)}...`));
    }
    
    // Check for list type (HTML table vs PDF vs external)
    const tables = await page.$$('table');
    const hasTable = tables.length > 0;
    
    let listType = 'Unknown';
    if (pdfLinks.length > 0 && pdfLinks.some(l => 
      l.text.toLowerCase().includes('list') || 
      l.text.toLowerCase().includes('property') ||
      l.href.toLowerCase().includes('property') ||
      l.href.toLowerCase().includes('list')
    )) {
      listType = 'PDF Link';
    } else if (hasTable && tables.length >= 1) {
      listType = 'HTML Table';
    } else if (links.some(l => 
      l.href.includes('bid4') || 
      l.href.includes('realauction') ||
      l.href.includes('sri') ||
      l.href.includes('grantstreet')
    )) {
      listType = 'Vendor Hosted';
    }
    console.log(`List Format: ${listType}`);
    
    // Check for vendor
    const vendors = [
      { name: 'Bid4Assets', pattern: /bid4assets/i },
      { name: 'RealAuction', pattern: /realauction/i },
      { name: 'SRI', pattern: /sri/i },
      { name: 'Grant Street', pattern: /grantstreet|grant street/i }
    ];
    
    let vendor = 'Not detected';
    for (const v of vendors) {
      if (v.pattern.test(text) || links.some(l => v.pattern.test(l.href))) {
        vendor = v.name;
        break;
      }
    }
    console.log(`Vendor Platform: ${vendor}`);
    
    // GIS/Assessor links
    const gisLinks = links.filter(l => 
      /assessor|gis|parcel|map/i.test(l.text) ||
      /assessor|gis|parcel|map/i.test(l.href)
    );
    console.log(`\nGIS/Assessor Links: ${gisLinks.length}`);
    if (gisLinks.length > 0) {
      gisLinks.slice(0, 3).forEach(l => console.log(`  - ${l.text || 'Link'}: ${l.href.substring(0, 60)}...`));
    }
    
    // Extract visible fields (look for common headers)
    const fieldPatterns = [
      /parcel/i, /account/i, /serial/i, /owner/i, /taxpayer/i,
      /amount/i, /bid/i, /assessed/i, /value/i, /address/i,
      /location/i, /property/i, /status/i
    ];
    
    const foundFields = [];
    fieldPatterns.forEach(p => {
      if (p.test(text)) foundFields.push(p.source.replace('\\i', ''));
    });
    console.log(`\nDetected Fields: ${foundFields.slice(0, 8).join(', ') || 'N/A'}`);
    
    // Automation ease
    let ease = 'Medium';
    if (vendor !== 'Not detected') {
      ease = 'Hard (vendor scrape)';
    } else if (pdfLinks.length > 0 && !hasTable) {
      ease = 'Medium (PDF parsing)';
    } else if (hasTable) {
      ease = 'Easy (HTML table)';
    }
    console.log(`\nAutomation Difficulty: ${ease}`);
    
    // Key text snippets
    console.log(`\n--- Key Content ---`);
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10 && l.length < 150)
      .slice(0, 8);
    lines.forEach(l => console.log(`  ${l}`));
    
    // Screenshot
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({ path: `${safeName}.png`, fullPage: true });
    console.log(`\nScreenshot: ${safeName}.png`);
    
  } catch (e) {
    console.log(`\nERROR: ${e.message}`);
  }
  
  await browser.close();
  
  return {
    name,
    url,
    auctionDate: 'Detected above',
    listType: 'See above',
    vendor: 'See above',
    automationEase: 'See above'
  };
}

// Visit all counties
async function main() {
  const counties = [
    { name: 'Utah County', url: 'https://www.utahcounty.gov/Dept/PublicAuctions/' },
    { name: 'Summit County', url: 'https://www.summitcounty.org/340/Tax-Sale' },
    { name: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/treasurer/tax-sale.html' },
    { name: 'Cache County', url: 'https://www.cachecounty.org/treasurer/tax-sale.shtml' },
    { name: 'Kane County', url: 'https://www.kaneutah.com/departments/treasurer/tax-sale' },
    { name: 'Rich County', url: 'https://www.richcountyutah.gov/treasurer/tax-sale' }
  ];
  
  for (const county of counties) {
    await visitCounty(county.name, county.url);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('DONE - All counties visited');
  console.log('='.repeat(70));
}

main().catch(console.error);
