---
name: qualia-resume-work
description: "Restore context from a previous session and pick up where you left off. Use this skill whenever the user says 'resume', 'continue work', 'pick up where I left off', 'resume work', 'what was I doing', or starts a new session on an existing project. Also trigger when user mentions '.continue-here', 'last session', or needs to restore context from a previous handoff."
---

# Qualia Resume Work — Session Context Restoration

Restore context from a previous session and route to the right next action.

## Usage

`/qualia-resume-work` — Auto-detect and restore context

## Process

### 1. Load State

Reference: `~/.claude/get-shit-done/workflows/resume-project.md`

Check for context sources in priority order:

1. **`.continue-here.md`** at project root — Full handoff from pause-work
2. **`.planning/STATE.md`** — Project state file
3. **Reconstruct from git** — `git log --oneline -10` and `git diff --stat`

### 2. Context Restoration

#### If `.continue-here.md` exists:
Read it fully — it contains everything: what was done, what's in progress, next steps, decisions, blockers. This is the richest context source.

#### If only STATE.md exists:
Read STATE.md + ROADMAP.md to understand:
- Current milestone and phase
- Phase statuses
- What was last worked on

#### If neither exists:
Reconstruct from git history and file structure. Present findings and ask user to confirm.

### 3. Detect Incomplete Work

Check for signs of interrupted work:
- Phase has PLAN.md but no SUMMARY.md (execution started but not completed)
- Uncommitted changes (`git status --short`)
- Phase marked `in progress` in STATE.md

### 4. Present Status

Concise summary of:
- Where the project stands
- What was happening last session
- Any incomplete work detected

### 5. Route to Next Action

Based on detected state, suggest the most logical next step:
- Incomplete execution → "Continue with `/qualia-execute-phase {N}`"
- Phase done but unverified → "Verify with `/qualia-verify-work {N}`"
- Clean state → "Next up: `/qualia-plan-phase {N}`"
- Has blockers from handoff → Surface them for user decision

Clean up `.continue-here.md` after successful context restoration (or offer to keep it).
