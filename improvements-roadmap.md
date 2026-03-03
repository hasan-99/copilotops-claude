# Claude Code Workflow Improvements Roadmap

**Date:** 2026-03-03
**Last Audit:** 2026-03-03 (Full directory audit + verification)
**Context:** Full audit of ~/.claude configuration + GSD workflow review
**Goal:** Make GSD the true top-level orchestrator that leverages skills as building blocks, with deep context awareness, team agent orchestration, and template-driven project spawning.

---

## Audit Summary (What's True, What's Not)

### Verified True
- GSD planner + executor are skill-blind — confirmed by reading both agent files (no skill references)
- `/ship` command references deleted `deployment-map.md` — confirmed broken on line 1
- `save-session-state.sh` — clean, no stale references (was fixed last session)
- `pre-compact.sh` — working but minimal (only saves git branch + changed files)
- `frontend.md` rule exists but is just 5 lines, no GSD integration note
- Skills directory has 26 skills, none referenced by any GSD agent
- Templates directory exists at `get-shit-done/templates/` but has no project templates (only `codebase/` and template reference docs)
- `context-save.md` command references a `context-manager` subagent_type that doesn't exist as an agent file
- No session-to-session context bridge — `session-env/` stores raw JSON snapshots but nothing reads them back

### Verified Fixed (Previous Session)
- [x] Zoho MCP removed from enabledMcpjsonServers
- [x] branch-guard.sh catches bare `git push`
- [x] pre-commit.sh has $DIM variable
- [x] save-session-state.sh has no stale references
- [x] 3 disabled plugins removed
- [x] Cleanup completed (800MB → 155MB)

### New Issues Found This Audit
- `learned-patterns.md` line 10 references `deployment-map.md` (deleted) — needs update to `qualia-context.md`
- `context-save.md` command uses non-existent `context-manager` subagent_type — broken command
- `context-restore.md` likely also broken (references same non-existent agent type)
- No mechanism for cross-session context continuity — `session-env/` files are write-only
- Pre-compact hook saves minimal info — doesn't preserve current task name, phase, or decisions
- GSD `execute-phase` workflow has no skill-loading step between `load_plan` and `execute_tasks`
- No team/swarm orchestration capability — all agents are solo-spawned, no multi-agent coordination
- `qualia-workflow` skill exists but is only 1 file — unclear if it does anything meaningful

---

## Completed Work (Previous Sessions)

### Cleanup (800MB → 155MB)
- [x] Deleted stale project contexts (630MB)
- [x] Cleaned session-env (288 files), todos (153 files), tasks (72 files), file-history, debug, plans, thoughts
- [x] Deleted 5 orphan knowledge files
- [x] Deleted 3 orphan hooks
- [x] Deleted INVENTORY.md and sessions.md rule

### Config Fixes
- [x] Removed Zoho MCP from enabledMcpjsonServers
- [x] Registered post-deploy.sh as PostToolUse hook
- [x] Removed 3 disabled plugins
- [x] Fixed branch-guard.sh, pre-commit.sh, save-session-state.sh

---

## Phase 1: Make GSD Skill-Aware (CRITICAL — P0)

The core fix. GSD agents must know about and use skills.

### 1A. Update `~/.claude/agents/gsd-planner.md`

Add `<skill_awareness>` section with domain-to-skill mapping:

| Task Domain | Skill | Reference Path |
|-------------|-------|----------------|
| Frontend UI, components, pages | frontend-master | `~/.claude/skills/frontend-master/SKILL.md` |
| Responsive design, mobile layouts | responsive | `~/.claude/skills/responsive/SKILL.md` |
| Supabase schema, RLS, migrations, edge functions | supabase | `~/.claude/skills/supabase/SKILL.md` |
| Admin dashboards, user management | admin-panel | `~/.claude/skills/admin-panel/SKILL.md` |
| Voice agents, VAPI, call flows | voice-agent | `~/.claude/skills/voice-agent/SKILL.md` |
| SEO, metadata, schema markup | seo-master | `~/.claude/skills/seo-master/SKILL.md` |
| Document generation (docx, pdf) | docx / pdf | `~/.claude/skills/docx/SKILL.md` or `~/.claude/skills/pdf/SKILL.md` |
| Testing, test generation | test-runner | `~/.claude/skills/test-runner/SKILL.md` |
| Zoho invoicing, email | zoho-workflow | `~/.claude/skills/zoho-workflow/SKILL.md` |
| Deployment, CI/CD | deploy | `~/.claude/skills/deploy/SKILL.md` |
| Deploy verification | deploy-verify | `~/.claude/skills/deploy-verify/SKILL.md` |

