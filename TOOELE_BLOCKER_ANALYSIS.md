# Tooele County Automation Blocker Analysis

## Date: May 5, 2026

---

## 1. DIAGNOSIS: What is Actually Blocking Automation

### 1a) EagleWeb Public Viewer

**Status: UNCLEAR PUBLIC ACCESS**

What we know:
- URL `https://erecording.tooeleco.gov/web/login.jsp` exists
- Splash page shows "Go to TaxWeb" link
- Playwright CAN load the page without authentication
- Playwright CANNOT successfully navigate to search interface

**What blocked Playwright:**
```
1. Load https://erecording.tooeleco.gov/web/ (splash page) - SUCCESS
2. Click "Go to TaxWeb" link - ATTEMPTED but NO NAVIGATION
3. Result: Still on splash page
4. Direct navigation to /web/docSearch.jsp - REDIRECTS back to splash
```

**Root Cause Unknown:**
- JavaScript-based navigation that Playwright didn't trigger?
- Session cookie requirement before accessing TaxWeb?
- Frame-based interface that requires specific initialization?
- The "TaxWeb" vs "Public Web Limited Viewer" distinction

**Screenshot Evidence:** `/tmp/tooele-session.png` shows splash page still visible.

**VERDICT:** Cannot confirm EagleWeb search is fully public-automatable. The navigation chain breaks before reaching search.

---

### 1b) Mediciland / DocAI Portal

**Status: PRIVATE SAAS - NOT PUBLIC**

**User Login Required:** YES
- Email + password login page
- "Continue with Google" option
- Private SaaS service (Mediciland/DocAI)

**This is NOT a public county system.** It requires:
- Personal account credentials
- Or Google authentication
- Agreement to private service terms

**VERDICT:** Mediciland CANNOT be automated within our constraints.

---

## 2. THE REAL BLOCKER

**Answer: C (Both) with Mediciland being the bigger issue**

- **Primary Blocker:** Mediciland is private and requires login
- **Secondary Blocker:** EagleWeb navigation doesn't work with basic Playwright

**I made an ERROR suggesting Mediciland as a backup.** It is not public.

---

## 3. LEGAL / PRACTICAL BOUNDARY CONFIRMATION

**We WILL NOT:**
- ❌ Automate login to private SaaS (Mediciland) using stored credentials
- ❌ Bypass authentication mechanisms
- ❌ Scrape behind login walls
- ❌ Use personal Google accounts in automation

**We WILL target ONLY:**
- ✅ Public county systems with no login required
- ✅ AGRC LIR (public API)
- ✅ County GIS/Assessor public portals
- ✅ Documented public recorders with public access

---

## 4. CONCRETE SOLUTION PATH (NO MEDICILAND)

### Option A: Fix EagleWeb Public Viewer

**What to try:**

```typescript
// 1. Use direct Public Viewer URL if different from TaxWeb
// Possible URLs to try:
- https://erecording.tooeleco.gov/web/publicAccess.jsp
- https://erecording.tooeleco.gov/web/guestSearch.jsp
- https://erecording.tooeleco.gov/web/limitedAccess.jsp

// 2. Different session initialization
// Instead of clicking TaxWeb, look for "Public Web Limited Viewer" specifically

// 3. Cookie persistence debugging
// Save cookies at each step to see where session breaks

// 4. Alternative: iframe/frame handling
// EagleWeb may use frames that need specific targeting
```

**Time estimate:** 2-4 hours to exhaust options

### Option B: Document EagleWeb is Not Automatable

If after trying above, still blocked:

**What IS public for Tooele:**
- AGRC LIR: ✅ Market value, coordinates, physical data
- Tooele County Assessor: Public website (no recorder search)
- Tooele County Treasurer: Tax sale list

**Adapted Pipeline:**
- AGRC provides Phase 1-3 (parcel, value, location)
- Title signals: Manual only with documented steps
- Recommendation: Use AGRC data + manual title lookup

---

## 5. CONCRETE DELIVERABLE

### Proposed Next Steps:

**Option 1: Debug EagleWeb Further (2 hours)**
Try specific "Public Web Limited Viewer" entry point vs "TaxWeb"

**Option 2: Accept Partial Automation (Current)**
- Document EagleWeb requires manual lookup
- Use AGRC for everything except title
- Focus manual effort only on GO candidates

**Option 3: Pivot to Fully Automatable County**
Recommend **Weber County** next:
- Kofile portal may have better public access
- Or **Salt Lake County** (slco.org/recorder)
- Research which has true public viewer

---

## HONEST ASSESSMENT

**Did I test "Public Web Limited Viewer" specifically?**
NO. I tested "Go to TaxWeb" which may be different from the public viewer.

**Is Mediciland the real problem?**
YES. It is private and should never have been suggested as a backup.

**What is the path forward?**
1. Try to find actual "Public Web Limited Viewer" link in EagleWeb
2. If found, attempt automation
3. If not found or blocked, document as manual-only
4. Focus on counties with confirmed public recorders

---

## RECOMMENDATION

Given 2 days to auction:

**ACCEPT CURRENT STATE:**
- Tooele: AGRC automation works (market value, location)
- Tooele: Title requires manual lookup (documented steps)
- Use triage script to prioritize which properties need title check
- Manual title verification for top 5 GO candidates only

**NEXT COUNTY FOR FULL AUTOMATION:**
Research Weber or Salt Lake County recorder public access before attempting automation.
