---
name: qualia-polish
description: "Scope-adaptive visual quality pass — component, route, whole app, redesign, vibe pivot, or autonomous loop. Triggers: 'polish', 'design pass', 'redesign', 'critique', 'looks ugly', 'different vibe', 'visual loop'. Route functional bugs to /qualia-fix."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - WebSearch
  - WebFetch
argument-hint: "[file|route|--redesign|--critique|--quick|--loop] [--register=brand|product] [--brief PATH] [--max 8] [--viewports 375,768,1440]"
---

# /qualia-polish — Scope-Adaptive Design Pass

One command. Seven scopes. Use it whenever you need design work, from a 30-second component touch-up to a ground-up redesign with current design research, complex visuals, and a fully transparent see-fix-verify loop.

Polish fixes visual quality only. Broken behavior, failing tests, API bugs, state bugs, and config errors go to `/qualia-fix`. Whole-site aesthetic token pivots stay inside `/qualia-polish --vibe` so the design surface is one command.

## Scopes

The first argument selects the scope. Stage selection follows from scope.

| Invocation | Scope | Runtime | Stages |
|---|---|---|---|
| `/qualia-polish src/components/Button.tsx` | **Component** | ~30s | 0, 2, 3, 7 |
| `/qualia-polish app/dashboard` | **Section** | ~3m | 0, 1 (light), 2, 3, 4, 7 |
| `/qualia-polish` | **App** | ~12m | all 7 (fan-out batches of 5) |
| `/qualia-polish --redesign` | **Redesign** | ~30m | all + Stage 1 mandatory + 2 vision iterations |
| `/qualia-polish --critique` | **Critique** | read-only | 0, 4, 5 (no edits) |
| `/qualia-polish --quick` | **Quick** | ~1m | 0, 2, 7 (gates only, no vision loop) |
| `/qualia-polish --vibe` | **Aesthetic pivot** | ~3m | token-only direction swap, then 6, 7 (mandatory verify) |
| `/qualia-polish --loop {url}` | **Loop** | ~5-15m | autonomous see/fix/verify, max 8 iterations |

Other flags: `--register=brand|product` overrides register inference. Vibe-specific flags: `--variants N`, `--extract URL|image`, `--sync`, `--write`. Loop-specific flags: `--brief PATH`, `--max N`, `--viewports 375,768,1440`, `--ref PATH`, `--budget 100000`.

## Transparent Command Output

Follow `rules/command-output.md`. At minimum, show:

```text
Command: /qualia-polish {scope}
Scope: {target files/routes}
Intent: visual quality | redesign | critique | loop
Mutation: none | planned | active | blocked
Evidence: DESIGN.md, PRODUCT.md, qualia-design files, screenshots, online sources when used
Output: changed files, screenshots, report, commit
Next: {next command or done}
```

## --loop mode (autonomous visual loop)

When `--loop` is the first flag, the polish run is fully autonomous: screenshot a live URL at three viewports, score 9 design dimensions of `qualia-design/design-rubric.md` against the brief using vision, fix top issues in the codebase, re-screenshot, repeat until every dimension scores >= 3 or the kill-switch fires (regression, budget cap, max iterations).

Scripts ship at `skills/qualia-polish/scripts/{loop,playwright-capture,score}.mjs`; the vision evaluator is `agents/visual-evaluator.md`; the full loop spec lives in this skill's `REFERENCE.md`.

When `--loop` is detected on entry, route to the loop process documented in `REFERENCE.md` and stop executing the standard stages below. The two paths share Stage 0 substrate gates and the rubric, but diverge from Stage 1 onward.

## --vibe mode (aesthetic token pivot)

When `--vibe` is detected, do not restructure JSX, routes, data flow, navigation, or layout grids. Change only aesthetic tokens and matching DESIGN.md sections: color, typography, depth, motion, brand accents, and short visual-direction copy.

Supporting scripts ship inside this skill:

```bash
node C:\Users\hasan\.claude/skills/qualia-polish/scripts/vibe-tokens.mjs sync --design .planning/DESIGN.md
node C:\Users\hasan\.claude/skills/qualia-polish/scripts/vibe-tokens.mjs propose-variants --product .planning/PRODUCT.md --design .planning/DESIGN.md --count 3
node C:\Users\hasan\.claude/skills/qualia-polish/scripts/vibe-extract.mjs --source https://example.com
```

