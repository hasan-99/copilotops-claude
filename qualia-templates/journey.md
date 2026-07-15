---
project: "{Project Name}"
total_milestones: {N}
current_milestone: 1
created: {date}
---

# {Project Name} — Journey

The full arc from kickoff to client handoff. Every milestone. Every exit criterion.
This file is the **North Star** — all planning downstream must stay architecturally
consistent with it.

## Mission

{one-paragraph description of what this project delivers and for whom}

## The Path ({N} milestones to handoff)

```
M1 ─── M2 ─── M3 ─── ... ─── M{N} (Handoff)
│
└── [CURRENT]
```

---

## Milestone 1 · {Name}     [CURRENT]

**Why now:** {one-sentence reason this is the first release — what foundation it lays}

**Exit criteria** (what "shipped" means for M1):
- {observable outcome 1}
- {observable outcome 2}
- {observable outcome 3}

**Phases:**
1. **{Phase Name}** — {one-line goal}
2. **{Phase Name}** — {one-line goal}
3. **{Phase Name}** — {one-line goal}

**Requirements covered:** {REQ-IDs — e.g. AUTH-01, AUTH-02, CORE-01}

**Research flags:** {any phases that may need deeper research during planning}

---

## Milestone 2 · {Name}

**Why now:** {plain-language reason this follows M1}

**Exit criteria:**
- {observable outcome 1}
- {observable outcome 2}

**Phases:**
1. **{Phase Name}** — {one-line goal}
2. **{Phase Name}** — {one-line goal}
3. **{Phase Name}** — {one-line goal}

**Requirements covered:** {REQ-IDs}

---

## Milestone 3 · {Name}

**Why now:** {reason}

**Exit criteria:**
- {outcome}
- {outcome}

**Phases:**
1. **{Phase Name}** — {one-line goal}
2. **{Phase Name}** — {one-line goal}

**Requirements covered:** {REQ-IDs}

---

## Milestone {N} · Handoff     [FINAL]

**Why now:** Production-ready for real users and client takeover.

**Exit criteria:**
- Deployed on production domain with HTTP 200 + auth flow verified
- Client has credentials, runbook, and recorded walkthrough
- `.planning/archive/` contains every milestone's verification reports
- ERP `lifetime.milestones_completed` reflects this milestone

**Phases (standard for every project):**
1. **Polish** — design pass, responsive, accessibility, empty/error states
2. **Content + SEO** — real copy, metadata, sitemap, robots, analytics
3. **Final QA** — full-flow test, cross-browser, edge cases, `/qualia-review`
4. **Handoff** — credentials doc, client walkthrough, domain transfer, support clause

**Requirements covered:** {REQ-IDs — typically ops/quality/handoff categories}

---

## Rules for This Journey

1. **No milestone ceiling — the arc spans the whole agreed scope.** Plan as many milestones as the capability inventory (discovery §9) needs to reach the §10 done-state. Do NOT compress real work to hit a number, and do NOT defer agreed work to a "v2" — the only deferrals are what the client explicitly marked Out of Scope (discovery §8). An arc that stops short of the agreed scope is the root cause of teams improvising off-plan later.
2. **Hard floor: 2 milestones.** Anything smaller should use `/qualia-new --quick` instead.
3. **In BUILD mode, the final milestone is Handoff.** This is the convention for a one-shot client build that ends with a handoff. It is **not** a universal law: once a project launches and enters the `operate` lifecycle (`state.js launch`), it becomes an *update stream* with no forced Handoff — it ships updates indefinitely. Don't author a Handoff milestone for a product/retainer that will keep shipping; launch it instead.
4. **Milestones ≥ 2 phases OR are a shipped release gate.** A 1-phase milestone is a phase, not a milestone.
5. **Numbering is contiguous.** No skipped milestone numbers.
6. **Progressive detail is OK.** M1 is fully detailed (ready for `/qualia-plan`). M2..M{N-1} have phase names + one-line goals. Full phase detail gets written by roadmapper when the milestone opens.
7. **Exit criteria are observable.** "User can do X" not "Feature Y works."

---

*Last updated: {date}*
