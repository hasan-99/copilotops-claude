---
name: qualia-feature
description: "Auto-scoped single-feature build (inline for trivia, fresh spawn for 1-5 files). Routes phase-sized work to /qualia-plan, broken behavior to /qualia-fix. Triggers: 'build this one thing', 'add a component', 'implement this feature', 'small change', 'tweak'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---

# /qualia-feature — Auto-scoped Single Feature

One command for adding a small new capability outside the planned Road. Auto-detects scope from the task description and picks the right execution path.

## Usage

`/qualia-feature` — describe interactively
`/qualia-feature {description}` — run with description directly
`/qualia-feature --force-spawn {description}` — force a fresh builder spawn (even if auto would inline)
`/qualia-feature --force-inline {description}` — force inline path (even if auto would spawn)

## When to use

- One feature outside a planned phase
- A copy tweak, config tweak, or one-line non-repair change
- A 1-5 file feature, component, API route, or integration
- A refactor of a single module

## When NOT to use

- 5+ files or multiple subsystems touched → `/qualia-plan`
- Part of a planned phase → `/qualia-build`
- Broken existing behavior, regression, failing test, or hotfix → `/qualia-fix`
- Investigating a symptom you can't name yet → `/qualia-review`
- Optimization or polish pass → `/qualia-optimize` or `/qualia-polish`

## Process

### 0. Set the work-unit goal

Per `rules/codex-goal.md` — set the work-unit goal (Codex `/goal`; on Claude Code, a tracked task + budget) with scope matching the auto-detected bucket (`quick` for inline, `feature` for spawn). Do this AFTER Step 2 (auto-detect scope) so the budget matches the actual work shape.

### 1. Capture description

If invoked without args, ask: **"What do you want to build?"**

Wait for free-text answer. Don't paraphrase back. Capture the user's exact phrasing — it feeds both the auto-scope classifier and the eventual commit message.

### 1b. Scope gate (anti-drift — keep work on the milestone arc)

Before building, check whether this work belongs to the active milestone. This is what stops feature/fix from drifting off-plan.

```bash
node C:\Users\hasan\.claude/bin/state.js check 2>/dev/null   # → milestone, profile; JOURNEY.md = the arc
node C:\Users\hasan\.claude/bin/state.js reqs-check 2>/dev/null   # current milestone's open REQ-IDs
```

