# Next.js Pattern Audit Checklist

## App Router Patterns
- [ ] Every page has generateMetadata or static metadata export
- [ ] Dynamic routes have generateStaticParams where applicable
- [ ] loading.tsx exists for pages with async data fetching
- [ ] error.tsx exists for pages that can fail
- [ ] not-found.tsx exists for dynamic routes
- [ ] Layout components do not re-fetch data available from parent layouts
- [ ] Root layout has proper html and body tags
- [ ] Route groups (group) used to organize without affecting URL structure
- [ ] Parallel routes (@slot) used where multiple independent sections load

## Server vs Client Components
- [ ] Default is Server Component — "use client" only when needed
- [ ] Client components do not wrap large server component trees (pushes boundary too high)
- [ ] "use client" boundary pushed as low as possible in the tree
- [ ] Interactive parts extracted to small client components (buttons, forms, toggles)
- [ ] Server-only code protected with import 'server-only' package where critical
- [ ] No useState / useEffect in server components (build will catch this, but check)
- [ ] Client components receive serializable props only (no functions, classes, or symbols from server)

## Server Actions (Next.js 14+)
- [ ] Mutations use server actions, not API routes (simpler, type-safe)
- [ ] Server actions validate input with Zod before processing
- [ ] Server actions check auth (getUser() / auth()) before any mutation
- [ ] Server actions call revalidatePath() or revalidateTag() after mutations
- [ ] Error handling returns proper error objects (not throwing unhandled errors to client)
- [ ] Server actions do not return sensitive data (passwords, tokens, internal IDs)
- [ ] Server actions are in separate files or use 'use server' directive correctly
- [ ] useActionState used for form submission state (React 19)
- [ ] useOptimistic used for instant UI feedback on mutations (React 19)

## API Routes (when server actions are not suitable)
- [ ] HTTP method validation (Next.js App Router exports named functions: GET, POST, etc.)
- [ ] Auth middleware/check applied
- [ ] Input validation on request body (Zod)
- [ ] Proper error responses with appropriate status codes
- [ ] Rate limiting for public endpoints
- [ ] No API routes that should be server actions (simple form mutations)
- [ ] Streaming responses use proper patterns (ReadableStream)

## Middleware (middleware.ts)
- [ ] Middleware only used for cross-cutting concerns (auth redirects, headers, i18n)
- [ ] Middleware matcher patterns are specific (not matching static assets, _next/)
- [ ] No heavy logic in middleware (runs on EVERY matched request)
- [ ] Auth checks in middleware for protected route groups
- [ ] No database queries in middleware (use edge-compatible checks only)
- [ ] Middleware config exports matcher array, not relying on runtime path checks

## Configuration (next.config.ts / next.config.js)
- [ ] Using next.config.ts for type safety (Next.js 15+)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Image domains/remotePatterns configured for external images
- [ ] TypeScript strict mode enabled in tsconfig
- [ ] ESLint / Biome Next.js rules enabled
- [ ] serverExternalPackages configured for packages that do not work in edge/serverless
- [ ] output: 'standalone' if using Docker deployment

## Data Patterns
- [ ] Fetch requests deduplicated by React/Next.js cache (same URL in multiple components)
- [ ] Cache tags used for targeted revalidation (revalidateTag instead of revalidatePath)
- [ ] No client-side useEffect + fetch for data available at build/request time
- [ ] Streaming used for slow data sources (nested Suspense boundaries)
- [ ] unstable_cache or React.cache for expensive computations
- [ ] Database queries happen in server components or server actions, not client components

## React 19 Patterns (Next.js 15+)
- [ ] use() hook used for reading promises and context in client components
- [ ] useActionState replaces manual useState + setLoading + setError for forms
- [ ] useOptimistic used for optimistic UI updates
- [ ] useFormStatus used for submit button loading states
- [ ] ref is a regular prop (no need for React.forwardRef)
- [ ] form action={serverAction} used for progressive enhancement

## Common Anti-Patterns to Find
- useEffect + fetch in client components (should be server component or SWR/React Query)
- useState + useEffect for data that should come from server
- Passing serialized data through searchParams when it should be in the URL path
- Using router.push for form submissions (should be server action with redirect())
- cookies() / headers() making pages dynamic when they could be static
- Unnecessary 'use client' on components that only render other components
- fetch without next: { revalidate } or cache option (defaulting to no-cache in Next.js 15)
- API routes returning data that could be directly queried in a server component
