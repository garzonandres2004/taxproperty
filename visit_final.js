const { chromium } = require('playwright');

async function visitPage(name, url, type = 'page') {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name} (${type})`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 'N/A';
    console.log(`Status: ${status}`);
    
    if (status === 404 || status === 403) {
      console.log('Page not accessible');
      await browser.close();
      return;
    }
    
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    const text = await page.evaluate(() => document.body.innerText);
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 80)
    })));
    
    // Date detection - look for 2025/2026 auction dates
    const datePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[456]/gi,
      /\d{1,2}\/\d{1,2}\/202[456]/g,
      /202[456][-\/]\d{1,2}[-\/]\d{1,2}/g
    ];
    
    const foundDates = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) foundDates.push(...matches);
    }
    
    const uniqueDates = [...new Set(foundDates)];
    if (uniqueDates.length > 0) {
      console.log(`\n*** Auction Dates Found: ${uniqueDates.join(', ')} ***`);
    }
    
    // Look for property list indicators
    const hasPropertyList = /property|parcel|account|owner|amount|bid/i.test(text);
    console.log(`Has Property Data: ${hasPropertyList ? 'YES' : 'No'}`);
    
    // Check for tables
    const tables = await page.$$('table');
    console.log(`HTML Tables: ${tables.length}`);
    
    // Look for PDFs
    const pdfLinks = links.filter(l => l.href.toLowerCase().endsWith('.pdf'));
    console.log(`PDF Links: ${pdfLinks.length}`);
    if (pdfLinks.length > 0) {
      pdfLinks.slice(0, 5).forEach(l => {
        const isPropertyList = /202[456]|property|parcel|list|sale/i.test(l.href) || /list|property|parcel|sale/i.test(l.text);
        const marker = isPropertyList ? '*** PROPERTY LIST ***' : '';
        console.log(`  ${marker} ${l.text.substring(0, 40)}: ${l.href.substring(l.href.lastIndexOf('/') + 1, 60)}`);
      });
    }
    
    // Look for vendor platforms
    const vendors = [
      { name: 'Bid4Assets', pattern: /bid4assets/i },
      { name: 'RealAuction', pattern: /realauction/i },
      { name: 'SRI', pattern: /sri/i },
      { name: 'Grant Street', pattern: /grantstreet|grant street/i },
      { name: 'BillTrax', pattern: /billtrax/i }
    ];
    
    const foundVendors = vendors.filter(v => 
      v.pattern.test(text) || links.some(l => v.pattern.test(l.href))
    );
    
    if (foundVendors.length > 0) {
      console.log(`\nVendors Found: ${foundVendors.map(v => v.name).join(', ')}`);
    }
    
    // GIS/Assessor links
    const gisLinks = links.filter(l => 
      /assessor|gis|parcel|map|records|eagleweb/i.test(l.text) ||
      /assessor|gis|parcel|map|eagleweb/i.test(l.href)
    );
    if (gisLinks.length > 0) {
      console.log(`\nGIS/Assessor Links: ${gisLinks.length}`);
      gisLinks.slice(0, 3).forEach(l => console.log(`  ${l.text.substring(0, 40)}: ${l.href.substring(0, 50)}`));
    }
    
    // Determine list type and ease
    let listType = 'Unknown';
    let ease = 'Unknown';
    
    if (pdfLinks.length > 0 && tables.length === 0) {
      listType = 'PDF Only';
      ease = 'Medium (PDF parsing needed)';
    } else if (tables.length > 0 && pdfLinks.length === 0) {
      listType = 'HTML Table';
      ease = 'Easy (table scrape)';
    } else if (foundVendors.length > 0) {
      listType = 'Vendor Hosted';
      ease = 'Hard (vendor API/scrape)';
    } else if (pdfLinks.length > 0 && tables.length > 0) {
      listType = 'Mixed (HTML + PDF)';
      ease = 'Medium';
    }
    
    console.log(`\nList Format: ${listType}`);
    console.log(`Automation Ease: ${ease}`);
    
    // Content preview - relevant lines only
    const relevantLines = text.split('\n')
      .map(l => l.trim())
      .filter(l => {
        const lower = l.toLowerCase();
        return l.length > 15 && l.length < 120 &&
          (/auction|sale|property|parcel|date|may|june|july|202[456]|bidding/i.test(lower));
      })
      .slice(0, 8);
    
    if (relevantLines.length > 0) {
      console.log(`\n--- Relevant Content ---`);
      relevantLines.forEach(l => console.log(`  ${l}`));
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
  // Pages to check
  const pages = [
    // Summit County
    { name: 'Summit County Tax Sale Rules', url: 'https://www.summitcountyutah.gov/260/rules' },
    { name: 'Summit County Tax Sale Registration', url: 'https://www.summitcountyutah.gov/261/Registration' },
    
    // Utah County - look for actual auction page
    { name: 'Utah County Land Records', url: 'https://www.utahcounty.gov/LandRecords/Index.asp' },
    
    // Iron County
    { name: 'Iron County Treasurer', url: 'https://ironcountyut.gov/treasurer' },
    
    // Weber County - search for tax sale
    { name: 'Weber County Search', url: 'https://www.webercountyutah.gov/search.php?q=tax+sale' },
    
    // Tooele County
    { name: 'Tooele County', url: 'https://tooeleco.org/' },
    
    // Rich County
    { name: 'Rich County', url: 'https://richcountyutah.org/' },
    
    // Washington County
    { name: 'Washington County Tax Sale', url: 'https://www.washco.utah.gov/treasurer/tax-sale/' },
    
    // Kane County
    { name: 'Kane County', url: 'https://www.kaneutah.com/' },
    
    // Box Elder
    { name: 'Box Elder County', url: 'https://www.boxeldercounty.org/' },
    
    // Grand County
    { name: 'Grand County', url: 'https://www.grandcountyutah.net/' },
    
    // Uintah County
    { name: 'Uintah County', url: 'https://www.uintahcounty.gov/' }
  ];
  
  for (const page of pages) {
    await visitPage(page.name, page.url);
  }
}

main().catch(console.error);
