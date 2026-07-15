# Internal Tool — Phase Plan

Stack: Next.js 16 (App Router) · Supabase (portal auth + RLS) · Tailwind · Vercel.
Archetype: `web-app` (internal/living product — runs as a rolling release, no terminal Handoff).
Seed plan copied into ROADMAP.md by `/qualia-new`.

## Phase 1: Foundation, Portal Auth & Roles

**Goal:** Stack on a Vercel preview; Supabase wired with RLS on every table; invite-only auth (no public signup); roles in `app_metadata`.

**Success criteria:**
1. Staff log in (invite / SSO); public signup is disabled.
2. Roles stored in `app_metadata`; role-based routing in middleware AND data layer.
3. Every table has RLS; verified as two roles — each sees only its scope.
4. Deploys to a Vercel preview URL.

## Phase 2: Core Workflows (vertical slices)

**Goal:** The primary staff workflows work end-to-end — list, detail, create/edit, with states.

**Success criteria:**
1. Primary workflow works end-to-end and persists.
2. Every async surface has loading / empty / error states.
3. Forms validate client AND server; destructive actions confirm + soft-delete where flagged.
4. Mutations go through `lib/supabase/server.ts`.

## Phase 3: Admin, Audit & Hardening

**Goal:** User management, audit trail, rate limiting, performance.

**Success criteria:**
1. Admin can invite / deactivate users and assign roles.
2. Audit log on sensitive writes; soft-delete where flagged.
3. No N+1 on list views; rate limiting on mutating endpoints.
4. Every UPDATE policy has a matching SELECT policy.

## Phase 4: Polish & Rolling Release

**Goal:** Design pass, a11y, prod deploy. As a living product this repeats per increment — no terminal Handoff.

**Success criteria:**
1. DESIGN.md anti-slop bar; a11y WCAG 2.2 AA.
2. `service_role` server-only; security headers; MFA on accounts.
3. Production deploy + smoke (HTTP 200, auth callback, role isolation).
4. `/qualia-report` per increment.
