#!/bin/bash
# Post-deploy 4-check verification
# Usage: verify.sh <URL>

URL="${1%/}"
if [[ -z "$URL" ]]; then
  echo "Usage: verify.sh <URL>"
  exit 1
fi

PASS=0
FAIL=0
SKIP=0

check() {
  local name="$1" result="$2" detail="$3"
  if [[ "$result" == "PASS" ]]; then
    echo "  [PASS] $name — $detail"
    ((PASS++))
  elif [[ "$result" == "SKIP" ]]; then
    echo "  [SKIP] $name — $detail"
    ((SKIP++))
  else
    echo "  [FAIL] $name — $detail"
    ((FAIL++))
  fi
}

echo "=== Deploy Verification: $URL ==="
echo ""

# 1. HTTP 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$URL")
if [[ "$STATUS" == "200" ]]; then
  check "HTTP Status" "PASS" "$STATUS"
else
  check "HTTP Status" "FAIL" "Got $STATUS (expected 200)"
fi

# 2. Auth flow — check common auth endpoints
AUTH_CHECKED=false
for AUTH_PATH in "/api/auth/callback" "/auth/callback" "/api/auth/session"; do
  AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$URL$AUTH_PATH" 2>/dev/null)
  if [[ "$AUTH_STATUS" != "000" && "$AUTH_STATUS" != "404" ]]; then
    check "Auth Endpoint" "PASS" "$AUTH_PATH responded with $AUTH_STATUS"
    AUTH_CHECKED=true
    break
  fi
done
if [[ "$AUTH_CHECKED" == "false" ]]; then
  check "Auth Endpoint" "SKIP" "No auth endpoints detected"
fi

# 3. Console errors — check for JS errors in page source (basic check)
PAGE_CONTENT=$(curl -s -L --max-time 10 "$URL")
if echo "$PAGE_CONTENT" | grep -qi "internal server error\|500 error\|application error"; then
  check "Page Errors" "FAIL" "Server error detected in page content"
elif echo "$PAGE_CONTENT" | grep -qi "<!DOCTYPE\|<html"; then
  check "Page Errors" "PASS" "No server errors in page content"
else
  check "Page Errors" "FAIL" "Unexpected response (not HTML)"
fi

# 4. API latency — measure homepage response time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" -L --max-time 10 "$URL")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null | cut -d. -f1)
if [[ -n "$RESPONSE_MS" && "$RESPONSE_MS" -lt 500 ]]; then
  check "Response Time" "PASS" "${RESPONSE_MS}ms (< 500ms)"
elif [[ -n "$RESPONSE_MS" ]]; then
  check "Response Time" "FAIL" "${RESPONSE_MS}ms (> 500ms threshold)"
else
  check "Response Time" "FAIL" "Could not measure (timeout?)"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $SKIP skipped ==="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
