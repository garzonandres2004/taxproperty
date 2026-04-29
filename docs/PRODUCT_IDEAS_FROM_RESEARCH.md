# Product Ideas from Dustin Hahn Research Analysis

**Source:** Tax Lien School YouTube Transcripts (16 videos, 46,000+ words)  
**Analyzed by:** Claude Code  
**Date:** 2026-04-29  
**Focus:** Utah County Implementation Only

---

## SECTION 1: HIS COMPLETE METHODOLOGY

### Dustin Hahn's 9-Step Title Research Process (In Exact Order)

Based on analysis of "Tax Deed Title For Beginners," "Tax Deed Research Pro Tip," and "How To Find OTC Tax Deeds" videos:

#### Step 1: Drive the Property (PHYSICAL VISIT)
**Quote:** *"For every single property that we're interested in, we're going to go ahead and drive that property."*

- **Physical visit mandatory** before any research
- Assess condition from the street
- Check neighborhood quality
- Verify accessibility (can you get to it?)
- **Decision Point:** If it passes visual inspection, proceed to title research
- **Red Flags:** Major damage (fire, flood), overgrown/abandoned, dangerous neighborhood

**Tool He Uses:** Google Maps for directions, Regrid mobile app for parcel verification

#### Step 2: Verify Property Value (ARV)
**Quote:** *"We're going to figure out how much it's worth... create a rehab budget."*

**Tools:**
- Zillow Zestimate
- County assessed value
- Comparable sales

**Quick Math Example:**
- Opening bid: $2,500
- Estimated value: $30,000
- Potential quick sale: $24,999 (80% of ARV)
- Gross profit: ~$22,499 (before costs)

**Decision Point:** If ARV doesn't justify the bid, STOP here.

#### Step 3: Calculate Maximum Bid
**Quote:** *"Why would nobody buy this? Because it's worth about 30 grand."*

**His Formula:**
```
Max Bid = Quick Sale Price - Costs - Profit

Where:
- Quick Sale Price = ARV × 0.80 (sell at 80% for fast sale)
- Costs = Municipal Liens + Quiet Title (~$3,500) + Holding Costs
- Profit = Your desired profit margin
```

**Example from Live Auction:**
- Property: 8.9 acre lot in Georgia
- Opening bid: $28,334
- Zillow: $962,000
- His thought: *"This could be a chance to get a property for a couple cents on the dollar"*

#### Step 4: Find County Recorder Website
**Quote:** *"The easiest way to find that website is always going to be putting in the county name in Google and then simply deed search."*

**Exact Process:**
1. Google: "[County Name] deed search"
2. Look for "Real Property Records"
3. Verify you're on the right site by looking for "Grantor" and "Grantee" fields

**Quote:** *"I've tested this hundreds and hundreds of times and it's actually never ever failed me."*

#### Step 5: Search by Owner Name (CRITICAL NUANCE)
**Quote:** *"If it's a resale, it's owned by the county right now. And if I search the county name, that's going to bring up thousands and thousands of things."*

**For Resale/OTC Properties:**
- **SKIP** searching the county (too many results)
- Look for previous owner in property details
- Search by that specific owner name
- Get complete chain of title since they owned it

#### Step 6: Understand Grantor vs Grantee
**Quote:** *"Grantor is when someone's selling, Grantee is when someone's buying."*

- **Grantor (left side):** Person SELLING the property
- **Grantee (right side):** Person BUYING the property
- **Rule:** Search the name on BOTH sides to get complete picture

#### Step 7: Check for Municipal Liens
**Quote:** *"From state to state and even county to county, municipal liens can be ambiguous. The county is not going to wipe out their own interest."*

**Key Insights:**
- In Texas: Municipal liens generally survive tax deed sale
- In Michigan: Different rules (varies by county)
- **Action:** Must find municipal lien balance and subtract from max bid
- Can be thousands of dollars

#### Step 8: Cross-Reference with GIS/Property Lines
**Quote:** *"Regrid's cool because it's an app on your phone as well as desktop... You can see yourself in proximity to the parcel you're looking at."*

