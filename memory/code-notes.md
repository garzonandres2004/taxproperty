### [2026-04-27] coder — Property count on Generate Investor Report button

**Decisión de código:** Added `bidProperties.length` to the button text to show investors how many BID properties will be included in the report.

**Trampa evitada:** N/A - Simple JSX interpolation, no side effects.

**Patron reusable:** When showing action buttons that operate on a filtered dataset, display the count inline to set user expectations before they click.

### [2026-04-27] coder — Portfolio Overview stats verification

**Decisión de código:** Verified all 6 required stats are present in the Portfolio Overview section. Updated label from "Total Analyzed" to "Total Properties" for clarity. Added "Generated" date to the summary grid alongside Auction Date, Event Date -> Auction Date for consistency.

**Trampa evitada:** Almost left the generated date only in the footer. Moved it to the main stats grid so it's visible at a glance with other key metrics.

**Patron reusable:** When displaying report headers with multiple stats, use a consistent 4-column grid layout and group temporal data (auction date, generated date) together for scannability.

### [2026-04-28] coder — Workstream A: Street View Image Implementation (COMPLETED)

**Decisión de código:** Implemented Google Street View Static API for all 127 Utah County properties.

**Architecture:**
- API route `/api/properties/[id]/images` fetches coordinates from AGRC LIR
- Generates Street View URL using Google Maps Static API
- Also generates aerial view using Google Static Maps satellite view
- Caches URLs in `photo_url` and `aerial_url` database fields
- Batch script `npm run fetch-images` processes all properties

**Trampa evitada:** Coordinates are not stored in database currently. Solution: fetch from AGRC in API route, cache Street View URL in photo_url. No schema migration needed.

**Otra trampa evitada:** Google Maps API key must be kept server-side only. Client never sees the key - only the generated image URLs with embedded signatures.

**Patron reusable:** For external image APIs:
- Generate URL server-side (keeps API key secure)
- Store URL in database (caches result, reduces API calls)
- Client displays with error fallback to placeholder
- Use size parameter (sm/md/lg) for responsive images
- Always include error handling for missing/invalid images

**Files created/modified:**
- `src/components/PropertyImage.tsx` - Added photoUrl prop
- `src/app/api/properties/[id]/images/route.ts` - New API route
- `src/app/api/properties/[id]/zoning/auto-fill/route.ts` - Added image fetching step
- `scripts/fetch-all-images.ts` - Batch processing script
- `src/app/properties/page.tsx` - Updated to pass photo_url
- `src/app/properties/[id]/page.tsx` - Added image gallery section

**Next step:** User needs to provide GOOGLE_MAPS_API_KEY to populate images

### [2026-04-27] coder — Dark theme landing page transformation

**Decisión de código:** Converted landing page from light to dark professional theme (slate-900 base)

**Cambios aplicados:**
1. Main background: `bg-gradient-to-b from-slate-50 to-white` → `bg-slate-900`
2. Headlines: `text-slate-900` → `text-white`
3. Subheadlines: `text-slate-600` → `text-slate-300`
4. Badge text: `text-blue-800` → `text-blue-300`
5. Feature Cards: `bg-white` → `bg-slate-800 border border-slate-700`, text `text-slate-600` → `text-slate-400`
6. Stats Bar: numbers `text-slate-900` → `text-white`, labels `text-slate-600` → `text-slate-400`
7. How It Works: section title `text-white`, step backgrounds `bg-slate-800`, step text `text-slate-400`, descriptions `text-slate-400`
8. Demo CTA: background `bg-slate-900` → `bg-blue-900/30` for contrast
9. Footer: border-t `border-slate-800`, text `text-slate-400`

**Trampa evitada:** Demo CTA was already `bg-slate-900` which would blend with page background — changed to `bg-blue-900/30` for visual contrast

**Patrón reusable:** 
- Use `text-slate-300` for secondary text on dark backgrounds
- Use `text-slate-400` for tertiary/muted text
- Use `bg-slate-800 border border-slate-700` for elevated cards on dark themes
- Keep colored icon backgrounds (blue-100, green-100, amber-100) — they pop nicely on dark

