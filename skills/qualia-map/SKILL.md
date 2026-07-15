---
name: qualia-map
description: "Map an existing codebase (architecture, stack, conventions, capabilities) and adapt Qualia to its tracker/labels/glossary. Run BEFORE /qualia-new on brownfield projects. Triggers: 'map this codebase', 'onboard to existing project', 'brownfield setup', 'scan the repo', 'inherited a codebase'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---

# /qualia-map — Codebase Mapping (Brownfield)

Scans existing repo → `.planning/codebase/` (architecture, stack, conventions, concerns). `/qualia-new` uses this to infer capabilities and seed Validated reqs.

## When to Use

- Taking over existing client project
- Adding features to repo you didn't build
- Before `/qualia-new` on any directory with existing code

## Usage

`/qualia-map` — scan the current working directory

## Process

### 1. Check for Existing Code

```bash
ls -la 2>/dev/null
test -f package.json && echo "HAS_PACKAGE"
test -d .git && echo "HAS_GIT"
test -d .planning/codebase && echo "ALREADY_MAPPED"
```

If `ALREADY_MAPPED`, ask:
- header: "Re-map?"
- question: "Codebase already mapped. Re-scan?"
- options:
  - "Re-scan" — overwrite existing map
  - "Skip" — use existing map

### 2. Banner

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner map
```

### 2.5 Cheap symbol map first (ground the scan)

Before spawning the mapper agents, build a zero-dep symbol map so the agents
read STRUCTURE, not whole files — cheaper and better-grounded onboarding:

```bash
node C:\Users\hasan\.claude/bin/repo-map.js . --json > .planning/codebase/repo-map.json
node C:\Users\hasan\.claude/bin/repo-map.js .            # human view for the operator
```

It lists every source file's top-level symbols (exports, functions, classes,
types), busiest files first — the structural backbone. Pass the path of
`repo-map.json` to each mapper agent as a starting index so they target the
right files instead of reading the tree blind.

### 3. Spawn 5 Mapper Agents (parallel)

Each writes one file in `.planning/codebase/`:

```
Agent 1: Architecture
  Agent(prompt="
  Scan codebase → .planning/codebase/architecture.md.
  Identify: entry points, folder structure, module boundaries, data flow.
  Focus on WHAT, not HOW to fix.
  ", subagent_type="general-purpose", description="Architecture scan")

Agent 2: Stack
  Agent(prompt="
  Detect stack from package.json, requirements.txt, Gemfile, etc.
  Output: .planning/codebase/stack.md (runtime, framework, key libs, DB, hosting, CI + versions).
  ", subagent_type="general-purpose", description="Stack detection")

Agent 3: Conventions
  Agent(prompt="
  Analyze code style/conventions. Sample 10-15 files.
  Output: .planning/codebase/conventions.md (naming, component patterns, file org, import style, test style, commit format).
  ", subagent_type="general-purpose", description="Conventions analysis")

Agent 4: Concerns
  Agent(prompt="
  Scan quality concerns (document, NOT fix).
  Look for: TODO/FIXME, deprecated APIs, outdated deps, missing tests, security smells.
  Output: .planning/codebase/concerns.md.
  ", subagent_type="general-purpose", description="Concerns scan")

Agent 5: Onboarding adapter
  Agent(prompt="
  Detect existing process so Qualia honors it.
  Output: .planning/codebase/onboarding.md with sections:

  ## Issue tracker
  - gh repo view --json url 2>/dev/null (GitHub?)
  - Check: gitlab-ci.yml, .gitlab/ (GitLab?)
  - Check: .scratch/, docs/issues/, ISSUES.md (local?)
  - Else: 'none; Qualia uses .planning/decisions/ + tracking.json only'

  ## Existing labels (only if GH/GL detected)
  - gh label list --json name,description,color 2>/dev/null
  - Map to canonical: bug, enhancement, needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix
  - Output mapping table. Note missing canonical roles.

  ## Domain docs
  - Check: CONTEXT.md, GLOSSARY.md, docs/glossary.md, docs/domain.md, docs/adr/, doc/architecture/, .architecture/
  - Output: location (or 'none; Qualia creates .planning/CONTEXT.md')

  ## Existing agent files
  - Check: CLAUDE.md, AGENTS.md, .cursor/, .cursorrules, .aider.conf.yml, .continue/
  - List found. Qualia APPENDs substrate, never overwrites.

  Terse. Each section < 10 lines. Programmatically parsed.
  ", subagent_type="general-purpose", description="Onboarding adapter")
```

### 4. Wait for All 5

All done → read 5 outputs.

### 5. Synthesize

Create `.planning/codebase/README.md` (one-page summary linking dimensions):

```markdown
# Codebase Map

**Scanned:** {date}
**Repo:** {name}
**LOC:** {lines of code from wc -l}

## At a Glance

- **Stack:** {from stack.md — one line}
- **Architecture:** {from architecture.md — one sentence}
- **Conventions:** {from conventions.md — one sentence}
- **Concerns:** {count of concerns found}

## Validated Capabilities (Inferred)

Based on existing code, this project already does:
- {capability 1} (evidence: {file path})
- {capability 2} (evidence: {file path})
- {capability 3} (evidence: {file path})

These become **Validated reqs** in PROJECT.md when `/qualia-new` runs.

## Dimension Details

- [Architecture](./architecture.md)
- [Stack](./stack.md)
- [Conventions](./conventions.md)
- [Concerns](./concerns.md)
- [Onboarding adapter](./onboarding.md)

## Onboarding adapter snapshot

- **Issue tracker:** {from onboarding.md}
- **Domain docs:** {from onboarding.md}
- **Existing agent files:** {from onboarding.md}
```

### 5.5 Write adapter config (only if onboarding detected something)

Read `.planning/codebase/onboarding.md`. Per detected dimension:

- Issue tracker → `.planning/agents/tracker.md`
- Labels → `.planning/agents/labels.md` (canonical mapping)
- Domain docs at non-default path → `.planning/agents/domain.md`
- CLAUDE.md/AGENTS.md found → APPEND `## Qualia substrate` (never overwrite)

"none" → report that no preference was provided; defaults apply.

### 6. Commit

```bash
git add .planning/codebase/
git commit -m "docs: map existing codebase"
```

### 7. Route

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "CODEBASE MAPPED" "/qualia-new"
```

## What `/qualia-new` Does With This

After `/qualia-map`:
1. Reads `.planning/codebase/README.md`
2. Extracts Validated capabilities
3. Pre-populates PROJECT.md Validated reqs
4. Skips questions about existing capabilities
5. Focuses on NEW capabilities

## Rules

1. **Non-destructive.** Only READS code. Writes to `.planning/codebase/`, `.planning/agents/`, and APPENDs to CLAUDE.md/AGENTS.md.
2. **Five parallel agents.** No sequential scan.
3. **Dimension files structured.** `/qualia-new` reads programmatically.
4. **Concerns not fixes.** Document only. `/qualia-optimize` to fix.
5. **Onboarding respects existing process.** GH issues → Qualia uses them. Never overwrite; only append.
