# Internal Tool — Definition of Done

Per-stack verify checklist. Inherits `rules/constitution.md` and the `web-app` archetype DoD.
Internal/living product → runs as a **rolling release**; each increment clears this DoD, no terminal Handoff.

## Portal auth & access (constitution)
- [ ] Public signup disabled — staff join by invite / SSO only.
- [ ] Roles stored in `app_metadata` (never `user_metadata`); role-based routing in middleware AND data layer.
- [ ] **RLS enabled on every table**; verified as two roles — each sees only its scope.
- [ ] Every UPDATE policy has a matching SELECT policy.
- [ ] Postgres views set `security_invoker = true`.
- [ ] Sessions revoked before a user is deleted/deactivated.

## Security
- [ ] `SUPABASE_SERVICE_ROLE_KEY` server-only; used only in server actions (e.g. inviting users).
- [ ] Mutations use `lib/supabase/server.ts`; inputs validated with Zod.
- [ ] Security headers (HSTS); MFA on Supabase/Vercel accounts.

## App quality
- [ ] Loading / empty / error states on every async surface.
- [ ] Destructive actions confirm; soft-delete + audit where flagged.
- [ ] Rate limiting on mutating endpoints; no N+1 on list views.

## Schema flow
- [ ] All schema changes are migrations in `supabase/migrations/`.
- [ ] `npx supabase gen types` run after schema changes.

## Build & Deploy
- [ ] `npx tsc --noEmit` exits 0; `next build` succeeds.
- [ ] Deploys to Vercel; HTTP 200; auth callback + role isolation verified.
- [ ] Design anti-slop bar met; a11y AA.
