#!/usr/bin/env bash
# PostToolUse hook: auto-run nearest test file after Write/Edit
# Exits 0 always — never blocks on missing tests

set -euo pipefail

# Get the modified file path from the tool input
FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_TOOL_INPUT_file_path:-}}"
[ -z "$FILE_PATH" ] && exit 0

# Skip non-source files
case "$FILE_PATH" in
  *.test.* | *.spec.* | *__tests__/*) exit 0 ;;  # Don't re-run test files
  *.ts | *.tsx | *.js | *.jsx) ;;                  # Only test source files
  *) exit 0 ;;
esac

DIR=$(dirname "$FILE_PATH")
BASE=$(basename "$FILE_PATH" | sed 's/\.[^.]*$//')  # strip extension

# Find the nearest test file
TEST_FILE=""
for pattern in \
  "$DIR/${BASE}.test.ts" \
  "$DIR/${BASE}.test.tsx" \
  "$DIR/${BASE}.spec.ts" \
  "$DIR/${BASE}.spec.tsx" \
  "$DIR/__tests__/${BASE}.test.ts" \
  "$DIR/__tests__/${BASE}.test.tsx" \
  "$DIR/__tests__/${BASE}.spec.ts" \
  "$DIR/__tests__/${BASE}.spec.tsx"; do
  if [ -f "$pattern" ]; then
    TEST_FILE="$pattern"
    break
  fi
done

# No test file found — exit silently
[ -z "$TEST_FILE" ] && exit 0

# Find project root (nearest package.json)
PROJECT_ROOT="$DIR"
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -f "$PROJECT_ROOT/package.json" ] && break
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[ "$PROJECT_ROOT" = "/" ] && exit 0

# Detect test runner
if [ -f "$PROJECT_ROOT/vitest.config.ts" ] || [ -f "$PROJECT_ROOT/vitest.config.js" ]; then
  RUNNER="npx vitest run"
elif [ -f "$PROJECT_ROOT/jest.config.ts" ] || [ -f "$PROJECT_ROOT/jest.config.js" ]; then
  RUNNER="npx jest --no-coverage"
elif grep -q '"vitest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
  RUNNER="npx vitest run"
elif grep -q '"jest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
  RUNNER="npx jest --no-coverage"
else
  exit 0  # No recognized test runner
fi

# Run the test
cd "$PROJECT_ROOT"
echo "Auto-test: running $TEST_FILE"
$RUNNER "$TEST_FILE" 2>&1 | tail -20

exit 0
