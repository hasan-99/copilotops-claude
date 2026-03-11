#!/bin/bash
# SessionStart hook — reads saved session context and outputs a structured summary
# Closes the loop: save-session-state.sh writes, this script reads back on next session start

SESSION_DIR="$HOME/.claude/session-env"

# Find the latest session state file
LATEST_SESSION=$(ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | head -1)
COMPACT_FILE="$SESSION_DIR/pre-compact.json"

# Exit silently if no saved context exists
if [ ! -f "$LATEST_SESSION" ] && [ ! -f "$COMPACT_FILE" ]; then
    exit 0
fi

echo "--- Previous Session Context ---"

# Read pre-compact data (most recent compaction snapshot)
if [ -f "$COMPACT_FILE" ]; then
    TIMESTAMP=$(jq -r '.timestamp // empty' "$COMPACT_FILE" 2>/dev/null)
    PROJECT=$(jq -r '.project_name // empty' "$COMPACT_FILE" 2>/dev/null)
    WORKDIR=$(jq -r '.working_directory // empty' "$COMPACT_FILE" 2>/dev/null)
    BRANCH=$(jq -r '.git_branch // empty' "$COMPACT_FILE" 2>/dev/null)
    PHASE=$(jq -r '.qualia_phase // .gsd_phase // empty' "$COMPACT_FILE" 2>/dev/null)
    MILESTONE=$(jq -r '.qualia_milestone // .gsd_milestone // empty' "$COMPACT_FILE" 2>/dev/null)
    Q_STATUS=$(jq -r '.qualia_status // .gsd_status // empty' "$COMPACT_FILE" 2>/dev/null)
    Q_TASK=$(jq -r '.qualia_task // .gsd_task // empty' "$COMPACT_FILE" 2>/dev/null)
    CHANGED=$(jq -r '.changed_files | length' "$COMPACT_FILE" 2>/dev/null)

    [ -n "$TIMESTAMP" ] && echo "Last compaction: $TIMESTAMP"
    [ -n "$PROJECT" ] && echo "Project: $PROJECT"
    [ -n "$WORKDIR" ] && echo "Directory: $WORKDIR"
    [ -n "$BRANCH" ] && echo "Branch: $BRANCH"
    [ -n "$PHASE" ] && echo "Qualia Phase: $PHASE"
    [ -n "$MILESTONE" ] && echo "Qualia Milestone: $MILESTONE"
    [ -n "$Q_STATUS" ] && echo "Qualia Status: $Q_STATUS"
    [ -n "$Q_TASK" ] && echo "Last activity: $Q_TASK"
    [ "$CHANGED" != "0" ] && [ -n "$CHANGED" ] && echo "Uncommitted files: $CHANGED"
fi

# Read latest session state (from SessionEnd hook)
if [ -f "$LATEST_SESSION" ]; then
    SESSION_TS=$(jq -r '.timestamp // empty' "$LATEST_SESSION" 2>/dev/null)
    SESSION_PROJECT=$(jq -r '.project // empty' "$LATEST_SESSION" 2>/dev/null)
    SESSION_BRANCH=$(jq -r '.branch // empty' "$LATEST_SESSION" 2>/dev/null)

    # Only show if different from compact data (adds new info)
    if [ -n "$SESSION_TS" ]; then
        echo "Last session ended: $SESSION_TS"
    fi
fi

echo "--- End Previous Context ---"

exit 0
