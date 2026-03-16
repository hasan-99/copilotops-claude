---
name: team
description: "Coordinate specialist agent teams for complex tasks — full-stack development, code review, or deployment. Use this skill whenever the user says 'team', 'spawn agents', 'full-stack build', 'team review', 'team ship', or wants to orchestrate multiple specialist agents working in parallel. Also trigger when user needs fan-out parallel work (frontend + backend + test), multi-perspective code review, or pipeline deployment coordination."
---

# Team — Agent Team Orchestration

Coordinate specialist agent teams to handle complex tasks through parallel or pipeline patterns.

## Usage

`/team full-stack "Build user dashboard with CRUD"`
`/team review "Audit the auth module"`
`/team ship`

## Available Templates

| Template | Pattern | Agents | Use Case |
|----------|---------|--------|----------|
| `full-stack` | fan-out → test | frontend + backend + test | Building features |
| `review` | fan-out → synthesize | simplicity + performance + TS quality | Code review |
| `ship` | pipeline | quality gate → deploy → verify | Deployment |

## Process

### 1. Parse Arguments

Extract from arguments:

- **template** — First word: `full-stack`, `review`, or `ship`
- **task** — Remaining text (optional for `ship`)

If no arguments: show usage and available templates.

### 2. Load Team Template

```bash
TEMPLATE_PATH="$HOME/.claude/agents/teams/${TEMPLATE}-team.md"
```

Read the template file. If not found, error with available templates.

### 3. Load Project Context

```bash
STATE=$(cat .planning/STATE.md 2>/dev/null || echo "No STATE.md found")
PROJECT_DIR=$(pwd)
```

### 4. Spawn Team Orchestrator

Launch a general-purpose subagent with:

- The team orchestrator instructions from `/home/qualia/.claude/agents/team-orchestrator.md`
- The team template content
- The task description (or "Ship current project to production" for ship template)
- Current project state and directory

The orchestrator spawns specialist agents, coordinates their work, resolves conflicts, and produces summary output.

### 5. Report Results

Read the produced summary and present to user:

- `full-stack` → TEAM-SUMMARY.md
- `review` → REVIEW-REPORT.md
- `ship` → SHIP-REPORT.md
