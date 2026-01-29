# ALKEMY Refactoring Agent Prompt

Copy and paste this to start a new Claude Code session:

---

## Prompt

```
Read ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md then continue refactoring the ALKEMY codebase.

## Context
ALKEMY is a film pre-production AI platform (React 18 + Vite + Supabase). Phase 1 complete: WorldPage.tsx reduced from 3,700 to 2,079 lines by extracting VisualCard and Grid components.

## Your Task
Continue systematic refactoring following established patterns:

### Phase 2: ProjectContext Decomposition (Priority)
Extract domain-specific hooks from context/ProjectContext.tsx (~2,250 lines):
- hooks/domain/useCharacterOperations.ts - Character CRUD, outfits, poses
- hooks/domain/useLocationOperations.ts - Location CRUD, variants, angles
- hooks/domain/useVehicleOperations.ts - Vehicle CRUD, variants
- hooks/domain/useSceneOperations.ts - Scene/shot management
- hooks/domain/useProjectSync.ts - Supabase sync, IndexedDB

### Phase 3: CompositePage Decomposition
Extract from pages/CompositePage.tsx (~3,500 lines):
- components/composite/CompositeCanvas.tsx
- components/composite/CompositeToolbar.tsx
- components/composite/CompositeLayerPanel.tsx
- components/composite/CompositeTimeline.tsx

### Phase 4: Backend Consolidation
Consolidate edge functions in supabase/functions/:
- Merge image generation functions into unified endpoint
- Merge video generation functions with provider param
- Extract shared validation schemas

## Established Patterns
1. Typed props interfaces for all components
2. Barrel exports via index.ts
3. Handlers passed as props (components are "dumb")
4. memo() for performance optimization
5. Test after each extraction: npm run build && npm run test -- --run

## Rules
- Read files before modifying
- One phase at a time, verify build/tests between phases
- Don't fix pre-existing TypeScript errors unless asked
- Commit after each phase with descriptive message
- Update handoff notes after completing work

## Verification
After each phase:
1. npm run build (must pass)
2. npm run test -- --run (338 tests must pass)
3. git commit with Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

Start with Phase 2: ProjectContext decomposition.
```

---

## Alternative: Quick Specific Task Prompts

### Extract CompositePage Components
```
Read ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md then extract components from pages/CompositePage.tsx following the established pattern from components/grids/. Focus on CompositeCanvas, CompositeToolbar, and CompositeLayerPanel.
```

### Extract ProjectContext Hooks
```
Read ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md then decompose context/ProjectContext.tsx by extracting domain-specific hooks into hooks/domain/. Start with useCharacterOperations.ts.
```

### Backend Edge Function Consolidation
```
Read ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md then consolidate the image generation edge functions (generate-image, refine-image, generate-outfit) into a unified supabase/functions/image-generation endpoint with action parameter.
```

### Full Codebase Audit
```
Read ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md then perform a codebase audit. Identify all files over 500 lines and create a prioritized refactoring plan with specific extraction targets for each.
```

---

## Session Start Checklist

Before starting any refactoring session:

```bash
# 1. Check git status
cd /home/qualia/Desktop/Projects/websites/alkemy
git status && git branch

# 2. Verify build works
npm run build

# 3. Verify tests pass
npm run test -- --run

# 4. Read handoff notes
cat ~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md
```

---

## Key Context Files

| File | Purpose |
|------|---------|
| `~/.claude/thoughts/alkemy-full-refactor-handoff-2026-01-24.md` | Full refactoring plan |
| `CLAUDE.md` | Project conventions |
| `types.ts` | All TypeScript interfaces |
| `docs/STATUS.md` | Feature status |

---

## Notes for Agent

- Project uses path aliases: `@/*` → project root
- Supabase project ID: `msntbcaqouqvkxslwtqg`
- 338 unit tests, 12 E2E tests
- Pre-existing TypeScript errors exist (don't fix unless asked)
- Always run build + tests after changes
- Commit frequently with descriptive messages
