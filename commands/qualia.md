---
description: "Qualia — check project status and get next-step suggestions"
---

Read the current project state and suggest the next action.

1. Check if `.planning/STATE.md` exists. If not → respond:
   "No Qualia project initialized in this directory. Run `/qualia:new-project` to get started."
   Then stop.

2. If `.planning/STATE.md` exists, read it fully. Also read `.planning/ROADMAP.md` if it exists.

3. Run `git status --short` to check for uncommitted changes.

4. Based on what you find, suggest the single most logical next action:
   - If ROADMAP has phases with status "not started" and no planned phases → "Next: `/qualia:plan-phase <phase-number>`"
   - If a phase is planned but not executed → "Next: `/qualia:execute-phase <phase-number>`"
   - If a phase is executed but not verified → "Next: `/qualia:verify-work <phase-number>`"
   - If all phases complete → "All phases done. Ready to `/qualia:complete-milestone` or ship."
   - If there are uncommitted changes → also mention: "You have uncommitted changes."

5. End with: "Type `/qualia:help` for all available commands."

Keep the response concise — no more than 5-6 lines total.