**Tools:**
- Regrid (free mobile app)
- LandGlide (alternative, $10-12/month)

**Purpose:**
- Verify property boundaries
- Confirm address matches parcel
- Avoid landlocked properties
- See property lines while driving

**Quote:** *"Think of it like Google Maps with the little blue dot showing exactly where you are..."*

#### Step 9: Final Steps - Lawsuit Search
**Quote:** *"The final two steps is to do a title search and then a lawsuit search or lawsuit title search as well."*

**Two Searches:**
1. Title search (ownership/liens)
2. Lawsuit search (litigation against property)

**ONLY done if property passes all previous steps.**

---

## SECTION 2: TOOLS HE USES (with URLs)

### FREE Tools (He Emphasizes These)

| Tool | Purpose | How to Access | Automation Potential |
|------|---------|---------------|---------------------|
| **County Recorder Website** | Deed search, title records | Google: "[County] deed search" | Auto-link generator per property |
| **Regrid (mobile app)** | Property lines, parcel mapping | regrid.com - Free mobile app | Integrate Regrid API or use parcel overlay |
| **Google Maps** | Navigation, Street View | maps.google.com | Already implemented |
| **Google Earth** | Aerial view, topography | earth.google.com | Can embed in property detail |
| **Zillow** | Property values, Zestimates | zillow.com | API available ($$$) or scrape |
| **County GIS** | Tax records, parcel data | County-specific | AGRC integration already done |

### PAID Tools (Optional but Mentioned)

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **LandGlide** | Property lines alternative | $10-12/month | Regrid alternative |
| **Title Company** | Complex title issues | Per transaction | For difficult titles |
| **Propteams** | Comprehensive data | $99/month | Full-service platform |

---

## SECTION 3: FEATURES TO BUILD (Ranked by Investor Value)

### FROM TITLE RESEARCH SERIES

#### 1. Interactive Title Research Checklist (9 Steps)
**What Dustin Does Manually:** 
- Keeps mental checklist of 9 steps
- Writes notes on paper or spreadsheet
- Checks off each step manually

**How TaxProperty Would Automate It:**
Per-property checklist in property detail page:
1. ☐ Drive-by/Street View verified (auto-check if Street View available)
2. ☐ County recorder deed search done (link auto-generated)
3. ☐ Grantor/Grantee chain reviewed (document timeline shown)
4. ☐ Municipal liens checked (flag if detected)
5. ☐ Owner name lien search done (pre-filled owner name search)
6. ☐ HOA status checked (manual checkbox with notes)
7. ☐ ARV verified with Zillow/Zestimate (auto-import)
8. ☐ GIS/parcel boundary verified (auto-check from AGRC)
9. ☐ Lawsuit search done (manual checkbox)

**Each item:** Pending → In Progress → Clear → Flagged with notes field

**Data Source:** User interaction + auto-fill from existing data
**Difficulty:** Medium
**Impact:** HIGH (saves 15-30 min per property)
**GitHub Issue:** #24

---

#### 2. County Recorder Auto-Link Generator
**What Dustin Does:**
- Google search every time: "[County] deed search"
- Navigate to site
- Find the search page
- Type in owner name

**How TaxProperty Automates:**
For each property, auto-generate direct links:

**Utah County Implementation:**
- **Deed Search by Owner:** `https://www.utahcounty.gov/LandRecords/namesearch.asp?av_name=[OWNER_NAME_URL_ENCODED]`
- **Parcel Lookup:** `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=[PARCEL_SERIAL]`
- **Document Search:** `https://www.utahcounty.gov/LandRecords/Index.asp`

**Display as Action Buttons:**
```
[🔍 Search Deeds by Owner: John Smith]  [📋 View Parcel Records]  [📄 All Documents]
```

**Data Source:** Property owner_name, parcel_number
**Difficulty:** Easy
**Impact:** HIGH (saves 5-10 min per property)
**GitHub Issue:** #25

---

#### 3. Grantor/Grantee Document Timeline
**What Dustin Does:**
- Searches owner name
- Views list of documents
- Mentally traces ownership chain
- Writes down key transfers

