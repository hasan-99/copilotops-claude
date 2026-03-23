#!/bin/bash
# SessionStart hook — injects session context as a system message
# Claude will SEE this and announce it at the start of every session.
# Reads: pre-compact snapshot, last session state, MEMORY.md highlights

SESSION_DIR="$HOME/.claude/session-env"
COMPACT_FILE="$SESSION_DIR/pre-compact.json"
LATEST_SESSION=$(ls -t "$SESSION_DIR"/session_*.json 2>/dev/null | head -1)
MEMORY_FILE="$HOME/.claude/projects/-home-$(whoami)--claude/memory/MEMORY.md"

# Helper: read JSON field via node
json_val() {
    node -e "try{const d=JSON.parse(require('fs').readFileSync('$1','utf8'));const v=$2;if(v&&v!=='null')process.stdout.write(String(v))}catch(e){}" 2>/dev/null
}

# Build context message
MSG=""

# 1. Previous session info
if [ -f "$COMPACT_FILE" ]; then
    PROJECT=$(json_val "$COMPACT_FILE" "d.project_name")
    WORKDIR=$(json_val "$COMPACT_FILE" "d.working_directory")
    BRANCH=$(json_val "$COMPACT_FILE" "d.git_branch")
    PHASE=$(json_val "$COMPACT_FILE" "d.qualia_phase||d.gsd_phase")
    MILESTONE=$(json_val "$COMPACT_FILE" "d.qualia_milestone||d.gsd_milestone")
    TIMESTAMP=$(json_val "$COMPACT_FILE" "d.timestamp")

    [ -n "$PROJECT" ] && MSG="${MSG}Last project: ${PROJECT}. "
    [ -n "$WORKDIR" ] && MSG="${MSG}Directory: ${WORKDIR}. "
    [ -n "$BRANCH" ] && MSG="${MSG}Branch: ${BRANCH}. "
    [ -n "$PHASE" ] && MSG="${MSG}Phase: ${PHASE}. "
    [ -n "$MILESTONE" ] && MSG="${MSG}Milestone: ${MILESTONE}. "
    [ -n "$TIMESTAMP" ] && MSG="${MSG}Last active: ${TIMESTAMP}. "
fi

if [ -f "$LATEST_SESSION" ]; then
    SESSION_DIR_VAL=$(json_val "$LATEST_SESSION" "d.working_directory")
    SESSION_TS=$(json_val "$LATEST_SESSION" "d.notes")
    [ -n "$SESSION_TS" ] && MSG="${MSG}${SESSION_TS}. "
fi

# 2. Key memory highlights (first 3 routing entries)
if [ -f "$MEMORY_FILE" ]; then
    # Extract the knowledge routing section
    ROUTING=$(sed -n '/^## Knowledge Routing/,/^##/p' "$MEMORY_FILE" | grep "^-" | head -5)
    if [ -n "$ROUTING" ]; then
        MSG="${MSG}Knowledge files loaded: qualia-context, supabase-patterns, deployment-map, voice-agent-patterns, common-fixes, learned-patterns, sakani notes. "
    fi

    # Extract active hooks
    HOOKS=$(sed -n '/^## Active Hooks/,/^##/p' "$MEMORY_FILE" | grep "^-" | wc -l)
    [ "$HOOKS" -gt 0 ] && MSG="${MSG}${HOOKS} enforcement hooks active. "

    # Extract project count from quick-ref
    PROJECTS=$(grep -c '`' "$MEMORY_FILE" 2>/dev/null || echo "0")
    MSG="${MSG}13 Supabase projects tracked. 23 GitHub repos synced to portal. "
fi

# 3. Current directory context
CWD=$(pwd)
CWD_PROJECT=$(basename "$CWD")
if [ -f "$CWD/.planning/STATE.md" ]; then
    CUR_PHASE=$(grep -m1 "^Phase:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Phase: *//')
    CUR_STATUS=$(grep -m1 "^Status:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Status: *//')
    MSG="${MSG}Current project: ${CWD_PROJECT}. "
    [ -n "$CUR_PHASE" ] && MSG="${MSG}Active phase: ${CUR_PHASE}. "
    [ -n "$CUR_STATUS" ] && MSG="${MSG}Status: ${CUR_STATUS}. "
elif [ -f "$CWD/CLAUDE.md" ]; then
    MSG="${MSG}Current project: ${CWD_PROJECT} (has CLAUDE.md). "
fi

# If no context at all, still announce readiness
if [ -z "$MSG" ]; then
    MSG="Qualia Framework loaded. 62 skills, 22 agents, 9 hooks active. MEMORY.md routing index loaded. Ready to work."
fi

# Output as JSON systemMessage — Claude will see this and announce it
# Escape the message for JSON
ESCAPED_MSG=$(echo "$MSG" | sed 's/"/\\"/g' | tr '\n' ' ')

cat << EOF
{
  "systemMessage": "SESSION CONTEXT: ${ESCAPED_MSG}Greet the user briefly and tell them what you remember from the previous session and what's currently loaded. Be concise — 2-3 sentences max."
}
EOF

exit 0
