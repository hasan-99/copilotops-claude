---
name: seo-master
description: >
  Comprehensive SEO audit, optimization, and automated fixing for any web project — local codebases or live sites.
  Covers technical SEO (Core Web Vitals, structured data, meta tags, robots.txt, sitemaps, canonical URLs, hreflang,
  mobile-first indexing), on-page SEO (titles, descriptions, headings, keywords, internal linking, image alt text),
  content SEO (keyword research, content gaps, topic clusters, E-E-A-T), local SEO (Google Business Profile, local schema,
  NAP consistency), performance SEO (page speed, lazy loading, CDN, compression), crawlability (redirect chains, orphan
  pages, crawl budget), off-page SEO (backlink analysis, social signals), and monitoring (Search Console, rank tracking,
  competitor analysis). Generates actionable reports with severity-ranked fixes and auto-applies safe fixes to code.

  USE THIS SKILL whenever the user mentions: SEO, search rankings, Google rankings, meta tags, structured data, schema markup,
  sitemap, robots.txt, Core Web Vitals, page speed optimization, keyword research, content gaps, backlinks, internal linking,
  search console, indexing issues, crawlability, canonical URLs, hreflang, local SEO, Google Business Profile, E-E-A-T,
  topic clusters, on-page optimization, technical SEO audit, SEO fix, rank tracking, competitor SEO analysis, or any request
  to improve a website's search engine visibility — even if they don't explicitly say "SEO". If someone asks "why isn't my
  site ranking?" or "how do I get more organic traffic?", this is the skill to use.
---

# SEO Master

Complete SEO analysis, optimization, and automated fixing engine. Works on local codebases (React, Next.js, HTML, any framework) and live deployed sites via Firecrawl.

## How This Skill Works

This skill operates in two modes depending on context:

1. **Local codebase mode** — When you're in a project directory. Reads source files directly, analyzes HTML output, checks meta tags in components, validates structured data, reviews sitemap generation, and **auto-fixes** issues in the code.

2. **Live site mode** — When given a URL or domain. Uses Firecrawl to crawl the site, extract page data, analyze on-page elements, check technical infrastructure, and generates a report with manual fix instructions.

Both modes produce a **Priority-Ranked SEO Report** at the end.

## Execution Flow

Run these phases in order. Skip phases that don't apply (e.g., skip local code analysis for a site you don't have source access to).

### Phase 0: Context Detection

Determine the operating mode:

```
IF user provided a URL/domain AND we're not in that project's codebase:
  → Live site mode (Firecrawl)
IF we're inside a project directory with source code:
  → Local codebase mode (direct file access)
IF both (user gave URL + we have the source):
  → Hybrid mode (best of both — crawl live + fix source)
```

Ask the user which audit scope they want:
- **Full audit** — everything below (default)
- **Technical only** — phases 1-2
- **Content only** — phases 3-4
- **Quick scan** — critical issues only, fastest

### Phase 1: Technical SEO Audit

#### 1.1 Crawlability & Indexing

**Local mode:**
- Check for `robots.txt` in public/static directory. Verify it doesn't block important paths.
- Check for XML sitemap generation (look for sitemap scripts, next-sitemap config, or static sitemap.xml).
- Verify `<link rel="canonical">` on all pages. Check for duplicates or missing canonicals.
- Check for `noindex`/`nofollow` meta tags — flag any that shouldn't be there.
- Scan for orphan pages (routes defined but not linked from any other page).
- Check redirect configurations (vercel.json, next.config.js, .htaccess) for chains (A→B→C) or loops.

**Live mode (Firecrawl):**
- Crawl the site starting from homepage. Map all discovered URLs.
- Fetch and parse robots.txt.
- Fetch and parse sitemap.xml. Compare sitemap URLs vs crawled URLs — flag mismatches.
- Check HTTP status codes for all pages. Flag 4xx/5xx errors.
- Detect redirect chains by following each redirect to final destination.
- Check canonical tags on each crawled page.

