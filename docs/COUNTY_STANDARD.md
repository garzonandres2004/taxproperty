# COUNTY_STANDARD.md

## Purpose
This document defines the standard that every county integration should aim to meet.

The key principle: **Different counties can have different sources, but they must flow into a common product standard.**

---

## Standard Outcome

A county integration is successful when a user can open a property and get a credible, useful, investor-grade view of the opportunity.

The app should provide, as much as possible:
1. Tax sale context
2. Parcel identity
3. Location context
4. Ownership / mailing context
5. Market / assessor context
6. Title / recorder access
7. Tax history access
8. Zoning / planning guidance
9. Score and recommendation
10. Report output

If the county cannot fully automate some layer, the system must still provide an honest fallback.

---

## Core Standard Layers

### 1. Auction Layer
Minimum requirements:
- county name, state, source URL, auction date if available
- amount due / opening bid if available, sale type if known, parcel ID

### 2. Identity Layer
Minimum requirements:
- normalized parcel number
- alternate parcel number if needed
- legal description if available
- property or situs address if available

### 3. Location Layer
Minimum requirements:
- county and state
- mappable address or coordinates
- parcel map link or maps fallback

### 4. Assessor / Market Layer
Preferred fields:
- acreage, lot size, assessed value, market value
- building sqft, year built, property type, owner name, mailing address

### 5. Recorder / Title Layer
Minimum requirements:
- recorder link or official title search path
- clear title-chain lookup path if direct automation is unavailable

### 6. Tax History Layer
Minimum requirements:
- tax history URL or official tax page
- if possible, tax history signals or extracted summary

### 7. Zoning / Planning Layer
Minimum requirements:
- jurisdiction identification
- zoning result or planning fallback
- if zoning is uncertain, clear manual verification guidance

The system must never pretend zoning is confirmed when it is not.

### 8. Scoring Layer
Minimum requirements:
- score output, recommendation output, warning flags, explanation-ready fields

### 9. Report Layer
Minimum requirements:
- property summary, opportunity/risk notes, zoning status, due diligence cues, next steps

---

## County Completion Levels

### Level 0 — NOT_STARTED
Nothing researched or integrated.

### Level 1 — LIST_IMPORTED
Auction list imported. Little enrichment exists.

### Level 2 — BASIC_USABLE
User can see the property list and open records with basic parcel/location understanding.
- imported rows, parcel identity, at least basic address or map path, county tagging

### Level 3 — ADVANCED_USABLE
Property view is meaningfully useful for research.
- strong parcel normalization, maps or coordinates, assessor path, recorder path, basic scoring

### Level 4 — INVESTOR_READY
A serious user can evaluate the property inside the app with only limited outside checking.
- property detail is strong, external links work, zoning guidance exists, tax history path exists
- scoring is trustworthy, reports work

### Level 5 — REFERENCE_QUALITY
This county can serve as the internal benchmark for others.
- stable import, strong enrichment, clear jurisdiction handling, trustworthy UI, polished reporting, minimal silent gaps

Utah County is the current target benchmark.

---

## Required Data Behavior

### Honest Missingness
If a field is unavailable:
- do not fake it
- do not silently leave an ambiguous blank if it matters
- show a fallback or manual verification note

### Traceability
Important fields should be traceable to: source type, source URL, enrichment date or import date

### Reusability
County integrations must plug into the standard schema and architecture.

### Safety
A county should not require page-level hacks to function if an adapter or shared service is the right place.

---

## Standard Property Schema Direction

All counties should normalize into this intermediate schema before entering full enrichment:

```ts
type StandardPropertyRow = {
  state: string
  county: string
  parcelNumber: string
  propertyAddress?: string
  city?: string
  zip?: string
  ownerName?: string
  mailingAddress?: string
  legalDescription?: string
  amountDue?: number
  openingBid?: number
  auctionDate?: string
  saleType?: 'tax_deed' | 'tax_lien' | 'hybrid'
  acreage?: number
  propertyType?: string
  sourceUrl?: string
  sourceFormat?: 'csv' | 'xlsx' | 'google_sheet' | 'pdf' | 'html' | 'api'
}
```

---

## Adapter Standard

Each county should have a county adapter or equivalent module.

Minimum responsibilities:
- identify county metadata
- normalize raw source rows
- define source type
- build official external links
- optionally provide county-specific enrichment hooks
- expose county-specific notes and constraints

Adapters reduce page complexity, not increase it.

---

## UI Standard

### Property list expectations
- county visible, key money field visible, parcel visible, score visible, obvious red flags visible

### Property detail expectations
- parcel identity clear, map/photo section clear, links section clear
- zoning section clear, risk/opportunity cues clear, report action available when enough data exists

### Warning behavior
Warnings should be explicit for:
- missing address
- title/recorder still manual
- zoning not fully verified
- micro-parcel risk
- sparse county data

---

## QA Standard

Before a county is promoted to serious use, test with real properties.

QA checklist should include:
- parcel normalization works
- addresses are usable
- map links work
- assessor links work
- recorder links work
- zoning messages are honest
- score appears correctly
- report renders correctly
- no misleading blanks

Recommended sample size: at least 5 properties initially, ideally 10

---

## Definition of Done for a County

A county is considered done only when:
- import is working
- parcel identity is usable
- maps/location are usable
- at least core external links work
- scoring functions
- report support exists
- missing layers are clearly labeled
- QA has been run
- completeness status is documented

If those are not true, the county is not done.
