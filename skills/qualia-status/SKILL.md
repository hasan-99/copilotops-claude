---
name: qualia-status
description: "Check current project status and get next-step suggestions based on planning state. Use this skill when the user asks 'what's next', 'project status', 'where am I', 'qualia status', or wants to know the current state of their Qualia workflow project. Also trigger when user seems unsure what to do next in a project with .planning/ directory."
---

# Qualia Status — Project State & Next Steps

Read the current project state and suggest the single most logical next action.

## Process

### 1. Check for Project State

Look for `.planning/STATE.md`. If it doesn't exist:
> "No Qualia project initialized in this directory. Run `/qualia:new-project` to get started."

Then stop.

### 2. Read Project State

If `.planning/STATE.md` exists, read it fully. Also read `.planning/ROADMAP.md` if it exists.

### 3. Check Git Status

```bash
git status --short
```

### 4. Suggest Next Action

Based on what you find, recommend the single most logical next step:

- ROADMAP has phases with status "not started" and no planned phases → **"Next: plan-phase `<phase-number>`"**
- A phase is planned but not executed → **"Next: execute-phase `<phase-number>`"**
- A phase is executed but not verified → **"Next: verify-work `<phase-number>`"**
- All phases complete → **"All phases done. Ready to complete-milestone or ship."**
- Uncommitted changes detected → also mention: **"You have uncommitted changes."**

### 5. Close

End with: "Type `/qualia:help` for all available commands."

## Response Format

Keep the response concise — no more than 5-6 lines total. This is a quick status check, not a detailed report.
