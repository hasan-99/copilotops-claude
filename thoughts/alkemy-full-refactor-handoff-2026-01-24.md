# ALKEMY Full Refactoring Handoff

**Date:** 2026-01-24
**Project:** /home/qualia/Desktop/Projects/websites/alkemy
**Deployed:** https://alkemy-bice.vercel.app
**Repo:** https://github.com/Qualiasolutions/ALKEMY-V3.1

---

## Project Overview

ALKEMY is a **film pre-production AI platform** that transforms scripts into visual assets:
- Script analysis → Character/Location/Scene extraction
- AI image generation (Gemini 3 Pro)
- Video generation (Veo 3.1, Kling AI)
- 3D world generation (Blockade Labs, YUME)
- C.O.R.A AI cinematography assistant

**Tech Stack:**
- Frontend: React 18, Vite 6, TypeScript (strict), Zustand, TanStack Query
- Backend: Supabase (Postgres + Edge Functions in Deno)
- AI: Gemini API (primary), OpenRouter (Kling video only)
- Deploy: Vercel + Supabase hosted

---

## Completed Refactoring (Phase 1)

### WorldPage.tsx Decomposition ✅

Reduced from 3,700 → 2,079 lines (-44%):

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| VisualCard | `components/cards/VisualCard.tsx` | 439 | Reusable entity card with generation status |
| EntityVisualCard | `components/cards/VisualCard.tsx` | - | Wrapper with background task integration |
| CharacterGrid | `components/grids/CharacterGrid.tsx` | 101 | Character list with poses/outfits |
| LocationGrid | `components/grids/LocationGrid.tsx` | 112 | Location list with angles/metadata |
| VehicleGrid | `components/grids/VehicleGrid.tsx` | 83 | Vehicle list rendering |

**Patterns Established:**
1. Typed props interfaces for all extracted components
2. Barrel exports via `index.ts`
3. Handlers passed as props (grids are "dumb")
4. `memo()` for performance optimization

---

## Remaining Frontend Refactoring

### Priority 1: God Components (>1000 lines)

| File | Lines | Priority | Suggested Extractions |
|------|-------|----------|----------------------|
| `context/ProjectContext.tsx` | ~2,250 | HIGH | Split into domain hooks (useCharacters, useLocations, etc.) |
| `pages/CompositePage.tsx` | ~3,500 | HIGH | Extract CompositeCanvas, CompositeToolbar, CompositeLayerPanel |
| `pages/TimelinePage.tsx` | ~2,800 | MEDIUM | Extract TimelineTrack, TimelineToolbar, TimelineClip |
| `pages/MoodboardPage.tsx` | ~1,800 | MEDIUM | Extract MoodboardGrid, MoodboardSearch, MoodboardFilters |
| `pages/ScriptPage.tsx` | ~1,400 | LOW | Extract ScriptEditor, ScriptAnalysisPanel |

### Priority 2: Large Components (500-1000 lines)

| File | Lines | Suggested Extractions |
|------|-------|----------------------|
| `components/CORA.tsx` | ~700 | Extract CORAMessage, CORAInput, CORAHistory |
| `components/AddCharacterModal.tsx` | ~600 | Extract CharacterForm, CharacterPreview |
| `pages/OutfitPage.tsx` | ~800 | Extract OutfitGrid, OutfitGenerator |
| `pages/LocationPage.tsx` | ~700 | Extract LocationViewer, LocationAngles |

### Priority 3: Shared UI Components

Create reusable components for patterns repeated across pages:
- `EntityCard` - Generic card for characters/locations/vehicles
- `GenerationProgress` - Progress indicator with stages
- `ImageGallery` - Grid of selectable images
- `PromptInput` - Text input with voice/enhance support

---

## Backend Refactoring (Edge Functions)

### Current State

38 edge functions in `supabase/functions/`, some with duplicated logic.

### Suggested Consolidations

| Current Functions | Consolidate To | Reason |
|-------------------|----------------|--------|
| `generate-image`, `refine-image`, `generate-outfit` | `image-generation` | All use Gemini image API |
| `generate-video`, `kling-video`, `veo-video`, `fal-video` | `video-generation` | Unified video endpoint with provider param |
| `generate-music`, `generate-sfx` | `audio-generation` | Similar patterns |
| `analyze-script`, `generate-casting`, `generate-character-prompt` | `script-analysis` | Script processing functions |

### Shared Utilities to Extract

Currently in `_shared/`:
- `gemini-api.ts` - Good, keep as-is
- `cors.ts` - Good
- `rateLimit.ts` - Good
- `quota.ts` - Good

**Add:**
- `_shared/validation.ts` - Input validation schemas (Zod)
- `_shared/storage.ts` - Supabase storage helpers
- `_shared/response.ts` - Standardized response builders

---

## Database Schema Review

### Tables Needing Attention

| Table | Issue | Action |
|-------|-------|--------|
| `generation_jobs` | Complex status tracking | Consider state machine pattern |
| `projects` | Large JSON columns | Normalize characters/locations to separate tables |
| `usage_logs` | No indexes on common queries | Add composite indexes |

### RLS Policy Audit

All tables have RLS. Review for:
- Performance (avoid complex joins in policies)
- Consistency (same pattern across tables)
- Security (no bypass paths)

---

## Pre-existing Issues (Don't Fix Unless Asked)

```
context/ProjectContext.tsx:1273 - batchSize not in LocationAngleOptions
components/timeline-editor/* - Various TypeScript issues
services/audioEngineService.ts - Undefined checks needed
services/videoEngine/KeyframeInterpolator.ts - Undefined checks
```

---

## File Structure Target

```
src/
├── components/
│   ├── cards/           # ✅ Done
│   │   ├── VisualCard.tsx
│   │   └── index.ts
│   ├── grids/           # ✅ Done
│   │   ├── CharacterGrid.tsx
│   │   ├── LocationGrid.tsx
│   │   ├── VehicleGrid.tsx
│   │   └── index.ts
│   ├── composite/       # TODO
│   │   ├── CompositeCanvas.tsx
│   │   ├── CompositeToolbar.tsx
│   │   └── CompositeLayerPanel.tsx
│   ├── timeline/        # TODO
│   │   ├── TimelineTrack.tsx
│   │   └── TimelineClip.tsx
│   ├── modals/          # TODO - consolidate modals
│   └── ui/              # Existing shared UI
├── hooks/
│   ├── domain/          # TODO - extract from ProjectContext
│   │   ├── useCharacters.ts
│   │   ├── useLocations.ts
│   │   └── useScenes.ts
│   └── ...existing hooks
├── services/
│   └── ...existing (good structure)
└── stores/
    └── ...existing (10 Zustand stores, good)
```

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run test -- --run    # Run 338 unit tests
npx tsc --noEmit         # TypeScript check (has pre-existing errors)

# Supabase
supabase db push --linked           # Push migrations
supabase functions deploy <name>    # Deploy edge function
supabase gen types typescript --linked > types/supabase.ts

# Deployment
vercel --prod            # Deploy to production
```

---

## Key Files to Read First

1. `types.ts` - All TypeScript interfaces
2. `CLAUDE.md` - Project conventions and patterns
3. `context/ProjectContext.tsx` - Central state (target for decomposition)
4. `docs/STATUS.md` - Feature status and version history
5. `docs/SERVICE_ARCHITECTURE.md` - AI service routing

---

## Success Metrics

After full refactoring:
- No file > 500 lines (except ProjectContext which should be < 1000)
- All components have typed props interfaces
- All extracted components have unit tests
- Build time < 10s
- Bundle size < 2MB total
