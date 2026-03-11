---
name: qualia:pause-work
description: Create context handoff when pausing work mid-phase
argument-hint: "[--thoughts]"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Create handoff file to preserve complete work state across sessions.

**Modes:**
- **Default** — Creates `.continue-here.md` in the project root. Routes to the pause-work workflow for phase-aware handoff with git commit.
- `--thoughts` — Creates handoff at `~/.claude/thoughts/handoff-$(date +%Y%m%d-%H%M).md`. Lightweight session summary not tied to a specific project phase. Uses this structure:
  - What We Accomplished (bullet points of completed work)
  - Current State (files modified, tests passing, build status)
  - In Progress (what was being worked on, partial implementations)
  - Next Steps (immediate next action, following actions)
  - Key Decisions Made (decisions and rationale)
  - Blockers/Issues (problems encountered, things to watch out for)
  - Commands to Resume (bash commands to get back to where we were)
  Be specific about file paths and line numbers. Include error messages being debugged. Make it easy for a fresh session to continue.

Routes to the pause-work workflow which handles:
- Current phase detection from recent files
- Complete state gathering (position, completed work, remaining work, decisions, blockers)
- Handoff file creation with all context sections
- Git commit as WIP
- Resume instructions
</objective>

<execution_context>
@.planning/STATE.md
@/home/qualia/.claude/get-shit-done/workflows/pause-work.md
</execution_context>

<process>
**If `--thoughts` flag:**
1. Create `~/.claude/thoughts/` directory if it doesn't exist
2. Generate handoff file at `~/.claude/thoughts/handoff-$(date +%Y%m%d-%H%M).md`
3. Fill in all sections (accomplished, state, in progress, next steps, decisions, blockers, resume commands)
4. Confirm to user with file path

**Default (no flag):**
Follow the pause-work workflow from `@/home/qualia/.claude/get-shit-done/workflows/pause-work.md`.
The workflow handles all logic including:
1. Phase directory detection
2. State gathering with user clarifications
3. Handoff file writing with timestamp
4. Git commit
5. Confirmation with resume instructions
</process>
