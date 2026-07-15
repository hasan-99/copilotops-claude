# DESIGN — {Project Name}

> Visual contract for `{project}`. Every Qualia agent reads this before any frontend work.
> `/qualia-new` generates the skeleton. Update as visual decisions firm up.
> Required pair: `PRODUCT.md` (sets the brief). This file (`DESIGN.md`) realizes it visually.

## 0. Dials (aesthetic risk budget — set before §1)

```
DESIGN_VARIANCE:   {LOW · MEDIUM · HIGH}   # how far from convention
MOTION_INTENSITY:  {LOW · MEDIUM · HIGH}   # how much movement
VISUAL_DENSITY:    {LOW · MEDIUM · HIGH}   # information per screen
```

Defaults flow from register + project type — see `qualia-design/design-dials.md`
(the dial table + the gating rules). A client app on an existing brand system
caps VARIANCE at LOW for color/type; a marketing site runs HIGH. Builders and
`/qualia-polish` read these and make choices *within* the budget. The same file
carries the **pre-flight ban→do-instead list** every agent reads before writing
components.

## 1. Direction (mandatory commit, before any color or font)

```
Aesthetic direction:  {editorial · brutalist · luxury · maximalist · retro-futuristic · organic · terminal-native · sci-fi · pastoral · industrial · ...}
Color strategy:       {Restrained · Committed · Full palette · Drenched}
Scene sentence:       {one sentence: who uses this, where, ambient light, mood}
Differentiation:      {what someone remembers 24 hours later}
```

This block is the brief in 4 lines. Every other section in this file flows from it. If any other section disagrees, the brief wins or the brief gets rewritten.

## 2. Color (OKLCH only)

> No `#hex`. No `rgb()`. No `hsl()`. OKLCH is the source. Translations happen at build time if at all.
> No pure `#000` or `#fff` — every neutral tinted toward the brand hue (chroma 0.005-0.015).

### Tokens

```css
:root {
  /* Surfaces — tinted toward {hue} */
  --bg:        oklch(0.16 0.012 {hue});  /* page background */
  --bg-2:      oklch(0.20 0.014 {hue});  /* raised surface */
  --surface:   oklch(0.24 0.014 {hue});  /* card */
  --surface-2: oklch(0.28 0.014 {hue});  /* card on card (rare — depth max 2) */

  /* Text */
  --text:      oklch(0.94 0.006 {hue});  /* body */
  --muted:     oklch(0.66 0.010 {hue});  /* secondary */
  --dim:       oklch(0.50 0.012 {hue});  /* tertiary, captions */

  /* Lines */
  --line:      oklch(0.32 0.012 {hue});
  --line-soft: oklch(0.27 0.010 {hue});

  /* Accent — the brand color */
  --accent:    oklch({L} {C} {H});       /* primary CTA, brand */
  --accent-2:  oklch({L-0.08} {C-0.01} {H});  /* hover */
  --accent-bg: oklch({L} {C} {H} / 0.18);     /* tinted bg */

  /* Semantic (Product register only) */
  --ok:    oklch(0.78 0.14 152);
  --warn:  oklch(0.78 0.13 65);
  --kill:  oklch(0.66 0.16 22);
}
```

### Accent rules

- Brand register: ≤10% surface coverage IF Restrained, otherwise per strategy
- Product register: ≤10% surface coverage (Restrained default)
- Accent must be **sharp** — not a desaturated pastel-of-the-brand
- Accent contrast vs `--bg`: ≥4.5:1 (WCAG AA for text), ≥3:1 (UI components)

### Contrast verification

```
{role} on {role} — {ratio} (WCAG {AA · AA Large · FAIL})
text on bg       — 12.4:1 (AA)
muted on bg      — 5.8:1 (AA)
accent on bg     — 6.2:1 (AA)
text on accent   — 4.7:1 (AA)
```

## 3. Typography

```
Display:  {font name} — {weight axis} — {use case}
Body:     {font name} — {weight axis} — {use case}
Mono:     {font name} — {weight axis} — {use case}
```

**Banned (per `design-laws.md`):** Inter, Roboto, Arial, system-ui, Space Grotesk, Helvetica.

### Scale

| Token | Size | Line height | Letter spacing | Use |
|---|---|---|---|---|
| display | clamp(2.5rem, 5.5vw, 4.25rem) | 1.02 | -0.035em | hero |
| h1 | clamp(1.8rem, 3.6vw, 2.75rem) | 1.1 | -0.025em | section |
| h2 | clamp(1.4rem, 2.6vw, 2.1rem) | 1.15 | -0.02em | subsection |
| h3 | 1.25rem | 1.25 | -0.015em | card title |
| body | 0.95rem | 1.55 | 0 | paragraphs |
| small | 0.82rem | 1.5 | 0 | meta |
| caption | 0.7rem | 1.4 | +0.08em | labels (uppercase) |