When creating PLAN.md files, the planner includes skill references as `@context` so executors load them automatically.

### 1B. Update `~/.claude/agents/gsd-executor.md`

Add `<skill_awareness>` step between `load_plan` and `execute_tasks`:

```xml
<step name="load_skill_context">
If plan context references skill SKILL.md files, read them.
Skill patterns are MANDATORY — they represent Fawzi's design standards.
Key skills: frontend-master, supabase, responsive, voice-agent, admin-panel, seo-master
</step>
```

### 1C. Update `~/.claude/rules/frontend.md`

Add: "GSD executors MUST follow these rules when building any frontend component."

### 1D. Fix `learned-patterns.md` stale reference

Change line 10 from `deployment-map.md` → `qualia-context.md`

---

## Phase 2: Context Management & Session Awareness (NEW — P0)

Currently the biggest gap. Sessions are isolated islands — no memory bridge.

### 2A. Fix `pre-compact.sh` — Richer Context Preservation

Current: only saves git branch + changed files.
**Should also save:**
- Current GSD phase/milestone (parse from `.planning/STATE.md`)
- Active task name and step
- Key decisions made this session
- Unresolved errors or blockers
- Working directory and project name

### 2B. Create Session Context Bridge (`~/.claude/hooks/session-context-loader.sh`)

New **SessionStart** hook that:
1. Reads latest `session-env/session_*.json`
2. Reads `session-env/pre-compact.json` if exists
3. Outputs a structured summary as hook output so Claude sees it at session start
4. Includes: last project, last phase, last task, uncommitted changes, blockers

This closes the loop — `save-session-state.sh` writes, `session-context-loader.sh` reads.

### 2C. Fix `/context-save` and `/context-restore` Commands

Current state: both reference non-existent `context-manager` subagent_type.

**Fix:** Rewrite to use `general-purpose` subagent_type (or remove subagent and do it inline). Should:
- `/context-save`: Capture project state, decisions, patterns → write to `.claude/context/{project}-{date}.md`
- `/context-restore`: Read latest context file for current project → inject into conversation

### 2D. Per-Project Context Files

Create `~/.claude/context/` directory structure:
```
context/
├── {project-name}/
│   ├── latest.md          # Always-updated current state
│   ├── decisions.md       # Architectural decisions log
│   └── sessions/          # Per-session snapshots
│       └── 2026-03-03.md
```

Auto-updated by SessionEnd hook. Read by SessionStart hook when `pwd` matches a known project.

---

## Phase 3: Team Agent Orchestration / Swarms (NEW — P1)

Currently all GSD agents are solo-spawned. No way to run coordinated multi-agent workflows.

### 3A. Create `~/.claude/agents/team-orchestrator.md`

A meta-agent that can:
1. Receive a high-level task (e.g., "build the full landing page")
2. Break it into specialist roles (frontend-agent, backend-agent, test-agent)
3. Spawn them in coordinated waves with shared context
4. Collect outputs, resolve conflicts, merge results

**Orchestration patterns:**
- **Pipeline:** Agent A → Agent B → Agent C (sequential handoff)
- **Fan-out/Fan-in:** Spawn 3 agents in parallel, collect results, synthesize
- **Review loop:** Builder agent → Reviewer agent → Builder fixes → Done

### 3B. Create Team Templates (`~/.claude/agents/teams/`)

Pre-defined team compositions for common workflows:

**`full-stack-team.md`:**
- frontend-agent: UI components following frontend-master skill
- backend-agent: Supabase schema, RLS, edge functions following supabase skill
- test-agent: Integration tests, E2E tests
- Orchestrator merges and resolves conflicts

**`review-team.md`:**
- code-simplicity-reviewer + performance-oracle + kieran-typescript-reviewer
- Run in parallel, produce unified report

**`ship-team.md`:**
- quality-gate-agent (tsc, eslint, build)
- deploy-agent (commit, push, deploy)
- verify-agent (6-check post-deploy)
- Pipeline: gate → deploy → verify

### 3C. Add `/team` Command (`~/.claude/commands/team.md`)

```
/team full-stack "Build user dashboard with CRUD"
/team review "Audit the auth module"
/team ship
```

Loads the team template, spawns the orchestrator, which spawns specialist agents.

### 3D. Integrate Team Orchestration into GSD

Update `execute-phase.md` to optionally use team orchestration:
- If phase has > 3 plans across different domains → suggest team execution
- If phase mixes frontend + backend + testing → auto-suggest full-stack-team

---

