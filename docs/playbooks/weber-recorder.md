# Playbook: Weber County - Recorder Portal

## County: Weber County - Recorder (Kofile)

## Status

- **Level**: B
- **Status**: Playbook
- **Priority**: High (69 properties need title signals)

## URLs

- **Base URL**: https://recdocrs.webercounty.org/webexternalaccess/
- **Vendor**: Kofile Technologies
- **Direct Search**: Uses internal search form (no URL parameter)

## Authentication

- [x] Public (no login)
- [ ] Login required
- [ ] CAPTCHA present

## Parcel Number Format

- **Input Format**: XX-XXX-XXXX (with dashes)
- **Internal Format**: Same
- **Example**: 12-345-6789 stays 12-345-6789

## Steps to Extract Data

### Step 1: Navigate to Recorder Portal

```
URL: https://recdocrs.webercounty.org/webexternalaccess/
Wait for: #searchPanel OR .search-container
```

### Step 2: Select Search Type

```
Click: "Search by Parcel Number" radio button
Options: [Parcel Number | Document Number | Grantor | Grantee]
```

### Step 3: Enter Parcel Number

```
Input: {parcel_number} (with dashes)
Example: 12-345-6789
```

### Step 4: Submit Search

```
Click: "Search" button
Wait for: #resultsGrid OR .document-results
```

### Step 5: Extract Document List

| Field | Location | CSS Selector | Notes |
|-------|----------|--------------|-------|
| Document Type | Results Grid | `.document-type` | Deed, Mortgage, Lien, Release |
| Document Date | Results Grid | `.document-date` | Recorded date |
| Grantor | Results Grid | `.grantor` | Seller/Prev owner |
| Grantee | Results Grid | `.grantee` | Buyer/New owner |
| Document Number | Results Grid | `.doc-number` | Reference number |

### Step 6: Analyze Recent Documents (5 years)

```
Filter: Documents from {current_year - 5} to present
Sort: By date descending (most recent first)

Extract:
- Most recent deed (transfer)
- Any mortgage documents
- Any lien documents
- Any release documents
```

### Step 7: Extract Document Details (Optional)

```
Click: Document Number link for most recent deed
Wait for: #documentDetail OR .document-viewer

Extract:
- Legal description
- Consideration amount (sale price)
- Recording date
```

## Sample HTML Structure

```html
<div class="results-grid">
  <div class="document-row">
    <span class="document-type">DEED</span>
    <span class="document-date">2023-05-15</span>
    <span class="grantor">SMITH, JOHN</span>
    <span class="grantee">JOHNSON, MARY</span>
    <span class="doc-number">2023-123456</span>
  </div>
</div>
```

## Error Handling

### No Results Found

```
Selector: .no-results OR .empty-message
Message: "No documents found for the search criteria"
Action: Record DataGap: API_NO_MATCH
```

### Too Many Results

```
If results > 100:
Action: Add date filter to narrow range
Click: "Advanced Search" and add date range
```

## Known Issues

1. **Kofile Portal**: Uses JavaScript-heavy interface, may need Selenium/Playwright
2. **Session Timeout**: Portal times out after 30 minutes of inactivity
3. **Document Images**: PDF images load separately, may need additional click
4. **Multiple Results**: Same parcel may have many documents over time

## Test Parcels (Weber County 2026)

| Parcel | Expected Documents |
|--------|-------------------|
| 14-062-0049 | Should have deed + tax sale history |
| 11-188-0012 | Verify mortgage documents |
| 12-234-0567 | Check for lien documents |

## Automation Strategy

**Challenges**:
- Kofile portal uses dynamic JavaScript
- Search form requires interaction
- Results loaded via AJAX

**Approach**:
```typescript
// Pseudocode
1. Navigate to portal
2. Wait for searchPanel to be visible
3. Click "Parcel Number" radio button
4. Enter parcel number in input field
5. Click Search button
6. Wait for resultsGrid (with timeout/retry)
7. Extract all document rows
8. Parse document types and dates
9. Calculate signals:
   - last_transfer_date = most recent DEED
   - mortgage_docs_found = count of MORTGAGE docs
   - lien_docs_found = count of LIEN/TAX LIEN docs
   - release_docs_found = count of RELEASE docs
```

**Rate Limiting**: Add 2s delay between searches (Kofile is sensitive)

## Title Signals Available

| Signal | Availability | Notes |
|--------|--------------|-------|
| yearsSameOwner | Yes | Calculate from last DEED date |
| mortgageStatus | Yes | Check for unreleased mortgages |
| activeLiens | Yes | Liens without corresponding releases |
| ownershipChain | Partial | Names from recent deeds |

## Implementation Priority

- [ ] Test manual extraction with 5 parcels
- [ ] Document exact selectors for Kofile
- [ ] Implement Playwright scraper
- [ ] Add to WeberAdapter.enrichProperty
- [ ] Test batch execution

## DataGap Registration

If automation fails:
```typescript
{
  reason: 'RECORDER_NEEDS_PLAYBOOK',
  level: 'B',
  source_hint: 'Weber County Recorder at recdocrs.webercounty.org - Kofile portal'
}
```

## Contact Information

- **Weber County Recorder**: 2380 Washington Blvd, Ogden, UT 84401
- **Phone**: (801) 399-8401
- **Hours**: Monday-Friday 8:00 AM - 5:00 PM

