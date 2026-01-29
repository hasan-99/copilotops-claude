# Claude Code Quick Reference

One-page reference for common operations.

---

## Security Essentials

```bash
# Credentials location (ONLY here)
~/.claude/.env.claude

# Fix permissions
chmod 600 ~/.claude/.env.claude
chmod 600 ~/.claude/settings.json

# Rotate keys every 90 days
```

---

## Common Commands

### Research & Debug
```
/deep-research <scope>     # 6 parallel Opus agents
/production-audit          # Full system audit
/deep-debug <issue>        # Systematic debugging
/smart-fix <issue>         # Auto-fix with routing
```

### Frontend
```
/frontend <component>      # Build with animations
/responsive <target>       # Fix for all screens
/frontend-debug <issue>    # Fix visual bugs
/animate <target>          # Add animations
```

### Database
```
/supabase-ops <operation>  # Create, migrate, RLS
/supabase-master <issue>   # Debug & optimize
```

### Development
```
/tdd-cycle <feature>       # Test-driven dev
/git-flow commit           # Smart commits
```

---

## Model Aliases

Add to `.clauderc`:
```
~haiku         # Fast model
~sonnet        # Balanced
~opus          # Most capable
```

---

## Cleanup

### Manual
```bash
~/scripts/system-cleanup.sh
```

### Automatic
Runs every Sunday at 3 AM (cron)

### Quick Cleanup
```bash
# Package caches
pnpm store prune && npm cache clean --force

# Build artifacts
find ~/Desktop/Projects -name ".next" -mtime +7 -exec rm -rf {} +

# .claude state
find ~/.claude/shell-snapshots -mtime +7 -delete
```

---

## Key Directories

```
~/.claude/
├── .env.claude      # Credentials (chmod 600)
├── settings.json    # MCP config
├── skills/          # 37 skills
├── agents/          # 4 specialized agents
├── commands/        # Command templates
├── projects/        # Session state
└── debug/           # Execution traces
```

---

## Start Claude

```bash
source ~/.claude/.env.claude && claude
```

---

## Skills by Category

### Research
- deep-research
- production-audit
- stack-researcher

### Debug
- deep-debug
- smart-fix
- frontend-debug

### Frontend
- frontend
- frontend-design
- responsive
- animation-toolkit-2025

### Database
- supabase-ops
- supabase-master

### Deployment
- vercel-deploy
- vercel-ai-deploy

---

## Agents

| Agent | Purpose |
|-------|---------|
| pm-agent | Self-improvement, PDCA cycle |
| business-panel | 9-expert strategy panel |
| socratic-mentor | Educational guide |
| project-debugger | Deep debugging |

---

## Workflow

```
1. Explore codebase
2. Plan with TodoWrite
3. Implement
4. Commit
5. Document learnings
```

---

## Emergency

### Restore Backup
```bash
tar -xzf ~/.claude-backup-YYYYMMDD.tar.gz -C ~/
```

### Rollback Git
```bash
git revert HEAD~N..HEAD
```

### Check Logs
```bash
ls -la ~/.claude/debug/
```

---

## Help

```
/help                      # Claude Code help
~/.claude/COMMANDS_GUIDE.md  # Full command reference
~/.claude/MCP_SETUP.md       # MCP configuration
```