- **No active project / no milestone** (`.planning/` absent) → not governed; proceed normally (skip to Step 2).
- **Active milestone**: decide if this work serves it.
  - **In-scope** (it advances the current milestone's goal or an open REQ-ID) → proceed. Record it tagged to scope in Steps 4/5: add `--scope in --ref {REQ-ID or phase}` to the `state.js transition --to note` call.
  - **Off-road** (a new capability/feature that isn't in the current milestone): this is exactly the drift the framework guards against. Resolve by profile (`state.js check` → `profile`):
    - **strict** → STOP. Do not build off-road. Route to `/qualia-scope` to fold it into the arc (a phase/REQ in the current or a future milestone) or `/qualia-milestone` if it's a new milestone. Off-road building is blocked.
    - **standard** → allowed, but **recorded**: build it, then record with `--scope off --ref "{what + why off-road}"` so the OWNER + ERP see the off-road tally (it is never silent).

### 2. Auto-detect scope

Classify the description into one of three buckets:

| Bucket | Heuristic | Path |
|--------|-----------|------|
| **inline** | Typo, comment edit, 1-line config change, single-word rename, dead-code removal, copy edit, link fix, version bump, single emoji/icon swap | Direct work, no spawn |
| **spawn** | Add a component, add an API route, add a small migration + UI, implement a single feature, fix a non-trivial bug, refactor a module under 5 files | Fresh builder spawn |
| **refuse** | "Build the dashboard", "implement payments", "ship the auth system", "add a checkout flow", any description that names a multi-step workflow or 5+ subsystems | Refuse, route to `/qualia-plan` |

**Inline signals** (any one is sufficient):
- "fix typo", "fix the comment", "rename X to Y", "remove unused", "update copy", "change the link", "bump version"
- Description fits in one short sentence and names one specific micro-change
- The action is reversible by a single `git revert`

**Spawn signals** (any one is sufficient):
- "add a", "implement", "build", "create" + a single noun (component, route, page, table, form, modal, hook, util, migration)
- Description names a single feature with multiple touch points (e.g. "add a feedback form" → migration + API + UI = 3-4 files, but still one cohesive thing)
- The work needs a fresh context to avoid contaminating the current conversation
- The work repairs a non-trivial bug only if invoked explicitly with `/qualia-feature --force-spawn`; otherwise use `/qualia-fix`

**Refuse signals** (any one is sufficient):
- "build the X system", "implement the entire Y", "add complete Z support"
- Description names a multi-milestone capability (auth, payments, search, admin panel) without a tight slice
- Estimated touch ≥ 5 files OR ≥ 1 day

### 3. Announce the route + escape hatch

Show the user what was detected. Always offer the escape hatch:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner feature
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Detected scope: {inline|spawn|refuse}"
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Reason: {one-line rationale}"
```

Then:

- header: "Scope detected"
- question: "Auto-scope says {bucket}. Proceed, or override?"
- options:
  - "Proceed with {bucket}"
  - "Force inline" (only shown if bucket != inline)
  - "Force spawn" (only shown if bucket != spawn)
  - "Route to /qualia-plan" (only shown if bucket != refuse)
  - "Re-describe"

If `--force-spawn` or `--force-inline` was passed on the command line, skip this gate entirely and execute the forced path.

### 4. Execute the inline path

For inline scope:

1. Read the file(s) that need to change (one read per file, no spawning).
2. Make the edit directly using Edit/Write.
3. Run `npx tsc --noEmit` if TypeScript and the change touches typed code; skip otherwise.
4. Atomic commit with a clear conventional-commit message:

```bash
git add {specific files}
git commit -m "fix: {description}"
```

5. Record in state:

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to note --notes "{brief description}" --tasks-done 1 {--scope in --ref {REQ/phase}  |  --scope off --ref "{why off-road}" — from the §1b scope gate}
```

6. End with:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "FEATURE SHIPPED (inline)"
```

### 5. Execute the spawn path

For spawn scope:

1. Build a quick task spec (don't write to a file, just confirm with user):

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "What: {what to build}"
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Files: {files to create/modify, comma list}"
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Done: {observable acceptance criteria, 1-3 bullets}"
```

Ask: **"Good to build?"** Wait for confirmation.

2. Spawn the builder:

```
Agent(subagent_type="qualia-builder", description="Feature: {short title}")
  prompt: |
    Read your role: @C:\Users\hasan\.claude/agents/builder.md

    <task>
    {task description verbatim from user}
    </task>

    <files>
    {files to create/modify}
    </files>

    <acceptance_criteria>
    {1-3 observable bullets}
    </acceptance_criteria>

    <context>
    Read .planning/PROJECT.md if it exists.
    Read .planning/CONTEXT.md if it exists (domain glossary).
    Follow rules/security.md, rules/deployment.md, and qualia-design/frontend.md as applicable.
    Atomic commit. Run npx tsc --noEmit before commit.
    </context>
```

3. After the builder returns, verify:
   - `npx tsc --noEmit` exits 0 (rerun the builder up to 2x if it failed self-verify — standard auto-heal pattern).
   - Quick smoke test if applicable.
   - Confirm the commit was made: `git log --oneline -1` shows the feature.

4. Report:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Feature: {description}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Files: {files changed}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Commit: {commit hash}"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "FEATURE SHIPPED (spawn)"
```

5. Record in state:

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to note --notes "{description}" --tasks-done 1 {--scope in --ref {REQ/phase}  |  --scope off --ref "{why off-road}" — from the §1b scope gate}
```

### 6. Execute the refuse path

For refuse scope, do NOT build. Explain why and route:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js warn "This is too big for /qualia-feature (5+ files or multi-step workflow)."
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Reason: {one-line — e.g. 'description names the entire auth system, not a slice'}"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "ROUTED" "/qualia-plan"
```

If the user is sure it's small and the classifier got it wrong, they can re-invoke with `--force-spawn`.

## Auto-scope examples

| Description | Detected | Why |
|-------------|----------|-----|
| "fix the typo in the hero copy" | inline | typo + 1 file |
| "rename `userId` to `user_id` in auth.ts" | inline | rename in 1 file |
| "bump next from 16.0.3 to 16.0.4" | inline | version bump, 1 file |
| "add a Feedback button that opens a modal" | spawn | single feature, 2-4 files |
| "add a GET /api/health route returning ok" | spawn | 1 route, but worth a fresh context for test pass |
| "implement Stripe subscription checkout" | refuse | multi-file + webhooks + admin = phase |
| "build the dashboard" | refuse | names a multi-page surface |
| "add the admin user-management page" | refuse | usually 5+ files (table, modals, API, RLS, types) |

## Rules

1. **Auto-scope is confident by default, with two escape hatches.** Trust the classifier; use `--force-spawn` or `--force-inline` when it guesses wrong. Don't waste a question on "which path?" — propose and let the user override.
2. **Inline is genuinely fresh-context-free.** No subagent spawn for inline work — the current Claude does it directly. That is what makes the inline path cheap.
3. **Spawn means atomic.** One feature, one commit, one acceptance criteria block. No grab-bag commits that touch four unrelated things.
4. **Refuse means refuse.** When a description is phase-sized, route to `/qualia-plan`, don't try to fit it in. The auto-classifier is the gate that protects the work from sprawling.
5. **STATE.md via state.js only.** Never edit STATE.md or tracking.json by hand. Both paths record through `state.js transition`.
6. **Follow rules/* on every path.** Security, frontend, deployment rules apply equally to inline and spawn. Read-before-write is non-negotiable.
