---
name: qualia-road
description: "Terminal workflow map — Project → Journey → Milestones → Phases → Tasks. For headless/SSH/no-browser sessions. Triggers: 'show me the road', 'what's the workflow', 'how does Qualia work', SSH context."
disable-model-invocation: true
allowed-tools:
  - Read
---

# The Qualia Road — Project Workflow Map

**Hierarchy:** Project → Journey → Milestones (2–5, Handoff always last) → Phases (2–5 tasks each) → Tasks (one commit, one verification contract).

```
/qualia-new        → kickoff + parallel research + JOURNEY.md (all milestones upfront)
                     add --auto to chain the whole road end-to-end
     ↓
For each milestone, for each phase:
  /qualia-plan     → plan the phase (planner + plan-checker revision loop, fresh context)
  /qualia-build    → build it (builder subagents per task, wave-based parallel)
  /qualia-verify   → goal-backward check (verifier agent, fresh context)
     ↓
/qualia-milestone  → close milestone, archive artifacts, prep next (human gate)
     ↓ (repeat for each milestone until Handoff)

Final milestone = Handoff:
  /qualia-polish   → final design pass (whole app)
  (content + SEO)  → Phase 2
  (final QA)       → Phase 3
  /qualia-ship     → deploy to production (quality gates → deploy → verify)
  /qualia-handoff  → 4 deliverables: credentials, doc, final update, report
     ↓
Done.
```

## Design as a thread
Every road agent loads `PRODUCT.md + DESIGN.md + design-laws.md` substrate. Builders run `slop-detect` on every frontend commit. Verifiers score 9 design dimensions per phase, including visual system and graphics.

## /qualia-polish is scope-adaptive
```
/qualia-polish src/components/Button.tsx     ~30s component touch-up
/qualia-polish app/dashboard                 ~3m  section pass
/qualia-polish                               ~12m whole app, fan-out
/qualia-polish --redesign                    ~30m ground-up redesign + complex visual concept
/qualia-polish --critique                    read-only scored audit
/qualia-polish --quick                       ~1m  gates only
```

## Design pivots — /qualia-polish --vibe
```
/qualia-polish --vibe                              fast aesthetic pivot: ONE proposed direction, swap tokens, keep layout (~3 min)
/qualia-polish --vibe brutalist                    explicit pivot to named direction
/qualia-polish --vibe --variants 3                 opt-in menu (rare; default flow is one-opinion)
/qualia-polish --vibe --extract https://stripe.com reverse-engineer DESIGN.md from a reference URL
/qualia-polish --vibe --extract ./inspo.png        same, from a local screenshot
/qualia-polish --vibe --sync                       show drift between code (CSS vars, Tailwind config) and DESIGN.md
/qualia-polish --vibe --sync --write               patch DESIGN.md to match code, commit
```
`/qualia-polish --vibe` is for the WHOLE-SITE aesthetic. For surgical component-level fixes use `/qualia-polish` (component or section scope). For ground-up structural redesign use `/qualia-polish --redesign`.

## /qualia-polish --loop — autonomous visual QA
```
/qualia-polish --loop http://localhost:3000               screenshot + eval + fix loop
/qualia-polish --loop {url} --max 4                       cap iterations
/qualia-polish --loop {url} --ref design.png              anchor to reference image
/qualia-polish --loop {url} --reduced-motion              force prefers-reduced-motion
/qualia-polish --loop --routes /a,/b,/c                   multi-route sweep
```
Screenshots at 3 viewports (375/768/1440), scores 9 design dimensions using vision, fixes issues, re-screenshots, loops until all dims >= 3 or kill-switch triggers. Per-iteration git commits for clean revert.

## Deterministic-enforcement skills
```
/qualia-optimize --deepen   spawns 3 parallel interface-design variants per candidate (Step 5b)
```
`/qualia-optimize --deepen` produces dramatically better refactor RFCs because 3 radically-different interfaces are surfaced and the human picks/hybridizes.

## Alignment substrate
Before high-stakes phases, run alignment skills against `.planning/CONTEXT.md` (domain glossary) and `.planning/decisions/` (ADRs):

```
/qualia-scope            → relentless one-question interview, updates CONTEXT.md inline
/qualia-optimize --deepen  → find shallow modules, propose Ousterhout-style refactors
/qualia-test --tdd         → vertical-slice red→green→refactor for one feature
/qualia-map                → adapt Qualia to an existing brownfield repo's conventions (5th onboarding agent)
```

## Auxiliary commands
```
Lost?        → /qualia        (state router — tells you the next command)
Don't-know?  → /qualia-idk    (deep diagnostic — three isolated scans + paste-ready command sequence)
Health?      → /qualia-doctor (install, state, contracts, memory, ERP queue)
Stuck/weird? → /qualia        (diagnostic branch — scans planning + code when state alone is insufficient)
Broken thing? → /qualia-fix     (root cause, minimal patch, verify, report)
Single feature? → /qualia-feature (new capability: inline for trivia, fresh spawn for 1-5 files)
Research it? → /qualia-research (per-phase deep research before planning; writes phase-{N}-research.md)
Save a lesson? → /qualia-learn (persist a pattern/fix/client preference across sessions + projects)
Secure config? → /qualia-secure (audit CLAUDE.md / settings.json / hooks / MCP for injection + leaks)
Verify FAILed? → /qualia-postmortem (self-heal — find which rule/agent should have caught it)
Paused?      → /qualia        (restore from .continue-here.md or STATE.md)
End of day?  → /qualia-report (mandatory before clock-out; writes ERP payload)
Unsure plan? → /qualia-scope (capture decisions before planning)
Invoice/email? → /zoho-workflow (Zoho Invoice + Mail ops — invoices, cover emails, contacts, inbox)
```

## Outside-road command boundaries
```
Need a repair?       → /qualia-fix       (mutates code, proves fix)
Need an investigation? → /qualia-review  (read-only audit) or /qualia-fix (known broken behavior)
Need an audit?       → /qualia-review    (detect-only, scored findings)
Need improvement map? → /qualia-optimize (report/RFC, broad opportunities)
Need visual quality? → /qualia-polish    (style/layout/accessibility)
Need new aesthetic?  → /qualia-polish --vibe (tokens only, layout preserved)
Need new capability? → /qualia-feature   (small net-new work)
```

## Human gates
Journey approval after `/qualia-new`, then one at each milestone boundary via `/qualia-milestone`. `--auto` runs everything between gates automatically.

## Context isolation
Every task runs in a fresh subagent context. Task 50 gets the same quality as Task 1.
- Planner gets: PROJECT.md + CONTEXT.md + phase requirements
- Builder gets: single task from plan + PROJECT.md + CONTEXT.md
- Verifier gets: success criteria + codebase access

No accumulated garbage. No context rot.

## Quality gates (always active via hooks)
- **Frontend guard** — Read `.planning/DESIGN.md` before any frontend changes
- **Deploy guard** — tsc + lint + build + tests must pass before deploy
- **Migration guard** — Catches dangerous SQL (DROP without IF EXISTS, DELETE without WHERE, CREATE TABLE without RLS)
- **Slop-detect** — Em-dash and AI-tells check on every UI commit
- **Intent verification** — Confirm before modifying 3+ files (OWNER role: just do it)

## Tracking
`.planning/tracking.json` is updated locally on every push. It feeds statusline, stop-session-log, and `/qualia-report`; the ERP receives explicit report uploads and does not read this file from git.
Never edit tracking.json manually — hooks update it from STATE.md.

## Compaction — ALWAYS preserve
Project path/name, branch, current phase, modified files, decisions, test results, in-progress work, errors, tracking.json state.