**How TaxProperty Automates:**
Visual timeline showing:
```
2020: John Smith (Grantor) → Jane Doe (Grantee) [Deed]
2015: Jane Doe (Grantor) → John Smith (Grantee) [Deed]  
2010: Bank of Utah (Grantor) → Jane Doe (Grantee) [Foreclosure]
```

**Note:** Would require scraping county recorder or API access

**Data Source:** Utah County Land Records (scrape or API if available)
**Difficulty:** HARD (requires web scraping)
**Impact:** MEDIUM
**GitHub Issue:** #26

---

#### 4. Municipal Lien Auto-Detector
**What Dustin Does:**
- Calls or visits county
- Asks about code violations, unpaid utilities
- Tries to get dollar amounts
- Subtracts from max bid

**How TaxProperty Automates:**
For Utah County:
- Check Utah County Code Enforcement records (if API)
- Cross-reference with utility companies (if data available)
- Auto-flag properties with likely municipal liens

**Display:**
```
⚠️ Municipal Lien Risk Detected
Potential liens: Code violations, utility bills
Estimated impact: $2,000 - $5,000
Action: Contact Utah County Code Enforcement: (801) 851-8200
Auto-adjusted max bid: -$3,500
```

**Data Source:** Utah County Code Enforcement (scrape needed)
**Difficulty:** HARD
**Impact:** HIGH (prevents costly surprises)
**GitHub Issue:** #27

---

#### 5. "Why Is Nobody Buying This?" Red Flag Analyzer
**What Dustin Does:**
- Asks himself this question for every property
- Investigates if it seems too good
- Looks for hidden problems

**How TaxProperty Automates:**
Algorithm that flags:
- Opening bid < 1% of ARV ("too good to be true")
- High-value property with low taxes owed
- Previously passed at auction (why?)
- Occupied property without eviction research
- Properties with >3 years delinquent taxes

**Display as Red Flags:**
```
🚩 Red Flags Detected:
- Property worth $500K, only $1,200 owed (suspiciously low)
- Previous auction passed (Nov 2025)
- 5 years delinquent (unusual pattern)
Recommended: Deep due diligence or avoid
```

**Data Source:** Property data, sales history
**Difficulty:** Medium
**Impact:** HIGH (prevents bad investments)
**GitHub Issue:** #28

---

#### 6. Quiet Title Cost Estimator
**What Dustin Does:**
- Mentally subtracts "about $3,500" for quiet title
- Doesn't calculate precisely

**How TaxProperty Automates:**
Interactive calculator:
- Base cost: $3,500 (Utah average)
- Complexity adders: +$1,000 if multiple heirs, +$2,000 if bankruptcy involved
- Estimated time: 3-6 months
- Auto-subtracted from Max Bid

**Display in Max Bid Calculator:**
```
Quiet Title Estimate: $3,500
  Base fee: $3,000
  Filing/service: $500
  Time to clear: ~4 months
```

**Data Source:** Static estimate based on Utah rates
**Difficulty:** Easy
**Impact:** MEDIUM
**GitHub Issue:** #29

---

### FROM LIVE AUCTION WALKTHROUGHS

#### 7. Max Bid Calculator (Enhanced)
**What Dustin Does:**
- Mental math: ARV × 0.80 - liens - $3500 - profit
- Sometimes makes errors or forgets items

**How TaxProperty Automates:**
Interactive calculator on property detail:

```
MAX BID CALCULATOR
═══════════════════════════════════════

After Repair Value (ARV):     $[auto-filled from property]
Quick Sale Price (80% ARV):   $[calculated]

LESS COSTS:
- Municipal Liens (est.):     $[user input or auto-detect]
- Quiet Title Cost:           $3,500 (auto-filled)
- Rehab/Repairs:              $[user input]
- Holding Costs (6 mo):       $[calculated from property taxes]
- Closing Costs (sell):       $[3% of ARV estimate]

LESS PROFIT MARGIN:
- Desired Profit:             $[user input % or $]

═══════════════════════════════════════
MAXIMUM BID: $[calculated]
DO NOT EXCEED: $[max bid - 5% buffer]

Current Opening Bid: $[from property]
Verdict: [✅ GOOD DEAL / ⚠️ MARGINAL / 🚩 OVERPRICED]
```

