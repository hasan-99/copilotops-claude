#!/bin/bash
# Context Budget Monitor — SessionStart hook
# Loads the most recent context snapshot if one exists
# Helps Claude Code remember where it left off after /compact or new session

CYAN='\033[0;36m'
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")
STATE_DIR="$HOME/.claude/context-states"

# Find most recent snapshot for this project
LATEST=$(ls -t "$STATE_DIR/${PROJECT_NAME}-"*.md 2>/dev/null | head -1)

if [ -n "$LATEST" ] && [ -f "$LATEST" ]; then
    SNAPSHOT_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST" 2>/dev/null)) / 60 ))

    if [ "$SNAPSHOT_AGE" -lt 120 ]; then
        printf "${CYAN}[Context Manager] Found recent context snapshot (${SNAPSHOT_AGE}m ago)${NC}\n"
        printf "${DIM}  Snapshot: $(basename "$LATEST")${NC}\n"

        # Output the snapshot content so Claude Code can read it
        printf "${GREEN}--- Context Snapshot ---${NC}\n"
        cat "$LATEST"
        printf "${GREEN}--- End Snapshot ---${NC}\n"
    else
        printf "${DIM}[Context Manager] Last snapshot is ${SNAPSHOT_AGE}m old — stale, skipping${NC}\n"
    fi
else
    printf "${DIM}[Context Manager] No previous context snapshot for $PROJECT_NAME${NC}\n"
fi

exit 0
