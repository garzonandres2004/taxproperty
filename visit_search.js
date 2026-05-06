const { chromium } = require('playwright');

async function searchCounty(name, baseUrl, searchPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SEARCHING: ${name}`);
  console.log(`URL: ${baseUrl}${searchPath}`);
  console.log('='.repeat(70));
  
  try {
    await page.goto(`${baseUrl}${searchPath}`, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    // Get all links
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 100)
    })));
    
    // Look for tax sale related links
    const taxSaleLinks = links.filter(l => 
      /tax sale|public auction|auction|treasurer/i.test(l.text) ||
      /taxsale|publicauction/i.test(l.href)
    );
    
    console.log(`\n--- Tax Sale Related Links ---`);
    if (taxSaleLinks.length > 0) {
      taxSaleLinks.slice(0, 8).forEach(l => {
        console.log(`  ${l.text.substring(0, 50)}: ${l.href}`);
      });
    } else {
      console.log('  No tax sale links found on main page');
    }
    
    // Check if we're on a tax sale page
    const text = await page.evaluate(() => document.body.innerText);
    const isTaxSalePage = /tax sale|public auction/i.test(text);
    
    if (isTaxSalePage) {
      console.log(`\n*** CURRENT PAGE IS TAX SALE PAGE ***`);
      
      // Look for date
      const dateMatch = text.match(/(May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
      if (dateMatch) console.log(`Auction Date: ${dateMatch[0]}`);
      
      // Check for PDF
      const pdfLinks = links.filter(l => l.href.endsWith('.pdf'));
      console.log(`PDF Links: ${pdfLinks.length}`);
      
      // Vendor detection
      const vendors = ['bid4assets', 'realauction', 'sri', 'grantstreet'];
      const foundVendor = vendors.find(v => text.toLowerCase().includes(v) || links.some(l => l.href.toLowerCase().includes(v)));
      console.log(`Vendor: ${foundVendor || 'Not detected'}`);
      
      // Content preview
      const lines = text.split('\n').filter(l => l.trim().length > 10).slice(0, 10);
      console.log(`\n--- Content Preview ---`);
      lines.forEach(l => console.log(`  ${l.substring(0, 100)}`));
    }
    
    // Screenshot
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({ path: `${safeName}_search.png`, fullPage: true });
    console.log(`\nScreenshot: ${safeName}_search.png`);
    
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  await browser.close();
}

async function main() {
  const counties = [
    { name: 'Utah County', baseUrl: 'https://www.utahcounty.gov', searchPath: '/default.aspx' },
    { name: 'Summit County', baseUrl: 'https://www.summitcountyutah.gov', searchPath: '/' },
    { name: 'Salt Lake County', baseUrl: 'https://slco.org', searchPath: '/treasurer/' },
    { name: 'Cache County', baseUrl: 'https://www.cachecounty.org', searchPath: '/' },
    { name: 'Kane County', baseUrl: 'https://www.kaneutah.com', searchPath: '/' },
    { name: 'Rich County', baseUrl: 'https://richcountyutah.org', searchPath: '/' }
  ];
  
  for (const county of counties) {
    await searchCounty(county.name, county.baseUrl, county.searchPath);
  }
}

main().catch(console.error);
