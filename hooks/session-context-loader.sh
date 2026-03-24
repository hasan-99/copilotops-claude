#!/bin/bash
# SessionStart hook — cross-project awareness + stale knowledge warnings
# Reads: pre-compact state, session digest, knowledge staleness, project pulse

SESSION_DIR="$HOME/.claude/session-env"
COMPACT_FILE="$SESSION_DIR/pre-compact.json"
KNOWLEDGE_DIR="$HOME/.claude/knowledge"
DIGEST_FILE="$KNOWLEDGE_DIR/session-digest.md"

json_val() {
    node -e "try{const d=JSON.parse(require('fs').readFileSync('$1','utf8'));const v=$2;if(v&&v!=='null')process.stdout.write(String(v))}catch(e){}" 2>/dev/null
}

MSG=""

# --- 1. Last session state (from pre-compact snapshot) ---
if [ -f "$COMPACT_FILE" ]; then
    TIMESTAMP=$(json_val "$COMPACT_FILE" "d.timestamp")
    PROJECT=$(json_val "$COMPACT_FILE" "d.project_name")
    BRANCH=$(json_val "$COMPACT_FILE" "d.git_branch")
    PHASE=$(json_val "$COMPACT_FILE" "d.qualia_phase||d.gsd_phase")
    Q_TASK=$(json_val "$COMPACT_FILE" "d.qualia_task||d.gsd_task")

    [ -n "$TIMESTAMP" ] && MSG="Last active: ${TIMESTAMP}."
    [ -n "$PROJECT" ] && [ "$PROJECT" != ".claude" ] && MSG="${MSG} Project: ${PROJECT}."
    [ -n "$BRANCH" ] && MSG="${MSG} Branch: ${BRANCH}."
    [ -n "$PHASE" ] && MSG="${MSG} Phase: ${PHASE}."
    [ -n "$Q_TASK" ] && MSG="${MSG} Task: ${Q_TASK}."
fi

# --- 2. Current directory project state ---
CWD=$(pwd)
if [ -f "$CWD/.planning/STATE.md" ]; then
    CUR_PHASE=$(grep -m1 "^Phase:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Phase: *//')
    CUR_STATUS=$(grep -m1 "^Status:" "$CWD/.planning/STATE.md" 2>/dev/null | sed 's/^Status: *//')
    [ -n "$CUR_PHASE" ] && MSG="${MSG} Active: ${CUR_PHASE}."
    [ -n "$CUR_STATUS" ] && MSG="${MSG} Status: ${CUR_STATUS}."
fi

# --- 3. Recent session digest (cross-project awareness) ---
if [ -f "$DIGEST_FILE" ]; then
    # Show last 5 sessions from digest (skip header lines)
    RECENT=$(tail -n +4 "$DIGEST_FILE" | head -5)
    if [ -n "$RECENT" ]; then
        MSG="${MSG}
Recent sessions across projects:
${RECENT}"
    fi
fi

# --- 4. Stale knowledge detection ---
STALE=""
NOW_EPOCH=$(date +%s)
STALE_DAYS=30

for f in "$KNOWLEDGE_DIR"/*.md; do
    [ -f "$f" ] || continue
    BASENAME=$(basename "$f")
    # Skip session-digest.md (auto-updated) and email-signature.html
    [ "$BASENAME" = "session-digest.md" ] && continue
    FILE_EPOCH=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)
    AGE=$(( (NOW_EPOCH - FILE_EPOCH) / 86400 ))
    if [ "$AGE" -gt "$STALE_DAYS" ]; then
        STALE="${STALE} ${BASENAME}(${AGE}d)"
    fi
done

if [ -n "$STALE" ]; then
    MSG="${MSG}
STALE knowledge (>30d):${STALE} — consider updating."
fi

# --- 5. Project pulse (recent git activity across known projects) ---
PULSE=""
PROJECTS_FILE="$KNOWLEDGE_DIR/qualia-context.md"
if [ -f "$PROJECTS_FILE" ]; then
    # Scan ~/Projects/live/ and ~/Projects/aiagents/ for recent commits (last 7 days)
    for DIR in "$HOME/Projects/live/"*/ "$HOME/Projects/aiagents/"*/; do
        [ -d "$DIR/.git" ] || continue
        PROJ=$(basename "$DIR")
        LAST_COMMIT=$(git -C "$DIR" log --oneline -1 --since="7 days ago" --format="%ar" 2>/dev/null)
        if [ -n "$LAST_COMMIT" ]; then
            PULSE="${PULSE} ${PROJ}(${LAST_COMMIT})"
        fi
    done
fi

if [ -n "$PULSE" ]; then
    MSG="${MSG}
Active projects (7d):${PULSE}"
fi

# --- Output ---
if [ -n "$MSG" ]; then
    echo "${MSG}
Rules: MEMORY.md + learned-patterns.md (read on demand)."
else
    echo "Fresh session. Rules: MEMORY.md + learned-patterns.md (read on demand)."
fi

exit 0
