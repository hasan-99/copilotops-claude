---
name: qualia-optimize
description: "Deep improvement discovery pass — spawns parallel specialist agents and writes OPTIMIZE.md/RFCs. Triggers: 'optimize', 'find issues', 'performance audit', 'design alignment check', 'speed up', 'bundle size', 'shallow modules', 'simplify'. Flags: --perf, --ui, --backend, --alignment, --deepen, --fix. Routes practical repair to /qualia-fix or /qualia-polish."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# Qualia Optimize — Deep Codebase + Planning Optimization

## Reference templates

Detailed agent-prompt templates live in `REFERENCE.md` (in this same skill folder). When a step below says "see REFERENCE.md section X", read that section before generating the spawn.

---

Reads `.planning/` docs AND codebase. Never analyze one without the other.

Optimize is discovery-first, not a hotfix lane. If the user has one broken behavior, route to `/qualia-fix`. If the user has visual quality problems, route to `/qualia-polish`. Use optimize when the question is "where can this system get better?"

## Usage

- `/qualia-optimize` — Full (all 7 dimensions + architecture deepening)
- `/qualia-optimize --perf` — Performance only (queries, bundle, render, latency)
- `/qualia-optimize --ui` — Frontend/design/UI only
- `/qualia-optimize --backend` — Backend only (RLS, auth, queries, edge fns)
- `/qualia-optimize --alignment` — Planning-code alignment only
- `/qualia-optimize --deepen` — Architecture deepening only (Ousterhout: shallow modules, deeper interfaces)
- `/qualia-optimize --fix` — Compatibility mode: convert LOW/MEDIUM `.planning/reports/optimize/OPTIMIZE.md` findings into safe repairs, using `/qualia-fix` rules for any code mutation

## Process

### Step 1: Parse Arguments

Mode from $ARGUMENTS. Default: `full`.
Modes: `full`, `perf`, `ui`, `backend`, `alignment`, `deepen`, `fix`.
`--fix` skips to Step 9 (requires `.planning/reports/optimize/OPTIMIZE.md`, with fallback to legacy `.planning/OPTIMIZE.md`) and follows `/qualia-fix` mutation rules.

### Step 2: Load Planning Context (MANDATORY)

Read all (use the shown NO_* marker when missing):

```bash
cat .planning/PROJECT.md 2>/dev/null || echo "NO_PROJECT"
```

```bash
cat .planning/REQUIREMENTS.md 2>/dev/null || echo "NO_REQUIREMENTS"
```

```bash
cat .planning/ROADMAP.md 2>/dev/null || echo "NO_ROADMAP"
```

```bash
cat .planning/STATE.md 2>/dev/null || echo "NO_STATE"
```

```bash
cat .planning/DESIGN.md 2>/dev/null || echo "NO_DESIGN"
```

```bash
cat .planning/CONTEXT.md 2>/dev/null || echo "NO_CONTEXT"
```

```bash
ls .planning/decisions/ 2>/dev/null && cat .planning/decisions/*.md 2>/dev/null || echo "NO_ADRS"
```

Also read rules:
```bash
cat C:\Users\hasan\.claude/qualia-design/frontend.md 2>/dev/null
cat C:\Users\hasan\.claude/rules/security.md 2>/dev/null
```

Store all; inline into agent prompts.

**No planning docs:** warn, proceed. Can optimize raw codebase; can't check alignment.

### Step 3: Discover Codebase

```bash
pwd && node -e "try{const p=require('./package.json');console.log(JSON.stringify({name:p.name,deps:Object.keys(p.dependencies||{}),devDeps:Object.keys(p.devDependencies||{})}))}catch(e){console.log('{}')}" 2>/dev/null
```

```bash
git log --oneline -15 2>/dev/null
```

```bash
git diff --stat HEAD~10..HEAD 2>/dev/null | tail -5
```

```bash
# Project structure
ls -d app/ src/ pages/ components/ lib/ actions/ hooks/ supabase/ types/ 2>/dev/null
```

Classify: `web` | `voice` | `mobile` | `agent` | `edge-functions` | `unknown`

### Step 4: Spawn Wave 1 Agents (parallel)

Spawn in **single message** with multiple Agent() calls per mode:

| Mode | Agents |
|------|--------|
| `full` | frontend + backend + perf-oracle (3 parallel), then arch-strategist (Wave 2) |
| `perf` | perf-oracle only |
| `ui` | frontend only |
| `backend` | backend only |
| `alignment` | alignment prompt only |
| `deepen` | arch-strategist only (skip Wave 1) |

**CRITICAL**: Inline ALL planning context into each prompt. `@` refs don't work across Agent() boundaries.

Spawn parallel: **frontend** (@REFERENCE.md "Frontend agent prompt"), **backend** (@REFERENCE.md "Backend agent prompt"), **perf oracle** (@REFERENCE.md "Performance oracle prompt").

### Step 5: Wave 2 -- Architecture Strategist

`full`: after Wave 1 (synthesizes + deepens). `deepen`: sole agent (no Wave 1).

Spawn **arch strategist** (@REFERENCE.md "Architecture strategist prompt (deepening lens)").

**Skip Wave 2 for single-mode** (`--perf`, `--ui`, `--backend`, `--alignment`). Run for `full` and `deepen`.

### Step 5b: Wave 3 -- Parallel Interface Design (`--deepen` only, after candidate selection)

After the strategist returns deepening candidates, present a numbered list to the user. User picks ONE candidate (or `--auto` mode picks the highest-severity).

