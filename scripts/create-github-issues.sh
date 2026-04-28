#!/bin/bash
# Create GitHub issues for V2 work
# Run this after setting up git remote: git remote add origin <your-repo-url>

echo "Creating GitHub issues for TaxProperty V2..."

gh issue create --title "Implement micro-parcel scoring penalty" \
--body "Properties under 2000 sqft non-condo should lose 40 points from opportunity_score and get 'Micro-parcel: likely unbuildable standalone' note. Condos exempt. See scoring engine in src/lib/scoring."

gh issue create --title "Build professional landing page at /" \
--body "Replace default Next.js page. Show: TaxProperty branding, tagline, 3 feature highlights (127 properties, automated scoring, zoning intelligence), View Dashboard CTA. Demo-ready for investor meetings."

gh issue create --title "Add Portfolio Overview to report header" \
--body "Before the property list in /reports, add a Portfolio Overview box: total analyzed (127), BID count, sum of payoffs needed, combined market value, average payoff ratio, auction date."

gh issue create --title "Add Generate Investor Report button to properties page" \
--body "One-click button in toolbar that selects all recommendation=bid properties and opens /reports with those IDs pre-selected. Label: Generate Investor Report."

gh issue create --title "Add county_config table to database" \
--body "New Prisma model: CountyConfig with fields: county_name, state, parcel_api_url, zoning_api_url, land_records_url_template, auction_date, auction_format, parcel_id_format, csv_column_mapping. Seed with Utah County data. Required for multi-county expansion."

gh issue create --title "Research and document Salt Lake County data sources" \
--body "Find: SLC parcel API endpoint, zoning GIS service URL, land records URL format, parcel ID format, auction date and format. Document in /docs/COUNTY_EXPANSION.md Salt Lake County section."

gh issue create --title "Implement county adapter pattern" \
--body "Refactor auto-fill route to use county config from database instead of hardcoded Utah County URLs. Each county plugs into standard interface. Required before adding Salt Lake County."

gh issue create --title "Add tax history scraping for redemption risk" \
--body "Scrape Utah County Land Records tax history tab per property. Extract: years delinquent, payment pattern (consistent/sporadic/stopped), last payment date. Save to Property model. Use to improve redemption_risk score."

echo "All issues created!"
