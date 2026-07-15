---
archetype: website
stack: Next.js 16 (App Router) · Tailwind + shadcn/ui · Supabase · Vercel
updated: 2026-05-28
---

# Archetype: `website`

> Marketing / brochure / content sites on Vercel + Supabase. The roadmapper loads this file when the operator picks `website`. The grill (`qualia-scope`) reads the **Grill variables** below; the **Definition of Done** is the fixed coverage the roadmap must satisfy; the **Road** is the default 0→100 shape.

## How this file is used

1. `qualia-scope` grills the operator through the **Grill variables** — depth on each, recommended-answer-with-why, writing answers to the spec and terms to `.planning/CONTEXT.md`.
2. The grill is **DoD-aware**: it raises every Definition-of-Done area even if the operator never mentioned it (auth? legal pages? CMS or static?).
3. The roadmapper maps the filled spec onto the **Road**, dropping inapplicable DoD lines *with a logged reason* and expanding applicable ones into vertical slices.
4. `qualia-verify` at each milestone close checks DoD coverage, not just per-task acceptance.

## Grill variables (what `qualia-scope` must extract)

- **Purpose & primary CTA** — what one action defines success (book, buy, subscribe, contact)?
- **Page inventory** — exact routes. Static or dynamic?
- **Content source** — hardcoded, Markdown/MDX, or Supabase-backed CMS? Who edits it after handoff?
- **Brand direction** — reference sites, typography intent, color, tone. (Drives DESIGN.md — the anti-slop bar.)
- **Auth?** — most brochure sites: none. If gated content/portal → escalate to `web-app` archetype.
- **Forms & data capture** — contact, lead, newsletter. Where does the data go? Notifications?
- **Integrations** — analytics, CRM, payment, booking, email (Resend), maps.
- **Languages / i18n**, **legal jurisdiction** (drives which legal pages), **domain** status.

## Production Definition of Done

**Design (anti-slop)** — chosen typeface with personality (not default Inter); deliberate spacing/radius scale; passes `qualia-design/design-laws.md`; responsive across breakpoints; dark mode if brand calls for it; real content, no lorem.

**Performance** — LCP ≤2.5s · INP ≤200ms · CLS ≤0.1 at field-data p75; image optimization (next/image); JS/page-weight budget agreed up front; Lighthouse in CI.

**SEO** — Metadata API per route; `metadataBase` in root layout; JSON-LD; sitemap.xml; robots.txt; canonicals; OG images; `X-Robots-Tag: noindex` on preview hosts.

**Accessibility** — WCAG 2.2 AA (EU default).

**Data (only if forms/CMS)** — Supabase table(s); **RLS enabled** with insert-only public policy on form tables, read policy on published content; rate limit on public POST.

**Security** — SSL enforced; secrets in env (`vercel env pull`), never client; `service_role` server-only; security headers (HSTS); MFA on Vercel/Supabase accounts.

**Observability** — analytics + Sentry + structured logging from day one.

**Content & legal** — real copy; privacy, terms, cookie notice (GDPR).

**Deploy & handoff** — Vercel production; custom domain + DNS; post-deploy smoke (HTTP 200, console clean, API <500ms); credentials + walkthrough + archive + ERP report.

## The Road (default 0→100)

### M1 — Foundation & Design System
Vertical slices establishing the visual language before any page is "real".
- Init: Next.js 16 App Router + TS + Tailwind + shadcn; repo + CI; Vercel project linked; preview deploys on.
- DESIGN.md from brand grill: real typography, color scale, spacing/radius, motion rules, explicit anti-slop negative rules.
- Layout shell: nav, footer, responsive grid, dark mode, base components.
- **Exit:** design system renders on a preview URL; passes design-laws baseline; tokens documented.

### M2 — Pages & Content (one vertical slice per page-type)
- Each page-type as a slice: layout + real content + loading/empty/error states.
- CMS path (if chosen): Supabase schema + RLS read policies + editor wiring.
- Forms: UI + validation (client + server) → Supabase table (RLS insert + rate limit) → notification (Resend).
- **Exit:** every route has real content and states; forms persist and notify; no lorem anywhere.

### M3 — Performance, SEO & Accessibility
- Perf pass to budget (LCP/INP/CLS, image optimization, bundle); Lighthouse in CI.
- SEO: metadata per route, metadataBase, JSON-LD, sitemap, robots, OG images, canonicals.
- A11y: WCAG 2.2 AA audit + fixes; responsive QA across breakpoints.
- **Exit:** budgets met on field-like data; SEO + a11y checklists green.

### M4 — Handoff (always last)
- Legal pages (privacy/terms/cookie); analytics + Sentry live; security pass (RLS, headers, env, MFA).
- Custom domain + DNS; production deploy; post-deploy smoke.
- Credentials handover, client walkthrough, repo archive, `/qualia-report` to ERP.
- **Exit:** all DoD lines covered or explicitly waived with reason; client can operate it.

## Notes
- Gated content, user accounts, or a dashboard → this is no longer a `website`. Use `web-app` (adds auth + RLS-everywhere + app-quality DoD).
- The Road is a default, not a cage. The roadmapper may merge M2/M3 for a 3-page site or split M2 for a 30-page one — but every DoD line still needs an owner.
