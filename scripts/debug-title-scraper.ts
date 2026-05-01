import * as cheerio from 'cheerio'

async function debugScraper() {
  const parcelSerial = '030600016' // 03:060:0016
  const url = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelSerial}`

  console.log('Fetching URL:', url)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  })

  const html = await response.text()

  // Save raw HTML to inspect
  const fs = await import('fs')
  fs.writeFileSync('/tmp/utah_county_property.html', html)
  console.log('HTML saved to /tmp/utah_county_property.html')
  console.log('Total HTML length:', html.length)
  console.log('Response status:', response.status)
  console.log('Content-Type:', response.headers.get('content-type'))

  const $ = cheerio.load(html)

  // Debug: find ALL tables
  console.log('\n=== ALL TABLES FOUND ===')
  $('table').each((i, el) => {
    const rows = $(el).find('tr').length
    const firstText = $(el).text().substring(0, 100).trim().replace(/\s+/g, ' ')
    console.log(`Table ${i}: ${rows} rows, starts with: "${firstText}"`)
  })

  // Debug: find the Documents tab content
  console.log('\n=== LOOKING FOR DOCUMENTS TABLE ===')

  // Look for tables that might contain document data
  $('table').each((i, table) => {
    const $table = $(table)
    const headerText = $table.find('tr').first().text().toLowerCase()

    if (headerText.includes('entry') || headerText.includes('grantor') || headerText.includes('type')) {
      console.log(`\nTable ${i} might be documents table:`)
      console.log('Header:', $table.find('tr').first().text().trim().substring(0, 150))

      // Show first few data rows
      $table.find('tr').slice(1, 4).each((j, row) => {
        console.log(`  Row ${j}:`, $(row).text().trim().substring(0, 100))
      })
    }
  })

  // Debug: look for specific text patterns in all rows
  console.log('\n=== SEARCHING FOR KEY TERMS IN ALL ROWS ===')
  $('table tr').each((i, row) => {
    const text = $(row).text().trim()
    if (text.includes('Entry') || text.includes('Grantor') || text.includes('Grantee') ||
        text.includes('WD') || text.includes('D TR') || text.includes('QCD')) {
      console.log(`Row ${i}: "${text.substring(0, 150)}"`)
    }
  })

  // Debug: search for specific patterns
  console.log('\n=== SEARCHING FOR DATE PATTERNS ===')
  const rowsWithDates: string[] = []
  $('table tr').each((i, row) => {
    const text = $(row).text()
    if (/\d{2}\/\d{2}\/\d{4}/.test(text) && text.includes('1994')) {
      rowsWithDates.push(text.substring(0, 200).trim())
    }
  })

  console.log(`Found ${rowsWithDates.length} rows with 1994 dates`)
  rowsWithDates.slice(0, 5).forEach((text, i) => {
    console.log(`  ${i}: ${text}`)
  })

  // Check if content is in frames or requires specific tab parameter
  console.log('\n=== CHECKING FOR FRAMES/IFRAMES ===')
  const frames = $('frame, iframe')
  console.log(`Found ${frames.length} frames/iframes`)
  frames.each((i, el) => {
    console.log(`Frame ${i}: src="${$(el).attr('src')}"`)
  })

  // Check for script tags that might load documents
  console.log('\n=== CHECKING FOR SCRIPT-BASED CONTENT LOADING ===')
  $('script').each((i, el) => {
    const scriptText = $(el).html() || ''
    if (scriptText.includes('Document') || scriptText.includes('Entry') || scriptText.includes('ajax')) {
      console.log(`Script ${i} contains relevant keywords`)
    }
  })

  // Look for document links
  console.log('\n=== LOOKING FOR DOCUMENT LINKS ===')
  $('a').each((i, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()
    if (href.includes('Document') || href.includes('document') || text.includes('Entry')) {
      console.log(`Link ${i}: href="${href}", text="${text.substring(0, 50)}"`)
    }
  })

  // Check for tab structure
  console.log('\n=== CHECKING FOR TAB STRUCTURE ===')
  $('[class*="tab"], [id*="tab"]').each((i, el) => {
    const text = $(el).text().trim()
    const id = $(el).attr('id') || ''
    const className = $(el).attr('class') || ''
    if (text.toLowerCase().includes('doc') || id.toLowerCase().includes('doc')) {
      console.log(`Tab ${i}: id="${id}", class="${className}", text="${text.substring(0, 50)}"`)
    }
  })
}

debugScraper().catch(console.error)
