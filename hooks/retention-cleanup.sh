#!/bin/bash
# Retention cleanup — runs on SessionStart to enforce retention policies
# Keeps .claude/ lean by pruning stale data automatically

CLAUDE_DIR="$HOME/.claude"

# debug/ — keep 3 days max
find "$CLAUDE_DIR/debug/" -type f -mtime +3 -delete 2>/dev/null
find "$CLAUDE_DIR/debug/" -type d -empty -delete 2>/dev/null

# file-history/ — keep 7 days max
find "$CLAUDE_DIR/file-history/" -type f -mtime +7 -delete 2>/dev/null
find "$CLAUDE_DIR/file-history/" -type d -empty -delete 2>/dev/null

# session-env/ — keep last 10 UUID dirs (sorted by modification time)
ls -dt "$CLAUDE_DIR/session-env"/*-*-*-*-* 2>/dev/null | tail -n +11 | while IFS= read -r d; do
    rm -rf "$d"
done

# context-states/ — keep last 10 per project
for prefix in $(ls "$CLAUDE_DIR/context-states/"*.md 2>/dev/null | sed 's/-[0-9]*\.md$//' | sort -u); do
    ls -t "${prefix}-"*.md 2>/dev/null | tail -n +6 | while IFS= read -r f; do
        rm -f "$f"
    done
done

# paste-cache/ — keep 3 days
find "$CLAUDE_DIR/paste-cache/" -type f -mtime +3 -delete 2>/dev/null

# shell-snapshots/ — keep 3 days
find "$CLAUDE_DIR/shell-snapshots/" -type f -mtime +3 -delete 2>/dev/null

# projects/ session transcripts — keep 3 days max (biggest space hog)
find "$CLAUDE_DIR/projects/" -name "*.jsonl" -mtime +3 -delete 2>/dev/null
find "$CLAUDE_DIR/projects/" -type d -empty -delete 2>/dev/null

exit 0
