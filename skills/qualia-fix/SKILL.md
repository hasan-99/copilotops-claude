---
name: qualia-fix
description: "Practical repair lane for broken behavior — root-cause investigation + /qualia-feature execution. Triggers: 'fix this', 'bug', 'broken', 'error', 'failing test', 'regression', 'hotfix', 'layout broken', 'slow page'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
argument-hint: "[--quick|--frontend|--perf|--test|--no-commit] <symptom>"
---

# /qualia-fix - Repair Broken Existing Behavior

Fix is the practical lane for "this used to work, or should work, and now it does not." It combines root-cause evidence gathering with the small-work execution path of `/qualia-feature`.

## Usage

- `/qualia-fix {symptom}` - diagnose and repair a named problem
- `/qualia-fix --quick {symptom}` - micro-fix, max 1 file, direct edit
- `/qualia-fix --frontend {symptom}` - bias diagnostics toward layout, CSS, hydration, responsive, and visual bugs
- `/qualia-fix --perf {symptom}` - bias diagnostics toward slow pages, wasteful renders, bundles, queries, and sequential awaits
- `/qualia-fix --test {failing command}` - start from a failing test/build command
- `/qualia-fix --no-commit {symptom}` - patch and verify, but leave changes uncommitted

## When To Use

- A failing test, build, typecheck, lint, deploy, or runtime path
- A broken existing UI, route, form, API, config, or integration
- A regression after recent work
- A small bug report with enough detail to reproduce or inspect
- A hotfix where the expected behavior is already known

## When Not To Use

- Net-new capability -> `/qualia-feature`
- Phase-sized work or 5+ likely files -> `/qualia-plan`
- Read-only audit -> `/qualia-review`
- No concrete symptom and no failing command -> `/qualia-review`
- Visual craft/design quality with no functional bug -> `/qualia-polish`
- Whole-site aesthetic pivot -> `/qualia-polish --vibe`

## Process

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner fix
```

### 0. Set the work-unit goal

Per `rules/codex-goal.md` — set the work-unit goal (Codex `/goal`; on Claude Code, a tracked task + budget) with scope `quick` for `--quick`, else `feature`. Anchors the fix to one objective + budget so root-cause work doesn't sprawl.

### 1. Classify The Request

Parse `$ARGUMENTS` into:

- symptom
- mode: quick | frontend | perf | test | general
- expected behavior
- observed behavior
- named files/routes/tests if provided

If the request is actually a new feature, stop and route:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "ROUTED" "/qualia-feature"
```

If the request is phase-sized, stop and route:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "ROUTED" "/qualia-plan"
```

### 1b. Scope tag (anti-drift)

```bash
node C:\Users\hasan\.claude/bin/state.js check 2>/dev/null   # milestone + profile
```

Repairing broken behavior in what the current milestone already built is **in-scope** — proceed, and tag the record `--scope in --ref {REQ/phase}` in Step 7. But a "fix" that is really **new off-road behavior** (a capability the milestone never included, dressed as a bug) is drift: in **strict** profile, STOP and route to `/qualia-scope` to fold it into the arc; in **standard**, proceed but record `--scope off --ref "{why off-road}"` so it's counted, never silent. No active milestone → not governed, proceed.

### 2. Build The Feedback Loop

Use the cheapest check that can prove the bug is real and later prove it is fixed.

Prefer, in order:

1. User-provided failing command
2. Targeted test
3. Typecheck or lint error
4. Reproduction grep or route/component inspection
5. Recent diff inspection

Useful starting commands:

```bash
git status --short
git diff --stat
npm test -- --runInBand 2>/dev/null || npm test 2>/dev/null || true
npx tsc --noEmit 2>&1 | head -40
```

For `--test`, run the exact command first and preserve the failing output.

### 3. Find Root Cause

Use a hard inspection budget of 12 Read/Grep/Bash calls before returning insufficient evidence.

Root cause must include:

- `file:line`
- the specific bad assumption or broken contract
- why the symptom follows from it

No root cause, no patch. If evidence is insufficient, write the report and stop.

### 4. Patch Minimally

Patch rules:

- Touch only files required by the root cause.
- Default max: 3 files.
- `--quick` max: 1 file.
- If more than 3 files are required, stop and route to `/qualia-plan` or ask for permission to widen.
- Do not include cleanup, refactors, formatting churn, or adjacent improvements.
- Preserve unrelated user changes.

### 5. Verify

Re-run the feedback loop from Step 2. Then run the smallest broad safety check that matches the stack.

Common verification:

```bash
npx tsc --noEmit
npm test -- --runInBand 2>/dev/null || npm test 2>/dev/null || true
```

If verification fails, do not commit. Either repair the verification failure if it is the same root cause, or write the report with the remaining failure.

### 6. Write FIX Report

Create the report directory and write `.planning/reports/fix/FIX-{YYYY-MM-DD-HHMM}.md`:

```bash
mkdir -p .planning/reports/fix
```

```markdown
# Fix Report - {YYYY-MM-DD HH:MM}

**Symptom:** {user symptom}
**Mode:** general | quick | frontend | perf | test
**Outcome:** fixed | insufficient-evidence | partial

## Feedback Loop
- Initial failing check: `{command or inspection}`
- Final passing check: `{command or inspection}`

## Root Cause
`{file}:{line}` - {one sentence}

## Patch
- Files changed: {list}
- Change summary: {brief summary}

## Verification
- `{command}` - PASS|FAIL
- `{command}` - PASS|FAIL

## Remaining Notes
- {adjacent issue not fixed, or "None"}
```

### 7. Commit

Unless `--no-commit` was passed:

```bash
git add {specific changed files} .planning/reports/fix/FIX-{timestamp}.md
git commit -m "fix: {short symptom/root-cause summary}"
```

Record state:

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to note --notes "{short fix summary}" --tasks-done 1 {--scope in --ref {REQ/phase}  |  --scope off --ref "{why off-road}" — from the §1b scope tag}
```

### 8. Output

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Root cause: {file:line}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Files: {changed files}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Verification: {commands}"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "FIXED" "{next command if any}"
```

## Insufficient Evidence Return

If no confident root cause after 12 inspection calls, write the same FIX report with:

```markdown
**Outcome:** insufficient-evidence

## Narrowed To
- Files examined: {list}
- Ruled out: {list}
- Remaining suspects: {list}

## Recommended Next Diagnostic
- {specific command or reproduction step}
```

Do not patch and do not commit speculative work.

## Rules

1. **Repair existing behavior only.** New work belongs in `/qualia-feature`.
2. **Feedback loop first.** Know how the bug will be proven fixed before editing.
3. **Root cause or stop.** No plausible patches.
4. **Small patch.** Default max 3 files; quick max 1 file.
5. **Report every run.** The FIX report becomes searchable repair memory.
6. **Commit only after verification.** `--no-commit` is the only exception.
