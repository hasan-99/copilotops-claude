---
globs: ["vercel.json", "next.config.*", "wrangler.*", "Dockerfile"]
---

# Deployment (MANDATORY - Every Project)

When work on a project is **done**, ALWAYS execute these steps in order:

## 1. Push to GitHub
Commit and push all changes to the remote repository.

## 2. Redeploy to Vercel
Deploy through the Vercel CLI (`vercel --prod` or appropriate command).

## 3. Verify Supabase
Confirm Supabase is configured correctly via MCP (check tables, RLS, migrations are applied).

## 4. Post-Deploy Verification Checklist

After deployment, verify all 4 checks pass:

- [ ] **HTTP 200** — Homepage loads successfully (`curl -s -o /dev/null -w "%{http_code}" <url>` returns 200)
- [ ] **Auth flow** — Login/signup endpoint responds correctly (test auth callback URL)
- [ ] **Console errors** — No critical JS errors in browser console on homepage load
- [ ] **API latency** — Key API endpoints respond under 500ms (`curl -w "%{time_total}" <api-url>`)

If any check fails, investigate and fix before considering deployment complete.

This applies to **every project, every time**. No exceptions. Don't ask — just do it.
