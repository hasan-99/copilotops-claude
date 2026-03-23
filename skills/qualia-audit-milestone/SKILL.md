---
name: qualia-audit-milestone
description: "Verify milestone definition of done — aggregate verification results, check tech debt, run integration tests. Use this skill whenever the user says 'audit milestone', 'check milestone', 'milestone review', 'are we done', or wants to verify that all phases of a milestone meet the definition of done before completing it. Also trigger when user mentions 'milestone audit', 'definition of done check', or needs to validate overall milestone readiness."
---

# Qualia Audit Milestone — Milestone Verification

Orchestrate a full audit of the current milestone to verify all requirements are met before completion.

## Usage

`/qualia-audit-milestone` — Audit current milestone

## Process

### 1. Load Context

Read all project files:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md` — Definition of Done
- `.planning/ROADMAP.md` — All phases
- `.planning/config.json`

Reference: `~/.claude/get-shit-done/workflows/audit-milestone.md`

### 2. Read Verification Results

For each completed phase, read its VERIFICATION.md or UAT.md files. Aggregate results:
- How many phases verified passing
- How many have outstanding issues
- What gaps remain

### 3. Check Requirements

Walk through every item in REQUIREMENTS.md Definition of Done:
- Is each requirement addressed by a completed phase?
- Is each requirement verified as working?
- Flag any unmet requirements

### 4. Tech Debt Aggregation

Scan phase summaries and verification files for noted tech debt, workarounds, or deferred items. Compile a tech debt list.

### 5. Shipping Checklist Audit

Run the full shipping checklist from `~/Projects/live/qualia/docs/completion-checklists.md` as part of the audit.

Detect project type from `.planning/PROJECT.md` and load the matching checklist:
- **website** → "Website-Specific Checklist" + "Universal Checklist"
- **agent** → "AI Agent Checklist" + "Universal Checklist"
- **voice** → "Voice Agent Checklist" + "Universal Checklist"
- **mobile** → "Mobile App Checklist" + "Universal Checklist"
- **platform** → "Platform with LLM Checklist" + "Universal Checklist"

For every checklist item, run automated verification where possible. Include a "Shipping Checklist" section in the audit report with PASS/WARN/FAIL per item. FAIL items contribute to the overall PASS/FAIL decision.

### 6. Integration Check

Spawn an integration checker to verify cross-phase functionality:
- Do features from different phases work together?
- Are there any conflicts or regressions?
- End-to-end user flows work?

### 7. Produce Audit Report

Write `v{version}-MILESTONE-AUDIT.md`:

```markdown
# Milestone v{version} Audit

## Requirements Status
| Requirement | Phase | Verified | Status |
|------------|-------|----------|--------|
| ... | ... | ... | ✅/❌ |

## Gaps
- List of unmet requirements or failing tests

## Tech Debt
- Items deferred during implementation

## Integration Results
- Cross-phase test outcomes

## Overall: PASS / FAIL
```

### 8. Route

**If PASS**: "Milestone audit passed. Run `/qualia-complete-milestone` to archive and tag."

**If FAIL**: "Audit found gaps. Run `/qualia-plan-milestone-gaps` to create fix phases."