Default flow proposes one opinionated direction per `rules/one-opinion.md`. `--variants` is opt-in only. `--extract` stages a reference screenshot for the visual evaluator to reverse-engineer into DESIGN.md tokens; the user must review low-confidence extracted values before application. `--sync --write` patches DESIGN.md to reflect tokens already present in code.

**Mandatory post-vibe verify (the token swap does NOT terminate the run).** After applying the new tokens, a `--vibe` run MUST NOT stop at the swap — it routes back through **Stage 6 — Verify**. Before claiming done, run:

```bash
# 1. TypeScript still compiles (a token rename can break a typed theme map)
npx tsc --noEmit 2>&1 | tail -10

# 2. Anti-pattern scan on the files the swap touched (new tokens can reintroduce slop)
node bin/slop-detect.mjs {changed_files}
[ $? -eq 0 ] || { echo "vibe failed — slop-detect found critical issues in the new tokens"; exit 1; }
```

3. **Scoped vision check (best-effort, only if a dev server is reachable).** Capture one screenshot per viewport via `scripts/playwright-capture.mjs` and spawn a single `agents/visual-evaluator.md` pass scored ONLY on the dimensions a token swap can move: **color, typography, shadow, motion**. (Layout/container/microcopy/graphics are out of scope for `--vibe` — do not score or fix them here.) If no dev server and no resolvable browser backend, skip this step and note it in the report; never block the vibe on missing optional tooling. Any in-scope dimension scoring < 3 is a regression in the new direction — re-tune the offending tokens and re-verify, do not ship.

Only after Stage 6 passes does the `--vibe` run reach Stage 7 (commit & state).

## Setup gates (non-optional, every scope)

Before any work — design or otherwise — pass these gates. Skipping them produces generic output that ignores the project.

| Gate | Required check | If fail |
|---|---|---|
| Substrate | `qualia-design/design-laws.md`, `design-brand.md`, `design-product.md`, `design-rubric.md`, `design-reference.md`, `design-dials.md`, `frontend.md`, `graphics.md` exist and have been read when scope requires them | Read them. |
| Dials + pre-flight | `qualia-design/design-dials.md` read; the 3 dials resolved from DESIGN.md §0 (or register defaults); the ban→do-instead list loaded BEFORE any token/component edit | Read it; resolve dials; cite the bans you'll avoid. |
| PRODUCT | `PRODUCT.md` exists at project root, has `register:` field, and is not placeholder (`[TODO]` markers, &lt; 200 chars) | Run setup: ask 5 questions and generate it. Never synthesize from prompt alone. |
| DESIGN | `DESIGN.md` exists. If missing on App / Redesign scope, BLOCK and run setup. If missing on Component / Section / Critique / Quick scope, NUDGE and proceed. | Generate from PRODUCT.md + 3 questions. |
| Slop-detect | `bin/slop-detect.mjs` is callable | Install or pull from framework. |
| Mutation | All gates above pass | Do not edit project files yet. |

State this preflight explicitly before editing:

```
POLISH_PREFLIGHT: substrate=pass product=pass design=pass|nudged dials={VAR}/{MOT}/{DEN} graphics=loaded|skipped slop_detect=pass mutation=open
```

