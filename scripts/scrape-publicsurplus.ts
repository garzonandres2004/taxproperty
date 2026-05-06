#!/usr/bin/env tsx
// Scrape all Utah real estate auctions from PublicSurplus.
// Outputs: output/utah_auctions.csv  +  output/county_auction_order.md

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://www.publicsurplus.com/sms/all,ut/browse/search'
const SEARCH_PARAMS = 'posting=p&slth=&sortBy=&sortDesc=N&keyWord=&catId=15&endHours=-1&startHours=-1&lowerPrice=0&higherPrice=0&milesLocation=-1&zipCode=&region=all%2Cut'

interface Listing {
  listing_id: string
  title: string
  county: string
  current_price: string
  start_date: string
  end_date: string
  time_remaining: string
  status: string
  url: string
  full_description: string
  parcel_number: string
  address: string
  acres: string
}

function extractCountyFromPage(headerText: string, bodyText: string): string {
  // "Sanpete County Parcel XXXXX" — county name precedes "County Parcel"
  const m1 = headerText.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+County\s+Parcel/i)
  if (m1) return m1[1].trim()

  // "Real Property in Box Elder 01-..." or "Real Property in Juab; Parcel..."
  const m2 = headerText.match(/Real\s+Property\s+in\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)[\s;,]/i)
    || bodyText.match(/Real\s+Property\s+in\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)[\s;,]/i)
  if (m2) return m2[1].trim()

  // Navigation link "[View Salt Lake County Auctions]"
  const m3 = bodyText.match(/\[View\s+([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)\s+County\s+Auctions?\]/i)
  if (m3) return m3[1].trim()

  // "Salt Lake County Tax Sale" or "X County - Tax Sale" — use [ \t]+ to avoid crossing newlines
  const m4 = bodyText.match(/([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)[ \t]+County[ \t]+[-–][ \t]+Tax[ \t]+Sale/i)
    || bodyText.match(/([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)[ \t]+County[ \t]+Tax[ \t]+Sale/i)
    || bodyText.match(/([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)[ \t]+County[ \t]+Parcel\b/i)
  if (m4) return m4[1].trim()

  return 'Unknown'
}

function extractParcel(text: string): string {
  const m = text.match(/(?:parcel|serial|apn|pin)[:\s#]+([0-9\-:]+)/i)
  return m ? m[1].trim() : ''
}

function extractAcres(text: string): string {
  const m = text.match(/([\d,]+\.?\d*)\s*(?:acres?|ac\.)/i)
  return m ? m[1] : ''
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const outDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const allListings: Listing[] = []

  // ── Page loop — keep going until a page returns no listings ──────────────
  const MAX_PAGES = 50
  let p = 0
  while (true) {
    p++
    console.log(`\nScraping page ${p}...`)
    await page.goto(`${BASE_URL}?${SEARCH_PARAMS}&page=${p}`, { waitUntil: 'domcontentloaded' })
    await sleep(1500)

    // Collect listing card links — only auction detail pages (have ?auc= or /auction/view)
    const cardData = await page.$$eval('a[href*="/sms/"]', els =>
      els
        .filter(e => {
          const href = e.getAttribute('href') || ''
          return href.includes('/auction/view') || href.includes('?auc=') || href.includes('&auc=')
        })
        .map(e => ({
          href: e.getAttribute('href') || '',
          text: (e as HTMLElement).innerText?.trim() || '',
        }))
    )

    // Dedupe by href
    const seen = new Set<string>()
    const uniqueCards = cardData.filter(c => {
      if (!c.href || seen.has(c.href)) return false
      seen.add(c.href)
      return true
    })

    console.log(`  Found ${uniqueCards.length} listing links on page ${p}`)

    // No listings on this page = end of results
    if (uniqueCards.length === 0 || p > MAX_PAGES) {
      console.log(`  No more listings — stopping at page ${p}`)
      break
    }

    // ── Detail loop ─────────────────────────────────────────────────────────
    for (const card of uniqueCards.slice(0, 50)) {
      const detailUrl = card.href.startsWith('http')
        ? card.href
        : `https://www.publicsurplus.com${card.href}`

      if (allListings.some(l => l.url === detailUrl)) continue

      try {
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await sleep(1000)

        const bodyText = await page.evaluate(() => document.body.innerText)

        // Listing ID from ?auc= query param
        const aucMatch = detailUrl.match(/[?&]auc=(\d+)/)
        const listingId = aucMatch ? aucMatch[1] : detailUrl.split('=').pop() || ''

        // Auction header: "Auction #3990732 - Sanpete County Parcel 3540X"
        const headerMatch = bodyText.match(/Auction\s+#\d+\s+-\s+(.+?)(?=\s*Time Left:|\s*Bidding Starts|\n)/i)
        const headerText = headerMatch ? headerMatch[1].trim() : ''

        // County — use structured extraction from header then body
        const county = extractCountyFromPage(headerText, bodyText)

        // Title = header text (e.g. "Sanpete County Parcel 3540X")
        const title = headerText || card.text.split('\n')[0]

        // Parcel extraction — header-first to avoid body text noise ("has", "Number:", "Viewer")
        const parcelNum = (() => {
          // Washington-style: entire header = parcel ID (no spaces, has hyphen and digit)
          if (!headerText.includes(' ') && headerText.includes('-') && /\d/.test(headerText)) return headerText
          // Sanpete/Utah: "County Parcel 3540X" / "County Parcel 18072"
          const m1 = headerText.match(/County\s+Parcel\s+([A-Za-z0-9\-:]+)/i)?.[1]
          if (m1) return m1
          // Juab: "Real Property in Juab; Parcel XE00-5298"
          const m2 = headerText.match(/;\s*Parcel\s+([A-Za-z0-9\-:]+)/i)?.[1]
          if (m2) return m2
          // "XXXXX: PARCEL_ID" — e.g. "Real Property Sevier County Utah: 3-192A-51"
          const m3 = headerText.match(/:\s*([A-Za-z0-9][A-Za-z0-9\-:]*\d[A-Za-z0-9\-:]*)\s*(?:and\b|$)/i)?.[1]
          if (m3) return m3
          // Dashed all-numeric: Box Elder (01-150-0012), Duchesne (00-0035-2203), Salt Lake (22-05-333-013-0000)
          // Negative lookbehind: skip if preceded by letter or hyphen (avoids partial match in H-3-1-33-142)
          const m4 = headerText.match(/(?<![A-Za-z\-])(\d{1,5}(?:-\d{1,5}){2,})\b/)?.[1]
          if (m4) return m4
          // Body fallback: require at least one digit in captured value (eliminates "has", "Viewer", "is")
          // Two passes: "Parcel Number: X" then "Parcel: X"
          for (const pat of [
            /(?:parcel|serial|apn|pin|tax.?id)\s+(?:number|#)[:\s]+([A-Za-z0-9][A-Za-z0-9\-:]*)/i,
            /(?:parcel|serial|apn|pin|tax.?id)[:\s#]+([A-Za-z0-9][A-Za-z0-9\-:]*)/i,
          ]) {
            const v = bodyText.match(pat)?.[1]
            if (v && /\d/.test(v)) return v
          }
          return ''
        })()

        // Opening price
        const priceMatch = bodyText.match(/Opening Price:\s*\$?([\d,]+\.?\d*)/i)
          || bodyText.match(/Current Bid:\s*\$?([\d,]+\.?\d*)/i)
          || bodyText.match(/Minimum bid:\s*\$?([\d,]+\.?\d*)/i)
        const currentPrice = priceMatch ? `$${priceMatch[1]}` : ''

        // Dates: "Bidding Starts May 21, 2026 10:00 AM MDT" / "Auction Ends May 21, 2026 02:00 PM MDT"
        const startMatch = bodyText.match(/Bidding Starts\s+([A-Za-z]+\s+\d+,?\s+\d{4}[^\n]*)/i)
        const endMatch = bodyText.match(/Auction Ends\s+([A-Za-z]+\s+\d+,?\s+\d{4}[^\n]*)/i)
        const startDate = startMatch ? startMatch[1].trim() : ''
        const endDate = endMatch ? endMatch[1].trim() : ''

        // Status from "Time Left: Not Started" or countdown or closed
        let status = 'Unknown'
        let timeRemaining = ''
        const timeLeftMatch = bodyText.match(/Time Left:\s*([^\n]+)/i)
        if (timeLeftMatch) {
          timeRemaining = timeLeftMatch[1].trim()
          if (/not started/i.test(timeRemaining)) status = 'Has Not Started'
          else if (/\d/.test(timeRemaining)) status = 'Active'
          else status = 'Active'
        } else if (/auction has ended/i.test(bodyText) || /This auction is closed/i.test(bodyText)) {
          status = 'Closed'
        }

        const acres = extractAcres(bodyText)

        // Address: look for street address patterns in description section
        const descSection = bodyText.slice(bodyText.toLowerCase().indexOf('description'))
        const addrMatch = descSection.match(/\d+\s+[A-Za-z0-9\s]+(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Hwy|US|SR)[^\n]*/i)
        const address = addrMatch ? addrMatch[0].trim().slice(0, 120) : ''

        const listing: Listing = {
          listing_id: listingId,
          title: title.slice(0, 200),
          county,
          current_price: currentPrice,
          start_date: startDate.slice(0, 60),
          end_date: endDate.slice(0, 60),
          time_remaining: timeRemaining.slice(0, 60),
          status,
          url: detailUrl,
          full_description: bodyText.slice(0, 1000).replace(/\n+/g, ' ').trim(),
          parcel_number: parcelNum,
          address: address.slice(0, 150),
          acres,
        }

        allListings.push(listing)
        console.log(`  [${listingId}] ${county} — ${title.slice(0, 60)} | ${status} | ends: ${endDate.slice(0, 30)}`)

      } catch (err) {
        console.log(`  ERROR on ${detailUrl}: ${(err as Error).message.slice(0, 80)}`)
      }
    }

  }

  await browser.close()

  // ── Also scrape the list pages directly for any missed ────────────────────
  if (allListings.length === 0) {
    console.log('\nNo listings found via detail links — saving raw page for inspection')
    fs.writeFileSync('/tmp/publicsurplus-debug.json', JSON.stringify({ pageLinks, pageNums, maxPage }, null, 2))
  }

  // ── Write CSV ──────────────────────────────────────────────────────────────
  const csvHeader = 'listing_id,title,county,current_price,start_date,end_date,time_remaining,status,url,parcel_number,address,acres,full_description'
  const csvRows = allListings.map(l =>
    [l.listing_id, l.title, l.county, l.current_price, l.start_date, l.end_date,
     l.time_remaining, l.status, l.url, l.parcel_number, l.address, l.acres, l.full_description]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',')
  )
  const csvPath = path.join(outDir, 'utah_auctions.csv')
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'))
  console.log(`\nWrote ${allListings.length} listings to ${csvPath}`)

  // ── Group by county ────────────────────────────────────────────────────────
  const byCounty: Record<string, Listing[]> = {}
  for (const l of allListings) {
    const c = l.county.trim() || 'Unknown'
    if (!byCounty[c]) byCounty[c] = []
    byCounty[c].push(l)
  }

  // Sort counties by earliest end date
  function parseDate(s: string): Date {
    if (!s) return new Date(9999, 0, 1)
    const d = new Date(s)
    return isNaN(d.getTime()) ? new Date(9999, 0, 1) : d
  }

  const countySummaries = Object.entries(byCounty).map(([county, listings]) => {
    const endDates = listings.map(l => parseDate(l.end_date)).filter(d => d.getFullYear() < 9999)
    const startDates = listings.map(l => parseDate(l.start_date)).filter(d => d.getFullYear() < 9999)
    const earliest = endDates.length > 0
      ? endDates.sort((a, b) => a.getTime() - b.getTime())[0]
      : startDates.length > 0
        ? startDates.sort((a, b) => a.getTime() - b.getTime())[0]
        : new Date(9999, 0, 1)
    const prices = listings.map(l => parseFloat(l.current_price.replace(/[$,]/g, ''))).filter(n => !isNaN(n))
    const priceRange = prices.length > 0
      ? `$${Math.min(...prices).toLocaleString()} – $${Math.max(...prices).toLocaleString()}`
      : '—'
    const statuses = [...new Set(listings.map(l => l.status))].join(', ')
    return { county, listings, earliest, priceRange, statuses }
  }).sort((a, b) => a.earliest.getTime() - b.earliest.getTime())

  // ── Write MD report ────────────────────────────────────────────────────────
  const now = new Date().toLocaleString()
  const totalCounties = countySummaries.length

  const mdLines: string[] = [
    `# Utah County Auction Order — PublicSurplus`,
    ``,
    `**Generated:** ${now}`,
    `**Total Listings:** ${allListings.length}`,
    `**Total Counties Found:** ${totalCounties}`,
    ``,
    `## Priority Order (Auction Ending Soonest First)`,
    ``,
    `| Priority | County | # Listings | Earliest Auction End | Price Range | Status |`,
    `|----------|--------|-----------|---------------------|-------------|--------|`,
  ]

  countySummaries.forEach((cs, i) => {
    const endStr = cs.earliest.getFullYear() < 9999 ? cs.earliest.toLocaleDateString() : '—'
    mdLines.push(`| ${i + 1} | ${cs.county} | ${cs.listings.length} | ${endStr} | ${cs.priceRange} | ${cs.statuses} |`)
  })

  mdLines.push(``, `## County Details`, ``)

  for (const cs of countySummaries) {
    mdLines.push(`### ${cs.county} County — ${cs.listings.length} listing(s)`)
    mdLines.push(``)
    for (const l of cs.listings) {
      mdLines.push(`- **${l.listing_id}**: ${l.title.slice(0, 100)}`)
      mdLines.push(`  - Price: ${l.current_price || '—'}`)
      mdLines.push(`  - End Date: ${l.end_date || '—'}`)
      mdLines.push(`  - Status: ${l.status}`)
      if (l.parcel_number) mdLines.push(`  - Parcel: ${l.parcel_number}`)
      if (l.acres) mdLines.push(`  - Acres: ${l.acres}`)
      if (l.address) mdLines.push(`  - Address: ${l.address}`)
      mdLines.push(`  - URL: ${l.url}`)
    }
    mdLines.push(``)
  }

  const mdPath = path.join(outDir, 'county_auction_order.md')
  fs.writeFileSync(mdPath, mdLines.join('\n'))
  console.log(`Wrote report to ${mdPath}`)

  // ── Console summary ────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  COUNTY PRIORITY ORDER — auctions ending soonest first`)
  console.log(`${'═'.repeat(70)}`)
  console.log(`${'#'.padEnd(4)} ${'County'.padEnd(20)} ${'Listings'.padEnd(10)} ${'Earliest End'.padEnd(16)} Price Range`)
  console.log('─'.repeat(70))
  countySummaries.forEach((cs, i) => {
    const endStr = cs.earliest.getFullYear() < 9999 ? cs.earliest.toLocaleDateString() : 'no date'
    console.log(
      `${String(i + 1).padEnd(4)} ${cs.county.padEnd(20)} ${String(cs.listings.length).padEnd(10)} ${endStr.padEnd(16)} ${cs.priceRange}`
    )
  })
  console.log('')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
