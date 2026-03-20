#!/usr/bin/env bash
# ============================================================
# Qualia Solutions — Claude Code Config Update (Mac/Linux)
# Run this anytime to pull the latest shared config
# ============================================================

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"

# Detect if we're running from inside the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../CLAUDE.md" ] && [ -d "$SCRIPT_DIR/../skills" ]; then
    REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    REPO_DIR="$HOME/.claude-config-repo"
fi

echo ""
echo "=================================================="
echo "   Qualia Solutions - Config Update                "
echo "=================================================="
echo ""

# ---- Check repo exists ----
if [ ! -d "$REPO_DIR" ]; then
    echo "  X Config repo not found at $REPO_DIR"
    echo "  Run setup.sh first to do the initial install."
    exit 1
fi

# ---- Pull latest changes ----
echo "-> Pulling latest config..."
git -C "$REPO_DIR" pull origin main
echo "  OK Repo updated"
echo ""

# ---- Sync shared directories ----
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

# ---- Make hooks and scripts executable ----
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/hooks/"*.js 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.py 2>/dev/null || true

# ---- Update shared files ----
echo "-> Updating shared files..."
SHARED_FILES=(CLAUDE.md .clauderc .gitignore .claudeignore)

for file in "${SHARED_FILES[@]}"; do
    source="$REPO_DIR/$file"
    dest="$CLAUDE_DIR/$file"

    if [ -f "$source" ]; then
        if [ -f "$dest" ]; then
            src_hash=$(md5sum "$source" 2>/dev/null | cut -d' ' -f1 || md5 -q "$source" 2>/dev/null)
            dst_hash=$(md5sum "$dest" 2>/dev/null | cut -d' ' -f1 || md5 -q "$dest" 2>/dev/null)
            if [ "$src_hash" != "$dst_hash" ]; then
                cp "$source" "$dest"
                echo "  OK $file -> updated"
            else
                echo "  . $file -> already up to date"
            fi
        else
            cp "$source" "$dest"
            echo "  OK $file -> created"
        fi
    fi
done
echo ""

# ---- Check if settings template has new keys ----
echo "-> Checking for new settings..."
SETTINGS_TEMPLATE="$REPO_DIR/team-sync/settings.json.template"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

if [ -f "$SETTINGS_TEMPLATE" ] && [ -f "$SETTINGS_FILE" ]; then
    template_keys=$(grep -oE '"[A-Z_]+"' "$SETTINGS_TEMPLATE" 2>/dev/null | sort -u)
    current_keys=$(grep -oE '"[A-Z_]+"' "$SETTINGS_FILE" 2>/dev/null | sort -u)

    new_keys=$(comm -23 <(echo "$template_keys") <(echo "$current_keys") 2>/dev/null || true)
    if [ -n "$new_keys" ]; then
        echo "  !! New settings found in template that you may need to add:"
        echo "$new_keys" | while read -r key; do
            echo "    $key"
        done
        echo ""
        echo "  Compare your settings.json with the latest template:"
        echo "  diff $SETTINGS_FILE $SETTINGS_TEMPLATE"
    else
        echo "  . Settings keys are in sync"
    fi
else
    echo "  . Skipped (template or settings not found)"
fi

echo ""
echo "=================================================="
echo "   Config updated!                                 "
echo "=================================================="
echo ""
