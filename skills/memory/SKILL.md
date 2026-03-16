---
name: memory
description: "View, search, add, and manage Claude's persistent memory and knowledge base. Use this skill whenever the user says 'memory', 'what do you remember', 'show rules', 'search knowledge', 'add a rule', 'prune rules', or wants to interact with Claude's learned patterns and project knowledge. Also trigger when user asks about persistent state, knowledge files, or cross-session memory."
---

# Memory — Persistent Knowledge Management

Show what Claude remembers across sessions and manage the knowledge base.

## Subcommands

### memory (no args) — Show Current Memory

Read and display:
1. `~/.claude/knowledge/learned-patterns.md` — Rules learned from mistakes
2. Count of recent entries and last update date
3. Categories breakdown: ALWAYS rules, NEVER rules, Project-Specific gotchas

### memory search `<term>` — Search Memory

Grep through all knowledge files for a term:
```bash
grep -ri "<term>" ~/.claude/knowledge/
```

### memory add `<rule>` — Add a New Rule

Append to `~/.claude/knowledge/learned-patterns.md` with:
- Classification (ALWAYS / NEVER / Project-Specific)
- Date added
- Context (which project, what happened)

Also add to `~/.claude/CLAUDE.md` under "## Learned Patterns" for immediate loading.

### memory prune — Clean Up Outdated Rules

Review `~/.claude/knowledge/learned-patterns.md` and:
- Remove duplicates
- Archive rules that no longer apply
- Consolidate related rules

## Knowledge File Locations

| File | Purpose |
|------|---------|
| `~/.claude/knowledge/qualia-context.md` | Project inventory |
| `~/.claude/knowledge/deployment-map.md` | Supabase refs, domains, deploy configs |
| `~/.claude/knowledge/client-prefs.md` | Per-client details |
| `~/.claude/knowledge/patterns.md` | Code patterns |
| `~/.claude/knowledge/learned-patterns.md` | Mistake-driven rules |
