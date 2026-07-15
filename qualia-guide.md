# Qualia Developer Guide

> Follow the road. Type the commands. The framework handles the rest.
> `--auto` chains the whole road end-to-end with only two human checkpoints per project.

Surface: **25 active skills**. Use `/qualia-fix` for broken behavior, `/qualia-feature` for new single-feature work, `/qualia-scope` in PROJECT MODE for kickoff capture, `/qualia-polish --loop` for the autonomous visual loop, and `/qualia-polish --vibe` for fast layout-preserving aesthetic pivots.

For the identity statement see [`SOUL.md`](./SOUL.md). For every skill flag see [`FLAGS.md`](./FLAGS.md). When something breaks see [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md). For release history see [`CHANGELOG.md`](./CHANGELOG.md).

## The Road

```
/qualia-new                ← Set up project (once). Produces JOURNEY.md — all milestones to handoff.
     ↓
For each phase of the current milestone:
  /qualia-plan             ← Plan it (planner + plan-checker, story-file format)
  /qualia-build            ← Build it (builder subagents with pre-inlined context)
  /qualia-verify           ← Check it actually works (goal-backward + per-task AC)
     ↓
/qualia-milestone          ← Close milestone, open next from JOURNEY.md
     ↓
...repeat per milestone until the Handoff milestone...
     ↓
/qualia-polish             ← Design pass (part of Handoff milestone)
/qualia-ship               ← Deploy to production
/qualia-handoff            ← Enforce the 4 handoff deliverables
     ↓
Done.
```

## Auto Mode

Append `--auto` to `/qualia-new` and the framework chains every step:

```
/qualia-new --auto
  → research runs → JOURNEY.md written → approve the whole journey ONCE
  → auto: plan 1 → build 1 → verify 1 → plan 2 → build 2 → verify 2 → ...
  → pause at each milestone boundary: "Continue to M{N+1}?"
  → resume: plan 1 → build 1 → ... of new milestone
  → eventually reaches Handoff milestone's last phase → ship → handoff → report → done
```

**Human gates in auto mode (total: 2 per project):**
1. Journey approval after `/qualia-new` research
2. Each milestone boundary

**Plus one halt case:** if a phase fails verification beyond the gap-cycle limit (default 2), the chain stops and asks for human intervention.

## The Road Commands

| When | Command | What it does |
|------|---------|-------------|
| Starting | `/qualia-new` | Set up project with full journey (all milestones → Handoff) |
| Starting (auto) | `/qualia-new --auto` | Same + chain through building automatically |
| Brownfield | `/qualia-map` | Map an existing codebase BEFORE `/qualia-new` |
| Building | `/qualia-plan` | Plan the current phase |
| | `/qualia-build` | Build it (parallel tasks) |
| | `/qualia-verify` | Check it actually works |
| Milestone | `/qualia-milestone` | Close current, open next from JOURNEY.md |
| Single feature | `/qualia-feature` | Auto-scoped: inline for trivia, fresh spawn for 1-5 files |
| Finishing | `/qualia-polish` | Design and UX pass (scope-adaptive: component / route / app / redesign / critique / quick / loop) |
| | `/qualia-polish --loop` | Autonomous visual-polish loop: screenshot, vision-eval, fix, repeat |
| Pivot the vibe | `/qualia-polish --vibe` | Fast aesthetic pivot (~3 min): swap tokens, keep layout. Propose ONE direction. |
| | `/qualia-polish --vibe --extract <URL>` | Reverse-engineer DESIGN.md from a reference site |
| | `/qualia-polish --vibe --sync` | Show / patch drift between code (CSS vars + Tailwind) and DESIGN.md |
| | `/qualia-ship` | Deploy to production |
| | `/qualia-handoff` | Deliver to client (4 mandatory deliverables) |
| Reporting | `/qualia-report` | Log what you did (mandatory before clock-out) |
| Optimize | `/qualia-optimize --deepen` | Find shallow modules; v5.3+ spawns 3 parallel interface-design variants per candidate |
| Harness eval | `qualia-framework eval --run --write` | Run machine contract checks and write scored eval artifacts for ERP/reporting |
| Planning hygiene | `qualia-framework planning-hygiene scan` | Detect loose `.planning/` reports/assets before they turn into folder bloat |
| Road view | `/qualia-road` | View and navigate journey/milestone/phase status |
| Lost — need next command | `/qualia` | Mechanical state-driven router |
| Confused — need to understand the situation | `/qualia-idk` | Three-scan diagnostic + paste-ready command sequence |

