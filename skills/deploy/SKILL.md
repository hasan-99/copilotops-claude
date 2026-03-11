---
name: deploy
description: "Deploy to Vercel - full pipeline, quick push, or troubleshoot deployment issues. Use --quick for fast deploy, --fix for troubleshooting, or no flag for full pipeline."
tags: [deployment, vercel, ci-cd, production]
---

# Deploy

Complete deployment management for Vercel + Supabase projects.

## Usage

- `/deploy` — Full pipeline: test → build → deploy → verify
- `/deploy --quick` — Skip tests, just build and push to production
- `/deploy --preview` — Deploy to preview environment
- `/deploy --fix` — Troubleshoot a failed deployment

---

## Full Pipeline (default)

```
1. Pre-flight → 2. Tests → 3. Build → 4. Deploy → 5. Verify
```

### 1. Pre-flight
```bash
git status                    # Clean working dir?
git branch --show-current     # On correct branch?
```

### 2. Tests
```bash
npm test                      # Run test suite
npx tsc --noEmit             # TypeScript check
```
Skip with `--quick` or if no test script exists.

### 3. Build
```bash
npm run build                 # Build for production
```

### 4. Deploy
```bash
vercel --prod                 # Production deploy
# or
vercel                        # Preview deploy (--preview flag)
```

### 5. Verify
```bash
# Health check the deployment URL
curl -s -o /dev/null -w "%{http_code}" https://DEPLOYMENT_URL
```

---

## --quick (Fast Deploy)

Skip tests, just build and ship:
```bash
npm run build && vercel --prod
```

---

## --fix (Troubleshoot Failures)

### Build Failures

**Module Not Found:** Check case sensitivity (Linux is case-sensitive). Run `vercel --force` to clear cache.

**Memory Issues:** Add to vercel.json:
```json
{ "functions": { "app/api/heavy/route.ts": { "maxDuration": 60, "memory": 3008 } } }
```

**Build Command Issues:**
```bash
vercel --build-env NODE_OPTIONS="--max-old-space-size=4096"
```

### Environment Variables

```bash
vercel env ls                 # List all env vars
vercel env add VAR_NAME       # Add missing var
vercel env pull .env.local    # Pull to local
```

**Remember:** `NEXT_PUBLIC_*` for client-side, plain names for server-side only.

### CORS Issues
Add proper CORS headers in API routes with explicit origin allowlist.

### Function Timeouts
Increase `maxDuration` in vercel.json (up to 300s on Pro plan).

---

## Rollback

```bash
vercel ls                     # List deployments
vercel rollback               # Rollback to previous
vercel rollback [url]         # Rollback to specific deployment
```

---

## Domain Management

```bash
vercel domains add example.com
vercel domains ls
vercel certs issue example.com  # Force SSL renewal
```

DNS: A record `@ → 76.76.21.21`, CNAME `www → cname.vercel-dns.com`

---

## vercel.json Reference

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ],
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 0 * * *" }]
}
```

---

## When Things Go Wrong

### Build Fails Locally

**TypeScript errors:**
```bash
npx tsc --noEmit 2>&1 | head -40    # See first errors
npx tsc --noEmit 2>&1 | grep -c "error TS"  # Count total errors
```
- Fix type errors before deploying — Vercel will hit the same failures
- If errors are in node_modules: `rm -rf node_modules && npm install`
- If errors are in generated types: `supabase gen types typescript --linked > types/supabase.ts`

**Missing dependencies:**
```bash
npm ls 2>&1 | grep "MISSING"        # Find missing deps
npm install                          # Reinstall all
rm -rf node_modules/.cache && npm run build  # Clear build cache
```

**Environment variables not set:**
```bash
# Check what the build expects
grep -r "process.env\." --include="*.ts" --include="*.tsx" -h | grep -oP 'process\.env\.\K[A-Z_]+' | sort -u
# Compare with what's set
env | grep -E "^(NEXT_|SUPABASE_|VAPI_)" | cut -d= -f1 | sort
```
Fix: Copy from `.env.local` or `vercel env pull .env.local`.

### Build Passes Locally, Fails on Vercel

**Different Node version:**
```bash
node -v                              # Local version
# Check Vercel: Settings → General → Node.js Version
```
Fix: Add to `package.json`:
```json
{ "engines": { "node": ">=20.0.0" } }
```

**Missing env vars on Vercel:**
```bash
vercel env ls                        # See what's set per environment
vercel env ls production             # Production-specific
```
Fix: `vercel env add VARIABLE_NAME production` — or use Vercel dashboard → Settings → Environment Variables.

Common gotcha: `NEXT_PUBLIC_*` vars must be set at **build time** (not just runtime). If you added one after the last deploy, redeploy.

**Case sensitivity:** Linux (Vercel) is case-sensitive, macOS isn't.
```bash
# Find case mismatches in imports
grep -rn "from ['\"]\./" --include="*.ts" --include="*.tsx" | while read line; do
  file=$(echo "$line" | grep -oP "from ['\"]\.\/\K[^'\"]+")
  # Check if the file exists with exact case