For the chosen candidate, spawn **3 fan-out agents in parallel, in the same response turn**, each producing a *radically different* interface design for the proposed deep module. From Matt Pocock's improve-codebase-architecture skill: "spawn three sub-agents in parallel, each must produce a radically different interface for the deepened module."

Spawn 3 (@REFERENCE.md "Parallel interface design prompt"). Each receives:
- The candidate's files, problem, and current shallow signature
- CONTEXT.md domain glossary (use shared terms)
- A *different* design constraint (functional / OOP / event-driven / minimal-surface / hexagonal — assigned per agent so the variants differ in shape, not just naming)

Collect all 3 proposals. Present to the user as a side-by-side table:

| # | Interface shape | Locality gain | Testability | Migration cost |
|---|---|---|---|---|
| 1 | {sketch} | {what concentrates} | {seams} | {N callers updated} |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |

User picks `1`, `2`, `3`, or `hybrid` (with notes on which elements from which proposals to combine). The synthesizer then writes a "Refactor RFC" to `.planning/reports/refactor/REFACTOR-{slug}.md` and optionally opens a GH issue.

**Why parallel + radically different**: a single deepening proposal anchors on the first idea the LLM has. Three parallel proposals with diverse design constraints surface trade-offs the user can see at a glance — and the human's "taste" dominates the choice rather than the agent's first instinct. Empirically (Matt Pocock + Qualia internal testing) this produces dramatically better refactor RFCs than a single-pass proposal.

**Skip Wave 3 for `full` mode** (too many candidates to fan out per-candidate). Run for `--deepen` only when a candidate is selected.

### Step 6: Alignment Check (`full` and `alignment` modes)

`alignment`: sole analysis. `full`: alongside Wave 1.

Read REQUIREMENTS.md + ROADMAP.md. Per req marked "Complete" or mapped to completed phase:

```bash
# Find completed requirements
grep -E "Complete|✓" .planning/REQUIREMENTS.md 2>/dev/null
```

Per completed req:
- Grep for evidence (routes, components, endpoints)
- Not found: flag "Claimed complete but not implemented"

Orphan scan:
```bash
# Find all routes/pages
find app -name "page.tsx" -o -name "route.ts" 2>/dev/null
# Find all API routes
find app/api -name "route.ts" 2>/dev/null
```

Cross-ref with REQUIREMENTS.md; route NOT in reqs: "Undocumented feature".

### Step 7: Collect and Score

All agents done:
1. Deduplicate (same file:line, keep most detailed)
2. Sort: CRITICAL first
3. Group by dimension: Perf, Design, UI, Backend, Frontend, Alignment, Architecture
4. Count per severity.

### Step 8: Write OPTIMIZE.md and Present Results

Create the report directory and write to `.planning/reports/optimize/OPTIMIZE.md`:

```bash
mkdir -p .planning/reports/optimize
```

```markdown
---
date: {YYYY-MM-DD HH:MM}
mode: {full|perf|ui|backend|alignment}
critical: {N}
high: {N}
medium: {N}
low: {N}
status: {clean|needs_attention|critical_issues}
---

# Optimization Report

**Project:** {name} | **Mode:** {mode} | **Date:** {date}

## Summary

{2-3 sentence overview}

{If status is clean: "No critical issues found. Project is in good shape."}

## Critical Issues

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
{findings}

## High Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
{findings}

## Medium Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
{findings}

## Low Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
{findings}
```

Commit:
```bash
git add .planning/reports/optimize/OPTIMIZE.md && git commit -m "docs: optimization report ({mode} mode, {critical} critical)"
```

**Present results:**

If CRITICAL findings exist:
```
{critical} critical issues found. Options:

1. Create a fix phase in ROADMAP.md for critical + high findings
2. Repair a specific blocker: /qualia-fix {finding}
3. Convert LOW/MEDIUM findings into safe repairs: /qualia-optimize --fix
4. Review full report: cat .planning/reports/optimize/OPTIMIZE.md
```

If no CRITICAL:
```
Optimization complete. {total} findings ({high} high, {medium} medium, {low} low).
Report: .planning/reports/optimize/OPTIMIZE.md

Run /qualia-fix for a specific defect, or /qualia-optimize --fix only for safe LOW/MEDIUM cleanup from this report.
```

### Step 9: --fix Mode

`--fix` mode is a compatibility cleanup lane, not a replacement for `/qualia-fix`.

1. Read `.planning/reports/optimize/OPTIMIZE.md` (fallback: `.planning/OPTIMIZE.md` for older projects); missing: "Run /qualia-optimize first"
2. Filter to LOW + MEDIUM only
3. Per finding with clear, safe fix, apply `/qualia-fix` mutation rules:
   - Read target file
   - Apply fix
   - Verify (npx tsc --noEmit if TS)
4. Update OPTIMIZE.md: mark fixed, recount severities
5. Commit
6. Report fixed vs remaining

**Never auto-fix CRITICAL/HIGH.** Require human judgment. If a finding is an actual broken behavior, use `/qualia-fix {finding}` instead of burying it in optimize.

### Step 10: Gap Phase Creation (user picks option 1)

1. Read ROADMAP.md, find current phase
2. Insert `Phase {N}.1: Optimization Fixes (INSERTED)`
3. Map CRITICAL + HIGH findings as success criteria
4. Update STATE.md
5. Commit
6. Suggest: "Fix phase created. Run `/qualia-plan {N}.1`"