**What to report:**
| Check | Status | Details | Fix |
|-------|--------|---------|-----|
| robots.txt | Pass/Fail/Warning | What's blocked, what's missing | Specific fix |
| XML Sitemap | Pass/Fail | URL count, freshness, missing pages | Generate or fix |
| Canonical tags | Pass/Fail | Pages missing or with wrong canonical | Add/correct |
| Redirect chains | Pass/Fail | Chain paths found | Simplify to direct |
| Orphan pages | Warning | Unreachable routes | Add internal links |

#### 1.2 Core Web Vitals & Performance

**Local mode:**
- Scan for unoptimized images (no width/height, missing lazy loading, large formats like BMP/TIFF).
- Check for `loading="lazy"` on below-fold images.
- Check for `fetchpriority="high"` on LCP candidate (hero image).
- Verify font loading strategy (font-display: swap, preload for critical fonts).
- Check for render-blocking CSS/JS in the `<head>`.
- Look for excessive DOM depth or large component trees.
- Check bundle splitting configuration (dynamic imports, code splitting).
- Verify image optimization setup (next/image, vite-imagetools, sharp, etc.).

**Live mode:**
- Use Firecrawl to fetch page HTML. Analyze document structure.
- Check for resource hints (preconnect, prefetch, preload).
- Analyze total page weight from HTML content.
- Check for compression headers (gzip/brotli).
- Check cache headers on static assets.

**What to report:**
| Metric | Status | Current | Target | Fix |
|--------|--------|---------|--------|-----|
| Image optimization | Pass/Fail | Details | Best practice | Specific fix |
| Font loading | Pass/Fail | Strategy used | font-display: swap | Code change |
| Code splitting | Pass/Fail | Bundle details | Dynamic imports | Code change |
| Resource hints | Pass/Fail | What's missing | preconnect/preload | Add tags |

#### 1.3 Mobile-First & Accessibility

- Check viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1">`).
- Verify responsive design patterns (media queries, fluid layouts).
- Check touch target sizes (minimum 48x48px for interactive elements).
- Scan for horizontal scroll issues (fixed widths > viewport).
- Check font sizes (minimum 16px body text for mobile readability).

#### 1.4 HTTPS & Security Headers

**Live mode:**
- Verify HTTPS with valid certificate.
- Check security headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP.
- Check for mixed content (HTTP resources on HTTPS pages).

**Local mode:**
- Check deployment config for security headers (vercel.json, next.config.js headers).
- Verify no hardcoded HTTP URLs in source code.

### Phase 2: Structured Data & Meta Tags

#### 2.1 Meta Tags Audit

For every page/route in the project:

**Check these tags exist and are optimized:**
- `<title>` — 50-60 chars, includes primary keyword, unique per page
- `<meta name="description">` — 150-160 chars, compelling, includes CTA, unique per page
- `<meta name="robots">` — appropriate directives
- `<link rel="canonical">` — self-referencing or pointing to correct canonical
- Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `<meta name="viewport">` — present and correct

**Common issues to flag:**
- Duplicate titles or descriptions across pages
- Titles too long (truncated in SERP) or too short (wasting space)
- Missing OG images (hurts social sharing CTR)
- Generic descriptions that don't differentiate pages

**Local mode — how to find meta tags:**
- React Helmet / react-helmet-async: search for `<Helmet>` or `<HelmetProvider>`
- Next.js: check `metadata` exports, `generateMetadata()`, or `<Head>` components
- Plain HTML: check `<head>` sections
- Vue/Nuxt: check `useHead()`, `useSeoMeta()`, or `<Head>` components
- Astro: check frontmatter or `<head>` in layouts
- Search for SEO components: Grep for patterns like `PageSEO`, `SEO`, `Meta`, `Head`

#### 2.2 Structured Data (JSON-LD)

Check for and recommend structured data types based on page content:

