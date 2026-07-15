# /qualia-optimize Reference Templates

Agent-prompt templates for SKILL.md. Copy, fill `{placeholders}`, spawn.

## Frontend agent prompt

```
Agent(
  prompt="Optimize frontend. Analyze planning docs + rules, then code.

<planning>
{PROJECT.md content}
{REQUIREMENTS.md content}
{DESIGN.md content}
</planning>

<rules>
{qualia-design/frontend.md content}
</rules>

<task>
Analyze frontend:

1. **UI Quality**
   - Loading: every async op needs indicator
   - Error: data-fetching components handle errors
   - Empty: lists/tables handle zero items helpfully
   - Responsive: no fixed px widths, breakpoints handled
   - A11y: alt text, ARIA, keyboard nav

2. **Design Alignment**
   - Components vs DESIGN.md (colors, typography, spacing)
   - qualia-design/frontend.md compliance: distinctive fonts? sharp accents? transitions? No card grids / gradients?
   - Consistency across app (buttons, spacing, colors)

3. **Frontend Perf**
   - Bundle: large imports -> tree-shake or dynamic import
   - Images: next/image? width/height? lazy below fold?
   - Fonts: next/font? No render-blocking?
   - CSS: unused Tailwind? conflicts?
   - Rendering: unnecessary re-renders, missing memo, heavy computations

Per finding: What / Where (file:line) / Why (impact) / Fix / Severity (CRITICAL|HIGH|MEDIUM|LOW)
</task>",
  subagent_type="general-purpose",
  description="Frontend optimization analysis"
)
```

## Backend agent prompt

```
Agent(
  prompt="Optimize backend. Analyze planning docs + security rules, then code.

<planning>
{PROJECT.md content}
{REQUIREMENTS.md content}
</planning>

<rules>
{rules/security.md content}
</rules>

<task>
Analyze backend:

1. **Security**
   - RLS: every table needs RLS + policies
   - Service role: grep client code (app/, components/, src/) for service_role -> must be ZERO
   - Auth: mutations use server-side auth (supabase.auth.getUser())
   - Validation: Zod before DB ops
   - No dangerouslySetInnerHTML / eval()

2. **Data Access**
   - Writes via 'use server' actions, not direct client calls
   - try/catch with meaningful errors
   - revalidatePath/revalidateTag after mutations

3. **Edge Functions** (if supabase/functions/ exists)
   - Cold start: bundle size, dep count
   - Error handling + logging
   - CORS config
   - Timeout protection

4. **API Quality**
   - Rate limiting on public endpoints
   - Proper HTTP status codes
   - Consistent error format

Per finding: What / Where (file:line) / Why (impact) / Fix / Severity (CRITICAL|HIGH|MEDIUM|LOW)
</task>",
  subagent_type="general-purpose",
  description="Backend optimization analysis"
)
```

## Performance oracle prompt

```
Agent(
  prompt="Analyze cross-cutting perf issues.

<planning>
{PROJECT.md content}
</planning>

<task>
Full-stack perf analysis:

1. **DB Queries**
   - N+1: .from() inside loops/.map()
   - Missing indexes on .eq()/.filter()/.order() columns
   - Sequential -> parallel (Promise.all)
   - Over-fetching: SELECT * when specific columns suffice

2. **API Latency**
   - Sequential client calls -> batch
   - Missing caching (stale times, HTTP cache headers)
   - Large payloads without pagination

3. **Bundle Size**
   - Barrel exports blocking tree-shaking
   - Large libs for single fns (lodash, moment)
   - Missing dynamic imports for heavy components

4. **Render Perf**
   - Expensive computations without useMemo
   - Handlers recreated per render without useCallback
   - Large lists without virtualization
   - Context providers causing unnecessary re-renders

Per finding: What / Where (file:line) / Why (impact, quantified) / Fix / Severity (CRITICAL|HIGH|MEDIUM|LOW)
</task>",
  subagent_type="general-purpose",
  description="Performance optimization analysis"
)
```

## Architecture strategist prompt (deepening lens)

`full`: after Wave 1 (synthesizes + deepens). `deepen`: sole agent (no Wave 1).

