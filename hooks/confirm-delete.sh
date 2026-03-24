#!/bin/bash
# Destructive command guard — blocks dangerous operations
# Triggered by PreToolUse on Bash
# Cross-platform: works on Linux, macOS, WSL

# Read command from stdin (Claude Code hook protocol) or fallback to args
if [ -t 0 ]; then
    COMMAND="${CLAUDE_TOOL_INPUT:-$*}"
else
    INPUT=$(cat)
    # Fast path: try CLAUDE_TOOL_INPUT first (avoids node overhead)
    COMMAND="${CLAUDE_TOOL_INPUT:-}"
    if [ -z "$COMMAND" ] && [ -n "$INPUT" ]; then
        COMMAND=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.tool_input?.command||d.tool_input||'')}catch(e){}" 2>/dev/null)
    fi
fi

# Early exit for safe commands (skip all checks for obviously harmless ops)
case "$COMMAND" in
    ls*|cat*|echo*|pwd|cd*|node*|npm*|npx*|bun*|pnpm*|grep*|find*|which*|whoami|date|head*|tail*|wc*|sort*|diff*|test*|"["*|true|false|mkdir*|touch*|cp*|mv*|chmod*|stat*|readlink*|basename*|dirname*|realpath*|tsc*|eslint*|prettier*|vitest*|jest*|python*|pip*|curl*|wget*|vercel*|supabase*|gh*)
        exit 0
        ;;
esac

# --- 1. Dangerous rm patterns ---
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr|-r)\s+(/|~/|\.\.|[A-Za-z]+/$)'; then
    echo "BLOCKED: Dangerous recursive delete: $COMMAND" >&2
    exit 2
fi

# Block rm on critical dirs
if echo "$COMMAND" | grep -qE 'rm\s.*\s(src/|app/|lib/|components/|public/|pages/|supabase/)'; then
    echo "BLOCKED: Attempting to delete a critical project directory." >&2
    exit 2
fi

# Block wiping current directory
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr)\s+\.$'; then
    echo "BLOCKED: Cannot rm -rf current directory." >&2
    exit 2
fi

# --- 2. Dangerous SQL ---
if echo "$COMMAND" | grep -qiE 'DROP\s+(TABLE|DATABASE|SCHEMA)\s'; then
    echo "BLOCKED: DROP TABLE/DATABASE/SCHEMA detected. Run manually if intentional." >&2
    exit 2
fi

if echo "$COMMAND" | grep -qiE 'TRUNCATE\s+TABLE\s'; then
    echo "BLOCKED: TRUNCATE TABLE detected. Run manually if intentional." >&2
    exit 2
fi

if echo "$COMMAND" | grep -qiE 'DELETE\s+FROM\s+\w+\s*;'; then
    echo "BLOCKED: DELETE without WHERE clause. Run manually if intentional." >&2
    exit 2
fi

# --- 3. Dangerous git operations ---
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force'; then
    echo "BLOCKED: git push --force detected. Use --force-with-lease or run manually." >&2
    exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
    echo "BLOCKED: git reset --hard detected. This discards uncommitted work. Run manually." >&2
    exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+clean\s+-[a-z]*f'; then
    echo "BLOCKED: git clean -f detected. This permanently deletes untracked files. Run manually." >&2
    exit 2
fi

# --- 4. Infrastructure destruction ---
if echo "$COMMAND" | grep -qE 'kubectl\s+delete\s'; then
    echo "BLOCKED: kubectl delete detected. Run manually if intentional." >&2
    exit 2
fi

if echo "$COMMAND" | grep -qE 'docker\s+(rm|rmi)\s+-f'; then
    echo "BLOCKED: docker force remove detected. Run manually if intentional." >&2
    exit 2
fi

# --- Safe exceptions (don't block these even if they match patterns above) ---
# Already handled by ordering — specific blocks above, this is the fallthrough
exit 0