| Page Type | Recommended Schema | Priority |
|-----------|-------------------|----------|
| Homepage | Organization, WebSite, SearchAction | High |
| About page | Organization, Person | Medium |
| Service pages | Service, FAQPage, HowTo | High |
| Blog posts | Article, BlogPosting, BreadcrumbList | High |
| Product pages | Product, Offer, AggregateRating | Critical |
| Contact page | LocalBusiness, ContactPoint | High |
| FAQ sections | FAQPage | High |
| Case studies | Article, CreativeWork | Medium |
| Events | Event | High |
| Recipes | Recipe | High |
| Videos | VideoObject | Medium |

**Validation checks:**
- JSON-LD is valid JSON (no syntax errors).
- Required properties are present per schema.org spec.
- No deprecated properties used.
- @context is "https://schema.org".
- Structured data matches visible page content (no cloaking).

**Auto-fix capability (local mode):**
Generate JSON-LD scripts for pages missing structured data. Place them in the appropriate component or layout. Use existing data from the page content to populate schema fields.

#### 2.3 Heading Hierarchy

- Verify exactly one `<h1>` per page containing the primary keyword.
- Check heading hierarchy (h1 → h2 → h3, no skipped levels).
- Flag pages with no h1 or multiple h1s.
- Check that headings contain relevant keywords naturally (not keyword-stuffed).

### Phase 3: On-Page & Content SEO

#### 3.1 Content Quality Analysis

For each major page, evaluate:

- **Word count** — Informational pages should have 1000+ words for competitive keywords. Thin content (< 300 words) gets flagged.
- **Keyword usage** — Primary keyword in first 100 words, in h1, in at least one h2, and naturally throughout. Keyword density between 1-2% is healthy — above 3% flags stuffing.
- **Internal linking** — Each page should link to 3-5 related pages. Check for orphan pages with zero internal links pointing to them.
- **Image alt text** — Every `<img>` needs descriptive alt text. Flag empty `alt=""` on content images (decorative images with empty alt are OK).
- **URL structure** — Clean, readable, keyword-containing URLs. Flag dynamic parameters, excessive depth (>3 levels), or non-descriptive slugs.

#### 3.2 E-E-A-T Signals

Check for signals that demonstrate Experience, Expertise, Authoritativeness, and Trustworthiness:

- **Author information** — Do blog posts have named authors with bio pages?
- **About page** — Does it clearly establish who/what the organization is?
- **Contact information** — Is there a real address, phone, email?
- **Credentials** — Are certifications, awards, or affiliations mentioned?
- **Social proof** — Testimonials, reviews, case studies present?
- **External references** — Links to authoritative sources?
- **Content freshness** — Are dates shown? Is content regularly updated?
- **Privacy policy / Terms** — Do they exist?

#### 3.3 Content Gap Analysis

If the user provides target keywords or competitors:

1. Use Firecrawl/web search to analyze competitor content.
2. Identify topics competitors cover that the user doesn't.
3. Find keyword opportunities where competitors rank but the user doesn't.
4. Suggest content types the user is missing (guides, comparisons, glossaries, tools).
5. Map content to buyer journey stages (awareness → consideration → decision).

#### 3.4 Topic Cluster Strategy

If the site has blog/content pages:

1. Identify existing topic clusters (groups of related content).
2. Find gaps in clusters (missing supporting articles).
3. Suggest pillar page opportunities.
4. Recommend internal linking between cluster pages.
5. Provide a content calendar outline for filling gaps.

### Phase 4: Local SEO (if applicable)

Skip this phase if the business is purely online with no physical location or service area.

#### 4.1 Local Schema Markup

Check for LocalBusiness or Organization schema with:
- Business name, address, phone (NAP)
- Opening hours
- Geo coordinates
- Service area (for service-area businesses)
- Price range
- Payment methods accepted

#### 4.2 NAP Consistency

- Verify NAP (Name, Address, Phone) is consistent across:
  - Website footer/contact page
  - Structured data
  - Google Business Profile (if URL provided)
- Flag any inconsistencies.

