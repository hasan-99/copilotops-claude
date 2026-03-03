---
description: "Coordinate specialist agent teams — full-stack, review, or ship"
user_invocable: true
---

# /team — Team Agent Orchestration

Usage: `/team <template> "<task description>"`

Examples:
- `/team full-stack "Build user dashboard with CRUD"`
- `/team review "Audit the auth module"`
- `/team ship`

## Process

### 1. Parse Arguments

Extract from `$ARGUMENTS`:
- **template** — First word: `full-stack`, `review`, or `ship`
- **task** — Remaining text (optional for `ship`)

If no arguments: show usage and available templates.

Available templates:
| Template | Pattern | Agents | Use Case |
|----------|---------|--------|----------|
| `full-stack` | fan-out → test | frontend + backend + test | Building features |
| `review` | fan-out → synthesize | simplicity + performance + TS quality | Code review |
| `ship` | pipeline | quality gate → deploy → verify | Deployment |

### 2. Load Team Template

```bash
TEMPLATE_PATH="$HOME/.claude/agents/teams/${TEMPLATE}-team.md"
```

Read the template file. If not found, error with available templates.

```bash
TEMPLATE_CONTENT=$(cat "$TEMPLATE_PATH")
```

### 3. Load Project Context

```bash
STATE=$(cat .planning/STATE.md 2>/dev/null || echo "No STATE.md found")
PROJECT_DIR=$(pwd)
```

### 4. Spawn Team Orchestrator

```
Task(
  prompt="First, read /home/qualia/.claude/agents/team-orchestrator.md for your role and instructions.

<team_template>
{TEMPLATE_CONTENT}
</team_template>

<task_description>
{TASK — or 'Ship current project to production' for ship template}
</task_description>

<project_state>
{STATE}
</project_state>

<project_dir>
{PROJECT_DIR}
</project_dir>

Execute the team orchestration pattern defined in the template. Spawn specialist agents, coordinate their work, resolve conflicts, produce TEAM-SUMMARY.md.
",
  subagent_type="general-purpose",
  description="Team: {TEMPLATE} — {TASK}"
)
```

### 5. Report Results

Read TEAM-SUMMARY.md (or REVIEW-REPORT.md for review, SHIP-REPORT.md for ship) and present to user.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TEAM ► {TEMPLATE} COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Summary from team output}
```
