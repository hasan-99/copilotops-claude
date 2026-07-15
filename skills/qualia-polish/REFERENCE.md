# REFERENCE — /qualia-polish --loop

Verbatim agent prompts and operational details. Loaded on demand by SKILL.md, not carried in the system prompt. Per progressive-disclosure discipline (Matt Pocock): the agent reads SKILL.md first, then this file when it needs the spawn templates.

## Architecture summary

```
SKILL.md driver (Claude session)
  │
  ├─ scripts/playwright-capture.mjs    (deterministic Node — produces PNGs)
  │     ↓ writes /tmp/qpl-{ts}/iter-{N}/{mobile,tablet,desktop}-*.png
  │
  ├─ Agent({subagent_type: "qualia-visual-evaluator", ...})
  │     ↓ reads PNGs, returns single JSON envelope (eval.json)
  │
  ├─ scripts/loop.mjs record           (deterministic — verdict + fingerprints)
  │     ↓ exit 0=SUCCESS, 1=CONTINUE, 3=KILLED
  │
  ├─ Agent({subagent_type: "qualia-builder", ...})  × up to 3 in parallel
  │     ↓ each fixes ONE issue, calls scripts/loop.mjs commit-fix
  │
  └─ scripts/loop.mjs report           (final markdown report)
        ↓ writes .planning/visual-polish-loop.md
```

## Capture: backend selection

The capture script (`scripts/playwright-capture.mjs`) auto-selects in this order:

1. `import('playwright')` — preferred when available; gives deterministic `waitUntil: 'networkidle'`
2. `import('playwright-core')` — same API, lighter package
3. `~/.cache/ms-playwright/chromium-{version}/chrome-{linux64,linux,mac,win}/chrome` — if Playwright was ever installed for browsers but the package isn't import-resolvable
4. `which google-chrome` / `chromium` / `chromium-browser` / `chrome` — system browser fallback

All four backends capture **full-page** (top-to-bottom, including below-fold content), not just the first viewport-height — the evaluator scores card grids, CTAs, and footers, so the capture must contain them. Playwright uses `fullPage: true`; the binary-direct backends omit any fixed `--window-size` height clamp so the headless render extends to the full document height.

For backends 3 and 4 (binary-direct), the script uses `--headless=new --screenshot --virtual-time-budget`. Less precise than Playwright's `networkidle` waiting but works without any npm dependency.

Setup hints if all four fail:

```bash
# Option A — Playwright (best stability)
npm i -D playwright && npx playwright install chromium

# Option B — system Chrome (fastest setup if you already have Chrome installed)
# (no action needed if google-chrome is on PATH)
```

## Vision-evaluator spawn template (VERBATIM)

The vision evaluator's anchored discipline: **DEFAULT TO 3.** Only score above 3 with a cited design principle. Only score below 3 with a quoted violation. Without anchoring, vision models return "looks great!" to everything — that failure mode is the entire reason this loop exists. The full rubric criteria live in `agents/visual-evaluator.md`; this section is the spawn template.

When the loop reaches step 2 (Evaluate), spawn ONE agent with the screenshots, brief, rubric, and previous-iteration context. Inline this prompt verbatim — do not paraphrase.

```
Agent({
  subagent_type: "qualia-visual-evaluator",
  description: "Score iteration {N} screenshots against rubric",
  prompt: `
Role: @C:\Users\hasan\.claude/agents/visual-evaluator.md

<rubric>
{INLINE qualia-design/design-rubric.md §"The 9 dimensions" through §"Aggregate score"}
</rubric>

<brief>
{INLINE the relevant excerpt from .planning/DESIGN.md — sections "Direction", "Color", "Typography"}
</brief>

<product>
{INLINE the relevant excerpt from .planning/PRODUCT.md — register, voice, anti-references}
</product>

<screenshots>
One full-page PNG per viewport (captured top-to-bottom, includes below-fold content):
- mobile (375px):  /tmp/qpl-{ts}/iter-{N}/mobile-375.png
- tablet (768px):  /tmp/qpl-{ts}/iter-{N}/tablet-768.png
- desktop (1440px): /tmp/qpl-{ts}/iter-{N}/desktop-1440.png
</screenshots>

<viewport_meta>
{ "reduced_motion": {true|false}, "viewport_widths": [375, 768, 1440] }
</viewport_meta>

<previous_iteration>
{If N > 1, INLINE eval.json.top_issues from iter-{N-1} so the evaluator can verify regression vs improvement. Otherwise: "(first iteration — no prior data)"}
</previous_iteration>

<task>
This is iteration {N} of {max}. Read each screenshot. Score every dimension 1-5 with one-line evidence per dimension per viewport. Return a single fenced JSON block per the contract in your role file. No prose outside the JSON.
</task>
`
})
```

The evaluator's role file (`agents/visual-evaluator.md`) carries the trust-boundary block, the calibration examples, and the JSON output contract. Together with this spawn template, the prompt prefix is stable across iterations — Anthropic prompt caching reuses the role + rubric + brief prefix, so the per-iteration cost is roughly: 3 image reads + the previous-iteration delta.

