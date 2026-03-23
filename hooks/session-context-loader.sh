#!/bin/bash
# SessionStart hook — loads full session context into Claude's awareness
# Reads MEMORY.md + last session state + current project state

SESSION_DIR="$HOME/.claude/session-env"
COMPACT_FILE="$SESSION_DIR/pre-compact.json"
LATEST_SESSION=$(ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | head -1)

# Find MEMORY.md (user-specific path)
MEMORY_FILE=""
for f in "$HOME/.claude/projects/-home-$(whoami)--claude/memory/MEMORY.md" \
         "$HOME/.claude/projects/-home-$(whoami)/memory/MEMORY.md"; do
    [ -f "$f" ] && MEMORY_FILE="$f" && break
done

json_val() {
    node -e "try{const d=JSON.parse(require('fs').readFileSync('$1','utf8'));const v=$2;if(v&&v!=='null')process.stdout.write(String(v))}catch(e){}" 2>/dev/null
}

# === Build the full context message ===
MSG=""

# 1. Last session info
if [ -f "$COMPACT_FILE" ]; then
    PROJECT=$(json_val "$COMPACT_FILE" "d.project_name")
    WORKDIR=$(json_val "$COMPACT_FILE" "d.working_directory")
    BRANCH=$(json_val "$COMPACT_FILE" "d.git_branch")
    PHASE=$(json_val "$COMPACT_FILE" "d.qualia_phase||d.gsd_phase")
    MILESTONE=$(json_val "$COMPACT_FILE" "d.qualia_milestone||d.gsd_milestone")
    Q_TASK=$(json_val "$COMPACT_FILE" "d.qualia_task||d.gsd_task")
    TIMESTAMP=$(json_val "$COMPACT_FILE" "d.timestamp")

    [ -n "$PROJECT" ] && [ "$PROJECT" != ".claude" ] && MSG="${MSG}Last session project: ${PROJECT}. "
    [ -n "$BRANCH" ] && MSG="${MSG}Branch: ${BRANCH}. "
    [ -n "$PHASE" ] && MSG="${MSG}Phase: ${PHASE}. "
    [ -n "$MILESTONE" ] && MSG="${MSG}Milestone: ${MILESTONE}. "
    [ -n "$Q_TASK" ] && MSG="${MSG}Last activity: ${Q_TASK}. "
    [ -n "$TIMESTAMP" ] && MSG="${MSG}Last active: ${TIMESTAMP}. "
fi

# 2. Current directory context
CWD=$(pwd)
CWD_PROJECT=$(basename "$CWD")
if [ -f "$CWD/.planning/STATE.md" ]; then
    CUR_PHASE=$(grep -m1 "^Phase:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Phase: *//')
    CUR_MILESTONE=$(grep -m1 "^## Milestone" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^## //')
    CUR_STATUS=$(grep -m1 "^Status:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Status: *//')
    MSG="${MSG}Current project: ${CWD_PROJECT}. "
    [ -n "$CUR_PHASE" ] && MSG="${MSG}Active phase: ${CUR_PHASE}. "
    [ -n "$CUR_MILESTONE" ] && MSG="${MSG}${CUR_MILESTONE}. "
    [ -n "$CUR_STATUS" ] && MSG="${MSG}Status: ${CUR_STATUS}. "
fi

# 3. Load MEMORY.md content (the actual intelligence)
MEMORY_CONTENT=""
if [ -n "$MEMORY_FILE" ] && [ -f "$MEMORY_FILE" ]; then
    MEMORY_CONTENT=$(cat "$MEMORY_FILE")
fi

# 4. Load learned patterns summary
LEARNED=""
LEARNED_FILE="$HOME/.claude/knowledge/learned-patterns.md"
if [ -f "$LEARNED_FILE" ]; then
    LEARNED=$(grep "^- " "$LEARNED_FILE" | head -10)
fi

# === Combine into system message ===
FULL_MSG="Welcome back. Here is your persistent context:\n\n"

if [ -n "$MSG" ]; then
    FULL_MSG="${FULL_MSG}SESSION: ${MSG}\n\n"
fi

if [ -n "$MEMORY_CONTENT" ]; then
    FULL_MSG="${FULL_MSG}MEMORY INDEX:\n${MEMORY_CONTENT}\n\n"
fi

if [ -n "$LEARNED" ]; then
    FULL_MSG="${FULL_MSG}KEY RULES:\n${LEARNED}\n"
fi

# Escape for JSON
ESCAPED=$(echo -e "$FULL_MSG" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)
# Remove outer quotes from python json.dumps
ESCAPED=${ESCAPED:1:-1}

cat << EOF
{
  "systemMessage": "${ESCAPED}"
}
EOF

exit 0
