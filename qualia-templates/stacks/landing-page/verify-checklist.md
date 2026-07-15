# Landing Page — Definition of Done

Per-stack verify checklist. Inherits `rules/constitution.md` and the `website` archetype DoD.

## Build & Deploy
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `next build` succeeds; output is static/SSG (no accidental server-only data fetch on a marketing page).
- [ ] Deploys to Vercel; homepage returns HTTP 200.
- [ ] Custom domain wired (production).

## Design (anti-slop)
- [ ] DESIGN.md committed; distinctive type pair (NOT Inter/Roboto/Arial/Helvetica/system-ui).
- [ ] OKLCH palette; neutrals tinted toward brand hue; no raw `#000`/`#fff`.
- [ ] 8px spacing grid + fluid `clamp()` page padding.
- [ ] Responsive at 375px and 1440px; touch targets ≥44px.

## Content & Conversion
- [ ] Real copy — zero "lorem ipsum", zero placeholder text.
- [ ] Primary CTA present, reachable, and instrumented with an analytics event.
- [ ] Contact form (if any) validates client-side and has success + error states.

## SEO & a11y
- [ ] Per-page title + meta description + OG tags; sitemap + favicon present.
- [ ] Alt text on every image; labels on every input; keyboard navigable.
- [ ] AA contrast verified.

## Out of scope (by design)
- No Supabase, no auth, no `SUPABASE_SERVICE_ROLE_KEY`. If the project needs accounts or persisted data, it is a `full-app`, not a `landing-page`.
