#!/bin/bash
# health-check.sh — Fleet-wide health check for all Qualia projects
#
# Usage:
#   health-check.sh                  # Check all active/maintenance projects
#   health-check.sh --quick          # HTTP status only (fast)
#   health-check.sh --project vero   # Deep check on one project
#   health-check.sh --all            # Alias for default (cron-friendly)
#
# Output: Colored when interactive, plain text when piped/redirected.

set -uo pipefail

# ─── Detect terminal vs pipe (for cron compatibility) ─────────────────
if [[ -t 1 ]]; then
  C_RESET="\033[0m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"
  C_RED="\033[31m"; C_DIM="\033[2m"; C_BOLD="\033[1m"
else
  C_RESET=""; C_GREEN=""; C_YELLOW=""
  C_RED=""; C_DIM=""; C_BOLD=""
fi

ICON_PASS="✓"; ICON_WARN="⚠"; ICON_FAIL="✗"; ICON_SKIP="○"
TIMEOUT=10
CONTEXT_FILE="$HOME/.claude/knowledge/qualia-context.md"
TMPDIR="/tmp/qualia-health-$$"
mkdir -p "$TMPDIR"
trap 'rm -rf "$TMPDIR"' EXIT

# ─── Parse args ───────────────────────────────────────────────────────
MODE="default"
TARGET_PROJECT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick) MODE="quick"; shift ;;
    --project) MODE="deep"; TARGET_PROJECT="$2"; shift 2 ;;
    --all) MODE="default"; shift ;;
    --help) echo "Usage: health-check.sh [--quick|--project <name>|--all]"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Read qualia-context.md ───────────────────────────────────────────
if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo "ERROR: Cannot find $CONTEXT_FILE"
  exit 1
fi

# Known URL overrides (projects whose URL != {name}.vercel.app)
declare -A URL_OVERRIDES=(
  ["qualia"]="qualia-erp.vercel.app"
)

