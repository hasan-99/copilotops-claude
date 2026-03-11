# /ship — Full production deployment pipeline

Ship the current project to production. Runs quality gates, commits, pushes, deploys, and verifies.
Reference `.planning/PROJECT.md` and `.planning/STATE.md` for project config. If no `.planning/` exists, use `package.json` and git remote to identify the project.

## Usage
`/ship` — Auto-detect project type from codebase
`/ship --type=agent` — AI agent deployment (safety checks, webhook idempotency)
`/ship --type=voice` — Voice agent deployment (signature verification, latency checks)
`/ship --type=website` — Website deployment (SEO, responsive checks)

## Auto-Detection (when --type not specified)
Detect project type from codebase signals:
- **agent**: Has AI provider imports (`openai`, `anthropic`, `@ai-sdk`), webhook handlers, agent logic
- **voice**: Has VAPI/Retell/Telnyx/ElevenLabs imports, voice webhook handlers, `x-vapi-signature`
- **website**: Has `app/page.tsx` or `pages/index.tsx`, no AI provider imports, primarily UI components
- **edge-functions**: Has `supabase/functions/` directory, no frontend
- If ambiguous, ask user. If pure edge functions, skip tsc/eslint quality gates.

## Steps

1. **Identify project** — `pwd` to determine which project, look up deploy config from `.planning/PROJECT.md` and `.planning/STATE.md`. If no `.planning/` exists, use `package.json` and git remote to identify the project.

2. **Quality gates** — Run in sequence, stop on failure:
   - `npx tsc --noEmit` (TypeScript check — skip if no tsconfig or pure edge functions)
   - `npx eslint . --max-warnings 0` (Lint check — skip if no eslint config)
   - `npm run build` (Build verification — skip if pure edge functions)

3. **Type-specific checks** — Based on detected or specified type:

   ### If `--type=agent` (AI Agent):
   - **AI safety quick-check** — Grep codebase for:
     - `service_role` in client-side files (`app/`, `components/`, `src/`) — should be ZERO matches (**FAIL = blocks deploy**)
     - Rate limiting middleware — grep for `rateLimit`, `rateLimiter` in API routes
     - `maxTokens` on AI calls — grep for `maxTokens`, `max_tokens` in AI provider calls
     - Report: PASS/FAIL per item
   - **Webhook idempotency check** — Grep for:
     - Deduplication logic (`dedup`, `idempotency`, `already_processed`, `messageId`)
     - Report: PASS/WARN (WARN = flag but don't block)
   - **Production resilience** — Check for:
     - Timeout protection on API routes (`export const maxDuration`)
     - Circuit breakers on external API calls
     - Error monitoring active (Sentry configured)

   ### If `--type=voice` (Voice Agent):
   - **Webhook signature verification** — Grep for:
     - Signature check in edge functions or webhook handlers (`x-vapi-signature`, `signature`, `hmac`, `verify`)
     - Report: PASS/WARN (WARN = strongly recommend adding)
   - **Edge function latency note** — Remind:
     - First-response latency target: **< 500ms**
     - After deploy, test with: `curl -w "%{time_total}" -X POST <webhook-url>`
     - Cold start warning: first invocation may be slower

   ### If `--type=website` (Website):
   - **SEO quick-check** — Grep codebase for:
     - `<meta name="viewport"` — must exist in layout
     - `og:title` and `og:description` — Open Graph tags
     - `application/ld+json` — JSON-LD structured data
     - Report: PASS/WARN per item (WARN doesn't block deploy)
   - **Responsive quick-check** — Grep codebase for:
     - Viewport meta tag exists in root layout
     - No fixed pixel widths on container/wrapper elements (`width: [0-9]+px` on containers)
     - `max-width` used instead of `width` on main content areas
     - Report: PASS/WARN per item

4. **Git workflow** — If there are uncommitted changes:
   - `git status` to review changes
   - Stage relevant files (NOT .env, NOT node_modules)
   - Create descriptive commit
   - Push to current branch

4.5. **Preview deploy** — Deploy to preview first (if applicable):
   - `vercel` (without --prod) to get a preview URL
   - Run post-deploy checks against the preview URL
   - If checks pass, proceed to production deploy
   - If checks fail, fix issues and re-deploy to preview

5. **Deploy** — Based on project:
   - `vercel --prod` (Vercel projects)
   - `supabase functions deploy` (edge functions)
   - `wrangler deploy` (armenius only — Cloudflare Workers)
   - `supabase db push --project-ref <ref>` (if migrations pending) AFTER testing migration on a branch first:
     ```bash
     supabase branches create pre-deploy-test 2>/dev/null
     supabase db push --project-ref <ref>
     ```

6. **Post-deploy verification** — Checks vary by type:

   ### All types:
   - HTTP 200 — `curl -s -o /dev/null -w "%{http_code}" <domain>`
   - API latency — Key endpoints respond under 500ms

   ### Agent additions:
   - Auth flow — Test auth callback URL responds (if applicable)
   - Webhook test — `curl -s -o /dev/null -w "%{http_code}" -X POST <webhook-url>` returns 200
   - Console errors — Check for critical JS errors on homepage
   - Load test — Run concurrent user simulation if test exists
   - Error monitoring — Verify Sentry/monitoring catches test errors

   ### Voice additions:
   - Webhook test — `curl -s -o /dev/null -w "%{http_code}" -X POST <webhook-url>` returns 200
   - Latency test — `curl -w "%{time_total}" -X POST <webhook-url>` under 500ms
   - Edge function logs — `supabase functions logs <function-name>` for recent errors

   ### Website additions:
   - Auth flow — Test auth callback URL responds (if applicable)
   - Console errors — Check for critical JS errors
   - SEO verify — `curl -s <domain>` and check for og:title, viewport meta in response HTML
   - Lighthouse hint — Remind to run `npx lighthouse <domain>` for full Core Web Vitals report

7. **Report** — Summary of what was deployed, type-specific check results, latency measurements, deploy verification.

8. **Rollback plan** — If production issues detected:
   - **Vercel:** `vercel rollback` to instantly revert to previous deployment
   - **Cloudflare Workers:** Redeploy previous version from git with `wrangler deploy`
   - **Edge functions:** `supabase functions deploy <name> --version <previous>` or redeploy from git
   - **Supabase migrations:** Create reverse migration with `supabase migration new rollback_<name>`, write inverse SQL, push with `supabase db push`
   - **Emergency:** Vercel dashboard → Deployments → click "..." on previous working deploy → "Promote to Production"

If ANY quality gate or safety check FAILS: stop, fix the issue, then re-run `/ship`.
