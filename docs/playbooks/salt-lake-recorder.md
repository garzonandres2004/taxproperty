# Playbook: Salt Lake County - Recorder Portal

## County: Salt Lake County - Recorder

## Status

- **Level**: B
- **Status**: Playbook
- **Priority**: Medium

## URLs

- **Base URL**: https://slcrecorder.com/
- **Search URL**: https://slcrecorder.com/search/
- **Vendor**: Custom/Fidlar hybrid

## Authentication

- [x] Public (no login)
- [ ] Login required
- [ ] CAPTCHA present

## Parcel Number Format

- **Input Format**: XX-XX-XXX-XXX (varies)
- **Internal Format**: Multiple formats accepted
- **Example**: 22-33-444-555 or 2233444555

## Steps to Extract Data

### Step 1: Navigate to Search Page

```
URL: https://slcrecorder.com/search/
Wait for: #parcelSearch OR .search-form
```

### Step 2: Select Search Type

```
Click: "Parcel Search" tab
Options: [Parcel | Document | Name | Subdivision]
```

### Step 3: Enter Parcel Number

```
Input: {parcel_number}
Format: Flexible (with or without dashes)
Example: 22-33-444-555
```

### Step 4: Submit Search

```
Click: "Search" button OR press Enter
Wait for: #results-container OR .document-list
```

### Step 5: Extract Document History

| Field | Location | CSS Selector | Notes |
|-------|----------|--------------|-------|
| Document Type | Results | `.doc-type` | Warranty Deed, Quit Claim, Mortgage |
| Recording Date | Results | `.rec-date` | When recorded |
| Consideration | Results | `.consideration` | Sale price if available |
| Grantor | Results | `.grantor-name` | Previous owner |
| Grantee | Results | `.grantee-name` | Current owner |

### Step 6: Filter by Document Type

```
Optional: Click filter dropdown
Select types: [DEED | MORTGAGE | LIEN | RELEASE]

This helps identify:
- Ownership transfers
- Active mortgages
- Outstanding liens
```

### Step 7: Check for Red Flags

```
Search for document types:
- "LIS PENDENS" (lawsuit pending)
- "NOTICE OF DEFAULT"
- "TAX LIEN"
- "MECHANICS LIEN"
- "HOA LIEN" (common in SLC condos)

Note: SLC has many HOA liens in condo/townhome areas
```

## Sample HTML Structure

```html
<div class="document-list">
  <div class="document-item">
    <span class="doc-type">WARRANTY DEED</span>
    <span class="rec-date">05/12/2023</span>
    <span class="grantor-name">BROWN LLC</span>
    <span class="grantee-name">SMITH FAMILY TRUST</span>
    <span class="consideration">$450,000</span>
  </div>
</div>
```

## Error Handling

### No Results

```
Selector: .no-results-message
Action: Try alternative parcel format (remove dashes)
If still no results: Record API_NO_MATCH
```

### Multiple Parcels

```
If search returns multiple:
- Check addresses to identify correct one
- SLC parcels can have similar numbers in different areas
```

## Known Issues

1. **Format Variations**: SLC uses multiple parcel numbering systems
2. **HOA Liens**: Very common in condo/townhome areas - check carefully
3. **Commercial Properties**: May have complex title history
4. **Trust Ownership**: Many properties held in trusts/family LLCs

## SLC-Specific Considerations

### High-Risk Areas

```
Areas with frequent title issues:
- Downtown SLC (high commercial turnover)
- Condo developments (HOA liens)
- Areas near UTA lines (eminent domain history)
```

### Document Types to Flag

```
RED FLAGS:
- LIS PENDENS (active lawsuit)
- NOTICE OF DEFAULT (foreclosure start)
- IRS LIEN (federal tax)

YELLOW FLAGS:
- QUIT CLAIM DEED (less warranty)
- MULTIPLE TRANSFERS (recent flipping)
- HOA LIEN (condo/townhome)
```

## Test Parcels

| Parcel | Area | Expected |
|--------|------|----------|
| 22-33-444-555 | SLC City | Deed + possible HOA |
| 15-28-333-222 | Murray | Standard residential |
| 08-11-222-333 | Sandy | Check for trust ownership |

## Automation Strategy

**Approach**:
```typescript
// Pseudocode
1. Navigate to slcrecorder.com/search/
2. Wait for search form
3. Click "Parcel Search" tab
4. Enter parcel number (try with dashes first)
5. Submit search
6. Wait for results (AJAX loaded)
7. Extract document list
8. Analyze document types:
   - Last DEED = ownership transfer
   - MORTGAGE docs = financing activity
   - LIEN docs = encumbrances
   - RELEASE docs = cleared items
9. Calculate risk signals
```

**SLC-Specific Logic**:
```typescript
// Check for HOA liens in condo/townhome areas
if (address.includes('condo') || address.includes('townhome')) {
  prioritizeSearchFor('HOA LIEN');
}

// Check for trust/LLC ownership
if (grantee.includes('TRUST') || grantee.includes('LLC')) {
  flagForAdditionalResearch();
}
```

## DataGap Registration

```typescript
{
  reason: 'RECORDER_NEEDS_PLAYBOOK',
  level: 'B',
  source_hint: 'Salt Lake County Recorder at slcrecorder.com'
}
```

## Contact Information

- **Salt Lake County Recorder**: 2001 S State St #N1600, SLC, UT 84190
- **Phone**: (385) 468-8141
- **Website**: https://slcrecorder.com/

