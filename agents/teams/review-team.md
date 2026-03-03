# Review Team

> Three specialist reviewers analyze code in parallel, results synthesized into unified report.

## Agents

- **code-simplicity-reviewer**
  - subagent_type: code-simplicity-reviewer
  - role: Identify unnecessary complexity, premature abstractions, YAGNI violations, over-engineering
  - focus: Code structure, abstractions, function complexity, dead code

- **performance-oracle**
  - subagent_type: performance-oracle
  - role: Identify performance bottlenecks, N+1 queries, memory leaks, missing indexes, bundle size issues
  - focus: Database queries, API latency, rendering performance, caching opportunities

- **kieran-typescript-reviewer**
  - subagent_type: kieran-typescript-reviewer
  - role: TypeScript quality — strict types, naming conventions, pattern adherence, type safety gaps
  - focus: Type definitions, generics usage, any/unknown, null handling, naming

## Pattern

fan-out (all 3 parallel) → synthesize into REVIEW-REPORT.md

## Shared Context

- .planning/STATE.md — what was built, current phase
- Recent git diff (last N commits relevant to the review scope)

## Coordination Rules

- Each reviewer produces findings independently — no coordination needed
- Reviewers are read-only — they analyze and report, they don't fix
- Findings should include file:line references
- Each reviewer rates findings: critical / warning / suggestion

## Output

REVIEW-REPORT.md in current directory with sections:

```markdown
# Review Report

## Summary
{Overall assessment — 1-2 sentences}

## Simplicity Review
{From code-simplicity-reviewer}

## Performance Review
{From performance-oracle}

## TypeScript Quality Review
{From kieran-typescript-reviewer}

## Action Items
| # | Severity | Finding | File:Line | Reviewer |
|---|----------|---------|-----------|----------|
| 1 | Critical | ... | ... | ... |
| 2 | Warning | ... | ... | ... |
```