**Formula from research:** Max Bid = (ARV × 0.80) - Municipal Liens - $3,500 - Repairs - Profit

**Data Source:** Property ARV + user inputs
**Difficulty:** Medium
**Impact:** HIGH (core feature)
**GitHub Issue:** #30

---

#### 8. "Tax Sanity Checker" - Flag Suspicious Payoffs
**What Dustin Does:**
- Notices when tax amount doesn't match property value
- Asks: "Does it make sense that $1M property has $2,800 taxes?"
- Investigates deeper

**How TaxProperty Automates:**
Auto-check: If total_amount_due / estimated_market_value < 0.3%, flag as suspicious.

**Red Flag Logic:**
- Low payoff on high-value property = likely occupied
- Could indicate: special assessment, partial payment plan, or complex title

**Display:**
```
⚠️ TAX SANITY CHECK FAILED
Opening bid: $2,800
Estimated value: $962,000
Tax-to-value ratio: 0.29%

Normal range: 1-5% per year
This property: Suspiciously low

Possible explanations:
- Property is occupied (owner making partial payments)
- Special tax exemption (senior/disabled veteran)
- Recent assessment dispute
- Title complications

ACTION: Verify occupancy status before bidding
```

**Data Source:** property.total_amount_due / property.estimated_market_value
**Difficulty:** Easy
**Impact:** HIGH (catches hidden problems)
**GitHub Issue:** #31

---

#### 9. OTC (Over The Counter) Opportunity Detector
**What Dustin Does:**
- Searches for "over the counter" properties
- Knows these didn't sell at auction (passed for a reason)
- But also: no competition, first-come-first-serve

**How TaxProperty Automates:**
Add `is_otc` boolean to Property model.

**Detection:**
- Properties with status = "unsold" from previous auction
- Available direct from county (not at auction)
- Often better deals because no bidding war

**Scoring Boost:**
- OTC properties get +10 to opportunity_score
- Less competition = better chance to get at opening bid
- BUT: Also flag "why didn't this sell?"

**Display:**
```
🏷️ OVER THE COUNTER
Available now without auction competition
Previous auction: Passed (Nov 2025)
Ask yourself: Why did nobody buy this?
[View Red Flags] [Calculate Max Bid]
```

**Data Source:** County OTC lists (require import)
**Difficulty:** Medium
**Impact:** MEDIUM
**GitHub Issue:** #32

---

#### 10. Live Auction Countdown Tracker
**What Dustin Does:**
- Mentally tracks upcoming auction dates
- Sometimes misses sales

**How TaxProperty Automates:**
Dashboard widget showing:
```
⏰ UPCOMING AUCTIONS
═══════════════════════════════════════

Utah County Tax Sale
📅 May 21, 2026 (in 12 days)
📍 Online auction
🔢 127 properties
⏰ Registration opens: May 14

[View All Properties] [Set Reminder]
```

With email/SMS reminders at:
- 7 days before
- 1 day before
- 1 hour before (registration deadline)

**Data Source:** county_configs.auction_date
**Difficulty:** Easy
**Impact:** MEDIUM
**GitHub Issue:** #33

---

#### 11. Regrid/Parcel Boundary Map Embed
**What Dustin Does:**
- Opens Regrid app on phone while driving
- Verifies he's at the right parcel
- Checks property lines

**How TaxProperty Automates:**
Embed map in property detail showing:
- Parcel boundary overlay
- Street View integration
- Aerial view toggle

**Implementation Options:**
- **Regrid Embed:** iframe with parcel ID
- **OpenStreetMap + Parcel Overlay:** If Utah County provides KML/GeoJSON
- **AGRC Map:** Link to Utah County's GIS viewer