### [2026-04-28] arquitecto — NextAuth.js Implementation

**Decisión de código:** Implemented NextAuth.js v5 with Google OAuth for multi-user support.

**Cambios aplicados:**
1. Schema: Added User, Account, Session, VerificationToken models (NextAuth standard)
2. Schema: Added user_id to Property model with relation to User
3. Created `/api/auth/[...nextauth]/route.ts` with PrismaAdapter and GoogleProvider
4. Created `middleware.ts` protecting /dashboard, /properties, /reports, /settings routes
5. Created login page at `/login` with dark theme and Google sign-in button
6. Updated AppLayout.tsx to use `useSession()` hook for real user data
7. Updated API routes to filter by session.user.id:
   - `/api/properties` - POST creates with user_id, GET filters by user_id
   - `/api/properties/[id]` - verifies ownership on GET, PUT, DELETE

**Trampa evitada:** Must use `getServerSession()` in API routes, not `getSession()`. The server version works in Next.js App Router API routes; the client version only works in browser.

**Patrón reusable:**
- Always verify ownership: `findFirst({ where: { id, user_id } })` instead of `findUnique({ where: { id } })`
- Return 401 for missing session, 404 for not found (don't leak existence of other users' data)
- Use `signOut({ callbackUrl: '/login' })` for clean logout redirect
- Avatar fallback: initials from name.split(' ').map(n => n[0]).join('').toUpperCase()

**Environment variables needed:**
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### [2026-04-28] coder — Workstream F: Redemption Checker Implementation

**Decisión de código:** Implemented automated redemption status checking for Utah County properties.

**Cambios aplicados:**
1. Created `src/lib/sync/redemption-checker.ts` with core logic:
   - `fetchRedemptionStatus()` - Scrapes Utah County Land Records for parcel
   - `parseRedemptionHtml()` - Extracts tax balance and "REDEEMED" status from HTML
   - `checkPropertyRedemption()` - Compares current vs previous status
   - `updatePropertyFromCheck()` - Updates DB and creates OutcomeEvent for redemptions

2. Created `src/app/api/cron/redemption-check/route.ts` API endpoint:
   - POST with modes: 'stale' (7+ days), 'all', 'selected' (by propertyIds)
   - Simple auth via CRON_SECRET env var (optional for dev)
   - Returns summary with redeemed count, amount changes, errors
   - GET returns sync status: lastCheckedAt, staleCount, daysUntilSale

3. Updated `src/app/properties/page.tsx` with new features:
   - "Sync Status" button with last check timestamp and stale count
   - Sale date approaching warning (< 7 days) with AlertTriangle
   - Status filter dropdown (All, new, researching, ready, redeemed)
   - Status column with color-coded badges
   - "Verified" column showing last check time with staleness indicator
   - Bulk actions: "Re-check Status" and "Re-run Auto-fill" for selected properties

**Trampa evitada:**
- Utah County server rate limiting: Added 1s delay between requests
- Partial page loading: Cheerio parses what's available, graceful fallbacks
- Duplicate OutcomeEvents: Used Prisma transaction to update Property + create Event atomically
- Redeemed properties still selectable: Disabled checkbox for redeemed status

**Patrón reusable:**
- For scraping: Use cheerio + fetch with User-Agent header + rate limiting delay
- For status checks: Store `source_last_checked_at` and `status_last_verified_at` separately
- For bulk actions: Show progress in selection bar, clear selection on complete
- For warnings: Use amber-50 border-amber-200 for sale date alerts, emerald for success
- For staleness: >7 days = AlertTriangle + amber text, <=7 days = Check + slate text

**Utah County URL format:**
```
https://www.utahcounty.gov/LandRecords/property.asp?av_serial={parcel.replace(/:/g, '')}
```

**Redemption detection logic:**
1. Look for "REDEEMED" or "PAID IN FULL" text on page
2. Parse tax history table, sum Balance Due for years >= 2024
3. If total balance = 0, mark as redeemed
4. Compare current amount with stored amount (>$1 diff = amount_changed)

### [2026-04-28] coder — Workstream E: Assemblage Detection System

**Decisión de código:** Implemented complete assemblage detection system to identify adjacent parcels for micro-parcel opportunities.

