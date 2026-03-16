# Learned Patterns
> Auto-growing rules from `/learn` command. Each rule was triggered by an actual mistake or discovery.
> Format: ALWAYS/NEVER [action] [context/when]

---

## Always Rules
- ALWAYS check `pwd` on session start to identify which of the 42 projects you're in [verified: 2026-03]
- ALWAYS read a project's local CLAUDE.md before making changes — it has project-specific rules [verified: 2026-03]
- ALWAYS look up the Supabase ref from qualia-context.md when working with Supabase projects [verified: 2026-03]
- ALWAYS run `npx tsc --noEmit` after editing multiple TypeScript files [verified: 2026-03]
- ALWAYS use feature branches — branch-guard.sh will block direct pushes to main [verified: 2026-03]
- ALWAYS run the 5-check post-deploy verification after any deployment (includes UptimeRobot check) [verified: 2026-03]
- ALWAYS use `lib/supabase/server.ts` for server-side mutations, never client.ts [verified: 2026-03]
- ALWAYS check UptimeRobot status page (https://stats.uptimerobot.com/bKudHy1pLs) when debugging downtime or after deployments [verified: 2026-03]
- ALWAYS ensure new projects get added to UptimeRobot monitoring [verified: 2026-03]
- ALWAYS use skills over commands — commands deprecated March 2026 [verified: 2026-03]
- ALWAYS write /review results to .planning/REVIEW.md for deploy gate [verified: 2026-03]

## Never Rules
- NEVER expose service_role key in client components (Hammah has this bug — needs fixing) [verified: 2026-03]
- NEVER commit .env files to git (pre-commit hook catches this) [verified: 2026-03]
- NEVER use `dangerouslySetInnerHTML` or `eval()` [verified: 2026-03]
- NEVER hardcode API keys — use environment variables [verified: 2026-03]
- NEVER use Task(Explore) for simple file lookups — use Glob/Grep directly (speed rule) [verified: 2026-03]
- NEVER push directly to main/master — branch-guard.sh will block it [verified: 2026-03]

## Project-Specific Gotchas
- **sigatalachana** is a Python agent (NOT web) — misclassified in aiagents folder [verified: 2026-03]
- **armenius** uses Cloudflare Workers + wrangler deploy (NOT Vercel) [verified: 2026-03]
- **glluztech** is the only project still on Next.js Pages Router — needs migration to App Router [verified: 2026-03]
- **sofiatesting** is the most complex AI agent (WhatsApp + Web + Edge Functions + dual AI) [verified: 2026-03]
- **ERP actions.ts** was split into 44 domain files (completed 2026-03). client-portal.ts (2,496 lines) is now the largest file. [verified: 2026-03]
- **Timo** has empty API keys (OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY) — won't work until filled [verified: 2026-03]

---
*Last updated: 2026-03-16*
