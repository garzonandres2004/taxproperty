const { chromium } = require('playwright');

async function visitPage(name, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Status: ${response?.status() || 'N/A'}`);
    
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    const text = await page.evaluate(() => document.body.innerText);
    
    // Date detection
    const datePatterns = [
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}/g
    ];
    
    const foundDates = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) foundDates.push(...matches);
    }
    
    if (foundDates.length > 0) {
      console.log(`\nDates Found: ${[...new Set(foundDates)].slice(0, 5).join(', ')}`);
    }
    
    // Check for tables
    const tables = await page.$$('table');
    console.log(`HTML Tables: ${tables.length}`);
    
    // Check content type
    const contentType = response?.headers?.()['content-type'] || '';
    console.log(`Content-Type: ${contentType}`);
    
    // PDF check
    if (url.toLowerCase().endsWith('.pdf') || contentType.includes('pdf')) {
      console.log(`\n*** PDF DOCUMENT ***`);
    }
    
    // Content preview
    if (!url.toLowerCase().endsWith('.pdf')) {
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10 && l.length < 100)
        .slice(0, 10);
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
  const pages = [
    // Utah County - try different URLs
    { name: 'Utah County Tax Info', url: 'https://treasurer.utahcounty.gov/tax-information' },
    
    // Iron County Delinquent Tax List
    { name: 'Iron County Delinquent Tax', url: 'https://ironcountyut.gov/files/treasurer/delinquent-tax-list' },
    
    // Salt Lake County dates
    { name: 'Salt Lake County Dates', url: 'https://www.saltlakecounty.gov/treasurer/dates--deadlines/' },
    
    // Davis County property search
    { name: 'Davis County Property Search', url: 'https://www.daviscountyutah.gov/property-search' },
    
    // Weber County
    { name: 'Weber County Treasurer', url: 'https://www.webercountyutah.gov/Treasurer/taxsaleinfo.php' },
    
    // Cache County
    { name: 'Cache County Treasurer', url: 'https://www.cachecounty.gov/treasurer/pay-property-taxes.htm' },
    
    // Summit County - search for actual tax sale
    { name: 'Summit County Search', url: 'https://www.summitcountyutah.gov/Search/Results?searchPhrase=tax%20sale' },
    
    // Tooele County
    { name: 'Tooele County Treasurer', url: 'https://tooeleco.org/government/departments/treasurer/' },
    
    // Washington County
    { name: 'Washington County Treasurer', url: 'https://www.washco.utah.gov/treasurer/' },
    
    // Kane County
    { name: 'Kane County Treasurer', url: 'https://www.kaneutah.com/departments/treasurer/' }
  ];
  
  for (const page of pages) {
    await visitPage(page.name, page.url);
  }
}

main().catch(console.error);
