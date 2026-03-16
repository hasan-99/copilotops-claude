---
name: qualia-plan-milestone-gaps
description: "Create fix phases from milestone audit gaps — reads the most recent audit report and generates ROADMAP.md entries for all identified gaps. Use this skill whenever the user says 'plan gaps', 'fix gaps', 'plan milestone gaps', 'create fix phases', or wants to turn audit findings into actionable phases. Also trigger after a milestone audit reveals gaps that need addressing."
---

# Qualia Plan Milestone Gaps — Gap-to-Phase Conversion

Read the most recent milestone audit report and create ROADMAP.md phases to close all identified gaps.

## Usage

`/qualia-plan-milestone-gaps` — Auto-detect latest audit, create fix phases

## Process

### 1. Find Latest Audit

```bash
ls -t .planning/v*-MILESTONE-AUDIT.md | head -1
```

Read the most recent `v*-MILESTONE-AUDIT.md` file.

Reference: `~/.claude/get-shit-done/workflows/plan-milestone-gaps.md`

### 2. Load Project Context

Read these files for full context:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### 3. Extract and Group Gaps

From the audit report, extract all gaps (items marked as failing or incomplete). Group related gaps into logical phases:
- Group by feature area or component
- Keep phases small (completable in 1-2 sessions)
- Order by dependency — fix foundations before features

### 4. Create ROADMAP.md Entries

Append new phases to ROADMAP.md. Each gap-fix phase should include:
- Phase number (continuing from existing phases)
- Name: `Fix: [area]`
- Description of what gaps it closes
- Status: `not started`
- Reference to specific audit gaps being addressed

### 5. Update STATE.md

Update the phase table in STATE.md to reflect the new fix phases.

### 6. Report

Tell the user how many gaps were found, how many fix phases were created, and suggest:
> "Fix phases created. Run `/qualia-plan-phase [next-phase-number]` to plan the first fix."
