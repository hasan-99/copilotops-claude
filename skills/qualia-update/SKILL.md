---
name: qualia-update
description: "Ship one update to a LAUNCHED project (operate lifecycle). The post-launch counterpart to /qualia-milestone — a lean plan → build → verify → ship loop with no milestone-journey or forced-handoff machinery. Triggers: 'ship an update', 'make a change to the live site', 'the project is live, I need to add X', 'operate mode', 'post-launch change', 'patch the launched product'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# /qualia-update — ship one update to a launched project

The operate-lifecycle counterpart to `/qualia-milestone`. Once a project has
**launched** (`state.js launch` flips `lifecycle` from `build` to `operate`), it
is an **update stream**, not a milestone journey: there is no forced
polish → ship → **handoff** terminal. `/qualia-update` runs one lean change
cycle and loops. Each completed update bumps `lifetime.updates_completed`.

## Output contract

```
Command: /qualia-update {change}
Scope: {files/routes touched}
Intent: build
Mutation: planned → active
Evidence: state.js check, contract-runner output
Output: shipped update + deployed URL
Next: /qualia-update (next change) or done
```

## Process

### 1. Confirm the project is launched

```bash
node C:\Users\hasan\.claude/bin/state.js check
```

- `lifecycle: "operate"` → proceed.
- `lifecycle: "build"` and the product is actually live → launch it first:
  ```bash
  node C:\Users\hasan\.claude/bin/state.js launch --deployed-url {url} --source manual
  ```
  (The ERP can also drive this automatically when it detects the project is live.)
- Still mid-build (never launched, not live) → this is `/qualia-feature` or a
  normal phase, not an update. Route there instead.

### 2. Scope the change (one update = one coherent change)

Keep it small and shippable. A bug fix, a copy change, a new section, a single
feature. If it's larger than ~5 files or needs its own milestone arc, it's a new
`build`-mode milestone — use `/qualia-milestone`, not an update.

### 2b. Set the work-unit goal

Per `rules/codex-goal.md` — set the work-unit goal with scope `feature` (Codex `/goal`; on Claude Code, a tracked task + budget). An update runs its own lean loop without `/qualia-plan`, so set the objective + budget here so the change stays one coherent, bounded unit.

### 3. Run the lean loop

Reuse the real lifecycle skills, scoped to this one change:

```
/qualia-plan {N}     # compile the change into a phase + machine contract
/qualia-build {N}    # builders execute, atomic commits
/qualia-verify {N}   # contract-runner evidence + goal-backward check (must PASS)
```

Verification evidence is mandatory exactly as in build mode — a contract runs and
its evidence must be clean before PASS. On the final phase, a `verified(pass)`
in operate routes here again (`next_command: /qualia-update`) and increments
`lifetime.updates_completed`.

### 4. Ship

```bash
/qualia-ship        # quality gates → commit → deploy → verify live
```

No handoff. No "final milestone." The deploy is just this update going live. Then
`/qualia-report` as usual — the report carries `lifecycle: operate` and the
updated `updates_completed` so the ERP counts updates, not milestones.

### 5. Loop or stop

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "UPDATE SHIPPED" "/qualia-update"
```

Run `/qualia-update` again for the next change, or stop — an operate project has
no terminal state to reach.

## Why this exists

Hard-coding "every project ends in Handoff" forced launched products and
retainers into a state machine that fought them. `/qualia-update` + the `operate`
lifecycle make "this project is live and keeps shipping" explicit state instead
of a milestone the team is forced to mislabel. See `templates/journey.md` rule 3.
