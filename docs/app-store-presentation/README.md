# TaxProperty — App Store Presentation

> **Tax Sale Intelligence for Professional Investors**

**Calculated tax sale investments. Not guesswork.**

---

## App Identity

| Element | Value |
|---------|-------|
| **App Name** | TaxProperty |
| **Subtitle** | Tax Sale Intelligence |
| **Tagline** | "Know which properties to bid. Ignore the rest." |
| **Primary Category** | Finance |
| **Secondary Category** | Business |
| **Developer** | TaxProperty Intelligence LLC |
| **Price** | Free (Pro tier available) |

### Icon Concept
Abstract geometric monogram ("TP" or precision symbol) in flat design. Dark navy (#0A1628) background with signal amber (#F59E0B) accent. Bloomberg terminal aesthetic—not a literal house.

### Value Proposition
TaxProperty scores every property at Utah County tax sales so you bid with conviction, not guesswork.

---

## Screenshots

### Screenshot 1: Landing Page
**Caption:** "Discover tax sale opportunities"

Dark-themed landing with large hero text "Tax Sale Intelligence for Serious Investors", stats banner showing "127 Properties | Utah County | Sale Date: May 21 2026", and feature icons (ShieldCheck, Layers, FileCheck).

### Screenshot 2: Properties List
**Caption:** "127 scored and ranked properties"

Data table with property images, color-coded score badges (emerald/amber/red), BID/RESEARCH/AVOID recommendation pills, and filter bar.

### Screenshot 3: Property Detail
**Caption:** "Complete due diligence in one view"

Street View header, 3 score cards (Opportunity/Risk/Final), Max Bid Calculator widget, Due Diligence Checklist, and Zoning panel.

### Screenshot 4: Scoring Breakdown
**Caption:** "AI-powered investment scoring"

Score distribution bar chart, confidence meters, micro-parcel alerts, and detailed breakdown badges.

### Screenshot 5: Investor Report
**Caption:** "Professional reports for committees"

Multi-property report layout with Portfolio Overview, Investment Summary cards, print-optimized design.

### Screenshot 6: Dashboard
**Caption:** "Portfolio intelligence at a glance"

Stat cards grid, Score Distribution chart, Top Rated Bid-Targets list, Research Queue.

---

## Description

### Short Description
AI-powered analysis of 127 Utah County tax sale properties. Automated scoring, risk assessment, and professional investment reports—complete your due diligence in minutes, not days.

### Full Description

**The Problem: Information Overload**
Tax lien and deed auctions present compelling investment opportunities, but the research burden is overwhelming. Each property requires 10+ hours of manual due diligence across county assessor sites, GIS systems, recorder databases, and zoning codes. For the May 2026 Utah County sale alone, that meant 1,270+ hours of research—time that only institutional investors could afford.

**The Solution: Complete Automation**
TaxProperty V2.1 analyzes all 127 properties in the Utah County May 2026 sale automatically. We pull real data from Utah County GIS, integrate Street View imagery for visual assessment, cross-reference recorder records, and decode all 25 zoning classifications with 102 guidance rules built in. What once took weeks now takes minutes.

**How Scoring Works**
Every property receives a transparent 0-100 score based on Opportunity factors minus Risk factors. Scores map to clear action categories:

- **BID** (70+): Strong candidates with verified data, manageable risk, and positive location factors
- **RESEARCH** (55-69): Potential opportunities requiring additional verification
- **AVOID** (<55): Properties with disqualifying issues

**Real Data, Real Confidence**
We don't use generic datasets. Every analysis pulls from Utah County's actual GIS parcels, matches properties to real Street View imagery (119 of 127 properties have visual coverage), and applies the county's specific zoning code interpretations. Data trust indicators show exactly which fields are verified versus estimated.

**Professional Reports**
Generate committee-ready PDF reports with portfolio overviews, individual property details, and due diligence checklists. Take your findings directly to investment partners or personal decision processes without manual formatting.

---

## Features

| Icon | Feature | Description |
|------|---------|-------------|
| 🤖 | **AI-Powered Scoring Engine** | Automated Bid/Recommend/Avoid classification using Opportunity and Risk factors |
| 🧮 | **Max Bid Calculator** | Built-in formula: (Market Value × 0.70) − Repairs − Delinquent Debt |
| 🛰️ | **Property Intelligence** | Utah County GIS integration with Street View imagery for visual assessment |
| 📋 | **Due Diligence Suite** | Land Records verification, Recorder search, and Tax Sanity Check |
| 📄 | **Investor Reports** | Professional PDF generation with portfolio overview and property details |
| 📐 | **Zoning Analysis** | 25 real zoning codes + 102 guidance rules for city properties |
| ⚠️ | **Risk Assessment** | Micro-parcel detection, entity ownership flags (LLC/CITY/HOA), environmental screening |
| ✅ | **Data Trust Indicators** | Confidence meters showing verified vs. estimated data |

### Key Differentiators

- **Unlike auction sites:** We analyze, not just list. Most platforms show you what's for sale. TaxProperty tells you what's worth buying—and why.
- **Unlike generic data:** County-specific intelligence. We decode Utah County's actual zoning codes, not generic classifications.
- **Unlike spreadsheets:** Automated scoring and reports. No more manual lookup or formula debugging.

---

## What's New in V2.1

**Version 2.1.0** — Released April 2026

V2.1 represents our demo-ready milestone with 127 Utah properties now live in the platform. This release focuses on data accuracy and user experience.

### Changelog

- **Enhanced property data accuracy** — Improved address parsing and geocoding with 99.2% match rate
- **Real Street View imagery** — 119 of 127 properties now have visual coverage
- **Due diligence integration** — Direct links to Land Records and Recorder databases
- **Tax Sanity Check** — Payoff ratio analysis for every property
- **Clean data display** — HTML entity encoding fixed for all addresses

---

## Coming Soon (V3) — Q3 2026

V3 is built and ready. These features are in final testing:

1. **Salt Lake County Expansion** — Multi-county architecture with 400+ new properties
2. **User Authentication** — Google OAuth with property ownership and saved searches
3. **City Zoning Automation** — 16 city modules (Provo, Orem, Lehi, etc.)
4. **Assemblage Detection** — Adjacent parcel identification for micro-parcel opportunities
5. **Data Sync Automation** — Daily redemption checking with status alerts

## Future Vision (V4+) — Q1 2027

- Full Utah state coverage (all 29 counties)
- AI-powered risk prediction
- Comparable sales integration
- Mobile apps (iOS & Android)

### Final Goal
**"The Zillow of Tax Sales"** — The go-to platform for tax sale investment intelligence nationwide.

---

## Information

| Field | Value |
|-------|-------|
| **Developer** | TaxProperty Intelligence LLC |
| **Size** | Web app (no download required) |
| **Category** | Finance / Real Estate |
| **Compatibility** | Web browsers (Chrome, Safari, Firefox, Edge), mobile-responsive |
| **Languages** | English |
| **Age Rating** | 17+ (investment and financial content) |
| **Price** | Free (Pro tier available) |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + TypeScript |
| Database | Prisma ORM + SQLite |
| Styling | Tailwind CSS |
| Mapping | Google Street View API |
| GIS Data | Utah County AGRC GIS API |

---

## Privacy Practices

### Data Collected
- Email address (account authentication)
- Property preferences (saved searches, watchlists)
- Usage analytics (feature usage, session duration)

### Data NOT Collected
- Financial account information
- Social Security Number (SSN)
- Payment information (handled by Stripe)
- Personal identification documents

### Data Sources
All property data is sourced from **public records only**:
- County GIS databases
- County tax assessment records
- Public land ownership records

### Third-Party Sharing
**None** — We do not sell, share, or transfer user data to third parties.

### Security
- Encryption in transit (TLS/HTTPS)
- Encryption at rest

### User Controls
- Export personal data
- Delete account and associated data

---

## Support & Legal

| Resource | URL |
|----------|-----|
| Support | support.taxproperty.com |
| Developer Website | taxproperty.com |
| Terms of Service | taxproperty.com/terms |
| Privacy Policy | taxproperty.com/privacy |

---

## Marketing Copy

### Headlines
- **Primary:** Tax Sale Intelligence for Professional Investors
- **Secondary:** Stop Researching. Start Bidding. Data-Driven Tax Sale Analysis.
- **Tagline:** Bid Smarter. Invest Safer.

### Value Propositions

1. **Save hours of manual research per property** — Eliminate spreadsheet hunting across county sites, GIS systems, and zoning portals
2. **Avoid bad investments with data-driven scoring** — 15+ risk factors including micro-parcel detection, zoning restrictions, ownership structure
3. **Professional reports for investment committees** — Institutional-grade investment memos with property details and recommended bids
4. **Real-time zoning and buildability data** — Current zoning classifications, setbacks, and coverage calculations
5. **Risk detection that spreadsheets miss** — Automatic flagging of entity-owned properties, clouded titles, deal-killers

### Target Audience

**Primary:** Real estate investors, developers, and house flippers actively acquiring properties through tax sales.

**Secondary:** Investment committees, private lenders, and wholesalers who evaluate tax sale acquisitions.

**NOT for:** Casual homebuyers or first-time buyers seeking consumer-friendly property browsing.

### Call to Action
- **Primary:** Analyze your next tax sale in minutes.
- **Secondary:** Join professional investors who bid with data, not guesswork.

---

## Stats at a Glance

| Metric | Value |
|--------|-------|
| Properties Analyzed | 127 |
| Street View Coverage | 119 properties (93.7%) |
| Sale Date | May 21, 2026 |
| Zoning Codes (Real) | 25 unincorporated |
| Guidance Rules | 102 city properties |
| Scoring Method | Opportunity + Risk = Final (0-100) |

---

*Document prepared for App Store presentation and marketing materials.*

**Tone:** Professional, institutional, serious investor-focused. Bloomberg terminal, not Zillow consumer.
