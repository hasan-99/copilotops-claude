#!/bin/bash
# verify.sh — Production deploy verification (8 checks with retry logic)
# Usage: verify.sh <URL> [--project-dir /path/to/project]
#
# Checks: HTTP Status, Auth Flow, Console Errors, API Latency,
#          DB Connectivity, Core Web Vitals, Dependencies, SSL Certificate

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAX_RETRIES=3
RETRY_DELAYS=(5 15 30)  # Exponential backoff in seconds
LATENCY_PASS=500         # ms
LATENCY_WARN=1000        # ms
SSL_WARN_DAYS=30
SSL_FAIL_DAYS=7
DB_LATENCY_WARN=500      # ms

# ─── Parse args ───────────────────────────────────────────────────────
URL=""
PROJECT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    -*) echo "Unknown option: $1"; exit 1 ;;
    *) URL="${1%/}"; shift ;;
  esac
done

if [[ -z "$URL" ]]; then
  echo "Usage: verify.sh <URL> [--project-dir /path/to/project]"
  exit 1
fi

# ─── Project detection ────────────────────────────────────────────────
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
source "$SCRIPT_DIR/project-detect.sh" "$PROJECT_DIR" 2>/dev/null || true

# Extract domain from URL
DOMAIN=$(echo "$URL" | sed -E 's|https?://([^/:]+).*|\1|')

# ─── State ────────────────────────────────────────────────────────────
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
CRITICAL_FAIL=false
START_TIME=$(date +%s%N)
RESULTS=()

# ─── Output helpers ───────────────────────────────────────────────────
icon_pass="✓" icon_warn="⚠" icon_fail="✗" icon_skip="○"
C_RESET="\033[0m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"
C_DIM="\033[2m"
C_BOLD="\033[1m"

record() {
  local status="$1" name="$2" detail="$3"
  local icon color
  case "$status" in
    PASS) icon="$icon_pass"; color="$C_GREEN"; ((PASS_COUNT++)) || true ;;
    WARN) icon="$icon_warn"; color="$C_YELLOW"; ((WARN_COUNT++)) || true ;;
    FAIL) icon="$icon_fail"; color="$C_RED"; ((FAIL_COUNT++)) || true ;;
    SKIP) icon="$icon_skip"; color="$C_DIM"; ((SKIP_COUNT++)) || true ;;
  esac
  # Pad name to 20 chars
  local padded
  padded=$(printf "%-20s" "$name")
  RESULTS+=("$(printf "  ${color}${icon} %-4s${C_RESET}  ${color}${padded}${C_RESET} ${detail}" "$status")")
}

log_retry() {
  local name="$1" attempt="$2" delay="$3"
  echo -e "  ${C_DIM}⟳ Retrying ${name} (attempt ${attempt}/${MAX_RETRIES}, waiting ${delay}s)...${C_RESET}"
}

# ─── Retry wrapper ────────────────────────────────────────────────────
# Usage: with_retry "Check Name" check_function
# The check_function should set CHECK_STATUS (PASS/WARN/FAIL) and CHECK_DETAIL
with_retry() {
  local name="$1"
  shift
  local func="$1"
  shift

  for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
    CHECK_STATUS=""
    CHECK_DETAIL=""
    "$func" "$@" || true

    if [[ "$CHECK_STATUS" == "PASS" || "$CHECK_STATUS" == "WARN" || "$CHECK_STATUS" == "SKIP" ]]; then
      record "$CHECK_STATUS" "$name" "$CHECK_DETAIL"
      return
    fi

    # Failed — retry if not last attempt
    if ((attempt < MAX_RETRIES)); then
      local delay=${RETRY_DELAYS[$((attempt-1))]}
      log_retry "$name" "$((attempt+1))" "$delay"
      sleep "$delay"
    fi
  done

  # All retries exhausted
  record "FAIL" "$name" "$CHECK_DETAIL"
}

