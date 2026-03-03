---
name: seo-master
description: Deep SEO analysis and optimization - technical audits, Core Web Vitals, schema markup, metadata, sitemaps, content SEO. Use --audit for full analysis, --fix to implement fixes, --schema for structured data.
tags: [seo, performance, metadata, schema, sitemap, web-vitals, 2026]
---

# SEO Master

One skill for complete SEO optimization. I analyze, audit, and fix SEO issues across your entire site.

## Modes

Use flags to specify what you need:
- `--audit` (default): Full SEO audit with parallel agents
- `--fix`: Implement SEO fixes based on audit findings
- `--schema`: Generate/optimize structured data markup
- `--quick`: Fast check of critical SEO elements only

## What I Do

### --audit Mode (Default)
Run comprehensive SEO analysis using parallel agents:
1. **Technical SEO** - Crawlability, indexability, site structure
2. **Core Web Vitals** - LCP, INP, CLS optimization
3. **On-Page SEO** - Meta tags, headings, content optimization
4. **Schema Markup** - Structured data validation
5. **Mobile SEO** - Mobile-first indexing compliance
6. **Performance** - Page speed, bundle size, image optimization

### --fix Mode
Implement fixes based on audit findings:
- Add/update metadata
- Generate sitemaps
- Configure robots.txt
- Add schema markup
- Optimize images
- Fix Core Web Vitals issues

### --schema Mode
Generate and optimize structured data:
- Organization, Website, WebPage
- Article, BlogPosting, NewsArticle
- Product, Offer, Review
- FAQ, HowTo, Recipe
- LocalBusiness, Event
- BreadcrumbList, SiteNavigationElement

### --quick Mode
Fast check of critical elements:
- Title and description presence
- H1 structure
- Image alt tags
- Canonical URLs
- robots.txt and sitemap
- Core Web Vitals estimate

## Pre-Audit Discovery

Quickly identify:
```
1. Framework (Next.js, React, Vue, Astro?)
2. Meta framework (next-seo, @nuxtjs/seo?)
3. Current SEO setup (metadata API, head tags?)
4. Sitemap generation method
5. Analytics/Search Console connected?
```

## Audit Checklist Agents (Spawn in Parallel)

### Agent 1: Technical SEO Audit
```
Prompt: |
  Technical SEO Audit. Check:

  CRITICAL:
  [ ] robots.txt exists and properly configured
  [ ] sitemap.xml exists and valid
  [ ] No noindex on important pages
  [ ] Canonical URLs set correctly
  [ ] No duplicate content issues
  [ ] SSL/HTTPS enforced
  [ ] Clean URL structure (no query params for content)

  HIGH:
  [ ] XML sitemap includes all important pages
  [ ] Sitemap lastmod dates accurate
  [ ] Internal linking structure optimized
  [ ] No broken internal links (404s)
  [ ] Redirect chains < 3 hops
  [ ] Proper 301/302 redirect usage

  MEDIUM:
  [ ] Pagination handled correctly (rel=prev/next or infinite scroll)
  [ ] Hreflang tags for multilingual sites
  [ ] URL parameters handled in Search Console
  [ ] Crawl budget optimized

  RETURN: Checklist with PASS/FAIL/WARN, file references, fixes needed
```

### Agent 2: Core Web Vitals Audit
```
Prompt: |
  Core Web Vitals & Performance SEO Audit. Check:

  CRITICAL (2026 thresholds):
  [ ] LCP (Largest Contentful Paint) ≤ 2.5s
  [ ] INP (Interaction to Next Paint) ≤ 200ms
  [ ] CLS (Cumulative Layout Shift) < 0.1

  HIGH:
  [ ] First Contentful Paint < 1.8s
  [ ] Time to First Byte < 800ms
  [ ] Total Blocking Time < 200ms
  [ ] Images use next/image or optimized loading
  [ ] Fonts preloaded with display: swap
  [ ] Critical CSS inlined
  [ ] JavaScript properly deferred/async

  MEDIUM:
  [ ] Third-party scripts audited and minimized
  [ ] Resource hints (preconnect, prefetch, preload)
  [ ] Service worker for caching (if PWA)
  [ ] Compression enabled (Brotli > Gzip)

  ANALYZE:
  - Bundle size breakdown
  - Largest assets
  - Render-blocking resources
  - Long tasks in JavaScript

  RETURN: Metrics with current values, targets, and specific optimizations
```

### Agent 3: On-Page SEO Audit
```
Prompt: |
  On-Page SEO Audit. Check:

  CRITICAL:
  [ ] Unique title tag per page (50-60 chars)
  [ ] Unique meta description per page (150-160 chars)
  [ ] Single H1 per page with primary keyword
  [ ] Heading hierarchy (H1 > H2 > H3, no skips)
  [ ] Image alt attributes descriptive and present

  HIGH:
  [ ] Open Graph tags complete (og:title, og:description, og:image, og:url)
  [ ] Twitter Card tags (twitter:card, twitter:title, twitter:image)
  [ ] Favicon configured (multiple sizes)
  [ ] Apple touch icons
  [ ] Theme color for mobile browsers

  MEDIUM:
  [ ] Content length appropriate (>300 words for key pages)
  [ ] Keyword density natural (1-2%)
  [ ] Internal links with descriptive anchor text
  [ ] External links to authoritative sources
  [ ] Content freshness dates

  RETURN: Page-by-page analysis with specific improvements
```

