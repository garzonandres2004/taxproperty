# Tooele County Browser Automation Report

## Date: May 5, 2026 (Auction: May 7, 2026 - 2 days)

## Executive Summary

**Full browser automation is NOT achieved.** The EagleWeb system uses proprietary Tyler Technologies software with session management that resists simple automation patterns.

## What Was Implemented

### 1. Playwright Browser Automation (`tooele-browser.ts`)
- Session persistence (cookies/storage saved to `.tooele-session.json`)
- Splash page navigation
- TaxWeb link clicking (attempted)
- Terms acceptance handling (attempted)
- Screenshot and HTML capture for debugging

### 2. Attempted Flow
```
1. Navigate to https://erecording.tooeleco.gov/web/
2. Click "Go to TaxWeb" link (href="web")
3. Accept terms if present
4. Navigate to docSearch.jsp
5. Enter parcel number
6. Extract document table
```

## The Blocker

**Problem:** The TaxWeb link click doesn't navigate away from the splash page.

**Evidence:**
- Screenshot shows: Still on splash page with "Go to TaxWeb" link visible
- URL remains: `https://erecording.tooeleco.gov/web/splash.jsp`
- JavaScript click evaluation doesn't change page
- Direct navigation to `/web/docSearch.jsp` redirects back to splash

**Root Cause:** EagleWeb uses proprietary session initialization that likely:
1. Requires specific cookie/session state from previous page loads
2. May use JavaScript redirects that Playwright doesn't follow
3. Could have anti-automation checks (though not confirmed)
4. Might require the full Java client (not web-based for core features)

## What's Working

### Manual Lookup Instructions (Verified)
```
1. Visit: https://erecording.tooeleco.gov/web/login.jsp
2. Click "Go to TaxWeb"
3. Accept terms
4. Search parcel: 0610100015
5. View document history
```

### Mediciland Backup (Partial)
- URL: https://search.tooeleco.gov.mediciland.com/
- Some records available (1985-1995)
- May not have current data

## Current Status: Alpha/Partial

| Feature | Status | Notes |
|---------|--------|-------|
| AGRC market value | ✅ Working | 83% have values |
| AGRC coordinates | ✅ Working | 100% have lat/lng |
| AGRC physical data | ✅ Partial | Year built where available |
| Title automation | ❌ Blocked | EagleWeb resists automation |
| Title manual | ✅ Instructions | Steps documented above |
| Auction triage | ⚠️ Partial | Works with manual title |

## Recommendation for Auction

**Use the existing `npm run triage:tooele` script** which provides:
- Score assessment (AGRC-based)
- Amount due vs market value comparison
- Status classification (GO/CAUTION/RESEARCH/SKIP)
- Manual lookup links for title verification

**For title verification before bidding:**
1. Run `npm run triage:tooele -- --limit=10`
2. Note GO candidates
3. Manually verify title in EagleWeb for top 3-5
4. Check for unreleased liens
5. Confirm last transfer date/type

## Time Estimate for Full Automation

If continuing with browser automation:
- 2-4 hours: Debug EagleWeb session handling
- 2 hours: Implement robust document parsing
- 2 hours: Test and validate on full auction list
- **Total: 6-8 hours** (risk: may not be solvable)

## Files Created

- `src/lib/title/scrapers/tooele-browser.ts` - Playwright automation
- `src/lib/title/scrapers/tooele-mediciland.ts` - Backup scraper
- `scripts/auction-triage-tooele.ts` - Working triage script
- `scripts/debug-tooele-title.ts` - Debug script
- `TOOELE_AUTOMATION_REPORT.md` - This report

## Conclusion

**For auction triage in 2 days:** Use manual title verification + automated triage scoring.

**For post-auction:** Continue debugging EagleWeb automation or implement OCR-based document processing from Mediciland/Public Surplus data.
