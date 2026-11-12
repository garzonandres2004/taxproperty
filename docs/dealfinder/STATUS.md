# Deal Finder: Status

Last updated: Nov 12, 2026 (night of Nov 11, Mountain time). Written by Claude. Read this first; details live in the linked issues.

## One line

The tool works on real Florida data. In the first real backtest, Lake County auctions sold vacant land at a median 108% of estimated value, so auctions are an unproven strategy for a small budget. The plan stays on fixed price parcels (Lands Available, bought with a clerk statement) while we test small counties to see if any auction market is cheaper.

## What is built (on `main`)

| Piece | What it does |
|---|---|
| Tax roll reader | Reads the Florida DOR NAL file for any county (all 67 use the same columns) |
| List reader | Reads Lands Available and auction lists as CSV or text pasted from a PDF, including Putnam's official list format |
| Value estimate | Uses nearby arm's length sales, with confidence that drops when the sales disagree or are missing |
| Costs | Doc stamps, recording, later taxes and interest (rough estimate), clerk statement when given |
| Risk flags | Swamp, slivers, HOA land, government owners, homestead, condo, mobile home, escheat (3 year) date, county only 90 days, future or missing dates, and more |
| Exits | Sell to a neighbor, quiet title and list, wholesale, flip, rent, each with profit, months, cash needed and financing fit |
| Verdicts | Buy candidate only with a real clerk statement, a usable date and a value that is not a guess; everything else is Get a quote, Watch, Pass or Avoid |
| Budget | Only from your settings file, never in the repo; public reports show none |
| Competition | Estimates the final auction price; learns from real results (record and calibrate) |

Tests: 94 on the backtest branch, 86 on `main`. Every change is reviewed by Codex before it merges.

## What real data showed

| Run | Result |
|---|---|
| Lake County tax roll | 215,805 parcels read, every list line matched, no errors |
| Lake auction list (Nov 17 sale) | 6 parcels looked like bid candidates with no budget applied; none fit a small budget |
| Lake Lands Available | 4 parcels, all pass or avoid |
| Putnam official Lands Available list | 55 parcels: 4 get a quote, 51 pass, 0 buy. The 4: 186 Harvey Dr (statement requested Nov 11), 108 Tree Farm Rd and 107 Dickens St (open to the public about Dec 15), and a parcel with no address that turned out to be two thin strips (pass) |
| **Lake past auctions backtest** (30 results, 5 sale days, Apr to Nov 2026) | **Vacant land sold at a median 108% of estimated value** (15 sales; the model had assumed 45%). Bidding went higher than the model expected in 14 of 18 sales. The model's ceiling met the winning bid only 2 times in 18, both cheap outliers |

## What that means

1. The sampled Lake auctions were expensive relative to value for vacant land (median 108%). Discounts did happen: 2 of 18 sales closed at 28% and 32% of value. With so few, an auction strategy for a small budget is unproven, not ruled out.
2. The fixed price route (Lands Available) is still the one channel where nobody can outbid you. Most parcels on it are junk, so the tool's job there is filtering, then a clerk statement before any money.
3. Most of the small counties checked so far (25 or more RealTDM sites) do not publish a live Lands Available list there. For those, the next approach is asking the clerk for the list.

## What happens next

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Backtest 6 small counties' past auctions to find any market that sells under value | Muse collects, Claude reads | Collection in progress; no results yet |
| 2 | Review and merge the backtest command (PR #27) | Codex, then Muse | Fixes pushed, re-review pending |
| 3 | ChatGPT challenge of the whole plan (issue #20) | ChatGPT via Muse | Not started |
| 4 | Rebuild the Lake calibration with the fixed code and re-run the Nov 17 list | Muse | Pending |
| 5 | Clerk reply for 186 Harvey Dr | Muse checks email | Waiting |
| 6 | Nov 17 Lake sale: record results, no bidding | Muse | Nov 17 |
| 7 | Statements for 108 Tree Farm Rd and 107 Dickens St | Muse, with your OK | Request in early December so they are ready when the parcels open to the public about Dec 15; any purchase needs your approval |

## What needs you

Nothing tonight. You approve any spending, any bid and any purchase. Merging code is delegated to Muse after a Codex pass.

## Where to look

| Topic | Place |
|---|---|
| Why Florida and Lands Available | `docs/dealfinder/DECISION.md` |
| How the team works | `docs/dealfinder/TEAM.md` |
| How to run the tool | `dealfinder/README.md` |
| Real data runs and the backtest | Issue #18 |
| Code reviews | Issue #19 |
| Plan challenge | Issue #20 |
| Hub | Issue #21 |
