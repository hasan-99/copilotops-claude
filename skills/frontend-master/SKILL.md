---
name: frontend-master
description: Complete frontend development - build components, design distinctive UIs, modernize interfaces. Use --build (default) for components with animations, --design for bold aesthetics that break AI slop, or --modernize for legacy UI transformation. Covers React 19, Next.js 15+, TypeScript, Tailwind v4, accessibility, and performance.
tags: [frontend, react, design, ui, animations, tailwind, accessibility, performance]
---

# Frontend Master

One skill for all frontend work. Detect the stack, commit to a bold direction, ship production code.

## Modes

- `--build` (default): Build components with motion and polish
- `--design`: Create distinctive, anti-AI-slop interfaces
- `--modernize`: Transform legacy UIs with modern patterns

---

## Process (All Modes)

### Step 1: Analyze
- Read `package.json` for framework, styling, animation libs
- Check existing component patterns, naming conventions, file structure
- Match the project's voice — don't introduce foreign patterns

### Step 2: Design Direction
Before writing ANY code, commit to a clear aesthetic. State it explicitly:
- **Purpose**: What does this solve? Who uses it?
- **Tone**: Pick ONE direction and go hard — brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, dark terminal, warm analog. There are infinite flavors. Choose one true to context.
- **The hook**: What's the ONE thing someone remembers about this interface?

Bold maximalism and refined minimalism both work. The key is INTENTIONALITY, not intensity.

### Step 3: Build
- Use existing UI library if present (shadcn, Radix, etc.)
- Semantic HTML first, ARIA only when native elements can't do it
- Write concise, readable TypeScript — functional patterns, no classes
- Mobile-first responsive with Tailwind

### Step 4: Motion & Polish
- One well-orchestrated page load with staggered reveals > scattered micro-interactions
- CSS-only when possible; Motion (Framer Motion) for React when available
- Hover states, focus-visible states, smooth transitions
- Respect `prefers-reduced-motion`

---

## Anti-AI-Slop Rules (CRITICAL)

You tend toward "distributional convergence" — defaulting to safe, generic choices. This creates the AI slop aesthetic. Fight it actively:

**Typography**: Choose fonts that are beautiful, unique, and interesting. NEVER default to Inter, Roboto, Arial, Open Sans, Lato, or system fonts. Pick distinctive choices that elevate the design.

