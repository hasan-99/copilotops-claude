# ALKEMY Refactoring Continuation - Remaining Large Files

## Project Context
- **Project:** /home/qualia/Desktop/Projects/websites/alkemy
- **Deployed:** https://alkemy-bice.vercel.app
- **Tech:** React 18, Vite 6, TypeScript strict, Zustand, Supabase

## What's Already Done (Phases 1-6)

### Phase 1: WorldPage.tsx
- Extracted: VisualCard, CharacterGrid, LocationGrid, VehicleGrid

### Phase 2: ProjectContext.tsx
- Extracted: hooks/domain/ (useCharacterOperations, useLocationOperations, useSceneOperations)

### Phase 3: CompositePage.tsx (Partial)
- Extracted: CompositeFramesGrid, CompositeToolbar, CharacterSelector, LocationSelector, VehicleSelector, ShotCard, ViewfinderOverlay, constants.ts

### Phase 5: MoodboardPage.tsx (963→429 lines)
- Extracted: MoodboardSidebar, MoodboardBoardSelector, MoodboardSearchResults, MoodboardFullscreenViewer

### Phase 6: AddCharacterModal.tsx (1057→551 lines)
- Extracted: CharacterForm, CharacterVariantsGrid, CharacterRefineOverlay, CharacterFullscreenViewer

---

## Your Tasks - 5 Large Files Remaining

### 1. CompositePage.tsx (~3,463 lines) - FINISH EXTRACTION

**Still inline (need extraction):**
- **SceneCard** (lines 676-938, ~260 lines) → `components/compositing/SceneCard.tsx`
  - Complex component with internal state, useNavigate, useProject hooks
  - Handles footage scenes vs regular scenes
  - Has Reorder.Group for drag-and-drop shots

- **CompositingDetailView** (lines 1049-3022, ~2000 lines) → `components/compositing/CompositingDetailView.tsx`
  - The main compositing workspace view
  - Contains 3D viewer integration, prompt editing, generation controls
  - This is the biggest extraction - consider breaking into sub-components:
    - `CompositeViewport.tsx` - The main preview area
    - `CompositePromptEditor.tsx` - Prompt textarea with voice input
    - `CompositeAssetPanel.tsx` - Left sidebar with character/location/vehicle selectors

**After extraction, update CompositePage.tsx to import from `@/components/compositing`**

---

### 2. PresentationPage.tsx (~1,852 lines)

Extract to `components/presentation/`:
- `PresentationSlide.tsx` - Individual slide rendering
- `PresentationControls.tsx` - Playback controls, navigation
- `PresentationToolbar.tsx` - Top toolbar with export, settings
- `PresentationSidebar.tsx` - Left sidebar with slide thumbnails
- `PresentationExportPanel.tsx` - Export modal/panel

---

### 3. KlingAIPage.tsx (~1,303 lines)

Extract to `components/kling/`:
- `KlingVideoEditor.tsx` - Main video editor canvas
- `KlingMotionBrush.tsx` - Motion brush tool controls
- `KlingTimeline.tsx` - Video timeline component
- `KlingToolbar.tsx` - Top toolbar with model selection
- `KlingPreviewPanel.tsx` - Right sidebar with generated videos

---

### 4. VideoGenerationPanel.tsx (~1,022 lines)

Extract to `components/video-generation/` (folder exists):
- `VideoPromptEditor.tsx` - Prompt textarea section
- `VideoModelSelector.tsx` - Model dropdown and options
- `VideoPreviewGrid.tsx` - Generated video thumbnails
- `VideoGenerationProgress.tsx` - Progress indicator

---

### 5. AddVehicleModal.tsx (~1,019 lines)

Mirror the AddCharacterModal pattern. Extract to `components/modals/vehicle/`:
- `VehicleForm.tsx` - Left sidebar form (name, prompt, reference)
- `VehicleVariantsGrid.tsx` - Generated variants display
- `VehicleFullscreenViewer.tsx` - Fullscreen image viewer

---

## Patterns to Follow

1. **Typed props interfaces** - Export alongside component
2. **Barrel exports** - Create `index.ts` in each new folder
3. **memo()** - Wrap extracted components for performance
4. **Callbacks for actions** - No direct state coupling, pass handlers as props
5. **Keep existing functionality** - Don't break anything, just extract

## Reference Files
- `components/compositing/CharacterSelector.tsx` - Good example of selector component
- `components/moodboard/index.ts` - Good barrel export example
- `components/modals/character/CharacterForm.tsx` - Modal form pattern

## Commands
```bash
npm run build                    # Verify build passes
npx tsc --noEmit --skipLibCheck  # TypeScript check (some pre-existing errors OK)
npm run test -- --run            # Run tests
```

## After Each File

1. Verify TypeScript compiles (new files should have no errors)
2. Run build to confirm
3. Commit with format: `refactor(scope): extract X components from Y`
4. Push: `git push`

## Pre-existing Issues (Ignore)
- context/ProjectContext.tsx:1273 - batchSize error
- components/timeline-editor/* - Various TS issues
- services/audioEngineService.ts - Undefined checks
- services/videoEngine/KeyframeInterpolator.ts - Undefined checks

---

## Priority Order

1. **CompositePage.tsx** - Finish what was started (SceneCard + CompositingDetailView)
2. **AddVehicleModal.tsx** - Quick win, mirrors existing pattern
3. **PresentationPage.tsx** - Second largest file
4. **KlingAIPage.tsx** - Video editor specific
5. **VideoGenerationPanel.tsx** - Smaller, contained

---

**Estimated total extraction: ~7,600 lines across 5 files**
