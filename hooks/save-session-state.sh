#!/bin/bash
# Session state persistence hook for Claude Code
# Saves session state for context continuity across sessions

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

# Get list of recently modified files (last 2 hours)
RECENT_FILES=$(find . -type f -mmin -120 \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -path "*/dist/*" \
    -not -path "*/__pycache__/*" \
    2>/dev/null | head -50 | jq -R -s 'split("\n") | map(select(length > 0))')

# Check for active todo list
TODO_FILE="$HOME/.claude/todos/current.json"
TODOS="[]"
if [ -f "$TODO_FILE" ]; then
    TODOS=$(cat "$TODO_FILE" 2>/dev/null || echo "[]")
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
  "recent_files": $RECENT_FILES,
  "todos": $TODOS,
  "notes": "Session ended at $(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

# Clean up old session files (keep last 10)
ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | tail -n +11 | xargs -r rm

echo "Session state saved to $SESSION_FILE"
exit 0
