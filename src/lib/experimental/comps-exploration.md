# Comps Exploration - Experimental Research

**Status:** Research Phase  
**Last Updated:** 2026-05-05  
**Owner:** Agent D (Future Track)

---

## Executive Summary

Comparable sales (comps) data would significantly improve valuation accuracy for tax sale properties. Current system relies on AGRC LIR market values which are updated annually. Real comps data would provide:

- Current market conditions (not stale annual data)
- Actual sale prices vs. assessed values
- Neighborhood trends
- Time-on-market insights

---

## Data Source Research

### 1. Utah Real Estate Commission (UREC)

**Status:** Requires license  
**Cost:** MLS access ~$500-1000/year  
**Data Quality:** High - actual MLS sales  
**Coverage:** All Utah counties with MLS participation

**Pros:**
- Most accurate sale prices
- Full property details
- Historical data

**Cons:**
- Requires real estate license
- Expensive for single user
- Licensing requirements

**Verdict:** Not viable for MVP, consider for V2

---

### 2. County Assessor Sales Data

**Status:** Publicly available  
**Cost:** Free  
**Data Quality:** Medium - recorded sales, not always arms-length  
**Coverage:** County-specific

**Utah County Example:**
```
https://www.utahcounty.gov/Assessor/Search.asp
- Historical sales by parcel
- Limited to recent years
- May require scraping
```

**Pros:**
- Free
- Official recorded data
- No licensing

**Cons:**
- Not standardized across counties
- May include non-arms-length sales
- Requires per-county scrapers

**Verdict:** Viable for Utah County, expand per-county

---

### 3. Zillow/Trulia APIs

**Status:** Zillow API deprecated  
**Cost:** Free (limited) / Paid (Zillow API v2)  
**Data Quality:** Medium - Zestimate + some sale data  
**Coverage:** Nationwide

**Current Status:**
- Zillow shut down public API in 2018
- Bridge Interactive API requires partnership
- Zestimate data available via widgets only

**Pros:**
- Nationwide coverage
- Brand recognition

**Cons:**
- API not accessible
- Partnership requirements
- Data accuracy concerns

**Verdict:** Not viable currently

---

### 4. Realtor.com / Homes.com APIs

**Status:** Enterprise only  
**Cost:** Unknown (likely $$$)  
**Data Quality:** High - MLS syndication  
**Coverage:** Nationwide

**Pros:**
- MLS-syndicated data
- Active listings + sales

**Cons:**
- Enterprise sales only
- No public API
- Likely expensive

**Verdict:** Not viable for MVP

---

### 5. ATTOM Data Solutions

**Status:** Commercial API  
**Cost:** $0.10-0.50 per API call  
**Data Quality:** High - property and sales data  
**Coverage:** Nationwide

**Pros:**
- Tax sale specific data available
- Property history
- AVM (Automated Valuation Model)

**Cons:**
- Per-call pricing adds up
- Requires integration work
- Overkill for MVP

**Verdict:** Consider for V2 if volume justifies cost

---

### 6. CoreLogic / Black Knight

**Status:** Enterprise only  
**Cost:** $$$ (thousands/month)  
**Data Quality:** Highest - industry standard  
**Coverage:** Nationwide

**Verdict:** Enterprise only, not viable

---

### 7. Redfin Data Center

**Status:** Public data dumps  
**Cost:** Free  
**Data Quality:** Medium - MLS data via Redfin  
**Coverage:** Major metros only

**URL:** https://www.redfin.com/news/data-center/

**Pros:**
- Free CSV downloads
- Monthly updates
- Good for trend analysis

**Cons:**
- Not real-time
- Limited to Redfin markets
- Utah coverage spotty

**Verdict:** Download for trend analysis, not individual comps

---

## Recommended Approach

### Phase 1: Utah County Assessor Scraping

Implement scraper for Utah County assessor sales data:

1. Query by parcel number for recent sales
2. Query by radius (if possible) for nearby sales
3. Store in database with sale date, price, parcel
4. Calculate simple comps (same neighborhood, similar size)

**Technical Approach:**
```typescript
// Pseudo-code
async function fetchComps(parcelNumber: string) {
  // 1. Get property details (lat/lng, sqft, type)
  const property = await getProperty(parcelNumber)

  // 2. Query assessor for nearby sales
  const nearbySales = await queryAssessorByRadius(
    property.latitude,
    property.longitude,
    0.5 // miles
  )

  // 3. Filter for comparable properties
  const comps = nearbySales.filter(sale =>
    sale.property_type === property.property_type &&
    Math.abs(sale.building_sqft - property.building_sqft) < 500 &&
    sale.sale_date > '2024-01-01' // Recent only
  )

  // 4. Calculate statistics
  return {
    average_price: calculateAverage(comps.map(c => c.sale_price)),
    price_per_sqft: calculateAverage(comps.map(c => c.sale_price / c.building_sqft)),
    count: comps.length,
    range: { min, max },
    confidence: calculateConfidence(comps.length)
  }
}
```

