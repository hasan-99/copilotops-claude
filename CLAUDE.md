# CLAUDE.md

## User Context

**Fawzi, founder of Qualia Solutions** - AI-powered voice agents, automation, modern web apps.

**Stack**: Next.js 15+, React 19, TypeScript, Supabase, Vercel, VAPI, ElevenLabs, Telnyx

**Style**: Direct, action-oriented, flow-state coding. Skip pleasantries, show code not theory.

**Projects**: `~/Desktop/Projects/{aiagents, platforms, voice, websites}/`

---

## Core Rules

**Evidence > Assumptions | Code > Documentation | Efficiency > Verbosity**

- Read before Write/Edit
- Feature branches only
- TodoWrite for >3 step tasks
- Build only what's asked (MVP first)
- Root cause analysis on failures

**Verification:**
- Run tests before committing
- Run `npx tsc --noEmit` before committing
- Verify build locally before deploying
- Don't commit with failing tests (unless explicitly told)

---

## Behavioral Patterns

<default_to_action>
By default, implement changes rather than only suggesting them. Infer the most useful action and proceed, using tools to discover missing details instead of guessing.
</default_to_action>

<investigate_before_answering>
Never speculate about code you have not opened. If the user references a file, read it before answering. Give grounded, hallucination-free answers.
</investigate_before_answering>

<context_window_management>
Context will be automatically compacted as it approaches its limit. Do not stop tasks early due to token budget. Save progress to files before context refreshes. Complete tasks fully.
</context_window_management>

<use_parallel_tool_calls>
When calling multiple independent tools, make all calls in parallel. 3 files = 3 Read calls simultaneously. Never use placeholders for dependent calls.
</use_parallel_tool_calls>

---

## Frontend Aesthetics

<frontend_aesthetics>
When building UI, create distinctive designs that avoid generic "AI slop" patterns:
- **Typography**: Use distinctive fonts (not Inter/Arial/Roboto). Vary weight/size for hierarchy.
- **Color**: Cohesive palette with sharp accents. Use CSS variables for theming.
- **Motion**: CSS transitions or Motion library. Stagger page load animations.
- **Depth**: Layered backgrounds, subtle gradients, texture over flat solid colors.
- **Avoid**: Cookie-cutter card grids, generic hero sections, stock illustrations, blue-purple gradients.
</frontend_aesthetics>

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
/seo  seo-master                  # SEO audit, schema, Core Web Vitals
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

When I make a mistake: abstract the pattern, suggest a CLAUDE.md rule.
Use git, tests.json, and progress.txt for state tracking across sessions.

---

## Learned Patterns

### Tool Usage
- Use native Read/Grep tools instead of bash cat/grep for file operations
- Make parallel tool calls when reading multiple independent files
- Investigate code before answering questions about it

### State Management
- Use git commits as checkpoints during multi-step tasks
- Structured JSON for machine-readable state, plain text for human-readable progress
- Save work-in-progress to files before long operations

### Context Transitions
- On session start: review progress files, git log, and todo state
- Before context compaction: save current task state to progress file
- Setup scripts should be idempotent and fast
