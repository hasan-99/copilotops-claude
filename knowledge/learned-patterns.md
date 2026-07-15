# Learned Patterns
> Auto-growing rules from mistakes and discoveries.
> Format: ALWAYS/NEVER [action] [context/when]

---

## Always Rules
- ALWAYS check `pwd` on session start to identify which project you're in [verified: 2026-03]
- ALWAYS read a project's local CLAUDE.md before making changes — it has project-specific rules [verified: 2026-03]
- ALWAYS run `npx tsc --noEmit` after editing multiple TypeScript files [verified: 2026-03]
- ALWAYS use feature branches — never push directly to main [verified: 2026-03]
- ALWAYS run the 5-check post-deploy verification after any deployment (includes UptimeRobot check) [verified: 2026-03]
- ALWAYS use `lib/supabase/server.ts` for server-side mutations, never client.ts [verified: 2026-03]
- ALWAYS check UptimeRobot status page (https://stats.uptimerobot.com/bKudHy1pLs) when debugging downtime or after deployments [verified: 2026-03]
- ALWAYS ensure new projects get added to UptimeRobot monitoring [verified: 2026-03]

## Never Rules
- NEVER expose service_role key in client components (Hammah has this bug — needs fixing) [verified: 2026-03]
- NEVER commit .env files to git [verified: 2026-03]
- NEVER use `dangerouslySetInnerHTML` or `eval()` [verified: 2026-03]
- NEVER hardcode API keys — use environment variables [verified: 2026-03]
- NEVER use Task(Explore) for simple file lookups — use Glob/Grep directly [verified: 2026-03]
- NEVER push directly to main/master [verified: 2026-03]

## Sakani Domain Skills
- ALWAYS load `/sakani-conventions` as base when starting any Sakani domain work [verified: 2026-04]
- ALWAYS auto-trigger or remind `/financial-ledger` when topic involves money, dues, ledger, credits, expenses, settlements [verified: 2026-04]
- ALWAYS auto-trigger or remind `/i18n-rtl` when topic involves Arabic, RTL, translations, message keys, locale [verified: 2026-04]
- ALWAYS auto-trigger or remind `/fcm-notifications` when topic involves push notifications, device tokens, FCM [verified: 2026-04]
- ALWAYS auto-trigger or remind `/subscription-payments` when topic involves billing, subscriptions, checkout, promo codes [verified: 2026-04]

## Project-Specific Gotchas
- **sigatalachana** is a Python agent (NOT web) — misclassified in aiagents folder [verified: 2026-03]
- **armenius** uses Cloudflare Workers + wrangler deploy (NOT Vercel) [verified: 2026-03]
- **glluztech** is the only project still on Next.js Pages Router — needs migration to App Router [verified: 2026-03]
- **sofiatesting** is the most complex AI agent (WhatsApp + Web + Edge Functions + dual AI) [verified: 2026-03]
- **ERP actions.ts** was split into 44 domain files (completed 2026-03). client-portal.ts (2,496 lines) is now the largest file. [verified: 2026-03]
- **Timo** has empty API keys (OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY) — won't work until filled [verified: 2026-03]

---
*Last updated: 2026-04-07*

---

### supabase-js writes need { count: 'exact' } to catch silent RLS denials
**ID:** 2bffb5c6
**Date:** 2026-05-12
**Project:** sakani
**Context:** M19 developer approval flow — staff would mark request APPROVED but the role+building link were not actually written

supabase-js does NOT throw when RLS blocks an INSERT/UPDATE/DELETE. It returns { data: null, error: null, count: 0 } and a 201 response. Server actions then look 'successful' but no row changed in the DB. Defense: on any sensitive write, pass { count: 'exact' } and check 'if (count === 0) return error'. Cost: one extra char in query. Benefit: the bug surfaces in dev, not in 'feature looks broken with no error' production tickets. Bit the Sakani M19 approval flow twice on 2026-05-12 — first on building_role_assignment INSERT (no policy), then again on buildings.developer_user_id UPDATE (different policy gap).

