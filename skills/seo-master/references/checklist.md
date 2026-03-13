# 100-Point SEO Checklist

Complete pass/fail checklist with scoring. Each item is worth 1 point. Total score = number of passes out of 100.

## Table of Contents

1. [Crawlability & Indexing (15 points)](#crawlability--indexing-15-points)
2. [Meta Tags & Head (15 points)](#meta-tags--head-15-points)
3. [Structured Data (10 points)](#structured-data-10-points)
4. [Content & On-Page (20 points)](#content--on-page-20-points)
5. [Performance & Core Web Vitals (15 points)](#performance--core-web-vitals-15-points)
6. [Mobile & UX (10 points)](#mobile--ux-10-points)
7. [Security & Infrastructure (5 points)](#security--infrastructure-5-points)
8. [Local SEO (5 points)](#local-seo-5-points)
9. [Off-Page & Social (5 points)](#off-page--social-5-points)

---

## Crawlability & Indexing (15 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 1 | robots.txt exists | File present at /robots.txt | Critical |
| 2 | robots.txt not blocking important pages | No Disallow on key content pages | Critical |
| 3 | XML sitemap exists | sitemap.xml present and valid | Critical |
| 4 | Sitemap in robots.txt | Sitemap directive in robots.txt | High |
| 5 | All important pages in sitemap | Key pages included, 4xx/5xx excluded | High |
| 6 | Canonical tags on all pages | Every page has self-referencing or correct canonical | High |
| 7 | No duplicate canonicals | Each canonical URL is unique | Medium |
| 8 | No redirect chains | All redirects resolve in 1 hop | Medium |
| 9 | No redirect loops | No circular redirects detected | Critical |
| 10 | No orphan pages | All pages reachable via internal links | Medium |
| 11 | Clean URL structure | No query params for content, readable slugs | Medium |
| 12 | Proper 404 handling | Custom 404 page, correct status code | Medium |
| 13 | No noindex on important pages | Key pages are indexable | Critical |
| 14 | Hreflang (if multilingual) | Correct lang codes, reciprocal tags | High |
| 15 | Crawl budget efficient | No infinite parameter URLs, faceted nav controlled | Medium |

## Meta Tags & Head (15 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 16 | Title tag on every page | All pages have `<title>` | Critical |
| 17 | Titles are unique | No duplicate titles across pages | High |
| 18 | Titles 50-60 characters | Within optimal length range | Medium |
| 19 | Titles include target keyword | Primary keyword in title | High |
| 20 | Meta description on every page | All pages have meta description | High |
| 21 | Descriptions are unique | No duplicate descriptions | Medium |
| 22 | Descriptions 150-160 characters | Within optimal length range | Low |
| 23 | Descriptions include CTA | Action-oriented language | Low |
| 24 | Open Graph tags present | og:title, og:description, og:image, og:url | Medium |
| 25 | OG image meets requirements | 1200x630px minimum, < 8MB | Medium |
| 26 | Twitter Card tags present | twitter:card, twitter:title, twitter:description | Low |
| 27 | Viewport meta tag | `width=device-width, initial-scale=1` | Critical |
| 28 | Language declared | `<html lang="en">` or appropriate | Medium |
| 29 | Charset declared | `<meta charset="utf-8">` first in head | Medium |
| 30 | Favicon present | favicon.ico or link rel="icon" | Low |

## Structured Data (10 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 31 | Organization schema on homepage | Valid Organization JSON-LD | High |
| 32 | WebSite schema on homepage | With SearchAction if site has search | Medium |
| 33 | BreadcrumbList on inner pages | Correct hierarchy matching navigation | Medium |
| 34 | Article/BlogPosting on blog posts | With author, date, publisher | High |
| 35 | FAQPage on FAQ sections | Valid Q&A markup | Medium |
| 36 | Service schema on service pages | With provider and description | Medium |
| 37 | LocalBusiness (if applicable) | With NAP, hours, geo | High |
| 38 | No JSON-LD syntax errors | All scripts parse as valid JSON | Critical |
| 39 | Schema matches visible content | No hidden or misleading data | Critical |
| 40 | Required properties present | Per Google's rich result requirements | High |

## Content & On-Page (20 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 41 | One H1 per page | Exactly one `<h1>` on each page | High |
| 42 | H1 includes primary keyword | Natural keyword inclusion | High |
| 43 | Heading hierarchy correct | h1→h2→h3 without skipping levels | Medium |
| 44 | Headings use target keywords | Secondary keywords in h2/h3 | Medium |
| 45 | Keyword in first 100 words | Primary keyword early in content | Medium |
| 46 | Keyword density 1-2% | Not over-stuffed, not absent | Medium |
| 47 | Content length adequate | 300+ words for thin pages, 1000+ for competitive keywords | Medium |
| 48 | All images have alt text | Descriptive alt attributes on content images | High |
| 49 | Alt text includes keywords | Where natural and relevant | Low |
| 50 | Internal links present | 3-5 internal links per content page | High |
| 51 | Internal link anchor text descriptive | Not "click here" or "read more" | Medium |
| 52 | External links to authoritative sources | Links out to trusted references | Low |
| 53 | External links have rel attributes | `noopener noreferrer` on target="_blank" | Medium |
| 54 | No broken internal links | All internal links resolve | High |
| 55 | No broken external links | External links return 200 | Medium |
| 56 | Content is original | No duplicate content issues | Critical |
| 57 | E-E-A-T: Author attribution | Blog posts have named authors | Medium |
| 58 | E-E-A-T: About page | Clear organization/person info | Medium |
| 59 | E-E-A-T: Contact info visible | Email, phone, or contact form | Medium |
| 60 | E-E-A-T: Social proof | Testimonials, reviews, or case studies | Low |

## Performance & Core Web Vitals (15 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 61 | Images optimized | WebP/AVIF format, appropriate dimensions | High |
| 62 | Images have width/height | Explicit dimensions prevent CLS | High |
| 63 | Lazy loading on below-fold images | `loading="lazy"` attribute | Medium |
| 64 | Hero image prioritized | `fetchpriority="high"` on LCP image | High |
| 65 | Fonts optimized | `font-display: swap`, preloaded critical fonts | Medium |
| 66 | No render-blocking resources | Critical CSS inlined or async loading | High |
| 67 | Code splitting implemented | Dynamic imports for route-based splitting | Medium |
| 68 | Bundle size reasonable | Main bundle < 200KB gzipped | Medium |
| 69 | Compression enabled | gzip or brotli on text assets | High |
| 70 | Cache headers set | Static assets cached with long TTL | Medium |
| 71 | Resource hints present | preconnect for external origins | Medium |
| 72 | No excessive DOM depth | DOM tree < 1500 nodes for mobile | Medium |
| 73 | CSS purging/tree-shaking | Unused CSS removed | Low |
| 74 | JavaScript tree-shaking | Dead code eliminated | Low |
| 75 | Preconnect to image CDN | `<link rel="preconnect">` for image hosts | Medium |

## Mobile & UX (10 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 76 | Responsive design | Adapts to all screen sizes | Critical |
| 77 | Touch targets 48x48px minimum | Interactive elements large enough | High |
| 78 | No horizontal scrolling | Content fits viewport width | High |
| 79 | Font size 16px+ on mobile | Body text readable without zooming | Medium |
| 80 | No intrusive interstitials | No popups covering main content on mobile | High |
| 81 | Content accessible without JS | Core content visible if JS fails (SSR/SSG) | Medium |
| 82 | Smooth scrolling behavior | No janky scroll, proper scroll restoration | Low |
| 83 | Accessible navigation | Keyboard navigable, proper ARIA | High |
| 84 | Color contrast passes WCAG AA | 4.5:1 for text, 3:1 for large text | Medium |
| 85 | Skip to main content link | For screen reader accessibility | Low |

## Security & Infrastructure (5 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 86 | HTTPS everywhere | Valid SSL, no mixed content | Critical |
| 87 | HSTS header present | Strict-Transport-Security set | High |
| 88 | Security headers configured | CSP, X-Content-Type-Options, X-Frame-Options | Medium |
| 89 | No exposed sensitive files | No .env, .git, wp-config accessible | Critical |
| 90 | HTTP to HTTPS redirect | All HTTP requests redirect to HTTPS | High |

## Local SEO (5 points)

Skip if not applicable (online-only business). Award all 5 points if N/A.

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 91 | NAP consistent | Same Name/Address/Phone everywhere | High |
| 92 | LocalBusiness schema complete | All required fields populated | High |
| 93 | Google Maps embedded | On contact page | Medium |
| 94 | Location in title tags | City/region in key page titles | Medium |
| 95 | Location pages (multi-location) | Unique page per location | Medium |

## Off-Page & Social (5 points)

| # | Check | Pass Criteria | Severity |
|---|-------|--------------|----------|
| 96 | Social media profiles linked | Links to active social accounts | Low |
| 97 | OG tags produce good previews | Tested with social media debuggers | Medium |
| 98 | Shareable content present | Blog, resources, or tools worth sharing | Low |
| 99 | Privacy policy page | Accessible from footer | Medium |
| 100 | Terms of service page | Accessible from footer | Low |

---

## Scoring Guide

| Score | Rating | Assessment |
|-------|--------|------------|
| 90-100 | Excellent | SEO-optimized, minor improvements only |
| 75-89 | Good | Solid foundation, some gaps to address |
| 60-74 | Fair | Needs attention, several important issues |
| 40-59 | Poor | Significant problems hurting rankings |
| 0-39 | Critical | Major SEO barriers, urgent fixes needed |

## Priority Matrix

When reporting issues, rank by this matrix:

```
                    HIGH IMPACT
                        |
        CRITICAL    |    HIGH
        (fix now)   |    (fix this week)
   -----------------+------------------
        MEDIUM      |    LOW
        (fix month) |    (nice to have)
                        |
                    LOW IMPACT

   EASY FIX ←————————————→ HARD FIX
```

- **Critical** = High impact + Easy fix (quick wins)
- **High** = High impact + Hard fix (strategic investments)
- **Medium** = Low impact + Easy fix (batch these)
- **Low** = Low impact + Hard fix (backlog)
