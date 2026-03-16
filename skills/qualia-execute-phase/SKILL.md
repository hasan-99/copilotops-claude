---
name: qualia-execute-phase
description: "Wave-based parallel execution of phase plans with subagent orchestration. Use this skill whenever the user says 'execute phase', 'run phase', 'build phase', 'start building', 'execute', or wants to implement a planned phase. Also trigger when user mentions 'start implementation', 'begin coding', or has a planned phase ready to execute. Supports gap-closure mode for fixing issues found during verification."
---

# Qualia Execute Phase — Phase Execution

Execute all plans in a phase using wave-based parallel subagent orchestration.

## Usage

`/qualia-execute-phase 3` — Execute phase 3
`/qualia-execute-phase` — Auto-detect next phase ready for execution
`/qualia-execute-phase 3 --gaps-only` — Execute only gap closure plans (after verify-work found issues)

## Process

### 1. Load Plans

Read all PLAN.md files for the target phase from `.planning/phases/{phase}-{slug}/`.

For `--gaps-only`, read only the gap-closure plans created by `plan-phase --gaps`.

Reference: `~/.claude/get-shit-done/workflows/execute-phase.md`
UI/brand reference: `~/.claude/get-shit-done/references/ui-brand.md`

### 2. Organize into Waves

Group plan steps into execution waves based on dependencies:
- **Wave 1**: Steps with no dependencies (can run in parallel)
- **Wave 2**: Steps that depend on Wave 1 outputs
- **Wave 3**: Steps that depend on Wave 2 outputs
- etc.

### 3. Execute Waves

For each wave, spawn subagents in parallel. The orchestrator uses ~15% of context for coordination; each subagent gets 100% fresh context with:
- The specific plan step(s) to execute
- Project context (PROJECT.md, relevant files)
- UI/brand guidelines
- Clear acceptance criteria

### 4. Collect Results

As subagents complete:
- Verify each step's acceptance criteria are met
- Resolve any conflicts between parallel changes
- Handle failures (retry or escalate to user)

### 5. Create Phase Summary

Write `{phase}-SUMMARY.md`:
```markdown
# Phase {N}: {Name} — Execution Summary

## Completed Steps
- Step 1: [what was done]
- Step 2: [what was done]

## Files Created/Modified
- file1.tsx — [description]
- file2.ts — [description]

## Notes
- Any deviations from plan
- Tech debt incurred
- Things to watch for in verification
```

### 6. Update State

Update `.planning/STATE.md` phase status to `executed`.

### 7. Next Step

> "Phase {N} executed. Run `/qualia-verify-work {N}` to test the results."

### Agents Used
| Agent | File | Role |
|-------|------|------|
| `qualia-executor` | `~/.claude/agents/qualia-executor.md` | Executes each plan's tasks atomically |
| `qualia-verifier` | `~/.claude/agents/qualia-verifier.md` | Verifies phase goal achievement |
| `qualia-planner` | `~/.claude/agents/qualia-planner.md` | Creates gap closure plans (if verify fails) |
| `qualia-plan-checker` | `~/.claude/agents/qualia-plan-checker.md` | Validates gap closure plans |

Domain skill context from PLAN.md `@skill` references is automatically resolved and inlined into each executor subagent prompt. Plans referencing skills like `frontend-design`, `supabase`, `financial-ledger`, etc. will have those patterns available to executors.
