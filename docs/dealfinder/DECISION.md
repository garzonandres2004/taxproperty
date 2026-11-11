# Deal Finder: Decision Record

Date: 2026-11-10
Status: Decided, build started on branch `dealfinder-florida`

## The question

Andres wants a tool that finds below market distressed properties he can buy with his own money, ranks them, explains why, gives an offer range, picks the best strategy (flip, rent, wholesale, sell to neighbor), says how financing fits, and estimates profit.

Two things killed the Utah version:

1. Utah sells once a year and most listed parcels were redeemed before the sale. One shot per year, and most of the list disappears.
2. When a good parcel does reach an auction, buyers with more money bid it up. A small budget buyer loses those bidding wars.

So the new tool has to answer two questions, not one: "is this a good deal" and "can I actually win it with my budget".

## The decision

Start with Florida. Inside Florida, start with **Lands Available for Taxes**, not the auctions.

Order of work:

1. Florida Lands Available for Taxes (primary). Fixed price, no bidding.
2. Florida weekly online tax deed auctions (secondary), with a competition estimate and a hard max bid so the tool tells you when you will probably lose.
3. Texas monthly sales later, using the same core engine with a Texas adapter.

## Why Florida

- **Statewide free data.** The Florida Department of Revenue publishes the NAL (Name, Address, Legal) tax roll for all 67 counties in one standard format: owner, use code, just value, land size, living area, year built, last two sales with qualification codes, homestead exemption. One parser covers the whole state. Utah needed a different source per county.
- **Sales happen constantly.** Many counties sell weekly online (Hillsborough on Thursdays, Pasco on Thursdays, Sarasota most weekdays, Lake several Tuesdays a month). Not one shot a year.
- **No redemption after the sale.** Florida tax deed buyers get a deed. The owner can redeem only until the winning bidder pays. Once you pay, the redemption problem that killed the Utah list is gone.
- **Lands Available exists.** This is the part that solves the competition problem.

## Why Lands Available first (the competition answer)

When a Florida tax deed parcel gets no bid at auction, it goes on the county's List of Lands Available for Taxes (F.S. 197.502(7)).

- For the first 90 days only the county may buy it.
- After 90 days **anyone can buy it at the opening bid** plus omitted taxes, accrued interest, documentary stamps, and recording fees.
- There is **no auction**. Sales are first come, first served. Brevard and Duval both say this directly; Brevard uses a lottery only when several people show up on a publication day.
- Parcels stay on the list up to 3 years, then escheat to the county.

What this means for a small budget buyer: a rich bidder cannot outbid you, because there is no bidding. The price is set by the unpaid taxes, not by the market. The catch is that most of these parcels went unsold for a reason (swamp, sliver strips, landlocked lots, surviving city liens). So the tool's real job on this list is **filtering out the junk fast** and finding the few parcels where the fixed price is far below what the land is worth to someone, usually a neighbor.

## Why auctions second, and how the tool handles competition there

Florida tax deed auctions run on RealTaxDeed/RealAuction and anyone in the country can bid. Single family homes in big counties draw heavy bidding. The tool will:

- Estimate a competition level from county size, property type, and how big the gap is between opening bid and value.
- Estimate where the bidding will likely end (a clearing price as a share of market value).
- Compare that to the user's max bid. If the expected clearing price is above the user's max, it says "you will probably lose this one" instead of pretending.
- Prefer smaller counties and vacant land, where fewer bidders show up.
- Log real auction results so the clearing price model gets calibrated with actual data instead of guesses.

## What the tool will never do

- Hardcode a budget. Budget and per deal limits come only from the user's settings file. The tool refuses to run without them.
- Claim title is clean. Florida tax deeds do not wipe out government liens (code enforcement, municipal utility, some special assessments). The report lists these as checks the buyer must do, with the place to look.
- Treat its value estimate as an appraisal. Every estimate shows its source (comparable sales or assessed value) and a confidence level.

## Known risks in Florida (built into the risk flags)

- Government and municipal liens survive the tax deed. Code enforcement fines can run per day.
- Title insurers usually require a quiet title action before insuring a tax deed (cost and months added to every plan).
- Homestead parcels: the opening bid includes half of the assessed value, and someone may live there.
- Condos: the association may pursue unpaid assessments.
- Mobile homes may be titled separately from the land.
- Use codes that are almost always traps: 009 common areas, 094 right of way, 095 submerged land, 096 waste land, swamp, marsh.

## Limits of this first build

- The tool reads files the user downloads (the NAL tax roll for a county and the county's Lands Available list or auction list). The build environment cannot reach the Florida websites, so the first version was tested on sample data with the real NAL column layout, not on a live county file. The first real run on a downloaded county file is the true test.
- Neighbor detection uses street and legal description matching, not parcel maps. It will miss some neighbors.
- Rent and rehab numbers are rough rules of thumb from the settings file, shown as ranges, and must be checked locally.

## Sources

- Florida Statute 197.502 (Lands Available): https://m.flsenate.gov/Statutes/197.502
- Florida DOR assessment roll and GIS downloads (NAL files): https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx
- 2026 NAL/SDF/NAP Users Guide (field layout): https://floridarevenue.com/property/dataportal/Documents/PTO%20Data%20Portal/User%20Guides/2026%20Users%20guide%20and%20quick%20reference/2026_NAL_SDF_NAP_Users_Guide.pdf
- Brevard Clerk, Lands Available (first come first served, quote by request, homestead half value): https://www.brevardclerk.us/lands-available
- Duval Clerk, Lands Available FAQ (price parts, government liens survive, statement valid to month end): https://www.duvalclerk.gov/getmedia/0c909a7f-583d-49c0-b5d3-da5c2cbe5ad0/392460_3_LANDS-AVAILABLE-FAQ-New.pdf
- Sarasota Clerk, List of Lands Available (3 years then escheat): https://www.sarasotaclerk.com/e-services/online-property-auctions/tax-deed-services/list-of-lands-available
- Broward, Lands Available for Taxes: https://broward.org/RecordsTaxesTreasury/TaxesFees/Pages/LandsAvailableforTaxes.aspx
- Taylor Clerk, List of Lands Available: https://taylorclerk.com/departments/list-of-lands-available/
- Highlands Clerk, Lands Available: https://highlandsclerkfl.gov/clerk_to_the_board/tax_deeds/lands_available.php