### Phase 2: Expand to Other Counties

Add comp scrapers for:
- Salt Lake County (likely has online sales data)
- Davis County
- Weber County

Each county will need custom scraper due to different systems.

### Phase 3: ATTOM Integration (Optional)

If volume justifies (~100+ properties/month):
- Integrate ATTOM API for instant comps
- Cost: ~$50-100/month at scale
- High quality, immediate results

---

## Implementation Challenges

### 1. Data Quality

**Issue:** Recorded sales include non-arms-length transactions  
**Mitigation:** Filter out:
- Sales to family members
- $0 or $1 sales (transfers)
- Sales significantly below assessed value (data entry errors)

### 2. Timing

**Issue:** Recent sales may not be recorded yet  
**Lag:** 30-90 days typical  
**Mitigation:** Use 12-month lookback, weight recent sales higher

### 3. Rural Properties

**Issue:** Few comparable sales in rural areas  
**Mitigation:** Expand search radius, use fewer comps (3 vs 5)

### 4. Seasonality

**Issue:** Real estate prices vary by season  
**Mitigation:** Compare to sales within same quarter

---

## Scoring Integration Ideas

### Comps-Based Valuation Adjustment

```typescript
interface CompsAdjustment {
  // Adjust estimated_market_value based on actual comps
  factor: number // e.g., 1.15 = comps suggest 15% higher
  confidence: number // 0-100 based on comp count/quality
  compsUsed: number
  priceRange: { min: number, max: number }
}

function calculateCompsAdjustment(
  estimatedValue: number,
  comps: CompSale[]
): CompsAdjustment {
  if (comps.length < 3) {
    return { factor: 1.0, confidence: 0, compsUsed: comps.length }
  }

  const avgSalePrice = average(comps.map(c => c.sale_price))
  const factor = avgSalePrice / estimatedValue

  return {
    factor: clamp(factor, 0.7, 1.3), // Cap adjustments
    confidence: min(comps.length * 20, 100), // More comps = higher confidence
    compsUsed: comps.length,
    priceRange: { min: min(...comps), max: max(...comps) }
  }
}
```

### Opportunity Score Enhancement

```typescript
// In opportunity score calculation
if (compsAdjustment.confidence > 50) {
  // Adjust equity spread based on comps
  const adjustedMarketValue = estimated_market_value * compsAdjustment.factor
  equity_spread = calculateEquitySpread(adjustedMarketValue, totalCost)
}
```

---

## UI/UX Ideas

### Property Detail Page

Add "Comparable Sales" section:

```
┌─ Comparable Sales ──────────────────────────┐
│ Based on 5 recent sales within 0.5 miles   │
│                                            │
│ 123 Oak St        $285,000    3br/2ba     │
│ 125 Oak St        $292,000    3br/2ba     │
│ 119 Oak St        $278,000    3br/1ba     │
│                                            │
│ Average: $285,000 ($142/sqft)             │
│ Range: $278K - $292K                        │
│                                            │
│ AGRC Estimate: $275,000                     │
│ Comps Suggest: $285,000 (+3.6%)           │
└────────────────────────────────────────────┘
```

### Comps Confidence Indicator

- Green: 5+ comps, recent sales
- Yellow: 3-4 comps, some older
- Red: <3 comps, insufficient data

---

## Research Notes

### Utah County Assessor Website Structure

**URL Pattern:**
```
https://www.utahcounty.gov/Assessor/Property.asp?av_serial={parcel_no_colons}
```

**Sales History Section:**
- Located on property detail page
- Table with: Sale Date, Sale Price, Grantor, Grantee
- Usually shows last 3-5 sales

**Scraping Approach:**
1. Fetch property page
2. Parse sales history table
3. Extract sale price and date
4. Store in database

### Tooele County

- Uses Mediciland (paid service)
- Public sales data limited
- May need FOIA request

### Salt Lake County

- Has online assessor search
- Sales data appears available
- Similar scraping approach likely

---

## Open Questions

1. **How many counties have online sales data?**
   - Need to audit all 29 Utah counties
   - Create county-by-county matrix

2. **What is the typical lag for sales recording?**
   - County recording offices vary
   - 30-90 days typical

3. **Do we need to account for property condition?**
   - Assessor data doesn't include condition
   - Sale price reflects condition
   - May under/over-estimate value

4. **Should we integrate listing data (active for sale)?**
   - Active listings show current asking prices
   - Different from sold comps
   - May be available via different sources

---

## Next Steps

1. [ ] Build Utah County assessor sales scraper
2. [ ] Test with 10 sample properties
3. [ ] Calculate comp statistics
4. [ ] Compare to AGRC estimates
5. [ ] Design UI for comps display
6. [ ] Salt Lake County scraper (if Utah works)
7. [ ] Document county-by-county data availability

---

## Related Research

- See `research.md` for county-specific data source research
- See `code-notes.md` for AGRC LIR integration patterns

---

**Note:** This document is experimental. Do not implement comps features until post-launch unless explicitly approved.
