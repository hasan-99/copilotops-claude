# Performance Deep Audit Checklist

## Bundle Size
- [ ] No barrel imports pulling entire libraries (import { x } from 'lib' vs import x from 'lib/x')
- [ ] Heavy dependencies have lighter alternatives (moment to dayjs, lodash to lodash-es or native)
- [ ] Dynamic imports used for below-fold / conditionally shown components
- [ ] Tree-shaking working (no side-effect imports)
- [ ] Check bundle with @next/bundle-analyzer or source-map-explorer
- [ ] No duplicate dependencies in bundle (different versions of same lib)

## Next.js Rendering
- [ ] Server Components used by default — "use client" only when needed
- [ ] Components with "use client" actually use client features (hooks, events, browser APIs)
- [ ] No waterfall fetching (parallel data loading with Promise.all or parallel server component rendering)
- [ ] Suspense boundaries wrap async components
- [ ] loading.tsx exists for pages with data fetching
- [ ] Static pages pre-rendered where possible
- [ ] revalidate set appropriately for ISR pages
- [ ] Streaming used for slow data sources (nested Suspense)
- [ ] unstable_cache or cache() used for expensive server-side computations
- [ ] Partial Prerendering (PPR) considered for mixed static/dynamic pages (Next.js 15+)

## Data Fetching
- [ ] No redundant API calls (same data fetched multiple times)
- [ ] SWR/React Query configured with appropriate staleTime/dedupingInterval
- [ ] Pagination for large datasets (not loading 1000+ records)
- [ ] Server-side filtering/sorting (not client-side on large datasets)
- [ ] .select('col1, col2') used to fetch only needed fields (not select('*'))
- [ ] Queries cached at appropriate level
- [ ] No client-side fetching for data available at request time via server components
- [ ] prefetch used for likely next navigations (Next.js Link default behavior)

## Core Web Vitals
- [ ] LCP (Largest Contentful Paint): Hero images use priority prop, no render-blocking CSS/JS, fonts preloaded
- [ ] CLS (Cumulative Layout Shift): All images/embeds have explicit width/height, no injected content above fold, font display swap configured
- [ ] INP (Interaction to Next Paint): Event handlers are fast (under 50ms), heavy work uses useTransition or startTransition, no synchronous layouts in click handlers
- [ ] TTFB (Time to First Byte): Edge functions / middleware not adding latency, database queries optimized, CDN cache hit ratio high

## Images and Assets
- [ ] All images use next/image with width/height set
- [ ] Hero/above-fold images have priority={true}
- [ ] WebP/AVIF format used where possible (next/image handles this automatically)
- [ ] Font files subset to used characters
- [ ] Fonts preloaded with next/font (not manual @font-face)
- [ ] SVGs used for icons instead of PNGs
- [ ] No unused font weights loaded
- [ ] No images over 500KB without good reason

## React Performance
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] React.memo for pure components receiving complex/object props from parent
- [ ] useMemo for expensive computations (not for simple values)
- [ ] useCallback for callbacks passed to memoized children (not everywhere)
- [ ] useTransition for non-urgent state updates (tab switching, filtering)
- [ ] Virtualized lists for 50+ items (react-window, @tanstack/virtual)
- [ ] Debounced search inputs and resize handlers
- [ ] No inline object/array creation in JSX props causing child re-renders
- [ ] React 19: use() hook for async data in client components where appropriate

## CSS Performance
- [ ] No layout thrashing (reading then writing DOM in loops)
- [ ] CSS animations use transform/opacity (GPU-accelerated properties)
- [ ] No will-change overuse (only on elements that actually animate)
- [ ] Critical CSS inlined (Next.js handles this for CSS Modules / Tailwind)
- [ ] Unused CSS purged (Tailwind purge config correct)
- [ ] No CSS-in-JS libraries causing hydration overhead (prefer Tailwind / CSS Modules)

## Network
- [ ] API responses compressed (gzip/brotli — Vercel handles this automatically)
- [ ] Proper cache headers on static assets
- [ ] CDN used for static assets (Vercel handles this)
- [ ] No unnecessary redirects in middleware
- [ ] Prefetching for likely next navigations
- [ ] API route responses are minimal (no over-fetching in route handlers)
