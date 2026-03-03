# /memory — View and manage persistent memory

Show what Claude remembers across sessions, and manage the knowledge base.

## Subcommands

### /memory (no args) — Show current memory
Read and display:
1. `~/.claude/knowledge/learned-patterns.md` — Rules from mistakes
2. Recent entries count and last update date
3. Categories: ALWAYS rules, NEVER rules, Project-Specific gotchas

### /memory search <term> — Search memory
Grep through all knowledge files for a term.

### /memory add <rule> — Add a new rule manually
Append to learned-patterns.md with:
- Classification (ALWAYS/NEVER/Project-Specific)
- Date added
- Context (which project, what happened)

### /memory prune — Clean up outdated rules
Review learned-patterns.md and:
- Remove duplicates
- Archive rules that no longer apply
- Consolidate related rules

### Knowledge files locations
- `~/.claude/knowledge/qualia-context.md` — 42-project inventory
- `~/.claude/knowledge/deployment-map.md` — Supabase refs, domains, deploy configs
- `~/.claude/knowledge/client-prefs.md` — Per-client details
- `~/.claude/knowledge/patterns.md` — Code patterns
- `~/.claude/knowledge/learned-patterns.md` — Mistake-driven rules
