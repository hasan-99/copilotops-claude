---
name: professional-document-design
description: Comprehensive design skill for UI/UX, web design, app interfaces, component systems, responsive layouts, accessibility, and professional document styling. Use when building or designing any website, web app, mobile app, landing page, dashboard, SaaS UI, component library, or business document. Covers visual hierarchy, color systems, typography, spacing, interaction patterns, responsive design, and modern design best practices.
---

# Professional Design System

Apply these principles when designing websites, apps, interfaces, dashboards, components, and documents.

---

## 1. Design Foundations

### Color System

**Neutral palette (base):**
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `background` | #ffffff | #0a0a0a | Page background |
| `surface` | #f9fafb | #111111 | Cards, panels |
| `surface-elevated` | #ffffff | #1a1a1a | Modals, dropdowns |
| `border` | #e5e7eb | #2a2a2a | Dividers, outlines |
| `border-subtle` | #f3f4f6 | #1f1f1f | Subtle separators |
| `text-primary` | #111827 | #f9fafb | Headings, body |
| `text-secondary` | #6b7280 | #9ca3af | Descriptions, hints |
| `text-muted` | #9ca3af | #6b7280 | Placeholders, captions |

**Brand accent palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #2563eb | CTAs, links, active states |
| `primary-hover` | #1d4ed8 | Hover state |
| `primary-light` | #eff6ff | Badges, highlights, backgrounds |
| `success` | #16a34a | Confirmations, positive states |
| `warning` | #f59e0b | Alerts, caution states |
| `error` | #dc2626 | Errors, destructive actions |
| `info` | #0ea5e9 | Informational callouts |

**Rules:**
- Max 1 primary + 1 secondary accent color per project
- 60% neutral / 30% surface / 10% accent ratio
- Always provide dark mode variants
- Ensure WCAG AA contrast (4.5:1 body text, 3:1 large text)

### Typography Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| Display/Hero | 48-72px | 700-800 | 1.1 | -0.02em |
| H1 | 36px | 700 | 1.2 | -0.01em |
| H2 | 30px | 600 | 1.25 | -0.005em |
| H3 | 24px | 600 | 1.3 | 0 |
| H4 | 20px | 600 | 1.35 | 0 |
| H5 | 16px | 600 | 1.4 | 0 |
| Body large | 18px | 400 | 1.6 | 0 |
| Body | 16px | 400 | 1.5 | 0 |
| Body small | 14px | 400 | 1.5 | 0 |
| Caption | 12px | 400 | 1.4 | 0.01em |
| Overline | 11px | 600 | 1.4 | 0.05em |

**Font stacks:**
- **UI/Web:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Headings (alt):** `"Cal Sans", "Plus Jakarta Sans", Inter, sans-serif`
- **Monospace:** `"JetBrains Mono", "Fira Code", "SF Mono", monospace`
- **Documents:** Arial, Calibri, Helvetica (sans); Georgia, Cambria (serif)

### Spacing System (8px base grid)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Inline gaps, icon padding |
| `sm` | 8px | Tight component padding |
| `md` | 16px | Standard padding, gaps |
| `lg` | 24px | Section padding |
| `xl` | 32px | Card padding, large gaps |
| `2xl` | 48px | Section margins |
| `3xl` | 64px | Page section spacing |
| `4xl` | 96px | Hero/major section breaks |

