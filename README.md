# TaxProperty - Tax Sale Intelligence Platform

AI-powered analysis of tax sale properties for professional real estate investors. Currently supporting Utah County with 127 analyzed properties for the May 2026 sale.

## Features

### Core Intelligence
- **AI-Powered Scoring Engine** - Automated Bid/Research/Avoid classification using Opportunity and Risk factors (0-100 scale)
- **Max Bid Calculator** - Dustin Hahn formula: (ARV × 80%) − Costs − Profit
- **Portfolio Management** - Track properties through your investment workflow

### Due Diligence Suite (V3)
- **Title Research Checklist** - 8-step Dustin Hahn workflow with progress tracking
  - Drive-by inspection verification
  - ARV validation with comp guidance
  - Tax sanity checks (payoff ratio analysis)
  - Parcel ID verification via GIS
  - Municipal lien risk assessment
  - Chain of title review
  - Occupancy status check
  - Max bid calculation
- **Property Intelligence** - Street View imagery, aerial views, GIS parcel data
- **Risk Assessment** - Micro-parcel detection, entity ownership flags, environmental screening

### Data & Automation
- **Zoning Analysis** - 25 real Utah County zoning codes + 16 city guidance modules
- **Assemblage Detection** - Adjacent parcel identification for micro-parcel opportunities
- **Data Sync Automation** - Daily redemption checking with status alerts
- **Data Trust Indicators** - Confidence meters showing verified vs. estimated data

### Professional Tools
- **Investor Reports** - Committee-ready PDF generation with portfolio overview
- **Multi-User Support** - Google OAuth authentication with property ownership
- **Bulk Actions** - Re-check status, re-run auto-fill on multiple properties

## Tech Stack

- **Framework:** Next.js 15 + React 19 + TypeScript
- **Database:** Prisma ORM + SQLite (PostgreSQL ready)
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** NextAuth.js v5 with Google OAuth
- **GIS/Data:** Utah County AGRC API, Google Street View API
- **Scraping:** Cheerio for redemption status checking

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Push database schema
npx prisma db push

# Seed with Utah County data (optional)
npx tsx scripts/import-utah-county-csv.ts

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Maps (for Street View images)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Optional: Cron job security
CRON_SECRET=your-cron-secret
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm start            # Start production server

# Data management
npm run fetch-images           # Batch fetch Street View images for all properties
npx prisma studio              # Browse database visually
npx prisma db push             # Apply schema changes

# Analysis
npm run rescore-all            # Re-run scoring engine on all properties
npx tsx scripts/detect-assemblage.ts  # Run assemblage detection
npx tsx scripts/check-redemptions.ts  # Manual redemption check
```

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (properties, auth, cron)
│   │   ├── dashboard/         # Portfolio dashboard
│   │   ├── properties/        # Property list and detail
│   │   ├── reports/           # Investor report generation
│   │   ├── settings/          # User preferences
│   │   └── login/             # Authentication page
│   ├── components/
│   │   ├── MaxBidCalculator.tsx      # Dustin Hahn formula implementation
│   │   ├── DueDiligenceChecklist.tsx # 8-step research workflow
│   │   ├── DataTrustIndicators.tsx   # Confidence scoring UI
│   │   ├── PropertyImage.tsx         # Street View integration
│   │   └── AppLayout.tsx             # Navigation wrapper
│   ├── lib/
│   │   ├── scoring/            # Investment scoring engine
│   │   ├── zoning/            # Zoning fetchers (cities + county)
│   │   ├── assemblage/          # Adjacent parcel detection
│   │   └── sync/               # Redemption checking
│   └── types/                  # TypeScript definitions
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

## Scoring Methodology

Properties are scored 0-100 using:

**Opportunity Factors (+):**
- Market value vs. tax amount (equity spread)
- Absentee owner bonus
- Buildability score from zoning
- Assemblage opportunity (adjacent parcels)

**Risk Factors (-):**
- Micro-parcel penalty (< 2000 sq ft, -40 points)
- Entity-owned (LLC/CITY/HOA, -15 points)
- Access/title/legal/marketability risks
- Pre-sale volatility (status changes)

**Recommendations:**
- **BID** (70+): Strong candidates with verified data
- **RESEARCH** (55-69): Potential opportunities needing verification
- **AVOID** (<55): Disqualifying issues

## Current Data: Utah County May 2026

| Metric | Value |
|--------|-------|
| Properties Analyzed | 127 |
| Street View Coverage | 119 (93.7%) |
| Sale Date | May 21, 2026 |
| Unincorporated (Real Zoning) | 25 |
| City Properties (Guidance) | 102 |
| BID Recommendations | ~20-30 |

## V3 Roadmap

Features implemented and ready:

1. **Authentication & Multi-User** - NextAuth.js with Google OAuth
2. **Max Bid Calculator** - Interactive ARV-based bidding tool
3. **Due Diligence Checklist** - 8-step title research workflow
4. **Assemblage Detection** - Adjacent parcel analysis
5. **Data Sync Automation** - Daily redemption checking
6. **City Zoning Fetchers** - 16 city modules ready for activation

## Contributing

This is a proprietary platform for TaxProperty Intelligence LLC. Not open for external contributions.

## License

Proprietary - All rights reserved.

---

**TaxProperty Intelligence** - Know which properties to bid. Ignore the rest.
