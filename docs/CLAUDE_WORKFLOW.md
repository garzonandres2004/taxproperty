# CLAUDE_WORKFLOW.md

## Purpose
This document defines how Claude Code should be used in this project so work stays structured, efficient, and safe.

The goal is not just to "generate code."
The goal is to build a maintainable county-based property research platform that can scale from Utah counties to multiple US states.

---

## Roles

### Claude Code Main Session
The main Claude Code session acts as the lead engineer.

It is responsible for:
- reading project docs
- understanding repo state
- planning the next step
- coordinating sub-tasks
- making final integration decisions
- updating docs when architecture changes

The main session should not blindly rush into coding.

### Optional Subagents
Subagents are specialists used for focused, isolated tasks.

Good use cases:
- researching one county's sources
- comparing parser patterns
- auditing current code for hardcoded county logic
- checking report readiness for an existing county
- drafting an adapter skeleton

Subagents should return findings, not make uncontrolled repo-wide changes.

### Perplexity / external strategist
Use Perplexity for:
- architecture decisions
- product direction
- county/state research strategy
- roadmap design
- prompt design for Claude Code

---

## Session Types

### 1. Planning Session
Use when: starting a new county, beginning a large refactor, deciding architecture, preparing for expansion

Expected output: repo audit, list of assumptions, next-step plan, risks/blockers, recommendation for safest implementation order

No major coding should happen until the plan is accepted.

### 2. Build Session
Use when: implementing a clear scoped task, writing adapters, adding importers, wiring UI to already-planned backend changes

Expected output: exact files changed, what behavior changed, what still needs QA

### 3. QA Session
Use when: verifying county completeness, checking report behavior, verifying score rendering, ensuring maps/links/zoning all work

Expected output: pass/fail checklist, bug list, suggested fixes, completeness status

### 4. Research Session
Use when: onboarding a county, identifying sources, comparing counties, planning multi-state expansion

Expected output: source list, source confidence, automation feasibility, recommended next implementation step

---

## Core Workflow

For most serious tasks, follow this order:

1. Read docs
2. Audit current implementation
3. State assumptions
4. Propose plan
5. Wait for approval if architecture impact is meaningful
6. Implement in small steps
7. Summarize changes
8. Update docs if needed
9. Recommend QA

Do not skip straight from "read request" to "large code rewrite."

---

## File Reading Order

At the beginning of a major session, read in this order:

1. `CLAUDE.md`
2. `docs/MASTER_BLUEPRINT.md`
3. `docs/COUNTY_STANDARD.md`
4. `docs/COUNTY_REGISTRY.md`
5. relevant current implementation files

---

## County Onboarding Workflow

When adding a new county, do not start by writing UI code.

### Step 1 — Source Discovery
Find and document: official auction list source, source format, assessor or parcel lookup, recorder/title access, tax history access, GIS/parcel map, zoning or planning path

Record findings in `docs/COUNTY_REGISTRY.md`.

### Step 2 — Feasibility Assessment
State: what can be automated, what is semi-automated, what must remain manual for now

### Step 3 — Adapter Planning
Define: county adapter file, import strategy, external link builders, enrichment opportunities, fallback behavior

### Step 4 — Implementation
Build: adapter, import script, links, county config, any shared abstractions needed

### Step 5 — QA
Verify on 5–10 real properties: parcel normalization, address usability, maps, links, scoring, report support, zoning messaging

### Step 6 — Completeness Rating
Assign internal status: NOT_STARTED / LIST_IMPORTED / BASIC_USABLE / ADVANCED_USABLE / INVESTOR_READY / REFERENCE_QUALITY

---

## Refactor Workflow

### Before coding
Claude should answer:
1. What is hardcoded today?
2. What should be shared?
3. What can be safely extracted without changing behavior?
4. What is the minimum refactor path?

### Refactor rule
Refactors should preserve working behavior first.
Do not combine architecture cleanup with unrelated product changes unless explicitly approved.

### After coding
Claude should report: what was extracted, what stayed hardcoded temporarily, what should be migrated next, what needs regression testing

---

## Recommended Prompt Templates

### Template A — Audit before implementation
```
Read CLAUDE.md and relevant docs first.

Audit the current implementation for [feature/domain].
Tell me:
1. what already exists,
2. what is hardcoded,
3. what should become reusable,
4. the safest next step.

Do not code yet.
```

### Template B — Build a county adapter
```
Read CLAUDE.md and docs first.

Implement support for [County, State] using the existing architecture.
Tasks:
1. create or update the county adapter,
2. create import logic for the county source,
3. build external links,
4. add any clearly necessary shared utilities,
5. do not break Utah County behavior.

At the end, summarize changed files and remaining QA needs.
```

### Template C — QA a county
```
Audit [County, State] in the current app using real properties.

Check: parcel normalization, address quality, maps/photos, assessor links, recorder links, tax history links, zoning/planning messaging, scoring display, report readiness.

Return: pass/fail checklist, bugs, missing data layers, completeness status.
```

### Template D — Research a county
```
Research [County, State] for tax sale platform onboarding.

Find: official auction list source, format, assessor source, recorder source, tax history source, GIS/parcel map, zoning/planning path.

Then say: what is automatable, what is semi-automatable, what is manual, and what the recommended integration path is.

Do not code yet.
```

---

## When to Use One Session vs Subagents

### Use one main session when:
- editing core repo files
- working on one feature deeply
- doing a careful refactor
- debugging behavior across multiple connected files

### Use subagents when:
- tasks are independent
- research can be split cleanly
- audits can be run in parallel

Examples:
- agent A = assessor research
- agent B = recorder research
- agent C = zoning/planning research
- lead = synthesis

### Do not use parallel agents when:
- the same files will be edited at once
- the task depends on strict sequential context
- the request is too vague
- the lead has not defined the architecture yet

---

## Model Usage Guide

### Use Sonnet 4.6 for:
- most code writing
- adapters, parsers, UI wiring
- ordinary debugging
- 90% of daily work

### Use Opus 4.7 for:
- architecture review
- hard bugs
- multi-state strategy
- difficult county analysis
- max 1-2 times per week

### Use Kimi (Ollama) for:
- exploration only (reading files, searching)
- when Anthropic credits run low
- zero-cost tasks that don't need code generation

---

## Safety Rules

Claude should pause and ask before:
- changing schema in a major way
- removing or replacing scoring logic
- changing existing report behavior significantly
- introducing a large dependency
- deleting working Utah County logic

Claude should not:
- fake source confidence
- silently ignore broken links
- leave major missing fields unexplained
- report success without naming files changed

---

## Output Format Expectations

For major tasks, Claude should structure replies like this:

### 1. Understanding
Short summary of what the task is.

### 2. Findings
What exists now.

### 3. Risks / assumptions
What could break or what is uncertain.

### 4. Plan
Numbered steps.

### 5. Changes made
Exact files changed and what changed.

### 6. Remaining work
What still needs QA or follow-up.

---

## Session Start Prompt

Use this at the beginning of a serious Claude Code session:

```
Read CLAUDE.md and all available docs first.

Then:
1. audit the current repo state,
2. identify the current priority,
3. list the safest next steps,
4. point out any architectural risks,
5. wait for approval before major refactors.

Do not start coding immediately unless the task is explicitly small and isolated.
```
