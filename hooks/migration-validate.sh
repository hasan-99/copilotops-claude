#!/bin/bash
# Migration validation hook — checks SQL files for destructive operations
# Triggered by PostToolUse on Write for *.sql files

FILE_PATH="${CLAUDE_FILE_PATH:-$1}"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Only check .sql files
if [[ "$FILE_PATH" != *.sql ]]; then
    exit 0
fi

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0

# Check for destructive operations
if grep -iE '\bDROP\s+(TABLE|SCHEMA|DATABASE)\b' "$FILE_PATH" > /dev/null 2>&1; then
    printf "${RED}WARNING: DROP TABLE/SCHEMA/DATABASE found in %s${NC}\n" "$FILE_PATH"
    grep -inE '\bDROP\s+(TABLE|SCHEMA|DATABASE)\b' "$FILE_PATH"
    ISSUES=$((ISSUES + 1))
fi

if grep -iE '\bTRUNCATE\b' "$FILE_PATH" > /dev/null 2>&1; then
    printf "${RED}WARNING: TRUNCATE found in %s${NC}\n" "$FILE_PATH"
    ISSUES=$((ISSUES + 1))
fi

if grep -iE '\bDELETE\s+FROM\b' "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -iE '\bWHERE\b' "$FILE_PATH" > /dev/null 2>&1; then
        printf "${RED}WARNING: DELETE FROM without WHERE clause in %s${NC}\n" "$FILE_PATH"
        ISSUES=$((ISSUES + 1))
    fi
fi

# Check for ALTER that drops columns
if grep -iE '\bALTER\s+TABLE\b.*\bDROP\s+COLUMN\b' "$FILE_PATH" > /dev/null 2>&1; then
    printf "${YELLOW}CAUTION: ALTER TABLE DROP COLUMN in %s — data loss is irreversible${NC}\n" "$FILE_PATH"
    ISSUES=$((ISSUES + 1))
fi

# Check that RLS is enabled on new tables
if grep -iE '\bCREATE\s+TABLE\b' "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -iE '\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b' "$FILE_PATH" > /dev/null 2>&1; then
        printf "${YELLOW}REMINDER: New table created without RLS — add ALTER TABLE ... ENABLE ROW LEVEL SECURITY${NC}\n"
    fi
fi

if [ "$ISSUES" -gt 0 ]; then
    printf "${YELLOW}Found %d potential issue(s) in migration. Review carefully before applying.${NC}\n" "$ISSUES"
fi

# Don't block — just warn
exit 0