# ─── Check 1: HTTP Status (CRITICAL) ─────────────────────────────────
check_http() {
  # Check root URL
  local http_code response_time
  http_code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 15 "$URL" 2>/dev/null || echo "000")
  response_time=$(curl -sL -o /dev/null -w "%{time_total}" --max-time 15 "$URL" 2>/dev/null || echo "0")
  local ms
  ms=$(echo "$response_time * 1000" | bc 2>/dev/null | cut -d. -f1)
  ms=${ms:-0}

  # Check /api/health if it exists
  local health_code=""
  health_code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$URL/api/health" 2>/dev/null || echo "000")

  local health_note=""
  if [[ "$health_code" == "200" ]]; then
    health_note=", /api/health: ${health_code}"
  fi

  if [[ "$http_code" == "200" ]]; then
    CHECK_STATUS="PASS"
    CHECK_DETAIL="${http_code} OK (${ms}ms)${health_note}"
  elif [[ "$http_code" =~ ^3[0-9]{2}$ ]]; then
    CHECK_STATUS="WARN"
    CHECK_DETAIL="Redirect ${http_code} (may need to check final destination)"
  elif [[ "$http_code" == "000" ]]; then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Connection failed — timeout or DNS error"
    CRITICAL_FAIL=true
  else
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Got HTTP ${http_code} (expected 200)"
    CRITICAL_FAIL=true
  fi
}

# ─── Check 2: Auth Flow ──────────────────────────────────────────────
check_auth() {
  local found_auth=false
  local auth_details=()

  # Step 1: Check protected routes for redirect behavior
  for route in "/dashboard" "/admin" "/app" "/account"; do
    # Use -D to capture headers, don't follow redirects
    local headers
    headers=$(curl -sI --max-time 10 "$URL$route" 2>/dev/null || echo "")
    local status_line
    status_line=$(echo "$headers" | head -1)

    if echo "$status_line" | grep -qE "30[1237]"; then
      local location
      location=$(echo "$headers" | grep -i "^location:" | head -1 | tr -d '\r' | awk '{print $2}')
      if echo "$location" | grep -qiE "(login|auth|sign.?in)"; then
        auth_details+=("Protected ${route} → redirect to login")
        found_auth=true
        break
      fi
    elif echo "$status_line" | grep -q "401"; then
      auth_details+=("Protected ${route} → 401 Unauthorized")
      found_auth=true
      break
    fi
  done

  # Step 2: Supabase auth health (if ref available)
  if [[ -n "${SUPABASE_REF:-}" ]]; then
    local auth_health
    auth_health=$(curl -s --max-time 10 "https://${SUPABASE_REF}.supabase.co/auth/v1/health" 2>/dev/null || echo "")
    local auth_status
    auth_status=$(echo "$auth_health" | jq -r '.status' 2>/dev/null || echo "")

    if [[ "$auth_status" == "ok" ]]; then
      auth_details+=("Supabase auth healthy")
      found_auth=true
    elif [[ -n "$auth_health" ]]; then
      CHECK_STATUS="FAIL"
      CHECK_DETAIL="Supabase auth unhealthy: $auth_health"
      return
    fi
  fi

  # Step 3: Check auth callback endpoints
  for path in "/api/auth/callback" "/auth/callback" "/api/auth/session"; do
    local cb_status
    cb_status=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$URL$path" 2>/dev/null || echo "000")
    if [[ "$cb_status" != "404" && "$cb_status" != "000" ]]; then
      auth_details+=("${path} → ${cb_status}")
      found_auth=true
      break
    fi
  done

  if $found_auth; then
    CHECK_STATUS="PASS"
    CHECK_DETAIL=$(IFS=", "; echo "${auth_details[*]}")
  else
    CHECK_STATUS="SKIP"
    CHECK_DETAIL="No auth endpoints detected"
  fi
}

