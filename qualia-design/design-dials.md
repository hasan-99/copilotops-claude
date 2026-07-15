# Design Dials + Negative-Constraint Pre-Flight

Loaded by `/qualia-polish` (Stage 0) and read when generating any DESIGN.md.
Two jobs: (1) three tunable **dials** that set a project's aesthetic risk budget,
(2) a **pre-flight ban-list with positive alternatives** that breaks the model's
default "AI slop" trajectory *before* code is written — not after, where
`slop-detect.mjs` catches what slipped through.

> Why pre-flight beats post-hoc: a ban paired with a *positive* alternative
> ("don't do X — do Y instead") steers generation. A bare ban ("don't do X") is
> the pink-elephant backfire — the model fixates on X. Always pair.

---

## 1. The three dials

Each dial is `LOW | MEDIUM | HIGH`. Set them in DESIGN.md §0; gate them by
**register + project type** (see §3). The dials are intent, not enforcement —
they tell a builder/polish agent how much aesthetic risk the project wants.

| Dial | LOW | MEDIUM | HIGH |
|---|---|---|---|
| **DESIGN_VARIANCE** — how far from convention | Conventional, safe, familiar layouts. Respect existing/client tokens exactly. | One signature move per screen; otherwise conventional. | Editorial/experimental layouts, asymmetry, unexpected grids. Earns attention. |
| **MOTION_INTENSITY** — how much movement | Functional only (focus, state). No decorative motion. `prefers-reduced-motion` honored. | Purposeful entrance/transition on key elements. | Signature motion as identity (Brand register only) — orchestrated, still ≤ budget. |
| **VISUAL_DENSITY** — information per screen | Generous whitespace, few elements, one idea per screen. | Balanced; grouped sections. | Dense, dashboard-grade; every pixel earns its place. |

A builder reads the resolved values and makes choices *within* that budget. A
HIGH on every dial is not "better" — it's a different, riskier product.

---

## 2. Pre-flight ban-list (ban → do instead)

Read this BEFORE writing any component or token. Each ban mirrors a
`slop-detect.mjs` rule (the deterministic post-hoc gate) — this is the
generation-time half of the same contract, with the positive alternative the
scanner can't give you.

| Ban (the slop tell) | Do instead |
|---|---|
| `Inter` / `system-ui` / `Arial` as the brand face | The project's chosen typeface (DESIGN.md §3) with ≥2 weights; a real type pairing |
| Purple→blue/pink hero gradient | The brand palette from DESIGN.md §2 (OKLCH); a single committed accent |
| Gradient *text* | Solid ink at AA contrast; reserve color for one accent moment |
| Pure `#000` on pure `#fff` | Near-black on warm/cool off-white from the token scale (§2) |
| Hardcoded hex in JSX | A CSS variable / token (the per-client registry — see design-reference) |
| Glassmorphism (`backdrop-blur` everywhere) | Solid surfaces with real elevation tokens (DESIGN.md §6) |
| `card-grid` of identical rounded boxes | A layout with hierarchy — feature one item, vary span/scale |
| Spring/bounce easing as the default | Calm `ease-out` / project easing tokens (DESIGN.md §7); bounce only as a Brand signature |
| `outline: none` with no replacement | A visible `:focus-visible` ring (accessibility, non-negotiable) |
| Generic CTA copy ("Get Started", "Learn More") | Specific, product-true microcopy (rubric dim 7) |

When VISUAL_DENSITY=HIGH the whitespace ban relaxes; when MOTION_INTENSITY=LOW
the motion alternatives default to "none." The dials tune the list; they never
unlock a hard accessibility ban (focus ring, alt text, contrast).

---

## 3. Gating by register + project type (don't fight client tokens)

The dials default by what the project IS — a corporate client's app must not get
HIGH variance that overrides their brand system:

| Project type | VARIANCE | MOTION | DENSITY | Note |
|---|---|---|---|---|
| Client app on an existing brand system | LOW | LOW–MED | per product | Respect their tokens; the per-client registry (design-reference) is law. |
| Internal tool / admin / dashboard | LOW | LOW | HIGH | Clarity over flair; dense is correct. |
| Greenfield product (Product register) | MEDIUM | MEDIUM | MEDIUM | One signature move; earn the rest. |
| Marketing / landing / portfolio (Brand register) | HIGH | HIGH | LOW–MED | Attention is the job; signature motion allowed. |

If a client ships a design-token registry, **VARIANCE is capped at LOW for
color/type** regardless of register — you may be expressive with layout/motion,
never with their palette or face. See `design-reference.md`.