**Display:**
```
[MAP TAB]
┌─────────────────────────────────────┐
│                                     │
│    [Parcel boundary overlay]        │
│    [Street View toggle]             │
│    [Aerial view]                    │
│                                     │
│  📍 123 Main St                     │
│  📐 0.45 acres                      │
│                                     │
└─────────────────────────────────────┘
[Open in Regrid] [Open in Google Maps]
```

**Data Source:** Regrid API or AGRC parcel geometry
**Difficulty:** Medium
**Impact:** HIGH (visual verification critical)
**GitHub Issue:** #34

---

#### 12. Street View Integration (Enhanced)
**What Dustin Does:**
- Uses Google Street View to "drive" property remotely
- But always does physical drive-by before bidding

**Current Status:** ✅ Already implemented in TaxProperty V2.1

**Enhancement Ideas:**
- Street View date stamp (how old is the image?)
- Aerial view toggle
- Split view: Street View + Map

**Data Source:** Google Street View API (already configured)
**Difficulty:** Easy
**Impact:** HIGH
**Status:** Already built

---

### FROM VAULT.TAXLIENSCHOOL.COM (Features They Have)

#### 13. Interactive US Map - Sale Types by State
**What Vault Has:**
- Interactive map of all 50 states
- Color-coded by sale type (deed/lien/redeemable/hybrid)
- Click state for details

**How TaxProperty Implements:**
Page at `/states` showing:

```
[INTERACTIVE US MAP]
🟦 Tax Deed States (blue)
🟩 Tax Lien States (green)
🟧 Redeemable Tax Deed (orange)
🟪 Hybrid States (purple)

Click any state for:
- Sale type
- Interest rate (for liens)
- Redemption period
- Top counties
- Auction frequency
- Link to state guide
```

**Utah Focus (for now):**
- Utah = Redeemable Tax Deed (orange)
- Interest: N/A (deed state)
- Redemption: 1-4 years depending on property use

**Data Model:** StateGuide
- state, sale_type, interest_rate_max, redemption_period_days, auction_frequency, notes

**Data Source:** Research + static data
**Difficulty:** Medium
**Impact:** HIGH (foundation for national expansion)
**GitHub Issue:** #35

---

#### 14. Auction Calendar
**What Vault Has:**
- Upcoming tax sales by county
- Dates and registration deadlines

**How TaxProperty Implements:**
Page at `/calendar`:

```
APRIL 2026
═══════════════════════════════════════

Week of Apr 27
─────────────
📅 Mon, Apr 28
   • Utah County, UT - Tax Deed Sale
     127 properties | Online
     [View Properties] [Add to Calendar]

📅 Thu, Apr 30
   • Salt Lake County, UT - Tax Deed Sale
     89 properties | Online
     [View Properties] [Add to Calendar]

[Filter by State] [Filter by Sale Type] [Email Reminders]
```

**Features:**
- Filter by state, sale type, date range
- Email reminders (1 week, 1 day, morning of)
- Export to Google/Outlook calendar
- Countdown timers

**Data Source:** county_configs.auction_date
**Difficulty:** Medium
**Impact:** HIGH (key feature from Vault)
**GitHub Issue:** #36

---

#### 15. State-by-State Guide Pages
**What Vault Has:**
- Detailed guides per state

**How TaxProperty Implements:**
Page at `/states/utah`:

```
UTAH TAX DEED GUIDE
═══════════════════════════════════════

Sale Type: Redeemable Tax Deed
Properties Available: Tax deed (not lien)

Redemption Period:
• Residential: 1 year (if owner-occupied)
• Non-owner occupied: 4 years
• Vacant land: 4 years

Interest/Penalty: Not applicable (deed state)

Top Counties:
1. Utah County - Monthly sales
2. Salt Lake County - Quarterly sales
3. Davis County - Bi-annual

Recent Properties:
[Show 5 recent Utah properties with links]

[View Full Utah Property List]
```

**Utah County Specific Section:**
- Auction schedule
- How to register
- Payment methods
- Special rules

**Data Source:** StateGuide model + county_configs
**Difficulty:** Easy
**Impact:** MEDIUM
**GitHub Issue:** #37

