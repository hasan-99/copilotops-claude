---
name: qualia-plan
description: "Plan the current phase — planner agent breaks it into wave-grouped tasks, plan-checker validates (max 2 cycles). Supports `--gaps` for verification-failure closure. Triggers: 'plan this phase', 'break this into tasks', 'plan phase 2'."
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

# /qualia-plan — Plan a Phase

Spawn planner to break phase into tasks, validate with checker (max 2 revision cycles), route to build.

## Usage

`/qualia-plan` — plan next unplanned phase
`/qualia-plan {N}` — plan specific phase N
`/qualia-plan {N} --gaps` — plan fixes for verification failures
`/qualia-plan {N} --skip-check` — skip plan-checker loop (not recommended)
`/qualia-plan {N} --auto` — plan + chain into `/qualia-build {N} --auto` (no human gate)

## Process

### 0. Set the work-unit goal

Per `rules/codex-goal.md` — set the work-unit goal at plan start with scope `phase` (Codex `/goal`; on Claude Code, a tracked task + budget). The objective covers both planning and the subsequent build, so a single goal-set at this stage is enough.

### 1. Determine Phase & Load Context

```bash
cat .planning/STATE.md 2>/dev/null
cat .planning/ROADMAP.md 2>/dev/null
cat .planning/PROJECT.md 2>/dev/null
node C:\Users\hasan\.claude/bin/knowledge.js
node C:\Users\hasan\.claude/bin/knowledge.js load patterns
node C:\Users\hasan\.claude/bin/knowledge.js load client
```

No phase number → current phase from STATE.md.

**Phase-specific context (if exists):**
```bash
cat .planning/phase-{N}-context.md 2>/dev/null   # from /qualia-scope
cat .planning/phase-{N}-research.md 2>/dev/null  # from /qualia-research
```

### 2. Optional: Suggest Deeper Prep

**If ROADMAP.md flagged phase for research AND no phase-{N}-research.md:**

- header: "Research first?"
- question: "Phase flagged for research. Run /qualia-research {N} first?"
- options:
  - "Yes, research first"
  - "Skip, plan directly"

**If phase has compliance/regulatory/architectural stakes AND no phase-{N}-context.md:**

Suggest: *"Run /qualia-scope {N} first to lock decisions? Optional."*

### 3. Spawn Planner (Fresh Context)

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner plan {N} "{phase name from ROADMAP.md}"
node C:\Users\hasan\.claude/bin/qualia-ui.js spawn planner "Breaking phase into tasks..."
```

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/planner.md

<project_context>
@.planning/PROJECT.md
</project_context>

<current_state>
@.planning/STATE.md
</current_state>

<phase_details>
Phase {N} from ROADMAP.md:
@.planning/ROADMAP.md

Goal: {goal from ROADMAP.md}
Reqs: {REQ-IDs from ROADMAP.md}
Success criteria: {success criteria from ROADMAP.md}
</phase_details>

<locked_decisions>
{phase-{N}-context.md Locked Decisions if exists, else 'none'}
</locked_decisions>

<research_findings>
{phase-{N}-research.md recommendation if exists, else 'none'}
</research_findings>

{--gaps → read @.planning/phase-{N}-verification.md failures. Create gap-closure plan.}

<relevant_learnings>
{applicable patterns from knowledge/learned-patterns.md}
</relevant_learnings>

Output: .planning/phase-{N}-plan.md (or phase-{N}-gaps-plan.md for --gaps).
", subagent_type="qualia-planner", description="Plan phase {N}")
```

### 4. Validate Plan (unless --skip-check)

Read generated plan. Spawn checker:

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/plan-checker.md

<plan_path>.planning/phase-{N}-plan.md</plan_path>
<phase_goal>{goal from ROADMAP.md}</phase_goal>
<success_criteria>{criteria from ROADMAP.md}</success_criteria>
<project_context>@.planning/PROJECT.md</project_context>

Validate against 7 rules. Return PASS or REVISE with structured issues.
", subagent_type="qualia-plan-checker", description="Check plan phase {N}")
```

**Revision loop (max 2):**

- Iter 1: Check → REVISE → re-spawn planner with checker issues
- Iter 2: Re-check → REVISE/BLOCKED → escalate to user

(74→86% after 1 round, 88% after 3. Iter 3 adds only 2pp; not worth extra spawn.)

Per revision:

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/planner.md

<revision_mode>true</revision_mode>
<current_plan>@.planning/phase-{N}-plan.md</current_plan>
<checker_feedback>
{REVISE output from plan-checker}
</checker_feedback>

Revise in place. Address every issue. Do NOT add tasks or change scope; fix only what checker flagged.
", subagent_type="qualia-planner", description="Revise plan phase {N}")
```

After revision, re-spawn checker. Max 2 total cycles.

**BLOCKED after 2 cycles:**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Plan failed validation after 2 revisions"
```

Show remaining issues. Options:
- "Skip validation" (`--skip-check`)
- "Adjust roadmap" (scope wrong)
- "Adjust phase goal" (criteria under-specified)

### 5. Present Final Plan

Before presenting, write the machine-readable contract:

```bash
node C:\Users\hasan\.claude/bin/plan-contract.js validate .planning/phase-{N}-contract.json
node C:\Users\hasan\.claude/bin/state.js validate-plan --phase {N} --require-contract
```

The planner must create `.planning/phase-{N}-contract.json` from the final plan. This JSON contract is the authority for build and verification; Markdown contracts are explanatory only. If validation fails, revise the plan/contract pair before asking for approval.

Render story-file dashboard:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js plan-summary .planning/phase-{N}-plan.md
```

End with plain text: *"Approve? (yes / adjust)"*

If "adjust" — get feedback, re-spawn planner with revision context, re-validate.

### 6. Update State

```bash
node C:\Users\hasan\.claude/bin/state.js validate-plan --phase {N} --require-contract
node C:\Users\hasan\.claude/bin/state.js transition --to planned --phase {N}
```

Error → show, stop. Do NOT edit STATE.md or tracking.json manually.

### 7. Route (auto-chain aware)

**`--auto`:** invoke `/qualia-build {N} --auto` inline. User approved at `/qualia-new`; no per-phase gate.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Auto mode — chaining into /qualia-build {N}"
```

Then invoke `qualia-build` inline with `--auto`.

**Guided mode:** stop, show next step:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} PLANNED" "/qualia-build {N}"
```

## Gap Closure Mode (`--gaps`)

With `--gaps`, planner enters gap-closure mode:

1. Read `.planning/phase-{N}-verification.md` → extract ONLY FAIL items
2. Per FAIL, create targeted fix task:
   - **Files:** specific files that failed
   - **Action:** specific fix (not "fix auth"; "add session persistence check in src/lib/auth.ts signIn fn")
   - **AC:** failed criterion restated as observable behavior
3. Do NOT re-plan passing items. No new features. Surgical only.
4. Output: `.planning/phase-{N}-gaps-plan.md`
5. All gap tasks Wave 1 (parallel) unless they share files
6. Plan-checker still validates; same 7 rules

## Rules

1. **Plan-checker mandatory by default.** Skip only with `--skip-check`.
2. **Max 2 revision cycles.** 2 fails → escalate; scope probably wrong.
3. **Honor locked decisions.** phase-{N}-context.md locked decisions non-negotiable.
4. **One plan file per phase.** No phase-1-plan-v2.md. Edit in place.
5. **Revision is surgical.** Fix only what checker flagged; no scope creep.
