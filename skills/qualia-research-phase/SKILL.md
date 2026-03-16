---
name: qualia-research-phase
description: "Conduct standalone research for a project phase — ecosystem analysis, feasibility studies, implementation patterns, comparisons. Use this skill whenever the user says 'research', 'research phase', 'investigate options', 'tech research', or wants to explore technical options before planning a phase. Also trigger when user mentions 'feasibility study', 'compare frameworks', 'what stack should we use', or needs structured research output that feeds into phase planning."
---

# Qualia Research Phase — Phase Research

Conduct structured research for a project phase, producing a RESEARCH.md that feeds directly into phase planning.

## Usage

`/qualia-research-phase 3` — Research for phase 3 (default: ecosystem mode)
`/qualia-research-phase 3 --mode=feasibility` — Feasibility study
`/qualia-research-phase 3 --mode=implementation` — Implementation patterns
`/qualia-research-phase 3 --mode=comparison` — Compare alternatives

## Research Modes

- **ecosystem** (default) — Survey the landscape: what libraries, APIs, patterns exist for this problem
- **feasibility** — Can we do this? What are the blockers? What's the effort?
- **implementation** — How should we build this? Concrete patterns and examples
- **comparison** — Compare 2-3 approaches side by side with tradeoffs

## Process

### 1. Initialize

Use `gsd-tools.js` for state management:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js phase-op <phase>
```

Validate the phase exists in ROADMAP.md. Check if research already exists at `.planning/phases/{phase}-{slug}/{phase}-RESEARCH.md`.

### 2. Gather Context

Read project context:
- `.planning/PROJECT.md` — tech stack, constraints
- `.planning/ROADMAP.md` — phase description and dependencies
- Phase CONTEXT.md if it exists (from discuss-phase)

### 3. Spawn Researcher

Spawn the `qualia-phase-researcher` agent with full context.

Reference: `~/.claude/agents/qualia-phase-researcher.md`

Model resolution:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js resolve-model qualia-phase-researcher
```

### 4. Research Output

The researcher produces `.planning/phases/{phase}-{slug}/{phase}-RESEARCH.md` with sections designed for downstream consumption by plan-phase:

- **Standard Stack** — Recommended libraries and tools
- **Architecture Patterns** — How to structure the implementation
- **Don't Hand-Roll** — Things to use existing solutions for
- **Common Pitfalls** — What to watch out for
- **Code Examples** — Concrete snippets showing key patterns

### 5. Handle Return

The researcher returns one of:
- **COMPLETE** — Research done, ready for planning
- **CHECKPOINT** — Partial results, needs more investigation (spawn continuation)
- **INCONCLUSIVE** — Couldn't determine best approach, present options to user

### When to Use /deep-research Instead

| Use `/qualia-research-phase` | Use `/deep-research` |
|------------------------------|----------------------|
| Phase-specific technical research | Whole-project architectural analysis |
| Output feeds into `/qualia-plan-phase` | Output is a standalone report |
| 1 researcher agent, fast | 6 parallel Opus agents, thorough |
| "How should we build phase 3?" | "Is this codebase production-ready?" |

Both can be combined: `/deep-research` for architectural context, then `/qualia-research-phase` for the specific phase.

### 6. Next Step

> "Research complete for phase {N}. Run `/qualia-plan-phase {N}` to create the execution plan."

### Agents Used
| Agent | File | Role |
|-------|------|------|
| `qualia-phase-researcher` | `~/.claude/agents/qualia-phase-researcher.md` | Conducts phase-specific research |