done
```
Fix: Rename files to match import casing exactly.

### Deploy Succeeds But Site is Broken

**White screen (client crash):**
```bash
# Check Vercel function logs
vercel logs <deployment-url> --follow
# Check for hydration errors in browser console
node ~/.claude/skills/deploy-verify/scripts/check-console-errors.js <url>
```
Common causes:
- `window` or `document` used in server component → wrap in `useEffect` or add `'use client'`
- Hydration mismatch → check for `Date.now()`, `Math.random()`, or browser-only APIs in SSR
- Missing `'use client'` directive on component using hooks

**500 errors on API routes:**
```bash
vercel logs <deployment-url> 2>&1 | grep -i "error\|500"
```
Common causes:
- Env var exists locally but not on Vercel (`vercel env ls`)
- API route importing a server-only module incorrectly
- Database connection string pointing to localhost

**Hydration mismatch:**
```bash
# Search for dynamic content rendered during SSR
grep -rn "Date.now\|Math.random\|window\.\|document\.\|localStorage" --include="*.tsx" --include="*.ts" app/
```
Fix: Wrap dynamic content in `useEffect` or use `suppressHydrationWarning` on the specific element (not as a blanket fix).

**Rollback immediately if production is broken:**
```bash
vercel rollback --prod               # Instant rollback
vercel ls | head -5                  # See recent deployments
vercel inspect <old-deployment-url>  # Check what was different
```

### Deploy Succeeds But Migrations Weren't Applied

Symptoms: New columns/tables don't exist, API returns "column X does not exist".

```bash
# Check what migrations are pending
supabase migration list --project-ref <ref>
# Push pending migrations
supabase db push --project-ref <ref>
# Verify the schema
supabase db dump --schema public --project-ref <ref> | grep "table_name"
```

Prevention: Add migration push to your deploy flow:
```bash
supabase db push --project-ref <ref> && vercel --prod
```

### Vercel Rate Limit or Quota Exceeded

Symptoms: `429 Too Many Requests` or deployment stuck in queue.

```bash
# Check current usage
vercel teams ls                      # See team/plan info
# Wait and retry
sleep 60 && vercel --prod            # Rate limits usually clear in ~60s
```

If on Hobby plan: max 100 deployments/day. Switch to `--preview` for testing, save `--prod` for real deploys.

If build minutes exhausted: Wait for monthly reset, or upgrade plan.

### Domain DNS Not Propagating

Symptoms: Site works at `*.vercel.app` but not at custom domain.

```bash
# Check DNS resolution
dig A yourdomain.com +short           # Should show 76.76.21.21
dig CNAME www.yourdomain.com +short   # Should show cname.vercel-dns.com
nslookup yourdomain.com               # Alternative check
```

**DNS not pointing to Vercel:**
```bash
vercel domains inspect yourdomain.com  # Shows expected DNS records
```
Fix: Update DNS at your registrar. A record → `76.76.21.21`, CNAME → `cname.vercel-dns.com`.

**SSL not provisioning:**
```bash
vercel certs ls                       # Check cert status
vercel certs issue yourdomain.com     # Force re-issue
```
Note: DNS propagation takes 5 min to 48 hours. Check with `dig` — if DNS is correct but SSL isn't ready, wait or force re-issue.

**Temporary workaround while DNS propagates:**
Share the `*.vercel.app` URL with the client until the custom domain resolves.