## Fix-builder spawn template (VERBATIM)

When the loop has 1-3 issues to fix, spawn one builder per issue IN THE SAME RESPONSE TURN (parallel). Each fixes one dimension, narrowly.

```
Agent({
  subagent_type: "qualia-builder",
  description: "Fix {dim} issue: {short description}",
  prompt: `
Role: @C:\Users\hasan\.claude/agents/builder.md

<phase_context>
You are inside /qualia-polish --loop iteration {N}. The vision evaluator scored
the {dim} dimension at {score}. Your single task: fix that one dimension.

<design>
{INLINE .planning/DESIGN.md tokens relevant to {dim}}
</design>

<product>
{INLINE .planning/PRODUCT.md voice + register}
</product>
</phase_context>

<task_context>
# Issue
- Dimension: {dim}
- Severity: {severity}
- Description: {description}
- Likely file: {likely_file or "(infer from grep — start at the path the screenshot suggests)"}
- Recommended fix: {fix}

# Files probably affected
{1-3 candidate paths the loop has inferred from the URL routing}
</task_context>

<task>
1. Read the likely file. If the issue is in a different file, follow the import graph until you find the source.
2. Make the MINIMUM edit to fix this one dimension. Do not refactor. Do not change logic. Do not touch state management. Do not change copy unless this is a microcopy issue.
3. Use design tokens from DESIGN.md. Do not invent new color values, font names, or spacing.
4. After the edit, commit via the orchestrator (slop-detect-gated):
     node C:\Users\hasan\.claude/skills/qualia-polish/scripts/loop.mjs commit-fix --state {STATE} --file {file} --slug {dim}-{short-keyword}
   If slop-detect blocks (exit 2), READ the slop output and re-edit. If you cannot fix without violating slop-detect, return BLOCKED with the conflict.
5. Return DONE with: file modified, lines changed, slop-detect: pass, commit: {sha}.
</task>

<rules>
- Vision says: {evidence from eval.json.viewport_results[].evidence[{dim}]}
- Do not add features.
- Do not write tests for this fix (the loop's next iteration is the test).
- Single commit. The orchestrator handles the slug + iteration prefix.
</rules>
`
})
```

## Iteration log entry (what `loop.mjs record` writes to state.json.iterations[])

`tokens_used` is a **deterministic fixed charge** (`PER_ITER_TOKENS = 14500`) added by `loop.mjs` per iteration — NOT a number reported by the evaluator. The evaluator's JSON no longer carries a `tokens_used` field; trusting a model-guessed count to drive the budget kill-switch was unsound, so the loop charges the constant below for every iteration regardless of what any agent claims.

```json
{
  "iteration": 1,
  "scores": { "typography": 1, "color": 1, "spatial": 3, "layout": 1, "shadow": 3, "motion": 3, "microcopy": 1, "container": 1, "graphics": 1 },
  "aggregate": 15,
  "pass": false,
  "failing_dims": ["typography", "color", "layout", "microcopy", "container", "graphics"],
  "top_issues": [
    { "dim": "color", "severity": "critical", "description": "blue→purple gradient on hero", "likely_file": "src/styles/globals.css", "fix": "replace linear-gradient with single accent var(--accent)" },
    { "dim": "typography", "severity": "critical", "description": "Inter as primary font-family", "likely_file": "src/styles/globals.css", "fix": "swap to Fraunces + JetBrains Mono per DESIGN.md §3" },
    { "dim": "layout", "severity": "high", "description": "three identical feature cards in section 2", "likely_file": "src/pages/index.tsx", "fix": "vary card sizes per design-brand.md §Layout" }
  ],
  "tokens_used": 14500,
  "timestamp": "2026-05-03T12:34:56.000Z"
}
```

## Issue fingerprint (regression detection)

The orchestrator computes a fingerprint per top_issue for each iteration:

```
fingerprint = `${dim}__${path.basename(likely_file)}__${first_32_chars_of_description}`
                      .toLowerCase().replace(/\W+/g, "_")
```

State stores `state.fingerprints[fingerprint] = { iterations: [1,2,3], description, dim }`. The KILL trigger is **3 consecutive integer iterations in `iterations[]`** — non-consecutive recurrences don't kill (the issue may have been fixed, broken by a different change, then refixed; that's a different signal than "fix-builder cannot fix this").

When the kill trigger fires, the verdict becomes `killed_regression` and `state.kill_fingerprint` records which one. The user can `cat state.json | jq '.fingerprints | to_entries | map(select(.key == "{fingerprint}"))'` to see the recurrence pattern.

## Token-budget table

| Iterations | Tokens (est.) | Sized for |
|---|---|---|
| 2 | ~30K  | known-clean page sanity-check |
| 4 | ~60K  | mid-confidence |
| 6 | ~90K  | default |
| 8 | ~120K | hard cap; pass `--budget 150000` to allow |

