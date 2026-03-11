#!/bin/bash
# Context Management System — PreCompact hook
# Smart /compact strategy: saves critical context before compaction
# Also doubles as a context budget monitor during session

# This hook runs when Claude Code triggers /compact (PreCompact event)
# It preserves key state so compact doesn't lose track of what matters

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")
STATE_DIR="$HOME/.claude/context-states"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
STATE_FILE="$STATE_DIR/${PROJECT_NAME}-${TIMESTAMP}.md"

mkdir -p "$STATE_DIR"

printf "${CYAN}[Context Manager] Saving state before compact...${NC}\n"

# Build context snapshot
cat > "$STATE_FILE" << SNAPSHOT
# Context Snapshot: $PROJECT_NAME
> Auto-saved at $(date '+%Y-%m-%d %H:%M:%S') before /compact

## Current Branch & Status
\`\`\`
$(git branch --show-current 2>/dev/null || echo "not a git repo")
$(git status --short 2>/dev/null | head -20)
\`\`\`

## Recent Commits (last 5)
\`\`\`
$(git log --oneline -5 2>/dev/null || echo "no git history")
\`\`\`

## Modified Files Since Last Commit
\`\`\`
$(git diff --name-only HEAD 2>/dev/null | head -20)
\`\`\`

## Active TODOs in Code
\`\`\`
$(grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/ 2>/dev/null | head -15 || echo "none found")
\`\`\`

## Package.json Scripts Available
\`\`\`
$(node -e "try{const s=require('./package.json').scripts;Object.entries(s||{}).forEach(([k,v])=>console.log(k+': '+v))}catch(e){console.log('no package.json')}" 2>/dev/null)
\`\`\`

## Environment Summary
- Node: $(node --version 2>/dev/null || echo "N/A")
- Project: $PROJECT_NAME
- Path: $PROJECT_DIR
- Has .env.local: $([ -f ".env.local" ] && echo "yes" || echo "no")
- Has Supabase: $([ -d "supabase" ] && echo "yes" || echo "no")
- Framework: $(node -e "try{const d=require('./package.json').dependencies||{};console.log(d.next?'Next.js':d.react?'React':d.vue?'Vue':'unknown')}catch(e){console.log('unknown')}" 2>/dev/null)
SNAPSHOT

# Prune old snapshots (keep last 5 per project)
ls -t "$STATE_DIR/${PROJECT_NAME}-"*.md 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null

printf "${GREEN}[Context Manager] State saved to ${STATE_FILE}${NC}\n"
printf "${DIM}  Branch: $(git branch --show-current 2>/dev/null)${NC}\n"
printf "${DIM}  Modified files: $(git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')${NC}\n"
printf "${DIM}  This snapshot will be available after compact to restore context.${NC}\n"

exit 0
