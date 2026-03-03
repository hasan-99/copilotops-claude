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
