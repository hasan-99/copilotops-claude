# CLAUDE.md

## User Context

**Fawzi, founder of Qualia Solutions** - AI-powered voice agents, automation, modern web apps.

**Stack**: Next.js 15+, React 19, TypeScript, Supabase, Vercel, VAPI, ElevenLabs, Telnyx

**Style**: Direct, action-oriented, flow-state coding. Skip pleasantries, show code not theory.

**Projects**: `~/Desktop/Projects/{aiagents, platforms, voice, websites}/`

---

## Core Rules

**Evidence > Assumptions | Code > Documentation | Efficiency > Verbosity**

- `git status && git branch` before starting
- Read before Write/Edit
- Feature branches only
- TodoWrite for >3 step tasks
- Build only what's asked (MVP first)
- Root cause analysis on failures

**Verification:**
- ALWAYS run tests before committing
- ALWAYS `npx tsc --noEmit` before committing
- ALWAYS verify build locally before deploying
- NEVER commit with failing tests (unless explicitly told)

---

## GSD Workflow (Primary)

```
SETUP → DISCUSS → PLAN → EXECUTE → VERIFY → SHIP
```

```bash
/gsd:new-project              # Initialize with research & roadmap
/gsd:progress                 # Check current status
/gsd:discuss-phase N          # Lock decisions before planning
/gsd:plan-phase N             # Create 2-3 atomic tasks
/gsd:execute-phase N          # Build with fresh contexts
/gsd:verify-work N            # Validate deliverables
/gsd:complete-milestone       # Archive, tag, ship
/gsd:quick                    # Ad-hoc tasks, skip ceremony
```

**Full docs**: `~/.claude/docs/UNIFIED-WORKFLOW.md`

---

## Skills

```bash
/fd   frontend-master --design    # Distinctive UI design
/fb   frontend-master --build     # Build components
/fm   frontend-master --modernize # Transform legacy UI
/resp responsive                  # Fix responsive issues
/sb   supabase                    # Database, auth, RLS, migrations
/va   voice-agent                 # Build VAPI voice agents
/dd   deep-debug                  # Comprehensive debugging
/sf   smart-fix                   # Auto-fix with routing
/pr   production-audit            # Production readiness (6 agents)
/dr   deep-research               # Codebase analysis
/dep  full-deploy                 # Test -> build -> deploy -> verify
```

---

## Key Files

- `~/.claude/docs/UNIFIED-WORKFLOW.md` - Full GSD workflow documentation
- `~/.claude/.env.claude` - MCP API keys (**chmod 600, never commit**)
- `~/.claude/scripts/cleanup.sh` - Run weekly for maintenance

---

## GSD Config (per-project `.planning/config.json`)

```json
{"mode": "yolo", "depth": "standard", "modelProfile": "quality"}
```

**Modes**: `interactive` | `yolo` (auto-approve)
**Models**: `quality` (Opus) | `balanced` | `budget` (Haiku)

---

## Self-Improvement

When I make a mistake: abstract the pattern, suggest a CLAUDE.md rule with ALWAYS/NEVER.

---

## Learned Patterns

<!-- Add patterns here as we discover them -->
