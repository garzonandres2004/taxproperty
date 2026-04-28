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

## Utah County (Reference Implementation)

- State: Utah
- Parcel API: services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_Utah_LIR/FeatureServer/0/query
- Zoning API: maps.utahcounty.gov/arcgis/rest/services/CommunityDev-Fire/CountyZoning_wgs84/MapServer/identify
- Land Records: utahcounty.gov/LandRecords/Property.asp?av_serial={parcel_id}
- Auction Format: bid_up (premium bid)
- Parcel ID Format: NN:NNN:NNNN
- Parcel ID for API: numeric only (remove colons)
- Auction Date: May 21, 2026

## Salt Lake County (Next - Research Needed)

- State: Utah
- Parcel API: likely services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query
- Zoning API: TBD - check maps.slco.org or gis.slco.org
- Land Records: TBD - check slco.org/assessor
- Auction Format: bid_up (confirm)
- Parcel ID Format: TBD
- Status: Research needed
