---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "*.html", "*.vue", "*.svelte"]
---

# Design — Brand register

**When this register applies:** marketing pages, landing pages, campaign sites, portfolios, brand microsites, anything where the design IS the product.

**The bar:** distinctiveness. Memorable beats safe. If a visitor can't remember what your site looked like an hour later, you failed.

This register inherits all of `design-laws.md`. The rules below add what changes when distinctiveness, not familiarity, is the goal.

## The brand brief (what the agent commits to first)

Before any code, the agent writes a 4-line brief and waits for user confirmation:

```
Aesthetic direction:  [editorial · brutalist · luxury · maximalist · retro-futuristic · organic · terminal-native · sci-fi · pastoral · industrial · ...]
Color strategy:       [Restrained · Committed · Full palette · Drenched]
Scene sentence:       [single concrete sentence — who, where, ambient light, mood]
Differentiation:      [what someone will remember 24 hours later]
```

This is mandatory. Skipping it produces generic output that ignores the brand.

## Reflex-reject aesthetic lanes

The currently-saturated AI-design families. Reject by default unless the user explicitly asks for one and you confirmed they understand it's a saturated lane.

| Lane | Tells | Reject because |
|---|---|---|
| **Generic SaaS-cream** | Off-white bg, soft shadows, rounded cards, slate text, one-color accent | Notion clone aesthetic. Every AI tool builds this first |
| **Vercel-terminal-native** | Dark + monospace + green/blue accents + grain | The 2024-2025 v0 aesthetic. Saturated |
| **Crypto-neon** | Pure black + electric accent + glow + grid | Web3 cliché |
| **Healthcare-clinical** | White + teal + rounded sans + soft icons | Every health app |
| **Fintech-navy-gold** | Navy + gold accent + serif headings | Every bank, every wealth tool |
| **Sleek-corporate** | Inter + blue + gradient mesh + isometric illustrations | Every B2B SaaS landing 2020-2024 |

If the project lands in one of these by default, the slop test failed at second-order. Rework.

## Brand register — additional laws

### Typography

- Pick a **distinctive display face**. Editorial serifs (Fraunces, Reckless, Ogg, Editorial New, Mazius). Geometric grotesques (Migra, Söhne, Gambarino). Variable display fonts (Authentic Sans, Departure Mono).
- Pair the display with a **refined body**. JetBrains Mono, Geist, Inter Display (NOT Inter), Söhne, Untitled Sans, Mona Sans, Switzer.
- **Banned display fonts:** Inter, Roboto, Arial, system-ui, Space Grotesk, Montserrat, Poppins, Lato, Open Sans. These are the AI defaults — and the worst signal of "designer didn't choose this."
- **Variable fonts encouraged.** A single variable font with axis-driven weight/optical-size is more interesting than three static cuts.

### Color

- Brand register defaults to **Committed** color strategy. One saturated color carries identity.
- **Drenched** is a strong choice for hero sections. Don't be afraid.
- Accent should be **sharp** — not a desaturated pastel-of-the-brand. The accent is the loudest element on the page.

### Layout

- **Asymmetry > symmetry.** Real design has tension. Centered-everything is the AI default.
- **Diagonal flow, overlap, grid-breaking elements** when they serve the design.
- **Scale contrast.** Hero text at clamp(4rem, 9vw, 8rem) next to body at 1rem creates drama. Hero at 2.5rem next to body at 1rem is timid.
- **Negative space is content.** Generous whitespace > dense layouts for marketing.

### Motion

- One **signature motion** that gives the site personality:
  - Parallax scroll-triggered reveal
  - Magnetic buttons
  - Cursor-following element
  - Letter-by-letter text reveal on hero
  - Scroll-driven scrubbed scene
  - Morphing shapes between sections
- Subtle elsewhere. Restraint everywhere except the signature.
- Use the Web Animations API or Framer Motion for orchestrated sequences. CSS keyframes for one-offs.

### Backgrounds and visual details

This is where Brand earns its register. Allowed and encouraged:

- Gradient meshes (CSS or SVG)
- Noise textures (subtle, 2-5% opacity)
- Geometric patterns (SVG, not images)
- Layered transparencies
- Dramatic shadows (with brand-tinted color, not gray)
- Decorative borders (sparingly)
- Custom cursors (page-specific, not site-wide)
- Grain overlays on images
- Scroll-progress indicators (interesting ones, not generic top bars)

Don't use all of these on one page. Pick 1-2 that serve the brief.

## Brand-specific anti-patterns

In addition to `design-laws.md` absolute bans:

- **Hero pattern: text-center + gradient bg + 2 CTAs + screenshot below.** The single most overused brand pattern of 2020-2025.
- **Three-column feature grid in section 2.** The default AI brand layout.
- **"Trusted by" logo strip in faded gray.** Lazy social proof. If the logos matter, design with them. If they don't, omit.
- **Parallax scroll on every section.** Heavy-handed. Use it for the signature, nowhere else.
- **Animated dots / pulsing orbs / blinking status indicators.** Decorative noise.
- **Generic "Get Started" / "Learn More" CTA pair.** Always specify the action.
- **Stock photography of diverse smiling people in offices.** Use illustration, abstract imagery, product screenshots, or no imagery at all.

## Brand register success criteria

If you can answer YES to all of these, the brand register passed:

- [ ] A designer would call this **distinctive** — not "polished" but **specific**
- [ ] The aesthetic direction is identifiable in 3 seconds
- [ ] The color strategy is one of the four (and reads that way)
- [ ] The scene sentence and the page agree
- [ ] One signature motion, executed well
- [ ] No reflex-reject lane (first or second order)
- [ ] All anti-references avoided
- [ ] Implementation matches vision (effort proportional to ambition)