### Agent 4: Schema Markup Audit
```
Prompt: |
  Structured Data / Schema Markup Audit. Check:

  CRITICAL:
  [ ] Schema markup present on key pages
  [ ] JSON-LD format used (Google recommended)
  [ ] No errors in Google Rich Results Test
  [ ] Required properties filled for each type

  BY PAGE TYPE:
  Homepage:
  [ ] Organization or LocalBusiness schema
  [ ] WebSite schema with SearchAction
  [ ] SiteNavigationElement for main nav

  Blog/Articles:
  [ ] Article or BlogPosting schema
  [ ] Author, datePublished, dateModified
  [ ] Publisher with logo
  [ ] Image property

  Products:
  [ ] Product schema with name, image, description
  [ ] Offer with price, priceCurrency, availability
  [ ] Review/AggregateRating if reviews exist
  [ ] Brand property

  FAQ Pages:
  [ ] FAQPage schema
  [ ] Question and acceptedAnswer pairs

  ADVANCED:
  [ ] BreadcrumbList for navigation
  [ ] VideoObject for video content
  [ ] HowTo for tutorials
  [ ] Event for events

  RETURN: Current schema status, missing schemas, JSON-LD code to add
```

### Agent 5: Mobile SEO Audit
```
Prompt: |
  Mobile SEO Audit. Check:

  CRITICAL:
  [ ] Mobile-friendly (passes Google test)
  [ ] Viewport meta tag configured
  [ ] Touch targets ≥ 48px
  [ ] No horizontal scrolling
  [ ] Text readable without zoom (16px+ base)

  HIGH:
  [ ] Mobile page speed optimized
  [ ] Images responsive (srcset or next/image)
  [ ] Forms mobile-optimized (input types, autocomplete)
  [ ] No intrusive interstitials
  [ ] Mobile menu accessible

  MEDIUM:
  [ ] AMP pages (if applicable)
  [ ] PWA capabilities (manifest, service worker)
  [ ] Click-to-call for phone numbers
  [ ] Mobile-specific structured data

  RETURN: Mobile-specific issues and fixes
```

### Agent 6: Content & Link SEO Audit
```
Prompt: |
  Content & Link SEO Audit. Check:

  CONTENT:
  [ ] Unique, valuable content on each page
  [ ] No thin content (< 300 words on key pages)
  [ ] No duplicate content across pages
  [ ] Content matches search intent
  [ ] Featured snippet optimization (lists, tables, definitions)

  INTERNAL LINKING:
  [ ] Logical site architecture (< 3 clicks to any page)
  [ ] Important pages linked from homepage
  [ ] Contextual internal links in content
  [ ] Breadcrumb navigation
  [ ] Footer links to key pages

  TECHNICAL CONTENT:
  [ ] URL slugs include target keywords
  [ ] Image file names descriptive
  [ ] No orphan pages (pages with no internal links)
  [ ] Proper use of nofollow for untrusted links

  RETURN: Content gaps, link opportunities, optimization suggestions
```

## Audit Report Format

```markdown
# SEO Audit Report

**Site:** [URL]
**Date:** YYYY-MM-DD
**Audited By:** Claude Opus 4.5 (6 parallel agents)

## Overall SEO Score: [X/100]

### Summary
| Category | Score | Issues |
|----------|-------|--------|
| Technical SEO | [X/100] | [X critical, Y high] |
| Core Web Vitals | [X/100] | [LCP: Xs, INP: Xms, CLS: X] |
| On-Page SEO | [X/100] | [X pages need fixes] |
| Schema Markup | [X/100] | [X schemas missing] |
| Mobile SEO | [X/100] | [X issues] |
| Content & Links | [X/100] | [X opportunities] |

## 🚨 CRITICAL (Fix Immediately)
1. [Issue] - [Impact] - [How to fix]

## ⚠️ HIGH PRIORITY (Fix This Week)
1. [Issue] - [Impact] - [How to fix]

## 📋 MEDIUM (Plan to Address)
1. [Issue] - [Recommendation]

## ✅ PASSING
- [What's working well]

---

## Detailed Reports
[Full output from each agent]

---

## Implementation Checklist

### Immediate Actions
- [ ] Fix critical issues
- [ ] Add missing metadata
- [ ] Submit sitemap to Search Console

### Short-term (This Week)
- [ ] Implement schema markup
- [ ] Optimize Core Web Vitals
- [ ] Fix mobile issues

### Ongoing
- [ ] Monitor Search Console
- [ ] Track Core Web Vitals
- [ ] Update content regularly
```

