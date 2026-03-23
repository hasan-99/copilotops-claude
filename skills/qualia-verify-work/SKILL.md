---
name: qualia-verify-work
description: "Conversational UAT testing for a completed phase — verify work meets requirements with persistent test tracking. Use this skill whenever the user says 'verify', 'test phase', 'check work', 'UAT', 'verify work', or wants to validate that a completed phase meets its acceptance criteria. Also trigger when user mentions 'quality check', 'does this work', or needs to run through verification of implemented features."
---

# Qualia Verify Work — Phase UAT Testing

Run conversational UAT (User Acceptance Testing) for a completed phase with persistent state tracking.

## Usage

`/qualia-verify-work 3` — Verify phase 3
`/qualia-verify-work` — Auto-detect phase needing verification

## Process

### 1. Load Context

Read:
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- Phase PLAN.md — for acceptance criteria
- Phase SUMMARY.md — for what was implemented

Reference: `~/.claude/get-shit-done/workflows/verify-work.md`

### 2. Create UAT Tracking

Create `{phase}-UAT.md` using template from `~/.claude/get-shit-done/templates/UAT.md`:

```markdown
# Phase {N}: {Name} — UAT Results

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | [from acceptance criteria] | ⏳ | |
| 2 | ... | ⏳ | |

## Issues Found
(none yet)

## Overall: ⏳ In Progress
```

### 3. Conversational Testing

Walk through each acceptance criterion from the PLAN.md:
- Test the feature/behavior
- Record pass (✅) or fail (❌) in the UAT table
- For failures, document what went wrong

This is interactive — discuss findings with the user as you go.

### 4. Handle Results

#### All tests pass:
Update UAT.md overall status to ✅ PASSED. Update STATE.md phase status to `verified`.
> "Phase {N} verified! Run `/qualia-progress` for next steps."

#### Issues found:
Document gaps in UAT.md. For each gap:
- What's wrong
- Severity (blocker, major, minor)
- Suggested fix approach

Then offer:
> "Found {N} issues. Run `/qualia-plan-phase {phase} --gaps` to create fix plans, then `/qualia-execute-phase {phase} --gaps-only` to fix them."

### 5. Shipping Checklist Cross-Reference

After UAT testing, cross-reference results against the relevant shipping checklist from `~/Projects/live/qualia/docs/completion-checklists.md`.

Detect project type from `.planning/PROJECT.md` or `package.json` and load:
- **website** → "Website-Specific Checklist" + "Universal Checklist"
- **agent** → "AI Agent Checklist" + "Universal Checklist"
- **voice** → "Voice Agent Checklist" + "Universal Checklist"
- **mobile** → "Mobile App Checklist" + "Universal Checklist"
- **platform** → "Platform with LLM Checklist" + "Universal Checklist"

For items relevant to this phase's scope, verify each one:
- Run automated checks where possible (grep for service_role, check meta tags, etc.)
- Add unchecked items as additional UAT entries in the phase UAT.md
- Report: "Shipping checklist: X/Y items verified for this phase"

Do NOT check items outside this phase's scope (e.g., don't check deployment items during a Phase 1 verify).

### 6. Design Quality Check (Frontend Phases)

If the phase involves frontend work (detected from PLAN.md file references or phase description), after UAT passes with zero issues, suggest the design quality workflow:

`/critique` → `/polish` → `/harden` → then proceed to next phase.

This is advisory — user can skip by running the next command directly.

### 7. Update State

Update `.planning/STATE.md` to reflect verification status.

### Agents Used
| Agent | File | Role |
|-------|------|------|
| `qualia-planner` | `~/.claude/agents/qualia-planner.md` | Creates fix plans from diagnosed gaps |
| `qualia-plan-checker` | `~/.claude/agents/qualia-plan-checker.md` | Validates fix plans (max 3 iterations) |
