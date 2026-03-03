#!/bin/bash
# Block .env file editing — additional protection layer
# Triggered by PreToolUse on Edit for .env* files

FILE_PATH="${CLAUDE_FILE_PATH:-$1}"

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Block editing any .env file
if [[ "$(basename "$FILE_PATH")" == .env* ]] || [[ "$FILE_PATH" == */.env ]] || [[ "$FILE_PATH" == */.env.* ]]; then
    echo "BLOCKED: Editing .env files is not allowed through Claude."
    echo "Edit environment files manually to prevent accidental secret exposure."
    exit 2
fi

# Block editing credentials files
if [[ "$FILE_PATH" == *credentials* ]] || [[ "$FILE_PATH" == *secret* ]] || [[ "$FILE_PATH" == *.pem ]] || [[ "$FILE_PATH" == *.key ]]; then
    echo "BLOCKED: Editing credential/secret files is not allowed through Claude."
    exit 2
fi

exit 0
