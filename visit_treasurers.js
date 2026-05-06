const { chromium } = require('playwright');

async function visitTreasurer(name, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COUNTY: ${name} - Treasurer Page`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Get all links
    const links = await page.$$eval('a', links => links.map(l => ({
      href: l.href || '',
      text: (l.innerText || '').trim().substring(0, 100),
      hasPdf: l.href.toLowerCase().endsWith('.pdf')
    })));
    
    const text = await page.evaluate(() => document.body.innerText);
    
    // Look for tax sale, auction, sale links
    const relevantLinks = links.filter(l => 
      /tax sale|auction|public sale|tax lien|sheriff sale/i.test(l.text) ||
      /taxsale|publicauction|sheriffsale/i.test(l.href) ||
      (l.hasPdf && /202[456].*property|property.*202[456]/i.test(l.href))
    );
    
    console.log(`\n--- Tax Sale / Auction Links (${relevantLinks.length}) ---`);
    if (relevantLinks.length > 0) {
      relevantLinks.slice(0, 10).forEach(l => {
        const type = l.hasPdf ? '[PDF]' : '[HTML]';
        console.log(`  ${type} ${l.text.substring(0, 50)}: ${l.href.substring(0, 70)}`);
      });
    } else {
      console.log('  No relevant links found');
      
      // Show all unique links for debugging
      const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()]
        .filter(l => l.href.startsWith('http') && !l.href.includes('facebook') && !l.href.includes('twitter'));
      console.log(`\n--- All Page Links (${uniqueLinks.length}) ---`);
      uniqueLinks.slice(0, 15).forEach(l => console.log(`  ${l.text.substring(0, 40)}: ${l.href.substring(0, 60)}`));
    }
    
    // Check for dates
    const dateMatch = text.match(/(May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(202[456])/i);
    if (dateMatch) {
      console.log(`\n*** Found Date: ${dateMatch[0]} ***`);
    }
    
    // Check if current page has tax sale info
    if (/tax sale|public auction/i.test(text)) {
      console.log(`\n*** PAGE HAS TAX SALE CONTENT ***`);
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 20 && /auction|sale|property|date|may|june|july/i.test(l))
        .slice(0, 8);
      console.log('Relevant content:');
      lines.forEach(l => console.log(`  ${l.substring(0, 100)}`));
    }
    
    // Screenshot
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    await page.screenshot({ path: `${safeName}_treasurer.png`, fullPage: true });
    console.log(`\nScreenshot: ${safeName}_treasurer.png`);
    
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  await browser.close();
}

async function main() {
  const counties = [
    { name: 'Utah County', url: 'https://treasurer.utahcounty.gov/' },
    { name: 'Summit County', url: 'https://www.summitcountyutah.gov/340/Tax-Sale-Information' },
    { name: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/treasurer/' },
    { name: 'Cache County', url: 'https://www.cachecounty.org/treasurer/' },
    { name: 'Davis County', url: 'https://www.daviscountyutah.gov/treasurer' },
    { name: 'Weber County', url: 'https://www.webercountyutah.gov/Treasurer/' },
    { name: 'Tooele County', url: 'https://tooeleco.org/government/departments/treasurer/' },
    { name: 'Washington County', url: 'https://www.washingtoncountyutah.gov/treasurer/' },
    { name: 'Iron County', url: 'https://www.ironcounty.net/treasurer/' },
    { name: 'Box Elder County', url: 'https://www.boxeldercounty.org/treasurer/' }
  ];
  
  for (const county of counties) {
    await visitTreasurer(county.name, county.url);
  }
}

main().catch(console.error);
