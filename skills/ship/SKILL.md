---
name: ship
description: "Full production deployment pipeline — quality gates, commit, deploy, and verify. Use this skill whenever the user says 'ship', 'deploy', 'push to production', 'go live', 'release', 'ship it', or wants to deploy any project (website, AI agent, voice agent, edge functions). Also trigger when user mentions Vercel deploy, Supabase functions deploy, or Cloudflare Workers deploy. Handles auto-detection of project type and runs appropriate safety checks before deploying."
---

# Ship — Full Production Deployment Pipeline

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

If ambiguous, ask user. If pure edge functions, skip tsc/eslint quality gates.

## Steps

### 1. Identify Project

`pwd` to determine which project, look up deploy config from `.planning/PROJECT.md` and `.planning/STATE.md`. If no `.planning/` exists, use `package.json` and git remote to identify the project.

### 2. Quality Gates

Run in sequence, stop on failure:

```bash
npx tsc --noEmit        # TypeScript check — skip if no tsconfig or pure edge functions
npx eslint . --max-warnings 0   # Lint check — skip if no eslint config
npm run build            # Build verification — skip if pure edge functions
```

### 2a. Run Tests

If test infrastructure exists (per `~/.claude/skills/test-runner/SKILL.md` detection):

```bash
npm test 2>&1 | tail -30     # Unit/Integration
npx playwright test 2>&1      # E2E (if configured)
```

If tests fail: STOP. Report failures. Do not proceed to deploy.
If no test infrastructure: skip silently.

### 2b. Review Gate

Check for review results:

1. Read `.planning/REVIEW.md` or `.review/REVIEW.md`
2. If `status: has_blockers`:
   - List unresolved CRITICAL/HIGH findings
   - Ask: "Fix these first, or deploy anyway?"
   - If user says fix → stop
   - If user says deploy anyway → continue with warning logged
3. If `status: clean` or file not found → continue (advisory note if not found)

### 3. Type-Specific Checks

Based on detected or specified type:

#### If agent (AI Agent):

- **AI safety quick-check** — Grep codebase for:
  - `service_role` in client-side files (`app/`, `components/`, `src/`) — should be ZERO matches (FAIL = blocks deploy)
  - Rate limiting middleware — grep for `rateLimit`, `rateLimiter` in API routes
  - `maxTokens` on AI calls — grep for `maxTokens`, `max_tokens` in AI provider calls
  - Report: PASS/FAIL per item
- **Webhook idempotency check** — Grep for deduplication logic (`dedup`, `idempotency`, `already_processed`, `messageId`). Report: PASS/WARN
- **Production resilience** — Check for timeout protection (`export const maxDuration`), circuit breakers, error monitoring (Sentry configured)

#### If voice (Voice Agent):

- **Webhook signature verification** — Grep for signature check (`x-vapi-signature`, `signature`, `hmac`, `verify`). Report: PASS/WARN
- **Edge function latency note** — First-response latency target: < 500ms. After deploy, test with: `curl -w "%{time_total}" -X POST <webhook-url>`

#### If website (Website):

- **SEO quick-check** — Grep for viewport meta, Open Graph tags (`og:title`, `og:description`), JSON-LD structured data. Report: PASS/WARN per item
- **Responsive quick-check** — Check viewport meta exists, no fixed pixel widths on containers, `max-width` used on main content areas. Report: PASS/WARN per item

### 4. Git Workflow

If there are uncommitted changes:

```bash
git status
# Stage relevant files (NOT .env, NOT node_modules)
# Create descriptive commit
# Push to current branch
```

### 5. Preview Deploy

Deploy to preview first (if applicable):

```bash
vercel  # without --prod — gets preview URL
```

Run post-deploy checks against the preview URL. If checks pass, proceed to production. If checks fail, fix issues and re-deploy to preview.

### 6. Deploy

Based on project:

```bash
vercel --prod                              # Vercel projects
supabase functions deploy                  # Edge functions
wrangler deploy                            # Cloudflare Workers
supabase db push --project-ref <ref>       # If migrations pending — test on branch first
```

### 7. Post-Deploy Verification

#### All types:

```bash
curl -s -o /dev/null -w "%{http_code}" <domain>   # HTTP 200
# Key endpoints respond under 500ms
```

#### Agent additions:
Auth flow, webhook test, console errors, load test, error monitoring

#### Voice additions:
Webhook test, latency test, edge function logs

#### Website additions:
Auth flow, console errors, SEO verify, Lighthouse hint

### 8. Report

Summary of what was deployed, type-specific check results, latency measurements, deploy verification.

### 9. Rollback Plan

If production issues detected:

- **Vercel**: `vercel rollback`
- **Cloudflare Workers**: `wrangler deploy` previous version
- **Edge functions**: `supabase functions deploy <name> --version <previous>`
- **Supabase migrations**: Create reverse migration
- **Emergency**: Vercel dashboard manual rollback

If ANY quality gate or safety check FAILS: stop, fix the issue, then re-run `/ship`.