---

#### 16. Sale Type Explainer
**What Vault Has:**
- Education on different sale types

**How TaxProperty Implements:**
Modal or page explaining:

```
TAX DEED vs TAX LIEN
═══════════════════════════════════════

🎫 TAX DEED (what Utah has)
You get: Actual property deed
Best for: Long-term investors, flippers
Risk: Property condition, title issues
Reward: Can get properties 90% below market

💰 TAX LIEN (not in Utah)
You get: Lien certificate
Best for: Cash flow, interest income
Risk: Property may never redeem
Reward: 12-36% interest rates

🔁 REDEEMABLE DEED (Utah hybrid)
You get: Deed immediately
BUT: Owner can redeem (buy back)
For: 1-4 years depending on use
If redeemed: You get purchase price + interest
```

**Data Source:** Static educational content
**Difficulty:** Easy
**Impact:** LOW (educational)
**GitHub Issue:** #38

---

### SCORING IMPROVEMENTS from Research

#### 17. Redemption Risk Score Improvement
**What Dustin Does:**
- Checks years delinquent
- Looks at payment patterns
- Considers owner type (individual vs LLC vs bank)

**How TaxProperty Enhances:**
Better algorithm for redemption likelihood:

**Factors:**
- Years delinquent (1 year = low risk, 5+ years = high risk)
- Payment pattern (did they pay partial? = likely to redeem)
- Owner type (bank = high redemption, individual = medium, LLC = low)
- Property use (owner-occupied = high redemption, vacant = low)

**Display:**
```
REDEMPTION RISK: MEDIUM (6/10)

Factors:
• 3 years delinquent (-2 points)
• No partial payments detected (+1 point)
• Owner: Individual (not bank) (-1 point)
• Property appears occupied (-2 points)

Likelihood owner redeems: 45%
If redeemed, you'd receive: $X + 1.5% interest
```

**Data Source:** Property history (scrape), occupancy detection
**Difficulty:** HARD (needs historical data)
**Impact:** HIGH (core to investment decision)
**GitHub Issue:** #39

---

#### 18. "Too Good To Be True" Detector
**What Dustin Does:**
- Mental check: "Why would nobody buy this?"
- Investigates deeply if deal looks amazing

**How TaxProperty Automates:**
Algorithm flags when:
- Opening bid < 0.5% of ARV
- Similar properties sold for 10x at previous auction
- Property in prime location with no bidders
- Multiple previous auction passes

**Display:**
```
🚨 TOO GOOD TO BE TRUE ALERT

This property is flagged because:
• Opening bid is 0.2% of estimated value
• Previous auction: NO BIDDERS (Oct 2025)
• Zestimate: $450,000
• Opening bid: $890

This is NOT normal. Investigate:
☐ Is the property occupied?
☐ Are there hidden liens?
☐ Is access/egress blocked?
☐ Environmental issues?
☐ Is the property actually buildable?

[View Red Flags] [Mark as Reviewed]
```

**Data Source:** Property data + historical sales
**Difficulty:** Medium
**Impact:** HIGH (prevents disasters)
**GitHub Issue:** #40

---

#### 19. OTC Premium Scoring
**What Dustin Does:**
- Prefers OTC properties (no competition)
- But also suspicious of why they didn't sell

**How TaxProperty Implements:**
Special scoring for OTC properties:

```
OTC BONUS APPLIED
═══════════════════════════════════════
Base opportunity score: 65
+10 OTC bonus (no auction competition)
-5 Previous pass penalty (why didn't it sell?)
────────────────────────────────────────
Final OTC score: 70

OTC Advantages:
✅ No bidding war
✅ Time to research thoroughly
✅ First come, first serve

OTC Risks:
⚠️ Passed for a reason
⚠️ May have hidden issues
⚠️ Been sitting unsold (deteriorating?)
```

**Data Source:** is_otc flag + property status
**Difficulty:** Easy
**Impact:** MEDIUM
**GitHub Issue:** #41

---

