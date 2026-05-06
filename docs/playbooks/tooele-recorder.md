# Playbook: Tooele County - Recorder Portal

## County: Tooele County - CivicCenter Recorder

## Status

- **Level**: B
- **Status**: Playbook
- **Priority**: Medium (29 properties, 82% already enriched)

## URLs

- **Base URL**: https://tooele.hosted.civicentertechnologies.com/recorder/
- **Vendor**: CivicCenter Technologies
- **Mediciland Backup**: https://search.tooeleco.gov.mediciland.com/

## Authentication

- [x] Public (no login)
- [ ] Login required
- [ ] CAPTCHA present

## Parcel Number Format

- **Input Format**: XXXXXXXX or XX-XXX-X-XXXX
- **Internal Format**: Dashed format preferred
- **Example**: 1305000014 → 13-050-0-0014

## Steps to Extract Data

### Step 1: Navigate to Recorder Portal

```
URL: https://tooele.hosted.civicentertechnologies.com/recorder/
Wait for: #searchForm OR .civic-search-container
```

### Step 2: Select Search Type

```
Click: "Parcel Number" from search dropdown
Options: [Parcel Number | Owner Name | Document Date | Document Type]
```

### Step 3: Enter Parcel Number

```
Input: {parcel_number}
Format: XX-XXX-X-XXXX (dashed)
Example: 13-050-0-0014

Note: Try both dashed and numeric formats if first fails
```

### Step 4: Submit Search

```
Click: "Search Documents" button
Wait for: #resultsTable OR .document-results
```

### Step 5: Extract Document History

| Field | Location | CSS Selector | Notes |
|-------|----------|--------------|-------|
| Document Type | Results | `.doc-type` | DEED, MORTGAGE, LIEN |
| Recording Date | Results | `.record-date` | When filed |
| Document Date | Results | `.doc-date` | When created |
| Grantor | Results | `.grantor` | From party |
| Grantee | Results | `.grantee` | To party |
| Book/Page | Results | `.book-page` | Reference |

### Step 6: Filter Recent Documents

```
Click: "Filter by Date"
Set range: Last 5 years
Sort: Newest first

Extract:
- Most recent deed (ownership)
- Mortgage documents (last 5 years)
- Lien documents (tax, mechanic)
- Release documents (clearances)
```

### Step 7: View Document Images

```
Click: "View Image" link for key documents
Wait for: PDF viewer OR image viewer

Note: Document images may require separate click
Some older documents may be scanned images
```

## Sample HTML Structure

```html
<div class="document-results">
  <table class="results-table">
    <tr class="document-row">
      <td class="doc-type">WARRANTY DEED</td>
      <td class="record-date">2022-08-15</td>
      <td class="grantor">JONES FAMILY</td>
      <td class="grantee">SMITH JOHN</td>
      <td class="book-page">1234/567</td>
    </tr>
  </table>
</div>
```

## Error Handling

### No Documents Found

```
Selector: .no-documents-message
Action:
1. Try alternative parcel format (dashed vs numeric)
2. Try Mediciland backup URL
3. If still no results: Record API_NO_MATCH
```

### Session Expired

```
Selector: .session-timeout OR redirect to login
Action: Refresh page and retry
```

## Known Issues

1. **CivicCenter Interface**: Different from other counties
2. **Mediciland Integration**: Some data may be in Mediciland instead
3. **Rural Properties**: Fewer digital records for older properties
4. **Multi-Format Parcels**: System accepts various formats, results may vary

## Mediciland Backup

If CivicCenter fails, try Mediciland:

```
URL: https://search.tooeleco.gov.mediciland.com/
Search: {parcel_number}

Note: Mediciland requires Google Auth for some features
Basic search may work without login
```

## Tooele-Specific Considerations

### Military/Industrial Areas

```
Areas near Dugway Proving Grounds:
- Check for federal land restrictions
- Some areas may have limited access

Deseret Chemical Depot vicinity:
- Verify land use restrictions
- Check for environmental notices
```

### Mining History

```
Old mining areas (Canyon, Rush):
- Look for mining claim documents
- Check for environmental releases
- Verify mineral rights transfers
```

## Test Parcels (Tooele County 2026)

| Parcel | Location | Expected |
|--------|----------|----------|
| 13-050-0-0014 | Tooele City | Standard residential |
| 17-111-0-0022 | Grantsville | Check for agricultural |
| 05-222-0-0001 | Stansbury | Recent development |

## Automation Strategy

**Approach**:
```typescript
// Pseudocode
1. Navigate to CivicCenter recorder
2. Select "Parcel Number" search
3. Format parcel as XX-XXX-X-XXXX
4. Submit search
5. Wait for results table
6. Extract all document rows
7. Parse document types and dates
8. Calculate signals:
   - last_transfer_date: newest DEED
   - years_same_owner: years since last transfer
   - mortgage_status: active mortgages (no release)
   - lien_count: liens without releases

// If CivicCenter fails, try Mediciland backup
if (noResults) {
  navigateToMediciland();
  searchWithParcel();
  extractData();
}
```

**Rate Limiting**: 1s between requests

## DataGap Registration

```typescript
{
  reason: 'RECORDER_NEEDS_PLAYBOOK',
  level: 'B',
  source_hint: 'Tooele County Recorder at tooele.hosted.civicentertechnologies.com'
}
```

## Contact Information

- **Tooele County Recorder**: 47 S Main St, Tooele, UT 84074
- **Phone**: (435) 843-3144
- **Hours**: Monday-Friday 8:00 AM - 5:00 PM
- **Mediciland**: Requires Google Auth for full access

