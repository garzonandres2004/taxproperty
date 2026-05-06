# Playbook Template

## County: [County Name] - [Data Source]

## Status

- **Level**: [A/B/C]
- **Status**: [Draft/Playbook/Automated]
- **Priority**: [High/Medium/Low]

## URLs

- **Base URL**: https://...
- **Parcel Search**: https://.../search?parcel={parcel}
- **Address Search**: https://.../search?address={address}

## Authentication

- [ ] Public (no login)
- [ ] Login required
- [ ] CAPTCHA present

## Parcel Number Format

- **Input**: [XX:XXX:XXXX / XX-XXX-XXXX / etc.]
- **URL Format**: [numeric / dashed / etc.]
- **Example**: 01-113-0049 → 011130049

## Steps to Extract Data

### Step 1: Navigate to Search Page

```
URL: {base_url}/search
Wait for: #search-panel
```

### Step 2: Select Search Type

```
Click: "Parcel Number" radio button
Or: Select from dropdown
```

### Step 3: Enter Parcel Number

```
Input: {parcel_number}
Expected format: [numeric / dashed]
```

### Step 4: Submit Search

```
Click: "Search" button
Wait for: #results-panel OR .results-table
```

### Step 5: Extract Data

| Field | CSS Selector | Notes |
|-------|-------------|-------|
| Market Value | `.market-value` | May have commas |
| Year Built | `#year-built` | Integer |
| Building SqFt | `.living-area` | Integer |
| Lot Size | `.lot-size` | May be in acres |

### Step 6: Handle Errors

- **No results**: Check .no-results-message
- **Multiple results**: Select first result with .result-row
- **Timeout**: Retry after 2s

## Sample HTML Structure

```html
<div class="property-details">
  <span class="market-value">$450,000</span>
  <span id="year-built">1998</span>
</div>
```

## Automation Strategy

- **Tool**: Playwright / Puppeteer
- **Wait Strategy**: Wait for selector: `#results-panel`
- **Retry**: 3 times with 2s delay
- **Error**: If .no-results visible, record API_NO_MATCH

## Known Issues

- [ ] Issue 1: Description
- [ ] Issue 2: Description

## Test Parcels

| Parcel | Expected Market Value | Expected Year Built |
|--------|----------------------|---------------------|
| 01-113-0049 | $450,000 | 1998 |
| 02-173-0010 | $320,000 | 1985 |

## Implementation Checklist

- [ ] Document steps (this playbook)
- [ ] Test with 5 sample parcels
- [ ] Implement scraper function
- [ ] Add to CountyAdapter
- [ ] Test batch execution
- [ ] Update DataGap registration
- [ ] Mark as Automated

## Code Template

```typescript
export async function scrape[County][Source](
  parcelNumber: string
): Promise<ScrapeResult | null> {
  const url = `${BASE_URL}/search?parcel=${parcelNumber}`
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TaxProperty-Utah/1.0' }
  })
  
  if (!response.ok) return null
  
  const html = await response.text()
  
  // Parse with regex or cheerio
  const marketValue = html.match(/class="market-value">\$([\d,]+)/)?.[1]
  
  return {
    marketValue: marketValue ? parseInt(marketValue.replace(/,/g, '')) : null,
    // ... other fields
  }
}
```
