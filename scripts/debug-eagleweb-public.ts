#!/usr/bin/env tsx
/**
 * Deep debug: Tooele EagleWeb Public Web Limited Viewer
 * Focus ONLY on public access path - NO Mediciland
 */

import { chromium } from 'playwright'
import * as fs from 'fs'

const LOGIN_URL = 'https://erecording.tooeleco.gov/eaglesoftware/web/login.jsp'
const OUTPUT_DIR = '/tmp/eagleweb-debug'

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function savePageState(page: any, label: string) {
  const screenshotPath = `${OUTPUT_DIR}/${label}.png`
  const htmlPath = `${OUTPUT_DIR}/${label}.html`

  await page.screenshot({ path: screenshotPath, fullPage: true })
  const html = await page.content()
  fs.writeFileSync(htmlPath, html)

  console.log(`  📸 Saved: ${screenshotPath}`)
  console.log(`  📄 Saved: ${htmlPath}`)
}

async function debugPublicViewer() {
  console.log('='.repeat(80))
  console.log('EAGLEWEB PUBLIC VIEWER - DEEP DEBUG')
  console.log('='.repeat(80))
  console.log(`Target URL: ${LOGIN_URL}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('')

  const browser = await chromium.launch({
    headless: false, // Set to true for production, false for debugging
    slowMo: 500
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${OUTPUT_DIR}/videos/` }
  })

  const page = await context.newPage()

  try {
    // Step 1: Load login page
    console.log('Step 1: Loading login page...')
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await delay(2000)
    await savePageState(page, '01-initial-login-page')
    console.log(`  Current URL: ${page.url()}`)

    // Step 2: Find ALL links and buttons on the page
    console.log('\nStep 2: Analyzing page elements...')

    const elements = await page.evaluate(() => {
      const results: any[] = []

      // Find all links
      document.querySelectorAll('a').forEach((el, i) => {
        results.push({
          type: 'LINK',
          index: i,
          text: el.textContent?.trim().substring(0, 100),
          href: el.getAttribute('href'),
          onclick: el.getAttribute('onclick'),
          target: el.getAttribute('target'),
          class: el.className,
          id: el.id,
          outerHTML: el.outerHTML.substring(0, 300)
        })
      })

      // Find all buttons
      document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((el, i) => {
        results.push({
          type: 'BUTTON',
          index: i,
          text: (el as any).value || el.textContent?.trim().substring(0, 100),
          onclick: el.getAttribute('onclick'),
          name: el.getAttribute('name'),
          class: el.className,
          id: el.id,
          outerHTML: el.outerHTML.substring(0, 300)
        })
      })

      // Find elements containing "Public"
      document.querySelectorAll('*').forEach((el, i) => {
        const text = el.textContent?.toLowerCase() || ''
        if (text.includes('public') || text.includes('viewer') || text.includes('limited')) {
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
            results.push({
              type: 'MATCH',
              tag: el.tagName,
              text: el.textContent?.trim().substring(0, 200),
              class: el.className,
              id: el.id
            })
          }
        }
      })

      return results
    })

    fs.writeFileSync(`${OUTPUT_DIR}/page-elements.json`, JSON.stringify(elements, null, 2))
    console.log(`  Found ${elements.length} elements`)

    // Show elements containing "public"
    const publicElements = elements.filter((e: any) =>
      e.text?.toLowerCase().includes('public') ||
      e.text?.toLowerCase().includes('viewer') ||
      e.text?.toLowerCase().includes('limited')
    )
    console.log(`  "Public/Viewer" elements found: ${publicElements.length}`)
    publicElements.forEach((e: any, i: number) => {
      console.log(`    ${i + 1}. [${e.type}] ${e.text?.substring(0, 60)}...`)
      if (e.href) console.log(`       href: ${e.href}`)
      if (e.onclick) console.log(`       onclick: ${e.onclick.substring(0, 80)}...`)
    })

    // Step 3: Try to find and click "Public Web Limited Viewer"
    console.log('\nStep 3: Attempting to click Public Web Limited Viewer...')

    // Try multiple selectors
    const selectors = [
      'a:has-text("Public Web")',
      'a:has-text("Limited Viewer")',
      'a:has-text("Public Web Limited Viewer")',
      'a:has-text("Public")',
      'button:has-text("Public")',
      'a[href*="public"]',
      'a[href*="limited"]',
      'input[value*="Public"]',
      '.public-access',
      '#publicAccess',
      '[onclick*="public"]'
    ]

    let foundElement = null
    let foundSelector = ''

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first()
        const visible = await element.isVisible({ timeout: 2000 }).catch(() => false)
        if (visible) {
          foundElement = element
          foundSelector = selector
          console.log(`  ✅ Found visible element: ${selector}`)
          break
        }
      } catch {
        continue
      }
    }

    if (!foundElement) {
      console.log('  ❌ No Public Web Limited Viewer element found with standard selectors')
      console.log('  Checking raw HTML...')

      // Search in raw HTML
      const html = await page.content()
      const publicMatch = html.match(/public.*?viewer/gi)
      if (publicMatch) {
        console.log(`  Found ${publicMatch.length} matches in HTML`)

        // Look for surrounding context
        const contextMatch = html.match(/.{0,100}public.*?viewer.{0,100}/gi)
        if (contextMatch) {
          console.log('  Context around matches:')
          contextMatch.slice(0, 3).forEach((m, i) => {
            console.log(`    ${i + 1}. ...${m}...`)
          })
        }
      }

      // Check for frames
      const frames = page.frames()
      console.log(`\n  Page has ${frames.length} frame(s):`)
      frames.forEach((frame, i) => {
        console.log(`    Frame ${i}: ${frame.url()}`)
      })

      await browser.close()
      console.log('\n❌ Cannot proceed without Public Web Limited Viewer element')
      return
    }

    // Step 4: Get detailed element info before click
    console.log('\nStep 4: Inspecting element before click...')

    const elementInfo = await foundElement.evaluate((el: any) => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      href: el.getAttribute('href'),
      onclick: el.getAttribute('onclick'),
      target: el.getAttribute('target'),
      text: el.textContent?.trim(),
      outerHTML: el.outerHTML
    }))

    fs.writeFileSync(`${OUTPUT_DIR}/element-before-click.json`, JSON.stringify(elementInfo, null, 2))
    console.log('  Element details saved to element-before-click.json')
    console.log(`  Tag: ${elementInfo.tagName}`)
    console.log(`  Text: ${elementInfo.text?.substring(0, 80)}`)
    console.log(`  Href: ${elementInfo.href || 'N/A'}`)
    console.log(`  Onclick: ${elementInfo.onclick ? elementInfo.onclick.substring(0, 80) + '...' : 'N/A'}`)
    console.log(`  Target: ${elementInfo.target || 'N/A'}`)

    // Step 5: Try multiple click strategies
    console.log('\nStep 5: Attempting click strategies...')

    // Strategy 1: Normal click
    console.log('  Strategy 1: locator.click()')
    try {
      // Set up popup/new page listener
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
        foundElement.click()
      ])

      if (newPage) {
        console.log('    ✅ New page opened!')
        await newPage.waitForLoadState('networkidle')
        await savePageState(newPage, '03-after-click-new-page')
        console.log(`    New page URL: ${newPage.url()}`)
      } else {
        console.log('    ℹ️ No new page, checking current page...')
        await delay(3000)
        await savePageState(page, '03-after-click-normal')
        console.log(`    Current URL: ${page.url()}`)
      }
    } catch (error: any) {
      console.log(`    ❌ Normal click failed: ${error.message}`)
    }

    // Check if we're on a different page now
    const currentUrl = page.url()
    if (!currentUrl.includes('login') && !currentUrl.includes('splash')) {
      console.log(`\n  ✅ Navigation successful! Now at: ${currentUrl}`)
    } else {
      // Strategy 2: Evaluate click
      console.log('\n  Strategy 2: JavaScript click via evaluate()')
      try {
        await page.evaluate(() => {
          // Find element by text content
          const links = document.querySelectorAll('a')
          for (const link of links) {
            const text = link.textContent?.toLowerCase() || ''
            if (text.includes('public') && text.includes('viewer')) {
              console.log('Clicking via JS:', link)
              link.click()
              return true
            }
          }
          return false
        })

        await delay(3000)
        await savePageState(page, '04-after-js-click')
        console.log(`    Current URL after JS click: ${page.url()}`)
      } catch (error: any) {
        console.log(`    ❌ JS click failed: ${error.message}`)
      }

      // Strategy 3: Extract href and navigate directly
      if (elementInfo.href) {
        console.log('\n  Strategy 3: Direct navigation to href')
        try {
          const targetUrl = elementInfo.href.startsWith('http')
            ? elementInfo.href
            : new URL(elementInfo.href, LOGIN_URL).toString()

          console.log(`    Navigating to: ${targetUrl}`)
          await page.goto(targetUrl, { waitUntil: 'networkidle' })
          await savePageState(page, '05-direct-href-nav')
          console.log(`    Current URL: ${page.url()}`)
        } catch (error: any) {
          console.log(`    ❌ Direct navigation failed: ${error.message}`)
        }
      }

      // Strategy 4: Check for onclick handler
      if (elementInfo.onclick) {
        console.log('\n  Strategy 4: Evaluating onclick handler')
        try {
          await page.evaluate((onclickCode) => {
            eval(onclickCode)
          }, elementInfo.onclick)

          await delay(3000)
          await savePageState(page, '06-onclick-eval')
          console.log(`    Current URL after eval: ${page.url()}`)
        } catch (error: any) {
          console.log(`    ❌ Eval failed: ${error.message}`)
        }
      }
    }

    // Step 6: Final state analysis
    console.log('\nStep 6: Final state analysis...')
    const finalUrl = page.url()
    const finalHtml = await page.content()

    console.log(`  Final URL: ${finalUrl}`)
    console.log(`  Page title: ${await page.title()}`)

    // Check if we reached a search page
    const hasSearchForm = finalHtml.includes('search') &&
                         (finalHtml.includes('parcel') || finalHtml.includes('document'))
    console.log(`  Has search form: ${hasSearchForm ? 'YES ✅' : 'NO ❌'}`)

    // Save final state
    fs.writeFileSync(`${OUTPUT_DIR}/final-analysis.txt`, `
Final URL: ${finalUrl}
Has Search Form: ${hasSearchForm}
Page Title: ${await page.title()}
HTML Length: ${finalHtml.length} chars
    `.trim())

    // Step 7: If we have a search page, try searching
    if (hasSearchForm) {
      console.log('\nStep 7: Attempting parcel search...')

      const parcelSelectors = [
        'input[name*="parcel"]', 'input[name*="Parcel"]',
        'input[id*="parcel"]', 'input[id*="Parcel"]',
        'input[placeholder*="parcel"]', 'input[placeholder*="Parcel"]'
      ]

      let searchInput = null
      for (const selector of parcelSelectors) {
        try {
          const input = page.locator(selector).first()
          if (await input.isVisible({ timeout: 2000 })) {
            searchInput = input
            console.log(`  Found search input: ${selector}`)
            break
          }
        } catch {}
      }

      if (searchInput) {
        await searchInput.fill('0610100015')
        await delay(1000)
        await searchInput.press('Enter')
        await delay(3000)

        await savePageState(page, '07-after-parcel-search')
        console.log(`  Search attempted, final URL: ${page.url()}`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('DEBUG COMPLETE')
    console.log('='.repeat(80))
    console.log(`All artifacts saved to: ${OUTPUT_DIR}`)
    console.log('')
    console.log('Files generated:')
    console.log('  - 01-initial-login-page.png/html')
    console.log('  - page-elements.json')
    console.log('  - element-before-click.json')
    console.log('  - 03-after-click-*.png/html')
    console.log('  - 04-after-js-click.png/html')
    console.log('  - 05-direct-href-nav.png/html')
    console.log('  - 06-onclick-eval.png/html')
    console.log('  - 07-after-parcel-search.png/html (if reached)')
    console.log('  - final-analysis.txt')
    console.log('  - videos/ (if any navigation occurred)')

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error)
    await page.screenshot({ path: `${OUTPUT_DIR}/error-screenshot.png` })
    console.log(`Error screenshot saved to ${OUTPUT_DIR}/error-screenshot.png`)
  } finally {
    await browser.close()
  }
}

// Run the debug
debugPublicViewer().catch(console.error)
