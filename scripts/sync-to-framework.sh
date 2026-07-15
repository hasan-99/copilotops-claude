#!/bin/bash
# Sync ~/.claude/ framework files → ~/Projects/qualia-framework/framework/
# Run this after making changes to ~/.claude/ to prepare for distribution
# Usage: ~/.claude/scripts/sync-to-framework.sh

source "$HOME/.claude/hooks/qualia-colors.sh"

SRC="$HOME/.claude"
DEST="$HOME/Projects/qualia-framework/framework"

if [ ! -d "$DEST" ]; then
    printf "${Q_FAIL}  ✗ Framework repo not found at ~/Projects/qualia-framework${Q_RESET}\n"
    exit 1
fi

q_header "SYNC TO FRAMEWORK REPO"

# Sync framework components (these are the distributable parts)
COMPONENTS=(
    "skills"
    "agents"
    "hooks"
    "rules"
    "knowledge"
    "qualia-framework"
    "scripts"
)

for comp in "${COMPONENTS[@]}"; do
    if [ -d "$SRC/$comp" ]; then
        rsync -a --delete \
            --exclude="node_modules" \
            --exclude=".DS_Store" \
            --exclude="retros/" \
            --exclude="project-notes/" \
            --exclude="session-digest.md" \
            "$SRC/$comp/" "$DEST/$comp/"
        COUNT=$(find "$DEST/$comp" -type f | wc -l)
        q_pass "$comp ($COUNT files)"
    fi
done

# Sync individual files
cp "$SRC/CLAUDE.md" "$DEST/../templates/CLAUDE-owner.md" 2>/dev/null && q_pass "CLAUDE.md → templates/CLAUDE-owner.md"
cp "$SRC/statusline-command.sh" "$DEST/statusline-command.sh" 2>/dev/null && q_pass "statusline-command.sh"
cp "$SRC/askpass.sh" "$DEST/askpass.sh" 2>/dev/null && q_pass "askpass.sh"
cp "$SRC/install.sh" "$DEST/../install.sh" 2>/dev/null && q_pass "install.sh"
cp "$SRC/install.ps1" "$DEST/../install.ps1" 2>/dev/null && q_pass "install.ps1"

# Don't sync: secrets, session data, history, plugins, caches, personal memories
# Those stay local to each machine

# Show what changed in the repo
echo ""
cd "$HOME/Projects/qualia-framework"
CHANGED=$(git status --porcelain | wc -l)
if [ "$CHANGED" -gt 0 ]; then
    q_warn "$CHANGED files changed"
    git status --short | head -20
    echo ""
    printf "${Q_DIM}  Ready to commit. Run:${Q_RESET}\n"
    printf "${Q_TEAL}  cd ~/Projects/qualia-framework && git add -A && git commit -m 'chore: sync framework updates' && git push${Q_RESET}\n"
else
    q_pass "Already up to date"
fi
