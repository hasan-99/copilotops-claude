---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "*.html", "*.vue", "*.svelte"]
---

# Design Rubric

Anchored 1-5 scoring across 9 dimensions. Used by the verifier agent to score frontend phases. Used by `/qualia-polish --critique` for read-only audits.

## How to score

Every dimension is scored 1-5 with EVIDENCE on the next line. Score without evidence is rejected.

Anchored definitions:
- **1** — Fails. Hard violation. WCAG fails, broken layout, absolute-ban hit.
- **2** — Below acceptable. Functions but signals "AI generated this."
- **3** — Acceptable. Ships. Not memorable, not embarrassing.
- **4** — Good. Specific choices visible. A designer would approve.
- **5** — Excellent. Distinctive. Worth screenshotting and sharing.

**Default to 3.** Only score above 3 if you can cite a specific design principle the work excels at. Only score below 3 if you can quote evidence of a violation.

If a vision model is critiquing screenshots, it must score against this rubric. Without anchoring, vision models say "looks great!" to everything.

## Scope guard

Score only what is scope-relevant. A `/qualia-polish src/components/Button.tsx` review scores Typography, Color, States, Motion, Microcopy. Skip Layout Originality and Container Depth — they're component-internal concerns at most.

A whole-app `/qualia-polish` scores all 9 dimensions across multiple representative routes.

## The 9 dimensions

### 1. Typography

| Score | Criteria |
|---|---|
| 1 | Banned font as primary — Inter / Roboto / Arial / Helvetica / system-ui / Space Grotesk / Montserrat / Poppins / Lato / Open Sans. Or single weight throughout. |
| 2 | Project font loaded but only one weight, no scale, no letter-spacing variation. |
| 3 | Project font with 2-3 weights, basic scale (h1/h2/body), readable. |
| 4 | Distinctive display + refined body pair. Letter-spacing varied semantically (tight headlines, open labels). Tabular numerals on numeric data. |
| 5 | Variable font with axis-driven weight/optical-size. Hierarchy through weight + scale + letter-spacing combined. Line lengths capped at 65-75ch. |

Evidence format: `font-family: "<name>" used at line N, scale 14/16/24/40 visible, weights 400/500/700`

The banned-font list above is the machine-enforced counterpart of `bin/slop-detect.mjs` (the static anti-pattern scanner) and `agents/visual-evaluator.md` (the vision evaluator). All three are kept in lockstep — Inter, Roboto, Arial, Helvetica, system-ui, Space Grotesk, Montserrat, Poppins, Lato, Open Sans.

### 2. Color cohesion

| Score | Criteria |
|---|---|
| 1 | Hex values scattered in JSX. No CSS variables. Pure `#000` or `#fff`. |
| 2 | CSS variables defined but unused (raw hex still appears). RGB used. |
| 3 | All colors as CSS variables. Tinted neutrals (no pure black/white). One color strategy implied. |
| 4 | OKLCH throughout. Strategy explicit (Restrained / Committed / Full / Drenched). WCAG AA verified. |
| 5 | OKLCH with documented strategy. Chroma reduced at extremes. Brand-tinted shadows. APCA contrast verified for dense text. |

Evidence: count of CSS custom properties for color, presence of OKLCH, evidence of strategy commitment

### 3. Spatial rhythm

| Score | Criteria |
|---|---|
| 1 | Arbitrary px values everywhere. No system. |
| 2 | 8px grid roughly followed. Same padding everywhere. |
| 3 | 8px grid consistently. Tight within groups, generous between sections. |
| 4 | Fluid `clamp()` padding. Spacing varies by content type. Vertical rhythm identifiable. |
| 5 | Spatial system reads as composed — different spacing for different relationships. Generous negative space. Asymmetry where intentional. |

Evidence: presence of spacing tokens, padding values divisible by 4, `clamp()` usage

### 4. Layout originality

| Score | Criteria |
|---|---|
| 1 | Three-column feature grid in section 2. Card grid of 3 identical items. Centered hero with gradient. |
| 2 | Standard hero + sections + footer. Symmetric throughout. |
| 3 | Some layout variation across sections. No card monotony. |
| 4 | Asymmetry, full-bleed, varied component sizes within a section. Negative space used. |
| 5 | Layout reads as composed by a designer. Diagonal flow, overlap, scale contrast. Each section a different shape. |

Evidence: file:line references showing layout choices

### 5. Shadow & depth hierarchy