#### 20. Municipal Lien Penalty in Scoring
**What Dustin Does:**
- Subtracts municipal liens from max bid
- Sometimes avoids properties with big municipal liens

**How TaxProperty Implements:**
Add municipal_lien_risk to scoring:

```python
if municipal_lien_detected:
    opportunity_score -= 20
    risk_score += 15
    max_bid_adjustment -= estimated_municipal_lien
```

**Detection Methods:**
1. API check (if available)
2. Pattern detection (property with low tax owed but high value = possible municipal issues)
3. Manual flag by user

**Display:**
```
MUNICIPAL LIEN RISK DETECTED
⚠️ Estimated impact: -20 points to opportunity score

In Utah, municipal liens may survive tax sale.
Recommended: Call Utah County (801) 851-8200
Code Enforcement to verify status.
```

**Data Source:** Code enforcement scrape + pattern detection
**Difficulty:** HARD
**Impact:** HIGH (can save thousands)
**GitHub Issue:** #42

---

## SECTION 4: GITHUB ISSUES TO CREATE

### Priority 1: High Impact / Easy-Medium

1. **Issue #30** - Build max bid calculator
2. **Issue #31** - Add tax sanity checker  
3. **Issue #24** - Build interactive title research checklist
4. **Issue #25** - County recorder auto-link generator
5. **Issue #34** - Embed Regrid/parcel boundary map

### Priority 2: High Impact / Hard

6. **Issue #39** - Redemption risk score improvement
7. **Issue #40** - "Too good to be true" detector
8. **Issue #27** - Municipal lien auto-detector
9. **Issue #26** - Grantor/Grantee document timeline
10. **Issue #42** - Municipal lien penalty in scoring

### Priority 3: Medium Impact / Medium Difficulty

11. **Issue #33** - Live auction countdown tracker
12. **Issue #32** - OTC opportunity detector
13. **Issue #28** - "Why is nobody buying this?" analyzer
14. **Issue #29** - Quiet title cost estimator

### Priority 4: Foundation for Expansion

15. **Issue #35** - Interactive US state map
16. **Issue #36** - Auction calendar page
17. **Issue #37** - State guide data model and pages

### Priority 5: Educational / Lower Impact

18. **Issue #38** - Sale type explainer
19. **Issue #41** - OTC premium scoring enhancement

---

## SECTION 5: IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (Week 1-2)
**Goal:** Features that save time immediately

1. Max Bid Calculator (#30)
2. Tax Sanity Checker (#31)
3. Title Research Checklist UI (#24)
4. County Recorder Links (#25)

### Phase 2: Scoring Intelligence (Week 3-4)
**Goal:** Smarter scoring based on Dustin's logic

1. Redemption Risk Improvement (#39)
2. "Too Good To Be True" Detector (#40)
3. Enhanced Max Bid with all factors

### Phase 3: Data Enrichment (Week 5-6)
**Goal:** Automate what Dustin does manually

1. Municipal Lien Detection (#27)
2. Document Timeline (#26)
3. Red Flag Analyzer (#28)

### Phase 4: Expansion Foundation (Week 7-8)
**Goal:** Prepare for multi-county

1. Interactive US Map (#35)
2. Auction Calendar (#36)
3. State Guides (#37)

---

## APPENDIX: Dustin's Favorite Phrases (Product Copy Ideas)

**For Marketing:**
- "Mortgage free for the back taxes owed"
- "Up to 90% below market value"
- "First come, first serve"
- "Time is of the essence"
- "Why would nobody buy this?"
- "Never ever ever trust the property location"
- "Drive that property"

**For UI:**
- "Get eyes on the property"
- "Do not exceed [max bid]"
- "Avoid the gremlins in the title"
- "Check the GIS" (he says this constantly)
- "Grantor/Grantee"

**For Error/Warning Messages:**
- "This doesn't make sense"
- "Too good to be true"
- "Passed for a reason"

---

*Analysis completed from 16 YouTube transcripts, 3 research documents, and 46,000+ words of Dustin Hahn content.*
*All recommendations focus on Utah County implementation.*
