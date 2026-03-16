---
name: qualia-list-phase-assumptions
description: "Surface hidden assumptions before phase planning begins — technical approach, implementation order, scope, risks, dependencies. Use this skill whenever the user says 'list assumptions', 'what assumptions', 'phase assumptions', 'before we plan', or wants to explicitly check what they're assuming about a phase before committing to a plan. Also trigger when user mentions 'hidden assumptions', 'what are we taking for granted', or needs a pre-planning sanity check."
---

# Qualia List Phase Assumptions — Assumption Surfacing

Surface hidden assumptions across 5 areas before phase planning begins. Conversational output only — no files created.

## Usage

`/qualia-list-phase-assumptions 3` — List assumptions for phase 3
`/qualia-list-phase-assumptions` — Auto-detect next phase to analyze

## Process

### 1. Load Context

Read:
- `.planning/ROADMAP.md` — Phase description
- `.planning/PROJECT.md` — Tech stack and constraints
- `.planning/REQUIREMENTS.md` — Related requirements
- Phase RESEARCH.md if it exists

Reference: `~/.claude/get-shit-done/workflows/list-phase-assumptions.md`

### 2. Analyze 5 Areas

For each area, identify what's being assumed without being stated:

#### Technical Approach
- What tech/libraries are we assuming we'll use?
- Are we assuming a specific architecture pattern?
- Are we assuming certain APIs or services are available?

#### Implementation Order
- Are we assuming certain things should be built first?
- Are we assuming a specific development sequence?
- Could a different order be more efficient?

#### Scope
- Are we assuming certain things are in/out of this phase?
- Are we assuming a level of polish or completeness?
- Are there edge cases we're assuming we don't need to handle?

#### Risks
- What could go wrong that we haven't considered?
- Are we assuming things will "just work"?
- What if a key assumption turns out to be wrong?

#### Dependencies
- Are we assuming other phases are complete?
- Are we assuming access to certain APIs/services/data?
- Are we assuming team availability or skills?

### 3. Present Findings

Present assumptions conversationally, grouped by area. For each assumption, note:
- What's being assumed
- Why it matters if wrong
- How confident we should be

### 4. Close

End with: "What do you think? Any of these surprise you or seem risky?"

No files are created — this is a conversational exercise to inform planning.