**Cambios aplicados:**
1. **Database Schema** (`prisma/schema.prisma`):
   - Added `AdjacentParcel` model with fields: property_id, adjacent_parcel_number, is_in_tax_sale, distance_meters
   - Added `adjacent_parcels` relation to Property model
   - Ran migration with `npx prisma db push --accept-data-loss`

2. **Detection Logic** (`src/lib/assemblage/detector.ts`):
   - Created AGRC LIR integration to query parcel geometry
   - Implemented buffer-based neighbor detection (100m radius)
   - Added tax sale cross-reference to identify adjacent properties in database
   - Created batch processing for multiple properties

3. **Scoring Integration** (`src/lib/scoring/index.ts`):
   - Added `getAdjacentParcelNumbers()` helper to load from DB
   - Added `scorePropertyWithAdjacentData()` async wrapper
   - Scoring engine already supported assemblage via `adjacentParcelIds` parameter

4. **API Endpoints** (`src/app/api/properties/[id]/assemblage/route.ts`):
   - GET: Returns adjacent parcels with tax sale enrichment
   - POST: Triggers on-demand assemblage detection

5. **UI Updates** (`src/app/properties/[id]/page.tsx`):
   - Added Adjacent Parcels section card
   - Shows parcel numbers with "In Tax Sale" badges
   - Links to properties that exist in database
   - Displays combined opportunity message for micro-parcels
   - Purple theming for assemblage opportunity highlighting

6. **Alert Enhancement** (`src/components/DataTrustIndicators.tsx`):
   - Enhanced assemblage alert to show count of adjacent tax sale parcels
   - Dynamic messaging based on actual data

**Trampa evitada:** Initially considered running AGRC queries for every property on page load. Changed to cached storage pattern — adjacent parcels stored in database and only refreshed on-demand or via batch script.

**Patrón reusable:**
- Use AGRC LIR FeatureServer queries with geometryType=esriGeometryPoint and spatialRel=esriSpatialRelIntersects
- Normalize Utah County parcel numbers: "12:345:6789" -> "123456789" for AGRC queries
- Batch external API calls with sequential processing to avoid rate limiting
- Store derived data (adjacent parcels) in database for fast reads

### [2026-04-28] coder — City Zoning Integration Implementation

**Decisión de código:** Implemented real zoning code fetchers for all 16 Utah County cities using Utah County's ArcGIS REST API.

**Cambios aplicados:**
1. Created `src/lib/zoning/cities/` directory with 16+2 city fetcher modules:
   - index.ts (exports, layer IDs, planning URLs)
   - common.ts (shared utilities, identify API, buildability calc)
   - Individual city files: provo.ts, orem.ts, lehi.ts, american-fork.ts, spanish-fork.ts, pleasant-grove.ts, springville.ts, highland.ts, alpine.ts, cedar-hills.ts, lindon.ts, mapleton.ts, payson.ts, saratoga-springs.ts, eagle-mountain.ts, vineyard.ts

2. Each city fetcher:
   - Uses Utah County ArcGIS identify API with city-specific layer ID
   - Normalizes zone codes to standard format (e.g., "R-1", "C-G")
   - Returns: zoneCode, zoneName, buildabilityScore, sourceUrl, jurisdiction

3. ArcGIS Layer IDs discovered:
   - Provo: 29, Orem: 28, Lehi: 25, Spanish Fork: 35
   - Pleasant Grove: 30, Springville: 36, American Fork: 16
   - Highland: 24, Alpine: 15, Cedar Hills: 18, Lindon: 26
   - Mapleton: 27, Payson: 31, Saratoga Springs: 34
   - Eagle Mountain: 20, Vineyard: 37
   - Unincorporated: 65

**Trampa evitada:** Initially thought cities had separate APIs - discovered Utah County hosts all zoning data in unified ArcGIS service. Saved weeks of individual city API research.

**Patron reusable:** 
- Use identify API with coordinates + layer ID for spatial queries
- Normalize zone codes per city (each uses different conventions)
- Calculate buildability score from zone classification
- Export both unified interface and individual fetchers for flexibility
