# /ship-agent — Ship an AI agent to production

AI agent-specific deployment pipeline with safety and webhook checks.
Reference `~/.claude/knowledge/qualia-context.md` for project config.

## Steps

1. **Identify project** — `pwd` to determine which project, look up deploy config from `~/.claude/knowledge/qualia-context.md`

2. **Quality gates** — Run in sequence, stop on failure:
   - `npx tsc --noEmit` (TypeScript check)
   - `npx eslint . --max-warnings 0` (Lint check, if configured)
   - `npm run build` (Build verification)

3. **AI safety quick-check** — Grep the codebase for:
   - `service_role` in client-side files (`app/`, `components/`, `src/`) — should be ZERO matches
   - Rate limiting middleware — grep for `rateLimit`, `rateLimiter`, or similar in API routes
   - `maxTokens` on AI calls — grep for `maxTokens`, `max_tokens` in AI provider calls
   - Report: PASS/FAIL per item (service_role in client = FAIL, blocks deploy)

4. **Webhook idempotency check** — Grep for:
   - Deduplication logic in webhook handlers (`dedup`, `idempotency`, `already_processed`, `messageId`)
   - Report: PASS/WARN (WARN if no deduplication found — flag but don't block)

5. **Git workflow** — If there are uncommitted changes:
   - `git status` to review changes
   - Stage relevant files (NOT .env, NOT node_modules)
   - Create descriptive commit
   - Push to current branch

6. **Deploy** — Based on project:
   - `vercel --prod` (most agents)
   - `supabase functions deploy` (if edge functions exist)
   - `supabase db push --project-ref <ref>` (if migrations pending)

7. **Post-deploy verification** (5 checks):
   - HTTP 200 — `curl -s -o /dev/null -w "%{http_code}" <domain>`
   - Auth flow — Test auth callback URL responds (if applicable)
   - API latency — Key endpoints respond under 500ms
   - Webhook test — `curl -s -o /dev/null -w "%{http_code}" <domain>/api/webhook` (or known webhook path) returns 200
   - Console errors — Check for critical JS errors on homepage

8. **Report** — Summary of what was deployed, safety check results, webhook status, deploy verification.

If ANY quality gate or safety check FAILS: stop, fix the issue, then re-run `/ship-agent`.