## Full Journey Hierarchy

```
Project
└─ Journey           (the whole arc — mapped upfront by /qualia-new, lives in .planning/JOURNEY.md)
   └─ Milestone      (a release — 2-5 total, Handoff is always last)
      └─ Phase       (a feature-sized deliverable, 2-5 tasks)
         └─ Task     (atomic unit, one commit, one verification contract)
```

Hard rules (enforced by `state.js` and the roadmapper):
- **Milestone count: 2 to 5.** Final milestone is always literally named "Handoff".
- **≥ 2 phases per non-Handoff milestone** (single-phase "milestones" are phases, not milestones).
- **Milestone numbering is contiguous** — no skipped numbers.
- **Handoff milestone has fixed 4 phases:** Polish, Content + SEO, Final QA, Handoff (credentials + walkthrough + archive + ERP report).

## Rules

1. **Feature branches only** — never push to main
2. **Read before write** — don't edit files you haven't read
3. **MVP first** — build what's asked, nothing extra
4. **Every task has a `Why`** (story-file format) — if you can't explain why a task matters in one sentence, it probably shouldn't exist
5. **`/qualia` is your friend** — lost on "what's my next command?" The router reads state and returns the next move.
6. **`/qualia-idk` is your deeper friend** — confused about *the situation itself*. Reads conversation + planning + code, then returns guidance plus a paste-ready Qualia command sequence.

## Profiles

A project runs under one profile, set via `$QUALIA_PROFILE` (defaults to `strict`). `state.js check` surfaces the active profile in its output.

- **`strict`** (default for the team) — hard gates, no waivers. Every gate must pass before the road advances.
- **`standard`** — gates are advisory. A senior may exit a Definition-of-Done gate early, provided the reason is logged to `.planning/decisions/`.

## When You're Stuck

```
/qualia       ← "what's my next command?" (state-driven, instant)
/qualia-idk   ← "what is actually going on here?" (three-scan diagnostic, ~30-45s)
```

If neither helps, paste the error and ask Claude directly. If Claude can't fix it, tell Fawzi.

## Session Start / End

**Start:** Claude loads your project context automatically. The router banner shows your journey position ("M2 of 4 · P2 of 3").
**End:** Run `/qualia-report` — this is the mandatory clock-out submission. It reports what happened during the work shift, even if the work is unfinished. The report is committed to git and (if ERP is enabled) uploaded to https://portal.qualiasolutions.net.

## How It Works (you don't need to know this, but if curious)

- **Journey-first planning:** `/qualia-new` produces JOURNEY.md listing every milestone from kickoff to Handoff with exit criteria and phase sketches. The whole team sees the path on day 1.
- **Context isolation:** Each task runs in a fresh AI brain. Task 50 gets the same quality as Task 1.
- **Pre-inlined context at dispatch:** The builder starts with PROJECT.md, DESIGN.md, and all Context @files already loaded — no wasted orientation reads.
- **Goal-backward verification:** The verifier doesn't trust "I built it." It greps the code to check if things actually work AND walks every task's Acceptance Criteria.
- **Story-file plans:** Every task has Why / Acceptance Criteria / Depends on / Validation inline — the plan IS the brief.
- **Wave execution:** Independent tasks run in parallel. Dependent tasks wait.
- **Milestone-boundary pauses:** In `--auto` mode, the framework pauses only at real decision points. Everything else runs on rails.
- **tracking.json:** Updated locally on push. It feeds local statusline, stop-session-log, and `/qualia-report`; the ERP receives explicit report uploads and does not passively scrape this file from git.

## Quick Reference

| Situation | Run |
|---|---|
| Starting a new client project | `/qualia-new` (or `/qualia-new --auto` to roll end-to-end) |
| Starting a quick throwaway | `/qualia-new --quick` |
| Brownfield project | `/qualia-map` first, then `/qualia-new` |
| Stuck — "what command should I run?" | `/qualia` |
| Confused — "what's actually going on?" | `/qualia-idk` |
| Finished the last phase of a milestone | `/qualia-milestone` |
| About to ship | `/qualia-ship` |
| Client is ready to take over | `/qualia-handoff` |
| End of workday / clock-out | `/qualia-report` (mandatory shift submission) |
