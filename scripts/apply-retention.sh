#!/bin/bash
# Apply retention policies based on retention.json
#
# Usage: ./apply-retention.sh [--dry-run]
#
# Cross-platform: uses node instead of jq for JSON parsing

set -e

CLAUDE_DIR="$HOME/.claude"
CONFIG="$CLAUDE_DIR/config/retention.json"
ARCHIVE_DIR="$CLAUDE_DIR/archive"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "DRY RUN MODE - No changes will be made"
fi

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Helper: read JSON config value using node (replaces jq)
json_cfg() {
    local field="$1"
    node -e "try{const d=JSON.parse(require('fs').readFileSync('$CONFIG','utf8'));const v=$field;process.stdout.write(String(v))}catch(e){process.stderr.write(e.message);process.exit(1)}" 2>/dev/null
}

# Check if node is available (needed for JSON parsing)
if ! command -v node &> /dev/null; then
    echo "Error: node is required for JSON parsing. Install Node.js from https://nodejs.org"
    exit 1
fi

# Check if config exists
if [[ ! -f "$CONFIG" ]]; then
    echo "Error: Config file not found: $CONFIG"
    exit 1
fi

# Parse retention values using node instead of jq
FILE_HISTORY_DAYS=$(json_cfg "d.policies['file-history'].max_age_days")
DEBUG_DAYS=$(json_cfg "d.policies['debug-logs'].max_age_days")
SNAPSHOT_DAYS=$(json_cfg "d.policies['shell-snapshots'].max_age_days")
TODO_DAYS=$(json_cfg "d.policies.todos.archive_after_days")
PROJECT_DAYS=$(json_cfg "d.policies.projects.archive_after_days")
SESSION_DAYS=$(json_cfg "d.policies['session-env'].max_age_days")

log "=== Applying Retention Policies ==="
log "Config: $CONFIG"

# Create archive directories
mkdir -p "$ARCHIVE_DIR/todos" "$ARCHIVE_DIR/projects" "$ARCHIVE_DIR/debug"

# 1. File-history retention
log "Cleaning file-history (>$FILE_HISTORY_DAYS days)..."
count=$(find "$CLAUDE_DIR/file-history" -type f -mtime +"$FILE_HISTORY_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to remove"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/file-history" -type f -mtime +"$FILE_HISTORY_DAYS" -delete 2>/dev/null || true
fi

# 2. Debug log retention
log "Cleaning debug logs (>$DEBUG_DAYS days)..."
count=$(find "$CLAUDE_DIR/debug" -type f -mtime +"$DEBUG_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to archive/remove"
if [[ "$DRY_RUN" == false ]]; then
    # Move old debug logs to archive
    find "$CLAUDE_DIR/debug" -type f -mtime +"$DEBUG_DAYS" -exec mv {} "$ARCHIVE_DIR/debug/" \; 2>/dev/null || true
fi

# 3. Shell snapshots retention
log "Cleaning shell snapshots (>$SNAPSHOT_DAYS days)..."
count=$(find "$CLAUDE_DIR/shell-snapshots" -type f -mtime +"$SNAPSHOT_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to remove"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/shell-snapshots" -type f -mtime +"$SNAPSHOT_DAYS" -delete 2>/dev/null || true
fi

# 4. Todos archival
log "Archiving old todos (>$TODO_DAYS days)..."
count=$(find "$CLAUDE_DIR/todos" -name "*.json" -mtime +"$TODO_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to archive"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/todos" -name "*.json" -mtime +"$TODO_DAYS" -exec mv {} "$ARCHIVE_DIR/todos/" \; 2>/dev/null || true
fi

# 5. Projects compression
log "Compressing old project sessions (>$PROJECT_DAYS days)..."
count=$(find "$CLAUDE_DIR/projects" -name "*.jsonl" -mtime +"$PROJECT_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to compress"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/projects" -name "*.jsonl" -mtime +"$PROJECT_DAYS" -exec gzip {} \; 2>/dev/null || true
fi

# 6. Session-env cleanup (empty directories)
log "Cleaning empty session-env directories..."
count=$(find "$CLAUDE_DIR/session-env" -type d -empty 2>/dev/null | wc -l)
log "  Found $count empty directories"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/session-env" -type d -empty -delete 2>/dev/null || true
fi

# 7. Old session-env files
log "Cleaning old session-env files (>$SESSION_DAYS days)..."
count=$(find "$CLAUDE_DIR/session-env" -type f -mtime +"$SESSION_DAYS" 2>/dev/null | wc -l)
log "  Found $count files to remove"
if [[ "$DRY_RUN" == false ]]; then
    find "$CLAUDE_DIR/session-env" -type f -mtime +"$SESSION_DAYS" -delete 2>/dev/null || true
fi

log "=== Retention Policies Applied ==="

# Show current sizes
log ""
log "Current .claude directory sizes:"
du -sh "$CLAUDE_DIR/projects" "$CLAUDE_DIR/file-history" "$CLAUDE_DIR/debug" "$CLAUDE_DIR/shell-snapshots" "$CLAUDE_DIR/todos" 2>/dev/null | while read line; do
    log "  $line"
done
