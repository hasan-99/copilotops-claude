# Full App — Phase Plan

Stack: Next.js 16 (App Router) · Supabase (auth + Postgres + RLS) · Tailwind · Vercel.
Archetype: `web-app`. Seed plan copied into ROADMAP.md by `/qualia-new`.

## Phase 1: Foundation, Auth & Data

**Goal:** Stack deployed to a Vercel preview, Supabase wired with **RLS on every table from the first migration**, auth working end-to-end.

**Success criteria:**
1. User can sign up, log in, log out; session persists across refresh.
2. Every table has RLS enabled with policies derived from `app_metadata` claims.
3. RLS verified by logging in as two users — each sees only their own rows.
4. Role-based routing enforced in middleware AND at the data layer.
5. Deploys to a Vercel preview URL.

## Phase 2: Core Capabilities (vertical slices)

**Goal:** The primary user job works end-to-end — each capability cuts through UI + server action + RLS + validation + states.

**Success criteria:**
1. Primary user capability works end-to-end and persists.
2. Every async surface has loading / empty / error states.
3. Forms validate client AND server (Zod or equivalent); destructive actions confirm.
4. Mutations go through `lib/supabase/server.ts`, never the client.

## Phase 3: App Hardening

**Goal:** Production-grade — rate limiting, audit/soft-delete, performance, security headers.

**Success criteria:**
1. Rate limiting on mutating + public endpoints.
2. No N+1 on list views; perf budget met.
3. `service_role` confirmed server-only; security headers (HSTS) set.
4. Every UPDATE policy has a matching SELECT policy.

## Phase 4: Polish & Handoff

**Goal:** Design pass to anti-slop bar, a11y, prod deploy, credentials handover.

**Success criteria:**
1. DESIGN.md anti-slop bar met; a11y WCAG 2.2 AA.
2. Analytics + Sentry; custom domain; production deploy + smoke.
3. RLS / headers / env / MFA security pass.
4. Credentials, walkthrough, archive, `/qualia-report` to ERP.
