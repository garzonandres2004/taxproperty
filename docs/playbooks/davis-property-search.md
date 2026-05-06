# Playbook: Davis County - Property Search

## Status

- **Level**: B
- **Status**: Playbook
- **Priority**: High
- **Blocker**: 19/22 properties missing market value from AGRC

## URLs

- **Base URL**: https://www.daviscountyutah.gov/property-search
- **Direct Search**: https://www.daviscountyutah.gov/property-search?parcel={parcel}

## Authentication

- [x] Public (no login)
- [ ] Login required
- [ ] CAPTCHA present

## Parcel Number Format

- **Input Format**: `XX-XXX-XXXX` (with dashes)
- **URL Format**: Same as input
- **Example**: `01-113-0049` stays `01-113-0049`

## Steps to Extract Data

### Step 1: Navigate to Property Search

```
URL: https://www.daviscountyutah.gov/property-search
Wait for: #parcel-search OR .property-search-form
```

### Step 2: Select Search Type

```
Click: "Parcel Number" from dropdown
Options: [Parcel Number | Property Address | Owner Name]
```

### Step 3: Enter Parcel Number

```
Input: {parcel_number} (with dashes)
Example: 01-113-0049
```

### Step 4: Submit Search

```
Click: "Search" button
Wait for: .property-details OR #valuation-tab
```

### Step 5: Extract Data from Valuation Tab

| Field | Location | CSS Selector | Notes |
|-------|----------|--------------|-------|
| Market Value | Valuation Tab | `.market-value` OR `#market-value` | May need to click tab |
| Assessed Value | Valuation Tab | `.assessed-value` | |
| Year Built | Property Details | `#year-built` OR `.year-built` | |
| Living Area | Property Details | `.living-area` | In sqft |
| Lot Size | Property Details | `.lot-size` | In acres |

### Step 6: Extract Data from Property Details Tab

```
Click: "Property Details" tab
Wait for: .property-details-content

Extract:
- Property Type: .property-type
- Bedrooms: .bedrooms
- Bathrooms: .bathrooms
```

### Step 7: Get Coordinates from Map

```
Click: "View Map" button
Wait for: #map-container

Coordinates visible in URL or data attribute:
- data-latitude
- data-longitude
```

## Sample HTML Structure

```html
<div class="property-card">
  <div class="valuation-section">
    <span class="market-value">$450,000</span>
    <span class="assessed-value">$405,000</span>
  </div>
  <div class="property-details">
    <span id="year-built">2005</span>
    <span class="living-area">2,450 sq ft</span>
    <span class="lot-size">0.25 acres</span>
  </div>
</div>
```

## Error Handling

### No Results Found

```
Selector: .no-results OR .alert.alert-warning
Message: "No property found with parcel number..."
Action: Record DataGap: API_NO_MATCH
```

### Multiple Results

```
Usually doesn't happen with parcel search
If occurs: Select first result
```

## Known Issues

1. **Tab Navigation Required**: Data split across Valuation and Property Details tabs
2. **Map Coordinates**: May require clicking map button
3. **Missing Properties**: Some tax-delinquent properties may not show current values

## Test Parcels (Davis County 2026)

| Parcel | Expected Result |
|--------|-----------------|
| 01-113-0049 | Should have market value (AGRC was null) |
| 12-660-0312 | Has market value in AGRC - verify match |
| 05-022-0037 | Check if property details available |

## Automation Strategy

**Challenges**:
- Requires tab navigation (multiple clicks)
- May need to wait for tab content to load
- Coordinates in separate map view

**Approach**:
```typescript
// Pseudocode
1. Navigate to search page
2. Select "Parcel Number" from dropdown
3. Enter parcel (with dashes)
4. Click Search
5. Wait for results panel
6. Click "Valuation" tab
7. Extract market_value, assessed_value
8. Click "Property Details" tab
9. Extract year_built, building_sqft, lot_size
10. Click "Map" tab (optional)
11. Extract lat/lng
```

**Rate Limiting**: Add 1s delay between requests

## Implementation Priority

- [ ] Test manual extraction with 5 parcels
- [ ] Document exact selectors
- [ ] Implement Playwright scraper
- [ ] Add to DavisAdapter.enrichProperty fallback
- [ ] Test batch execution

## Why AGRC Fails for Davis Tax-Delinquent

AGRC LIR (Land Information Records) contains annual assessment data. Properties in prolonged tax delinquency may have outdated or missing assessment records, resulting in null values for:
- TOTAL_MKT_VALUE
- BLDG_SQFT
- BUILT_YR

The County Property Search portal has current data even for tax-delinquent properties.