## Process

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner polish
```

### Stage 0 — Direction commit (mandatory; light on small scopes)

Read PRODUCT.md and DESIGN.md. Identify the **register** — Brand (marketing/landing/portfolio) or Product (app/admin/dashboard). Priority for register inference:

1. The path of the target file/route (e.g., `/marketing/*` → brand; `/app/*` → product)
2. `register:` field in PRODUCT.md
3. `--register` flag override

For App / Redesign scope, write the brief BEFORE any code (use `ultrathink`). Per `rules/one-opinion.md` — **propose one direction, do NOT list a menu of aesthetic options to the user.** Infer the one direction from `PRODUCT.md` register + anti-references + scene sentence, then commit to it in writing:

```
Aesthetic direction:  {ONE concrete direction — e.g. "editorial broadsheet, ivory ground, deep navy ink, italic accents"}
Color strategy:       {ONE choice — Restrained / Committed / Full palette / Drenched — with one-line justification}
Scene sentence:       {who uses this, where, ambient light, mood — concrete}
Differentiation:      {what someone remembers 24 hours later}
Complex visual:       {hero/product/data/diagram/3D/canvas concept, or "none because..."}
Research anchors:     {2-4 sources checked, or "local only" for component/quick}
```

For Redesign scope, run a short online best-practices check before the brief unless the user explicitly says offline. Prefer primary sources:
- W3C WCAG 2.2 / WAI for accessibility, focus, target size, contrast: https://www.w3.org/TR/WCAG22/
- Apple Human Interface Guidelines for motion/accessibility restraint: https://developer.apple.com/design/human-interface-guidelines/motion
- Material Design motion guidance for spatial continuity and state transitions: https://m3.material.io/styles/motion/overview
- Nielsen Norman Group for visual hierarchy, scannability, and usability evidence: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/

Use the sources as constraints, not as a style to copy. Cite links in the report/summary when they shaped the redesign.

If the user pushes back on the proposed direction, switch to `/qualia-polish --vibe` mode — do not start enumerating alternatives in the brief.

For Component / Section / Quick scope, the brief is implicit (loaded from DESIGN.md). Skip the ultrathink step but cite the relevant DESIGN.md tokens you'll touch.

For Critique scope, no commit needed — you're scoring, not editing.

### Stage 1 — Static gates (no browser, deterministic)

```bash
# Anti-pattern scan (the slop-detect script)
node bin/slop-detect.mjs {target_paths}

# TypeScript still compiles?
npx tsc --noEmit 2>&1 | head -20

# Token enforcement (if Stylelint configured)
npx stylelint "src/**/*.css" 2>&1 | head -20  # optional, report if not configured
```

ANY critical-severity slop hit = mandatory fix before proceeding. Don't stage anything until critical findings are zero.

### Stage 2 — Generation (forked subagents, batches of 5 files)

For App / Redesign / Section scope on multi-file work:

- Count target files. If ≤ 5, process in main context.
- If &gt; 5, fan out: spawn one Agent per batch of 5 files IN THE SAME RESPONSE TURN (parallel execution).
- If the conversation already contains design-taste discussion (font/color/motion preferences threaded across multiple turns), prefer **forked subagents** (`--fork-session`) so they inherit the taste context. Otherwise, blank-context fan-out is fine for mechanical fixes.

Each agent receives:
- `qualia-design/design-laws.md` + the matching register file
- `qualia-design/frontend.md`, `design-reference.md`, and `graphics.md` for App / Redesign / Loop scopes
- `PRODUCT.md` + `DESIGN.md` (inlined)
- Online research anchors for Redesign scope, summarized in 3-6 bullets with links
- Its 5 files (paths + contents)
- Instruction: apply the Design Quality Rubric per file. Fix every dimension scoring &lt; 3. Make literal edits. Do NOT change logic — only styling.

For Component scope: do the work in main context. Read, fix, verify.

**Optional best-effort vision check (Component scope).** If a dev server is reachable (`http://localhost:3000` or a port detected via `lsof`) AND `scripts/playwright-capture.mjs` can resolve a browser backend, capture ONE screenshot at a single viewport (desktop 1440 is sufficient for an isolated component) and spawn one `agents/visual-evaluator.md` pass scored on component-relevant dimensions ONLY — Typography, Color, Shadow, Motion, Microcopy (skip Layout/Container/Graphics per the rubric's scope guard). This is opt-in by environment: if there is no dev server or no resolvable backend, **omit the vision check without error and record that it was unavailable** — never block a component touch-up on missing optional tooling.

**Apply fixes scoped by what's missing:**

| If the file scores low on… | Apply fix from… |
|---|---|
| Typography | DESIGN.md §3 — font tokens, scale, weight hierarchy, tabular numerals |
| Color cohesion | DESIGN.md §2 — OKLCH tokens, replace hex, verify contrast |
| Spatial rhythm | DESIGN.md §4 — fluid spacing scale, vary by content |
| Layout originality | register file (brand or product) — kill three-column grids, vary layout |
| Shadow hierarchy | DESIGN.md §6 — elevation tokens, brand-tinted shadows |
| Motion intent | DESIGN.md §7 — easing, stagger, signature motion |
| Microcopy | rename "Get Started" / "Learn More" to action-named CTAs |
| Container depth | flatten card-on-card; remove side-stripe borders |
| Complex graphics | graphics.md — add meaningful product/data/process visuals, not decoration |