#### 4.3 Local SEO Checklist

| Check | Status | Action |
|-------|--------|--------|
| LocalBusiness schema | | Add/fix |
| NAP on contact page | | Verify |
| Embedded Google Map | | Add if missing |
| Location-specific title tags | | Optimize |
| Location pages (multi-location) | | Create if needed |
| Local keyword targeting | | Review |

### Phase 5: Off-Page SEO Analysis

This phase requires live site mode (Firecrawl + web search).

#### 5.1 Backlink Profile Overview

Use web search to assess:
- Estimated domain authority/strength.
- Types of sites linking to the domain.
- Anchor text patterns.
- Potential toxic/spammy backlinks.
- Competitor backlink comparison.

#### 5.2 Social Signals

Check for:
- Social media profile links on the website.
- Open Graph / Twitter Card implementation (covered in Phase 2).
- Social sharing buttons or functionality.
- Content shareability assessment.

#### 5.3 Link Building Opportunities

Based on the site's niche, suggest:
- Guest posting targets.
- Resource page opportunities.
- Broken link building targets.
- Digital PR angles.
- Industry directory submissions.

### Phase 6: Monitoring & Ongoing SEO

#### 6.1 Search Console Readiness

Check that the site is set up for monitoring:
- Sitemap submitted to Search Console (check for sitemap.xml).
- Google Analytics or equivalent tracking installed.
- Web Vitals monitoring (check for analytics/vitals reporting endpoint).

#### 6.2 SEO Infrastructure

- Does the site have an analytics setup? (GA4, Plausible, Fathom, etc.)
- Is there a Web Vitals collection endpoint?
- Are there 404 monitoring or error tracking tools?
- Is there a content update workflow?

#### 6.3 Competitor Benchmarking

If competitors provided:
- Compare title/description patterns.
- Compare structured data usage.
- Compare content depth and coverage.
- Compare technical implementation.
- Identify competitive advantages and gaps.

## Auto-Fix Engine (Local Mode Only)

After the audit, offer to auto-fix issues that are safe to apply. Categorize fixes by risk:

### Safe to Auto-Fix (apply without asking)
- Add missing `alt` attributes to images (generate descriptive text from context)
- Add `loading="lazy"` to below-fold images
- Add `fetchpriority="high"` to hero/LCP images
- Fix heading hierarchy (h3 → h2 where h2 is skipped)
- Add missing viewport meta tag
- Add `font-display: swap` to @font-face declarations
- Add `rel="noopener noreferrer"` to external links with `target="_blank"`

### Fix with Confirmation (show diff, ask user)
- Generate/update meta titles and descriptions
- Add or update structured data (JSON-LD)
- Create or update robots.txt
- Create or update sitemap generation
- Add canonical tags
- Add Open Graph / Twitter Card meta tags
- Add internal links to orphan pages
- Optimize URL slugs in route definitions

### Report Only (too risky or requires human judgment)
- Content rewrites for keyword optimization
- Redirect implementations
- Hreflang setup for international sites
- Schema changes for local business info
- Backlink strategy execution

When auto-fixing, always:
1. Show the user what will change before applying
2. Make atomic changes (one fix per edit, easy to review)
3. Run the project's build/type-check after fixes to verify nothing broke

## Report Format

After all phases, produce a structured report. Use this exact template:

