---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "*.html", "*.vue", "*.svelte"]
---

# Design — Product register

**When this register applies:** app UI, admin consoles, dashboards, internal tools, settings pages, anything where the design SERVES the product.

**The bar:** earned familiarity. Fluent users of Linear, Figma, Notion, Stripe, Raycast should trust the interface on first glance. Distinctiveness is allowed but never at the cost of usability.

This register inherits all of `design-laws.md`. The rules below add what changes when familiarity, not distinctiveness, is the goal.

## The product brief (what the agent commits to first)

Before any code, the agent writes a 4-line brief and waits for user confirmation:

```
Reference apps:       [Linear · Stripe · Notion · Figma · Raycast · Vercel · Plaid Dashboard · Pylon · ...]
Color strategy:       [Restrained — almost always]
Scene sentence:       [physical scene — focus on context of use, not aesthetic mood]
Density:              [comfortable · standard · compact · ultra-compact]
```

Reference apps anchor the visual language. Pick 2-3 that share the user mental model and the density.

## Density target

Product UIs have to choose density. State it explicitly.

| Density | Examples | Use when |
|---|---|---|
| **Comfortable** | Notion, Linear (default), Mailchimp | Knowledge work, low-frequency |
| **Standard** | Stripe Dashboard, Vercel | Mainstream SaaS |
| **Compact** | Linear (compact mode), Figma left rail | Power users, workflow tools |
| **Ultra-compact** | Bloomberg Terminal, Trader UIs | Information-dense, professional users |

Higher density = smaller font sizes (down to 12px), tighter padding, more rows per viewport. Don't pretend the app is comfortable when it's compact, or vice versa. Match the user's actual workflow.

## Product register — additional laws

### Typography

- **One typeface family is fine** for product. Variable fonts shine here (Inter Display, Geist, Switzer, Mona Sans, Söhne, Untitled Sans).
- Banned (per laws): Inter (regular cut), Roboto, Arial, system-ui, Space Grotesk
- Body: 13-15px depending on density (comfortable=15, standard=14, compact=13, ultra-compact=12)
- Hierarchy through weight (400 body, 500 labels, 600 headings) more than size
- Tabular numerals for any numeric data: `font-feature-settings: "tnum" 1`
- Truncate long strings with ellipsis + tooltip — never let layout collapse on a long username

### Color

- **Restrained is the default.** Tinted neutrals + one accent.
- **Semantic colors required:** success (green) / warning (amber) / error (red) / info (blue). Always paired with non-color signal (icon, label, pattern).
- Status indicators must work for color-blind users. Run the design through a deuteranopia simulator.
- Background depth: 3 surface levels max (`bg`, `surface`, `elevated`). Subtle differences (oklch L delta of 0.03-0.05).

### Layout

- **Density first, aesthetics second.** A beautiful UI a user can't navigate quickly is a failed product UI.
- **Predictable layout.** Sidebar left, main center, optional right rail. Don't reinvent navigation patterns.
- **Sticky headers** for long-scroll views (tables, lists)
- **Keyboard-first.** Every action accessible via keyboard. Power users will memorize shortcuts; expose them.
- **Fitts's Law.** Frequently-used controls go to screen edges. Action buttons in tight clusters.

### Components

| Pattern | Product register rule |
|---|---|
| **Buttons** | 3 variants max: primary / secondary / ghost. Destructive variant where needed. No "outline + filled + ghost + soft + subtle" proliferation. |
| **Inputs** | Always have visible labels (not placeholder-only). Validation inline, on blur. Error messages specific and actionable. |
| **Tables** | Tabular numerals. Right-align numbers. Sort indicators on hover, persistent on active. Sticky headers. |
| **Empty states** | Always include: icon, single sentence of context, primary action |
| **Loading** | Skeleton (not spinner) for known-shape content. Spinner only for unknown duration. |
| **Empty data** | Never "No results." Always "No invoices yet — try [action]." |
| **Toasts** | Auto-dismiss at 5s minimum. Always dismissible. Errors don't auto-dismiss. |
| **Modals** | Last resort (per laws). When unavoidable: trap focus, ESC to close, restore focus on close. |

### Motion

- Restrained. Product UI motion exists to communicate state changes, not to delight.
- Hover transitions: 100-150ms ease-out
- Panel slides: 200ms ease-out
- Page transitions: 0ms (yes, zero) for navigation between similar views. Motion when it would disorient should be skipped.
- Skeleton shimmer: 1500ms loop, subtle
- No bounce. No elastic. No overshoot.

### States (every interactive element)

- Default
- Hover (within 100ms)
- Focus (visible ring, 2px+ offset, contrasting color)
- Active/pressed (subtle scale or color shift)
- Disabled (opacity 0.5, `cursor: not-allowed`, `aria-disabled="true"`)
- Loading (per-element spinner or skeleton)
- Error (inline message + `aria-describedby`)

Every state on every interactive element. No exceptions.

## Product register success criteria

If you can answer YES to all of these, the product register passed:

- [ ] A user fluent in the reference apps would feel oriented in 5 seconds
- [ ] Density is consistent across the app (one chosen value, applied)
- [ ] Keyboard navigation reaches every action
- [ ] Empty / loading / error states present on every async surface
- [ ] Color is never the sole information signal
- [ ] Tabular numerals on numeric columns
- [ ] No reinvented navigation pattern
- [ ] Implementation matches vision (precision and restraint, not flourish)

## When in doubt

Ask: "Would Linear ship this?" If the answer is no, rework. Linear is not the only standard, but it is the highest commonly-cited bar for product design in 2025-2026 — fluency, restraint, density, motion all dialed in. Most product work will land within ±10% of Linear's bar; be honest about which side.
