---
name: qualia-build
description: "Execute a planned phase — fresh builder subagents per task, wave-based parallelization, atomic commits, per-task validation. Triggers: 'build this phase', 'execute the plan', 'start building', 'qualia-build'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - TaskCreate
  - TaskUpdate
---

# /qualia-build — Build a Phase

Execute phase plan. Each task = fresh subagent. Independent tasks run parallel.

## Usage
`/qualia-build` — build current planned phase
`/qualia-build {N}` — build specific phase
`/qualia-build {N} --auto` — build + chain into `/qualia-verify {N} --auto` (no human gate)
`/qualia-build {N} --parallel K` — cap concurrent builders at K (default auto: sequential under 3 tasks, else up to 5)
`/qualia-build --batch` — the migration lane (R20): map-reduce a large mechanical change over a flat file list, NOT the phase-wave model. See below.

## Batch lane (`--batch`) — large mechanical migrations

The wave model fits a phase (a few dependency-linked tasks). It does NOT fit a
50–500-file codemod (rename an API, swap a lib, change an import everywhere).
For that, `--batch` is a map-reduce over files: small, file-disjoint workers in
isolated worktrees, fanned in through ONE staging branch.

```bash
# 1. Resolve the target file list (the migration scope), one path per line:
grep -rl 'oldApi(' src --include='*.ts' > /tmp/targets.txt
# 2. Deterministic split into file-disjoint batches + concurrency-capped waves:
node C:\Users\hasan\.claude/bin/batch-plan.js --from /tmp/targets.txt --batch-size 20 --max-workers 5 --staging batch/migrate-oldapi --json
```

`batch-plan.js` emits `batches[]` (each = a branch + its files — disjoint by
construction) and `waves[]` (batch ids to run concurrently, capped at
`--max-workers`). Then orchestrate:

1. Create the staging branch from `main`: `git branch {staging_branch}`.
2. For each wave, spawn one worker per batch **in its own worktree**
   (`isolation: "worktree"`), each handed ONLY its `files[]` + the single
   transformation rule. Small context per worker = no drift.
3. Each worker applies the change to its files and commits to its `batch/…-NN`
   branch. Workers in a wave are file-disjoint, so no conflicts.
4. Fan in: merge each batch branch into `{staging_branch}`. Run the full test
   suite on staging ONCE. Then `/qualia-ship` merges staging → main.
5. A failed batch is isolated to its branch — re-run just that worker; the rest
   proceed. Log any batch you drop (no silent partial migrations).

## Process


### 0. Set the work-unit goal

Per `rules/codex-goal.md` — set the work-unit goal at phase start with scope `phase` (Codex `/goal`; on Claude Code, a tracked task + budget in the banner). One named objective + budget for the whole build.

### 1. Load Plan

```bash
cat .planning/phase-{N}-plan.md
cat .planning/phase-{N}-contract.json
node C:\Users\hasan\.claude/bin/plan-contract.js validate .planning/phase-{N}-contract.json
```

Parse tasks, waves, file refs. Prefer the JSON contract for task ids, dependencies, file lists, and verification checks; use the Markdown plan as the human-readable context.

### 1a. Analyze Gate (scope ↔ plan, before any build)

`plan-contract.js` proves the contract is internally well-formed; this gate diffs it **against intent** — scope acceptance criteria (`phase-{N}-context.md`) + the CONTEXT.md glossary — to catch requirements the plan silently dropped or contradicted. This is the plan→build seam Spec-Kit calls `/analyze`.

```bash
node C:\Users\hasan\.claude/bin/analyze-gate.js {N}
```

Exit 0 → consistent, proceed. Non-zero → it lists under-covered scope criteria, orphan success criteria, glossary violations, and scope-reduction language. **Profile-aware** (the `profile` field from `state.js check`):
- **strict** → a HIGH finding is a stop. Route to `/qualia-plan {N} --gaps` (plan dropped a requirement) or `/qualia-scope {N}` (scope itself is wrong). Do not build.
- **standard** → surface findings to the operator and proceed only with an explicit ack; log the waiver reason to `.planning/decisions/` if you proceed past a HIGH.

(No scope file = scope-coverage check is skipped, not a failure — `/qualia-feature` trivia and scope-less phases still build.)

### 1b. Recovery Reference

Tag HEAD before executing. Reference only, no auto-rollback.

```bash
git tag -f "pre-build-phase-{N}" HEAD 2>/dev/null
```

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Recovery point: pre-build-phase-{N}"
```

Wave fail → stop, inspect status + output. Preserve work; fix forward or ask before reverting.
```bash
git status --short
git diff --stat
```

### 2. Execute Waves

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner build {N} "{phase name}"
```

