---
name: qualia-new-milestone
description: "Start a new milestone on an existing project — brownfield initialization with questioning, optional research, requirements, and roadmap. Use this skill whenever the user says 'new milestone', 'next milestone', 'start v2', 'milestone 2', or wants to begin a new phase of work on a project that already has a .planning directory. Also trigger when user mentions 'next version', 'new feature set', or needs to plan the next iteration of an existing project."
---

# Qualia New Milestone — Brownfield Milestone Start

Start a new milestone on an existing project. Similar to new-project but preserves existing project context.

## Usage

`/qualia-new-milestone` — Start new milestone interactively
`/qualia-new-milestone "v2: Add analytics dashboard"` — With initial description

## Prerequisites

Project must already have `.planning/` directory. If not, use `qualia-new-project` instead.

## Process

### 1. Load Existing Context

Read:
- `.planning/PROJECT.md` — Current project state
- `.planning/milestones/` — Previous milestone archives (if any)
- `.planning/STATE.md` — Current state

Reference: `~/.claude/get-shit-done/workflows/new-milestone.md`

### 2. Questioning Phase

Reference: `~/.claude/get-shit-done/references/questioning.md`

Ask targeted questions building on existing project knowledge:
- What's the goal of this milestone?
- What new features or improvements?
- Any tech stack changes or additions?
- What's the timeline?
- Lessons from the previous milestone to apply?

### 3. Research (Optional)

If the milestone involves new tech or unfamiliar territory, conduct research.
Otherwise, skip — the project already has established patterns.

### 4. Create/Update Files

#### Update PROJECT.md
Add new milestone section to existing PROJECT.md (don't overwrite).

#### Create REQUIREMENTS.md
Fresh requirements for this milestone:
Template: `~/.claude/get-shit-done/templates/requirements.md`
- Milestone definition (v{next_version})
- Functional requirements
- Non-functional requirements
- Definition of Done

#### Create ROADMAP.md
Fresh roadmap for this milestone's phases. Previous roadmap is archived in milestones/.

#### Update STATE.md
Reset phase tracking for the new milestone while preserving project-level info.

#### Research (if conducted)
Save to `.planning/research/` directory.

UI/brand reference: `~/.claude/get-shit-done/references/ui-brand.md`

### 5. Next Step

> "Milestone v{version} initialized with {N} phases. Run `/qualia-plan-phase 1` to start planning."