# ─── Check 3: Console Errors ─────────────────────────────────────────
check_console() {
  local result
  result=$(node "$SCRIPT_DIR/check-console-errors.js" "$URL" 2>/dev/null || echo '{"status":"SKIP","detail":"Playwright unavailable"}')

  CHECK_STATUS=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "SKIP")
  CHECK_DETAIL=$(echo "$result" | jq -r '.detail' 2>/dev/null || echo "Could not parse result")

  # Fallback if Playwright failed — do basic curl check
  if [[ "$CHECK_STATUS" == "SKIP" ]]; then
    local page
    page=$(curl -sL --max-time 10 "$URL" 2>/dev/null || echo "")
    if echo "$page" | grep -qi "internal server error\|500 error\|application error"; then
      CHECK_STATUS="FAIL"
      CHECK_DETAIL="Server error detected in page HTML (degraded check — Playwright unavailable)"
    elif echo "$page" | grep -qi "<!DOCTYPE\|<html"; then
      CHECK_STATUS="WARN"
      CHECK_DETAIL="HTML OK but full browser check skipped (Playwright unavailable)"
    else
      CHECK_STATUS="FAIL"
      CHECK_DETAIL="Response is not HTML (degraded check)"
    fi
  fi
}

# ─── Check 4: API Latency ────────────────────────────────────────────
check_latency() {
  local measurements=()
  local endpoints=("$URL")

  # Add /api/health if it responds
  local health_check
  health_check=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 5 "$URL/api/health" 2>/dev/null || echo "000")
  if [[ "$health_check" == "200" ]]; then
    endpoints+=("$URL/api/health")
  fi

  local details=()
  local worst_status="PASS"

  for endpoint in "${endpoints[@]}"; do
    local times=()
    for i in 1 2 3; do
      local t
      t=$(curl -sL -o /dev/null -w "%{time_total}" --max-time 15 "$endpoint" 2>/dev/null || echo "99")
      local ms
      ms=$(echo "$t * 1000" | bc 2>/dev/null | cut -d. -f1)
      times+=("${ms:-9999}")
    done

    # Sort and take median
    IFS=$'\n' sorted=($(sort -n <<<"${times[*]}")); unset IFS
    local median=${sorted[1]}

    local label
    label=$(echo "$endpoint" | sed "s|${URL}||")
    label=${label:-"/"}

    local status_icon
    if ((median < LATENCY_PASS)); then
      status_icon="✓"
      # worst stays as is
    elif ((median < LATENCY_WARN)); then
      status_icon="⚠"
      if [[ "$worst_status" == "PASS" ]]; then worst_status="WARN"; fi
    else
      status_icon="✗"
      worst_status="FAIL"
    fi
    details+=("${label}: ${median}ms ${status_icon}")
  done

  CHECK_STATUS="$worst_status"
  CHECK_DETAIL=$(IFS=", "; echo "${details[*]}")
}

# ─── Check 5: Database Connectivity ──────────────────────────────────
check_db() {
  if [[ -z "${SUPABASE_REF:-}" ]]; then
    CHECK_STATUS="SKIP"
    CHECK_DETAIL="No Supabase ref detected"
    return
  fi

  local start_ns end_ns
  start_ns=$(date +%s%N)

  # Try Supabase REST health endpoint first (doesn't need auth)
  local rest_status
  rest_status=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 \
    "https://${SUPABASE_REF}.supabase.co/rest/v1/" \
    -H "apikey: placeholder" 2>/dev/null || echo "000")

  end_ns=$(date +%s%N)
  local db_ms=$(( (end_ns - start_ns) / 1000000 ))

  # REST endpoint returns 401 with invalid key but that means it's reachable
  if [[ "$rest_status" =~ ^(200|401|403)$ ]]; then
    if ((db_ms > DB_LATENCY_WARN)); then
      CHECK_STATUS="WARN"
      CHECK_DETAIL="Supabase reachable but slow (${db_ms}ms)"
    else
      CHECK_STATUS="PASS"
      CHECK_DETAIL="Supabase responding (${db_ms}ms)"
    fi
  elif [[ "$rest_status" == "000" ]]; then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Supabase unreachable (connection timeout)"
  else
    CHECK_STATUS="WARN"
    CHECK_DETAIL="Supabase returned HTTP ${rest_status} (${db_ms}ms)"
  fi
}

# ─── Check 6: Core Web Vitals ────────────────────────────────────────
check_cwv() {
  local result
  result=$(node "$SCRIPT_DIR/check-cwv.js" "$URL" 2>/dev/null || echo '{"status":"SKIP","detail":"CWV check failed"}')

  CHECK_STATUS=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "SKIP")
  CHECK_DETAIL=$(echo "$result" | jq -r '.detail' 2>/dev/null || echo "Could not run CWV check")
}

