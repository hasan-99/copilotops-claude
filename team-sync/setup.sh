#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Setup (Mac/Linux)
# Installs the full Qualia intelligence framework.
# Re-run anytime to sync latest updates.
# ============================================================

set -euo pipefail

REPO_URL="https://github.com/Qualiasolutions/qualia-claude.git"
CLAUDE_DIR="$HOME/.claude"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../CLAUDE.md" ] && [ -d "$SCRIPT_DIR/../skills" ]; then
    REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    REPO_DIR="$HOME/.claude-config-repo"
fi

echo ""
echo "=================================================="
echo "   Qualia Solutions — Claude Code Setup            "
echo "   Intelligence Framework v2.0                     "
echo "=================================================="
echo ""

# ---- Who are you? ----
echo "Who are you?"
echo ""
echo "  1) Fawzi Goussous   — Founder (admin)"
echo "  2) Moayad Alqam     — Developer (manager)"
echo "  3) Hasan            — Developer (employee)"
echo "  4) Someone else     — New team member"
echo ""
read -p "Enter number (1-4): " USER_CHOICE

case "$USER_CHOICE" in
    1)
        USER_NAME="Fawzi Goussous"
        USER_ROLE="owner"
        PORTAL_EMAIL="info@qualiasolutions.net"
        PORTAL_ROLE="admin"
        ;;
    2)
        USER_NAME="Moayad Alqam"
        USER_ROLE="employee"
        PORTAL_EMAIL="moayad@qualiasolutions.net"
        PORTAL_ROLE="manager"
        ;;
    3)
        USER_NAME="Hasan"
        USER_ROLE="employee"
        PORTAL_EMAIL="hasan@qualiasolutions.net"
        PORTAL_ROLE="employee"
        ;;
    4)
        read -p "Enter your full name: " USER_NAME
        read -p "Enter your Qualia email: " PORTAL_EMAIL
        USER_ROLE="employee"
        PORTAL_ROLE="employee"
        ;;
    *)
        echo "Invalid choice."
        exit 1
        ;;
esac

PORTAL_ROLE_UPPER=$(echo "$PORTAL_ROLE" | tr '[:lower:]' '[:upper:]')

echo ""
echo "-> Setting up for $USER_NAME"
echo "   Portal: $PORTAL_EMAIL ($PORTAL_ROLE)"
echo ""

# ---- Prerequisites ----
echo "-> Checking prerequisites..."
command -v git &>/dev/null && echo "  OK git" || { echo "  X git not found"; exit 1; }
command -v node &>/dev/null && echo "  OK node ($(node -v))" || echo "  WARN: node not found"
command -v claude &>/dev/null && echo "  OK claude" || echo "  WARN: claude not found — install: npm i -g @anthropic-ai/claude-code"
echo ""

# ---- Backup ----
if [ -d "$CLAUDE_DIR" ] && [ -f "$CLAUDE_DIR/settings.json" ]; then
    BACKUP="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
    echo "-> Backing up to $BACKUP..."
    cp -r "$CLAUDE_DIR" "$BACKUP"
    echo "  OK"
    echo ""
fi

# ---- Clone/update repo ----
if [ "$REPO_DIR" = "$HOME/.claude-config-repo" ]; then
    if [ -d "$REPO_DIR" ]; then
        git -C "$REPO_DIR" pull origin main 2>/dev/null || true
    else
        git clone "$REPO_URL" "$REPO_DIR"
    fi
    echo "-> Repo ready"
    echo ""
fi

# ---- Install framework ----
mkdir -p "$CLAUDE_DIR" "$CLAUDE_DIR/agent-memory"

echo "-> Installing intelligence framework..."
for dir in rules skills commands agents hooks get-shit-done knowledge scripts config; do
    src="$REPO_DIR/$dir"
    dest="$CLAUDE_DIR/$dir"
    if [ -d "$src" ]; then
        rm -rf "$dest"
        cp -r "$src" "$dest"
        echo "  OK $dir"
    fi
done
echo ""

# ---- Permissions ----
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/hooks/"*.js 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null || true

# ---- Role-based CLAUDE.md ----
echo "-> Installing $PORTAL_ROLE profile..."
ROLE_FILE="$REPO_DIR/team-sync/roles/$USER_ROLE.md"
if [ -f "$ROLE_FILE" ]; then
    sed -e "s/{{EMPLOYEE_NAME}}/$USER_NAME/g" \
        -e "s/{{PORTAL_EMAIL}}/$PORTAL_EMAIL/g" \
        -e "s/{{PORTAL_ROLE}}/$PORTAL_ROLE/g" \
        -e "s/{{PORTAL_ROLE_UPPER}}/$PORTAL_ROLE_UPPER/g" \
        "$ROLE_FILE" > "$CLAUDE_DIR/CLAUDE.md"
    echo "  OK CLAUDE.md ($USER_ROLE)"
else
    cp "$REPO_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo "  OK CLAUDE.md (default)"
fi
echo ""

