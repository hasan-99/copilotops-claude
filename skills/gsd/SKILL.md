---
name: gsd
description: Smart GSD router - reads project state and auto-routes to the right command
tags: [gsd, workflow, auto-route]
model: claude-sonnet-4-20250514
---

# GSD Smart Router

Single entry point that reads project state and routes to the appropriate GSD action.

## How It Works

1. Detect if we're in a GSD project (has .planning/)
2. Read STATE.md to find current position
3. Analyze what's needed next
4. Route to the correct /gsd: command OR execute directly

## Execution

### Step 1: Detect Project State

```bash
# Check if .planning exists
if [ ! -d ".planning" ]; then
  echo "NO_PROJECT"
  exit 0
fi

# Check for STATE.md
if [ -f ".planning/STATE.md" ]; then
  cat .planning/STATE.md
fi

# Check for ROADMAP.md
if [ -f ".planning/ROADMAP.md" ]; then
  cat .planning/ROADMAP.md
fi

# List phase directories
ls -la .planning/phases/ 2>/dev/null || echo "NO_PHASES"
```

### Step 2: Parse Current Position

From STATE.md, extract:
- `current_phase`: Which phase number we're on
- `phase_status`: planning | executing | verifying | complete
- `blockers`: Any blockers or decisions needed

From ROADMAP.md, extract:
- Total phases
- Which phases are complete
- Next phase info

### Step 3: Route Decision Tree

```
NO .planning/ directory?
  → "No GSD project. Run /gsd:new-project to initialize."

Has .planning/ but no STATE.md?
  → "Project initialized but no state. Run /gsd:progress to diagnose."

STATE.md exists:

  phase_status = "needs_discussion"?
    → Route to: /gsd:discuss-phase {current_phase}

  phase_status = "discussed" or "needs_planning"?
    → Route to: /gsd:plan-phase {current_phase}

  phase_status = "planned" or "needs_execution"?
    → Route to: /gsd:execute-phase {current_phase}

  phase_status = "executed" or "needs_verification"?
    → Route to: /gsd:verify-work {current_phase}

  phase_status = "verified" or "complete"?
    → Check if more phases exist
    → If yes: increment phase, route to discuss
    → If no: "Milestone complete! Run /gsd:complete-milestone"

  blockers exist?
    → Show blockers, ask user how to proceed
```

### Step 4: Execute or Prompt

**If clear next action:**
Invoke the appropriate skill directly using:
```
Skill(skill="gsd:{action}", args="{phase_number}")
```

**If ambiguous:**
Present options to user:
```
Current: Phase {N} - {status}

Options:
1. Continue with {recommended_action}
2. Check progress (/gsd:progress)
3. Quick task (/gsd:quick)
```

## Output Format

```
## GSD Status

**Project:** {project_name from PROJECT.md or directory name}
**Phase:** {N} of {total} - {phase_name}
**Status:** {status_emoji} {status_description}

---

**Next:** /gsd:{action} {phase}

{If blockers: show them}
{If decision needed: present options}
```

## Status Emojis

- `planning` - Planning phase
- `executing` - Building
- `verifying` - Testing
- `complete` - Done
- `blocked` - Needs input

## Quick Actions

If user provides argument:

- `/gsd plan` → Force plan current phase
- `/gsd exec` → Force execute current phase
- `/gsd verify` → Force verify current phase
- `/gsd next` → Move to next phase
- `/gsd quick {description}` → Pass to /gsd:quick

## No Project Fallback

If no .planning/ exists:

```
No GSD project detected in current directory.

Options:
1. /gsd:new-project - Initialize new project with full workflow
2. /gsd:quick - Run a quick task without project setup
```
