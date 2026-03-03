# /ship-website — Ship a website to production

Website-specific deployment pipeline with SEO and responsive checks.
Reference `~/.claude/knowledge/qualia-context.md` for project config.

## Steps

1. **Identify project** — `pwd` to determine which project, look up deploy config from `~/.claude/knowledge/qualia-context.md`

2. **Quality gates** — Run in sequence, stop on failure:
   - `npx tsc --noEmit` (TypeScript check)
   - `npx eslint . --max-warnings 0` (Lint check, if configured)
   - `npm run build` (Build verification)

3. **SEO quick-check** — Grep the codebase for:
   - `<meta name="viewport"` — must exist in layout
   - `og:title` and `og:description` — Open Graph tags
   - `application/ld+json` — JSON-LD structured data
   - Report: PASS/WARN per item (WARN doesn't block deploy, but flag it)

4. **Responsive quick-check** — Grep the codebase for:
   - Viewport meta tag exists in root layout
   - No fixed pixel widths on container/wrapper elements (`width: [0-9]+px` on containers)
   - `max-width` used instead of `width` on main content areas
   - Report: PASS/WARN per item

5. **Git workflow** — If there are uncommitted changes:
   - `git status` to review changes
   - Stage relevant files (NOT .env, NOT node_modules)
   - Create descriptive commit
   - Push to current branch

6. **Deploy** — `vercel --prod`

7. **Post-deploy verification** (6 checks):
   - HTTP 200 — `curl -s -o /dev/null -w "%{http_code}" <domain>`
   - Auth flow — Test auth callback URL responds (if applicable)
   - Console errors — Check for critical JS errors
   - API latency — Key endpoints respond under 500ms
   - SEO verify — `curl -s <domain>` and check for og:title, viewport meta in response HTML
   - Lighthouse hint — Remind to run `npx lighthouse <domain>` for full Core Web Vitals report

8. **Report** — Summary of what was deployed, quality gates, SEO/responsive check results, deploy verification.

If ANY quality gate fails: stop, fix the issue, then re-run `/ship-website`.
