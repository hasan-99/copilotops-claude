---
globs: ["*.tsx", "*.jsx", "*.css", "*.scss", "*.html", "*.svg", "*.canvas", "*.webgl"]
---

# Complex Graphics & Visual Systems

Loaded by `/qualia-polish --redesign`, `/qualia-polish --loop`, and any polish pass where the page needs stronger visual identity than typography and spacing alone can provide.

## When To Add Complex Visuals

Use richer graphics when they clarify the product, reveal state, or create a memorable first-viewport signal:

- Product object, venue, person, or service that needs immediate recognition
- Operational dashboard where relationships, flow, status, or hierarchy matter
- Brand site whose current page is only text blocks and cards
- Demo or portfolio page where the work itself should be visible
- Game, spatial tool, voice/AI workflow, analytics surface, map, timeline, graph, or process flow

Do not add complex visuals as decoration. A visual must either explain, orient, compare, or make the brand/product unforgettable.

## Visual Types

Pick the strongest type for the job:

| Need | Prefer |
|---|---|
| Show real product/place/person | Photo, screenshot, generated bitmap, or image search asset |
| Show relationships | Node graph, map, flow field, timeline, Sankey, chord, matrix |
| Show data | Custom chart with annotations, small multiples, sparklines, heatmap |
| Show process | Step path, layered diagram, animated system map |
| Create brand memory | Bespoke hero composition, editorial collage, product-in-context scene |
| Need depth/spatiality | Three.js full-bleed scene, CSS 3D, canvas/WebGL |
| Need icons | One icon family, ideally lucide if available |

## Quality Rules

1. Use real or generated bitmap imagery when the user needs to inspect a real thing. Do not substitute abstract SVG blobs.
2. For 3D, use Three.js and verify the canvas is nonblank at desktop and mobile viewports.
3. For charts, annotate the insight. A chart without labels or a takeaway is decoration.
4. For diagrams, keep text short and legible at 375px width.
5. For generated assets, save them under project assets, not `.planning/`.
6. For motion, connect animation to meaning: reveal sequence, state change, data transition, or spatial relationship.
7. Respect reduced motion. Complex visuals must have a static fallback.

## Redesign Expectation

`/qualia-polish --redesign` must consider at least one complex-visual concept for the first viewport. It may reject the concept only if it explains why typography/layout alone is stronger for that product.
