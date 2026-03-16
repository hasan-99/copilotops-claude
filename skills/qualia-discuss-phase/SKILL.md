---
name: qualia-discuss-phase
description: "Adaptive questioning to clarify phase scope and decisions before planning begins. Use this skill whenever the user says 'discuss phase', 'let's talk about phase', 'clarify phase', 'phase discussion', or wants to think through a phase's gray areas before creating a plan. Also trigger when user mentions 'what should we decide', 'before we plan', or needs to make design decisions for an upcoming phase."
---

# Qualia Discuss Phase — Pre-Planning Discussion

Adaptive questioning to surface decisions and clarify gray areas before phase planning begins.

## Usage

`/qualia-discuss-phase 3` — Discuss phase 3 before planning
`/qualia-discuss-phase` — Auto-detect next phase needing discussion

## Key Principle

The phase boundary is FIXED — discussion clarifies HOW to implement, not WHETHER to implement. The scope comes from the roadmap; this skill fills in the design decisions.

## Process

### 1. Load Phase Context

Read the phase description from ROADMAP.md and any existing research.

Reference: `~/.claude/get-shit-done/workflows/discuss-phase.md`

### 2. Identify Domain Gray Areas

Based on the phase's domain, identify the key decision areas:

**SEE (UI/Visual phases)** — Layout, component hierarchy, responsive behavior, animation
**CALL (API/Integration phases)** — Response formats, error handling, retry logic, auth flow
**RUN (Processing/Logic phases)** — Output format, edge cases, performance constraints
**READ (Data/Content phases)** — Data structure, relationships, validation rules
**ORGANIZE (Architecture phases)** — Organization criteria, naming conventions, migration paths

### 3. Adaptive Questioning

Ask 4 targeted questions per area. Questions should surface:
- Ambiguities in the requirements
- Design choices that could go multiple ways
- User preferences and priorities
- Constraints not captured in the roadmap

After each set of 4, offer: "Want to go deeper on this area, or move to the next?"

### 4. Create Context Document

Write decisions to `.planning/phases/{phase}-{slug}/{phase}-CONTEXT.md`:

```markdown
# Phase {N}: {Name} — Context & Decisions

## Decisions Made
- Decision 1: [choice] — Rationale: [why]
- Decision 2: [choice] — Rationale: [why]

## Open Questions
- Questions deferred to implementation

## Constraints Identified
- Constraints that affect planning

## User Preferences
- Specific preferences expressed
```

Template: `~/.claude/get-shit-done/templates/context.md`

### 5. Handoff

> "Context captured. These decisions will feed into `/qualia-plan-phase {N}`."