## Next.js SEO Implementation Guide

### Metadata API (App Router)

```tsx
// app/layout.tsx - Global defaults
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://yoursite.com'), // CRITICAL: Required for OG images
  title: {
    default: 'Site Name',
    template: '%s | Site Name', // Page titles become "Page Title | Site Name"
  },
  description: 'Default site description for SEO',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Site Name',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@handle',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};
```

```tsx
// app/blog/[slug]/page.tsx - Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}
```

### Sitemap Generation

```tsx
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://yoursite.com';

  // Get dynamic routes
  const posts = await getPosts();
  const products = await getProducts();

  const postEntries = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const productEntries = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postEntries,
    ...productEntries,
  ];
}
```

### robots.txt

```tsx
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://yoursite.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
      },
      // Block AI crawlers if desired
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### JSON-LD Schema Markup

```tsx
// components/JsonLd.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape </script> sequences to prevent injection, then render as JSON-LD
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}

// Usage in pages
export default function HomePage() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Company Name',
    url: 'https://yoursite.com',
    logo: 'https://yoursite.com/logo.png',
    sameAs: [
      'https://twitter.com/company',
      'https://linkedin.com/company/company',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-555-5555',
      contactType: 'customer service',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Site Name',
    url: 'https://yoursite.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://yoursite.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      {/* Page content */}
    </>
  );
}
```

```tsx
// Blog post schema
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  image: post.image,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: {
    '@type': 'Person',
    name: post.author.name,
    url: post.author.url,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Company Name',
    logo: {
      '@type': 'ImageObject',
      url: 'https://yoursite.com/logo.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://yoursite.com/blog/${post.slug}`,
  },
};
```

```tsx
// FAQ schema
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};
```

```tsx
// Product schema
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: product.images,
  description: product.description,
  brand: {
    '@type': 'Brand',
    name: product.brand,
  },
  offers: {
    '@type': 'Offer',
    url: `https://yoursite.com/products/${product.slug}`,
    priceCurrency: 'USD',
    price: product.price,
    availability: product.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      name: 'Company Name',
    },
  },
  aggregateRating: product.reviewCount > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: product.rating,
    reviewCount: product.reviewCount,
  } : undefined,
};
```

### Breadcrumbs

```tsx
// components/Breadcrumbs.tsx
interface BreadcrumbItem {
  name: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://yoursite.com${item.href}`,
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 && <span>/</span>}
              {index === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <a href={item.href} className="hover:underline">
                  {item.name}
                </a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
```

## Core Web Vitals Optimization

### LCP Optimization
```tsx
// Preload critical images
<link rel="preload" href="/hero.webp" as="image" />

// Use priority for above-fold images
<Image src="/hero.webp" alt="Hero" priority />

// Optimize fonts
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
```

### CLS Prevention
```tsx
// Always set dimensions on images
<Image src="/photo.jpg" width={800} height={600} alt="Photo" />

// Reserve space for dynamic content
<div className="min-h-[400px]">
  {loading ? <Skeleton /> : <Content />}
</div>

// Use aspect-ratio
<div className="aspect-video">
  <iframe src="..." />
</div>
```

### INP Optimization
```tsx
// Debounce expensive handlers
const debouncedSearch = useDebouncedCallback((value) => {
  search(value);
}, 300);

// Use transitions for non-urgent updates
const [isPending, startTransition] = useTransition();

function handleChange(value) {
  startTransition(() => {
    setFilteredList(filterList(value));
  });
}
```

## SEO Tools & Validation

### Command Line Checks
```bash
# Run Lighthouse audit
npx lighthouse https://yoursite.com --output=json --output-path=./lighthouse.json

# Check sitemap
curl https://yoursite.com/sitemap.xml

# Check robots.txt
curl https://yoursite.com/robots.txt

# Validate schema markup
npx schema-dts-gen validate ./schema.json
```

### Online Tools
- Google Search Console: https://search.google.com/search-console
- Rich Results Test: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- Schema Validator: https://validator.schema.org

## After Audit

Offer options:
```
"SEO Audit complete. Score: [X/100]. Would you like to:

1. **Fix Critical Issues** - Implement urgent fixes now
2. **Add Schema Markup** - Generate JSON-LD for your pages
3. **Optimize Metadata** - Update titles, descriptions, OG tags
4. **Generate Sitemap** - Create/update sitemap.xml
5. **Core Web Vitals** - Deep dive into performance fixes
6. **Save Report** - Save to docs/seo-audit-YYYY-MM-DD.md"
```

## Trigger Phrases

- "seo audit" / "run seo analysis" → --audit mode
- "fix seo" / "implement seo fixes" → --fix mode
- "add schema" / "structured data" → --schema mode
- "quick seo check" → --quick mode
- "optimize for search" → --audit then --fix

## Related Skills

- **production-audit** - Full production readiness check
- **frontend-master** - Performance and UI optimization
- **stack-researcher** - Research latest SEO best practices