```
Agent(
  prompt="Arch strategist: Ousterhout deepening lens + cross-cutting issues. Use domain language from CONTEXT.md.

<wave1_findings>
{Wave 1 findings; empty in --deepen mode}
</wave1_findings>

<planning>
{PROJECT.md content}
{REQUIREMENTS.md content}
{CONTEXT.md content (domain glossary)}
{decisions/*.md content (ADRs constraining refactor space)}
</planning>

<vocabulary>
- **Module**: construct with interface + impl (fn, class, package, slice)
- **Interface**: everything caller must know (types, invariants, error modes, ordering, config)
- **Depth**: leverage at interface. Deep = high leverage. Shallow = interface ~ impl.
- **Seam**: where interface lives; alterable without in-place editing.
- **Locality**: change, bug, knowledge concentrated in one location.
- **Deletion test**: deleting module makes complexity vanish across N callers -> earning keep.
</vocabulary>

<task>
TWO sections:

A) **Cross-cutting** (skip in --deepen):
1. Recurring Wave 1 patterns -> structural problem
2. Frontend-backend coupling
3. Inconsistent patterns (server actions vs API routes)
4. Missing abstractions (pattern repeated 3+ times)
5. Dead code / unused exports

B) **Deepening candidates** (always):
Per candidate:
- **Files**: file:line ranges
- **Problem**: what's shallow, what leaks
- **Solution**: new interface, what gets hidden
- **Benefits**: locality, leverage, testability
- **Deletion test**: deleting X -> N callers no longer need what?
- **Domain terms**: CONTEXT.md terms touched or surfaced
- **Severity**: CRITICAL | HIGH | MEDIUM | LOW

Look for:
- Shallow wrappers (interface ~ impl)
- Pure fns extracted for testability only (no locality)
- Concept-bouncing (1 concept -> 5+ files)
- Cross-seam coupling (private detail leaking)
- Untested/untestable sections (bad seams)

REFUSE: 'extract helper fn' failing deletion test. More shallow modules = disease.

Format: What/Where/Why/Fix/Severity.
</task>",
  subagent_type="general-purpose",
  description="Architecture synthesis + deepening"
)
```

## Parallel interface design prompt (`--deepen` Wave 3, fan-out × 3)

Spawn 3 agents in the SAME response turn. Each gets the same candidate but a *different* design constraint so the alternatives differ structurally. Use this verbatim — the per-agent constraint is the only variable:

```
Agent(
  prompt="Interface designer (variant {1|2|3}/3). Produce ONE radically different
interface for this deep-module candidate. Other variants are running in parallel
with different constraints — yours is uniquely framed by your design lens.

<candidate>
{candidate block from arch strategist: files, problem, current shallow signature}
</candidate>

<context>
{INLINE .planning/CONTEXT.md (domain glossary — USE these terms verbatim)}
{INLINE .planning/decisions/*.md (ADRs constraining the design space)}
</context>

<your_lens>
Variant 1 → functional / data-oriented (no classes; pure functions; explicit data flow)
Variant 2 → OOP / encapsulated (class with private state; methods on a stable receiver)
Variant 3 → event-driven / message-based (subscriber model; commands and events)
[Use whichever lens is assigned to YOU above — fan-out call passes only ONE]
</your_lens>

<task>
Design the interface only. Do NOT implement. Output:

1. **Interface sketch** (TypeScript signatures, 5-15 lines). Function/class/event
   names use CONTEXT.md domain language. No invented synonyms.

2. **Locality gain** (1 sentence): what concentrates in this module's seam that
   was previously scattered across N files?

3. **Testability** (1-3 lines): where do mocks / adapters live? What's a
   1-line test name that would be easy to write against this interface?

4. **Migration cost** (1 line): rough count — how many callers need updating?
   Are any breaking changes? Can it be staged incrementally?

5. **Trade-off** (1 sentence): what does THIS shape sacrifice compared to the
   other two variants?

Constraints:
- Interface should be DEEP (high leverage per surface area). Refuse a shallow
  wrapper that just renames the existing functions.
- The deletion test must pass: deleting this module makes complexity vanish at
  N callers, not just relocate it.
- Use CONTEXT.md terms. Do NOT invent new vocabulary.
- Output exactly the 5 numbered sections above. No prose preamble.
</task>",
  subagent_type="general-purpose",
  description="Interface variant {N}/3 — {functional|OOP|event-driven} lens"
)
```

After all 3 return, present a comparison table to the user (see SKILL.md Step 5b). User picks 1, 2, 3, or hybrid. Then a single synthesizer agent writes the Refactor RFC to `.planning/reports/refactor/REFACTOR-{slug}.md` honoring the user's pick.

**Token cost**: ~6K per variant × 3 variants = ~18K for the fan-out. Cached prefix (CONTEXT.md + ADRs + candidate block) is shared across the 3 spawns, so effective cost is closer to ~12K. The output rfc-pick stage adds ~3K. Total per-deepening-candidate: ~15K — well within Qualia's per-skill budget.

**Skip variants when one would obviously dominate**: if the codebase is heavily functional (e.g., Effect-based) the OOP variant adds zero value. Strategist may suggest 2 lenses instead of 3 in that case. Default is always 3 unless explicitly noted.
