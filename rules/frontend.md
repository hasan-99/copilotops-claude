---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "tailwind.config.*"]
---

# Frontend Aesthetics

- Distinctive fonts (not Inter/Arial)
- Cohesive color palette with sharp accents
- CSS transitions, staggered animations
- Layered backgrounds, subtle gradients
- Avoid: card grids, generic heroes, blue-purple gradients

Note: GSD executors MUST follow these rules when building any frontend component. These are Fawzi's brand standards, not suggestions.

## Impeccable Design Skills (global)
Use these `/commands` for design refinement on any frontend work:
- `/polish` — Final detail pass before shipping (spacing, alignment, consistency)
- `/bolder` — Amplify safe/boring designs to be more striking
- `/quieter` — Tone down overly aggressive designs
- `/animate` — Add purposeful micro-interactions and motion
- `/colorize` — Inject strategic color into monochrome UIs
- `/clarify` — Fix unclear UX copy, labels, error messages
- `/critique` — Design director-level review (run before shipping)
- `/distill` — Strip unnecessary complexity
- `/delight` — Add memorable touches and personality
- `/harden` — Edge cases, overflow, i18n robustness
- `/onboard` — First-time user experience flows
- `/normalize` — Align with project design system
- `/extract` — Pull reusable components into design system
- `/adapt` — Cross-device/context adaptation (broader than /responsive)
- `/teach-impeccable` — Run once per project to set design context

### Recommended workflow
1. Build feature → 2. `/critique` → 3. `/polish` → 4. `/harden` → ship
