# Deal Finder: How the team works

Who reads this: Muse, Codex, ChatGPT, Claude, Claude Code, and Andres.
Read this, then `docs/dealfinder/DECISION.md`, then `dealfinder/README.md`.

## Roles

| Seat | Who | Job | Does not |
|---|---|---|---|
| Lead | Claude (chat and Claude Code) | Product calls, research, writes the code, writes issues, decides what is next | Merge to main without Andres |
| Operator | Muse | Downloads real data, runs the tool on its own computer, posts results, reports errors, handles anything that needs a real browser or a login | Change engine logic without an issue assigned to Muse |
| Reviewer | Codex | Independent review of every pull request: math, logic, edge cases, tests. Can open fix PRs for bugs it finds | Rewrite features or change product decisions |
| Challenger | ChatGPT | Attacks big decisions (state choice, strategy model, competition model) before we commit to them | Day to day work |
| Owner | Andres | Approves gates (see below), owns the budget, makes money decisions | Relay messages by hand; that is what GitHub is for |

## Where we talk

1. **GitHub is the source of truth.** Every task is an issue. Every result is a comment on its issue. Every code change is a pull request.
2. **This chat** is for quick coordination. Anything decided in chat gets written into the issue it belongs to, or it did not happen.
3. The hub issue titled **"Deal Finder: team hub"** lists what is open and who has it. Check it first.

## Labels

| Label | Meaning |
|---|---|
| `dealfinder` | Anything in this project |
| `agent:claude` / `agent:muse` / `agent:codex` / `agent:chatgpt` | Who owns the next step |
| `needs:andres` | Blocked on Andres (a gate, a login, a money decision) |
| `status:blocked` | Cannot move; the comment says why |
| `type:data-run` | Running the tool on real county data |
| `type:review` | Code review request |
| `type:challenge` | Decision to attack |

When you finish your part, move the `agent:` label to whoever is next.

## Comment format

Start every handoff comment like this, so anyone can pick it up cold:

```
FROM: Muse
TO: Claude
STATUS: done | blocked | question
WHAT I DID: ...
RESULT: ... (numbers, file names, error text pasted in full)
NEXT: what the TO seat should do
```

Paste error messages in full. Do not summarize them.

## Rules

1. Never push to `main`. Work on a branch, open a pull request. Andres merges.
2. Branch names: `dealfinder/<short-topic>` (for example `dealfinder/fix-lake-parser`).
3. Every pull request: `cd dealfinder && npm test` must pass. Codex reviews before Andres merges.
4. Budget is never hardcoded and never committed. It lives only in `dealfinder/my-settings.json` on the machine that runs the tool (git ignores that file).
5. **This repo is public.** Do not commit or post:
   - `my-settings.json` or any budget number
   - reports made without `--public`
   - full NAL tax roll files (too big; download them fresh)
   - anything personal about Andres
   Post reports made with `--public` only. Those apply no budget and print none.
6. Do not invent data. If a file, column, or number is missing, say so in the issue.
7. Real money gates need Andres: paying for any data or service, requesting a clerk statement in his name, bidding, or buying.

## Gates where Andres approves

| Gate | When |
|---|---|
| G1 | First real county run looks sane (Claude posts the read of it) |
| G2 | Merge the branch to main |
| G3 | Any spending (data, quiet title attorney, deposits) |
| G4 | Any bid or purchase |

## How a data run works (Muse)

```
git clone https://github.com/garzonandres2004/taxproperty
cd taxproperty && git checkout dealfinder-florida && cd dealfinder
node --version          # must be 22.18 or newer
npm test                # must pass before anything else
node src/cli.ts analyze --nal <NAL file> --lands <list.txt> --public --out reports/<county>
```

Then comment on the issue with: the console output, the `reports/<county>.md` file attached or pasted, the first 30 lines of the list text file, the NAL header row, and any error in full.

## Definition of done for a task

- The issue says what was done, with evidence (output, numbers, links).
- Code changes have tests and pass `npm test`.
- The `agent:` label points at whoever is next, or the issue is closed.
