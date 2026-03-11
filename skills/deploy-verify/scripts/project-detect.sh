#!/bin/bash
# project-detect.sh — Auto-detect project from current directory
# Returns JSON: {"name":"...","supabase_ref":"...","hosting":"..."}
#
# Usage: source project-detect.sh  (sets PROJECT_NAME, SUPABASE_REF, HOSTING)
#    or: bash project-detect.sh     (prints JSON)

CONTEXT_FILE="$HOME/.claude/knowledge/qualia-context.md"
CWD="${1:-$(pwd)}"
DIR_NAME=$(basename "$CWD")

# Normalize common directory structures
# ~/Projects/Live-Projects/vero → vero
# ~/Projects/aiagents/sofiatesting → sofiatesting
# ~/Projects/voice/under → under
# ~/Projects/websites/qualia → qualia (ERP)
PROJECT_NAME="$DIR_NAME"

# Known project → Supabase ref mapping (from qualia-context.md)
declare -A SUPABASE_REFS=(
  ["aquador"]="hznpuxplqgszbacxzbhv"
  ["maud"]="vspyxscitcuwnrhchskl"
  ["vero"]="zskfdlqyzhkzefafqkpx"
  ["aibossbrainz"]="esymbjpzjjkffpfqukxw"
  ["mpm"]="llherorsfgbdyqkrrlpc"
  ["Zaid"]="uoqiwidqlsoamtugioik"
  ["dababneh"]="toovladeybmlyzblqtbl"
  ["faris"]="lrgwxcqqnhxvvrruepcv"
  ["Hammah"]="ctcikdcjhxxqogwvtzrc"
  ["sofiatesting"]="vceeheaxcrhmpqueudqx"
  ["timo"]="qgaqvkmqterlljbegniu"
  ["under"]="vvppyijxpgeeijiozlve"
)

# Known project → hosting mapping
declare -A HOSTING_MAP=(
  ["armenius"]="cloudflare"
)

SUPABASE_REF="${SUPABASE_REFS[$PROJECT_NAME]:-}"
HOSTING="${HOSTING_MAP[$PROJECT_NAME]:-vercel}"

# Also try to read from .env.local if no hardcoded ref
if [[ -z "$SUPABASE_REF" ]]; then
  for env_file in "$CWD/.env.local" "$CWD/.env"; do
    if [[ -f "$env_file" ]]; then
      # Extract ref from NEXT_PUBLIC_SUPABASE_URL=https://XXX.supabase.co
      ref=$(grep -oP 'NEXT_PUBLIC_SUPABASE_URL=https://\K[^.]+' "$env_file" 2>/dev/null)
      if [[ -n "$ref" ]]; then
        SUPABASE_REF="$ref"
        break
      fi
    fi
  done
fi

# Detect external dependencies from env files
DEPS=""
for env_file in "$CWD/.env.local" "$CWD/.env"; do
  if [[ -f "$env_file" ]]; then
    # Read variable names only (not values) — security safe
    grep -oP '^[A-Z_]+(?==)' "$env_file" 2>/dev/null | while read -r var; do
      case "$var" in
        VAPI_*|NEXT_PUBLIC_VAPI_*) echo "vapi" ;;
        OPENROUTER_*) echo "openrouter" ;;
        ELEVEN_LABS_*|ELEVENLABS_*) echo "elevenlabs" ;;
        RETELL_*) echo "retell" ;;
        STRIPE_*|NEXT_PUBLIC_STRIPE_*) echo "stripe" ;;
        TELNYX_*) echo "telnyx" ;;
      esac
    done | sort -u
    break
  fi
done > /tmp/deploy-verify-deps 2>/dev/null
DEPS=$(cat /tmp/deploy-verify-deps 2>/dev/null | tr '\n' ',' | sed 's/,$//')
rm -f /tmp/deploy-verify-deps

# If sourced, export variables
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  export PROJECT_NAME SUPABASE_REF HOSTING DEPS
else
  # If run directly, print JSON
  echo "{\"name\":\"$PROJECT_NAME\",\"supabase_ref\":\"$SUPABASE_REF\",\"hosting\":\"$HOSTING\",\"deps\":\"$DEPS\"}"
fi
