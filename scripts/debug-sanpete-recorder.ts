#!/usr/bin/env tsx
/**
 * Debug Sanpete County EagleWeb Portal
 * Discover the Public Web Limited Viewer access path
 */

import { chromium } from 'playwright'
import * as fs from 'fs'

const LOGIN_URL = 'https://erecording.sanpetecountyutah.gov/eaglesoftware/web/login.jsp'
const OUTPUT_DIR = '/tmp/sanpete-debug'

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
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

async function debugSanpeteRecorder() {
  console.log('='.repeat(80))
  console.log('SANPETE RECORDER - PORTAL DEBUG')
  console.log('='.repeat(80))
  console.log(`Target URL: ${LOGIN_URL}`)
  console.log('')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  })

  const page = await context.newPage()

  try {
    // Step 1: Load login page
    console.log('Step 1: Loading login page...')
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    await savePageState(page, '01-login-page')
    console.log(`  Current URL: ${page.url()}`)

    // Step 2: Analyze page elements
    console.log('\nStep 2: Analyzing page structure...')

    const elements = await page.evaluate(() => {
      const results: any[] = []

      // Find all buttons
      document.querySelectorAll('button, input[type="submit"]').forEach((el, i) => {
        results.push({
          type: 'BUTTON',
          index: i,
          text: (el as any).value || el.textContent?.trim().substring(0, 100),
          onclick: el.getAttribute('onclick'),
          name: el.getAttribute('name'),
          id: el.id,
          class: el.className,
          outerHTML: el.outerHTML.substring(0, 300)
        })
      })

      // Find all links
      document.querySelectorAll('a').forEach((el, i) => {
        results.push({
          type: 'LINK',
          index: i,
          text: el.textContent?.trim().substring(0, 100),
          href: el.getAttribute('href'),
          onclick: el.getAttribute('onclick'),
          id: el.id,
          class: el.className
        })
      })

      // Find elements containing "Public" or "Viewer"
      document.querySelectorAll('*').forEach((el) => {
        const text = el.textContent?.toLowerCase() || ''
        if ((text.includes('public') || text.includes('viewer') || text.includes('limited')) &&
            el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          results.push({
            type: 'MATCH',
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 200),
            parentTag: el.parentElement?.tagName,
            id: el.id,
            class: el.className
          })
        }
      })

      return results
    })

    fs.writeFileSync(`${OUTPUT_DIR}/page-elements.json`, JSON.stringify(elements, null, 2))
    console.log(`  Found ${elements.length} elements`)

    // Show buttons
    const buttons = elements.filter((e: any) => e.type === 'BUTTON')
    console.log(`\n  Buttons found: ${buttons.length}`)
    buttons.slice(0, 5).forEach((b: any, i: number) => {
      console.log(`    ${i+1}. [${b.tag || 'BUTTON'}] "${b.text?.substring(0, 60)}"`)
      if (b.onclick) console.log(`       onclick: ${b.onclick.substring(0, 80)}`)
    })

    // Show Public/Viewer matches
    const publicMatches = elements.filter((e: any) => e.type === 'MATCH')
    console.log(`\n  "Public/Viewer" elements: ${publicMatches.length}`)
    publicMatches.slice(0, 5).forEach((m: any, i: number) => {
      console.log(`    ${i+1}. [${m.tag}] "${m.text?.substring(0, 80)}..."`)
    })

    // Step 3: Try to find and click Public Web Limited Viewer
    console.log('\nStep 3: Looking for Public Web Limited Viewer...')

    const selectors = [
      'button:has-text("Public Web")',
      'button:has-text("Limited Viewer")',
      'a:has-text("Public")',
      'input[value*="Public"]',
      '#middle_left button',
      '.public-access',
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
          console.log(`  ✅ Found: ${selector}`)
          break
        }
      } catch { continue }
    }

    if (!foundElement) {
      console.log('  ❌ No Public Web Limited Viewer element found')
      console.log('  Checking page HTML for clues...')

      const html = await page.content()
      const publicSection = html.match(/public web limited viewer[\s\S]{0,500}/i)
      if (publicSection) {
        console.log('  Context around "Public Web Limited Viewer":')
        console.log('  ', publicSection[0].substring(0, 300))
      }
    } else {
      // Get element info
      const elementInfo = await foundElement.evaluate((el: any) => ({
        tagName: el.tagName,
        type: el.type,
        name: el.getAttribute('name'),
        value: el.value,
        text: el.textContent?.trim(),
        outerHTML: el.outerHTML.substring(0, 500)
      }))

      console.log('\n  Element details:')
      console.log('    Tag:', elementInfo.tagName)
      console.log('    Text:', elementInfo.text?.substring(0, 60))

      // Step 4: Try clicking
      console.log('\nStep 4: Attempting click...')
      await foundElement.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      await savePageState(page, '02-after-click')

      console.log(`  URL after click: ${page.url()}`)

      // Check for terms page
      const url = page.url()
      if (url.includes('terms') || url.includes('disclaimer')) {
        console.log('  Terms/Disclaimer page detected')

        // Look for accept button
        const acceptButtons = [
          'button:has-text("Accept")',
          'input[value*="Accept"]',
          'button:has-text("I Agree")',
          'input[type="submit"]'
        ]

        for (const btnSelector of acceptButtons) {
          try {
            const btn = page.locator(btnSelector).first()
            if (await btn.isVisible({ timeout: 3000 })) {
              console.log(`  Clicking accept: ${btnSelector}`)
              await btn.click()
              await page.waitForLoadState('networkidle')
              await page.waitForTimeout(2000)
              await savePageState(page, '03-after-accept')
              console.log(`  URL after accept: ${page.url()}`)
              break
            }
          } catch {}
        }
      }

      // Step 5: Check for search interface
      console.log('\nStep 5: Checking for search interface...')
      const finalHtml = await page.content()

      const hasSearch = finalHtml.includes('search') ||
                         finalHtml.includes('parcel') ||
                         finalHtml.includes('name') ||
                         finalHtml.includes('document')

      console.log(`  Has search keywords: ${hasSearch ? 'YES ✓' : 'NO'}`)

      // Look for search inputs
      const searchInputs = await page.locator('input[type="text"], input[name*="search"]').all()
      console.log(`  Text inputs found: ${searchInputs.length}`)

      if (searchInputs.length > 0) {
        for (let i = 0; i < Math.min(searchInputs.length, 3); i++) {
          const input = searchInputs[i]
          const attrs = await input.evaluate((el: any) => ({
            name: el.name,
            placeholder: el.placeholder,
            id: el.id
          }))
          console.log(`    Input ${i+1}:`, attrs)
        }
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('DEBUG COMPLETE')
    console.log('='.repeat(80))
    console.log(`All artifacts saved to: ${OUTPUT_DIR}`)

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error)
    await page.screenshot({ path: `${OUTPUT_DIR}/error-screenshot.png` })
  } finally {
    await browser.close()
  }
}

debugSanpeteRecorder().catch(console.error)
