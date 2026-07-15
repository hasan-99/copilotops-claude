---
alwaysApply: true
---

# Speed Rules (MANDATORY)

## Direct tools over subagents

**NEVER use Task(Explore) or Task(general-purpose) for simple file lookups or code searches.** Use direct tools instead:
- **Glob** for finding files by name/pattern
- **Grep** for searching code content
- **Read** for reading specific files
- Only use Task(Explore) when you genuinely need 5+ rounds of deep codebase archaeology.

**NEVER spawn subagents when direct tools work.** Subagents are slow — a direct Glob or Grep returns in seconds, a fresh agent burns 5-10 seconds of spawn overhead plus its own context budget.

**Bias toward action, not exploration.** If the user asks you to fix something and you know the project structure, just do it.

## CLI-first, MCP only when CLI can't

MCP servers impose a **token tax**: their tool definitions consume context-window space on every turn, even when unused. CLIs that the model already knows from training data (git, gh, supabase, vercel, railway, npx, curl) impose zero token tax — the model recalls them from weights, not from the prompt.

**Default to CLI.** Reach for MCP only when:
- The CLI doesn't exist or doesn't expose the operation you need.
- The CLI requires interactive auth that MCP has already brokered (e.g., Stripe Dashboard).
- The MCP returns structured JSON that would be expensive to parse from CLI text output.
- The MCP enforces governance (RLS-aware queries, scoped DB credentials) that the CLI doesn't.

If a `/skill-name` exists that wraps a CLI, prefer the skill — it's been hardened. Canonical example: drive Supabase through `npx supabase` (migrations, type generation, local dev, SQL) instead of the Supabase MCP — the CLI hits the same API at zero token cost and replaces the bulk of the MCP tool surface (see `infrastructure.md`).

### MCP tier-list (when each is justified)

| Server | Always-on? | Justification |
|---|---|---|
| `claude-in-chrome` | On-demand | Browser automation has no CLI equivalent; use for QA flows only |
| `supabase` MCP | **Off** in favor of `npx supabase` CLI | CLI covers 95% of operations; MCP only if you need branch management interactively |
| `context7` | On-demand | Library docs at runtime — no CLI alternative for Context7 itself |
| `notebooklm-mcp` | On-demand | NotebookLM has no CLI; only loaded when researching against existing notebooks |
| `firecrawl-mcp` | On-demand | Web scraping; only loaded when feature requires it |
| `next-devtools` | Always-on (dev) | Next.js 16 runtime errors not visible elsewhere |
| `mux`, `stitch`, `higgsfield` | On-demand | Specialized API surfaces; load only on relevant client work |
| `ZohoMCP`, `qualia-erp` | On-demand | Business ops only, not engineering-path |

The pattern: **on-demand by default; always-on only when the data is irreducibly remote AND there's no CLI.**

## Use shortcuts (Qualia commands)

When a Qualia command exists for the situation, use it — don't reinvent:
- `/qualia` — what's my next step?
- `/qualia-feature` — single feature, auto-scoped: inline for trivia, fresh builder spawn for 1-5 file features
- `/qualia-ship` — full deploy pipeline (quality gates → commit → deploy → verify)
- `/qualia-review` — production audit
- `/qualia-learn` — save a lesson from a mistake
