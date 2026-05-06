# Property Pipeline

Converts raw PublicSurplus auction scrape data into fully-analyzable deal files and investor memos.

## Overview

```
utah_auctions.csv
      │
      ▼ parseCsvToListings()
AuctionListing[]          — normalized, typed CSV row
      │
      ▼ enrichListing()   (AGRC LIR lookup per parcel)
FullPropertyRecord[]      — complete deal file
      │
      ▼ fullRecordToPropertyForMemo()
PropertyForMemo           — synthetic Prisma-compatible shape
      │
      ▼ generateInvestorMemo()
InvestorMemo              — recommendation, max bid, scores, good/bad, next actions
      │
      ▼ renderMemoMarkdown()
output/memos/*.md         — one markdown file per property
```

## Commands

```bash
# Full run — all 469 listings, AGRC enrichment + memos
npm run build:properties

# Single county
npm run build:properties -- --county box_elder

# Quick test (first 10)
npm run build:properties -- --limit 10 --verbose

# Enrichment only, skip memo generation
npm run build:properties -- --no-memos
```

## Output Files

| File | Description |
|------|-------------|
| `output/full_property_records.json` | `FullPropertyRecord[]` — all enriched deal files |
| `output/build_summary.json` | Run stats, per-county breakdown, memo recommendation counts |
| `output/memos/<county>_<parcel>.md` | One investor memo per property |

## Types

### `AuctionListing`

Location: `src/lib/pipeline/auction-types.ts`

Normalized row from `utah_auctions.csv`. Fields:

| Field | Source |
|-------|--------|
| `listing_id` | PublicSurplus auction # |
| `county` | DB slug (e.g. `box_elder`) |
| `county_display` | Human-readable (e.g. `Box Elder`) |
| `parcel_ids[]` | Split on ` & ` for multi-parcel listings |
| `opening_bid` | Opening Price from PublicSurplus page |
| `end_date_parsed` | Parsed `Date` from `Auction Ends` text |
| `status` | `Has Not Started` / `Active` / `Closed` |
| `url` | PublicSurplus lot URL |
| `acres_hint` | From description text (unreliable — AGRC preferred) |

### `FullPropertyRecord`

Location: `src/lib/pipeline/auction-types.ts`

Complete deal file. Combines auction listing data + AGRC enrichment + derived signals.

Key sections:

**Identity** — `listing_id`, `county`, `parcel_id`, `county_readiness`

**Property info** — `owner_name`, `situs_address`, `legal_description`, `subdivision`, `acres`, `building_sqft`, `year_built`, `property_type`, `property_class`, `latitude`, `longitude`

**Auction economics** — `opening_bid`, `buyers_premium_pct`, `all_in_cost`, `sale_type`, `auction_end`

**Market / value** — `market_value`, `land_value`, `assessed_value`, `value_confidence`, `bid_to_value_pct`, `equity_multiple`

**Title snapshot** — `title.has_deed_records`, `title.lien_docs_found`, `title.confidence`, `title.notes`, `title.red_flags`

**Land/use risk** — `access_notes`, `subdivision_pattern`, `likely_utilities`, `hoa_flag`, `code_violation_flag`, `buildability_notes`

**Data quality** — `missing_data_flags[]`, `agrc_hit`, `run_id`, `enriched_at`

### `TitleSnapshot`

Embedded in `FullPropertyRecord.title`. For counties with live title scrapers (Utah, Tooele, Rich), this will be populated by the respective scraper. For all others, `confidence = 'NONE'`.

## How Enrichment Works by County

### LIVE (Utah, Tooele, Rich)
- AGRC LIR hit expected (parcel formats well-understood)
- Title scrapers exist but are not automatically invoked by `build-properties` — run the county-specific title batch scripts separately, then re-run `build:properties`
- Memos have full title-aware scoring

### NEAR_LIVE (Sanpete)
- AGRC LIR available
- EagleWeb recorder accessible but batch title not yet automated
- Memos include readiness caveat: confidence adjusted down 15%

### PARTIAL (Davis, Weber)
- AGRC LIR available
- No title automation
- Memos carry moderate confidence reduction (40%)

### PLANNED (Box Elder, Salt Lake, Juab, Sevier, Iron, Wasatch, Washington, Beaver, Duchesne)
- AGRC LIR attempted (hit rate varies by parcel format)
- No title data
- Memos flagged `RESEARCH` by default unless AGRC returns strong equity signal, then `CAUTION`
- Confidence reduced 70%

## How the Memo Engine Uses FullPropertyRecord

`fullRecordToPropertyForMemo()` creates a synthetic `PropertyForMemo` that satisfies the `generateInvestorMemo()` interface without requiring a live DB record.

Key mappings:
- `opening_bid` → `total_amount_due` (equity base)
- `market_value` → `estimated_market_value` (ARV)
- `county_readiness` → `countyConfig.status` (confidence multiplier)
- `code_violation_flag` → `code_violations_found` (municipal lien signal)
- `missing_data_flags` → `data_gaps[]` (shown in "Bad" bullets and next actions)

The memo engine scores on 5 dimensions (equity, title risk, recency, property quality, data completeness) and produces `GO / CAUTION / RESEARCH / AVOID / SKIP`.

For PLANNED counties with no title data, `titleRisk` and `recency` scores default to neutral (2/4, 1/3) — the memo is honest about the missing data without crashing.

## How to Add a New County

1. Ensure `CountyConfig` row exists in DB with correct `parcel_api_url` (already seeded for all 29 Utah counties).
2. Add the county slug to `COUNTY_SLUG` and `BUYERS_PREMIUM` in `auction-enricher.ts`.
3. If the county uses a PublicSurplus auction, re-run `scrape-publicsurplus.ts` — it auto-detects all pages.
4. If the county has a title scraper, set `CountyConfig.readiness = 'LIVE'` and add the county to `COUNTY_READINESS` in `auction-enricher.ts`.
5. Run `npm run build:properties`.

## AGRC LIR Parcel Matching

`agrc-lookup.ts` tries four strategies in order:
1. `PARCEL_ID = '{raw}'` — exact match on raw parcel ID from CSV
2. `SERIAL_NUM = '{numeric}'` — numeric-stripped ID against serial number field
3. `PARCEL_ID = '{numeric}'` — numeric ID against parcel ID field
4. `PARCEL_ID LIKE '{prefix}%'` — partial match on first 8 chars

Hit rate by county (approximate):
- Box Elder, Salt Lake, Wasatch, Washington — ~85% (dashed IDs match AGRC directly)
- Sanpete — ~70% (numeric sequential IDs need SERIAL_NUM matching)
- Duchesne, Juab, Iron, Sevier, Beaver — ~60-80% (format varies)
- Multi-parcel listings (` & ` in parcel field) — only primary parcel looked up

## Buyers Premium

All listings use PublicSurplus. Standard premium is 5%. Exceptions:
- Tooele: 8% (county-set)

Premium is verified against the Terms and Conditions linked from each listing. Update `BUYERS_PREMIUM` in `auction-enricher.ts` when confirmed for a new county.

## Sale Type

All PublicSurplus Utah tax auctions are **deed sales** (not lien sales). The winning bidder takes title subject to quiet title action if needed. There is no redemption period for the buyer.

## Regenerating Records

After each new scrape or county addition:

```bash
npx tsx scripts/scrape-publicsurplus.ts   # refresh CSV
npm run build:properties                   # re-enrich + re-memo all listings
```