| Score | Criteria |
|---|---|
| 1 | Single shadow value applied to everything (or no shadows). Nested cards. |
| 2 | 2 shadow levels but applied inconsistently. |
| 3 | 3 elevation levels (subtle / medium / pronounced). Brand-tinted, not pure gray. |
| 4 | Shadows match elevation semantically. Different shadow for hover than rest. |
| 5 | Multi-layer shadows (offset + ambient + directional). Brand-hue tinted at chroma 0.02-0.04. Spatial logic clear. |

Evidence: count of distinct `box-shadow` values, OKLCH chroma in shadow color

### 6. Motion intent

| Score | Criteria |
|---|---|
| 1 | No transitions. Or: bounce/elastic everywhere. Animates layout properties. |
| 2 | Default browser transitions on hover. No stagger. |
| 3 | Considered transitions on interactive elements. Respects `prefers-reduced-motion`. |
| 4 | One signature motion identified and executed. Stagger on entrance. Easing curves chosen (ease-out-quart or expo). |
| 5 | Orchestrated motion that communicates structure. Scroll-driven if appropriate. Restraint elsewhere. |

Evidence: easing curves used, presence of `prefers-reduced-motion`, file:line of signature motion

### 7. Microcopy specificity

| Score | Criteria |
|---|---|
| 1 | "Get Started" / "Learn More" / "Welcome to <product>" / "Click here". Lorem ipsum. |
| 2 | Generic but functional ("Save", "Cancel", "Submit"). Empty states say "No results." |
| 3 | Action-named CTAs ("Download invoice"). Empty states with one-sentence context. |
| 4 | Voice consistent with brand. Errors specific and actionable ("This file is 12MB; max is 10MB. Compress and retry."). |
| 5 | Microcopy you'd quote. Voice unmistakable. Every word earned. |

Evidence: grep for banned phrases, sample of empty/error states

### 8. Container depth & nesting

| Score | Criteria |
|---|---|
| 1 | Card → panel → pill → content (depth ≥ 4). Side-stripe borders. Gradient text. |
| 2 | Card-on-card pattern (depth 3). Most things wrapped in containers. |
| 3 | Container depth ≤ 2. No decorative side-stripes. |
| 4 | Containers used semantically only. Things that don't need a container don't have one. |
| 5 | Layout reads as elements arranged on a surface, not boxes inside boxes. |

Evidence: max DOM nesting depth on cards/panels, grep for `border-left` decorative usage

### 9. Visual system & graphics

| Score | Criteria |
|---|---|
| 1 | Page is only generic cards/text where product, state, data, or brand object should be visible. Or visual is decorative noise unrelated to meaning. |
| 2 | Simple icon/illustration exists but could fit any project. No product/domain specificity. |
| 3 | Visual supports the page: screenshot, product image, simple diagram, chart, or meaningful icon system. |
| 4 | Visual system is custom to the product/domain: annotated diagram, varied chart, bespoke hero composition, real media, or meaningful motion. |
| 5 | Complex visual is memorable and useful: product-in-context scene, interactive graph/map/timeline, 3D/canvas/WebGL, or data visualization with clear insight and accessible fallback. |

Evidence: visual type, file:line references, relationship to PRODUCT.md/CONTEXT.md, reduced-motion or static fallback

## Aggregate score

```
total       = sum of dimension scores (max 45)
average     = total / count_of_scored_dimensions
phase_pass  = ALL scored dimensions ≥ 3
phase_fail  = ANY scored dimension < 3
```

A phase fails if any dimension is below 3. Same gate as functional verification.

## Output format (verifier agent contract)

```markdown
## Design Rubric — Phase {N}

| Dim | Score | Evidence |
|---|---|---|
| Typography | 4 | `app/page.tsx:14` Fraunces + JetBrains Mono pair, weights 400/500/700, clamp() scale visible |
| Color cohesion | 3 | All CSS vars in `app/globals.css:8-22`. OKLCH used. Strategy: Restrained. WCAG AA verified |
| Spatial rhythm | 5 | Fluid clamp padding throughout, varied within section, generous between |
| Layout originality | 2 | `app/page.tsx:42-78` is a three-column feature grid in section 2 — first-order slop. Rework. |
| ... | ... | ... |

**Aggregate:** 32/45 (avg 3.56)
**Phase verdict:** FAIL — Layout Originality at 2 blocks the phase.
**Fix priority:** Rework section 2. Replace three-column grid with varied-height layout per `design-brand.md` §Layout.
```

If the score < 3, the verifier writes the diagnosis. The fix is the next builder's task.
