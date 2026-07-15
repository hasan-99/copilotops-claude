---
name: qualia-recall
description: "OWNER-ONLY. Recall curated prior lessons from the Qualia memory substrate — the knowledge layer + the qualia-memory vault. The read side of /qualia-learn. Only the OWNER (Fawzi) can run it; recall.js refuses any other role. Triggers (OWNER only): 'recall', 'have we done this before', 'what did we learn about X', 'prior art', 'any notes on', 'check the vault'."
allowed-tools:
  - Read
  - Grep
  - Bash
---

# /qualia-recall — Recall Knowledge

> **OWNER-only.** `recall.js` resolves the install role and **refuses any role
> other than `OWNER`** (exit 3). This is a deterministic gate, not a convention —
> do not run it for an employee. Employees still have the read-only memory MCP for
> ALL_ROLES wiki content; the curated cross-project recall is the OWNER's surface.

The **read side** of memory. `/qualia-learn` writes; `/qualia-recall` reads. One
query, both stores:

1. **Knowledge layer** — `C:\Users\hasan\.claude/knowledge/` (patterns, fixes, client prefs)
2. **qualia-memory vault** — `~/qualia-memory/wiki/` (the team's curated,
   cross-project Obsidian LLM Wiki)

Use it BEFORE web search or before re-solving a problem — the team may already
have the answer, already filtered for relevance.

## Usage

- `/qualia-recall {topic}` — recall across both stores
- `/qualia-recall {topic} --scope vault` — vault only (`knowledge` | `vault` | `all`)
- `/qualia-recall {topic} --json` — machine output

## Access is role-aware (non-negotiable)

The vault carries an access manifest at `wiki/_meta/access.md`. `recall.js`
**enforces it deterministically**: when your role (from
`C:\Users\hasan\.claude/.qualia-config.json`, or `$QUALIA_ROLE`) is not `OWNER`, OWNER_ONLY
and CONDITIONAL paths (Finances, Clients, Team, raw sessions, the access manifest
itself) are filtered out of results — you still get every ALL_ROLES lesson.
Unknown role ⇒ fail-closed (restricted). See `C:\Users\hasan\.claude/rules/access.md`.

## Process

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner recall 2>/dev/null || true
```

### 1. Run the recall

```bash
node C:\Users\hasan\.claude/bin/recall.js "{topic}"            # human digest
# or, to consume programmatically:
node C:\Users\hasan\.claude/bin/recall.js "{topic}" --json
```

`recall.js` exits 0 even with zero hits, 2 on bad invocation. It delegates the
knowledge-layer search to `knowledge.js` (so newly-added knowledge files stay
discoverable) and greps `wiki/` for the vault.

### 2. Read the strongest hits

The digest ranks files by hit count. `Read` the top files (or the specific
`file:line` for the vault page) to pull the full lesson before acting. For vault
pages, paths are relative to `~/qualia-memory/wiki/`.

### 3. Apply, then consider learning

If the recall resolved your question, apply it. If you discovered something the
stores DON'T yet have, close the loop with `/qualia-learn`.

## Command Output Contract

```text
Command: /qualia-recall {topic}
Scope: knowledge layer + vault (role-filtered)
Intent: report
Mutation: none (read-only)
Evidence: recall.js across C:\Users\hasan\.claude/knowledge/ + ~/qualia-memory/wiki/
Output: ranked digest of prior lessons
Next: Read top hits → apply, or /qualia-learn if it's a new lesson
```
