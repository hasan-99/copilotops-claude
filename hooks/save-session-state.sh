#!/bin/bash
# SessionEnd hook — saves session state + updates rolling digest + auto-handoff
# Enhanced: cross-project session digest, auto .continue-here.md for significant work

SESSION_DIR="$HOME/.claude/session-env"
KNOWLEDGE_DIR="$HOME/.claude/knowledge"
DIGEST_FILE="$KNOWLEDGE_DIR/session-digest.md"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SESSION_FILE="$SESSION_DIR/session_$TIMESTAMP.json"

mkdir -p "$SESSION_DIR"
mkdir -p "$KNOWLEDGE_DIR"

CWD=$(pwd)
PROJECT_NAME=$(basename "$CWD")

# --- Git info ---
GIT_BRANCH=""
GIT_STATUS=""
FILES_CHANGED=0
LAST_COMMIT_MSG=""
if git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    GIT_STATUS=$(git status --porcelain 2>/dev/null | head -20 || echo "")
    # Count files changed (committed + uncommitted)
    COMMITTED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | wc -l || echo 0)
    UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l || echo 0)
    FILES_CHANGED=$((COMMITTED + UNCOMMITTED))
    LAST_COMMIT_MSG=$(git log --oneline -1 --format="%s" 2>/dev/null || echo "")
fi

# --- Summary line (from last commit or branch name) ---
SUMMARY=""
if [ -n "$LAST_COMMIT_MSG" ]; then
    SUMMARY="$LAST_COMMIT_MSG"
elif [ -n "$GIT_BRANCH" ]; then
    SUMMARY="Working on $GIT_BRANCH"
fi

# --- Save session JSON ---
cat > "$SESSION_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "working_directory": "$CWD",
  "project": "$PROJECT_NAME",
  "git": {
    "branch": "$GIT_BRANCH",
    "has_changes": $([ -n "$GIT_STATUS" ] && echo "true" || echo "false"),
    "files_changed": $FILES_CHANGED
  },
  "summary": "$(echo "$SUMMARY" | sed 's/"/\\"/g')",
  "ended_at": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

# --- Update rolling session digest (cross-project awareness) ---
if [ ! -f "$DIGEST_FILE" ]; then
    cat > "$DIGEST_FILE" << 'HEADER'
# Session Digest — Rolling Log
> Auto-updated by save-session-state.sh. Last 20 sessions across all projects.

HEADER
fi

# Prepend new entry (most recent first, after header)
# Skip noise: sessions in .claude, Projects root, or with 0 files and no summary
if [ "$PROJECT_NAME" != ".claude" ] && [ "$PROJECT_NAME" != "Projects" ] && { [ "$FILES_CHANGED" -gt 0 ] || [ -n "$SUMMARY" ]; }; then
    DATE_SHORT=$(date '+%m-%d %H:%M')
    ENTRY="| ${DATE_SHORT} | ${PROJECT_NAME} | ${GIT_BRANCH:-—} | ${FILES_CHANGED} | ${SUMMARY:-—} |"

    # Read existing entries (skip header — first 3 lines), keep last 19
    EXISTING=$(tail -n +4 "$DIGEST_FILE" | head -19)

    cat > "$DIGEST_FILE" << HEADER
# Session Digest — Rolling Log
> Auto-updated by save-session-state.sh. Last 20 sessions across all projects.

${ENTRY}
${EXISTING}
HEADER
fi

# --- Auto-handoff for significant sessions (>5 files changed) ---
if [ "$FILES_CHANGED" -gt 5 ] && [ "$PROJECT_NAME" != ".claude" ]; then
    HANDOFF_FILE="$CWD/.continue-here.md"
    # Only create if one doesn't already exist (don't overwrite manual handoffs)
    if [ ! -f "$HANDOFF_FILE" ]; then
        RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "none")
        UNCOMMITTED_FILES=$(git diff --name-only 2>/dev/null | head -10 || echo "none")
        STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | head -10 || echo "none")

        # Dead-ends: reverts, stashes, and abandoned branches from this session
        REVERTS=$(git log --oneline -20 2>/dev/null | grep -i "revert\|undo\|rollback" | head -5 || echo "none")
        STASHES=$(git stash list 2>/dev/null | head -5 || echo "none")

        cat > "$HANDOFF_FILE" << HANDOFF
# Auto-Handoff — $(date '+%Y-%m-%d %H:%M')

## What was done
Branch: ${GIT_BRANCH}
Files changed: ${FILES_CHANGED}

Recent commits:
\`\`\`
${RECENT_COMMITS}
\`\`\`

## Uncommitted work
\`\`\`
${UNCOMMITTED_FILES}
\`\`\`

## Staged (not committed)
\`\`\`
${STAGED_FILES}
\`\`\`

## Dead-ends (don't repeat these)
Reverted/undone work:
\`\`\`
${REVERTS}
\`\`\`

Stashed work (may be abandoned):
\`\`\`
${STASHES}
\`\`\`

## Next steps
Review the recent commits and continue from where this session left off.
Do NOT retry approaches listed in dead-ends above.
HANDOFF
    fi
fi

# --- Push to portal (non-blocking, fire-and-forget) ---
PORTAL_API_KEY="${CLAUDE_PORTAL_API_KEY:-}"
if [ -n "$PORTAL_API_KEY" ] && [ "$PROJECT_NAME" != ".claude" ]; then
    curl -s -X POST "https://portal.qualiasolutions.net/api/claude/session-log" \
        -H "X-API-Key: $PORTAL_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$SESSION_FILE" \
        --max-time 5 \
        > /dev/null 2>&1 &
fi

# --- Cleanup old session files (keep last 10) ---
ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | tail -n +11 | while IFS= read -r f; do
    rm -f "$f"
done

exit 0
