# Qualia Claude

The complete Claude Code configuration for Qualia Solutions. Clone this repo on any new machine to get the full dev environment — skills, hooks, agents, rules, MCP servers, and the Get-Shit-Done workflow framework.

## What's Inside

```
qualia-claude/
├── skills/           # 74 custom skills (deploy, review, debug, qualia-*, design, etc.)
├── hooks/            # Automation hooks (pre-commit, branch-guard, auto-test, etc.)
├── agents/           # Agent definitions (planner, executor, verifier, researcher, etc.)
├── rules/            # Coding standards (security, deployment, frontend, speed)
├── commands/         # Slash commands (/ship, /review, /learn, /status, etc.)
├── scripts/          # Utility scripts (TTS, cowork-mode, status, showcase recorder)
├── get-shit-done/    # GSD workflow framework (templates, references, bin)
├── knowledge/        # Persistent knowledge base (client prefs, qualia context)
├── config/           # Retention and cleanup config
├── team-sync/        # Setup/update scripts + settings templates
├── CLAUDE.md         # Master context and rules
├── .clauderc         # Model aliases and skill shortcuts
├── .claudeignore     # Context exclusion patterns
├── POP-OS-SETUP.md   # Full Pop!_OS environment setup (Lenovo LOQ / NVIDIA)
└── ARCH-SETUP.md     # Full Arch Linux environment setup (legacy)
```

## Quick Start (New Machine)

### 1. Bootstrap the full environment (Pop!_OS)

```bash
# Clone this repo
git clone https://github.com/Qualiasolutions/qualia-claude.git ~/Projects/qualia-claude

# Run the full bootstrap (installs everything: system packages, dev tools, Claude Code, configs)
bash ~/Projects/qualia-claude/scripts/bootstrap-pop-os.sh
```

This single script handles:
- System packages (build tools, git, Node.js, Python, Docker, fonts, media codecs)
- Dev tools (VS Code, Cursor, Chrome, Discord, Ghostty terminal)
- Claude Code CLI + Claude Desktop
- npm globals (pnpm, typescript, vercel, supabase, firecrawl, eas-cli)
- Python tools (poetry, modal)
- Claude config sync (skills, hooks, agents, rules, commands)
- Shell config (.bashrc, git config, Ghostty theme)
- MCP server config (Zoho, Firecrawl, Sentry)
- NVIDIA driver verification

### 2. Fill in your API keys

After bootstrap, edit these files and replace placeholders:

```bash
# Claude Code settings (API keys for MCP servers)
nano ~/.claude/settings.json

# MCP server config
nano ~/.mcp.json

# Shell environment (ElevenLabs TTS key)
nano ~/.bashrc
```

Keys you need:
| Key | Where to get it |
|-----|----------------|
| `ZOHO_MCP_KEY` | Zoho MCP dashboard |
| `FIRECRAWL_API_KEY` | Firecrawl dashboard |
| `SENTRY_ACCESS_TOKEN` | Sentry > Settings > API Keys |
| `SUPABASE_ACCESS_TOKEN` | app.supabase.com/account/tokens |
| `ELEVEN_API_KEY` | ElevenLabs dashboard |

### 3. Verify

```bash
claude --version    # Claude Code CLI
gh auth status      # GitHub CLI
vercel whoami       # Vercel
supabase --version  # Supabase CLI
```

## Updating Config

When skills/hooks/rules change, pull and re-sync:

```bash
cd ~/Projects/qualia-claude && git pull
bash team-sync/update.sh
```

## Claude Code Setup Only (Already have system packages)

If you already have a working dev environment and just need the Claude Code config:

```bash
bash <(curl -s https://raw.githubusercontent.com/Qualiasolutions/qualia-claude/main/team-sync/setup.sh)
```

## Key Skills

| Skill | What it does |
|-------|-------------|
| `/ship` | Full deploy pipeline (quality gates > commit > deploy > verify) |
| `/review` | Code review with optional `--web` or `--ai` audit |
| `/debug` | Structured debugging with `--frontend` and `--perf` modes |
| `/status` | Fleet-wide project health check |
| `/qualia` | Smart router — reads project state, picks the right command |
| `/team` | Spawn parallel specialist agents (frontend + backend + test) |
| `/deploy-verify` | Post-deploy 8-check verification |
| `/quick-pr` | Auto-generate PR with description from changes |

## Key Hooks

| Hook | Trigger | What it does |
|------|---------|-------------|
| `pre-commit.sh` | Before git commit | Lint, type-check, block secrets |
| `branch-guard.sh` | Before git push | Prevent direct push to main |
| `block-env-edit.sh` | Before file edit | Block edits to .env files |
| `auto-test.sh` | After file write/edit | Run related tests automatically |
| `pre-deploy-gate.sh` | Before vercel deploy | Production readiness checks |
| `post-deploy.sh` | After vercel --prod | Post-deploy verification |
| `context-manager.sh` | Session start | Load/save context across sessions |
| `retention-cleanup.sh` | Session start | Clean up old session data |

## Architecture

The `.claude/` directory on disk is the live config. This repo is the source of truth for the shared parts. The `team-sync/setup.sh` script copies shared dirs into `~/.claude/` and creates templates for personal config files (settings.json, .mcp.json) that you fill in with your own API keys.

Personal/sensitive files are `.gitignore`d and never committed.