Font directions (for inspiration, don't reuse across generations):
- Code aesthetic: JetBrains Mono, Fira Code, Berkeley Mono
- Editorial: Playfair Display, Crimson Pro, Fraunces, Newsreader
- Startup/modern: Clash Display, Satoshi, Cabinet Grotesk, General Sans
- Technical: IBM Plex family, Source Sans 3
- Distinctive: Bricolage Grotesque, Obviously, Outfit, Sora

**Pairing principle**: High contrast = interesting. Display + monospace, serif + geometric sans. Use weight extremes (100/200 vs 800/900), not middle ranges. Size jumps of 3x+, not 1.5x. Load from Google Fonts. State your font choice before coding.

**Color & Theme**: Commit to a cohesive palette using CSS variables. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Use `oklch()` for perceptually uniform colors. Draw from IDE themes, cultural aesthetics, nature, architecture for inspiration.

**Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density — not the muddled middle.

**Backgrounds & Texture**: Create atmosphere and depth. Layer CSS gradients, geometric patterns, noise textures, grain overlays, mesh gradients, layered transparencies, dramatic shadows, contextual effects. Never default to solid white or plain dark.

**NEVER**:
- Purple-to-blue gradients on white backgrounds
- Centered hero + three-column feature grid
- Over-reliance on drop shadows and rounded cards
- Cookie-cutter design that lacks context-specific character
- Converging on the same font (Space Grotesk, Geist) across different projects

VARY between light and dark themes, different fonts, different aesthetics across generations. Every design should feel like a DIFFERENT designer made it.

---

## TypeScript & React Conventions

**Code style:**
- Concise TypeScript, functional/declarative patterns
- Interfaces over types; const maps over enums
- Descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canSubmit`
- Event handlers prefixed with `handle`: `handleClick`, `handleSubmit`
- Named exports over default exports
- File structure: exported component → subcomponents → helpers → static content → types

**Component patterns:**
- React Server Components by default; minimize `'use client'`
- Wrap client components in `<Suspense>` with fallback UI
- `useActionState` for form handling (not deprecated `useFormState`)
- `useOptimistic` for instant UI feedback
- URL state with `nuqs` over local state when shareable
- Composition over configuration props — compound components > boolean prop explosion

**Directory naming:** lowercase-with-dashes (`components/auth-wizard`)
**Component naming:** PascalCase (`AuthWizard.tsx`)

---

## Accessibility (Non-Negotiable)

- Semantic HTML first — `<button>`, `<nav>`, `<main>`, `<article>` before ARIA
- All interactive elements: min 44px touch target (WCAG)
- `focus-visible` outlines on all focusable elements
- Form inputs: `aria-required`, `aria-invalid`, `aria-describedby` for errors
- Images: meaningful `alt` text or `alt=""` for decorative
- Color contrast: 4.5:1 minimum for text, 3:1 for large text
- Keyboard navigable: every action reachable without a mouse
- `prefers-reduced-motion`: disable/reduce animations
- `prefers-color-scheme`: respect system theme preference
- Skip links for main content on complex pages

---

## Performance (Critical Rules)

These are the highest-impact patterns from Vercel's React optimization research:

**Eliminate waterfalls (2-10x impact):**
- Parallelize independent async operations with `Promise.all()`
- Defer `await` until the value is actually needed
- Use `<Suspense>` boundaries to stream content — don't block parent on child data
- Start fetches at the earliest possible moment

**Reduce bundle size (2-10x impact):**
- Never import from barrel files (`index.ts`) — import specific modules
- `next/dynamic` for heavy components, lazy load non-critical libs
- Preload based on user intent (hover = prefetch)

**Server-side:**
- Fetch on the server, not in `useEffect`
- `React.cache()` for per-request deduplication
- `after()` for non-blocking post-response work
- Authenticate Server Actions like API routes

**Client-side:**
- Derive state during render, not via `useEffect`
- `useTransition` for non-urgent updates
- `useRef` for values that don't trigger re-renders
- Functional `setState` for updates based on previous state
- Passive event listeners for scroll/touch: `{ passive: true }`

**Rendering:**
- CSS `content-visibility: auto` for long lists
- Hoist static JSX outside components
- CSS transforms for animations (GPU-accelerated)
- Optimize fonts: `display: swap`, subsetting, preload

---

## --modernize Mode

Transform legacy UIs step by step:
1. Audit: identify outdated patterns, missing accessibility, performance gaps
2. Design system: introduce Tailwind + shadcn/ui, CSS variables for theming
3. Dark mode: `next-themes` with `class` strategy
4. Accessibility: semantic HTML pass, focus states, ARIA where needed
5. Motion: entrance animations, hover feedback, page transitions
6. Performance: RSC migration, bundle analysis, lazy loading

---

## Related Skills

- **responsive** — Deep responsive analysis and fixes for all screens
- **frontend-debug** — Fix visual bugs, layout breaks, z-index wars, CSS conflicts

---

## Stack Reference

```
Framework:     React 19 / Next.js 15+ / Astro 5
Styling:       Tailwind CSS v4 (native nesting, oklch, container queries)
Components:    shadcn/ui + Radix UI primitives
Animation:     Motion (Framer Motion) / GSAP / CSS scroll-driven
Icons:         Lucide React / Phosphor Icons
Forms:         React Hook Form + Zod / React 19 Actions
State:         React 19 built-ins / Zustand / TanStack Query / nuqs (URL state)
```

Modern CSS to use freely: native nesting, `:has()`, container queries (`@container`), `oklch()`, `color-mix()`, scroll-driven animations (`animation-timeline: view()`), anchor positioning, View Transitions API.
