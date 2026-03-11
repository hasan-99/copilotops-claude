#!/bin/bash
# SessionStart hook — reads saved session context and outputs a structured summary
# Closes the loop: save-session-state.sh writes, this script reads back on next session start
# Cross-platform: uses node instead of jq for JSON parsing

SESSION_DIR="$HOME/.claude/session-env"

# Find the latest session state file
LATEST_SESSION=$(ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | head -1)
COMPACT_FILE="$SESSION_DIR/pre-compact.json"

# Exit silently if no saved context exists
if [ ! -f "$LATEST_SESSION" ] && [ ! -f "$COMPACT_FILE" ]; then
    exit 0
fi

# Helper: portable JSON field reader using node (replaces jq)
json_val() {
    local file="$1" field="$2"
    node -e "try{const d=JSON.parse(require('fs').readFileSync('$file','utf8'));const v=$field;if(v&&v!=='null')process.stdout.write(String(v))}catch(e){}" 2>/dev/null
}

echo "--- Previous Session Context ---"

# Read pre-compact data (most recent compaction snapshot)
if [ -f "$COMPACT_FILE" ]; then
    TIMESTAMP=$(json_val "$COMPACT_FILE" "d.timestamp")
    PROJECT=$(json_val "$COMPACT_FILE" "d.project_name")
    WORKDIR=$(json_val "$COMPACT_FILE" "d.working_directory")
    BRANCH=$(json_val "$COMPACT_FILE" "d.git_branch")
    PHASE=$(json_val "$COMPACT_FILE" "d.qualia_phase||d.gsd_phase")
    MILESTONE=$(json_val "$COMPACT_FILE" "d.qualia_milestone||d.gsd_milestone")
    Q_STATUS=$(json_val "$COMPACT_FILE" "d.qualia_status||d.gsd_status")
    Q_TASK=$(json_val "$COMPACT_FILE" "d.qualia_task||d.gsd_task")
    CHANGED=$(json_val "$COMPACT_FILE" "(d.changed_files||[]).length")

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
    SESSION_TS=$(json_val "$LATEST_SESSION" "d.timestamp")
    SESSION_PROJECT=$(json_val "$LATEST_SESSION" "d.project")
    SESSION_BRANCH=$(json_val "$LATEST_SESSION" "d.branch")

    # Only show if different from compact data (adds new info)
    if [ -n "$SESSION_TS" ]; then
        echo "Last session ended: $SESSION_TS"
    fi
fi

echo "--- End Previous Context ---"

exit 0
