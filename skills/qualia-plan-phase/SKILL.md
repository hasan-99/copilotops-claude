---
name: qualia-plan-phase
description: "Create detailed execution plans for a project phase with optional research and verification. Use this skill whenever the user says 'plan phase', 'plan next phase', 'create plan', or wants to plan out how a specific phase of work should be executed. Also trigger when user mentions 'PLAN.md', 'phase planning', or needs to break a roadmap phase into concrete implementation steps. Supports research integration, gap closure planning, and plan verification."
---

# Qualia Plan Phase — Phase Planning

Create detailed PLAN.md files for a project phase, with optional research and verification loop.

## Usage

`/qualia-plan-phase 3` — Plan phase 3
`/qualia-plan-phase` — Auto-detect next unplanned phase
`/qualia-plan-phase 3 --research` — Force research before planning
`/qualia-plan-phase 3 --skip-research` — Skip research even if recommended
`/qualia-plan-phase 3 --gaps` — Plan gap closure (after verify-work found issues)
`/qualia-plan-phase 3 --skip-verify` — Skip plan verification step

## Process

### 1. Identify Target Phase

If phase number provided, use it. Otherwise, scan ROADMAP.md for the first phase with status `not started` or `planned` without a PLAN.md.

Reference: `~/.claude/get-shit-done/workflows/plan-phase.md`

### 2. Research (if needed)

Research is recommended when:
- Phase involves unfamiliar tech or APIs
- Phase has complex architectural decisions
- User passes `--research` flag

Skip if `--skip-research` is passed or if research already exists at `.planning/phases/{phase}-{slug}/{phase}-RESEARCH.md`.

If research is needed, use the qualia-research-phase skill first.

### 3. Create PLAN.md

Write to `.planning/phases/{phase}-{slug}/PLAN.md`:

```markdown
# Phase {N}: {Name} — Execution Plan

## Objective
What this phase accomplishes.

## Prerequisites
- What must be done/ready before starting

## Implementation Steps

### Step 1: {description}
- Files to create/modify
- Key implementation details
- Acceptance criteria

### Step 2: {description}
...

## Verification Checklist
- [ ] Each testable outcome
- [ ] Integration points work
- [ ] No regressions

## Risks & Mitigations
- Risk 1 → Mitigation
```

For `--gaps` mode, the plan focuses specifically on closing gaps identified by verify-work, referencing the UAT.md findings.

### 4. Verify Plan (unless --skip-verify)

Spawn the qualia-plan-checker agent to review the plan for:
- Completeness against requirements
- Realistic scope
- Clear acceptance criteria
- No missing dependencies

Reference: `~/.claude/agents/qualia-plan-checker.md`

If checker finds issues, revise the plan and re-verify.

### 5. Update State

Update `.planning/STATE.md` to reflect the phase is now `planned`.

Reference UI/brand guidelines: `~/.claude/get-shit-done/references/ui-brand.md`

For complex phases touching multiple subsystems, consider `/deep-research` before phase research to establish architectural direction.

### 6. Next Step

> "Phase {N} planned. Run `/qualia-execute-phase {N}` to begin execution."

### Agents Used
| Agent | File | Role |
|-------|------|------|
| `qualia-planner` | `~/.claude/agents/qualia-planner.md` | Creates PLAN.md with goal-backward methodology |
| `qualia-plan-checker` | `~/.claude/agents/qualia-plan-checker.md` | Validates plan completeness |
| `qualia-phase-researcher` | `~/.claude/agents/qualia-phase-researcher.md` | Phase research (when --research) |