# ─── Check 7: Dependency Services ────────────────────────────────────
check_deps() {
  # Status/health endpoints for known services
  declare -A DEP_URLS=(
    ["stripe"]="https://status.stripe.com/api/v2/status.json"
    ["vapi"]="https://api.vapi.ai/health"
    ["openrouter"]="https://openrouter.ai/api/v1/models"
    ["elevenlabs"]="https://api.elevenlabs.io/v1/models"
    ["retell"]="https://api.retellai.com/v2/agent"
    ["telnyx"]="https://api.telnyx.com/v2/available_phone_numbers"
  )

  # Detect deps from env files
  local detected_deps=()
  for env_file in "$PROJECT_DIR/.env.local" "$PROJECT_DIR/.env"; do
    if [[ -f "$env_file" ]]; then
      local vars
      vars=$(grep -oP '^[A-Z_]+(?==)' "$env_file" 2>/dev/null || true)
      for var in $vars; do
        case "$var" in
          VAPI_*|NEXT_PUBLIC_VAPI_*) detected_deps+=("vapi") ;;
          OPENROUTER_*) detected_deps+=("openrouter") ;;
          ELEVEN_LABS_*|ELEVENLABS_*) detected_deps+=("elevenlabs") ;;
          RETELL_*) detected_deps+=("retell") ;;
          STRIPE_*|NEXT_PUBLIC_STRIPE_*) detected_deps+=("stripe") ;;
          TELNYX_*) detected_deps+=("telnyx") ;;
        esac
      done
      break
    fi
  done

  # Deduplicate
  if [[ ${#detected_deps[@]} -gt 0 ]]; then
    IFS=$'\n' detected_deps=($(printf '%s\n' "${detected_deps[@]}" | sort -u)); unset IFS
  fi

  if [[ ${#detected_deps[@]} -eq 0 ]]; then
    CHECK_STATUS="SKIP"
    CHECK_DETAIL="No external dependencies detected"
    return
  fi

  local results=()
  local worst="PASS"

  for dep in "${detected_deps[@]}"; do
    local dep_url="${DEP_URLS[$dep]:-}"
    if [[ -z "$dep_url" ]]; then continue; fi

    local dep_status
    dep_status=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$dep_url" 2>/dev/null || echo "000")

    if [[ "$dep_status" =~ ^(200|401|403)$ ]]; then
      results+=("${dep} ✓")
    else
      results+=("${dep} ✗ (${dep_status})")
      if [[ "$worst" != "FAIL" ]]; then worst="WARN"; fi
    fi
  done

  CHECK_STATUS="$worst"
  CHECK_DETAIL=$(IFS=", "; echo "${results[*]}")
}

# ─── Check 8: SSL Certificate ────────────────────────────────────────
check_ssl() {
  # Get certificate expiry
  local cert_output
  cert_output=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null)

  if [[ -z "$cert_output" ]]; then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Could not connect to $DOMAIN:443 for SSL check"
    return
  fi

  local expiry_date
  expiry_date=$(echo "$cert_output" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [[ -z "$expiry_date" ]]; then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Could not parse SSL certificate"
    return
  fi

  # Calculate days until expiry
  local expiry_epoch now_epoch days_left
  expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date --date="$expiry_date" +%s 2>/dev/null)
  now_epoch=$(date +%s)
  days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

  # Verify cert matches domain
  local cert_cn
  cert_cn=$(echo "$cert_output" | openssl x509 -noout -subject 2>/dev/null | grep -oP 'CN\s*=\s*\K.*' || echo "")
  local cert_san
  cert_san=$(echo "$cert_output" | openssl x509 -noout -ext subjectAltName 2>/dev/null || echo "")

  local domain_match=false
  if echo "$cert_cn $cert_san" | grep -qi "$DOMAIN"; then
    domain_match=true
  fi
  # Wildcard check
  local parent_domain
  parent_domain=$(echo "$DOMAIN" | sed 's/^[^.]*\.//')
  if echo "$cert_cn $cert_san" | grep -qi "\*\.$parent_domain"; then
    domain_match=true
  fi

  if ((days_left < 0)); then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Certificate EXPIRED ${days_left#-} days ago!"
  elif ((days_left < SSL_FAIL_DAYS)); then
    CHECK_STATUS="FAIL"
    CHECK_DETAIL="Certificate expires in ${days_left} days (< ${SSL_FAIL_DAYS}d threshold)"
  elif ((days_left < SSL_WARN_DAYS)); then
    CHECK_STATUS="WARN"
    CHECK_DETAIL="Valid, expires in ${days_left} days (renew soon)"
  elif ! $domain_match; then
    CHECK_STATUS="WARN"
    CHECK_DETAIL="Valid (${days_left}d) but domain mismatch — CN: ${cert_cn}"
  else
    CHECK_STATUS="PASS"
    CHECK_DETAIL="Valid, expires in ${days_left} days"
  fi
}

# ═══════════════════════════════════════════════════════════════════════
# Main execution
# ═══════════════════════════════════════════════════════════════════════

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

echo ""
echo -e "${C_BOLD}══════════════════════════════════════════════════════${C_RESET}"
echo -e "  ${C_BOLD}DEPLOY VERIFICATION${C_RESET} — ${PROJECT_NAME:-unknown}"
echo -e "  URL: ${URL}"
echo -e "  Timestamp: ${TIMESTAMP}"
if [[ -n "${SUPABASE_REF:-}" ]]; then
  echo -e "  Supabase: ${SUPABASE_REF}"
fi
echo -e "${C_BOLD}══════════════════════════════════════════════════════${C_RESET}"
echo ""

# Run checks — HTTP first (critical gate)
with_retry "HTTP Status" check_http

if $CRITICAL_FAIL; then
  echo -e "\n  ${C_RED}${C_BOLD}CRITICAL: Site is unreachable — skipping remaining checks${C_RESET}"
  echo -e "  ${C_RED}Action: vercel rollback --prod${C_RESET}\n"
else
  with_retry "Auth Flow" check_auth
  with_retry "Console Errors" check_console
  with_retry "API Latency" check_latency
  with_retry "DB Connectivity" check_db
  with_retry "Core Web Vitals" check_cwv
  with_retry "Dependencies" check_deps
  with_retry "SSL Certificate" check_ssl
fi

# ─── Print results ────────────────────────────────────────────────────
echo ""
for line in "${RESULTS[@]}"; do
  echo -e "$line"
done

END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
ELAPSED_S=$(echo "scale=1; $ELAPSED_MS / 1000" | bc 2>/dev/null || echo "$((ELAPSED_MS / 1000))")

echo ""
echo -e "${C_BOLD}──────────────────────────────────────────────────────${C_RESET}"
echo -e "  RESULT: ${C_GREEN}${PASS_COUNT} PASS${C_RESET} · ${C_YELLOW}${WARN_COUNT} WARN${C_RESET} · ${C_RED}${FAIL_COUNT} FAIL${C_RESET} · ${C_DIM}${SKIP_COUNT} SKIP${C_RESET}"
echo -e "  Total verification time: ${ELAPSED_S}s"
echo -e "${C_BOLD}──────────────────────────────────────────────────────${C_RESET}"

# ─── Failure guidance ─────────────────────────────────────────────────
if ((FAIL_COUNT >= 2)) || $CRITICAL_FAIL; then
  echo ""
  echo -e "  ${C_RED}${C_BOLD}⚠ ROLLBACK RECOMMENDED${C_RESET}"
  echo -e "  ${C_DIM}Run: vercel rollback --prod${C_RESET}"
  echo -e "  ${C_DIM}Then: bash $SCRIPT_DIR/verify.sh $URL${C_RESET}"
  echo ""
elif ((FAIL_COUNT == 1)); then
  echo ""
  echo -e "  ${C_YELLOW}${C_BOLD}⚠ 1 check failed — investigate before proceeding${C_RESET}"
  echo -e "  ${C_DIM}Check: vercel logs $URL${C_RESET}"
  echo ""
fi

# Exit code: 0 if no failures, 1 if any fail, 2 if critical
if $CRITICAL_FAIL; then
  exit 2
elif ((FAIL_COUNT > 0)); then
  exit 1
fi
exit 0
