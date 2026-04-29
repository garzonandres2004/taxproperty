# Remaining GitHub Issues to Create

## Issue #6: Interactive US State Map
**Title:** Feature: Interactive US map showing sale type by state

**Body:**
Page at /states showing all 50 states color-coded:
- Tax Deed (blue)
- Tax Lien (green)  
- Redeemable Deed (orange)
- Hybrid (purple)

Click state shows:
- Sale type
- Interest rate (liens)
- Redemption period
- Top counties
- Auction frequency

Foundation for national SaaS expansion.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #35

---

## Issue #7: Auction Calendar Page
**Title:** Feature: Build auction calendar page

**Body:**
Page at /calendar showing upcoming tax sales.

Cards per auction:
- County name, state
- Auction date
- Format (online/in-person)
- Number of properties
- Link to official auction page

Filter by state, sale type, date range.
Email reminder feature.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #36

---

## Issue #8: OTC Property Detection
**Title:** Feature: Add OTC (Over The Counter) property detection

**Body:**
OTC properties = parcels that didn't sell at previous auction.

Add is_otc boolean to Property model.
Detect from property status or notes.

OTC properties get +10 bonus to opportunity_score (less competition).
Add OTC filter to properties page.

"Sometimes over the counter can be good deal... first come, first serve" - Dustin Hahn

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #32

---

## Issue #9: Max Bid Calculator
**Title:** Feature: Build max bid calculator

**Body:**
Formula from expert research: Max Bid = (ARV × 0.80) - Municipal Liens - $3,500 quiet title - Desired Profit %.

Interactive calculator on property detail page:
- ARV pre-filled from estimated_market_value
- User inputs repair estimate and desired profit
- Shows maximum bid amount with breakdown
- Do not exceed warning

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #30

---

## Issue #10: Tax Sanity Checker
**Title:** Feature: Add tax sanity checker - flag suspicious payoffs

**Body:**
Dustin says: "Tax amount doesn't make sense ($2,800 on $1M property)" is red flag.

Auto-check: if total_amount_due / estimated_market_value < 0.3%, flag as suspicious.

Low payoff on high-value property = likely occupied, complex title, or other hidden issue.

Add to red_flags array and display warning on property detail.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #31

---

## Issue #11: Title Research Checklist
**Title:** Feature: Build interactive title research checklist (9 steps)

**Body:**
Based on Dustin Hahn 9-step process.

Per-property checklist in property detail page:
1. Drive-by/Street View verified
2. County recorder deed search done
3. Grantor/Grantee chain reviewed
4. Municipal liens checked
5. Owner name lien search done
6. HOA status checked
7. ARV verified with Zillow
8. GIS/parcel boundary verified
9. Lawsuit search done

Each item: pending/clear/flagged with notes field.
Links to relevant county URLs.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #24

---

## Issue #12: County Recorder Links
**Title:** Feature: Build county recorder auto-link generator

**Body:**
For each property, auto-generate direct links to:
1. County recorder deed search pre-filled with owner name
2. County assessor parcel lookup
3. State court records search for lawsuits

Display as action buttons in title research checklist section.

For Utah County: utahcounty.gov/LandRecords/namesearch.asp?av_name=[OWNER_NAME]

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #25

---

## Issue #13: Regrid Map Embed
**Title:** Feature: Embed Regrid/parcel boundary map on property detail

**Body:**
Dustin uses Regrid to verify property lines.

Add embedded map to property detail page showing actual parcel boundary.

Use free Regrid embed or OpenStreetMap with parcel overlay.
Also add Google Street View iframe embed using lat/lng from AGRC data.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #34

---

## Issue #14: Redemption Risk Score
**Title:** Feature: Add redemption risk score improvement

**Body:**
His exact signals: years delinquent, payment pattern, owner type.

Algorithm:
- Years delinquent (1 year = low risk, 5+ years = high)
- Payment pattern (partial payments = likely to redeem)
- Owner type (bank = high redemption, LLC = low)
- Property use (owner-occupied = high, vacant = low)

Display: "Likelihood owner redeems: X%"

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #39

---

## Issue #15: Too Good To Be True Detector
**Title:** Feature: Build "too good to be true" detector

**Body:**
Flags properties where payoff is suspiciously low vs value.

Triggers:
- Opening bid < 0.5% of ARV
- Similar properties sold for 10x at previous auction
- Prime location with no bidders
- Multiple previous auction passes

Display: "Why would nobody buy this?" investigation checklist.

Reference: /docs/PRODUCT_IDEAS_FROM_RESEARCH.md Feature #40
