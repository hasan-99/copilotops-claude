# Qualia Solutions — Claude Code Team Config

This repo contains the shared Claude Code configuration for the Qualia Solutions team. It gives every team member the same rules, skills, commands, agents, and hooks — the only things that differ are your personal API keys.

## What's Shared vs Personal

**Shared (auto-synced from this repo):**
- `rules/` — project rules and coding standards
- `skills/` — custom skills (review, deploy-verify, etc.)
- `commands/` — slash commands (/learn, /deploy, etc.)
- `agents/` — agent definitions (planner, executor, verifier, etc.)
- `hooks/` — automation hooks (auto-test, pre-commit, session-learn, etc.)
- `CLAUDE.md` — master context file
- `qualia-context.md` — project registry and stack info
- `learned-patterns.md` — team knowledge base
- `.clauderc` — shared CLI defaults

**Personal (you fill in your own):**
- `settings.json` — your API keys (Vercel, Firecrawl, Sentry, Supabase)
- `~/.mcp.json` — your MCP server URLs and keys

## Prerequisites

Before starting, make sure you have:

1. **Git** installed and access to this repo
2. **Claude Code CLI** installed — [https://docs.claude.com/en/docs/claude-code](https://docs.claude.com/en/docs/claude-code)
3. Your personal accounts and API keys ready:
   - **Vercel** — get your token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - **Firecrawl** — get your key from your Firecrawl dashboard
   - **Sentry** — get your auth token from Sentry settings → API Keys
   - **Supabase** — get your access token from [app.supabase.com/account/tokens](https://app.supabase.com/account/tokens)
   - **GitHub** — your account must have access to Qualia repos

## Setup (First Time)

### Linux / Mac (Bash)

One-liner (clones and runs setup):
```bash
bash <(curl -s https://raw.githubusercontent.com/Qualiasolutions/qualia-claude/main/team-sync/setup.sh)
```

Or clone first then run:
```bash
git clone https://github.com/Qualiasolutions/qualia-claude.git ~/.claude-config-repo
bash ~/.claude-config-repo/team-sync/setup.sh
```

**Arch Linux note:** Make sure `git` and `coreutils` are installed (`pacman -S git coreutils`).

### Windows (PowerShell)

1. Open PowerShell and clone the repo:
```powershell
git clone https://github.com/Qualiasolutions/qualia-claude.git $env:USERPROFILE\.claude-config-repo
```

2. Run the setup script:
```powershell
& $env:USERPROFILE\.claude-config-repo\team-sync\setup.ps1
```

### After Setup (All Platforms)

1. Open `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`) and replace every `YOUR_*_HERE` with your actual API keys
2. Open `~/.mcp.json` (Windows: `%USERPROFILE%\.mcp.json`) and fill in your MCP server URLs
3. Run `claude` to verify everything connects

## Updating

When the team config gets updated (new skills, rule changes, etc.), pull the latest:

### Linux / Mac (Bash)
```bash
bash ~/.claude-config-repo/team-sync/update.sh
```

### Windows (PowerShell)
```powershell
& $env:USERPROFILE\.claude-config-repo\team-sync\update.ps1
```

This will:
- Pull the latest from the repo
- Sync all shared directories and files
- Alert you if new settings keys were added that you need to fill in

## Repo Structure

```
qualia-claude/
├── rules/                  # Shared coding rules
├── skills/                 # Custom skills (review, deploy-verify, etc.)
├── commands/               # Slash commands
├── agents/                 # Agent definitions
├── hooks/                  # Automation hooks
├── CLAUDE.md               # Master context
├── qualia-context.md       # Project registry
├── learned-patterns.md     # Team knowledge base
├── .clauderc               # CLI defaults
└── team-sync/
    ├── setup.sh            # First-time install (Mac/Linux)
    ├── setup.ps1           # First-time install (Windows)
    ├── update.sh           # Pull updates (Mac/Linux)
    ├── update.ps1          # Pull updates (Windows)
    ├── settings.json.template  # Settings template (fill in your keys)
    ├── mcp.json.template       # MCP config template
    └── README.md           # This file
```

## Troubleshooting

**MCP servers not connecting?**
Check that your API keys are correctly set in `settings.json` and `.mcp.json`. Run `claude mcp` to see server status.

**Hooks not firing? (Mac/Linux)**
Run `chmod +x ~/.claude/hooks/*.sh` to make sure they're executable.

**Need to start fresh?**
Your old config is backed up at `~/.claude-backup-TIMESTAMP/` (or `%USERPROFILE%\.claude-backup-TIMESTAMP\` on Windows). You can restore it and re-run setup.

**Windows: "execution policy" error?**
Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` in PowerShell, then try again.
