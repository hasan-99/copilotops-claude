#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Config Setup (Mac/Linux)
# Run once to install the shared team config
# ============================================================

set -euo pipefail

REPO_URL="https://github.com/Qualiasolutions/qualia-claude.git"
REPO_DIR="$HOME/.claude-config-repo"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo "=================================================="
echo "   Qualia Solutions - Claude Code Team Setup       "
echo "=================================================="
echo ""

# ---- Check prerequisites ----
echo "-> Checking prerequisites..."

if ! command -v git &>/dev/null; then
    echo "  X Git is not installed. Install with your package manager (e.g. pacman -S git)"
    exit 1
fi
echo "  OK git"

if ! command -v claude &>/dev/null; then
    echo "  X Claude Code CLI not found. Install from https://docs.claude.com"
    exit 1
fi
echo "  OK claude"
echo ""

# ---- Backup existing config ----
if [ -d "$CLAUDE_DIR" ]; then
    BACKUP="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
    echo "-> Backing up existing config to $BACKUP..."
    cp -r "$CLAUDE_DIR" "$BACKUP"
    echo "  OK Backup created"
    echo ""
fi

# ---- Clone repo ----
if [ -d "$REPO_DIR" ]; then
    echo "-> Updating existing repo..."
    git -C "$REPO_DIR" pull origin main
else
    echo "-> Cloning shared config..."
    git clone "$REPO_URL" "$REPO_DIR"
fi
echo "  OK Repo ready"
echo ""

# ---- Create .claude directory if needed ----
mkdir -p "$CLAUDE_DIR"

# ---- Copy shared directories ----
echo "-> Syncing shared directories..."
SHARED_DIRS=(rules skills commands agents hooks get-shit-done knowledge scripts)

for dir in "${SHARED_DIRS[@]}"; do
    source="$REPO_DIR/$dir"
    dest="$CLAUDE_DIR/$dir"

    if [ -d "$source" ]; then
        rm -rf "$dest"
        cp -r "$source" "$dest"
        echo "  OK $dir"
    fi
done
echo ""

# ---- Make hooks executable ----
echo "-> Setting hook permissions..."
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/hooks/"*.js 2>/dev/null || true
echo "  OK hooks are executable"
echo ""

# ---- Copy shared files ----
echo "-> Syncing shared files..."
SHARED_FILES=(CLAUDE.md .clauderc .gitignore)

for file in "${SHARED_FILES[@]}"; do
    source="$REPO_DIR/$file"
    dest="$CLAUDE_DIR/$file"

    if [ -f "$source" ]; then
        cp "$source" "$dest"
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

# ---- Create .mcp.json from template if it doesn't exist ----
MCP_FILE="$CLAUDE_DIR/.mcp.json"
MCP_TEMPLATE="$REPO_DIR/team-sync/mcp.json.template"

if [ ! -f "$MCP_FILE" ]; then
    if [ -f "$MCP_TEMPLATE" ]; then
        cp "$MCP_TEMPLATE" "$MCP_FILE"
        echo "-> Created .mcp.json from template"
        echo "   IMPORTANT: Open $MCP_FILE and fill in your server URLs!"
    fi
else
    echo "-> .mcp.json already exists (keeping your config)"
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
echo "  2. Open $MCP_FILE"
echo "     Fill in your MCP server URLs"
echo ""
echo "  3. Run 'claude' to verify everything works"
echo ""
