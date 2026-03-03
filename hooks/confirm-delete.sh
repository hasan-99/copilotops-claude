#!/bin/bash
# Confirm-delete hook — blocks dangerous rm/delete commands
# Triggered by PreToolUse on Bash

COMMAND="${CLAUDE_TOOL_INPUT:-$*}"

# Check for dangerous rm patterns
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr|-r)\s+(/|~/|\.\.|[A-Za-z]+/$)'; then
    echo "BLOCKED: Dangerous recursive delete detected: $COMMAND"
    echo "If intentional, run the rm command manually outside Claude."
    exit 2
fi

# Block rm on critical dirs
if echo "$COMMAND" | grep -qE 'rm\s.*\s(src/|app/|lib/|components/|public/|pages/)'; then
    echo "BLOCKED: Attempting to delete a critical project directory."
    echo "Review the command and run manually if intentional."
    exit 2
fi

# Block wiping entire project
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr)\s+\.$'; then
    echo "BLOCKED: Cannot rm -rf current directory."
    exit 2
fi

exit 0