**Derive the build schedule from the dependency graph (don't trust hand-numbered waves, don't over-spawn):**

```bash
node C:\Users\hasan\.claude/bin/wave-plan.js .planning/phase-{N}-contract.json {--parallel K if set} --json
```

`wave-plan.js` recomputes minimal-depth waves from `depends_on` (maximal safe parallelism) and splits each into **batches capped at `max_concurrency`** (auto: 1 if <3 tasks, else 5; `--parallel K` overrides). Spawn **one batch at a time, in order** — every task in a batch is dependency-free of its batch-mates, so they run concurrently; the next batch waits for the fan-in barrier (§ after each wave). Follow the emitted `batches[]`, not the raw contract `wave` numbers.

**Per batch: spawn ALL its tasks as separate `Agent()` calls in the SAME turn (concurrent). Do NOT await one before spawning the next.**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js task {task_num} "{task title}"
```

**Pre-inline context** (saves 3-5 Read calls per builder):

1. Parse task `Context:` → `@file` refs
2. Read PROJECT.md
3. Read DESIGN.md if task touches `.tsx`/`.jsx`/`.css`/`.scss`
4. Read each `@file` from Context
5. Inline all into prompt under `<pre-loaded-context>`

Spawn builder:

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/builder.md

<phase_context>
# PROJECT.md
{inlined .planning/PROJECT.md}

# DESIGN.md (if frontend task)
{inlined .planning/DESIGN.md}
</phase_context>

<task_context>
# {each @file from task.Context}
{inlined contents}
</task_context>

<wave_context>
Parallel tasks Wave {W} (do NOT touch their files):
- Task {N}: {title} -- files: {files}
- Task {M}: {title} -- files: {files}
(Omit if sole task in wave.)
</wave_context>

<task>
{task block from plan: title, wave, persona, files, depends-on, why, AC, action, validation, context}
</task>

<task_contract>
{matching task object from .planning/phase-{N}-contract.json}
</task_contract>

Context tags already loaded. Only Read project code you modify.

Status protocol (machine-readable fan-in — do this, do not skip):
- First action: `node C:\Users\hasan\.claude/bin/agent-status.js write {task_id} RUNNING --phase {N} --wave {W}`
- Last action, after committing: `node C:\Users\hasan\.claude/bin/agent-status.js write {task_id} DONE --commit $(git rev-parse --short HEAD)`
  (use BLOCKED or PARTIAL with `--note \"why\"` instead of DONE if you could not finish)

Execute. Commit. Write your DONE/BLOCKED/PARTIAL status. Return DONE/BLOCKED/PARTIAL.
", subagent_type="qualia-builder", description="Task {N}: {title}")
```

**Cache ordering:** Role + grounding FIRST, phase_context SECOND, task_context LAST. Stable prefix ~2-5k tokens → 92% cache hit. Pre-inline eliminates 3-5 Read calls per builder.

**After each task:**
- Verify commit: `git log --oneline -1`
- Show:
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js done {task_num} "{title}" {commit_hash}
```

**After each batch — fan-in barrier (deterministic, not "did the model notice"):**

```bash
node C:\Users\hasan\.claude/bin/agent-status.js barrier --tasks {comma-separated task ids in this batch}
```

Exit 0 ⇔ every task in the batch wrote `DONE`. Non-zero → the barrier lists which tasks are RUNNING/BLOCKED/PARTIAL/MISSING. Do NOT spawn the next batch until the barrier passes; a BLOCKED/PARTIAL task is a wave failure (§4). `agent-status.js list` shows the live view. (Gating per batch — not per contract wave — keeps the barrier aligned with the `wave-plan.js` schedule, whose derived waves needn't match the contract's declared wave numbers.)

**After each batch:** move to the next batch in the schedule, show summary.

### 3. Wave Completion

All waves done:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Tasks: {done}/{total}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Commits: {count}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Waves: {count}"
node C:\Users\hasan\.claude/bin/agent-status.js clear   # drop ephemeral .agent-status/ scratch
```

### 4. Handle Failures

Builder returns deviation/blocker:
- **Minor:** Log, continue
- **Major:** Show to employee, ask how to proceed
- **Blocker:** Show, suggest fix or escalation

### 5. Update State

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to built --phase {N} --tasks-done {done} --tasks-total {total} --wave {wave}
```
Error → show, stop.
Do NOT edit STATE.md or tracking.json manually; state.js handles both.

### 6. Route (auto-chain aware)

**`--auto`:** invoke `/qualia-verify {N} --auto` inline. No pause.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Auto mode — chaining into /qualia-verify {N}"
```

Then invoke `qualia-verify` inline with `--auto`.

**Guided mode:** stop, show next step:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} BUILT" "/qualia-verify {N}"
```
