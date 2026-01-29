#!/bin/bash
# ~/.claude cleanup script
# Run periodically to keep the directory lean
# Schedule: 0 3 * * 0 ~/.claude/scripts/cleanup.sh >> ~/.claude/cleanup.log 2>&1

set -e
CLAUDE_DIR="$HOME/.claude"
cd "$CLAUDE_DIR" || exit 1

echo "=== Claude Config Cleanup $(date) ==="
echo ""

# 0. Remove orphaned worktree project entries
echo "Cleaning orphaned worktree entries..."
count=$(ls -d projects/-var-tmp-* 2>/dev/null | wc -l || echo 0)
rm -rf projects/-var-tmp-* 2>/dev/null || true
echo "  Removed: $count orphaned worktree directories"

# 0.1 Remove stale security warning files
echo "Cleaning orphaned security warning files..."
count=$(ls security_warnings_state_*.json 2>/dev/null | wc -l || echo 0)
rm -f security_warnings_state_*.json 2>/dev/null || true
echo "  Removed: $count security warning files"

# 0.2 Clean plugin cache older than 7 days
echo "Cleaning plugin cache older than 7 days..."
count=$(find plugins/cache -mindepth 2 -maxdepth 2 -type d -mtime +7 2>/dev/null | wc -l || echo 0)
find plugins/cache -mindepth 2 -maxdepth 2 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
echo "  Removed: $count cached plugin versions"

# Keep last N shell snapshots (reduced from 20)
KEEP_SNAPSHOTS=10
echo "Cleaning shell snapshots (keeping last $KEEP_SNAPSHOTS)..."
count=$(ls -t shell-snapshots/*.sh 2>/dev/null | tail -n +$((KEEP_SNAPSHOTS + 1)) | wc -l)
ls -t shell-snapshots/*.sh 2>/dev/null | tail -n +$((KEEP_SNAPSHOTS + 1)) | xargs rm -f 2>/dev/null
echo "  Removed: $count files"

# Keep last N debug logs (reduced from 30)
KEEP_DEBUG=15
echo "Cleaning debug logs (keeping last $KEEP_DEBUG)..."
count=$(ls -t debug/*.txt 2>/dev/null | tail -n +$((KEEP_DEBUG + 1)) | wc -l)
ls -t debug/*.txt 2>/dev/null | tail -n +$((KEEP_DEBUG + 1)) | xargs rm -f 2>/dev/null
echo "  Removed: $count files"

# Clean old file-history sessions (older than 14 days)
echo "Cleaning file-history older than 14 days..."
count=$(find file-history/ -mindepth 1 -maxdepth 1 -type d -mtime +14 2>/dev/null | wc -l)
find file-history/ -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} \; 2>/dev/null
echo "  Removed: $count sessions"

# Clean old project sessions (older than 30 days)
echo "Cleaning project sessions older than 30 days..."
count=$(find projects/ -name "*.jsonl" -mtime +30 2>/dev/null | wc -l)
find projects/ -name "*.jsonl" -mtime +30 -delete 2>/dev/null
echo "  Removed: $count files"

# Clean empty todo files (2 bytes = [])
echo "Cleaning empty todo files..."
count=$(find todos/ -name "*.json" -size 2c 2>/dev/null | wc -l)
find todos/ -name "*.json" -size 2c -delete 2>/dev/null
echo "  Removed: $count empty files"

# Clean old todos (older than 7 days)
echo "Cleaning old todo files..."
count=$(find todos/ -name "*.json" -mtime +7 2>/dev/null | wc -l)
find todos/ -name "*.json" -mtime +7 -delete 2>/dev/null
echo "  Removed: $count old files"

# Clean old session-env files (older than 14 days)
echo "Cleaning session-env older than 14 days..."
count=$(find session-env/ -name "*.json" -mtime +14 2>/dev/null | wc -l)
find session-env/ -name "*.json" -mtime +14 -delete 2>/dev/null
echo "  Removed: $count files"

# Rotate history.jsonl if larger than 5MB
if [ -f history.jsonl ]; then
    size=$(stat -c%s history.jsonl 2>/dev/null || echo 0)
    if [ "$size" -gt 5242880 ]; then
        echo "Rotating history.jsonl (>5MB)..."
        mkdir -p archive
        mv history.jsonl "archive/history-$(date +%Y%m%d).jsonl"
        touch history.jsonl
        echo "  Archived to archive/history-$(date +%Y%m%d).jsonl"
    fi
fi

# Remove empty directories
echo "Removing empty directories..."
find projects/ -type d -empty -delete 2>/dev/null
find file-history/ -type d -empty -delete 2>/dev/null
find todos/ -type d -empty -delete 2>/dev/null
find session-env/ -type d -empty -delete 2>/dev/null

# Report disk usage
echo ""
echo "=== Current Disk Usage ==="
du -sh "$CLAUDE_DIR" 2>/dev/null
echo ""
echo "Breakdown:"
du -sh "$CLAUDE_DIR"/*/ 2>/dev/null | sort -hr | head -10

echo ""
echo "Cleanup complete!"
