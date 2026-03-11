#!/usr/bin/env bash
# SessionEnd hook: prompt for lessons learned if significant work was done
# "Significant" = more than 3 files modified in the session

set -euo pipefail

LEARNED_FILE="$HOME/.claude/learned-patterns.md"

# Count files modified in the current git working tree
# Use the working directory from the session
MODIFIED_COUNT=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | wc -l || echo 0)

# Fallback: check uncommitted changes if no recent commit
if [ "$MODIFIED_COUNT" -eq 0 ]; then
  MODIFIED_COUNT=$(git diff --name-only 2>/dev/null | wc -l || echo 0)
fi

# Only trigger if significant work was done
if [ "$MODIFIED_COUNT" -le 3 ]; then
  exit 0
fi

# Initialize learned-patterns.md if it doesn't exist
if [ ! -f "$LEARNED_FILE" ]; then
  echo "# Learned Patterns" > "$LEARNED_FILE"
  echo "" >> "$LEARNED_FILE"
  echo "Lessons captured from development sessions." >> "$LEARNED_FILE"
  echo "" >> "$LEARNED_FILE"
fi

# Output reminder (shown to Claude in session context)
echo "SESSION_LEARN: $MODIFIED_COUNT files changed this session. Consider running /learn to capture any lessons."

exit 0
