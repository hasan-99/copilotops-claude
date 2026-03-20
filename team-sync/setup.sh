#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Config Setup (Mac/Linux)
# Run once to install the shared team config.
# Can be run standalone (clones repo) or from an existing clone.
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
    echo "  OK claude"
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

# ---- Create .claude directory if needed ----
mkdir -p "$CLAUDE_DIR"

# ---- Copy shared directories ----
echo "-> Syncing shared directories..."
SHARED_DIRS=(rules skills commands agents hooks get-shit-done knowledge scripts)

for dir in "${SHARED_DIRS[@]}"; do
    src="$REPO_DIR/$dir"
    dest="$CLAUDE_DIR/$dir"

    if [ -d "$src" ]; then
        rm -rf "$dest"
        cp -r "$src" "$dest"
        echo "  OK $dir"
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
fi

# ---- Create ~/.mcp.json from template if it doesn't exist ----
# Note: MCP config lives at ~/.mcp.json (home root), NOT inside ~/.claude/
MCP_FILE="$HOME/.mcp.json"
MCP_TEMPLATE="$REPO_DIR/team-sync/mcp.json.template"

if [ ! -f "$MCP_FILE" ]; then
    if [ -f "$MCP_TEMPLATE" ]; then
        cp "$MCP_TEMPLATE" "$MCP_FILE"
        echo "-> Created ~/.mcp.json from template"
        echo "   MCP keys are read from settings.json env vars automatically."
    fi
else
    echo "-> ~/.mcp.json already exists (keeping your config)"
fi

# ---- Create config directory with retention.json ----
if [ -d "$REPO_DIR/config" ]; then
    mkdir -p "$CLAUDE_DIR/config"
    cp -r "$REPO_DIR/config/"* "$CLAUDE_DIR/config/" 2>/dev/null || true
    echo "  OK config"
fi

echo ""
echo "=================================================="
echo "   Setup complete!                                 "
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Open $SETTINGS_FILE"
echo "     Replace all YOUR_*_HERE placeholders with your real API keys"
echo ""
echo "  2. Run 'claude' to verify everything works"
echo ""