### Stage 2b — Complex Visual Layer (App / Redesign / Loop)

For whole-app, redesign, and loop scopes, decide whether the page needs a stronger visual system.

1. Read `qualia-design/graphics.md`.
2. Inspect the product/domain from PRODUCT.md and CONTEXT.md.
3. Choose one:
   - **No complex visual**: explain why typography/layout alone is stronger.
   - **Bitmap/media**: real/generative/search asset that reveals product/place/person/state.
   - **Diagram/data**: custom SVG/canvas/chart that explains relationships.
   - **3D/canvas**: Three.js or canvas scene for spatial/product/system experience.
4. If adding a visual, implement it as a first-viewport or primary-section signal, not a tiny decoration.
5. Verify mobile framing, reduced-motion fallback, contrast, and nonblank rendering.

### Stage 3 — Runtime gates (App / Section / Redesign only — needs dev server)

If a dev server is up at `http://localhost:3000` (or detected via `lsof` on common ports):

```bash
# Lighthouse-CI — numeric a11y/perf/best-practices
npx lhci autorun \
  --collect.url=http://localhost:3000{route} \
  --collect.numberOfRuns=1 \
  --assert.assertions='{
    "categories:accessibility":   ["error", {"minScore": 0.9}],
    "categories:performance":      ["warn",  {"minScore": 0.7}],
    "categories:best-practices":   ["warn",  {"minScore": 0.8}]
  }' 2>&1 | tail -30

# axe-core direct (catches what Lighthouse misses)
npx @axe-core/cli http://localhost:3000{route} --exit 2>&1 | tail -30
```

If Lighthouse/axe are not installed, continue but note the missing tooling in the report. Don't fail the polish over optional local tooling, and don't hide the skipped gate.

If a11y &lt; 90 OR axe critical/serious violations: **fix programmatically** (these are deterministic — no vision needed). Re-run to confirm.

### Stage 4 — Vision loop (Redesign scope only — max 2 iterations)

Use `skills/qualia-polish/scripts/playwright-capture.mjs` (Playwright backend, with Chrome-binary fallback). Capture one **full-page** screenshot at each of 3 viewports: 375 / 768 / 1440 — these match what `agents/visual-evaluator.md` expects, and what the `--loop` mode captures. The `height` below sets the viewport window, not the screenshot height — each PNG runs top-to-bottom so the evaluator scores below-fold sections too. Single browser (Chromium) is fine in 2026 — cross-browser CSS rendering differences are vanishingly rare.

```
viewports: [
  { width: 375,  height: 812,  name: 'mobile' },
  { width: 768,  height: 1024, name: 'tablet' },
  { width: 1440, height: 900,  name: 'desktop' }
]
```

For each iteration:

1. Capture all 3 viewports
2. Pass to a vision-model agent with `qualia-design/design-rubric.md` as the prompt anchor + DESIGN.md as the spec
3. The agent scores 9 dimensions, anchored 1-5, with evidence per dimension
4. Apply fixes ONLY to dimensions scored 1 or 2 (don't nitpick 3s; prevents oscillation)
5. STOP if: all dimensions ≥ 3 (success), OR any dimension regressed from previous iteration (regression-stop), OR 2 iterations reached (hard cap)

**The anchored rubric is mandatory.** Without it, vision models say "looks great!" to everything. Quote from the rubric prompt: "Score 3 = acceptable. Only 1-2 = must fix. 4-5 = exceeds. Default to 3 unless you can cite specific evidence."

### Stage 5 — Drift audit (App / Redesign / Critique scope)

Compare the implementation against DESIGN.md as source of truth. Flag deltas.

```bash
# Find tokens used in code that don't exist in DESIGN.md
grep -rE "var\(--[a-z-]+\)" src/ app/ components/ 2>/dev/null | \
  awk -F'var\\(--' '{print $2}' | awk -F'\\)' '{print $1}' | sort -u > /tmp/used-tokens
grep -E "^\s*--[a-z-]+:" templates/DESIGN.md | sed -E 's/.*--([a-z-]+):.*/\1/' | sort -u > /tmp/declared-tokens
comm -23 /tmp/used-tokens /tmp/declared-tokens > /tmp/orphan-tokens
[ -s /tmp/orphan-tokens ] && echo "── orphan tokens (used in code, missing from DESIGN.md) ──" && cat /tmp/orphan-tokens

# Find raw hex still appearing
grep -rnE "#[0-9a-fA-F]{6}\b" src/ app/ components/ --include="*.tsx" --include="*.css" 2>/dev/null | \
  grep -v "shadow\|outline\|currentColor" | head -20
```

Drift findings get reported, not auto-fixed (drift may be intentional). For Critique scope, this IS the deliverable.

### Stage 6 — Verify (every scope)

```bash
# Re-run Stage 1 — all critical findings must be zero
node bin/slop-detect.mjs {target_paths}
[ $? -eq 0 ] || { echo "polish failed — slop-detect still finds critical issues"; exit 1; }

# TypeScript clean
npx tsc --noEmit 2>&1 | tail -10
```

### Stage 7 — Commit & state

For Critique scope: create `.planning/reports/polish/`, write the report to `.planning/reports/polish/polish-critique-{timestamp}.md`, and STOP. Do not edit, do not commit.

For all other scopes:

```bash
git add {modified files}
git -c user.name="Qualia Solutions" -c user.email="info@qualiasolutions.net" commit -m "$(cat <<'EOF'
polish({scope}): {brief summary}

- {key change 1}
- {key change 2}
- rubric scores: typography {N}, color {N}, graphics {N}, ..., aggregate {N}/45

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If this is the FINAL polish before deploy (Handoff milestone, last phase):

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to polished
```

Otherwise, no state transition (polish is now a normal verb, not a phase boundary).

### Output

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Scope: {component|section|app|redesign|critique|quick}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Files: {N}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Slop-detect: {N critical, M high, K medium}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Rubric aggregate: {N}/45 (avg {N})"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Vision iterations: {0|1|2}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Drift findings: {N}"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "POLISHED" "{next command — depends on context}"
```

## Rules

1. **Read before write.** Understand every file before changing it.
2. **DESIGN.md is law.** If a project decision exists, follow it. Don't override.
3. **Don't repair functionality here.** Only change styling, layout, copy polish, accessibility attributes, and design tokens already authorized by DESIGN.md. Route logic/data/config bugs to `/qualia-fix`.
4. **Slop is a bug.** Critical-severity findings block commit. No overriding the script.
5. **TypeScript must pass** after every change.
6. **One commit per polish run** — not per category, not per file.
7. **Forked subagents inherit taste.** When the conversation has design discussion, fork. Otherwise blank-context.
8. **The rubric is anchored.** Score = 3 means ships. Default there. Justify deviations.

## Failure modes (handle gracefully)

| Symptom | Likely cause | Action |
|---|---|---|
| `bin/slop-detect.mjs not found` | Framework not installed in project | Run `npx qualia install` or pull script from framework repo |
| `PRODUCT.md missing` | Project predates the PRODUCT.md substrate | Run setup (ask 5 questions, generate). For Component scope, can proceed with nudge. |
| `Lighthouse not installed` | Optional tool | Skip Stage 3 numeric gates, note in report. Don't fail. |
| `playwright-capture.mjs cannot resolve a browser backend` | None of the four backends resolve: no `playwright`/`playwright-core` package, no cached Chromium under `~/.cache/ms-playwright`, no system Chrome/Chromium on PATH | Skip Stage 4 vision loop (and any screenshot-dependent verify). Note in report. Install a backend: `npm i -D playwright && npx playwright install chromium` (or put `google-chrome` on PATH). |
| Vision loop oscillates between iterations | Rubric not anchored properly | Verify rubric prompt instructs "default to 3, only 1-2 = fix". Hard cap at 2 iterations. |
| User says "you missed X" after polish completes | Scope was too narrow | Re-run with wider scope (`/qualia-polish` whole-app). Don't argue scope. |
