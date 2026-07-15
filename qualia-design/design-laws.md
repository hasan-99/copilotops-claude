---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "*.html", "*.vue", "*.svelte"]
---

# Design Laws

The non-negotiable rules every Qualia frontend honors. Both registers (Brand and Product) inherit from this file. Skip nothing.

These laws exist because AI-generated UI has identifiable defaults — Inter font, purple gradients, identical card grids, gray-on-gray, modal-as-first-thought — and shipping the defaults is shipping AI slop. Each rule below has a specific failure mode it prevents.

## 1. Color: OKLCH only

Use the OKLCH color space for every color in the codebase. RGB / hex / HSL are translated values, not source values.

```css
/* yes */
--bg:     oklch(0.16 0.012 220);
--accent: oklch(0.78 0.14 196);

/* no */
--bg:     #1a1d22;
--accent: #00ced1;
```

**Why:** OKLCH is perceptually uniform. Equal lightness numbers look equally light to the eye, regardless of hue. Hex doesn't give you that — `#777777` and `#7777ff` are nominally equal lightness but the blue reads darker.

**Reduce chroma at the extremes.** As lightness approaches 0 or 100, high chroma reads garish. Cap chroma at 0.04 below L=0.20 and above L=0.92.

**Never use `#000` or `#fff`.** Tint every neutral toward the brand hue with chroma 0.005–0.01. Pure black/white reads as untuned and generic — the dead giveaway of "designer didn't pick this color, the framework did."

```css
/* tinted neutrals */
--text:  oklch(0.94 0.006 220);   /* 220 is the brand hue */
--bg:    oklch(0.16 0.012 220);
--muted: oklch(0.62 0.010 220);
```

## 2. Color strategy: pick one, commit to it

Before picking colors, pick a strategy. Four steps on a commitment axis:

| Strategy | Rule | When |
|---|---|---|
| **Restrained** | Tinted neutrals + one accent at ≤10% surface coverage | Product default; brand minimalism |
| **Committed** | One saturated color carries 30–60% of the surface | Brand default for identity-driven pages |
| **Full palette** | 3–4 named roles, each used deliberately | Brand campaigns; product data viz |
| **Drenched** | The surface IS the color | Brand heroes; campaign pages |

The "≤10% accent" rule is **Restrained only**. Committed / Full palette / Drenched exceed it on purpose. Don't collapse every design to Restrained by reflex.

## 3. Theme: write a scene sentence

Dark vs light is never a default. Not dark "because tools look cool dark." Not light "to be safe." Before choosing, write **one sentence of physical scene**: who uses this, where, under what ambient light, in what mood.

| Vague (no answer) | Concrete (forces an answer) |
|---|---|
| "Observability dashboard" | "SRE glancing at incident severity on a 27-inch monitor at 2am in a dim room" |
| "Customer support tool" | "Agent at a coffee-lit desk juggling 4 chats while a coworker asks a question" |
| "Marketing site" | "Founder showing the page to an investor on an iPad in a sunlit lobby" |

Run the sentence, not the category. If the sentence doesn't force an answer, add detail until it does.

## 4. Typography

- Body line length capped at 65–75ch
- Hierarchy through scale + weight contrast (≥1.25 ratio between adjacent steps)
- Avoid flat scales — if h1 is 32px and h2 is 28px, the hierarchy is invisible
- Letter-spacing as a semantic signal:
  - Display headlines: tight (-0.02em to -0.04em)
  - Body: neutral (0)
  - Labels and badges: open (+0.04em to +0.08em)
  - Category tags: wide (+0.08em to +0.14em)

## 5. Layout

- **Vary spacing for rhythm.** Same padding everywhere is monotony. Tight within groups, generous between sections.
- **Cards are the lazy answer.** Use them only when they're truly the best affordance. Nested cards are always wrong.
- **Container depth max 2.** Card → content. Not card → panel → pill → content.
- **Don't wrap everything in a container.** Most things don't need one.
- **Full-width with fluid padding.** No hardcoded `max-width: 1200px` or `max-w-7xl`. Use `clamp(1rem, 5vw, 4rem)` for horizontal padding.

## 6. Motion

- Don't animate CSS layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`). Animate `transform` and `opacity`.
- Ease out with exponential curves: `cubic-bezier(0.22, 1, 0.36, 1)` (out-quart) or `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo). No bounce. No elastic.
- One signature motion per page > scattered micro-interactions
- Always respect `prefers-reduced-motion: reduce`

## 7. Copy

- Every word earns its place
- No restated headings
- No intros that repeat the title
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. Also not `--`.
- CTAs name the action. "Download invoice" not "Get Started". "Continue setup" not "Learn More".

## 8. Absolute bans (match-and-refuse)

If you're about to write any of these, rewrite the element with different structure. No exceptions.

| Banned pattern | Why | Rewrite with |
|---|---|---|
| **Side-stripe borders** — `border-left: 4px` colored as accent on cards / list items / callouts | Decorative noise, never semantic | Full borders, background tints, leading numbers/icons, or nothing |
| **Gradient text** — `background-clip: text` with a gradient | Decorative, never meaningful | Single solid color. Emphasis via weight or size |
| **Glassmorphism by default** — blur + glass cards used everywhere | Trendy slop from 2023-2024 | Rare and purposeful, or nothing |
| **Hero-metric template** — big number, small label, three supporting stats, gradient accent | SaaS cliché | Vary layout per metric. Don't grid them |
| **Identical card grids** — same-sized cards with icon + heading + text repeated 3+ times | The default AI hero pattern | Vary card sizes, layouts, content shapes |
| **Modal as first thought** — every action goes through a modal | Lazy interaction design | Inline expansion, progressive disclosure, dedicated route |

## 9. The AI slop test (run at two altitudes)

If someone could look at this interface and say "AI made that" without doubt, it failed.

**First-order check.** If someone could guess the theme + palette from the category alone, the first reflex won:
- Observability → dark blue
- Healthcare → white + teal
- Finance → navy + gold
- Crypto → neon on black

If yes, rework the scene sentence and color strategy until the answer isn't obvious from the domain.

**Second-order check.** If someone could guess the aesthetic family from category-plus-anti-references, the trap one tier deeper won:
- AI workflow tool that's not SaaS-cream → editorial-typographic
- Fintech that's not navy-and-gold → terminal-native dark mode
- Health app that's not white-and-teal → soft-pastel

The first reflex was avoided; the second wasn't. Rework until both answers are not obvious. The Brand register's reflex-reject aesthetic lanes catch the currently-saturated families.

## 10. Single-icon-family rule

Pick one icon family per project and enforce it. Lucide OR Heroicons OR Phosphor OR Radix Icons. Never mixed. Mixing icon families is the visual equivalent of mixing fonts.

## 11. Anti-references are mandatory

Every PRODUCT.md must list 3–5 sites the project should NOT look like. Anti-references are more useful than positive references because they pin down what the design is reacting against.

```
Anti-references:
- generic SaaS-cream (Notion clones)
- terminal-nostalgia (vercel/v0 dark)
- corporate-navy fintech (most banks)
```

## 12. The implementation must match the vision

Maximalist designs need elaborate code. Minimalist designs need restraint, precision, and careful attention to spacing and typography. The failure mode is mismatch: elaborate animation on a "clean minimal" claim, or flat execution of an ambitious concept.

If you wrote 200 lines of CSS to render a "minimal" landing page, the page is not minimal. If your "bold and maximalist" page uses 4 colors and `text-center`, it's not bold.
