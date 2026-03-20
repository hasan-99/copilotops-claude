# Qualia Solutions — Claude Code Team Config

Shared Claude Code configuration for Qualia Solutions. Gives every machine the same rules, skills, commands, agents, and hooks — only API keys differ.

## What's Shared vs Personal

**Shared (synced from this repo):**
- `rules/` — coding standards (security, deployment, frontend, speed)
- `skills/` — 74 custom skills (deploy, review, debug, qualia-*, design, etc.)
- `commands/` — slash commands (/ship, /learn, /review, /status, etc.)
- `agents/` — agent definitions (planner, executor, verifier, researcher, etc.)
- `hooks/` — automation hooks (pre-commit, branch-guard, auto-test, etc.)
- `scripts/` — utility scripts (TTS, cowork-mode, status, video recorder)
- `get-shit-done/` — GSD workflow framework
- `knowledge/` — persistent knowledge base
- `config/` — retention and cleanup config
- `CLAUDE.md` — master context file
- `.clauderc` — CLI defaults and aliases
- `.claudeignore` — context exclusion patterns

**Personal (fill in your own):**
- `settings.json` — API keys (Zoho, Firecrawl, Sentry, Supabase) + permissions + hooks
- `~/.mcp.json` — MCP server config (uses env vars from settings.json)

## Full Machine Setup (Pop!_OS)

For a complete environment (system packages, Chrome, VS Code, Cursor, Docker, etc.):

```bash
git clone https://github.com/Qualiasolutions/qualia-claude.git ~/Projects/qualia-claude
bash ~/Projects/qualia-claude/scripts/bootstrap-pop-os.sh
```

See [POP-OS-SETUP.md](../POP-OS-SETUP.md) for step-by-step details. For Arch Linux, see [ARCH-SETUP.md](../ARCH-SETUP.md).

## Claude Config Only (Already have dev tools)

### Linux / Mac

One-liner (clones repo and syncs config):
```bash
bash <(curl -s https://raw.githubusercontent.com/Qualiasolutions/qualia-claude/main/team-sync/setup.sh)
```

Or from a local clone:
```bash
bash ~/Projects/qualia-claude/team-sync/setup.sh
```

### Windows (PowerShell)

```powershell
git clone https://github.com/Qualiasolutions/qualia-claude.git $env:USERPROFILE\.claude-config-repo
& $env:USERPROFILE\.claude-config-repo\team-sync\setup.ps1
```

### After Setup

1. Open `~/.claude/settings.json` and replace `YOUR_*_HERE` placeholders with real API keys
2. Run `claude` to verify

## Updating

```bash
cd ~/Projects/qualia-claude && git pull
bash team-sync/update.sh
```

## Troubleshooting

**MCP servers not connecting?**
Check API keys in `~/.claude/settings.json` env section. MCP config at `~/.mcp.json` uses `${VAR}` syntax to read from settings env.

**Hooks not firing?**
Run `chmod +x ~/.claude/hooks/*.sh`

**Need to start fresh?**
Old config backed up at `~/.claude-backup-TIMESTAMP/`. Restore and re-run setup.
