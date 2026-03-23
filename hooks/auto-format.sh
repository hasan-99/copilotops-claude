#!/bin/bash
# Auto-format hook for PostToolUse(Write)
# Runs prettier on supported file types if available in the project

FILE_PATH="$1"

# Skip if no file path provided
[ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ] && exit 0

# Get file extension
EXT="${FILE_PATH##*.}"

# Only format supported file types
case "$EXT" in
  ts|tsx|js|jsx|json|css|scss|html|md|yaml|yml) ;;
  *) exit 0 ;;
esac

# Find project root (look for package.json or .git)
DIR="$(dirname "$FILE_PATH")"
PROJECT_ROOT=""
while [ "$DIR" != "/" ]; do
  if [ -f "$DIR/package.json" ] || [ -d "$DIR/.git" ]; then
    PROJECT_ROOT="$DIR"
    break
  fi
  DIR="$(dirname "$DIR")"
done

# Try to format with prettier if available in the project
if [ -n "$PROJECT_ROOT" ]; then
  if [ -f "$PROJECT_ROOT/node_modules/.bin/prettier" ]; then
    "$PROJECT_ROOT/node_modules/.bin/prettier" --write "$FILE_PATH" 2>/dev/null
    exit 0
  fi
fi

# No formatter found — that's fine, skip silently
exit 0
