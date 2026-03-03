# Frontend Deep Audit Checklist

## React Component Quality
- [ ] No component exceeds 200 lines (split into subcomponents)
- [ ] No prop drilling deeper than 3 levels (use context, composition, or state management)
- [ ] Each component has one clear responsibility
- [ ] No inline function definitions in JSX props that cause unnecessary re-renders
- [ ] useMemo / useCallback used for expensive computations passed as props to memoized children
- [ ] React.memo used for components that re-render with same props (only when perf is an issue)
- [ ] No state that can be derived from other state (compute it instead of storing it)
- [ ] Custom hooks extracted for reusable logic
- [ ] Event handlers do not create new closures on every render unnecessarily
- [ ] React 19: Using use() for async data, useActionState for forms, useOptimistic for optimistic updates

## State Management
- [ ] No duplicate state (same data in multiple places that can get out of sync)
- [ ] Server state managed by SWR/React Query, not manual useState + useEffect
- [ ] Form state uses controlled components or react-hook-form (not uncontrolled + refs for complex forms)
- [ ] No global state for local concerns (keep state close to where it is used)
- [ ] State updates are batched where possible (React 18+ does this automatically)
- [ ] No stale closures in callbacks/effects (check dependency arrays)
- [ ] URL state used for filterable/shareable views (searchParams, not local state)

## useEffect Audit
- [ ] Every useEffect has correct dependency array (no missing deps that cause stale closures)
- [ ] Every useEffect with subscriptions/timers has cleanup function
- [ ] No useEffect that could be replaced with useMemo or an event handler
- [ ] No useEffect for data fetching in components that could be server components
- [ ] No cascading useEffects (effect A triggers state change, effect B triggers state change, effect C)
- [ ] No useEffect that runs on every render due to object/array dependencies (memoize or restructure)

## CSS / Tailwind
- [ ] No unused CSS classes (Tailwind purge config correct)
- [ ] Colors use CSS variables / Tailwind theme, not hardcoded hex values
- [ ] Spacing is consistent (uses Tailwind scale: p-2, p-4, p-6 — not arbitrary values like p-[13px])
- [ ] No !important except for third-party library overrides
- [ ] No inline styles that should be Tailwind classes
- [ ] Dark mode properly handled if applicable (Tailwind dark: variant)
- [ ] Responsive breakpoints are consistent (sm/md/lg/xl, not custom arbitrary breakpoints)
- [ ] z-index values are managed (use a scale: 10, 20, 30 — not random numbers like 9999)
- [ ] Tailwind v4: Using CSS-first configuration if applicable

## Accessibility (a11y)
- [ ] All img tags have alt attribute (empty string alt="" for decorative images)
- [ ] All interactive elements are keyboard accessible (Tab, Enter, Space, Escape)
- [ ] All form inputs have associated label elements (or aria-label)
- [ ] Color alone is not used to convey information (add icons/text alongside)
- [ ] Focus indicators are visible (do not remove outline without replacement)
- [ ] Modals/dialogs trap focus and restore focus on close
- [ ] ARIA roles used correctly (not overriding native semantics — div role="button" should be button)
- [ ] Page has proper heading hierarchy (h1, h2, h3, no skipped levels)
- [ ] Skip navigation link exists for keyboard users
- [ ] Dynamic content changes announced to screen readers (aria-live regions)
- [ ] div with onClick replaced with button for interactive elements

## Error Handling and UX States
- [ ] Error boundaries wrap major page sections (not just root)
- [ ] API errors shown to user with actionable messages (not raw error strings)
- [ ] Loading states shown during data fetching (skeleton, spinner, or loading.tsx)
- [ ] Empty states handled (informative message + CTA when lists are empty, not blank page)
- [ ] Network errors handled gracefully (offline indicator, retry button)
- [ ] Form validation errors shown inline next to fields (not just toast)
- [ ] Optimistic updates with error rollback for common actions
- [ ] 404 pages are helpful (not generic "page not found")

## Performance
- [ ] Images use next/image with proper sizing and priority for above-fold
- [ ] Dynamic imports (next/dynamic) for heavy components / below-fold content
- [ ] No layout shifts (CLS) — dimensions set on images, embeds, ads
- [ ] Fonts preloaded and properly subset with next/font
- [ ] Third-party scripts loaded with strategy="lazyOnload" or afterInteractive
- [ ] No blocking resources in the critical rendering path
- [ ] Lists over 50 items use virtualization (@tanstack/virtual, react-window)
- [ ] Heavy components behind Suspense boundaries

## Code Hygiene
- [ ] No console.log / console.warn / console.error in production code
- [ ] No TODO, FIXME, HACK without a tracking issue or clear plan
- [ ] No commented-out code blocks (3+ lines — delete it, git has history)
- [ ] No unused imports
- [ ] No "any" types on component props or state
- [ ] Consistent naming conventions (PascalCase components, camelCase functions/variables)
- [ ] No magic numbers — extract to named constants
- [ ] No duplicate string literals — extract to constants or i18n keys
