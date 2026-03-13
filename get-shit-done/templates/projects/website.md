# Project Template: Website

> Opinionated Next.js + Supabase + Vercel template. Fawzi's exact stack.

**Stack:** Next.js 16+, React 19, TypeScript, Tailwind v4, Supabase, Vercel
**Phases:** 6
**Type:** website

## Phases

### Phase 1: Foundation
**Goal:** Working Next.js app with auth, Supabase connected, protected routes, base layout
**Skills:** [@supabase]
**Tasks:**
- Initialize Next.js 16+ with App Router, TypeScript strict, Tailwind v4
- Configure Supabase client (server.ts + client.ts pattern from `lib/supabase/`)
- Implement auth: login, signup, password reset (Supabase Auth)
- Create protected route middleware (redirect unauthenticated users)
- Set up base layout: header, footer, navigation shell
- Configure environment variables (.env.local)
- Set up RLS on auth-related tables

**Success Criteria:**
1. User can create account, log in, and see protected dashboard
2. Unauthenticated users redirected to login
3. Server-side auth check works (not just client-side)
4. `npx tsc --noEmit` passes

---

### Phase 2: Landing & Marketing
**Goal:** Polished public-facing pages that convert visitors
**Skills:** [@frontend-master, @seo-master]
**Team:** full-stack-team
**Tasks:**
- Hero section with distinctive typography and animations
- Features section with staggered reveal animations
- Testimonials/social proof section
- Pricing section (if applicable)
- CTA sections with micro-interactions
- About/company page
- Contact page with form (Supabase insert or email)
- Footer with navigation, social links

**Success Criteria:**
1. Landing page loads in under 3s on mobile
2. All sections have CSS transitions and staggered animations
3. No generic card grids or blue-purple gradients (Fawzi's frontend rules)
4. Distinctive fonts (not Inter/Arial)
5. Mobile-responsive from the start

---

### Phase 3: Dashboard / App
**Goal:** Authenticated user area with full CRUD and real-time data
**Skills:** [@admin-panel, @supabase]
**Team:** full-stack-team
**Tasks:**
- Dashboard overview page with key metrics
- Data listing pages with pagination, search, filters
- Create/edit forms with Zod validation
- Delete with confirmation dialog
- Real-time updates (Supabase subscriptions)
- User profile/settings page
- Role-based access (if multi-user)

**Success Criteria:**
1. User can create, read, update, delete core resources
2. Forms validate with Zod and show clear error messages
3. Data persists correctly in Supabase with RLS
4. Loading states and error boundaries on all data-fetching pages

---

### Phase 4: SEO & Performance
**Goal:** Production-grade SEO and Core Web Vitals passing scores
**Skills:** [@seo-master]
**Tasks:**
- Dynamic metadata for all pages (title, description, OG image)
- JSON-LD structured data (Organization, WebSite, BreadcrumbList)
- Sitemap.xml generation (dynamic from routes)
- robots.txt
- Open Graph and Twitter card meta tags
- Image optimization (next/image, WebP, lazy loading)
- Font optimization (next/font, preload critical fonts)
- Bundle analysis and code splitting review

**Success Criteria:**
1. Lighthouse SEO score ≥ 95
2. Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
3. All pages have unique title and description
4. JSON-LD renders correctly in Google Rich Results Test

---

### Phase 5: Responsive & Polish
**Goal:** Flawless experience across all screen sizes with refined animations
**Skills:** [@responsive, @frontend-master]
**Tasks:**
- Mobile layout audit and fixes (320px–480px)
- Tablet layout adjustments (768px–1024px)
- Desktop optimization (1280px+)
- Touch targets ≥ 44px on mobile
- Loading skeletons for all async content
- Error boundaries with recovery UI
- Page transitions and route animations
- Micro-interactions on buttons, links, form elements
- Dark mode (if in scope)

**Success Criteria:**
1. Usable on 320px width without horizontal scroll
2. Touch targets ≥ 44px on all interactive elements
3. No layout shifts on route navigation
4. Loading states visible for all data-fetching operations

---

### Phase 6: Deploy & Verify
**Goal:** Production deployment with full verification suite passing
**Skills:** [@deploy-verify]
**Team:** ship-team
**Tasks:**
- Final `npx tsc --noEmit` check
- Final `next lint` check
- Production build (`next build`)
- Deploy to Vercel (`vercel --prod`)
- Configure custom domain (if applicable)
- Run 6-check post-deploy verification
- Supabase production config review (RLS, service key not exposed)

**Success Criteria:**
1. HTTP 200 on homepage
2. Auth flow works in production
3. No console errors on key pages
4. API latency < 500ms
5. SSL certificate valid
6. No source maps exposed
