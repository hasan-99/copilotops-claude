---
name: qualia-progress
description: "Check project progress and get routed to the right next action. Use this skill whenever the user says 'progress', 'how far along', 'what happened', 'show progress', or wants a summary of what's been done and what comes next. Also trigger when user seems to need situational awareness about their project state before deciding what to do. Routes to the most logical next step based on current state."
---

# Qualia Progress — Progress Check & Routing

Check current progress, summarize state, and route to the most logical next action.

## Usage

`/qualia-progress` — Check progress and get next-step recommendation

## Process

### 1. Load State

Read `.planning/STATE.md`, `.planning/ROADMAP.md`, and check `git status --short`.

Reference: `~/.claude/get-shit-done/workflows/progress.md`

### 2. Summarize Progress

Present a concise summary:
- Current milestone and phase
- Phases completed vs total
- Current phase status
- Any uncommitted changes
- Recent activity

### 3. Route to Next Action

Based on current state, recommend one of these routes:

**Route A** — Phase needs planning:
> "Phase {N} is next and unplanned. Run `/qualia-plan-phase {N}`."

**Route B** — Phase is planned, needs execution:
> "Phase {N} is planned and ready. Run `/qualia-execute-phase {N}`."

**Route C** — Phase is executed, needs verification:
> "Phase {N} is done but unverified. Run `/qualia-verify-work {N}`."

**Route D** — Verification found gaps:
> "Phase {N} has gaps from verification. Run `/qualia-plan-phase {N} --gaps`."

**Route E** — All phases complete:
> "All phases done! Run `/qualia-audit-milestone` to verify the milestone."

**Route F** — Milestone audit complete:
> "Milestone audit passed. Run `/qualia-complete-milestone` to archive and tag."

Keep the output concise — this is a quick status check with routing, not a detailed report.
