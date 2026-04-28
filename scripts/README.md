# Utah County Property Scraper v1

**Team:** User (PM/Communication) | Perplexity (Architect) | Claude Code (Engineer)

## Overview

Automation script to extract property data from Utah County Land Records and output scored CSV for Google Sheets analysis.

## What We Learned

### API Approach (Failed)
- **Utah County ArcGIS REST API** requires authentication
- Open Data portal requires API keys
- **Result:** Pivot to web scraping

### Web Scraping Approach (Working)
- Utah County Land Records pages are publicly accessible
- URL format: `https://www.utahcounty.gov/LandRecords/property.asp?av_serial={SERIAL}`
- **Important:** Serial numbers must be formatted **without colons**
  - ❌ `55:555:0022` 
  - ✅ `555550022`

## Usage

### 1. Create Input File

```bash
python3 utah_county_scraper.py sample
```n
This creates `input_serials.csv`:

```csv
serial,balance_due,owner_name_raw
555550022,5125.01,JACKSON MARCUS
551090006,8985.08,GAISFORD KAREN
010080006,9539.04,BASES LOADED INVESTING LLC
...
```

### 2. Run Scraper

```bash
python3 utah_county_scraper.py scrape input_serials.csv
```

Outputs `output_parcels.csv` with columns:
- `serial` - Parcel ID
- `situs_address` - Property address
- `mailing_address` - Owner mailing address
- `owner_name` - Current owner
- `owner_type_tag` - Categorized as: INDIVIDUAL, LLC, HOA, CITY, TRUST
- `acres` - Lot size
- `market_value` - Total assessed value
- `land_value` / `building_value` - Component values
- `balance_due` - From input (payoff amount)
- `payoff_to_value_ratio` - balance / market_value
- `is_micro_parcel` - Auto-flagged if < 0.02 acres AND < $30k value
- `is_likely_condo` - Auto-detected from description
- `data_source` - "Utah County Land Records" or "NOT_FOUND"

## Auto-Classification Rules

### Owner Type Detection
- **CITY:** Contains "CITY OF", "COUNTY OF", "STATE"
- **HOA:** Contains "HOMEOWNERS", "HOA", "ASSOCIATION"
- **LLC:** Contains " LLC", " INC", " CORP"
- **TRUST:** Contains "TRUST"
- **INDIVIDUAL:** Default

### Micro-Parcel Detection
```
if acres < 0.02 AND market_value < $30,000:
    is_micro_parcel = True  # AUTO-SKIP
```

### Condo Detection
Looks for keywords in legal description:
- "UNIT", "CONDO", "CONDOMINIUM", "BUILDING", "PHASE", "TOWNHOME"

## Google Sheets Integration

### Raw Data Tab
Import `output_parcels.csv` here

### Scoring Tab Formula Example

```
=IF(is_micro_parcel, "SKIP", 
   IF(payoff_to_value_ratio > 0.05, "MAYBE",
      IF(owner_type_tag="INDIVIDUAL", "BID", "CHECK")))
```

## Installation

```bash
pip3 install requests beautifulsoup4
```

## Limitations (v1)

1. **No tax history** - Only pulls current owner/address, not year-by-year delinquencies
2. **No acres/market_value** - Website uses different data structure, needs deeper parsing
3. **Rate limited** - 1.5 second delay between requests (be nice to the server)
4. **Serial format** - Must convert from `55:555:0022` to `555550022`

## v2 Enhancements (Future)

- [ ] Parse Tax Detail pages for year-by-year delinquencies
- [ ] Extract acres and market value from property pages
- [ ] Batch processing with resume capability
- [ ] Google Sheets API direct upload
- [ ] Property photos/parcel map links

## Test Results

From 5 sample properties:
- ✅ Successfully fetched 55:555:0022 (Eagle Mountain condo)
- ✅ Detected owner type (INDIVIDUAL vs LLC)
- ✅ Extracted addresses
- ❌ Not all properties have public pages

## Next Steps for Team

**Perplexity:** Review classification rules - should we auto-skip condos owned by HOAs?

**User:** 
1. Export more serials from your CSV (format: remove colons)
2. Test with 10-20 properties
3. Import to Google Sheets and validate scoring

**Claude Code:** 
- Fix acres/market_value extraction from property pages
- Add retry logic for failed requests
- Create batch processing mode

---

Built for Utah County Tax Sale 2026 analysis.
