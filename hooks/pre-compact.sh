#!/bin/bash
# Pre-compaction hook — saves context before Claude auto-compacts
# Preserves: changed files, current task, git state, Qualia phase/milestone, project name

COMPACT_DIR="$HOME/.claude/session-env"
COMPACT_FILE="$COMPACT_DIR/pre-compact.json"

mkdir -p "$COMPACT_DIR"

CWD=$(pwd)
PROJECT_NAME=$(basename "$CWD")

GIT_BRANCH=""
GIT_DIFF_FILES=""
if git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    GIT_DIFF_FILES=$(git diff --name-only HEAD 2>/dev/null | head -30 | jq -R -s 'split("\n") | map(select(length > 0))')
fi

[ -z "$GIT_DIFF_FILES" ] && GIT_DIFF_FILES="[]"

# Parse Qualia state from .planning/STATE.md if it exists
QUALIA_PHASE=""
QUALIA_MILESTONE=""
QUALIA_TASK=""
QUALIA_STATUS=""
STATE_FILE="$CWD/.planning/STATE.md"
if [ -f "$STATE_FILE" ]; then
    QUALIA_PHASE=$(grep -m1 "^Phase:" "$STATE_FILE" 2>/dev/null | sed 's/^Phase: *//' || echo "")
    QUALIA_MILESTONE=$(grep -m1 "^## Milestone" "$STATE_FILE" 2>/dev/null | sed 's/^## //' || echo "")
    QUALIA_STATUS=$(grep -m1 "^Status:" "$STATE_FILE" 2>/dev/null | sed 's/^Status: *//' || echo "")
    QUALIA_TASK=$(grep -m1 "^Last activity:" "$STATE_FILE" 2>/dev/null | sed 's/^Last activity: *//' || echo "")
fi

cat > "$COMPACT_FILE" << EOF
{
  "timestamp": "$(date '+%Y-%m-%d %H:%M:%S')",
  "working_directory": "$CWD",
  "project_name": "$PROJECT_NAME",
  "git_branch": "$GIT_BRANCH",
  "changed_files": $GIT_DIFF_FILES,
  "qualia_phase": "$QUALIA_PHASE",
  "qualia_milestone": "$QUALIA_MILESTONE",
  "qualia_status": "$QUALIA_STATUS",
  "qualia_task": "$QUALIA_TASK"
}
EOF

exit 0