# ---- MEMORY.md ----
MEMORY_DIR="$CLAUDE_DIR/projects/-home-$(whoami)--claude/memory"
mkdir -p "$MEMORY_DIR"
MEMORY_TEMPLATE="$REPO_DIR/team-sync/MEMORY.md.template"
if [ ! -f "$MEMORY_DIR/MEMORY.md" ] && [ -f "$MEMORY_TEMPLATE" ]; then
    cp "$MEMORY_TEMPLATE" "$MEMORY_DIR/MEMORY.md"
    echo "-> MEMORY.md installed"
else
    echo "-> MEMORY.md exists (keeping yours)"
fi

# ---- Settings.json ----
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$REPO_DIR/team-sync/settings.json.template" "$CLAUDE_DIR/settings.json" 2>/dev/null || true
    echo "-> settings.json created — FILL IN YOUR API KEYS"
else
    echo "-> settings.json exists (keeping yours)"
fi

# ---- MCP Servers ----
echo ""
echo "-> Configuring MCP servers..."
MCP_FILE="$CLAUDE_DIR/settings.local.json"

# Build MCP config based on what user needs
# These are the core MCP servers everyone should have
cat > /tmp/qualia-mcp-config.json << 'MCPEOF'
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
MCPEOF

echo "  OK context7 (documentation lookup)"
echo "  OK playwright (browser automation)"

# Supabase MCP — needs access token
echo ""
read -p "  Do you have a Supabase access token? (y/n): " HAS_SUPABASE
if [ "$HAS_SUPABASE" = "y" ] || [ "$HAS_SUPABASE" = "Y" ]; then
    read -p "  Enter SUPABASE_ACCESS_TOKEN: " SUPABASE_TOKEN
    python3 -c "
import json
with open('/tmp/qualia-mcp-config.json') as f:
    d = json.load(f)
d['mcpServers']['supabase'] = {
    'command': 'npx',
    'args': ['-y', '@anthropic/supabase-mcp-server'],
    'env': {'SUPABASE_ACCESS_TOKEN': '$SUPABASE_TOKEN'}
}
with open('/tmp/qualia-mcp-config.json', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null
    echo "  OK supabase MCP"
fi

# Firecrawl — needs API key
echo ""
read -p "  Do you have a Firecrawl API key? (y/n): " HAS_FIRECRAWL
if [ "$HAS_FIRECRAWL" = "y" ] || [ "$HAS_FIRECRAWL" = "Y" ]; then
    read -p "  Enter FIRECRAWL_API_KEY: " FIRECRAWL_KEY
    python3 -c "
import json
with open('/tmp/qualia-mcp-config.json') as f:
    d = json.load(f)
d.setdefault('env', {})['FIRECRAWL_API_KEY'] = '$FIRECRAWL_KEY'
with open('/tmp/qualia-mcp-config.json', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null
    echo "  OK firecrawl"
fi

# Merge MCP config into settings.local.json (won't overwrite settings.json)
if [ -f "$MCP_FILE" ]; then
    # Merge MCP servers into existing settings.local.json
    python3 -c "
import json
with open('$MCP_FILE') as f:
    existing = json.load(f)
with open('/tmp/qualia-mcp-config.json') as f:
    new_mcp = json.load(f)
existing.setdefault('mcpServers', {}).update(new_mcp.get('mcpServers', {}))
if 'env' in new_mcp:
    existing.setdefault('env', {}).update(new_mcp['env'])
with open('$MCP_FILE', 'w') as f:
    json.dump(existing, f, indent=2)
" 2>/dev/null
    echo "  OK merged into settings.local.json"
else
    cp /tmp/qualia-mcp-config.json "$MCP_FILE"
    echo "  OK created settings.local.json"
fi
rm -f /tmp/qualia-mcp-config.json
echo ""

# ---- Summary ----
SKILL_COUNT=$(ls "$CLAUDE_DIR/skills/" 2>/dev/null | wc -l)
AGENT_COUNT=$(ls "$CLAUDE_DIR/agents/" 2>/dev/null | wc -l)
HOOK_COUNT=$(find "$CLAUDE_DIR/hooks/" -name "*.sh" -o -name "*.js" 2>/dev/null | wc -l)
KNOWLEDGE_COUNT=$(find "$CLAUDE_DIR/knowledge/" -type f 2>/dev/null | wc -l)

echo "=================================================="
echo "   Setup complete: $USER_NAME ($PORTAL_ROLE)"
echo "=================================================="
echo ""
echo "Installed:"
echo "  $SKILL_COUNT skills · $AGENT_COUNT agents · $HOOK_COUNT hooks · $KNOWLEDGE_COUNT knowledge files"
echo "  Role: $PORTAL_ROLE (portal: $PORTAL_EMAIL)"
echo ""

if [ "$USER_ROLE" = "owner" ]; then
    echo "OWNER: Full authority. All commands available."
else
    echo "STAFF: Full tools — Claude guides you on when to check with Fawzi."
    echo ""
    echo "Start here:"
    echo "  1. Read: ~/Projects/live/qualia/docs/trainee-onboarding.md"
    echo "  2. Visit: https://portal.qualiasolutions.net/framework"
    echo "  3. Check portal for your tasks: https://portal.qualiasolutions.net"
fi
echo ""
echo "Commands:"
echo "  /qualia:quick — Fast task    /ship — Deploy    /review — Audit"
echo "  /debug — Fix bugs            /qualia:help — All commands"
echo ""
echo "Run 'claude' to start."
echo ""
