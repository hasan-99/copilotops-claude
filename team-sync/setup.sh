#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Config Setup (Mac/Linux)
# Installs the full Qualia intelligence framework.
# Re-run anytime to sync latest updates from the team repo.
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
echo "   Qualia Solutions — Claude Code Setup            "
echo "   Full Intelligence Framework v2.0                "
echo "=================================================="
echo ""

# ---- Who are you? ----
echo "Who are you?"
echo ""
echo "  1) Fawzi   (founder)"
echo "  2) Moayad  (developer)"
echo "  3) Hasan   (developer)"
echo ""
read -p "Enter number (1-3): " USER_CHOICE

case "$USER_CHOICE" in
    1)
        USER_NAME="Fawzi"
        USER_ROLE="owner"
        ;;
    2)
        USER_NAME="Moayad"
        USER_ROLE="employee"
        ;;
    3)
        USER_NAME="Hasan"
        USER_ROLE="employee"
        ;;
    *)
        echo "Invalid choice. Defaulting to employee."
        read -p "Enter your name: " USER_NAME
        USER_ROLE="employee"
        ;;
esac

echo ""
echo "-> Setting up for $USER_NAME ($USER_ROLE)"
echo ""

# ---- Check prerequisites ----
echo "-> Checking prerequisites..."

if ! command -v git &>/dev/null; then
    echo "  X Git is not installed."
    exit 1
fi
echo "  OK git"

if ! command -v claude &>/dev/null; then
    echo "  WARN: Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code"
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

# ---- Clone or update repo ----
if [ "$REPO_DIR" = "$HOME/.claude-config-repo" ]; then
    if [ -d "$REPO_DIR" ]; then
        echo "-> Updating repo..."
        git -C "$REPO_DIR" pull origin main 2>/dev/null || true
    else
        echo "-> Cloning shared config..."
        git clone "$REPO_URL" "$REPO_DIR"
    fi
    echo "  OK Repo ready"
    echo ""
fi

# ---- Create directory structure ----
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/agent-memory"

# ---- Copy shared directories (FULL intelligence — same for everyone) ----
echo "-> Installing Qualia intelligence framework..."
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

# ---- Set executable permissions ----
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/hooks/"*.js 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.py 2>/dev/null || true

# ---- Install role-based CLAUDE.md ----
echo "-> Setting up $USER_ROLE profile for $USER_NAME..."

ROLE_FILE="$REPO_DIR/team-sync/roles/$USER_ROLE.md"
if [ -f "$ROLE_FILE" ]; then
    # Replace {{EMPLOYEE_NAME}} placeholder with actual name
    sed "s/{{EMPLOYEE_NAME}}/$USER_NAME/g" "$ROLE_FILE" > "$CLAUDE_DIR/CLAUDE.md"
    echo "  OK CLAUDE.md installed ($USER_ROLE profile)"
else
    # Fallback to default CLAUDE.md
    cp "$REPO_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo "  OK CLAUDE.md installed (default)"
fi
echo ""

# ---- Setup MEMORY.md ----
echo "-> Setting up memory system..."
MEMORY_TEMPLATE="$REPO_DIR/team-sync/MEMORY.md.template"
MEMORY_DIR="$CLAUDE_DIR/projects/-home-$(whoami)--claude/memory"
mkdir -p "$MEMORY_DIR"

if [ ! -f "$MEMORY_DIR/MEMORY.md" ] && [ -f "$MEMORY_TEMPLATE" ]; then
    cp "$MEMORY_TEMPLATE" "$MEMORY_DIR/MEMORY.md"
    echo "  OK MEMORY.md installed (auto-loaded every session)"
elif [ -f "$MEMORY_DIR/MEMORY.md" ]; then
    echo "  OK MEMORY.md already exists (keeping yours)"
fi
echo ""

# ---- Settings.json ----
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
SETTINGS_TEMPLATE="$REPO_DIR/team-sync/settings.json.template"

if [ ! -f "$SETTINGS_FILE" ]; then
    if [ -f "$SETTINGS_TEMPLATE" ]; then
        cp "$SETTINGS_TEMPLATE" "$SETTINGS_FILE"
        echo "-> Created settings.json from template"
        echo "   IMPORTANT: Fill in your API keys in $SETTINGS_FILE"
    fi
else
    echo "-> settings.json already exists (keeping your keys)"
fi

# ---- MCP config ----
MCP_FILE="$HOME/.mcp.json"
MCP_TEMPLATE="$REPO_DIR/team-sync/mcp.json.template"

if [ ! -f "$MCP_FILE" ]; then
    if [ -f "$MCP_TEMPLATE" ]; then
        cp "$MCP_TEMPLATE" "$MCP_FILE"
        echo "-> Created ~/.mcp.json from template"
    fi
else
    echo "-> ~/.mcp.json already exists (keeping yours)"
fi
echo ""

# ---- Summary ----
SKILL_COUNT=$(ls "$CLAUDE_DIR/skills/" 2>/dev/null | wc -l)
AGENT_COUNT=$(ls "$CLAUDE_DIR/agents/" 2>/dev/null | wc -l)
HOOK_COUNT=$(ls "$CLAUDE_DIR/hooks/" 2>/dev/null | wc -l)
KNOWLEDGE_COUNT=$(find "$CLAUDE_DIR/knowledge/" -type f 2>/dev/null | wc -l)
WORKFLOW_COUNT=$(ls "$CLAUDE_DIR/get-shit-done/workflows/" 2>/dev/null | wc -l)

echo "=================================================="
echo "   Setup complete for $USER_NAME ($USER_ROLE)      "
echo "=================================================="
echo ""
echo "Installed:"
echo "  $SKILL_COUNT skills          (auto-invoked capabilities)"
echo "  $AGENT_COUNT agents          (specialized AI subagents)"
echo "  $HOOK_COUNT hooks           (automated enforcement)"
echo "  $KNOWLEDGE_COUNT knowledge files  (project intelligence)"
echo "  $WORKFLOW_COUNT GSD workflows    (project lifecycle)"
echo "  MEMORY.md         (auto-loaded routing index)"
echo ""

if [ "$USER_ROLE" = "owner" ]; then
    echo "As OWNER, you have full authority over all projects."
    echo ""
    echo "Key commands:"
    echo "  /qualia:quick     — Fast task execution"
    echo "  /ship             — Deploy to production"
    echo "  /review           — Code review"
    echo "  /team             — Orchestrate agent teams"
    echo "  /qualia:help      — All commands"
    echo ""
else
    echo "As EMPLOYEE, you have the same tools as Fawzi."
    echo "Claude will guide you on when to check with him"
    echo "(deployments, architecture, client-facing changes)."
    echo ""
    echo "Key commands:"
    echo "  /qualia:quick     — Do a task fast (most used)"
    echo "  /ship             — Deploy (check with Fawzi first)"
    echo "  /review           — Code review before shipping"
    echo "  /debug            — Fix something broken"
    echo "  /qualia:help      — See all commands"
    echo ""
    echo "Start here:"
    echo "  1. Read: ~/Projects/live/qualia/docs/trainee-onboarding.md"
    echo "  2. Visit: https://portal.qualiasolutions.net/framework"
    echo "  3. Check portal for your assigned tasks"
    echo ""
fi

echo "Run 'claude' to start working."
echo ""
