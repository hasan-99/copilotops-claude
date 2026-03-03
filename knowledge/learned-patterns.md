# Learned Patterns
> Auto-growing rules from `/learn` command. Each rule was triggered by an actual mistake or discovery.
> Format: ALWAYS/NEVER [action] [context/when]

---

## Always Rules
- ALWAYS check `pwd` on session start to identify which of the 42 projects you're in
- ALWAYS read a project's local CLAUDE.md before making changes — it has project-specific rules
- ALWAYS look up the Supabase ref from qualia-context.md when working with Supabase projects
- ALWAYS run `npx tsc --noEmit` after editing multiple TypeScript files
- ALWAYS use feature branches — branch-guard.sh will block direct pushes to main
- ALWAYS run the 4-check post-deploy verification after any deployment
- ALWAYS use `lib/supabase/server.ts` for server-side mutations, never client.ts

## Never Rules
- NEVER expose service_role key in client components (Hammah has this bug — needs fixing)
- NEVER commit .env files to git (pre-commit hook catches this)
- NEVER use `dangerouslySetInnerHTML` or `eval()`
- NEVER hardcode API keys — use environment variables
- NEVER use Task(Explore) for simple file lookups — use Glob/Grep directly (speed rule)
- NEVER push directly to main/master — branch-guard.sh will block it

## Project-Specific Gotchas
- **sigatalachana** is a Python agent (NOT web) — misclassified in aiagents folder
- **armenius** uses Cloudflare Workers + wrangler deploy (NOT Vercel)
- **glluztech** is the only project still on Next.js Pages Router — needs migration to App Router
- **sofiatesting** is the most complex AI agent (WhatsApp + Web + Edge Functions + dual AI)
- **ERP actions.ts** is 2,900 lines — technical debt, needs splitting into domain files
- **Timo** has empty API keys (OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY) — won't work until filled

---
*Last updated: 2026-02-28 — Seeded from project audit. Run /learn after mistakes to add more.*