## Phase 4: Project Templates That Spawn Agents (P1)

Templates should be more than checklists — they should auto-configure the GSD pipeline.

### 4A. `website.md` — Next.js + Supabase + Vercel

Standard phases:
1. **Foundation** — Next.js app router, Tailwind v4, Supabase connection, auth
2. **Landing & Marketing** — Hero, features, testimonials, pricing (frontend-master aesthetics)
3. **Dashboard/App** — Authenticated area, CRUD
4. **SEO & Performance** — Metadata, Open Graph, JSON-LD, Core Web Vitals
5. **Responsive & Polish** — Mobile/tablet/desktop, animations, loading states
6. **Deploy & Verify** — Vercel prod deploy, 6-check verification

**Auto-config:** When selected, template pre-populates ROADMAP.md AND sets skill context for each phase:
- Phase 2 → `@frontend-master`, `@seo-master`
- Phase 3 → `@admin-panel`, `@supabase`
- Phase 5 → `@responsive`
- Phase 6 → `@deploy-verify`

### 4B. `ai-agent.md` — AI Chat Agent + Supabase

Standard phases:
1. Foundation — Next.js, Supabase schema, auth
2. AI Core — AI provider, system prompt, conversation management, streaming
3. Chat UI — Interface, message bubbles, typing indicators, markdown
4. Admin Panel — User management, analytics, system prompt editor
5. Channel Integration — WhatsApp/Telegram/Web widget
6. Safety & Resilience — Prompt injection defense, rate limiting, failover
7. Deploy & Verify — AI-specific checks

### 4C. `voice-agent.md` — VAPI + Supabase + Edge Functions

Standard phases:
1. Foundation — Supabase schema, edge function boilerplate
2. Voice Flow Design — Conversation state machine, VAPI config
3. Webhook Handlers — VAPI webhooks, signature verification
4. Tool Functions — Business logic tools
5. Testing & Tuning — Test calls, latency optimization
6. Deploy & Verify — Edge function deploy, VAPI webhook config

### 4D. `mobile-app.md` — React Native + Expo + Supabase

Standard phases:
1. Foundation — Expo setup, TypeScript, Supabase, navigation
2. Auth — Supabase auth, secure token storage, deep linking
3. Core Screens — Tab navigation, data fetching, pull-to-refresh
4. Native Features — Camera, push notifications, location, biometrics
5. Offline & Performance — Offline-first SQLite + Supabase sync
6. App Store Prep — Icons, splash, EAS Build config
7. Build & Submit — EAS Build, TestFlight, Play Console
8. Post-Launch — OTA updates, crash reporting, analytics

### 4E. Update `/gsd:new-project` Workflow

After questioning, detect project type and offer template:
1. "Use the [type] template? Pre-populates standard phases so you only plan what's unique."
2. If accepted: load template → merge into ROADMAP.md → set skill contexts per phase
3. If declined: normal deep questioning flow

### 4F. Template Agent Spawning

Each template phase can specify a `team` field:
```yaml
phase: "Landing & Marketing"
team: full-stack-team  # Auto-uses team orchestration for this phase
skills: [frontend-master, seo-master]
```

When GSD `execute-phase` encounters a `team` field, it delegates to the team orchestrator instead of solo execution.

---

## Phase 5: Fix Broken References & Minor Improvements (P2) — COMPLETE

### 5A. Fix `/ship` command ✅
Changed `deployment-map.md` → `qualia-context.md`

### 5B. Add `/gsd:quick --no-plan` mode ✅
`--no-plan` flag skips planner, creates inline plan, spawns executor directly.

### 5C. Ship variants (`/ship-website`, `/ship-agent`, `/ship-voice`) ✅
3 new commands with domain-specific checks (SEO/responsive, AI safety/webhooks, VAPI signatures/latency).

### 5D. `/audit` and `/review` overlap resolution ✅
- `/audit` header: "Quick checklist scan — no agents. For deep analysis, use /review."
- `/review` header: "Deep parallel-agent analysis. For quick checklist, use /audit."

### 5E. STATE.md pruning ✅
New `archive_and_reset_state` step in `complete-milestone.md` — archives STATE.md to milestones/, resets to clean template.

### 5F. Fix `qualia-workflow` skill
Currently minimal — either flesh out with Qualia-specific patterns or remove.

---

## Implementation Priority

