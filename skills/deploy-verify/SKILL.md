---
name: deploy-verify
description: Run post-deploy 8-check verification (HTTP, auth, console errors, latency, DB, CWV, dependencies, SSL) against any deployed URL. Automatically invoked after vercel --prod deployments.
user-invocable: true
---

# Deploy Verification

Production verification suite — 8 checks with retry logic, auto-detection of the current project, and actionable failure remediation.

Invoked automatically after `vercel --prod` (via PostToolUse hook) or manually with `/deploy-verify <URL>`.

## Project Auto-Detection

The skill determines which project is being verified:

1. Read the current working directory name
2. Match against the project inventory in `~/.claude/knowledge/qualia-context.md`
3. Extract: project name, Supabase ref (if any), hosting type, known endpoints
4. If no match: run in generic mode (skip Supabase-specific checks)

This means you don't need to pass a Supabase ref or project name — it's derived from context.

## The 8 Checks

### Check 1: HTTP Status (CRITICAL)

Verify the site loads successfully.

- **Endpoints tested:** Root URL (`/`) and `/api/health` (if it exists)
- **Retry:** 3 attempts with exponential backoff (5s → 15s → 30s)
- **Follow redirects** (`-L`) — but log the redirect chain
- **PASS:** HTTP 200 on root URL
- **WARN:** HTTP 200 but only after redirect (3xx → 200)
- **FAIL:** Any non-200 final status, timeout, or connection refused
- **CRITICAL:** If root URL fails all 3 retries, halt verification — nothing else matters

```bash
# Core logic
curl -sL -o /dev/null -w "%{http_code}" --max-time 15 "$URL"
curl -sL -o /dev/null -w "%{http_code}" --max-time 15 "$URL/api/health"
```

### Check 2: Auth Flow

Verify authentication is functional (if the project uses auth).

- **Step 1:** Hit a known protected route (e.g., `/dashboard`, `/admin`, `/app`)
  - Expect: 302/307 redirect to login page OR 401
  - PASS if redirect target contains `/login`, `/auth`, `/sign-in`
- **Step 2:** Check Supabase auth health (if project has a Supabase ref)
  - Query: `https://<ref>.supabase.co/auth/v1/health`
  - Expect: HTTP 200 with `{"status":"ok"}`
- **Step 3:** Verify auth callback endpoint exists
  - Check: `/api/auth/callback`, `/auth/callback`
  - Expect: non-404 response
- **PASS:** Protected route redirects correctly AND Supabase auth is healthy
- **WARN:** Auth callback exists but protected route test is ambiguous
- **SKIP:** No auth endpoints detected and no Supabase ref (static site)
- **FAIL:** Supabase auth unhealthy, or protected route returns 500

```bash
# Supabase auth health
curl -s "https://${SUPABASE_REF}.supabase.co/auth/v1/health" | jq -r '.status'
```

### Check 3: Console Errors (Headless Browser)

Detect client-side JavaScript errors using Playwright.

- **How:** Run `scripts/check-console-errors.js` which:
  1. Launches headless Chromium via Playwright
  2. Navigates to the URL
  3. Listens for `console.error` and `pageerror` events
  4. Waits for `networkidle`
  5. Returns collected errors
- **PASS:** Zero console errors
- **WARN:** Console errors present but all are known benign patterns (e.g., third-party tracking, browser extension noise)
- **FAIL:** Any console error matching: `TypeError`, `ReferenceError`, `SyntaxError`, `ChunkLoadError`, `Unhandled`, `NEXT_`, `500`, `Internal Server Error`
- **Fallback:** If Playwright unavailable, fall back to curl-based HTML inspection (check for server error strings in page source — same as the old approach, clearly marked as degraded)

```bash
node ~/.claude/skills/deploy-verify/scripts/check-console-errors.js "$URL"
```

### Check 4: API Latency

Measure response times against defined thresholds.

- **Endpoints tested:** At minimum the root URL + one API route (auto-detected or `/api/health`)
- **Thresholds:**
  - `< 500ms` → **PASS** (green)
  - `500ms – 1000ms` → **WARN** (yellow — acceptable but monitor)
  - `> 1000ms` → **FAIL** (red — too slow for production)
