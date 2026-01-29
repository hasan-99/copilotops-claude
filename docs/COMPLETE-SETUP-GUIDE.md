# Claude Code Complete Setup Guide

**Generated:** 2026-01-14
**User:** Fawzi, Qualia Solutions
**Stack:** Next.js 15+, React 19, TypeScript, Supabase, Vercel, VAPI
**Overall Score:** 7.7/10 - Production-Ready

---

## Quick Reference Card

### Daily Startup
```bash
source ~/.claude/.env.claude && claude
git status && git branch
```

### Top 10 Commands
| Alias | Full Command | Purpose |
|-------|--------------|---------|
| `/fd` | frontend-master --design | Distinctive UI design |
| `/fb` | frontend-master --build | Build components |
| `/dd` | deep-debug | Systematic debugging |
| `/sf` | smart-fix | Auto-fix with routing |
| `/pr` | production-audit | 6-agent production audit |
| `/dr` | deep-research | 6-agent codebase analysis |
| `/nf` | new-feature | Plan → TDD → implement |
| `/dep` | full-deploy | Test → build → deploy |
| `/va` | voice-agent | Build voice AI agents |
| `/resp` | responsive | Fix responsive issues |

### Workflow Commands
```bash
/workflows:plan [feature]    # Plan feature implementation
/workflows:work [plan.md]    # Execute with TodoWrite
/workflows:review            # Multi-agent code review
/workflows:compound          # Document solution
```

---

## Asset Inventory

### Skills (29 Total)

| Category | Skills | Purpose |
|----------|--------|---------|
| **Research** | deep-research, production-audit, stack-researcher, brownfield-explore, spec-panel | Multi-agent analysis |
| **Debug** | deep-debug, smart-fix, frontend-debug, audit-fix | Bug fixing |
| **Frontend** | frontend-master, responsive | UI development |
| **Backend** | supabase, supabase-edge | Database & APIs |
| **Deploy** | full-deploy, vercel-deploy | CI/CD pipelines |
| **Voice** | voice-agent, channel-integration | Voice AI agents |
| **Testing** | test-runner, webapp-testing | Automated testing |
| **Docs** | compound-docs, docx, pdf | Documentation |
| **Workflow** | new-feature, git-flow, git-worktree | Dev workflows |
| **Qualia** | qualia-workflow, admin-panel | Qualia-specific |

### Agents (16 Total)

| Agent | Use When |
|-------|----------|
| architecture-strategist | Design decisions, PR reviews |
| backend-agent | Database, APIs, Edge Functions |
| frontend-agent | Components, animations |
| kieran-typescript-reviewer | TypeScript quality review |
| security-sentinel | Security audits |
| performance-oracle | Performance optimization |
| project-debugger | Complex bug investigation |
| repo-research-analyst | Codebase exploration |
| best-practices-researcher | Framework best practices |
| framework-docs-researcher | Documentation lookup |
| code-simplicity-reviewer | Complexity reduction |
| git-history-analyzer | Commit history analysis |
| business-panel | Business impact analysis |
| pm-agent | Product management |
| test-agent | Testing strategy |
| socratic-mentor | Learning & mentoring |

### Plugins (9 Enabled)

| Plugin | Purpose |
|--------|---------|
| context7 | Documentation search for any library |
| supabase | Database operations via MCP |
| frontend-design | UI/design expertise |
| feature-dev | Feature development workflows |
| code-review | PR review skill |
| security-guidance | Security best practices |
| typescript-lsp | Go to definition, references |
| ralph-loop | Iterative refinement |
| dev-browser | Browser automation |

### Hooks (4 Active)

| Hook | Trigger | Purpose |
|------|---------|---------|
| pre-commit.sh | git commit | Secret detection, type checking, ESLint |
| auto-format.sh | Write tool | Auto-format (Prettier, Black, gofmt) |
| save-session-state.sh | Session end | Persist context for continuity |
| post-deploy.sh | Deploy | Health check verification |

---

## How It All Works

### Context Management