**Rules:**
- All spacing multiples of 4px (ideally 8px)
- Consistent padding within components (don't mix)
- Generous whitespace > cramped layout, always

### Border Radius

| Usage | Value |
|-------|-------|
| Buttons, inputs | 8px |
| Cards, panels | 12px |
| Modals, dialogs | 16px |
| Badges, tags | 9999px (full round) |
| Avatars | 50% (circle) |

### Shadows & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| Flat | none | Default elements |
| Raised | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards, buttons |
| Floating | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns, popovers |
| Overlay | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, dialogs |
| Top | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Toast, notifications |

---

## 2. UI Component Patterns

### Buttons

```
Primary:   bg-primary text-white rounded-lg px-4 py-2.5 font-medium
Secondary: bg-transparent border border-border text-primary rounded-lg px-4 py-2.5
Ghost:     bg-transparent text-secondary hover:bg-surface rounded-lg px-4 py-2.5
Danger:    bg-error text-white rounded-lg px-4 py-2.5 font-medium

Sizes: sm (px-3 py-1.5 text-sm) | md (px-4 py-2.5) | lg (px-6 py-3 text-lg)
```

- Always have hover, focus, active, disabled states
- Min tap target: 44x44px on mobile
- Loading state: spinner replacing text, same button width
- Icon + text: 8px gap between icon and label

### Forms & Inputs

```
Input:    border border-border rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-primary/20
Label:    text-sm font-medium text-primary mb-1.5
Helper:   text-sm text-secondary mt-1.5
Error:    text-sm text-error mt-1.5 + border-error on input
```

- Labels always above inputs (not floating unless space-critical)
- Error messages below the field, not in tooltips
- Required fields: asterisk or "(required)" text
- Group related fields, 24px gap between groups

### Cards

```
Container: bg-surface rounded-xl border border-border p-6
           hover: shadow-raised (if clickable)
Header:    flex justify-between items-center mb-4
Body:      space-y-3
Footer:    flex justify-end gap-3 mt-6 pt-4 border-t border-border-subtle
```

### Navigation

- **Top nav:** 64px height, sticky, bg-background/80 backdrop-blur-md
- **Sidebar:** 256px width (collapsed: 64px), fixed on desktop
- **Mobile nav:** Bottom tab bar (56px) or hamburger slide-out
- **Breadcrumbs:** text-sm, separator `/` or `›`, last item non-clickable
- Active state: primary color + font-medium (not just color change)

### Tables (Data)

- Header: bg-surface, font-medium, text-sm, text-secondary, uppercase optional
- Rows: border-b border-border-subtle, py-3 px-4
- Hover: bg-surface on row hover
- Sorting: chevron icon, active column highlighted
- Pagination: bottom-right, show total count
- Empty state: centered illustration + message + CTA

### Modals & Dialogs

- Overlay: bg-black/50 backdrop-blur-sm
- Container: max-w-lg, rounded-2xl, p-6
- Close: X button top-right or Escape key
- Actions: right-aligned, primary button last (rightmost)
- Focus trap: Tab cycles within modal

---

## 3. Layout Patterns

### Page Layouts

**Marketing/Landing page:**
```
┌──────────────────────────────────────┐
│  Nav (sticky)                        │
├──────────────────────────────────────┤
│  Hero (100vh or auto, centered)      │
├──────────────────────────────────────┤
│  Social proof / logos                │
├──────────────────────────────────────┤
│  Features (grid or alternating)      │
├──────────────────────────────────────┤
│  Testimonials                        │
├──────────────────────────────────────┤
│  Pricing                             │
├──────────────────────────────────────┤
│  CTA section                         │
├──────────────────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```

**Dashboard/App:**
```
┌──────┬───────────────────────────────┐
│      │  Top bar (breadcrumb, search) │
│ Side ├───────────────────────────────┤
│ bar  │                               │
│      │  Page content                 │
│ Nav  │  (max-width: 1280px centered) │
│      │                               │
└──────┴───────────────────────────────┘
```

**Content max-widths:**
| Context | Max Width |
|---------|-----------|
| Marketing page | 1280px |
| Dashboard content | 1280px |
| Blog/article | 720px |
| Auth forms | 400px |
| Settings page | 768px |

### Responsive Breakpoints

| Name | Width | Typical Device |
|------|-------|----------------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / small laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

**Mobile-first rules:**
- Stack columns below `md`
- Sidebar → bottom nav or hamburger below `lg`
- Reduce padding (p-4 mobile, p-6 tablet, p-8 desktop)
- Touch targets min 44px
- No hover-dependent interactions on mobile

### Grid System

- Use CSS Grid or Flexbox (not floats)
- Standard: 12-column grid, 24px gap
- Cards: auto-fill with `minmax(280px, 1fr)`
- Dashboard widgets: named grid areas for complex layouts

---

## 4. UX Principles

### Interaction Design

- **Feedback:** Every action gets visible feedback (loading, success, error)
- **Affordance:** Clickable things look clickable (cursor, hover state, underline)
- **Consistency:** Same action = same pattern everywhere
- **Progressive disclosure:** Show basics first, details on demand
- **Undo over confirm:** Prefer undo actions over "Are you sure?" dialogs

### Loading States

- Skeleton screens > spinners for page loads
- Inline spinners for button actions
- Optimistic updates where safe
- Progress bars for multi-step processes
- Never block the entire UI — keep nav accessible

### Empty States

- Illustration or icon (optional)
- Short headline explaining what goes here
- Description with guidance
- Primary CTA to get started
- Never just blank space

### Error Handling

- Inline validation on blur (not on every keystroke)
- Specific error messages ("Email must include @" not "Invalid input")
- Error summary at top of form for multiple errors
- Non-destructive — preserve user input
- Retry option for network errors

### Accessibility (WCAG AA minimum)

- Color contrast: 4.5:1 for text, 3:1 for large text and UI elements
- Keyboard navigation: all interactive elements focusable and operable
- Focus indicators: visible ring (2px solid primary, 2px offset)
- Screen reader: proper headings hierarchy, ARIA labels, alt text
- Motion: `prefers-reduced-motion` respected, no auto-playing animations
- Touch targets: minimum 44x44px

### Animation & Motion

- Transitions: 150-200ms for micro-interactions, 300ms for layouts
- Easing: `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for transitions
- Hover effects: subtle scale (1.02) or shadow increase, not color flash
- Page transitions: fade or slide, 200-300ms
- Don't animate for the sake of it — purposeful motion only

---

## 5. Page-Specific Patterns

### Landing Page / Marketing

- Hero: large headline (48-72px), subhead (18-20px), 1-2 CTAs, optional hero image/video
- Social proof: logo bar grayscale, 5-6 logos max
- Features: 3-column grid with icons, title, description
- Testimonials: quote + avatar + name + role, carousel or grid
- Pricing: 2-3 tiers, highlight recommended, annual/monthly toggle
- CTA: repeat primary CTA before footer

### Dashboard

- Top-level metrics: 3-4 stat cards in a row
- Charts: clean, minimal gridlines, clear labels, tooltips on hover
- Activity feed: avatar + description + timestamp, most recent first
- Filters: sticky or in sidebar, show active filter count

### Auth Pages (Login/Signup)

- Centered card, max-width 400px
- Logo at top
- Social login buttons above or below form (separated by "or" divider)
- Password: toggle visibility, strength meter on signup
- Link to opposite action ("Don't have an account? Sign up")

### Settings

- Left sidebar navigation for categories
- Sections with clear headings
- Save per-section or sticky save bar
- Destructive actions (delete account) separated and styled with danger

---

## 6. Document Design (Business Documents)

When creating contracts, proposals, invoices, reports, SOWs as docx/PDF:

### Structure
```
┌─────────────────────────────────────┐
│  HEADER (logo left, doc info right) │
├─────────────────────────────────────┤
│  TITLE BLOCK (24-28pt bold)         │
│  Subtitle/date (11pt gray)         │
├─────────────────────────────────────┤
│  BODY (sections with hierarchy)     │
├─────────────────────────────────────┤
│  FOOTER (page numbers, legal text)  │
└─────────────────────────────────────┘
```

### Document Spacing
| Element | Spacing |
|---------|---------|
| Page margins | 1 inch all sides |
| After title | 24pt |
| Before section heading | 18pt |
| After section heading | 6pt |
| Between paragraphs | 12pt |
| Line height | 1.15 - 1.3 |
| Table cell padding | 8pt vertical, 12pt horizontal |

### Document Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Title | 24-28pt | Bold | #1a1a1a |
| H1 | 16pt | Bold | #1a1a1a |
| H2 | 13pt | Semibold | #333333 |
| Body | 11pt | Regular | #333333 |
| Table header | 10pt | Bold | #1a1a1a |
| Caption/footer | 9pt | Regular | #666666 |

### Document Section Order

**Contracts/Agreements:** Title → Parties → Recitals → Definitions → Core terms → Payment → Term & termination → Confidentiality → Liability → General provisions → Signature block

**Proposals:** Cover → Executive summary → Scope → Deliverables → Timeline → Pricing → Terms → Next steps → Signature

---

## 7. Design Checklist

Before shipping any design:

**Visual:**
- [ ] Consistent spacing (8px grid)
- [ ] Color contrast passes WCAG AA
- [ ] Typography hierarchy is clear
- [ ] Dark mode works (if applicable)
- [ ] No orphaned elements or awkward breaks

**Interactive:**
- [ ] All states covered (hover, focus, active, disabled, loading, error, empty)
- [ ] Keyboard navigable
- [ ] Touch targets ≥ 44px on mobile
- [ ] Forms validate and show clear errors
- [ ] Loading states for async actions

**Responsive:**
- [ ] Works at all breakpoints (320px to 1536px+)
- [ ] Mobile navigation pattern in place
- [ ] Images/media responsive
- [ ] Text readable without horizontal scroll
- [ ] Touch-friendly on mobile (no hover-dependent features)

**Performance:**
- [ ] Images optimized (WebP, lazy loaded)
- [ ] Fonts subsetted or system stack
- [ ] Animations use transform/opacity (GPU-accelerated)
- [ ] No layout shift on load