### Numerals

```css
.tabular { font-feature-settings: "tnum" 1, "cv11" 1; }
```

Apply to any column of numbers (tables, financial data, stats).

### Body line length

```css
.prose { max-width: 65ch; }
```

Cap at 65-75ch. Beyond that, eyes lose the line.

## 4. Spacing

8px grid, fluid where appropriate.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* Fluid */
  --pad-x:        clamp(1rem, 5vw, 4rem);   /* horizontal page padding */
  --pad-section:  clamp(2rem, 8vw, 6rem);   /* vertical section padding */
  --pad-card:     1.25rem 1.5rem;            /* card interior */
  --gap-stack:    1rem;
  --gap-grid:     1.25rem;
}
```

**Vary spacing for rhythm.** Same padding everywhere is monotony. Tight within groups, generous between sections.

## 5. Components

Token-driven. Every component composes from above.

### Buttons (Product register: 3 variants max)

```css
.btn-primary   { background: var(--accent); color: var(--bg); padding: 0.6rem 1.1rem; border-radius: 6px; }
.btn-secondary { background: var(--surface); border: 1px solid var(--line); color: var(--text); }
.btn-ghost     { background: transparent; color: var(--text); }
.btn-danger    { background: var(--kill); color: oklch(0.94 0.006 220); }
```

### Inputs

- Visible label, never placeholder-only
- Focus ring: 2px offset, `--accent` color
- Error: `aria-describedby` linked to inline error text

### Cards

```css
.card { background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; padding: var(--pad-card); }
```

**Container depth max 2.** No card-on-card.

### Tables (Product register)

- Tabular numerals on numeric columns
- Sticky header on scroll
- Right-align numbers, left-align text
- Sort indicator on hover, persistent on active
- Row hover background: `--bg-2`

## 6. Depth & elevation

3 levels max. OKLCH-tinted shadows, never neutral gray.

```css
:root {
  --elev-1: 0 1px 2px oklch(0.10 0.02 {hue} / 0.15);
  --elev-2: 0 2px 8px oklch(0.10 0.02 {hue} / 0.18);
  --elev-3: 0 12px 32px oklch(0.10 0.02 {hue} / 0.25);
}
```

Use elevation semantically: `elev-1` for hovered cards, `elev-2` for popovers, `elev-3` for modals.

## 7. Motion

```css
:root {
  /* Easing */
  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-std:   cubic-bezier(0, 0, 0.2, 1);

  /* Duration */
  --d-instant:  100ms;  /* hover, focus */
  --d-quick:    150ms;  /* tooltip, dropdown */
  --d-default:  200ms;  /* panel slide */
  --d-section:  300ms;  /* page transition */
  --d-feature:  500ms;  /* signature motion */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Don't animate layout properties** (`width`, `height`, `top`, `left`, `margin`, `padding`). Animate `transform` and `opacity` only.

**No bounce. No elastic.** Ease out with exponential curves.

### Signature motion (Brand register only)

Pick ONE. Document below what it is and where it lives.

```
Signature: {parallax · cursor-follow · letter reveal · scroll scrub · magnetic buttons · morphing shapes · ...}
Where:     {homepage hero · /work case studies · ...}
```

## 8. Iconography

```
Family:   {Lucide · Heroicons · Phosphor · Radix Icons · custom}
Stroke:   {1.5px · 2px}
Size:     {16px / 20px / 24px}
```

ONE icon family. Mixing icon families is the visual equivalent of mixing fonts.

## 9. Responsive

Mobile-first. Test at 375 / 768 / 1280.

```
Breakpoints:
  sm:  640px
  md:  768px
  lg:  1024px
  xl:  1280px
  2xl: 1536px

Touch targets: 44×44px minimum
Tables on mobile: card view OR horizontal scroll with sticky first col
Navigation:      hamburger drawer on mobile, full horizontal on lg+
```

## 10. Anti-pattern checklist (mandatory before commit)

- [ ] No `#000` or `#fff` (only OKLCH)
- [ ] No banned fonts (Inter, Roboto, Arial, system-ui, Space Grotesk)
- [ ] No purple-blue gradients
- [ ] No side-stripe borders (`border-left: ≥2px` decorative)
- [ ] No gradient text (`background-clip: text`)
- [ ] No identical card grids of 3
- [ ] No "Get Started" / "Learn More"
- [ ] No em dashes in copy (— or `--`)
- [ ] No `max-w-7xl` or hardcoded width caps
- [ ] No glassmorphism by default
- [ ] No modal as first thought
- [ ] Container depth ≤ 2 on cards/panels
- [ ] One icon family
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets ≥ 44×44px
- [ ] WCAG AA contrast verified

`bin/slop-detect.mjs` runs this checklist automatically. Builders run it before every commit.
