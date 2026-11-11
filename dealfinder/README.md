# Deal Finder (Florida first)

Finds distressed property you can actually buy with your own money, ranks it, and tells you why, how much to pay, which exit to use, and what can go wrong.

Why Florida and why the Lands Available list first: see [docs/dealfinder/DECISION.md](../docs/dealfinder/DECISION.md).

No installs. Needs Node 22.18 or newer (runs TypeScript directly). Works offline on files you download.

## What it does

For every parcel on a county list it:

1. Finds the parcel in the Florida tax roll (NAL file) even if the list writes the number differently (dashes, spaces, alternate key).
2. Estimates market value from recent arm's length sales of similar parcels nearby (sale price compared to assessed value), with a confidence level. Falls back to assessed value when there are no sales, and says so.
3. Works out what it costs to get the deed (price, doc stamps, recording, and for Lands Available the taxes and interest added since the sale).
4. Flags risks: swamp, right of way, slivers, HOA common areas, government owners, homestead, condo assessments, mobile home titles, old buildings, surviving government liens, and more. Some flags knock a parcel out completely.
5. Runs the exits that fit the property: sell to a neighbor, quiet title then list, quick resale to an investor, fix and flip, fix and rent. Each shows profit, months, cash needed, and how financing fits.
6. Finds nearby owners on the same street or plat (natural buyers for a lot).
7. Estimates competition. Lands Available has none (fixed price). For auctions it estimates where bidding will end and tells you if you will probably lose.
8. Gives a verdict, a score, and the most you should pay.

Verdicts: **Buy candidate** (or Bid candidate at auction), **Get a quote**, **Watch**, **Pass**, **Avoid**.

A Lands Available parcel becomes a Buy candidate only with the clerk's statement (a statement column such as `Statement Total`, `Quote`, `Payoff` or `Purchase Price`, listed in step 3; never an `Estimated ...` column). Without one the price is an estimate, so it cannot be a Buy candidate (Get a quote is the best it can reach; it can still be Watch, Pass or Avoid). Parcels listed for 3 years or more are flagged because they may already belong to the county, and they cannot be a Buy candidate either. The same goes for a list with no usable date (a Sale Date, Auction Date, Date Offered or Date Listed column), because the tool cannot tell whether the county window has passed.

## Step by step

### 1. Your settings (your budget lives here and only here)

```
cp settings.example.json my-settings.json
```

Open `my-settings.json` and fill in `totalCapital` and `maxPerDeal`. The tool will not run without them. `my-settings.json` is ignored by git, so your numbers stay on your computer.

| Setting | Meaning |
|---|---|
| totalCapital | All the cash you have for deals |
| maxPerDeal | Most you will pay for one deed, all in |
| reservePct | Share of capital kept aside for quiet title, liens, surprises (default 0.2) |
| minProfit | Smallest profit in dollars worth your time (default 1000) |
| minReturnPct | Smallest return on cash in (default 0.3 = 30%) |
| strategies | Which exits you are willing to do |
| counties | Limit to some counties (codes or names); empty means all |
| showAvoid | Also list the parcels that were knocked out, with the reason |

### 2. Download the county tax roll (NAL)

Florida Department of Revenue, Data Portal: https://floridarevenue.com/property/Pages/DataPortal_RequestAssessmentRollGISData.aspx

Pick the NAL file for the county and the latest year. It is a CSV. Run `node src/cli.ts counties` to see county codes.

Use the **DOR** file only. A county property appraiser's own export (for example Lake's `NALExtractPublic_*.txt`) has different column names and is rejected on purpose: the DOR file has the same columns in all 67 counties.

### 3. Get the county list

**Lands Available (start here).** Go to the county clerk's tax deed page and find "List of Lands Available" (many counties use RealTDM; pick case status "List of Lands"). If it is a PDF, select all the text, copy it, and paste it into a `.txt` file. The tool finds the parcel numbers in the text on its own. If the clerk gives you a statement (exact payoff), put it in a small CSV with columns `Parcel ID,Statement Total` and pass it too; statements beat estimates.

