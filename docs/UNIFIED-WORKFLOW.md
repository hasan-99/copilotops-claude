# Unified Development Workflow

**GSD (Get Shit Done) + Qualia Skills**

One workflow. Same run. Every time.

---

## Philosophy

### The Problem: Context Rot

Claude's output quality degrades as its context window fills. Long sessions = inconsistent results.

### The Solution: Fresh Contexts + Atomic Tasks

- Each task executes in a fresh 200k-token context
- Plans stay small (2-3 tasks per phase)
- State persists in structured files, not memory

---

## The Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. SETUP ──► 2. DISCUSS ──► 3. PLAN ──► 4. EXECUTE ──► 5. VERIFY ──► 6. SHIP
│      │            │              │            │              │           │
│   5 min        5 min          5 min       varies         10 min      2 min
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: SETUP

**Command:** `/gsd:new-project`

**What happens:**
1. Answer discovery questions about your project
2. GSD researches the domain
3. Generates foundational documents

**Outputs:**
```
PROJECT.md      - Vision and goals (always loaded)
REQUIREMENTS.md - Scoped v1/v2 requirements
ROADMAP.md      - Phase definitions
STATE.md        - Decisions and blockers
.planning/      - Intelligence and artifacts
```

**Duration:** ~5 minutes

**Adjustments:**
- Answer questions based on project type (voice agent, web app, API)
- Specify your stack: Next.js 15, Supabase, VAPI, etc.

---

## Stage 2: DISCUSS

**Command:** `/gsd:discuss-phase [N]`

**What happens:**
1. Review the phase requirements
2. Identify gray areas (UI layout, API format, data structure)
3. Lock decisions into CONTEXT.md

**Purpose:** Eliminate ambiguity BEFORE planning. Decisions made here guide all subsequent work.

**Example decisions:**
- "Use Tailwind with shadcn/ui components"
- "API returns JSON with snake_case keys"
- "Auth via Supabase with RLS policies"

**Duration:** ~5 minutes

**Adjustments:**
- For UI-heavy phases: discuss design system, colors, typography
- For backend phases: discuss data models, auth, API patterns

---

## Stage 3: PLAN

**Command:** `/gsd:plan-phase [N]`

**What happens:**
1. Research domain patterns
2. Create 2-3 atomic task plans (XML format)
3. Verify tasks against requirements

**Outputs:**
```
.planning/
├── phase-N-RESEARCH.md   - Domain findings
└── phase-N-PLAN.md       - Atomic task definitions
```

**Task structure (XML):**
```xml
<task>
  <name>Create user dashboard component</name>
  <files>app/dashboard/page.tsx, components/ui/stats-card.tsx</files>
  <action>Build dashboard with stats cards using shadcn/ui</action>
  <verify>Dashboard renders, shows mock data, responsive</verify>
  <done>Component exists, no TypeScript errors, tests pass</done>
</task>
```

**Duration:** ~5 minutes

**Adjustments:**
- `depth: quick` - Bug fixes, minor features (1-2 tasks)
- `depth: standard` - Regular features (2-3 tasks)
- `depth: comprehensive` - Complex features (3-4 tasks with sub-tasks)

---

## Stage 4: EXECUTE

**Command:** `/gsd:execute-phase [N]`

**What happens:**
1. Spawn parallel executors (fresh context each)
2. Execute tasks following the plan
3. Atomic git commit per task

**During execution, use your skills:**

| Task Type | Skill | Command |
|-----------|-------|---------|
| Frontend UI | frontend-master | `/fd --design` or `/fb` |
| Responsive fixes | responsive | `/resp` |
| Database/Auth | supabase | `/sb` |
| Edge Functions | supabase-edge | - |
| Voice AI | voice-agent | `/va` |
| Debugging | deep-debug | `/dd` |
| Quick fixes | smart-fix | `/sf` |

**Git commits:**
```
feat(phase-1): Create user dashboard component

- Added stats-card component with shadcn/ui
- Implemented responsive grid layout
- Added loading skeleton states

Task: 1/3 of Phase 1
```

**Duration:** Varies (15 min - 2 hours depending on scope)

**Adjustments:**
- For frontend: invoke `/fd` or `/fb` during execution
- For backend: invoke `/sb` for Supabase operations
- For voice: invoke `/va` for VAPI integration

---

## Stage 5: VERIFY

**Command:** `/gsd:verify-work [N]`

**What happens:**
1. Extract deliverables from the phase
2. Walk through each item
3. Diagnose failures automatically
4. Create fix plans if needed

**Verification checklist:**
- [ ] All tasks completed
- [ ] No TypeScript errors
- [ ] Tests pass
- [ ] Responsive on mobile/desktop
- [ ] No console errors
- [ ] Matches requirements

**If issues found:**
- GSD creates targeted fix plans
- Re-execute only failed items
- Fresh context for fixes

**Duration:** ~10 minutes

**Adjustments:**
- For UI: visual inspection + responsive testing
- For API: endpoint testing + error handling
- For voice: conversation flow testing

---

## Stage 6: SHIP

**Command:** `/gsd:complete-milestone`

**What happens:**
1. Archive phase artifacts
2. Tag release in git
3. Update STATE.md
4. Prepare for next milestone

**Final checks:**
```bash
# All tests pass
npm test

# Build succeeds
npm run build

# No lint errors
npm run lint

# Deploy
vercel --prod
```

**Duration:** ~2 minutes

