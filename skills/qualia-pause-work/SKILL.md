---
name: qualia-pause-work
description: "Save session context for seamless handoff between Claude sessions. Use this skill whenever the user says 'pause', 'save progress', 'stop for now', 'pause work', 'handoff', 'save thoughts', or wants to preserve their current working state before ending a session. Also trigger when user mentions 'continue later', 'pick up tomorrow', or needs to create a checkpoint of current work. Supports both full project handoff and lightweight thoughts mode."
---

# Qualia Pause Work — Session Handoff

Save current session context so the next session can pick up exactly where you left off.

## Usage

`/qualia-pause-work` — Full project-aware handoff (creates `.continue-here.md`)
`/qualia-pause-work --thoughts` — Lightweight thought dump (saves to `~/.claude/thoughts/`)

## Default Mode (Project Handoff)

### 1. Read Current State

Load `.planning/STATE.md` and check current phase status.

Reference: `~/.claude/get-shit-done/workflows/pause-work.md`

### 2. Create `.continue-here.md`

Write a handoff file at the project root with:

```markdown
# Continue Here

## Session Summary
What was accomplished this session.

## Current Phase
Phase X: [name] — [status]

## In Progress
- What's partially done
- Where exactly work stopped

## Next Steps
1. Immediate next action
2. Following actions

## Key Decisions Made
- Decision 1 and rationale
- Decision 2 and rationale

## Blockers / Open Questions
- Any unresolved issues

## Files Modified
- List of changed files with brief description
```

### 3. Git Commit

Stage and commit with a descriptive message:
```bash
git add -A
git commit -m "WIP: [phase name] - [brief description of state]"
```

## Thoughts Mode (`--thoughts`)

Lightweight handoff for non-project work or quick brainstorming sessions.

### Save Location
`~/.claude/thoughts/handoff-{timestamp}.md`

### Structure
```markdown
# Handoff — {date}

## Accomplished
- What got done

## Current State
- Where things stand

## In Progress
- Partially complete work

## Next Steps
1. What to do next

## Key Decisions
- Important choices made

## Blockers
- What's stuck

## Commands to Resume
- Specific commands or files to look at
```

No git commit in thoughts mode — it's just a text dump for context restoration.
