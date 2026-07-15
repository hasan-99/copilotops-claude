---
archetype: web-app
extends: website
stack: Next.js 16 (App Router) · Tailwind + shadcn/ui · Supabase (auth + Postgres + RLS) · Vercel
updated: 2026-05-29
---

# Archetype: `web-app`

> Authenticated products with user accounts, roles, and a dashboard on Vercel + Supabase. **Extends `website`** — every `website` Definition-of-Done line still applies (design, performance, SEO where relevant, a11y, observability, deploy, handoff). This file adds the auth, data, and app-quality bars. Used by `qualia-scope` when the operator picks `web-app`, or when a `website` grows gated content / accounts.

## How this file is used

Same contract as every archetype: `qualia-scope` grills the **Grill variables**, the **Definition of Done** is the per-increment bar, the **Road** is the default 0→100. Inherits `website` + `rules/constitution.md`; relaxes nothing.

## Grill variables (added on top of `website`)

- **Who are the users?** — roles (admin / staff / client / public) and what each can see and do. Drives the RLS model.
- **Auth model** — email/password, magic link, OAuth providers, SSO? Email verification required? Password reset flow?
- **Authorization source** — what claims gate access? (Must live in `app_metadata`, never `user_metadata` — constitution.)
- **Tenancy** — single-tenant, per-user, or multi-tenant/workspace? (Multi-tenant changes every RLS policy — surface it now.)
- **Core entities & relationships** — the domain model. Each entity → a CONTEXT.md glossary term.
- **Write surfaces** — what users create/edit/delete; which writes need confirmation, soft-delete, or audit.
- **Real-time / collaboration** — does anything need live updates (presence, notifications)?
- **Billing** — free, one-off, subscription? Provider? (If yes, billing is its own increment set.)
- **Notifications** — email (Resend), in-app, both? Triggered by what events?

## Production Definition of Done (added on top of `website`)

**Auth & access** — Supabase auth with the chosen model; email verification + password reset wired; **RLS enabled on every table** with policies derived from `app_metadata` claims; role-based routing enforced in middleware *and* at the data layer (never trust the client). Verified by logging in as each role and confirming isolation.

**RLS correctness (constitution)** — every UPDATE policy has a matching SELECT; views use `security_invoker = true`; storage upsert grants INSERT+SELECT+UPDATE; sessions revoked before user delete.

**Data** — domain schema in `supabase/migrations/`; FK relationships normalized; soft-delete + audit where the grill flagged it; no N+1 on list views.

**App quality** — every async surface has loading / empty / error states; forms validate client *and* server (Zod or equivalent); destructive actions confirm; optimistic UI where latency matters; rate limiting on mutating + public endpoints.

**Security** — `service_role` server-only; secrets in env; security headers (HSTS); MFA on Supabase/Vercel accounts; CSRF/permission checks on every mutation.

**Billing (if applicable)** — provider integrated; webhooks idempotent; plan/entitlement state authoritative server-side; failed-payment + cancellation flows handled.

## The Road (default 0→100)

### M1 — Foundation, Auth & Data
- Init stack + Vercel link + CI; Supabase project; **RLS on every table from the first migration** (not retrofitted).
- Auth model: signup, login, verification, reset; role claims in `app_metadata`; role-based middleware.
- Domain schema + relationships; seed data.
- **Exit:** each role logs in and sees only what it should — verified as two+ users; deploys to preview.

### M2 — Core Capabilities (one vertical slice per capability)
- Each capability cuts through UI + server action + RLS + validation + states + test. Independently shippable.
- **Exit:** the primary user job works end-to-end with all async states; writes validated both sides.

### M3 — App Hardening
- Rate limiting, audit/soft-delete, notifications, real-time (if scoped); billing increments (if scoped).
- Performance pass (list virtualization, query aggregation, no N+1); error/empty states audited.
- **Exit:** mutation paths secured + rate-limited; perf budget met; billing flows (if any) handle failure.

### M4 — Polish, SEO-where-relevant & Handoff
- Design pass to `website` anti-slop bar; a11y WCAG 2.2 AA; SEO on public routes only (`noindex` the app).
- Legal pages; analytics + Sentry; security pass (RLS, headers, env, MFA); custom domain; prod deploy + smoke.
- Credentials, walkthrough, archive, ERP report (or rolling-release for an internal product).
- **Exit:** all DoD lines covered or waived with reason.

## Notes
- Internal/living products (like the ERP) run as **rolling releases** — no terminal Handoff. Each shipped increment still clears this DoD. Handoff applies only to client-delivered web-apps.
- LLM features → escalate to `ai-agent` (adds OpenRouter routing, evals, cost guardrails on top of this).
