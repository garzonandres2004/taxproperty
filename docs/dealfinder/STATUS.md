# Deal Finder: Status

Last updated: Nov 13, 2026, afternoon (Mountain time). Written by Claude. Read this first; details live in the linked issues.

## One line

The tool works on real Florida data and produced its first buy candidate (186 Harvey Dr, Putnam). The map check showed it was a 25 ft wide strip, so Andres passed, and his rule is now in the tool: strips are a pass, and vacant land needs a measured width before it can be a buy. Auctions in Lake and Putnam sold vacant land well above the model's assumed price, so the plan stays on fixed price parcels (Lands Available, bought with a clerk statement).

## What is built (on `main`)

| Piece | What it does |
|---|---|
| Tax roll reader | Reads the Florida DOR NAL file for any county (all 67 use the same columns) |
| List reader | Reads Lands Available and auction lists as CSV or text pasted from a PDF, including Putnam's official list format |
| Value estimate | Uses nearby arm's length sales, with confidence that drops when the sales disagree or are missing |
| Costs | Doc stamps, recording, later taxes and interest (rough estimate), clerk statement when given |
| Risk flags | Swamp, slivers, strips (by measured width), HOA land, government owners, homestead, condo, mobile home, escheat (3 year) date, county only 90 days, future or missing dates, and more |
| Exits | Sell to a neighbor, quiet title and list, wholesale, flip, rent, each with profit, months, cash needed and financing fit |
| Verdicts | Buy candidate only with a real clerk statement, a usable date, a value that is not a guess and, for vacant land, a measured width of 50 ft or more; everything else is Get a quote, Watch, Pass or Avoid |
| Budget | Only from your settings file, never in the repo; public reports show none |
| Competition | Estimates the final auction price; learns from real results (record and calibrate) |

Tests: 105 on `main` (fe71d5c, after PR #33). PR #34 (strip rule) brings it to 110. Every change is reviewed by Codex before it merges; while Codex is down (Nov 13), see "What needs you".

## What real data showed

| Run | Result |
|---|---|
| Lake County tax roll | 215,805 parcels read, every list line matched, no errors |
| Lake auction list (Nov 17 sale) | 6 parcels looked like bid candidates with no budget applied; none fit a small budget |
| Lake Lands Available | 4 parcels, all pass or avoid |
| Putnam official Lands Available list | 55 parcels: 4 get a quote, 51 pass, 0 buy. The 4: 186 Harvey Dr (statement requested Nov 11), 108 Tree Farm Rd and 107 Dickens St (open to the public about Dec 15), and a parcel with no address that turned out to be two thin strips (pass) |
| **Lake past auctions backtest** (30 results, 5 sale days, Apr to Nov 2026; same numbers after the fixed code was merged) | **Vacant land sold at a median 108% of estimated value** (15 sales; the model had assumed 45%). Bidding went higher than the model expected in 14 of 18 sales. The model's ceiling met the winning bid only 2 times in 18, both cheap outliers |
| **Putnam past auctions backtest** (3 sale days, Oct 7 to Nov 4 2026, 195 parcels, 157 sold) | Vacant sold at a median **74%** of value (131 sales; small county assumption 35%). Improved sold at **33%** (23 sales; assumption 60%), but 20 of the 23 were mobile homes, so it is a mobile home signal, not a house signal |
| **Gilchrist past auctions backtest** (9 sale days, 82 parcels, 53 sold) | Only the 7 sales from 2026 count (the rest are 2017, valued against today's roll): vacant 40% (n=4), improved 35% (n=2). Too few to act on |
| **186 Harvey Dr** (Putnam Lands Available) | Clerk statement $1,859.36, good until Nov 30. The tool said buy candidate (score 75). Map check: about 25 ft wide by 629 ft long, so only an adjoining owner would want it. **Andres passed on Nov 13** ("strips don't work"). Nothing bought |

## What that means

1. Vacant land at auction sold well above the model's assumed price in both Lake (108% of value) and Putnam (74%). An auction strategy for vacant land on a small budget is not supported by the data so far.
2. The fixed price route (Lands Available) is still the one channel where nobody can outbid you. Most parcels on it are junk, so the tool's job there is filtering, then a clerk statement before any money.
3. Most of the small counties checked so far (25 or more RealTDM sites) do not publish a live Lands Available list there. For those, the next approach is asking the clerk for the list.
4. The tax roll has a parcel's area but not its shape. The first real buy candidate was a strip, so every vacant parcel now needs a width measured on the GIS map before it can be a buy.

## What happens next

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Backtest small counties' past auctions to find any market that sells under value | Muse collects, Claude reads | Putnam and Gilchrist done (above). Washington still to run |
| 2 | Review and merge the backtest command (PR #27) | Codex, then Muse | Merged as 9bdeae1. Follow ups: PR #29 (review notes) merged as 3d898e1; PR #30 (reads Muse's one line per item results) merged as c3795aa |
| 3 | ChatGPT challenge of the whole plan (issue #20) | ChatGPT via Muse | Not started |
| 4 | Rebuild the Lake calibration with the fixed code and re-run the Nov 17 list | Muse | Done Nov 12: Lake vacant calibrated at 108% of value (15 sales). With it the Nov 17 list is 0 buy, 16 watch, 3 pass, 1 avoid (was 6 buy before calibration). The calibration stays local, not in the repo, until the Nov 17 results are added |
| 5 | 186 Harvey Dr | Andres | Done: passed Nov 13 (strip) |
| 6 | Nov 17 Lake sale: record results, no bidding | Muse | Nov 17 |
| 7 | Statements for 108 Tree Farm Rd and 107 Dickens St | Muse, with your OK | **Measure both widths on the GIS map first.** Then request in early December so they are ready when the parcels open to the public about Dec 15; any purchase needs your approval |
| 8 | Strip rule in the tool (PR #34: `--widths`, STRIP, WIDTH_NOT_CHECKED) | Claude | Built, 110 tests pass; waiting on review |

## What needs you

You approve any spending, any bid and any purchase. Merging code is delegated to Muse after a Codex pass.

**Nov 13: Muse and Codex are down.** Until they are back, there is no Codex review and no one to merge. Data runs (tax roll files, county lists, live browser) and the Nov 17 Lake recording also sit with Muse. Claude keeps working on code and docs, and PRs wait open unless you say Claude may merge them.

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
