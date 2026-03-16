---
name: qualia-quick
description: "Execute quick tasks with Qualia quality guarantees — atomic commits, STATE.md tracking, minimal overhead. Use this skill whenever the user says 'quick task', 'quick fix', 'just do this quickly', 'small change', 'hotfix', or wants to make a small change outside the normal phase workflow. Also trigger when user mentions 'quick bug fix', '--fix', or needs a fast targeted change with proper tracking. Supports no-plan mode and bug-fix mode with minimal-change discipline."
---

# Qualia Quick — Quick Tasks with Guarantees

Execute small tasks outside the normal phase workflow while maintaining Qualia quality standards: atomic commits, state tracking, and verification.

## Usage

`/qualia-quick "Add loading spinner to dashboard"` — Quick task with planning
`/qualia-quick --no-plan "Update footer copyright year"` — Skip planner, just do it
`/qualia-quick --fix "Login button not responding on mobile"` — Bug fix mode (implies --no-plan)

## Process

### 1. Load Context

Read `.planning/STATE.md` for current project state.

Reference: `~/.claude/get-shit-done/workflows/quick.md`

### 2. Plan (unless --no-plan or --fix)

Quick-plan the task:
- What files need changing
- What the change looks like
- How to verify it works

Quick tasks do NOT create PLAN.md files — planning is lightweight and inline.

### 3. Execute

Implement the change. Quick tasks live in `.planning/quick/` — they're separate from planned phases.

#### Fix Mode (`--fix`)
Bug fix mode enforces minimal-change discipline:
1. **Locate** — Find the exact source of the bug
2. **Root Cause** — Understand why it's happening
3. **Smallest Fix** — Make the minimum change that fixes it
4. **Verify** — Confirm the fix works and nothing else broke

Fix mode skips planning entirely (implies `--no-plan`).

### 4. Verify

Run the change and verify it works:
- Does the feature/fix work as expected?
- No console errors?
- No regressions in related functionality?

### 5. Track

Update `.planning/STATE.md` — add entry to the "Quick Tasks Completed" table:

| Date | Task | Status |
|------|------|--------|
| YYYY-MM-DD | Description | ✅ Done |

**Important**: Quick tasks update STATE.md only, NOT ROADMAP.md. They're tracked separately from planned phases.

### 6. Commit

Atomic commit with descriptive message:
```bash
git add [specific files]
git commit -m "quick: [description of change]"
```