**Column names matter.** If the clerk's list prints an estimated total (Putnam: "Estimated Purchase Price"), keep that header: the tool uses it as the full price and adds nothing. Only call a column "Opening Bid" if it really is the opening bid; the tool then adds estimated later taxes and interest on top. A clerk statement column ("Statement Total", "Statement", "Statement Amount", "Quote", "Quoted Total", "Payoff", "Payoff Amount" or "Purchase Price") is the only thing that can make a Lands Available parcel a buy; an "Estimated ..." column never can. Use the clerk's own list when one exists; third party case pages can be out of date.

**Auction list.** From the county's RealTaxDeed site, export or copy the upcoming sale list (case number, parcel, opening bid, date).

### 4. Run it

```
node src/cli.ts analyze --nal NAL_lake.csv --lands lake_lands.txt --settings my-settings.json --out reports/lake
```

With an auction list too:

```
node src/cli.ts analyze --nal NAL_lake.csv --lands lake_lands.txt --auction lake_auction.csv --settings my-settings.json --out reports/lake
```

Open `reports/lake.html` in your browser. The same results are in `.md` and `.json`.

To share a report publicly (GitHub issues, this repo is public), add `--public`. That applies no budget and prints none; no settings file is needed. Team rules are in [docs/dealfinder/TEAM.md](../docs/dealfinder/TEAM.md).

### 5. Check the values the tool could only guess

A parcel is never a buy when its value has low confidence (no usable sales nearby); it is held at **Watch**. Pull 3 recent sold properties like it, write your value in a CSV, and run again with `--values`:

```
Parcel ID,Value
07567-012,24000
```

```
node src/cli.ts analyze ... --values my-values.csv
```

Your value replaces the estimate and is labeled as yours in the report.

### 6. Before you pay for anything

The report lists the checks for each parcel. Always:

- Look at it on the property appraiser GIS map (road access, shape, water).
- Search official records and the city code enforcement office for government liens. They survive the tax deed.
- For Lands Available, get the clerk's statement for the real price.
- For houses, drive by.

### 7. Teach it real auction prices

After each auction you watch, record what parcels actually sold for:

```
node src/cli.ts record --county Lake --type vacant --est-market 18000 --winning-bid 7200 --parcel 12-19-26-0100-002-00500
node src/cli.ts calibrate
```

After 3 results for a county and type, the competition estimate uses your real numbers instead of the starting guess.

## Try it on the sample data

```
npm run demo     # writes reports/demo.html
npm test         # all tests
```

The sample parcels are invented, built with the real NAL column names (`node fixtures/make-fixtures.ts`).

## Assumptions

All market rules of thumb (quiet title cost, rehab per square foot, rent to value, selling costs, auction price levels) are in `config/assumptions.json` and printed at the bottom of every report. Override any of them with `--assumptions my-assumptions.json` containing just the numbers you want to change.

## Limits (be honest about these)

- Not yet run on a real county file. The build machine could not reach Florida sites; the first real run is the true test.
- Value comes from the tax roll only. No photos, no condition, no MLS. Confidence is shown for every estimate.
- Neighbors come from street and legal description matching, not maps.
- Lands Available price without a clerk statement is an estimate (interest and later taxes are approximations).
- Auction competition starts as a guess per county size and property type until you record real results.

Estimates only. Not an appraisal, title search, or legal advice.

## Layout

```
src/core     state neutral engine: csv, valuation, neighbors, strategies, competition, report
src/fl       Florida: NAL reader, use codes, counties, deed costs, risk flags, pipeline
src/cli.ts   command line
config/      assumptions
fixtures/    sample data and its generator
test/        node:test suites
```

Adding Texas later means a `src/tx` folder with its own roll reader, costs (redemption premium), and risk flags; the core stays the same.