```
Session Start
    ↓
Load ~/.claude/CLAUDE.md (global rules)
    ↓
Load project CLAUDE.md (project-specific)
    ↓
Load recent session from session-env/
    ↓
Check git status for context
    ↓
Agent Ready
    ↓
[Work happens]
    ↓
Session End
    ↓
save-session-state.sh saves:
  - Working directory
  - Git branch
  - Recent files
  - Active todos
```

### Plugin vs Skill vs Command vs Agent

```
PLUGIN  = Global tool (e.g., typescript-lsp gives goToDefinition)
SKILL   = Methodology (e.g., kieran-typescript-reviewer teaches review)
COMMAND = Shortcut (e.g., /dd invokes deep-debug skill)
AGENT   = Specialized AI (e.g., backend-agent for database work)
```

---

## Security Configuration

### Permissions
```json
Allow: git, npm, pnpm, bun, Read, Glob, Grep
Deny: Write to *.env*, *credentials*, *secret*
```

### Pre-Commit Checks
- ✅ Secret detection (API keys, tokens)
- ✅ .env file blocking
- ✅ TypeScript type checking
- ⚠️ ESLint warnings
- ⚠️ Debug statement warnings

### File Permissions
```bash
chmod 600 ~/.claude/.credentials.json
chmod 600 ~/.claude/.env.claude
```

---

## Workflows

### The Compounding Cycle
```
/workflows:plan "feature" → Create plan
/workflows:work plan.md   → Execute with agents
/workflows:review         → Multi-agent review
/workflows:compound       → Document for future
```

### Debugging Decision Tree
```
Simple error?     → /sf (smart-fix)
Complex bug?      → /dd (deep-debug)
Visual issue?     → /frontend-debug
Database issue?   → supabase-master
```

### Building Decision Tree
```
Component?        → /fb (frontend-master --build)
Design focus?     → /fd (frontend-master --design)
Full feature?     → /nf (new-feature)
Complex feature?  → /workflows:plan
```

---

## Directory Structure

```
~/.claude/
├── CLAUDE.md           # Global instructions
├── settings.json       # Plugins, permissions, hooks
├── .env.claude         # API credentials
├── .credentials.json   # OAuth tokens
├── skills/             # 29 skill definitions
├── agents/             # 16 agent definitions
├── commands/           # 47 command shortcuts
├── hooks/              # Automation scripts
├── plans/              # Saved feature plans
├── todos/              # Task tracking
├── projects/           # Per-project session data
├── session-env/        # Session state snapshots
├── docs/               # Compounded solutions
└── scripts/            # Maintenance (cleanup.sh)
```

---

## Best Practices

### ✅ Implemented
1. Secret detection in pre-commit
2. Auto-formatting on file write
3. TypeScript checking before commit
4. Session state persistence
5. Defense-in-depth permissions
6. Context exclusions (.claudeignore)
7. Weekly cleanup automation

### ⚠️ Gaps to Address
1. No credential vault (plain text in .env)
2. No audit logging
3. No test execution in pre-commit
4. Missing .claudeignore patterns (coverage/, .turbo/)

---

## Emergency Commands

```bash
# Restore backup
tar -xzf ~/.claude-backup-YYYYMMDD.tar.gz -C ~/

# Git rollback
git revert HEAD~N..HEAD && git push

# Check logs
tail -f ~/.claude/debug/latest.log

# Verify credentials
source ~/.claude/.env.claude && env | grep -E "SUPABASE|VERCEL"
```

---

## Full Skill Reference

```bash
# All available skills:
ls ~/.claude/skills/

admin-panel        channel-integration   deep-debug         docx
file-todos         frontend-debug        frontend-master    full-deploy
git-flow           git-worktree          new-feature        pdf
production-audit   qualia-workflow       responsive         skill-creator
smart-fix          spec-panel            stack-researcher   supabase
supabase-edge      test-runner           vercel-deploy      voice-agent
webapp-testing     brownfield-explore    compound-docs      deep-research
audit-fix
```

---

*This guide auto-generated by deep-research skill with 6 parallel Opus 4.5 agents.*