- **Measurement:** `curl -w "%{time_total}"` — measures full request cycle (DNS + connect + TLS + transfer)
- **Run 3 times** and report the median to avoid outliers

```bash
# Measure in ms
curl -sL -o /dev/null -w "%{time_total}" --max-time 15 "$URL" | awk '{printf "%.0f", $1 * 1000}'
```

### Check 5: Database Connectivity (NEW)

Verify Supabase is reachable and responding.

- **Requires:** Supabase ref from qualia-context.md
- **Method:** Use the Supabase REST API to run a simple health query
  - `GET https://<ref>.supabase.co/rest/v1/?apikey=<anon_key>` — should return non-error
  - OR use `supabase` CLI: `supabase db execute --project-ref <ref> "SELECT 1"`
- **PASS:** Query returns successfully
- **WARN:** Query succeeds but latency > 500ms
- **FAIL:** Connection refused, timeout, or auth error
- **SKIP:** Project has no Supabase ref (static site)

```bash
# CLI approach
supabase db execute --project-ref "$SUPABASE_REF" "SELECT 1 AS health"
```

### Check 6: Core Web Vitals (NEW)

Measure LCP, CLS, and INP using Google PageSpeed Insights API.

- **Method:** Run `scripts/check-cwv.js` which calls the PageSpeed Insights API (no key needed for basic usage)
  - `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile`
