# County Expansion Guide

## How to Add a New County

### Step 1: Research
- Find the county's AGRC or GIS parcel API
- Find the county's zoning GIS service
- Download a sample CSV from the county's tax sale list
- Document the parcel ID format

### Step 2: County Config
Add to the county_config table:
- county_name, state
- parcel_api_url
- zoning_api_url
- land_records_url_template (with {parcel_id} placeholder)
- auction_date
- auction_format: 'bid_up' | 'lien'
- parcel_id_format (regex string)
- csv_column_mapping (JSON)

### Step 3: CSV Column Mapping
Map the county's CSV columns to the standard Property fields.

### Step 4: Test
Import 5-10 properties, run auto-fill, verify scores look correct.

---

## Active Counties

### Utah County (Reference Implementation) ✅

- State: Utah
- Parcel API: services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Utah_LIR/FeatureServer/0/query
- Zoning API: maps.utahcounty.gov/arcgis/rest/services/CommunityDev-Fire/CountyZoning_wgs84/MapServer/identify
- Land Records: utahcounty.gov/LandRecords/Property.asp?av_serial={parcel_id}
- Auction Format: bid_up (premium bid)
- Parcel ID Format: NN:NNN:NNNN
- Parcel ID for API: numeric only (remove colons)
- Auction Date: May 21, 2026
- Status: **LIVE - 127 properties imported**

---

## Phase 2: Next Counties (In Progress)

### Tooele County 🔄 RESEARCH IN PROGRESS

**Priority: HIGH** (User has access to data)

**Sources Found:**
- Tax Sale: https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php
- Property List: Google Spreadsheet (shared)
- Recorder: https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php
- Property Search: https://search.tooeleco.gov.mediciland.com/ (requires Google auth)

**Parcel Format:**
- 13 digits numeric (e.g., 1305000014)
- Format: `##############` (14 chars with leading zeros)
- Alternative seen: 0305700014, 11-070-0-0014 (hyphenated)

**To Research:**
- [ ] Auction platform (in-person vs online)
- [ ] Deposit amount
- [ ] Redemption rules (until when?)
- [ ] Sale date (likely May 2026)
- [ ] CSV download format
- [ ] GIS/parcel API availability
- [ ] Zoning lookup source

**Data Access Notes:**
- Mediciland requires Google authentication
- PDF exports available from document search
- May need manual CSV download from county

---

### Rich County 📋 PENDING RESEARCH

**Priority: MEDIUM**

**Status:** Rural county, minimal online presence

**To Research:**
- [ ] Main county website: richcountyut.org
- [ ] Contact Clerk/Auditor directly
- [ ] Tax sale procedures (likely in-person)
- [ ] Property records system
- [ ] GIS availability
- [ ] CSV/data export capability

**Expected Characteristics:**
- Lower volume (rural)
- Likely May sale
- May require direct county contact for data

---

### Sanpete County 📋 PENDING RESEARCH

**Priority: MEDIUM**

**Status:** Rural central Utah county

**To Research:**
- [ ] Main website: sanpete.com
- [ ] Auditor contact info
- [ ] Tax sale dates/procedures
- [ ] Property records access
- [ ] GIS/parcel data availability
- [ ] Data export format

**Expected Characteristics:**
- Rural agricultural properties
- Smaller sale volume
- May need manual data collection

---

## Phase 3: Future Expansion

### Salt Lake County (Research Needed)

- State: Utah
- Parcel API: likely services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query
- Zoning API: TBD - check maps.slco.org or gis.slco.org
- Land Records: TBD - check slco.org/assessor
- Auction Format: bid_up (confirm)
- Parcel ID Format: TBD
- Status: Research needed

---

## Implementation Checklist per County

### Tooele Implementation Steps

1. **Update Config** (15 min)
   - [ ] Verify deposit amount
   - [ ] Confirm redemption rules
   - [ ] Update preSaleInstability rating
   - [ ] Add auction platform details

2. **CSV Import Adapter** (30 min)
   - [ ] Download sample CSV from county
   - [ ] Map columns to Property fields
   - [ ] Test import with 5 properties
   - [ ] Verify parcel number format

3. **Land Records Integration** (30 min)
   - [ ] Test Mediciland search URL pattern
   - [ ] Verify document access
   - [ ] Add title research links

4. **GIS/Zoning** (1 hour)
   - [ ] Find AGRC LIR coverage
   - [ ] Test parcel lookup
   - [ ] Find zoning source (if any)

5. **Test & Validate** (30 min)
   - [ ] Import 10 test properties
   - [ ] Run scoring
   - [ ] Verify capital fit works
   - [ ] Check title research links

**Estimated Total: 2.5 hours per county**

---

## Data Source Patterns by County

| County | Tax Sale List | Parcel API | Recorder | Zoning |
|----------|--------------|------------|----------|--------|
| Utah | Auditor website CSV | AGRC LIR | LandRecords portal | County GIS |
| Tooele | Google Spreadsheet + PDF | TBD | Mediciland (auth) | TBD |
| Rich | TBD | TBD | TBD | TBD |
| Sanpete | TBD | TBD | TBD | TBD |

---

## Key Contacts

**Tooele County:**
- Auditor: tooeleco.gov/departments/administration/auditor/
- Recorder: tooeleco.gov/departments/administration/recorder_surveyor/

**Rich County:**
- Clerk/Auditor: richcountyut.org (contact for sale info)

**Sanpete County:**
- Auditor: sanpete.com (contact for sale info)

---

## Notes

- Each county has different redemption rules (critical for scoring)
- Rural counties may not have online GIS
- Some counties use third-party platforms (Mediciland, etc.)
- Always verify current year's procedures - they change
- Smaller counties may require phone/email for data access
