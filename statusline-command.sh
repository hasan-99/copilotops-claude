#!/bin/bash
# Claude Code statusline — shows project, branch, model info

# Git branch
BRANCH=$(git branch --show-current 2>/dev/null)

# Project name from directory
PROJECT=$(basename "$(pwd)")

# Compose statusline
PARTS=()
[ -n "$PROJECT" ] && PARTS+=("$PROJECT")
[ -n "$BRANCH" ] && PARTS+=("$BRANCH")

echo "${PARTS[*]}"
