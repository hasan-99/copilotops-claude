#!/bin/bash
# Session state persistence hook for Claude Code
# Saves session state for context continuity across sessions
# Cross-platform: uses portable file cleanup (no xargs -r)

SESSION_DIR="$HOME/.claude/session-env"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SESSION_FILE="$SESSION_DIR/session_$TIMESTAMP.json"

# Ensure session directory exists
mkdir -p "$SESSION_DIR"

# Get current working directory
CWD=$(pwd)

# Get git info if in a git repo
GIT_BRANCH=""
GIT_STATUS=""
if git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    GIT_STATUS=$(git status --porcelain 2>/dev/null | head -20 || echo "")
fi

# Create session state JSON
cat > "$SESSION_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "working_directory": "$CWD",
  "git": {
    "branch": "$GIT_BRANCH",
    "has_changes": $([ -n "$GIT_STATUS" ] && echo "true" || echo "false")
  },
  "notes": "Session ended at $(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

# Clean up old session files (keep last 10) — portable, no xargs -r
ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | tail -n +11 | while IFS= read -r f; do
    rm -f "$f"
done

echo "Session state saved to $SESSION_FILE"
exit 0
