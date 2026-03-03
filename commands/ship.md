# /ship — Full production deployment pipeline

Ship the current project to production. Runs quality gates, commits, pushes, deploys, and verifies.

## Steps

1. **Identify project** — `pwd` to determine which project, look up deploy config from `~/.claude/knowledge/qualia-context.md`

2. **Quality gates** — Run in sequence, stop on failure:
   - `npx tsc --noEmit` (TypeScript check)
   - `npx eslint . --max-warnings 0` (Lint check, if configured)
   - `npm run build` (Build verification)
   - Production resilience check (AI/Voice agents):
     - Webhook idempotency implemented (deduplication logic)
     - Timeout protection on API routes (`export const maxDuration`)
     - Circuit breakers on external API calls (AI providers, etc.)
     - Token limits configured (`maxTokens` on AI calls)
     - Error monitoring active (Sentry configured)

3. **Git workflow** — If there are uncommitted changes:
   - `git status` to review changes
   - Stage relevant files (NOT .env, NOT node_modules)
   - Create descriptive commit
   - Push to current branch

4. **Deploy** — Based on project type:
   - **Vercel projects:** `vercel --prod`
   - **Cloudflare Workers (armenius):** `wrangler deploy`
   - **Supabase migrations:** `supabase db push --project-ref <ref>` (if migrations exist)

5. **Post-deploy verification** (6 checks):
   - HTTP 200 — `curl -s -o /dev/null -w "%{http_code}" <domain>`
   - Auth flow — Test auth callback URL responds
   - Console errors — Check for critical JS errors
   - API latency — Key endpoints respond under 500ms
   - **Load test** (AI/Voice agents) — Run concurrent user simulation if test exists
   - **Error monitoring** — Verify Sentry/monitoring catches test errors

6. **Report** — Summary of what was deployed, which checks passed, any issues found.

If ANY quality gate fails: stop, fix the issue, then re-run `/ship`.
