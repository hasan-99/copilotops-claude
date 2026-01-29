#!/bin/bash
# Auto-format hook for Claude Code
# Formats files after write operations

FILE_PATH="$1"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Get file extension
EXTENSION="${FILE_PATH##*.}"

# Skip if in node_modules or other excluded paths
if [[ "$FILE_PATH" == *"node_modules"* ]] || [[ "$FILE_PATH" == *".git"* ]]; then
    exit 0
fi

# Format based on file type
case "$EXTENSION" in
    ts|tsx|js|jsx|json|css|scss|md|html|yaml|yml)
        # Use Prettier if available
        if command -v npx &> /dev/null; then
            # Check if prettier is installed in project
            if [ -f "package.json" ] && grep -q "prettier" package.json 2>/dev/null; then
                npx prettier --write "$FILE_PATH" 2>/dev/null || true
            # Check for global prettier
            elif command -v prettier &> /dev/null; then
                prettier --write "$FILE_PATH" 2>/dev/null || true
            fi
        fi
        ;;
    py)
        # Use Black for Python if available
        if command -v black &> /dev/null; then
            black --quiet "$FILE_PATH" 2>/dev/null || true
        elif command -v autopep8 &> /dev/null; then
            autopep8 --in-place "$FILE_PATH" 2>/dev/null || true
        fi
        ;;
    go)
        # Use gofmt for Go
        if command -v gofmt &> /dev/null; then
            gofmt -w "$FILE_PATH" 2>/dev/null || true
        fi
        ;;
    rs)
        # Use rustfmt for Rust
        if command -v rustfmt &> /dev/null; then
            rustfmt "$FILE_PATH" 2>/dev/null || true
        fi
        ;;
    sql)
        # Use pg_format for SQL if available
        if command -v pg_format &> /dev/null; then
            TEMP_FILE=$(mktemp)
            pg_format "$FILE_PATH" > "$TEMP_FILE" 2>/dev/null && mv "$TEMP_FILE" "$FILE_PATH" || rm -f "$TEMP_FILE"
        fi
        ;;
esac

exit 0