- **Metrics and thresholds** (from Google's standards):
  - **LCP** (Largest Contentful Paint): < 2.5s PASS, 2.5–4s WARN, > 4s FAIL
  - **CLS** (Cumulative Layout Shift): < 0.1 PASS, 0.1–0.25 WARN, > 0.25 FAIL
  - **INP** (Interaction to Next Paint): < 200ms PASS, 200–500ms WARN, > 500ms FAIL
- **PASS:** All three metrics in green
- **WARN:** Any metric in yellow range
- **FAIL:** Any metric in red range
- **Fallback:** If API is unreachable, mark as SKIP with note

```bash
node ~/.claude/skills/deploy-verify/scripts/check-cwv.js "$URL"
```

### Check 7: Dependency Services (NEW)

Verify external services the project depends on.

- **Auto-detect dependencies** by reading the project's `.env.local` or `.env` variable names (not values):
  - `NEXT_PUBLIC_SUPABASE_URL` → Supabase (already checked in #5)
  - `VAPI_*` → VAPI API health
  - `OPENROUTER_*` → OpenRouter status
  - `ELEVEN_LABS_*` → ElevenLabs status
  - `RETELL_*` → Retell AI status
  - `STRIPE_*` → Stripe API status
  - `TELNYX_*` → Telnyx status
- **Method:** HTTP GET to each service's known status/health endpoint
- **PASS:** All detected services responding
- **WARN:** A non-critical service is degraded (e.g., analytics)
- **FAIL:** A critical dependency is down
- **SKIP:** No external dependencies detected beyond Supabase

### Check 8: SSL Certificate (NEW)

Verify TLS certificate validity.

- **Method:** `openssl s_client` to inspect the certificate
- **Check:** Certificate is valid, matches the domain, and has > 30 days until expiry
- **PASS:** Valid cert, > 30 days remaining
- **WARN:** Valid cert, 7–30 days remaining
- **FAIL:** Expired, mismatched domain, or < 7 days remaining

```bash
echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates -checkend 2592000
```

## Retry Logic

Applied to **every check** (not just HTTP):

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1st     | Immediate         |
| 2nd     | 5 seconds         |
| 3rd     | 15 seconds        |
| Final   | 30 seconds        |

- A check only gets status FAIL after **all retries exhausted**
- Between retries, log: `⟳ Retrying <check> (attempt 2/3, waiting 15s)...`
- Checks that PASS or WARN on any attempt stop retrying

## Output Format

```
══════════════════════════════════════════════════════
  DEPLOY VERIFICATION — projectname
  URL: https://project.vercel.app
  Timestamp: 2026-03-04 17:30:42 UTC
══════════════════════════════════════════════════════

  ✓ PASS  HTTP Status        200 OK (142ms)
  ✓ PASS  Auth Flow          Protected /dashboard → /login redirect, Supabase auth healthy
  ⚠ WARN  Console Errors     1 non-critical error (third-party tracking pixel)
  ✓ PASS  API Latency        Root: 287ms, /api/health: 145ms
  ✓ PASS  DB Connectivity    Supabase responding (89ms)
  ⚠ WARN  Core Web Vitals    LCP: 2.1s ✓  CLS: 0.12 ⚠  INP: 95ms ✓
  ✓ PASS  Dependencies       Stripe ✓  VAPI ✓
  ✓ PASS  SSL Certificate    Valid, expires in 68 days

──────────────────────────────────────────────────────
  RESULT: 6 PASS · 2 WARN · 0 FAIL
  Total verification time: 34.2s
──────────────────────────────────────────────────────
```

- Each line shows: status icon, check name (padded), and specific detail
- Timestamps in UTC
- Total time measured from start to finish

## When Verification Fails

### Decision Tree

```
                    ┌─────────────────┐
                    │  Run 8 Checks   │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
          All PASS/WARN              Any FAIL
                │                         │
          ✅ Deploy OK           ┌────────┴────────┐
                                 │                  │
                           1 FAIL only        2+ FAIL
                                 │                  │
                        Investigate &          ROLLBACK
                        fix specific       immediately
                        check                   │
                                          ┌─────┴──────┐
                                          │            │
                                    HTTP FAIL    Other FAIL
                                    (CRITICAL)        │
                                          │      vercel rollback
                                    IMMEDIATE        --prod
                                    ROLLBACK          │
                                          │      Re-verify
                                    vercel rollback   previous
                                      --prod       deployment
```

### Severity Levels

- **CRITICAL** (immediate rollback): HTTP Status fails (site is down)
- **HIGH** (rollback if can't fix in 10 min): Auth flow broken, DB connectivity lost
- **MEDIUM** (investigate, no rollback): Console errors, high latency, SSL warning
- **LOW** (monitor): CWV warnings, dependency warnings

### Rollback Procedure

```bash
# 1. Rollback to previous deployment
vercel rollback --prod

# 2. Re-run verification on rolled-back version
bash ~/.claude/skills/deploy-verify/scripts/verify.sh <URL>

# 3. Investigate the failed deployment
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

### What to Check Per Failure

| Failed Check        | First Step                                           |
|---------------------|------------------------------------------------------|
| HTTP Status         | `vercel logs <url>` — check for build/runtime errors |
| Auth Flow           | Check Supabase dashboard → Auth → Settings           |
| Console Errors      | Open browser DevTools → Console, look for the error  |
| API Latency         | `vercel logs <url>` — check for slow queries         |
| DB Connectivity     | Supabase dashboard → Database → check if paused      |
| Core Web Vitals     | PageSpeed Insights → check largest element, layout shifts |
| Dependencies        | Check service status page for the failing provider   |
| SSL Certificate     | Vercel dashboard → Domains → check cert status       |

## Scripts

All helper scripts live in `~/.claude/skills/deploy-verify/scripts/`:

| Script                    | Purpose                                    |
|---------------------------|-------------------------------------------|
| `verify.sh`              | Main orchestrator — runs all 8 checks      |
| `check-console-errors.js`| Playwright headless browser console check  |
| `check-cwv.js`           | PageSpeed Insights API for Core Web Vitals |
| `project-detect.sh`      | Auto-detect project from cwd               |

## Usage

```bash
# Auto-detect project, run full verification
bash ~/.claude/skills/deploy-verify/scripts/verify.sh <URL>

# The skill is also invoked automatically by the PostToolUse hook
# after any `vercel --prod` command completes
```

## Pre-Deploy Review Check

Before running verification, check if a `/review` was completed for the current changes:

1. Look for CRITICAL or HIGH findings from a recent `/review` run
2. If unresolved CRITICAL/HIGH findings exist → **WARN** and list them before proceeding
3. If no `/review` was run → **WARN** with suggestion: "Consider running `/review` before deploying"
4. This is advisory only — it does not block verification

Recommended workflow: `/review` → fix findings → `/ship` → (auto-triggers `/deploy-verify`)

## When to Invoke

- Automatically after `vercel --prod` (PostToolUse hook)
- After any production deployment via `/ship`
- Manually when you want to verify a live deployment
- After a rollback to confirm the previous version is healthy
