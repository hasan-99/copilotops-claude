# The Claude Code Bible

> Comprehensive reference distilled from [luongnv89/claude-howto](https://github.com/luongnv89/claude-howto) (2.9k stars, v2.2.0, March 2026). Every file studied. Every pattern extracted.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Slash Commands](#1-slash-commands)
3. [Memory System](#2-memory-system)
4. [Skills](#3-skills)
5. [Subagents](#4-subagents)
6. [MCP Protocol](#5-mcp-protocol)
7. [Hooks](#6-hooks)
8. [Plugins](#7-plugins)
9. [Checkpoints](#8-checkpoints)
10. [Advanced Features](#9-advanced-features)
11. [CLI Reference](#10-cli-reference)
12. [Feature Selection Guide](#feature-selection-guide)
13. [Configuration Examples](#configuration-examples)
14. [Clean Code Rules](#clean-code-rules)
15. [Qualia Gap Analysis](#qualia-gap-analysis)

---

## Architecture Overview

Claude Code has 7 extension mechanisms, each serving a distinct role:

| Feature | Invocation | Persistence | Scope | Best For |
|---------|-----------|------------|-------|----------|
| **Slash Commands** | Manual (`/cmd`) | Session only | Single task | Quick shortcuts |
| **Memory** | Auto-loaded | Cross-session | User/team context | Persistent standards |
| **Skills** | Auto-invoked | Filesystem | Reusable expertise | Automated workflows |
| **Subagents** | Auto-delegated | Isolated context | Specialized tasks | Task distribution |
| **MCP** | Auto-queried | Real-time | External data | Live integrations |
| **Hooks** | Event-triggered | Settings-based | Automation | Quality gates |
| **Plugins** | One-command install | Bundled | All-in-one | Team distribution |

### Session Lifecycle

```
Session Start
  -> Load Memory (7 tiers, highest priority first)
  -> Discover Skills (metadata only, ~100 tokens each)
  -> Register Slash Commands
  -> Connect MCP Servers
  -> Ready for User Interaction
     -> /cmd triggers Slash Command
     -> Request triggers Skill auto-invoke
     -> Query triggers MCP data fetch
     -> Complex task triggers Subagent delegation
     -> Tool use triggers Hook events
```

---

## 1. Slash Commands

### What They Are
Markdown files in `.claude/commands/` (project) or `~/.claude/commands/` (user) that define reusable prompt templates. Invoked with `/command-name`.

> **Note:** Custom commands are being migrated to Skills (`.claude/skills/`). Commands still work but Skills are recommended.

### File Structure

```yaml
---
description: What this command does (required for auto-discovery)
allowed-tools: Bash(git add:*), Bash(npm test:*)  # Optional tool whitelist
argument-hint: [message]  # Optional autocomplete hint
name: Human-readable name  # Optional
tags: testing, coverage  # Optional categorization
---

# Command Title

Instructions for Claude as markdown...

Dynamic context: !`git status`  # Shell output injected before prompt
Arguments: $ARGUMENTS or $0, $1  # User-provided args
File refs: @path/to/file  # Include file contents
```

### Key Patterns from the Repo

**Minimal command** (analysis only):
```markdown
---
description: Analyze code for performance issues
---
# Code Optimization
Review for: 1. O(n^2) ops  2. Memory leaks  3. Algorithm improvements
Format: Severity | Location | Explanation | Fix with code
```

**Rich command** (with dynamic context + tools):
```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
argument-hint: [message]
description: Create a git commit with context
---
## Context
- Current git status: !`git status`
- Current git diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`

## Task
If message provided: $ARGUMENTS
Otherwise: analyze changes and create conventional commit
```

**Safety-gated command** (confirmation required):
```markdown
---
description: Stage all, commit, push (use with caution)
allowed-tools: Bash(git add:*), Bash(git push:*), ...
---
# Safety Checks
- Scan for secrets (.env, *.key, *.pem, AKIA patterns)
- Check for large files (>10MB)
- Warn if on main/master
- Present summary and WAIT for explicit "yes"
```

### 55+ Built-in Commands

Key ones: `/help`, `/clear`, `/compact`, `/config`, `/cost`, `/diff`, `/doctor`, `/export`, `/model`, `/plan`, `/rewind`, `/resume`, `/rename`, `/fork`, `/fast`, `/vim`, `/voice`, `/chrome`, `/tasks`, `/todo`, `/mcp`, `/skills`, `/agents`, `/hooks`, `/plugin`, `/permissions`, `/sandbox`, `/remote-control`, `/desktop`, `/teleport`, `/keybindings`, `/statusline`, `/theme`, `/upgrade`

### 5 Bundled Skills (Act Like Commands)

| Skill | Command | Purpose |
|-------|---------|---------|
| Simplify | `/simplify` | Review code for quality and simplification |
| Batch | `/batch` | Run prompts on multiple files |
| Debug | `/debug` | Systematic debugging with root cause analysis |
| Loop | `/loop` | Schedule recurring tasks on a timer |
| Claude API | `/claude-api` | Build apps with the Anthropic API |

---

## 2. Memory System

### 8-Tier Hierarchy (Highest to Lowest Priority)

| Tier | Scope | Location | Shared? | Best For |
|------|-------|----------|---------|----------|
| 1 | Managed Policy | `/etc/claude-code/CLAUDE.md` (Linux) | Organization | Compliance, security |
| 1.5 | Managed Drop-ins | `managed-settings.d/` alongside policy | Organization | Modular org policies |
| 2 | Project Memory | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team (git) | Team standards, architecture |
| 3 | Project Rules | `.claude/rules/*.md` | Team (git) | Modular project conventions |
| 4 | User Memory | `~/.claude/CLAUDE.md` | Individual | Personal preferences |
| 5 | User Rules | `~/.claude/rules/*.md` | Individual | Personal rule modules |
| 6 | Local Memory | `./CLAUDE.local.md` | Individual (gitignored) | Machine-specific overrides |
| 7 | Auto Memory | `~/.claude/projects/<project>/memory/` | Individual | Learned preferences |

### Memory Commands

| Command | Purpose |
|---------|---------|
| `/init` | Create CLAUDE.md template |
| `/memory` | Open memory files in editor |
| `#` prefix | Quick single-line memory addition |
| `@path/to/file` | Import external content |

### Project Memory Template (./CLAUDE.md)

```markdown
# Project Configuration

## Overview
- **Name**: Project Name
- **Stack**: Next.js, TypeScript, Supabase
- **Team**: 3 developers

## Architecture
@docs/architecture.md
@docs/api-standards.md

## Standards
### Naming: Files=kebab-case, Classes=PascalCase, Functions=camelCase, DB=snake_case
### Git: feature/description branches, conventional commits, PR required
### Testing: 80% coverage minimum, Jest for unit, Cypress for E2E

## Common Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm test` | Test suite |

## Known Issues
- Issue description + workaround
```

### Directory-Specific Memory

Place `CLAUDE.md` inside subdirectories for module-specific rules:

```markdown
# ./src/api/CLAUDE.md
# API Module Standards (overrides root CLAUDE.md for /src/api/)

### Request Validation: Use Zod, return 400 with field-level errors
### Auth: JWT in Authorization header, 24h expiry, refresh tokens
### Response Format: { success, data, timestamp, version }
### Pagination: Cursor-based (not offset), max 100, default 20
### Rate Limiting: 1000/hr authenticated, 100/hr public, 429 + retry-after
```

### Project Rules with Path Scoping

```yaml
# .claude/rules/api-standards.md
---
paths: src/api/**/*.ts
---
Use Zod for all request validation.
Return structured error responses with error codes.
```

### Key Settings

- `claudeMdExcludes`: Skip irrelevant CLAUDE.md files in monorepos (glob patterns)
- `autoMemoryDirectory`: Custom auto-memory location (v2.1.74+)
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY`: Disable auto-memory
- `--add-dir`: Load CLAUDE.md from additional directories

### Best Practices

- Be specific: "Use 2-space indentation" not "follow best practices"
- Use `@imports` to reference docs instead of duplicating
- Keep files under 500 lines
- NEVER store secrets, API keys, or PII
- Review periodically — stale memory causes confusion
- Right level for the right concern (security at managed, team at project, personal at user)

---

## 3. Skills

### What They Are
Auto-invoked capabilities packaged as folders with instructions, scripts, and templates. Claude detects and uses relevant skills automatically based on the `description` field.

### Progressive Disclosure (3 Levels)

| Level | What Loads | When | Token Cost |
|-------|-----------|------|------------|
| L1: Metadata | `name` + `description` from frontmatter | Always at startup | ~100 tokens/skill |
| L2: Instructions | SKILL.md body | When triggered | <5k tokens |
| L3: Resources | Scripts, templates, references | Executed via bash on demand | 0 (not in context) |

### SKILL.md Format

```yaml
---
name: skill-name                          # Required, lowercase-hyphenated
description: What + When to use           # Required, triggers auto-invocation
argument-hint: [args]                     # Optional autocomplete
allowed-tools: Read, Grep, Bash           # Optional tool restriction
model: sonnet                             # Optional model override
effort: high                              # Optional: low/medium/high/max
shell: bash                               # Optional: bash/powershell
context: fork                             # Optional: run in isolated subagent
agent: Explore                            # Optional: subagent type
disable-model-invocation: true            # Optional: only user can invoke
user-invocable: false                     # Optional: only Claude can invoke
hooks:                                    # Optional: skill-scoped hooks
  PreToolUse:
    - matcher: Bash
      command: validate.sh
---

# Skill Title

## Instructions (structured guidance)
## Templates/Examples (inline or referenced)
## References to supporting files
```

### Invocation Control

| Config | User Can Invoke | Claude Can Invoke |
|--------|----------------|-------------------|
| (default) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

### Directory Structure

```
my-skill/
├── SKILL.md           # Instructions (required, <500 lines)
├── scripts/           # Python/bash helpers (Level 3, executed not loaded)
├── templates/         # Output templates Claude fills in
├── references/        # Domain knowledge docs
└── examples/          # Example outputs
```

### Skill Locations

| Type | Location | Scope |
|------|----------|-------|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/<name>/SKILL.md` | Individual |
| Project | `.claude/skills/<name>/SKILL.md` | Team (git) |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where enabled |

### String Substitutions

- `$ARGUMENTS` — all user arguments
- `$ARGUMENTS[0]`, `$0`, `$1` — positional args
- `${CLAUDE_SESSION_ID}` — current session
- `${CLAUDE_SKILL_DIR}` — skill directory path
- `` !`command` `` — shell output injected before prompt

### Example Skills from the Repo

**Code Review Skill** — 4 review dimensions (Security, Performance, Quality, Maintainability), Python scripts for cyclomatic/cognitive complexity and maintainability index, checklists and finding templates.

**Brand Voice Skill** (`user-invocable: false`) — Background knowledge Claude applies silently when generating public content. Tone guidelines, approved/banned terms, writing rules.

**Refactor Skill** — 6-phase Martin Fowler methodology. Safety rules: never refactor without tests, never combine changes, never mix refactoring with feature development.

**Claude-MD Skill** — Golden rules: <300 lines, universal applicability, never auto-generate, craft manually. Target ~150-200 instructions.

### Script Integration Pattern

Scripts are Level 3 resources — never loaded into context, executed via bash:

```python
# scripts/analyze-complexity.py
# Supports Python, JavaScript, TypeScript
# Modes: single file, before/after comparison, directory scan
# Outputs: cyclomatic complexity, cognitive complexity, maintainability index
# CLI: python analyze-complexity.py file.py --verbose --json
```

```python
# scripts/detect-smells.py
# Detects 14 smell types: Long Method, Long Parameters, Duplicate Code,
# Large Class, Dead Code, Complex Conditionals, Magic Numbers, Feature Envy,
# Excessive Comments, Deep Nesting, Primitive Obsession, Data Clumps,
# Switch Statements, Message Chains
# CLI: python detect-smells.py src/ --dir --verbose
```

---

## 4. Subagents

### What They Are
Specialized AI assistants with isolated context windows, customized system prompts, and controlled tool access. Claude auto-delegates to them for specialized tasks.

### Agent Definition Format

```yaml
# .claude/agents/agent-name.md
---
name: agent-name                    # Required, unique identifier
description: What + when to use     # Required. Add "Use PROACTIVELY" for auto-trigger
tools: Read, Grep, Glob, Bash      # Optional (omit = inherit all)
disallowedTools: Write, Edit        # Optional explicit blocks
model: inherit                      # Optional: sonnet/opus/haiku/inherit
permissionMode: default             # Optional: default/acceptEdits/dontAsk/plan
maxTurns: 20                        # Optional turn limit
effort: high                        # Optional: low/medium/high/max
isolation: worktree                 # Optional: git worktree isolation
background: true                    # Optional: run as background task
memory: project                     # Optional: user/project/local
skills: [code-review]               # Optional: preload specific skills
mcpServers: [github]                # Optional: available MCP servers
initialPrompt: "Start by..."       # Optional: auto-submitted first turn
hooks:                              # Optional: agent-scoped hooks
  PreToolUse: [...]
---

# Agent System Prompt

Role declaration, invocation steps, domain knowledge, output format, examples.
```

### Agent Locations (Priority Order)

1. CLI-defined (`--agents` flag, JSON, session-scoped)
2. Project-level (`.claude/agents/`)
3. User-level (`~/.claude/agents/`)
4. Plugin-level (plugin `agents/` directory)

### 6 Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| general-purpose | Inherits | All | Multi-step tasks, research |
| Plan | Inherits | Read, Glob, Grep, Bash | Architecture planning |
| Explore | Haiku 4.5 | Read, Glob, Grep | Quick codebase searches |
| Bash | Inherits | Bash | Git operations, terminal tasks |
| statusline-setup | Sonnet 4.6 | Bash, Read, Write | Status line config |
| Claude Code Guide | Haiku 4.5 | Read, Glob, Grep | Help and documentation |

### Principle of Least Privilege (Tool Access)

| Agent Type | Tools | Rationale |
|------------|-------|-----------|
| Security reviewer | Read, Grep | Read-only — can't break anything |
| Documentation writer | Read, Write, Grep | Write docs, not execute code |
| Test engineer | Read, Write, Bash, Grep | Write tests AND run them |
| Code reviewer | Read, Grep, Glob, Bash | Search broadly, run git diff |
| Debugger | Read, Edit, Bash, Grep, Glob | Needs Edit to fix bugs |
| Implementation agent | Read, Write, Edit, Bash, Grep, Glob | Full access for feature work |

### Auto-Delegation Keywords

Include "Use PROACTIVELY" in `description` to auto-trigger:
- `code-reviewer`: "after writing or modifying code"
- `test-engineer`: "when new features are implemented"
- `debugger`: "when encountering any issues"
- `clean-code-reviewer`: "after writing code"
- `data-scientist`: "for data analysis tasks"

### System Prompt Template

1. **Role declaration** — "You are a [role] specializing in [domain]"
2. **Invocation steps** — numbered list of what to do (3-6 steps)
3. **Domain knowledge** — priorities, checklists, best practices
4. **Output format** — structured fields per finding (Severity, Category, Location, Description, Fix)
5. **Example** — concrete example of expected output

### Context Management

```
Main Agent Context (full window)
  ├─> Subagent 1 (clean slate, isolated)
  ├─> Subagent 2 (clean slate, isolated)
  └─> Subagent 3 (clean slate, isolated)
      Results only flow back to main agent.
```

### When to Use Subagents

| Scenario | Use Subagent? | Why |
|----------|--------------|-----|
| Complex multi-step feature | Yes | Separate concerns, prevent context pollution |
| Parallel task execution | Yes | Each gets own context |
| Specialized expertise | Yes | Custom system prompts |
| Long-running analysis | Yes | Prevents main context exhaustion |
| Quick code review | No | Unnecessary overhead |
| Single simple task | No | Adds latency |

### Advanced Features

- **Agent Teams** (experimental): 3-5 teammates with shared task list + mailbox
- **Resumable agents**: Continue via `SendMessage(to: agent_id)`
- **Background agents**: `Ctrl+B` to background, `Ctrl+F` to kill
- **Worktree isolation**: `isolation: worktree` for safe parallel branch work
- **Persistent memory**: Agents can read MEMORY.md via `memory:` frontmatter
- **Transcripts**: Stored at `~/.claude/projects/{project}/{session}/subagents/agent-{id}.jsonl`

---

## 5. MCP Protocol

### What It Is
Model Context Protocol — standardized way for Claude to access external tools, APIs, and real-time data. Unlike Memory (static), MCP provides live data access.

### Configuration

**Project scope** (`.mcp.json`):
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**User scope** (`~/.claude.json`): Same format, applies to all projects.

### Common MCP Servers

| Server | Command | Auth |
|--------|---------|------|
| GitHub | `npx @modelcontextprotocol/server-github` | `${GITHUB_TOKEN}` |
| PostgreSQL | `npx @modelcontextprotocol/server-postgres` | `${DATABASE_URL}` |
| Filesystem | `npx @modelcontextprotocol/server-filesystem /path` | OS permissions |
| Slack | `npx @modelcontextprotocol/server-slack` | `${SLACK_TOKEN}` |
| Context7 | Built-in | None |

### Multi-Server Config

```json
{
  "mcpServers": {
    "github": { "command": "npx", "args": ["@modelcontextprotocol/server-github"], "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" } },
    "database": { "command": "npx", "args": ["@modelcontextprotocol/server-database"], "env": { "DATABASE_URL": "${DATABASE_URL}" } },
    "slack": { "command": "npx", "args": ["@modelcontextprotocol/server-slack"], "env": { "SLACK_TOKEN": "${SLACK_TOKEN}" } },
    "filesystem": { "command": "npx", "args": ["@modelcontextprotocol/server-filesystem", "/home/user/projects"] }
  }
}
```

### Transport Protocols

| Transport | Use Case |
|-----------|----------|
| HTTP | Recommended for remote servers |
| Stdio | Local via `npx` (most examples) |
| WebSocket | Persistent bidirectional connections |
| SSE | Deprecated |

### CLI Commands

```bash
claude mcp add github -- npx -y @modelcontextprotocol/server-github
claude mcp list
claude mcp remove github
claude mcp reset-project-choices
claude mcp serve  # Run Claude Code itself as MCP server
```

### Key Limits

- Tool descriptions: 2KB per server
- Output warning: 10,000 tokens
- Output max: 25,000 tokens (configurable via `MAX_MCP_OUTPUT_TOKENS`)
- Disk persistence: 50,000 chars
- Auto tool search when definitions exceed 10% of context (requires Sonnet 4+ or Opus 4+)

### MCP Resources and Prompts

- Resources: `@server-name:protocol://resource/path` — access MCP resources
- Prompts: `/mcp__<server>__<prompt>` — invoke MCP prompt templates
- MCPorter: Compose MCP tools into higher-level operations

### Security Best Practices

- ALWAYS use `${VAR}` interpolation for secrets — never hardcode
- Scope filesystem access to specific directories
- Rotate tokens monthly
- Grant minimum permissions
- Keep `.mcp.json` in version control (safe with interpolation)
- Monitor all MCP requests

### MCP vs Memory Decision

```
Need external data? -> No -> Use Memory
                    -> Yes -> Changes frequently? -> No -> Use Memory
                                                  -> Yes -> Use MCP
```

---

## 6. Hooks

### What They Are
Event-driven automation that executes shell commands, HTTP requests, prompts, or subagents in response to Claude Code events. Configured in settings.json.

### 25 Hook Events (4 Categories)

**Tool Hooks:**
| Event | Trigger | Common Use |
|-------|---------|-----------|
| PreToolUse | Before any tool runs | Validation, approval gates |
| PostToolUse | After tool succeeds | Formatting, notifications |
| PostToolUseFailure | Tool execution fails | Error handling, logging |
| PermissionRequest | Permission dialog shown | Auto-approve/deny |

**Session Hooks:**
| Event | Trigger | Common Use |
|-------|---------|-----------|
| SessionStart | Session begins/resumes | Environment setup |
| SessionEnd | Session terminates | Cleanup, save state |
| Stop | Claude finishes responding | Summary generation |
| StopFailure | API error ends turn | Error recovery |
| SubagentStart | Subagent spawned | Context injection |
| SubagentStop | Subagent finishes | Result validation |
| InstructionsLoaded | CLAUDE.md loaded | Custom handling |

**Task Hooks:**
| Event | Trigger | Common Use |
|-------|---------|-----------|
| UserPromptSubmit | User sends message | Input validation |
| TaskCompleted | Task marked complete | Post-task processing |
| TaskCreated | Task created | Task tracking |
| TeammateIdle | Agent teammate idle | Work distribution |

**Lifecycle Hooks:**
| Event | Trigger | Common Use |
|-------|---------|-----------|
| ConfigChange | Settings modified | Validation |
| CwdChanged | Directory changed | Directory-specific setup |
| FileChanged | Watched file changes | Rebuild triggers |
| PreCompact | Before compaction | State preservation |
| PostCompact | After compaction | Post-compact actions |
| WorktreeCreate | Worktree created | Environment setup |
| WorktreeRemove | Worktree removed | Cleanup |
| Elicitation | MCP requests input | Input validation |
| ElicitationResult | User responds | Response processing |
| Notification | Notification sent | External alerts |

### 4 Hook Types

| Type | How It Works | Best For |
|------|-------------|----------|
| **Command** | Shell command, JSON via stdin | Deterministic checks |
| **HTTP** | POST JSON to webhook URL | External integrations |
| **Prompt** | LLM-evaluated prompt | Intelligent decisions (Stop/SubagentStop) |
| **Agent** | Spawn subagent with tools | Multi-step verification |

### Hook Configuration

```json
// ~/.claude/settings.json or .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/validate-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write $CLAUDE_FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

### Hook Input/Output Contract

**Input (stdin JSON):**
```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "git commit -m 'fix'" },
  "tool_use_id": "...",
  "agent_id": "...",
  "agent_type": "..."
}
```

**Output (stdout JSON):**
```json
{
  "continue": true,
  "stopReason": "blocked by policy",
  "suppressOutput": false,
  "systemMessage": "Additional context for Claude",
  "hookSpecificOutput": {
    "permissionDecision": "allow",
    "updatedInput": { "command": "modified command" },
    "additionalContext": "extra info"
  }
}
```

**Exit Codes:**
| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Success | Continue, parse stdout JSON |
| 2 | Blocking error | Block operation, show stderr as error |
| Other | Non-blocking error | Continue, show stderr in verbose |

### Example Hook Scripts

**Auto-format on write** (PostToolUse:Write):
```bash
#!/bin/bash
FILE=$1
case "$FILE" in
  *.js|*.jsx|*.ts|*.tsx) command -v prettier &>/dev/null && prettier --write "$FILE" ;;
  *.py) command -v black &>/dev/null && black "$FILE" ;;
  *.go) command -v gofmt &>/dev/null && gofmt -w "$FILE" ;;
esac
exit 0
```

**Security scan on write** (PostToolUse:Write):
```bash
#!/bin/bash
FILE=$1
# Check for hardcoded passwords, API keys, private keys, AWS keys
grep -qE "(password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]" "$FILE" && echo "WARNING: Hardcoded password"
grep -qE "AKIA[0-9A-Z]{16}" "$FILE" && echo "WARNING: AWS access key"
grep -q "BEGIN.*PRIVATE KEY" "$FILE" && echo "WARNING: Private key"
exit 0  # Warn only, don't block
```

**Pre-commit test runner** (PreToolUse:Bash):
```bash
#!/bin/bash
# Auto-detect project type and run tests
[ -f "package.json" ] && npm test || true
[ -f "pytest.ini" ] && pytest || true
[ -f "go.mod" ] && go test ./... || true
```

**Context tracker** (UserPromptSubmit + Stop — dual-hook pair):
```python
#!/usr/bin/env python3
# Snapshots token count on UserPromptSubmit, calculates delta on Stop
# Uses tiktoken with p50k_base for ~90-95% accuracy
# Reports to stderr: "Context (tiktoken): ~45,000 tokens (35.2% used)"
```

**Prompt validator** (UserPromptSubmit):
```bash
#!/bin/bash
PROMPT=$(cat)
# Block dangerous patterns: rm -rf /, drop database, format disk
# Gate production deploys behind .deployment-approved file
```

### Best Practices

- Keep hooks fast (<1 second)
- Use exit code 2 for blocking, 0 for success
- Output diagnostics to stderr (stdout reserved for JSON)
- Use `command -v` to check optional tool availability
- Never hardcode credentials — use env vars
- Test independently: `echo '{"tool_name":"Bash"}' | python3 hook.py`
- Hook pairs (UserPromptSubmit + Stop) enable before/after measurements

---

## 7. Plugins

### What They Are
Bundled collections of slash commands, subagents, skills, MCP servers, hooks, LSP configs, and settings that install with a single command. The highest-level extension mechanism.

### Plugin Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json         # Manifest (required)
├── commands/               # Slash commands as .md
├── agents/                 # Subagent definitions as .md
├── skills/                 # SKILL.md files
├── hooks/                  # hooks.json or JS files
├── .mcp.json               # MCP server configs
├── .lsp.json               # LSP server configs
├── settings.json           # Default settings
├── templates/              # Reusable templates
├── scripts/                # Shell/Python helpers
├── docs/                   # Documentation
└── tests/                  # Plugin tests
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "pr-review",
  "version": "1.0.0",
  "description": "Complete PR review workflow with security, testing, and docs",
  "author": { "name": "Anthropic" },
  "license": "MIT"
}
```

Components are auto-discovered by directory convention — no explicit registration needed.

### Plugin CLI Commands

```bash
claude plugin install <name>@<marketplace>
claude plugin uninstall <name>
claude plugin list
claude plugin enable <name>
claude plugin disable <name>
claude plugin validate
claude --plugin-dir ./path    # Local dev testing
/reload-plugins               # Hot-reload in session
```

### Example Plugins from the Repo

**PR Review Plugin** (10 files):
- Commands: `/review-pr`, `/check-security`, `/check-tests`
- Agents: security-reviewer, test-checker, performance-analyzer
- MCP: GitHub integration
- Hooks: pre-review validation

**DevOps Plugin** (15 files):
- Commands: `/deploy`, `/rollback`, `/status`, `/incident`
- Agents: deployment-specialist, incident-commander, alert-analyzer
- MCP: Kubernetes integration
- Hooks: pre-deploy checks, post-deploy health checks
- Scripts: deploy.sh, rollback.sh, health-check.sh

**Documentation Plugin** (14 files):
- Commands: `/generate-api-docs`, `/generate-readme`, `/sync-docs`, `/validate-docs`
- Agents: api-documenter, code-commentator, example-generator
- Templates: api-endpoint.md, function-docs.md, adr-template.md

### Advanced Plugin Features

- `userConfig` with `sensitive: true` for keychain-stored secrets
- `${CLAUDE_PLUGIN_DATA}` persistent storage directory per plugin
- Inline plugin definitions via `source: 'settings'`
- LSP support for Go (gopls), Python (pyright), TypeScript, Rust
- Marketplace sources: GitHub, Git URL, npm, pip, local path
- `strictKnownMarketplaces` for enterprise allowlisting
- Security sandbox: plugin subagents cannot define hooks, configure MCP, or override permissions

### Plugin vs Manual Setup

| Aspect | Manual | Plugin |
|--------|--------|--------|
| Setup time | 2+ hours | 2 minutes |
| Reproducibility | Hope teammates configure correctly | Exact same setup |
| Versioning | Manual | Automatic |
| Updates | Manual per-component | One command |
| Distribution | Copy files | Install ID |

### When to Create a Plugin

- Need multiple components (commands + agents + hooks)
- Team workflow that needs sharing
- Complex setup requiring auto-configuration
- DON'T create for: single-task automation (use command), single domain expertise (use skill), standalone live data (use MCP)

---

## 8. Checkpoints

### What They Are
Automatic snapshots of conversation state (messages + file modifications + context) created with every user prompt. Enable safe experimentation and rollback.

### Accessing Checkpoints

```bash
Esc + Esc    # Open checkpoint browser
/rewind      # Same as above
/checkpoint  # Manage checkpoints
```

### 5 Rewind Options

1. **Restore code and conversation** — Full revert to that point
2. **Restore conversation** — Rewind messages, keep current code
3. **Restore code** — Revert files, keep conversation
4. **Summarize from here** — Compress conversation into AI summary
5. **Never mind** — Cancel

### Key Facts

- Auto-created with every user prompt — no manual saving
- Persist up to 30 days, then auto-clean
- NOT a replacement for git
- Bash operations (`rm`, `mv`, `cp`) and external file changes are NOT tracked
- Only Claude's tool-based file modifications are tracked

### Workflow Patterns

| Pattern | Steps |
|---------|-------|
| **A/B Testing** | Checkpoint -> Try A -> Checkpoint -> Rewind -> Try B -> Compare |
| **Safe Refactoring** | Auto-checkpoint -> Refactor -> Test -> If fail: rewind |
| **Debugging** | Checkpoint -> Hypothesis 1 -> Fail -> Rewind -> Hypothesis 2 |
| **Mistake Recovery** | Notice issue -> Rewind to last good state |

### Configuration

```json
{
  "autoCheckpoint": true
}
```

---

## 9. Advanced Features

### Planning Mode

```bash
/plan Implement user authentication system    # Enter plan mode
# OR
claude --permission-mode plan "analyze code"  # Read-only analysis
# OR
Shift+Tab                                      # Cycle through modes
```

- Two-phase: Plan -> Approve -> Execute
- `opusplan` model alias: Opus plans, Sonnet executes (cost optimization)
- `Ctrl+G` opens plan in external editor
- Plans include phases, time estimates, file counts, risk assessment

### Extended Thinking

```bash
Alt+T / Option+T           # Toggle in session
/effort high                # Set effort level
claude --effort max         # CLI flag
export MAX_THINKING_TOKENS=50000  # Environment variable
```

- Effort levels (Opus 4.6 only): `low`, `medium`, `high`, `max`
- "ultrathink" keyword in prompts activates deep reasoning
- `Ctrl+O` to view reasoning output (verbose mode)

### Auto Mode (Research Preview)

```bash
claude --enable-auto-mode   # Enable, then Shift+Tab to activate
claude auto-mode defaults   # Print default rules as JSON
```

- Background safety classifier reviews each action
- Requires Team plan + Sonnet 4.6/Opus 4.6
- **Blocked by default**: pipe-to-shell installs, sending sensitive data externally, production deploys, mass deletion, IAM changes, force push to main
- **Allowed by default**: local file operations, declared dependency installs, read-only HTTP
- Fallback to user prompt after 3 consecutive or 20 total classifier blocks

### Permission Modes (6 Total)

| Mode | Behavior |
|------|----------|
| `default` | Read only; prompts for everything else |
| `acceptEdits` | Auto-approve file edits; prompts for commands |
| `plan` | Read only, no modifications |
| `auto` | Safety classifier reviews all actions |
| `dontAsk` | Only pre-approved tools; others denied |
| `bypassPermissions` | No checks (requires `--dangerously-skip-permissions`) |

### Background Tasks

```
"Run tests in background"
/task list              # Show all tasks
/task status bg-1234    # Check progress
/task show bg-1234      # View output
/task cancel bg-1234    # Cancel
```

Config: `backgroundTasks.enabled`, `maxConcurrentTasks` (up to 5)

### Scheduled Tasks

```bash
/loop 5m /check-status              # Every 5 minutes
/loop 2h "check dependency updates" # Every 2 hours
/schedule "daily at 9am" "run tests" # Cloud-persisted schedule
```

- Session-scoped, up to 50 per session, auto-expire after 3 days
- Cloud scheduled tasks via `/schedule` persist across restarts
- Disable: `CLAUDE_CODE_DISABLE_CRON=1`

### Session Management

```bash
claude -c                  # Continue most recent conversation
claude -r "feature-auth"   # Resume session by name
/resume                    # Browse and resume sessions
/rename "Feature Work"     # Name current session
/fork                      # Branch into new session
--fork-session <id>        # Branch from specific session
```

### Chrome Integration (Beta)

```bash
claude --chrome            # Enable browser automation
/chrome                    # Toggle in session
```

- Live DOM inspection, form testing, data extraction, session recording
- Shares browser login state for authenticated app testing
- Chrome and Edge only

### Remote Control

```bash
claude remote-control      # Start server
/remote-control            # In-session
```

- Continue CLI sessions from any browser/phone/tablet
- Connect via session URL, QR code, or by name at claude.ai/code
- Security: no inbound ports, outbound HTTPS only, scoped tokens

### Web Sessions

```bash
claude --remote "task"     # Create web session
claude --teleport          # Resume web session locally
/teleport                  # In-session
```

### Desktop App

- Visual diff review, parallel sessions, app preview
- PR monitoring with auto-fix
- Connectors: GitHub, Slack, Linear, Notion, Asana, Calendar
- Handoff from CLI: `/desktop`

### Git Worktrees

```bash
claude --worktree          # Isolated branch work
claude -w                  # Short form
```

- Sparse checkout for monorepos via `worktree.sparsePaths`
- Auto-cleanup if no changes made

### Sandboxing

```bash
/sandbox                   # Toggle in session
claude --sandbox           # CLI flag
```

- OS-level filesystem and network isolation for Bash commands
- Configure allowed/denied read/write paths
- Works alongside permission rules for defense in depth

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+L` | Clear screen |
| `Ctrl+R` | Search command history |
| `Ctrl+G` | Open plan in editor |
| `Ctrl+O` | Toggle verbose/thinking output |
| `Ctrl+B` | Background current agent |
| `Ctrl+F` | Kill background agent |
| `Alt+T` / `Option+T` | Toggle extended thinking |
| `Alt+P` | Toggle planning mode |
| `Shift+Tab` | Cycle permission modes |
| `Esc+Esc` | Open checkpoint browser |
| `Tab` | Autocomplete |
| `!command` | Direct bash execution |

### Custom Keybindings

```bash
/keybindings               # Configure
# Stored in ~/.claude/keybindings.json
# Supports chord sequences: ctrl+k ctrl+s
# 18 contexts for scope (Chat, Confirmation, Global, Autocomplete, etc.)
```

---

## 10. CLI Reference

### Core Commands

```bash
claude                                  # Interactive REPL
claude "query"                          # REPL with initial prompt
claude -p "query"                       # Print mode (non-interactive)
claude -p --output-format json "query"  # JSON output for scripts
claude -p --json-schema '{}' "query"    # Validated structured output
claude -c                               # Continue last session
claude -r "session-name"                # Resume by name
claude -w                               # Git worktree isolation
claude --bare                           # Skip hooks, skills, plugins, MCP, memory
claude update                           # Update CLI
claude mcp add/list/remove              # MCP management
claude mcp serve                        # Run as MCP server
claude agents                           # List agents
claude plugin install/list/remove       # Plugin management
claude auto-mode defaults               # Print auto mode rules
claude remote-control                   # Start remote server
claude auth login/logout/status         # Authentication
```

### Key Flags

| Flag | Purpose |
|------|---------|
| `-p, --print` | Non-interactive mode |
| `-c, --continue` | Continue last session |
| `-r, --resume` | Resume specific session |
| `-w, --worktree` | Isolated git worktree |
| `--model opus/sonnet/haiku/opusplan` | Model selection |
| `--effort low/medium/high/max` | Thinking effort |
| `--permission-mode` | Set permission mode |
| `--tools` | Restrict available tools |
| `--allowedTools / --disallowedTools` | Fine-grained tool control |
| `--output-format text/json/stream-json` | Output format |
| `--json-schema` | Validated JSON output |
| `--max-turns N` | Limit autonomous turns |
| `--max-budget-usd N` | Spending cap (print mode) |
| `--bare` | Skip all extensions |
| `--chrome / --no-chrome` | Browser integration |
| `--remote` | Create web session |
| `--teleport` | Resume web session locally |
| `--channels` | Subscribe to MCP channels |
| `--fork-session` | Branch from session |
| `--agents '{}'` | Inline JSON agent definitions |
| `--mcp-config` | MCP server configuration |
| `--sandbox` | Enable sandboxing |
| `--enable-auto-mode` | Enable auto mode |

### Models

| Model | Context | Notes |
|-------|---------|-------|
| Opus 4.6 | 1M tokens | Most capable, adaptive effort levels |
| Sonnet 4.6 | 1M tokens | Balanced speed and capability |
| Haiku 4.5 | 1M tokens | Fastest, quick tasks |
| opusplan | — | Opus plans, Sonnet executes |

### Piping and Batch Processing

```bash
cat error.log | claude -p "explain this error"
git log --oneline -20 | claude -p "summarize recent changes"

# Batch processing
for file in *.md; do
  claude -p --output-format json "summarize: $(cat $file)" > ${file%.md}.json
done
```

### CI/CD Integration

```bash
# GitHub Actions
- name: AI Code Review
  run: claude -p --output-format json --max-turns 3 "review code"

# With permission mode
claude -p --permission-mode dontAsk "run tests"

# With auto mode
claude --enable-auto-mode -p "implement and test feature"

# With spending cap
claude -p --max-budget-usd 5 "refactor auth module"
```

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API authentication |
| `ANTHROPIC_MODEL` | Default model |
| `MAX_THINKING_TOKENS` | Extended thinking budget |
| `CLAUDE_CODE_EFFORT_LEVEL` | Default effort level |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto-memory |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks |
| `CLAUDE_CODE_ENABLE_TASKS` | Enable task management |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Override subagent model |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Override compaction threshold |
| `CLAUDE_CODE_DISABLE_CRON` | Disable scheduled tasks |

---

## Feature Selection Guide

### Decision Tree

```
What do you need?

Quick repeated task?
  -> Manual trigger? -> Slash Command
  -> Auto trigger? -> Skill

External live data?
  -> Real-time? -> MCP
  -> Static/cross-session? -> Memory

Complex project?
  -> Multiple specialized roles? -> Subagents
  -> Single domain? -> Skills + Memory

Event-driven automation?
  -> Hook

Complete team workflow?
  -> Plugin (bundles everything)
```

### Installation Priority

| Priority | Feature | Command |
|----------|---------|---------|
| 1 | Memory | Create `./CLAUDE.md` with team standards |
| 2 | Slash Commands | `.claude/commands/*.md` or `.claude/skills/` |
| 3 | Subagents | `.claude/agents/*.md` |
| 4 | Hooks | Configure in `~/.claude/settings.json` |
| 5 | MCP | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` |
| 6 | Skills | `.claude/skills/<name>/SKILL.md` |
| 7 | Plugins | `/plugin install <name>` |

---

## Configuration Examples

### Development (General)

```json
{
  "model": "sonnet",
  "temperature": 0.7,
  "planning": { "autoEnter": true },
  "backgroundTasks": { "enabled": true, "maxConcurrentTasks": 3 },
  "hooks": {
    "PostToolUse": [{ "matcher": "Write", "hooks": [{ "type": "command", "command": "prettier --write $CLAUDE_FILE_PATH" }] }]
  }
}
```

### Code Review (Read-Only)

```json
{
  "model": "opus",
  "temperature": 0.3,
  "permissions": { "mode": "plan" },
  "extendedThinking": { "enabled": true }
}
```

### CI/CD Pipeline

```json
{
  "temperature": 0,
  "permissions": { "mode": "bypassPermissions" },
  "logging": { "level": "debug" },
  "timeout": 3600
}
```

### Security Audit

```json
{
  "model": "opus",
  "extendedThinking": { "enabled": true, "minThinkingTime": 10 },
  "permissions": { "mode": "plan" },
  "hooks": {
    "PostToolUse": [{ "matcher": "Write", "hooks": [{ "type": "command", "command": "security-scan.sh" }] }]
  }
}
```

### Autonomous Development

```json
{
  "model": "sonnet",
  "permissions": { "mode": "auto" },
  "sandbox": { "enabled": true }
}
```

---

## Clean Code Rules

Distilled from `clean-code-rules.md` in the repo:

### Naming
- Intention-revealing names that explain WHY something exists
- Class names: nouns (UserAccount, PaymentProcessor)
- Method names: verbs (calculateTotal, sendEmail)
- Avoid: data, info, manager, temp, result

### Functions
- Small (<20 lines ideal)
- Single responsibility — do one thing
- 0-2 arguments (3 maximum, never flag arguments)
- No side effects — function does what its name says
- Separate commands (change state) from queries (return info)

### Comments
- Code should be self-explanatory
- Good: legal info, warnings, TODOs, public API docs
- Bad: redundant, misleading, explaining bad code
- Never comment out code — delete it

### Error Handling
- Exceptions over return codes
- Provide context in exception messages
- Never return null — return empty collections or Optional
- Never pass null as arguments

### Classes
- Measured by responsibilities, not lines
- Single Responsibility Principle
- High cohesion, low coupling
- Open/Closed Principle

### Testing (F.I.R.S.T.)
- **F**ast, **I**ndependent, **R**epeatable, **S**elf-validating, **T**imely
- One concept per test
- Arrange-Act-Assert pattern
- Test code quality = production code quality

### Principles
- **DRY**: No duplication
- **YAGNI**: Don't build for hypothetical futures
- **KISS**: Avoid unnecessary complexity
- **Boy Scout Rule**: Leave code cleaner than you found it

---

## Qualia Gap Analysis

### What We Already Do (Often Better)

| Area | Our Approach | Repo's Approach |
|------|-------------|-----------------|
| Memory | 7-tier with session-digest, auto-handoff, stale warnings | 8-tier (same + managed drop-ins) |
| Hooks | 11 custom hooks (branch-guard, pre-deploy-gate, etc.) | 8 example hooks |
| Skills | 50+ skills with trigger phrases + Qualia workflow | 6 example skills |
| Subagents | 30+ agent types with model overrides | 8 example agents |
| Feature branches | branch-guard hook enforces automatically | Manual discipline |
| Post-deploy | `/deploy-verify` 8-check verification | Not covered |
| Cross-session | session-digest.md, auto-handoff, .continue-here | Not covered |

### Patterns Worth Adopting

1. **Directory-specific CLAUDE.md** — Place CLAUDE.md inside `apps/mobile/`, `apps/backend/` for monorepo module-specific rules (useful for Sakani)

2. **Python analysis scripts in skills** — Bundle `analyze-metrics.py` (cyclomatic complexity), `compare-complexity.py` (before/after), `detect-smells.py` (14 smell types) with our `/review` skill for objective metrics

3. **Context tracker hook** — `context-tracker-tiktoken.py` monitors token usage per request. Dual-hook pattern (UserPromptSubmit + Stop) with temp file state per session_id

4. **Security scan hook** — Auto-scan written files for hardcoded secrets (password patterns, AKIA keys, private keys). Add as PostToolUse:Write hook

5. **Plugin packaging** — Bundle our Qualia workflow (skills + hooks + agents + memory templates) as a distributable plugin for team onboarding

6. **`opusplan` model** — Opus for planning, Sonnet for execution. Cost optimization for complex tasks

7. **`--bare` flag** — Useful for debugging when hooks/skills interfere

8. **`--json-schema` flag** — Validated structured JSON output for automation scripts

9. **Path-scoped rules** — YAML frontmatter in `.claude/rules/` with `paths: src/api/**/*.ts` for targeted rules

10. **`user-invocable: false` skills** — Background knowledge skills that Claude applies silently (e.g., brand voice, coding standards)

### Things They Cover That We've Evolved Past

- Manual skill installation (`cp -r`) — we use registered skills with auto-discovery
- Simple frontmatter — our skills use richer metadata
- Basic memory — we have cross-session intelligence
- Tutorial-driven learning — our workflow is project-driven
- Linear progression — we have adaptive routing (`/qualia` smart router)

---

*Source: [github.com/luongnv89/claude-howto](https://github.com/luongnv89/claude-howto) v2.2.0*
*Studied: 2026-03-28*
*100+ files across 10 modules, all root docs, 3130-line master concepts guide*
