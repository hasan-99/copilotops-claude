---
name: status
description: "Fleet-wide health check for all Qualia projects — HTTP status, SSL, Supabase, response times. Flags issues without fixing them. Supports --quick and --project modes."
user-invocable: true
---

# Fleet Health Monitor

Diagnostic sweep across all active and maintenance Qualia projects. Flags problems, doesn't fix them.

## Usage

- `/status` — Check all active + maintenance projects (HTTP, SSL, Supabase, latency)
- `/status --quick` — HTTP status only (fast, ~15 seconds)
- `/status --project vero` — Deep check on a single project

## How It Works

### Step 1: Read qualia-context.md

ALWAYS read `~/.claude/knowledge/qualia-context.md` at the start. Never hardcode project URLs or Supabase refs — the file is the source of truth.

Extract all projects with status ACTIVE, MAINTENANCE, or LIVE. Skip DORMANT and DEV unless specifically requested.

Build the check list:
```
Project → URL (derive from project name: {name}.vercel.app) → Supabase ref (if any) → Hosting type
```

For projects where the URL isn't `{name}.vercel.app` (custom domains, Cloudflare, etc.), check the project's `.env.local` or Vercel dashboard.

Known special cases:
- `armenius` → Cloudflare Workers (not Vercel)
- `qualia` (ERP) → `qualia-erp.vercel.app`
- `sofiatesting` → verify the exact Vercel URL from project dir

### Step 2: Run Health Checks

Use `scripts/health-check.sh` for the actual HTTP/SSL checks. Run all projects in parallel using background processes.

**Default mode checks (per project):**

| Check | Method | PASS | WARN | FAIL |
|-------|--------|------|------|------|
| HTTP Status | `curl -sL -o /dev/null -w "%{http_code}" --max-time 10` | 200 | 301/302 (redirect) | 4xx, 5xx, timeout |
| Response Time | `curl -sL -o /dev/null -w "%{time_total}" --max-time 10` | < 1s | 1–3s | > 3s or timeout |
| SSL Certificate | `openssl s_client` + check expiry | > 30 days | 7–30 days | < 7 days or expired |
| Supabase Health | `curl https://{ref}.supabase.co/rest/v1/` | Reachable (200/401) | Slow (> 500ms) | Unreachable |

**Quick mode (`--quick`):** HTTP Status only. Skips SSL, Supabase, response time.

**Deep mode (`--project {name}`):** All default checks plus:
- Vercel deployment status (`vercel ls` in project dir)
- Last deploy time
- Supabase connection count (`supabase inspect db connections` or `pg_stat_activity`)
- Supabase auth health (`/auth/v1/health`)
- Edge function status (`supabase functions list`)

### Step 3: Generate Report

```
════════════════════════════════════════════════════
  QUALIA FLEET HEALTH — 2026-03-04 17:30 UTC
  Checking: 8 active/maintenance projects
════════════════════════════════════════════════════

  WEBSITES
  ✓ PASS  qualiafinal        200 OK  (287ms)  SSL: 68d
  ✓ PASS  vero               200 OK  (342ms)  SSL: 45d  DB: healthy
  ✓ PASS  aibossbrainz       200 OK  (198ms)  SSL: 45d  DB: healthy
  ⚠ WARN  aquador            200 OK  (1.8s)   SSL: 12d  DB: healthy
  ✓ PASS  glluztech          200 OK  (445ms)  SSL: 68d
  ✓ PASS  inrvo              200 OK  (312ms)  SSL: 68d
  ✓ PASS  maud               200 OK  (521ms)  SSL: 68d  DB: healthy
  ✓ PASS  mpm                200 OK  (389ms)  SSL: 68d  DB: healthy

  AI AGENTS
  ✓ PASS  sofiatesting       200 OK  (412ms)  SSL: 45d  DB: healthy

  VOICE
  ✓ PASS  under              200 OK  (267ms)  SSL: 45d  DB: healthy
  ⚠ WARN  armenius           200 OK  (890ms)  SSL: 22d

──────────────────────────────────────────────────
  RESULT: 9 PASS · 2 WARN · 0 FAIL
  Total check time: 12.4s
──────────────────────────────────────────────────
```

### Step 4: Flag Issues

If any check returns FAIL or WARN, print specific next steps below the report:

```
  ISSUES FOUND:

  ⚠ aquador — Response time 1.8s (threshold: 1s)
    → Check: vercel logs aquador.vercel.app
    → Check: supabase inspect db outliers --project-ref hznpuxplqgszbacxzbhv

  ⚠ armenius — SSL expires in 22 days
    → Check: Cloudflare dashboard → SSL/TLS → Edge Certificates
    → Note: Armenius uses Cloudflare, not Vercel (auto-renewal should handle this)
```

For FAIL results, be more urgent:
```
  ✗ FAIL  vero — HTTP 503 Service Unavailable
    → IMMEDIATE: Check Vercel dashboard for vero
    → Run: vercel logs vero.vercel.app
    → Check: Supabase dashboard → is project paused?
    → If unrecoverable: vercel rollback --prod
```

## Project URL Resolution

The script resolves project URLs in this order:

1. Check for `VERCEL_URL` or `NEXT_PUBLIC_SITE_URL` in project's `.env.local`
2. Check for custom domain in project's `vercel.json`
3. Fall back to `{project-name}.vercel.app`

Known URL overrides (kept in the health-check.sh script):
```bash
declare -A URL_OVERRIDES=(
  ["qualia"]="qualia-erp.vercel.app"
  # Add more as discovered
)
```

## Cron Integration

This skill is designed to work with a daily cron job:

```bash
# Run daily at 8am Cyprus time (5am UTC)
0 5 * * * bash ~/.claude/skills/status/scripts/health-check.sh --all > /tmp/qualia-health-$(date +\%Y\%m\%d).log 2>&1
```

The health-check.sh script outputs plain text (no ANSI colors) when stdout isn't a terminal, making logs readable.

To review the last health check:
```bash
cat /tmp/qualia-health-$(date +%Y%m%d).log
```

## Rules

- **Flag but don't fix** — this is diagnostic only. Never modify, deploy, or rollback.
- **Read qualia-context.md every time** — never hardcode URLs or refs.
- **10-second timeout per check** — don't hang on unresponsive projects.
- **Parallel execution** — run project checks concurrently using background processes.
- **curl only** — no extra dependencies for HTTP checks.
- **No secrets in output** — never print API keys, service role keys, or connection strings.