| Priority | Phase | Task | Impact | Status |
|----------|-------|------|--------|--------|
| **P0** | 1 | GSD planner skill awareness | Critical — skills stop being ignored | DONE |
| **P0** | 1 | GSD executor skill awareness | Critical — executor follows patterns | DONE |
| **P0** | 2 | Session context bridge | Critical — sessions stop being islands | DONE |
| **P0** | 2 | Fix pre-compact.sh | Critical — context preserved on compaction | DONE |
| **P1** | 3 | Team orchestrator agent | High — multi-agent coordination | DONE |
| **P1** | 3 | Team templates (3) | High — pre-built agent teams | DONE |
| **P1** | 4 | Project templates (4) | High — eliminates redundant planning | DONE |
| **P1** | 4 | Template-driven skill injection | High — templates auto-set contexts | DONE |
| **P1** | 4 | Update new-project workflow | High — template selection UX | DONE |
| **P2** | 5 | Fix /ship reference | Broken now | DONE |
| **P2** | 5 | Fix /context-save & /context-restore | Broken now | DONE |
| **P2** | 5 | Fix learned-patterns.md reference | Stale reference | DONE |
| **P2** | 5 | /gsd:quick --no-plan | Faster trivial tasks | DONE |
| **P2** | 5 | Ship variants (3 commands) | Project-type deploy | DONE |
| **P3** | 5 | Audit/review clarification | Reduces confusion | DONE |
| **P3** | 5 | STATE.md pruning | Long-term hygiene | DONE |
| **P3** | 5 | frontend.md GSD note | Documentation | DONE |

---

## Architecture Vision

```
┌─────────────────────────────────────────────────┐
│                  YOU (Fawzi)                     │
│       /qualia:new-project → /qualia:plan-phase   │
│       /qualia:execute-phase → /ship              │
│         /team full-stack   → /audit             │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │     GSD ORCHESTRATOR      │
         │  (context-aware, skill-   │
         │   aware, team-capable)    │
         └─────────┬─────────────────┘
                   │
    ┌──────────────┼──────────────────┐
    │              │                  │
    ▼              ▼                  ▼
┌────────┐  ┌───────────┐  ┌──────────────┐
│ SOLO   │  │   TEAM    │  │  CONTEXT     │
│ AGENTS │  │ SWARMS    │  │  LAYER       │
│        │  │           │  │              │
│planner │  │full-stack │  │session-env/  │
│executor│  │review     │  │context/      │
│verifier│  │ship       │  │pre-compact   │
│debugger│  │custom     │  │session-start │
└───┬────┘  └─────┬─────┘  └──────┬───────┘
    │             │               │
    └──────────────┼───────────────┘
                   │
         ┌─────────▼─────────┐
         │      SKILLS       │
         │   (the library)   │
         │                   │
         │ frontend-master   │
         │ supabase          │
         │ responsive        │
         │ voice-agent       │
         │ admin-panel       │
         │ seo-master        │
         │ deploy-verify     │
         │ + 19 more         │
         └───────────────────┘
```

---

## Notes for Implementing Agent

- **Do NOT break existing GSD functionality.** All changes are additive.
- **Read each file fully before editing.** Planner and executor are 1000+ lines each.
- **Test after changes.** Run `/gsd:quick "add a hello world page"` to verify.
- **Keep venv/ (131MB)** — used by speak.sh/speak.py TTS system.
- **Keep gsd-intel-index.js (1.3MB)** — GSD internal tool.
- **Zoho MCP is disabled globally.** Re-enable when invoicing needed.
- Templates should be opinionated — Fawzi's exact stack, not generic starters.
- Mobile app template MUST include full EAS Build/Submit pipeline.
- Team orchestration should be opt-in, not forced — `/team` command or template `team:` field.

---

## Phase 7: /qualia Rename — COMPLETE

Renamed all user-facing gsd → qualia:
- Commands: /gsd:* → /qualia:*
- Agents: gsd-* → qualia-*
- Skill: skills/gsd → skills/qualia
- Templates & references: all /gsd: → /qualia:
- UI branding: GSD ► → Qualia ►
- gsd-tools.js: added qualia-* aliases for model resolution (gsd-* keys retained)
- Bare `/qualia` command created for quick status checks

Internal engine UNCHANGED:
- get-shit-done/ directory name
- gsd-tools.js (file name and all internal logic)
- Hook files (gsd-statusline.js, gsd-intel-*.js, gsd-check-update.js)
- GSD_* bash variable names

Known remaining items:
- [ ] gsd-statusline.js outputs "/gsd:update" in status bar text (manual fix needed)
- [ ] Existing .planning/ directories in active projects still contain /gsd: references
- [ ] gsd-* agent keys kept in gsd-tools.js for backward compatibility (can remove later)
- [ ] commands/gsd symlink can be removed once fully migrated