# Parse project inventory from qualia-context.md
# Format: name|status|supabase_ref|hosting|category
parse_projects() {
  local in_section="" category=""

  while IFS= read -r line; do
    # Detect section headers
    if [[ "$line" =~ "### Websites" ]]; then category="WEBSITES"; in_section="table"; continue; fi
    if [[ "$line" =~ "### AI Agents" ]]; then category="AI_AGENTS"; in_section="table"; continue; fi
    if [[ "$line" =~ "### Voice" ]]; then category="VOICE"; in_section="table"; continue; fi
    if [[ "$line" =~ "### ERP" ]]; then
      # ERP is a special single-project section
      echo "qualia|ACTIVE||vercel|ERP"
      in_section=""
      continue
    fi
    if [[ "$line" =~ ^"##" ]] && [[ ! "$line" =~ "###" ]]; then in_section=""; continue; fi

    # Parse table rows
    if [[ "$in_section" == "table" ]] && [[ "$line" =~ ^\| ]] && [[ ! "$line" =~ ^\|[-] ]] && [[ ! "$line" =~ "Project" ]]; then
      # Extract fields from markdown table row
      local name status supabase_ref hosting

      if [[ "$category" == "WEBSITES" ]]; then
        name=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        status=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
        supabase_ref=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); gsub(/`/, "", $4); print $4}')
        hosting=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}')
      elif [[ "$category" == "AI_AGENTS" ]]; then
        name=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        status=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
        supabase_ref=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); gsub(/`/, "", $4); print $4}')
        hosting="vercel"
      elif [[ "$category" == "VOICE" ]]; then
        name=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        status=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
        hosting=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}')
        supabase_ref=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $6); gsub(/`/, "", $6); print $6}')
      fi

      # Clean up
      [[ "$supabase_ref" == "—" || "$supabase_ref" == "planned" ]] && supabase_ref=""
      [[ "$hosting" == "—" ]] && hosting=""

      echo "${name}|${status}|${supabase_ref}|${hosting}|${category}"
    fi
  done < "$CONTEXT_FILE"
}

# ─── URL resolution ──────────────────────────────────────────────────
resolve_url() {
  local name="$1" hosting="$2"
  # Check overrides first
  if [[ -n "${URL_OVERRIDES[$name]:-}" ]]; then
    echo "https://${URL_OVERRIDES[$name]}"
    return
  fi
  # Cloudflare projects don't follow vercel.app convention
  if [[ "$hosting" =~ [Cc]loudflare ]]; then
    # For Cloudflare projects, we'd need to know the domain
    # armenius is the only one — check its worker URL
    echo "https://${name}.workers.dev"
    return
  fi
  echo "https://${name}.vercel.app"
}

# ─── Individual check functions ───────────────────────────────────────

check_http() {
  local url="$1"
  local code time_total
  code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  time_total=$(curl -sL -o /dev/null -w "%{time_total}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "0")
  local ms
  ms=$(echo "$time_total * 1000" | bc 2>/dev/null | cut -d. -f1)
  ms=${ms:-0}
  echo "${code}|${ms}"
}

check_ssl() {
  local domain="$1"
  local cert_output expiry_date days_left

  cert_output=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null)
  if [[ -z "$cert_output" ]]; then
    echo "FAIL|0|Connection failed"
    return
  fi

  expiry_date=$(echo "$cert_output" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [[ -z "$expiry_date" ]]; then
    echo "FAIL|0|Cannot parse cert"
    return
  fi

  local expiry_epoch now_epoch
  expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
  now_epoch=$(date +%s)
  days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

  if ((days_left < 7)); then
    echo "FAIL|${days_left}|Expires in ${days_left}d"
  elif ((days_left < 30)); then
    echo "WARN|${days_left}|Expires in ${days_left}d"
  else
    echo "PASS|${days_left}|${days_left}d"
  fi
}

check_supabase() {
  local ref="$1"
  if [[ -z "$ref" ]]; then
    echo "SKIP|0|No ref"
    return
  fi

  local start_ns end_ns status_code
  start_ns=$(date +%s%N)
  status_code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    "https://${ref}.supabase.co/rest/v1/" \
    -H "apikey: placeholder" 2>/dev/null || echo "000")
  end_ns=$(date +%s%N)
  local db_ms=$(( (end_ns - start_ns) / 1000000 ))

  if [[ "$status_code" =~ ^(200|401|403)$ ]]; then
    if ((db_ms > 500)); then
      echo "WARN|${db_ms}|Slow (${db_ms}ms)"
    else
      echo "PASS|${db_ms}|healthy"
    fi
  elif [[ "$status_code" == "000" ]]; then
    echo "FAIL|0|Unreachable"
  else
    echo "WARN|${db_ms}|HTTP ${status_code}"
  fi
}

# ─── Check a single project (runs as background process) ─────────────
check_project() {
  local name="$1" status="$2" supabase_ref="$3" hosting="$4" category="$5"
  local url result_file

  url=$(resolve_url "$name" "$hosting")
  result_file="$TMPDIR/${name}.result"
  local domain
  domain=$(echo "$url" | sed -E 's|https?://([^/:]+).*|\1|')

  # HTTP check (always)
  local http_result http_code http_ms
  http_result=$(check_http "$url")
  http_code=$(echo "$http_result" | cut -d'|' -f1)
  http_ms=$(echo "$http_result" | cut -d'|' -f2)

  # Determine overall HTTP status
  local http_status http_detail
  if [[ "$http_code" == "200" ]]; then
    if ((http_ms < 1000)); then
      http_status="PASS"
    elif ((http_ms < 3000)); then
      http_status="WARN"
    else
      http_status="FAIL"
    fi
    http_detail="${http_code} OK  (${http_ms}ms)"
  elif [[ "$http_code" =~ ^3[0-9]{2}$ ]]; then
    http_status="WARN"
    http_detail="${http_code} Redirect  (${http_ms}ms)"
  elif [[ "$http_code" == "000" ]]; then
    http_status="FAIL"
    http_detail="Timeout/DNS error"
  else
    http_status="FAIL"
    http_detail="HTTP ${http_code}"
  fi

  local ssl_summary="" db_summary=""

  if [[ "$MODE" != "quick" ]]; then
    # SSL check
    local ssl_result ssl_status ssl_days
    ssl_result=$(check_ssl "$domain")
    ssl_status=$(echo "$ssl_result" | cut -d'|' -f1)
    ssl_days=$(echo "$ssl_result" | cut -d'|' -f2)

    if [[ "$ssl_status" == "PASS" ]]; then
      ssl_summary="SSL: ${ssl_days}d"
    elif [[ "$ssl_status" == "WARN" ]]; then
      ssl_summary="SSL: ${ssl_days}d ⚠"
    elif [[ "$ssl_status" == "FAIL" ]]; then
      ssl_summary="SSL: FAIL"
    fi

    # Supabase check
    local db_result db_status db_detail
    db_result=$(check_supabase "$supabase_ref")
    db_status=$(echo "$db_result" | cut -d'|' -f1)
    db_detail=$(echo "$db_result" | cut -d'|' -f3)

    if [[ "$db_status" == "PASS" ]]; then
      db_summary="DB: ${db_detail}"
    elif [[ "$db_status" == "WARN" ]]; then
      db_summary="DB: ${db_detail} ⚠"
    elif [[ "$db_status" == "FAIL" ]]; then
      db_summary="DB: ${db_detail}"
    elif [[ "$db_status" == "SKIP" ]]; then
      db_summary=""
    fi
  fi

  # Determine overall project status (worst of all checks)
  local overall="PASS"
  if [[ "$http_status" == "FAIL" ]] || [[ "${ssl_status:-PASS}" == "FAIL" ]] || [[ "${db_status:-PASS}" == "FAIL" ]]; then
    overall="FAIL"
  elif [[ "$http_status" == "WARN" ]] || [[ "${ssl_status:-PASS}" == "WARN" ]] || [[ "${db_status:-PASS}" == "WARN" ]]; then
    overall="WARN"
  fi

  # Build extras string
  local extras=""
  [[ -n "$ssl_summary" ]] && extras="  ${ssl_summary}"
  [[ -n "$db_summary" ]] && extras="${extras}  ${db_summary}"

  # Write result to file (category|overall|name|http_detail|extras|issues)
  local issue=""
  if [[ "$overall" == "FAIL" ]]; then
    if [[ "$http_code" == "000" ]]; then
      issue="FAIL|${name}|Unreachable (timeout/DNS)|Check: curl -sL ${url} ; Check Vercel dashboard"
    elif [[ "$http_code" =~ ^5 ]]; then
      issue="FAIL|${name}|HTTP ${http_code}|Check: vercel logs ${url} ; Check Supabase: is project paused?"
    elif [[ "${db_status:-PASS}" == "FAIL" ]]; then
      issue="FAIL|${name}|Supabase unreachable|Check Supabase dashboard for ref ${supabase_ref}"
    elif [[ "${ssl_status:-PASS}" == "FAIL" ]]; then
      issue="FAIL|${name}|SSL certificate issue|Check: vercel certs ls ; vercel certs issue ${domain}"
    fi
  elif [[ "$overall" == "WARN" ]]; then
    if ((http_ms > 1000)) 2>/dev/null; then
      issue="WARN|${name}|Response time ${http_ms}ms (> 1s)|Check: vercel logs ${url}"
    fi
    if [[ "${ssl_status:-PASS}" == "WARN" ]]; then
      local ssl_msg="SSL expires in ${ssl_days} days"
      if [[ "$hosting" =~ [Cc]loudflare ]]; then
        ssl_msg="${ssl_msg} (Cloudflare — check auto-renewal)"
      else
        ssl_msg="${ssl_msg} (Vercel — should auto-renew)"
      fi
      issue="${issue:+${issue};}WARN|${name}|${ssl_msg}|Check Vercel/Cloudflare dashboard"
    fi
    if [[ "${db_status:-PASS}" == "WARN" ]]; then
      issue="${issue:+${issue};}WARN|${name}|Supabase: ${db_detail}|Check: supabase inspect db outliers --project-ref ${supabase_ref}"
    fi
  fi

  echo "${category}|${overall}|${name}|${http_detail}|${extras}|${issue}" > "$result_file"
}

# ─── Deep check for single project ───────────────────────────────────
deep_check() {
  local name="$1" supabase_ref="$2" hosting="$3"
  local url
  url=$(resolve_url "$name" "$hosting")
  local domain
  domain=$(echo "$url" | sed -E 's|https?://([^/:]+).*|\1|')

  echo ""
  echo -e "${C_BOLD}══════════════════════════════════════════════════════${C_RESET}"
  echo -e "  ${C_BOLD}DEEP CHECK${C_RESET} — ${name}"
  echo -e "  URL: ${url}"
  echo -e "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  [[ -n "$supabase_ref" ]] && echo -e "  Supabase: ${supabase_ref}"
  echo -e "${C_BOLD}══════════════════════════════════════════════════════${C_RESET}"
  echo ""

  # HTTP check
  local http_result http_code http_ms
  http_result=$(check_http "$url")
  http_code=$(echo "$http_result" | cut -d'|' -f1)
  http_ms=$(echo "$http_result" | cut -d'|' -f2)
  if [[ "$http_code" == "200" ]] && ((http_ms < 1000)); then
    echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  HTTP Status          ${http_code} OK (${http_ms}ms)"
  elif [[ "$http_code" == "200" ]]; then
    echo -e "  ${C_YELLOW}${ICON_WARN} WARN${C_RESET}  HTTP Status          ${http_code} OK but slow (${http_ms}ms)"
  else
    echo -e "  ${C_RED}${ICON_FAIL} FAIL${C_RESET}  HTTP Status          ${http_code} (${http_ms}ms)"
  fi

  # Also check /api/health
  local health_code
  health_code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url/api/health" 2>/dev/null || echo "000")
  if [[ "$health_code" == "200" ]]; then
    echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  /api/health          ${health_code} OK"
  elif [[ "$health_code" == "404" ]]; then
    echo -e "  ${C_DIM}${ICON_SKIP} SKIP${C_RESET}  /api/health          Not found (no health endpoint)"
  else
    echo -e "  ${C_YELLOW}${ICON_WARN} WARN${C_RESET}  /api/health          ${health_code}"
  fi

  # SSL
  local ssl_result ssl_status ssl_days ssl_detail
  ssl_result=$(check_ssl "$domain")
  ssl_status=$(echo "$ssl_result" | cut -d'|' -f1)
  ssl_days=$(echo "$ssl_result" | cut -d'|' -f2)
  ssl_detail=$(echo "$ssl_result" | cut -d'|' -f3)
  if [[ "$ssl_status" == "PASS" ]]; then
    echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  SSL Certificate      Valid, expires in ${ssl_days} days"
  elif [[ "$ssl_status" == "WARN" ]]; then
    echo -e "  ${C_YELLOW}${ICON_WARN} WARN${C_RESET}  SSL Certificate      ${ssl_detail}"
  else
    echo -e "  ${C_RED}${ICON_FAIL} FAIL${C_RESET}  SSL Certificate      ${ssl_detail}"
  fi

  # Supabase health
  if [[ -n "$supabase_ref" ]]; then
    local db_result db_status db_ms db_detail
    db_result=$(check_supabase "$supabase_ref")
    db_status=$(echo "$db_result" | cut -d'|' -f1)
    db_ms=$(echo "$db_result" | cut -d'|' -f2)
    db_detail=$(echo "$db_result" | cut -d'|' -f3)
    if [[ "$db_status" == "PASS" ]]; then
      echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  Supabase REST        Reachable (${db_ms}ms)"
    elif [[ "$db_status" == "WARN" ]]; then
      echo -e "  ${C_YELLOW}${ICON_WARN} WARN${C_RESET}  Supabase REST        ${db_detail}"
    else
      echo -e "  ${C_RED}${ICON_FAIL} FAIL${C_RESET}  Supabase REST        ${db_detail}"
    fi

    # Supabase auth health
    local auth_response auth_status
    auth_response=$(curl -s --max-time "$TIMEOUT" "https://${supabase_ref}.supabase.co/auth/v1/health" 2>/dev/null || echo "")
    auth_status=$(echo "$auth_response" | jq -r '.status' 2>/dev/null || echo "")
    if [[ "$auth_status" == "ok" ]]; then
      echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  Supabase Auth        Healthy"
    elif [[ -n "$auth_response" ]]; then
      echo -e "  ${C_YELLOW}${ICON_WARN} WARN${C_RESET}  Supabase Auth        Status: ${auth_status:-unknown}"
    else
      echo -e "  ${C_RED}${ICON_FAIL} FAIL${C_RESET}  Supabase Auth        Unreachable"
    fi

    # Edge functions (if supabase CLI is available and project is linked)
    if command -v supabase &>/dev/null; then
      local func_count
      func_count=$(supabase functions list --project-ref "$supabase_ref" 2>/dev/null | grep -c "^│" || echo "0")
      if ((func_count > 0)); then
        echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  Edge Functions       ${func_count} deployed"
      else
        echo -e "  ${C_DIM}${ICON_SKIP} SKIP${C_RESET}  Edge Functions       None deployed"
      fi
    fi
  else
    echo -e "  ${C_DIM}${ICON_SKIP} SKIP${C_RESET}  Supabase             No Supabase ref"
  fi

  # Vercel deployment info (if vercel CLI available)
  if command -v vercel &>/dev/null; then
    # Try to get recent deployments
    local deploy_info
    deploy_info=$(vercel ls "$url" --limit 1 2>/dev/null | tail -1 || echo "")
    if [[ -n "$deploy_info" ]] && [[ ! "$deploy_info" =~ "Error" ]]; then
      echo -e "  ${C_GREEN}${ICON_PASS} PASS${C_RESET}  Last Deploy          ${deploy_info}"
    else
      echo -e "  ${C_DIM}${ICON_SKIP} SKIP${C_RESET}  Last Deploy          Could not fetch (not linked?)"
    fi
  fi

  echo ""
  echo -e "${C_BOLD}──────────────────────────────────────────────────────${C_RESET}"
}

# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

START_TIME=$(date +%s%N)
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

# Parse all projects from context
mapfile -t ALL_PROJECTS < <(parse_projects)

# Filter based on mode
if [[ "$MODE" == "deep" ]]; then
  # Find the target project
  found=false
  for proj in "${ALL_PROJECTS[@]}"; do
    IFS='|' read -r name status supabase_ref hosting category <<< "$proj"
    if [[ "${name,,}" == "${TARGET_PROJECT,,}" ]]; then
      deep_check "$name" "$supabase_ref" "$hosting"
      found=true
      break
    fi
  done
  if ! $found; then
    echo "ERROR: Project '${TARGET_PROJECT}' not found in qualia-context.md"
    echo "Available projects:"
    for proj in "${ALL_PROJECTS[@]}"; do
      IFS='|' read -r name status _ _ _ <<< "$proj"
      echo "  ${name} (${status})"
    done
    exit 1
  fi
  exit 0
fi

# Default/quick mode: check all active/maintenance/live projects
CHECKABLE=()
for proj in "${ALL_PROJECTS[@]}"; do
  IFS='|' read -r name status supabase_ref hosting category <<< "$proj"
  # Only check ACTIVE, MAINTENANCE, LIVE, BUILT projects
  case "${status^^}" in
    ACTIVE|MAINTENANCE|LIVE|BUILT) CHECKABLE+=("$proj") ;;
  esac
done

echo ""
echo -e "${C_BOLD}════════════════════════════════════════════════════${C_RESET}"
echo -e "  ${C_BOLD}QUALIA FLEET HEALTH${C_RESET} — ${TIMESTAMP}"
echo -e "  Checking: ${#CHECKABLE[@]} active/maintenance projects"
[[ "$MODE" == "quick" ]] && echo -e "  Mode: ${C_YELLOW}QUICK${C_RESET} (HTTP only)"
echo -e "${C_BOLD}════════════════════════════════════════════════════${C_RESET}"

# Launch all checks in parallel
PIDS=()
for proj in "${CHECKABLE[@]}"; do
  IFS='|' read -r name status supabase_ref hosting category <<< "$proj"
  check_project "$name" "$status" "$supabase_ref" "$hosting" "$category" &
  PIDS+=($!)
done

# Wait for all background checks to complete
for pid in "${PIDS[@]}"; do
  wait "$pid" 2>/dev/null || true
done

# Collect and display results grouped by category
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
CURRENT_CAT=""

# Sort results into a single file (avoids subshell from pipe)
for result_file in "$TMPDIR"/*.result; do
  [[ -f "$result_file" ]] || continue
  cat "$result_file"
done | sort -t'|' -k1,1 -k3,3 > "$TMPDIR/sorted-results.txt"

# Display results (no pipe — runs in current shell so counters persist)
while IFS='|' read -r category overall name http_detail extras issues; do
  # Print category header if changed
  if [[ "$category" != "$CURRENT_CAT" ]]; then
    CURRENT_CAT="$category"
    display_cat="${category//_/ }"
    echo ""
    echo -e "  ${C_DIM}${display_cat}${C_RESET}"
  fi

  # Print project line
  padded_name=$(printf "%-18s" "$name")
  color=""; icon=""
  case "$overall" in
    PASS) icon="$ICON_PASS"; color="$C_GREEN"; ((PASS_COUNT++)) || true ;;
    WARN) icon="$ICON_WARN"; color="$C_YELLOW"; ((WARN_COUNT++)) || true ;;
    FAIL) icon="$ICON_FAIL"; color="$C_RED"; ((FAIL_COUNT++)) || true ;;
  esac

  echo -e "  ${color}${icon} ${overall}${C_RESET}  ${color}${padded_name}${C_RESET} ${http_detail}${extras}"

  # Collect issues
  if [[ -n "$issues" ]]; then
    echo "$issues" >> "$TMPDIR/all-issues.txt"
  fi
done < "$TMPDIR/sorted-results.txt"

END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
ELAPSED_S=$(echo "scale=1; $ELAPSED_MS / 1000" | bc 2>/dev/null || echo "$((ELAPSED_MS / 1000))")

echo ""
echo -e "${C_BOLD}────────────────────────────────────────────────────${C_RESET}"
echo -e "  RESULT: ${C_GREEN}${PASS_COUNT} PASS${C_RESET} · ${C_YELLOW}${WARN_COUNT} WARN${C_RESET} · ${C_RED}${FAIL_COUNT} FAIL${C_RESET}"
echo -e "  Total check time: ${ELAPSED_S}s"
echo -e "${C_BOLD}────────────────────────────────────────────────────${C_RESET}"

# Print issues if any
if [[ -f "$TMPDIR/all-issues.txt" ]]; then
  echo ""
  echo -e "  ${C_BOLD}ISSUES FOUND:${C_RESET}"
  echo ""

  while IFS=';' read -ra issue_list; do
    for issue_entry in "${issue_list[@]}"; do
      IFS='|' read -r severity iname description action <<< "$issue_entry"
      local icolor
      if [[ "$severity" == "FAIL" ]]; then
        icolor="$C_RED"
      else
        icolor="$C_YELLOW"
      fi
      echo -e "  ${icolor}${severity}${C_RESET} ${iname} — ${description}"
      echo -e "    ${C_DIM}→ ${action}${C_RESET}"
      echo ""
    done
  done < "$TMPDIR/all-issues.txt"
fi

# Exit code
if ((FAIL_COUNT > 0)); then
  exit 1
fi
exit 0