```
# SEO Audit Report: [Site/Project Name]
**Date:** [date]
**Mode:** [Local / Live / Hybrid]
**Scope:** [Full / Technical / Content / Quick]

## SEO Score: [X/100]

Calculate based on weighted categories:
- Technical SEO (25%): [X/25]
- Meta & Structured Data (20%): [X/20]
- On-Page & Content (25%): [X/25]
- Performance (15%): [X/15]
- Local SEO (5%): [X/5] (or N/A)
- Off-Page (10%): [X/10]

## Executive Summary

[3-5 sentences: biggest strength, top 3 priorities, overall assessment]

## Critical Issues (Fix Immediately)

[Issues that are actively hurting rankings or blocking indexing]

| # | Issue | Impact | Pages Affected | Fix |
|---|-------|--------|----------------|-----|

## High Priority (Fix This Week)

| # | Issue | Impact | Pages Affected | Fix |
|---|-------|--------|----------------|-----|

## Medium Priority (Fix This Month)

| # | Issue | Impact | Pages Affected | Fix |
|---|-------|--------|----------------|-----|

## Low Priority (Nice to Have)

| # | Issue | Impact | Pages Affected | Fix |
|---|-------|--------|----------------|-----|

## Auto-Fixed Issues

[List of issues that were automatically resolved, with before/after]

## Keyword Opportunities

| Keyword | Difficulty | Intent | Current Status | Recommended Action |
|---------|-----------|--------|----------------|-------------------|

## Content Recommendations

[Topic clusters, content gaps, content calendar suggestions]

## Technical Details

[Detailed findings from each phase, for reference]

## Next Steps

1. [Most impactful action]
2. [Second most impactful]
3. [Third most impactful]
```

## Framework-Specific Patterns

When working in local mode, adapt your analysis to the framework:

### React (Vite/CRA)
- SEO component: look for Helmet, react-helmet-async, or custom SEO components
- Routing: react-router — check all `<Route>` definitions for pages
- SSR/SSG: Check if using Vite SSR plugin or if it's pure SPA (SPA = limited SEO, flag this)
- Structured data: usually in SEO components or inline `<script type="application/ld+json">`

### Next.js
- Metadata: check `metadata` exports and `generateMetadata()` in page/layout files
- Sitemap: check for `sitemap.ts/js` in app directory or next-sitemap config
- robots.txt: check for `robots.ts/js` in app directory
- Structured data: JSON-LD in page components or via metadata API
- Images: check usage of `next/image` vs raw `<img>`
- Dynamic routes: check `generateStaticParams()` for proper static generation

### Astro
- SEO: check `<head>` in layout components, Astro SEO integration
- Sitemap: check for `@astrojs/sitemap` integration
- Content collections: check for proper frontmatter with SEO fields

### Vue/Nuxt
- SEO: check `useHead()`, `useSeoMeta()`, Nuxt SEO module
- Sitemap: check for `nuxt-simple-sitemap` or `@nuxtjs/sitemap`
- Routing: check pages directory structure

### Static HTML
- Direct `<head>` inspection per file
- Check for consistent template patterns across pages

## Using Firecrawl for Live Analysis

When in live site mode, use Firecrawl to:

1. **Crawl the site** — Start from homepage, discover all linked pages
2. **Extract page data** — Get HTML, meta tags, headings, links, images per page
3. **Check robots.txt** — Fetch and parse directly
4. **Check sitemap** — Fetch XML sitemap, parse URLs
5. **Analyze competitors** — Crawl competitor sites for comparison
6. **Research keywords** — Search for keyword data and SERP features

Firecrawl returns clean markdown optimized for analysis. Use it for any URL fetch — it handles JavaScript rendering and returns structured content.

## Important Principles

**Prioritize by impact.** Not all SEO issues are equal. A missing h1 on the homepage is critical. A missing alt tag on a decorative footer icon is low priority. Rank everything by actual impact on rankings and traffic.

**Don't over-optimize.** Keyword stuffing, excessive schema markup, and manipulative tactics hurt more than they help. The goal is to make the site genuinely useful, well-structured, and easy for search engines to understand.

**Context matters.** A personal blog doesn't need LocalBusiness schema. An e-commerce site doesn't need the same content strategy as a SaaS landing page. Adapt recommendations to the actual site type and business goals.

**Measure what matters.** Focus on metrics that correlate with rankings: crawlability, page speed, content quality, structured data coverage, and internal linking — not vanity metrics.

See `references/structured-data.md` for complete JSON-LD templates for every schema type.
See `references/checklist.md` for the complete 100-point SEO checklist with pass/fail criteria.