---

## Quick Reference

### Daily Commands

```bash
# Start new project
/gsd:new-project

# Work on phase N
/gsd:discuss-phase N
/gsd:plan-phase N
/gsd:execute-phase N
/gsd:verify-work N

# Complete and move on
/gsd:complete-milestone
/gsd:new-milestone

# Check progress
/gsd:progress

# Ad-hoc quick task
/gsd:quick
```

### Your Skills (Use During Execute)

```bash
# Frontend
/fd   # frontend-master --design (distinctive UI)
/fb   # frontend-master --build (components)
/fm   # frontend-master --modernize (legacy)
/resp # responsive (fix layout issues)

# Backend
/sb   # supabase (database, auth, RLS)

# Voice AI
/va   # voice-agent (VAPI integration)

# Debug & Fix
/dd   # deep-debug (comprehensive)
/sf   # smart-fix (auto-routing)

# Research
/pr   # production-audit
/dr   # deep-research
```

### Configuration

`.planning/config.json`:
```json
{
  "mode": "yolo",
  "depth": "standard",
  "modelProfile": "quality",
  "workflowAgents": {
    "research": true,
    "planCheck": true,
    "verifier": true
  }
}
```

**Modes:**
- `interactive` - Confirm each step
- `yolo` - Auto-approve, maximum speed

**Depth:**
- `quick` - Bug fixes, minor features
- `standard` - Regular features
- `comprehensive` - Complex platforms

**Model Profiles:**
- `quality` - Opus/Opus/Sonnet (best results)
- `balanced` - Opus/Sonnet/Sonnet (good balance)
- `budget` - Sonnet/Sonnet/Haiku (cost-effective)

---

## File Structure

After setup, your project has:

```
your-project/
├── PROJECT.md           # Vision (always loaded)
├── REQUIREMENTS.md      # Scoped requirements
├── ROADMAP.md           # Phase definitions
├── STATE.md             # Decisions & blockers
├── .planning/
│   ├── config.json      # GSD settings
│   ├── intel/           # Codebase intelligence
│   │   ├── exports.json
│   │   ├── patterns.json
│   │   └── graph.sqlite
│   ├── research/        # Domain research
│   └── phase-N-*.md     # Phase artifacts
└── src/                 # Your code
```

---

## Example: Building a Voice Agent Dashboard

### Phase 1: Core UI

```bash
/gsd:discuss-phase 1
# Decide: shadcn/ui, dark mode, dashboard layout

/gsd:plan-phase 1
# Tasks: 1) Layout shell 2) Sidebar nav 3) Stats cards

/gsd:execute-phase 1
# During execution: /fd --build for components

/gsd:verify-work 1
# Check: responsive, dark mode, no errors
```

### Phase 2: Backend Integration

```bash
/gsd:discuss-phase 2
# Decide: Supabase tables, RLS policies, API routes

/gsd:plan-phase 2
# Tasks: 1) Create tables 2) Add RLS 3) API endpoints

/gsd:execute-phase 2
# During execution: /sb for Supabase operations

/gsd:verify-work 2
# Check: queries work, auth enforced
```

### Phase 3: Voice Integration

```bash
/gsd:discuss-phase 3
# Decide: VAPI assistant config, webhook handlers

/gsd:plan-phase 3
# Tasks: 1) VAPI setup 2) Webhook handler 3) Call logging

/gsd:execute-phase 3
# During execution: /va for voice agent setup

/gsd:verify-work 3
# Check: calls connect, logs captured
```

### Ship It

```bash
/gsd:complete-milestone
# Archive, tag v1.0.0, deploy
```

---

## Troubleshooting

### "Context feels degraded"

GSD handles this automatically. If you notice quality dropping:
1. Complete current task
2. Start fresh with `/gsd:execute-phase N` (spawns new context)

### "Plan doesn't match requirements"

```bash
/gsd:plan-phase N  # Re-plan with fresh research
```

### "Stuck on a task"

```bash
/gsd:quick  # Ad-hoc mode, skip the heavy process
```

### "Need to pause work"

```bash
/gsd:pause-work   # Save state
/gsd:resume-work  # Continue later
```

---

## Key Principles

1. **Same run, every time** - The 6 stages don't change
2. **Fresh contexts** - Each executor starts clean
3. **Atomic tasks** - 2-3 per phase, small and verifiable
4. **State in files** - PROJECT.md, STATE.md persist across sessions
5. **Your skills complement** - GSD orchestrates, your skills execute

---

## Migration from Old Workflow

| Old | New |
|-----|-----|
| `/workflows:plan` | `/gsd:new-project` + `/gsd:plan-phase` |
| `/workflows:work` | `/gsd:execute-phase` |
| `/workflows:review` | `/gsd:verify-work` + 3 key agents |
| `/workflows:compound` | Keep for documentation |

**Agents to keep for reviews:**
- `kieran-typescript-reviewer` - TypeScript quality
- `security-sentinel` - Security issues
- `code-simplicity-reviewer` - Complexity check

---

## Summary

```
Every project, every time:

1. /gsd:new-project         → Setup foundation
2. /gsd:discuss-phase N     → Lock decisions
3. /gsd:plan-phase N        → Atomic tasks
4. /gsd:execute-phase N     → Build with your skills
5. /gsd:verify-work N       → Validate
6. /gsd:complete-milestone  → Ship

Repeat phases until done. Ship. Next milestone.
```
