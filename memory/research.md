# City Zoning Integration Research
**Date:** 2026-04-28
**Workstream:** D - City Zoning Integration

## Executive Summary

Utah County maintains ArcGIS REST services that contain zoning data for ALL 16 cities in the county. This is a game-changer - we can get real zoning codes for the 102 city properties instead of just planning department guidance.

## Current Property Distribution (127 total)

| Jurisdiction | Count | Layer ID | Has Real Zoning |
|--------------|-------|----------|-----------------|
| Provo | 27 | 29 | Yes |
| Orem | 18 | 28 | Yes |
| Lehi | 17 | 25 | Yes |
| Pleasant Grove | 6 | 30 | Yes |
| Saratoga Springs | 6 | 34 | Yes |
| American Fork | 4 | 16 | Yes |
| Alpine | 4 | 27 | Yes |
| Spanish Fork | 3 | 35 | Yes |
| Springville | 3 | 36 | Yes |
| Highland | 2 | 24 | Yes |
| Lindon | 2 | 26 | Yes |
| Eagle Mountain | 2 | 20 | Yes |
| Goshen | 2 | 23 | Yes |
| Vineyard | 2 | 37 | Yes |
| Mapleton | 1 | 27 | Yes |
| Cedar Fort | 1 | 17 | Yes |
| Salem | 1 | 32 | Yes |
| Santaquin | 1 | 33 | Yes |
| Unincorporated | 25 | 65 | Already have |

## Key Discovery: Utah County ArcGIS REST API

**Base URL:** `https://maps.utahcounty.gov/arcgis/rest/services/Assessor/CommercialAppraiser/MapServer`

**Zoning Layer IDs (Group 14 - "City Zoning"):**
- 15: Alpine Zoning
- 16: American Fork Zoning
- 17: Cedar Fort Zoning
- 18: Cedar Hills Zoning
- 19: Draper Zoning
- 20: Eagle Mountain Zoning
- 21: Elk Ridge Zoning
- 22: Genola Zoning
- 23: Goshen Zoning
- 24: Highland Zoning
- 25: Lehi Zoning
- 26: Lindon Zoning
- 27: Mapleton Zoning
- 28: Orem Zoning
- 29: Provo Zoning
- 30: Pleasant Grove Zoning
- 31: Payson Zoning
- 32: Salem Zoning
- 33: Santaquin Zoning
- 34: Saratoga Springs Zoning
- 35: Spanish Fork Zoning
- 36: Springville Zoning
- 37: Vineyard Zoning
- 38: Woodland Hills Zoning
- 65: County Zoning (Unincorporated)

## Implementation Strategy

### Step 1: Query AGRC LIR for Parcel Geometry
1. Use existing AGRC LIR endpoint to get parcel coordinates
2. Extract centroid from polygon geometry

### Step 2: Query City Zoning via Identify
1. Use ArcGIS `identify` endpoint with coordinates
2. Specify the appropriate city zoning layer ID
3. Extract zone code and description from attributes

### Step 3: Map to Internal Zone Codes
- Each city uses different zone naming conventions
- Create mapping tables per city to normalize to standard format (e.g., "R-1", "C-2")

## City Planning URLs (for fallback)

```typescript
const CITY_PLANNING_URLS: Record<string, string> = {
  'PROVO': 'https://www.provo.org/departments/community-development/planning',
  'OREM': 'https://orem.gov/planning/',
  'LEHI': 'https://www.lehi-ut.gov/planning-zoning/',
  'SPANISH FORK': 'https://www.spanishfork.org/planning',
  'PLEASANT GROVE': 'https://pgcityutah.gov/departments/community_development/',
  'SPRINGVILLE': 'https://www.springville.org/community-development/',
  'AMERICAN FORK': 'https://www.americanfork.gov/841/Mapping-GIS',
  'HIGHLAND': 'https://www.highlandcity.org/planning',
  'ALPINE': 'https://www.alpineut.gov/168/Planning-Zoning',
  'CEDAR HILLS': 'https://www.cedarhills.org/page/maps',
  'LINDON': 'https://www.lindon.gov/239/Planning-Zoning',
  'MAPLETON': 'https://www.mapleton.org/departments/community_development/resources/maps.php',
  'PAYSON': 'https://www.paysonutah.gov/331/Planning-and-Zoning',
  'SARATOGA SPRINGS': 'https://www.saratogasprings-ut.gov/182/planning-zoning',
  'EAGLE MOUNTAIN': 'https://eaglemountain.gov/government/zoning-in-eagle-mountain/',
  'VINEYARD': 'https://www.vineyardutah.gov/government/planning.php'
}
```

## Sample Zone Codes by City

### Provo
- ZONE_PR_DESC: "Residential - Single Family", ZONE_PR_LABEL: "R1"
- ZONE_PR_DESC: "Commercial - General", ZONE_PR_LABEL: "CG"
- ZONE_PR_DESC: "Manufacturing - Light", ZONE_PR_LABEL: "M1"

### Orem
- ZONE_OR_DESC: "Residential", ZONE_OR_LABEL: "R"
- ZONE_OR_DESC: "Commercial - Local", ZONE_OR_LABEL: "CL"

### Lehi
- Uses: ZONE_LE_DESC, ZONE_LE_LABEL

## API Query Pattern

```
// Step 1: Get coordinates from AGRC
https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Utah_LIR/FeatureServer/0/query?
  where=PARCEL_ID='{parcelId}'&
  outFields=PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PARCEL_ACRES&
  returnGeometry=true&
  outSR=4326&
  f=json

// Step 2: Query zoning via identify
https://maps.utahcounty.gov/arcgis/rest/services/Assessor/CommercialAppraiser/MapServer/identify?
  geometry={x:lon,y:lat}&
  geometryType=esriGeometryPoint&
  sr=4326&
  layers=show:{layerId}&
  tolerance=10&
  mapExtent={extent}&
  imageDisplay=800,600,96&
  f=json
```

## Blockers/Issues
- None - API is publicly accessible
- Rate limiting unknown - implement with delays
- Some zones may need manual mapping to standardized codes

## Next Steps
1. Create `src/lib/zoning/cities/` directory
2. Create fetcher for each city
3. Update auto-fill pipeline to use city fetchers
4. Test with sample parcels from each city
