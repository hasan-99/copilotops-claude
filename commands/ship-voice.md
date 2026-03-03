# /ship-voice — Ship a voice agent to production

Voice agent-specific deployment pipeline with webhook signature and latency checks.
Reference `~/.claude/knowledge/qualia-context.md` for project config.

## Steps

1. **Identify project** — `pwd` to determine which project, look up deploy config from `~/.claude/knowledge/qualia-context.md`

2. **Quality gates** (if applicable — edge functions may not have tsc/eslint):
   - `npx tsc --noEmit` (TypeScript check — skip if no tsconfig)
   - `npx eslint . --max-warnings 0` (Lint check — skip if no eslint config)
   - `npm run build` (Build verification — skip if pure edge functions)

3. **VAPI/Retell webhook signature verification** — Grep for:
   - Signature check in edge functions or webhook handlers (`x-vapi-signature`, `signature`, `hmac`, `verify`)
   - Report: PASS/WARN (WARN if no signature verification found — strongly recommend adding)

4. **Edge function latency note** — Remind:
   - First-response latency target: **< 500ms**
   - After deploy, test with: `curl -w "%{time_total}" -X POST <webhook-url>`
   - Cold start warning: first invocation may be slower

5. **Git workflow** — If there are uncommitted changes:
   - `git status` to review changes
   - Stage relevant files (NOT .env, NOT node_modules)
   - Create descriptive commit
   - Push to current branch

6. **Deploy** — Based on project:
   - `supabase functions deploy` (edge functions)
   - `vercel --prod` (if Vercel frontend exists)
   - `wrangler deploy` (armenius only — Cloudflare Workers)

7. **Post-deploy verification** (4 checks):
   - HTTP 200 — `curl -s -o /dev/null -w "%{http_code}" <domain>` (if frontend exists)
   - Webhook test — `curl -s -o /dev/null -w "%{http_code}" -X POST <webhook-url>` returns 200
   - Latency test — `curl -w "%{time_total}" -X POST <webhook-url>` under 500ms
   - Edge function logs — `supabase functions logs <function-name>` for recent errors

8. **Report** — Summary of what was deployed, signature check results, latency measurements, deploy verification.

If quality gates fail: stop, fix, re-run `/ship-voice`.
