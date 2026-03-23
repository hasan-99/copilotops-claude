#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Config Setup (Mac/Linux)
# Run once to install the shared team config.
# Can be run standalone (clones repo) or from an existing clone.
# Re-run anytime to sync latest intelligence updates.
# ============================================================

set -euo pipefail

REPO_URL="https://github.com/Qualiasolutions/qualia-claude.git"
CLAUDE_DIR="$HOME/.claude"

# Detect if we're running from inside the repo already
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../CLAUDE.md" ] && [ -d "$SCRIPT_DIR/../skills" ]; then
    REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    REPO_DIR="$HOME/.claude-config-repo"
fi

echo ""
echo "=================================================="
echo "   Qualia Solutions - Claude Code Team Setup       "
echo "   v2.0 — Intelligence Framework Edition           "
echo "=================================================="
echo ""

# ---- Check prerequisites ----
echo "-> Checking prerequisites..."

if ! command -v git &>/dev/null; then
    echo "  X Git is not installed. Install with your package manager."
    exit 1
fi
echo "  OK git"

if ! command -v claude &>/dev/null; then
    echo "  WARN: Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code"
    echo "        Continuing setup anyway..."
else
    echo "  OK claude ($(claude --version 2>/dev/null || echo 'unknown version'))"
fi
echo ""

# ---- Backup existing config ----
if [ -d "$CLAUDE_DIR" ] && [ -f "$CLAUDE_DIR/settings.json" ]; then
    BACKUP="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
    echo "-> Backing up existing config to $BACKUP..."
    cp -r "$CLAUDE_DIR" "$BACKUP"
    echo "  OK Backup created"
    echo ""
fi

# ---- Clone or update repo if not running from local clone ----
if [ "$REPO_DIR" = "$HOME/.claude-config-repo" ]; then
    if [ -d "$REPO_DIR" ]; then
        echo "-> Updating existing repo..."
        git -C "$REPO_DIR" pull origin main 2>/dev/null || true
    else
        echo "-> Cloning shared config..."
        git clone "$REPO_URL" "$REPO_DIR"
    fi
    echo "  OK Repo ready"
    echo ""
fi

# ---- Create .claude directory structure ----
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/agent-memory"

# ---- Copy shared directories ----
echo "-> Syncing shared directories..."
SHARED_DIRS=(rules skills commands agents hooks get-shit-done knowledge scripts config)

for dir in "${SHARED_DIRS[@]}"; do
    src="$REPO_DIR/$dir"
    dest="$CLAUDE_DIR/$dir"

    if [ -d "$src" ]; then
        rm -rf "$dest"
        cp -r "$src" "$dest"
        count=$(find "$dest" -type f | wc -l)
        echo "  OK $dir ($count files)"
    fi
done
echo ""

# ---- Copy .claudeignore ----
if [ -f "$REPO_DIR/.claudeignore" ]; then
    cp "$REPO_DIR/.claudeignore" "$CLAUDE_DIR/.claudeignore"
    echo "  OK .claudeignore"
fi

# ---- Make hooks and scripts executable ----
echo "-> Setting permissions..."
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/hooks/"*.js 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.py 2>/dev/null || true
echo "  OK permissions set"
echo ""

# ---- Copy shared files ----
echo "-> Syncing shared files..."
SHARED_FILES=(CLAUDE.md .clauderc .gitignore)

for file in "${SHARED_FILES[@]}"; do
    src="$REPO_DIR/$file"
    dest="$CLAUDE_DIR/$file"

    if [ -f "$src" ]; then
        cp "$src" "$dest"
        echo "  OK $file"
    fi
done
echo ""

# ---- Setup MEMORY.md (auto-loaded intelligence router) ----
echo "-> Setting up memory system..."
MEMORY_TEMPLATE="$REPO_DIR/team-sync/MEMORY.md.template"
# Each user's memory dir is project-path-based
# Create a default memory location
DEFAULT_MEMORY_DIR="$CLAUDE_DIR/projects/-home-$(whoami)--claude/memory"
mkdir -p "$DEFAULT_MEMORY_DIR"

if [ ! -f "$DEFAULT_MEMORY_DIR/MEMORY.md" ] && [ -f "$MEMORY_TEMPLATE" ]; then
    cp "$MEMORY_TEMPLATE" "$DEFAULT_MEMORY_DIR/MEMORY.md"
    echo "  OK MEMORY.md installed (auto-loaded every session)"
elif [ -f "$DEFAULT_MEMORY_DIR/MEMORY.md" ]; then
    echo "  OK MEMORY.md already exists (keeping your version)"
fi
echo ""

# ---- Create settings.json from template if it doesn't exist ----
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
SETTINGS_TEMPLATE="$REPO_DIR/team-sync/settings.json.template"

if [ ! -f "$SETTINGS_FILE" ]; then
    if [ -f "$SETTINGS_TEMPLATE" ]; then
        cp "$SETTINGS_TEMPLATE" "$SETTINGS_FILE"
        echo "-> Created settings.json from template"
        echo "   IMPORTANT: Open $SETTINGS_FILE and fill in your API keys!"
    fi
else
    echo "-> settings.json already exists (keeping your keys)"
    echo "   To get new hooks/features, merge from: $SETTINGS_TEMPLATE"
fi

# ---- Create ~/.mcp.json from template if it doesn't exist ----
MCP_FILE="$HOME/.mcp.json"
MCP_TEMPLATE="$REPO_DIR/team-sync/mcp.json.template"

if [ ! -f "$MCP_FILE" ]; then
    if [ -f "$MCP_TEMPLATE" ]; then
        cp "$MCP_TEMPLATE" "$MCP_FILE"
        echo "-> Created ~/.mcp.json from template"
    fi
else
    echo "-> ~/.mcp.json already exists (keeping your config)"
fi
echo ""

# ---- Summary ----
echo "=================================================="
echo "   Setup complete!                                 "
echo "=================================================="
echo ""
echo "What was installed:"
echo "  - $(ls "$CLAUDE_DIR/skills/" | wc -l) skills (auto-invoked capabilities)"
echo "  - $(ls "$CLAUDE_DIR/agents/" | wc -l) agents (specialized subagents)"
echo "  - $(ls "$CLAUDE_DIR/hooks/" | wc -l) hooks (automated enforcement)"
echo "  - $(ls "$CLAUDE_DIR/knowledge/" | wc -l) knowledge files (project intelligence)"
echo "  - $(ls "$CLAUDE_DIR/get-shit-done/workflows/" | wc -l) GSD workflows"
echo "  - $(ls "$CLAUDE_DIR/rules/" | wc -l) rule files (always-loaded)"
echo "  - MEMORY.md (auto-loaded routing index)"
echo ""
echo "Next steps:"
echo "  1. If first time: Open $SETTINGS_FILE"
echo "     Replace all YOUR_*_HERE placeholders with your real API keys"
echo ""
echo "  2. Run 'claude' to start working"
echo ""
echo "  3. Key commands for trainees:"
echo "     /qualia:quick     — Fast task execution (most used)"
echo "     /ship             — Deploy to production"
echo "     /review           — Code review before shipping"
echo "     /qualia:help      — See all available commands"
echo ""
echo "  4. Read the onboarding guide:"
echo "     ~/Projects/live/qualia/docs/trainee-onboarding.md"
echo ""
echo "  5. Interactive framework docs:"
echo "     https://portal.qualiasolutions.net/framework"
echo ""
