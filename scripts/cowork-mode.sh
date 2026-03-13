#!/bin/bash
# Toggle between full Claude Code config and lean Cowork config
# Usage: cowork-mode.sh on|off|status

set -e

CLAUDE_DIR="$HOME/.claude"
CONFIG="$CLAUDE_DIR/settings.json"
SKILLS_DIR="$CLAUDE_DIR/skills"
ARCHIVE_DIR="$CLAUDE_DIR/skills-archive"
BACKUP="$CLAUDE_DIR/.settings-full.json"
LOCK="$CLAUDE_DIR/.cowork-mode"

# Skills to archive in Cowork (heavy/project-specific)
HEAVY_SKILLS=(
    sakani-conventions
    nestjs-backend
    mobile-expo
    financial-ledger
    i18n-rtl
    fcm-notifications
    subscription-payments
    voice-agent
    zoho-workflow
    skill-creator
    deep-research
    test-runner
    git-worktree
)

# Plugins to disable in Cowork (keep: typescript-lsp, firecrawl, playwright)
DISABLE_PLUGINS=(
    "code-review@claude-plugins-official"
    "skill-creator@claude-plugins-official"
    "claude-md-management@claude-plugins-official"
    "code-simplifier@claude-plugins-official"
    "cowork-plugin-management@knowledge-work-plugins"
    "supabase@claude-plugins-official"
)

# MCP servers to disable in Cowork (keep: supabase, firecrawl)
DISABLE_MCP=(
    "zohomcp"
    "sentry"
)

on() {
    if [ -f "$LOCK" ]; then
        echo "Already in Cowork mode. Run 'cowork-mode.sh off' first."
        exit 1
    fi

    echo "Switching to Cowork mode (lean config)..."

    # Backup full settings
    cp "$CONFIG" "$BACKUP"

    # Archive heavy skills
    mkdir -p "$ARCHIVE_DIR"
    local count=0
    for skill in "${HEAVY_SKILLS[@]}"; do
        if [ -d "$SKILLS_DIR/$skill" ]; then
            mv "$SKILLS_DIR/$skill" "$ARCHIVE_DIR/$skill"
            count=$((count + 1))
        fi
    done

    # Disable plugins and MCP servers
    node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));

// Disable plugins
const disablePlugins = process.argv.slice(3);
for (const p of disablePlugins) {
    if (config.enabledPlugins && config.enabledPlugins[p] !== undefined) {
        config.enabledPlugins[p] = false;
    }
}

// Filter MCP servers
const disableMcp = process.argv[2].split(',').filter(Boolean);
if (config.enabledMcpjsonServers) {
    config.enabledMcpjsonServers = config.enabledMcpjsonServers.filter(s => !disableMcp.includes(s));
}

fs.writeFileSync(process.argv[1], JSON.stringify(config, null, 2));
" "$CONFIG" "$(IFS=,; echo "${DISABLE_MCP[*]}")" "${DISABLE_PLUGINS[@]}"

    # Mark as active
    date > "$LOCK"

    echo "Done. Archived $count skills, disabled ${#DISABLE_PLUGINS[@]} plugins, ${#DISABLE_MCP[@]} MCP servers."
    echo ""
    echo "Now restart Claude desktop app to pick up changes."
    echo "Run 'cowork off' when done to restore full config."
}

off() {
    if [ ! -f "$LOCK" ]; then
        echo "Not in Cowork mode. Nothing to restore."
        exit 1
    fi

    echo "Restoring full Claude Code config..."

    # Restore skills from archive
    if [ -d "$ARCHIVE_DIR" ]; then
        for skill in "$ARCHIVE_DIR"/*/; do
            [ -d "$skill" ] || continue
            name=$(basename "$skill")
            mv "$skill" "$SKILLS_DIR/$name"
        done
        rmdir "$ARCHIVE_DIR" 2>/dev/null || true
    fi

    # Restore full settings
    if [ -f "$BACKUP" ]; then
        mv "$BACKUP" "$CONFIG"
    fi

    rm "$LOCK"
    echo "Done. Full config restored."
    echo "Restart Claude desktop app to pick up changes."
}

status() {
    if [ -f "$LOCK" ]; then
        echo "Cowork mode: ON (since $(cat "$LOCK"))"
        [ -d "$ARCHIVE_DIR" ] && echo "Archived skills: $(ls "$ARCHIVE_DIR" 2>/dev/null | wc -l)"
    else
        echo "Cowork mode: OFF (full config active)"
    fi
}

case "${1:-status}" in
    on)  on ;;
    off) off ;;
    status) status ;;
    *)   echo "Usage: cowork-mode.sh [on|off|status]" ;;
esac
