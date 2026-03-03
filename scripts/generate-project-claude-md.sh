#!/bin/bash
# Generate CLAUDE.md for all Qualia projects that don't have one
# Run from your main dev machine: bash ~/.claude/scripts/generate-project-claude-md.sh

set -euo pipefail
shopt -s nullglob

PROJECTS_BASE="$HOME/Projects"
# Note: Projects confirmed at ~/Projects/ (not ~/Desktop/Projects/)
DEPLOYMENT_MAP="$HOME/.claude/knowledge/deployment-map.md"
CLIENT_PREFS="$HOME/.claude/knowledge/client-prefs.md"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

GENERATED=0
SKIPPED=0

# Supabase refs from deployment-map.md
declare -A SUPABASE_REFS=(
  ["aibossbrainz"]="esymbjpzjjkffpfqukxw"
  ["aquador"]="hznpuxplqgszbacxzbhv"
  ["dababneh"]="toovladeybmlyzblqtbl"
  ["faris"]="lrgwxcqqnhxvvrruepcv"
  ["Hammah"]="ctcikdcjhxxqogwvtzrc"
  ["maud"]="vspyxscitcuwnrhchskl"
  ["mpm"]="llherorsfgbdyqkrrlpc"
  ["sofiatesting"]="vceeheaxcrhmpqueudqx"
  ["timo"]="qgaqvkmqterlljbegniu"
  ["under"]="vvppyijxpgeeijiozlve"
  ["vero"]="zskfdlqyzhkzefafqkpx"
  ["Zaid"]="uoqiwidqlsoamtugioik"
)

generate_claude_md() {
  local dir="$1"
  local name=$(basename "$dir")
  local category="$2"

  # Skip if CLAUDE.md already exists
  if [ -f "$dir/CLAUDE.md" ]; then
    printf "${YELLOW}SKIP${NC} %s (already has CLAUDE.md)\n" "$name"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  # Skip if not a real project (no package.json and no src/)
  if [ ! -f "$dir/package.json" ] && [ ! -d "$dir/src" ] && [ ! -f "$dir/requirements.txt" ]; then
    return
  fi

  # Detect stack from package.json
  local stack=""
  local scripts=""
  local nextjs_version=""
  if [ -f "$dir/package.json" ]; then
    nextjs_version=$(node -e "try{const p=require('$dir/package.json');console.log(p.dependencies?.next||p.devDependencies?.next||'')}catch(e){}" 2>/dev/null)
    local has_supabase=$(node -e "try{const p=require('$dir/package.json');console.log(p.dependencies?.['@supabase/supabase-js']?'yes':'')}catch(e){}" 2>/dev/null)
    local has_tailwind=$(node -e "try{const p=require('$dir/package.json');console.log(p.devDependencies?.tailwindcss||p.dependencies?.tailwindcss?'yes':'')}catch(e){}" 2>/dev/null)

    stack="Next.js${nextjs_version:+ $nextjs_version}, React, TypeScript"
    [ "$has_supabase" = "yes" ] && stack="$stack, Supabase"
    [ "$has_tailwind" = "yes" ] && stack="$stack, Tailwind"

    # Get npm scripts
    scripts=$(node -e "try{const p=require('$dir/package.json');const s=p.scripts||{};Object.keys(s).forEach(k=>console.log('- \`npm run '+k+'\` — '+s[k]))}catch(e){}" 2>/dev/null)
  fi

  # Python project detection
  if [ -f "$dir/requirements.txt" ]; then
    stack="Python"
    [ -f "$dir/pyproject.toml" ] && stack="$stack (pyproject)"
  fi

  # Supabase ref
  local supa_ref="${SUPABASE_REFS[$name]:-}"
  local supa_line=""
  [ -n "$supa_ref" ] && supa_line="- **Supabase:** \`$supa_ref\`"

  # Detect deploy target
  local deploy_target="Vercel"
  [ -f "$dir/wrangler.toml" ] || [ -f "$dir/wrangler.jsonc" ] && deploy_target="Cloudflare Workers"

  # Detect domain from vercel.json
  local domain=""
  if [ -f "$dir/vercel.json" ]; then
    domain=$(node -e "try{const v=require('$dir/vercel.json');console.log((v.alias||[])[0]||'')}catch(e){}" 2>/dev/null)
  fi
  [ -z "$domain" ] && domain="$name.vercel.app"

  # Build the CLAUDE.md
  cat > "$dir/CLAUDE.md" << CLAUDEMD
# $name

## Purpose
$category project. <!-- UPDATE: Add one-line description -->

## Stack
$stack

## Config
- **Deploy:** $deploy_target at $domain
${supa_line}

## Commands
${scripts:-"- \`npm run dev\` — local development
- \`npm run build\` — production build"}

## Notes
<!-- Add project-specific gotchas, client preferences, known issues -->
CLAUDEMD

  printf "${GREEN}CREATED${NC} %s/CLAUDE.md\n" "$name"
  GENERATED=$((GENERATED + 1))
}

echo ""
printf "${CYAN}Scanning projects...${NC}\n"
echo ""

# Live Projects
if [ -d "$PROJECTS_BASE/Live-Projects" ]; then
  for dir in "$PROJECTS_BASE/Live-Projects"/*/; do
    [ -d "$dir" ] && generate_claude_md "$dir" "Client website"
  done
fi

# AI Agents
if [ -d "$PROJECTS_BASE/aiagents" ]; then
  for dir in "$PROJECTS_BASE/aiagents"/*/; do
    [ -d "$dir" ] && generate_claude_md "$dir" "AI agent"
  done
fi

# Voice
if [ -d "$PROJECTS_BASE/voice" ]; then
  for dir in "$PROJECTS_BASE/voice"/*/; do
    [ -d "$dir" ] && generate_claude_md "$dir" "Voice agent"
  done
fi

# Websites
if [ -d "$PROJECTS_BASE/websites" ]; then
  for dir in "$PROJECTS_BASE/websites"/*/; do
    [ -d "$dir" ] && generate_claude_md "$dir" "Internal tool"
  done
fi

echo ""
printf "${CYAN}Done.${NC} Generated: ${GREEN}$GENERATED${NC} | Skipped: ${YELLOW}$SKIPPED${NC}\n"
printf "Review the generated files and fill in the <!-- UPDATE --> placeholders.\n"
