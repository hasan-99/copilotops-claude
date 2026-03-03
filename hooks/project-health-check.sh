#!/bin/bash
# Project health check — runs on session start
# Quick git status check only (no network calls)

CWD=$(pwd)

# Only run inside a project (has package.json)
if [ ! -f "$CWD/package.json" ]; then
    exit 0
fi

YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

PROJECT=$(basename "$CWD")
ISSUES=0

# Check for uncommitted changes
if git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DIRTY" -gt 10 ]; then
        printf "${YELLOW}[%s] %d uncommitted changes — consider committing or stashing${NC}\n" "$PROJECT" "$DIRTY"
        ISSUES=$((ISSUES + 1))
    fi
fi

if [ "$ISSUES" -eq 0 ]; then
    printf "${DIM}[%s] Health check passed${NC}\n" "$PROJECT"
fi

exit 0