Per-iteration cost is charged as a **fixed constant** — `loop.mjs` adds `PER_ITER_TOKENS = 14500` per iteration to `state.tokens_used` and the kill-switch trips off that deterministic sum, never off an agent's self-estimate. The breakdown below is the rationale for the constant, not a per-run measurement:
- 3 full-page screenshot reads ≈ 9K (taller PNGs than viewport-height crops, but still 3 reads)
- rubric + brief inlined ≈ 2K (cached after iter 1)
- previous-iteration delta ≈ 0.5K
- 3 fix-builder spawns × (file read + edit + commit-fix call) ≈ 3K
- **per-iteration constant = 14.5K** (deterministic — same charge every iteration)

## Self-test scenarios (mapping to spec)

| # | Fixture | Expected | Verifier |
|---|---|---|---|
| 1 | `fixtures/clean.html` | Each viewport PNG is full-page (height > viewport-height when the fixture scrolls); SUCCESS in 1-2 iterations, all dims ≥ 4 | run capture, assert PNG is full-page, run evaluator inline, assert pass |
| 2 | `fixtures/broken.html` | SUCCESS in 4-6 iters; identifies banned font + gradient + 3-card grid + side-stripe + generic CTA, INCLUDING below-fold offenders only visible in a full-page shot | each fix-builder commits a `qpl-N:` change; final eval all dims ≥ 3 |
| 3 | Kill-switch | KILL at iter ≤ 4 with `LOOP_REGRESSION_DETECTED`; `state.tokens_used` increments by exactly `PER_ITER_TOKENS` (14500) per recorded iteration | call `loop.mjs record` 3× with the same fingerprint; assert exit 3 + correct verdict + deterministic token charge |

The pilot-results doc at `docs/playwright-loop-pilot-results.md` records the actual outcome from `bash scripts/_self-tests.sh` (Scenario 3 is exercised by a deterministic unit-style invocation; Scenarios 1+2 require a real vision pass and are run by Claude when the loop ships).

## Final report template (what `loop.mjs report` emits to stdout)

```markdown
# Visual-Polish Loop Report

- **URL:** http://localhost:3000
- **Brief:** .planning/DESIGN.md
- **Started:** 2026-05-03T12:00:00Z
- **Final verdict:** SUCCESS
- **Iterations:** 4 / 8
- **Tokens used:** 58000 / 100000
- **Fixes committed:** 7

## Iteration log

### Iteration 1
- Scores: typo=1 colo=1 spat=3 layo=1 shad=3 moti=3 micr=1 cont=1 grap=1
- Aggregate: 15/45 (avg 1.67)
- Pass: NO (failing: typography, color, layout, microcopy, container, graphics)
- Top issues:
  - **color** [critical] blue→purple gradient on hero → src/styles/globals.css
  - **typography** [critical] Inter as primary → src/styles/globals.css
  - **layout** [high] three identical cards → src/pages/index.tsx

### Iteration 2
- Scores: typo=3 colo=3 spat=3 layo=2 shad=3 moti=3 micr=2 cont=2 grap=2
- Aggregate: 23/45 (avg 2.56)
- Pass: NO (failing: layout, microcopy, container)
- ...

### Iteration 3
- Scores: typo=4 colo=3 spat=3 layo=3 shad=3 moti=3 micr=3 cont=3 grap=4
- Aggregate: 29/45 (avg 3.22)
- Pass: YES

## Fix commits (revertable)
- abc1234 qpl-1: color-gradient-removal — src/styles/globals.css
- def5678 qpl-1: typography-fraunces — src/styles/globals.css
- ...

## Issue fingerprints (regression tracker)
- color__globals_css__blue_purple_gradient — iterations [1] — fixed at iter 2
```

## Why three viewports

Per the spec's hard constraint (§5g `prefers-reduced-motion` and §5c mobile-only failures), the loop MUST evaluate at mobile (375), tablet (768), and desktop (1440). The aggregate score is the **minimum** across viewports for each dimension — a layout that's elegant on desktop but breaks at 375 is a fail, full stop.

This is intentional. Most visual regressions Fawzi has documented in `/insights` (hero videos cropped wrong on mobile, touch targets < 44px on mobile, navigation collapse misbehaving) only show up below 768. Scoring on desktop alone is how we got "looks great in dev" → "looks broken on the user's phone."

## What the loop does NOT do

- Cross-browser rendering checks (Firefox / WebKit) — Chromium-only, per `qualia-polish` Stage 4 precedent.
- Accessibility audits beyond what the rubric scores — use `/qualia-polish` Stage 3 (Lighthouse + axe) for that.
- Performance regressions — use `/qualia-polish --loop` only after Lighthouse score passes.
- Reference-image-only mode (compare to a target screenshot without a brief) — the brief is required; reference is supplemental.
- Aesthetic pivots — if the issue is "the whole vibe is wrong", `/qualia-polish --vibe` swaps the aesthetic in minutes instead of grinding the loop against a vibe that doesn't fit.

Implemented as of v5.2: `--routes a,b,c` for multi-route sweeps, `--reduced-motion` for `prefers-reduced-motion: reduce` capture.
