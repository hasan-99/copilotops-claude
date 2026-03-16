---
name: portfolio-showcase
description: "Full portfolio refresh pipeline — inventory projects, record showcase videos, process with Rotato device mockups, update the /work page, and ship. Use this skill whenever the user mentions 'portfolio', 'showcase', 'update /work page', 'record projects', 'portfolio refresh', 'showcase video', or wants to update the Qualia Solutions portfolio page. Also trigger for anything related to qualiafinal /work page, Rotato mockups, or project recording pipeline."
---

# Portfolio Showcase — Full Portfolio Refresh Pipeline

End-to-end pipeline: Inventory → Record → Rotato → Update /work → Ship

## Usage

`/portfolio-showcase` — Full pipeline
`/portfolio-showcase --record-only` — Just record videos
`/portfolio-showcase --update-only` — Just update /work page with existing videos
`/portfolio-showcase --ship` — Just deploy current /work page

## Known Projects

| Slug | URL | Type |
|------|-----|------|
| aquador | aquador.eu | Website |
| vero-models | veromodels.com | Website |
| inrvo | inrvo.com | Website |
| sigatalachana | sigatalachana.com | Website |
| maison-maud | maisonmaud.com | Website |
| underdog-sales | underdog.sales | AI Agent |
| ai-boss-brainz | aibossbrainz.com | AI Agent |
| haamah | haamah.com | Website |
| zambelis | zambelis.com | Website |
| ai-sales-coach | ai-sales-coach | AI Voice |

## Phase 1: Inventory

Check which projects need recording updates:

```bash
ls ~/Projects/live/qualiafinal/public/videos/showcase/
```

Compare against known projects list. Flag any projects missing videos or with outdated recordings.

## Phase 2: Record Videos

Use the showcase recorder at `~/Projects/live/qualiafinal/showcase-recorder/`.

For each project needing recording:

1. Run the recorder with Playwright (headless)
2. Video specs: 1920x1080, H.264, CRF 20, 30fps, 55-65 seconds, 5-15MB target
3. Save raw recordings to `showcase-recorder/output/`

See the `record-video` skill for detailed recording instructions.

## Phase 3: Rotato Device Mockups (MANUAL)

This phase requires the user to process videos through Rotato manually.

Pause and tell the user:
> "Raw recordings are ready in `showcase-recorder/output/`. Open Rotato, apply device mockups (MacBook Pro frame recommended), and save the processed videos to `~/Projects/live/qualiafinal/public/videos/showcase/`. Let me know when done."

Wait for user confirmation before proceeding.

## Phase 4: Update /work Page

Design direction: Fantasy.co style — dark cinematic feel, full-bleed project cards.

Key patterns for the /work page:

- **Full-bleed cards** — Each project gets a full-viewport-width card
- **Sticky scroll** — Project details stick while scrolling through gallery
- **Video autoplay** — Videos autoplay on scroll into view, pause when out of view
- **Dark cinematic feel** — Dark backgrounds, high contrast, minimal UI chrome

Video autoplay pattern using IntersectionObserver:

```tsx
'use client';
import { useRef, useEffect } from 'react';

export function ShowcaseVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      className="w-full h-full object-cover"
    />
  );
}
```

Update `app/work/page.tsx` with project cards using this component. Each card includes: project name, description, tech stack tags, link to live site, and the showcase video.

## Phase 5: Ship

Run the ship pipeline to deploy the updated /work page:

```bash
# Quality gates → commit → deploy → verify
```

Use the `ship` skill with `--type=website`.

## Flags

- `--record-only` — Run Phase 1-2 only, skip Rotato/update/ship
- `--update-only` — Run Phase 4 only (assumes videos exist in public/videos/showcase/)
- `--ship` — Run Phase 5 only (deploy current state)
