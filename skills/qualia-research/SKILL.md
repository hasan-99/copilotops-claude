---
name: qualia-research
description: "Deep-research a domain or library BEFORE planning a phase. Spawns researcher with Context7/WebFetch. Writes .planning/phase-{N}-research.md. Triggers: 'research X library', 'study Stripe webhooks', 'best practices for X', 'compare libraries'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Agent
  - WebFetch
  - WebSearch
---

# /qualia-research — Per-Phase Deep Research

Targeted research on domain, library, or integration for a specific phase. Narrow and phase-scoped (distinct from `/qualia-new` project-wide research).

## When to Use

- Phase touches unfamiliar library
- Phase integrates niche API (FHIR, legal forms, payment gateways)
- SUMMARY.md flagged phase for research
- Unsure of current best practice before planning

## Usage

`/qualia-research {N}` — research the current phase or phase N

## Process

### 1. Determine Phase

```bash
node C:\Users\hasan\.claude/bin/state.js check 2>/dev/null
```

Phase N from args, or current phase from STATE.md.

### 2. Load Context

```bash
cat .planning/PROJECT.md 2>/dev/null
cat .planning/ROADMAP.md 2>/dev/null
cat .planning/phase-{N}-context.md 2>/dev/null  # if /qualia-scope was run first
```

Identify what phase needs to know.

### 3. Ask User

**"Researching Phase {N}: {phase name}. What to dig into? Library, domain, integration, pattern?"**

Wait for answer. Answer defines research question.

### 4. Spawn Researcher

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/researcher.md

<dimension>phase-specific</dimension>

<question>
{user's research question}
</question>

<phase_context>
Phase: {N}
Goal: {goal from ROADMAP.md}
Reqs: {REQ-IDs for this phase}
</phase_context>

<project_context>
{PROJECT.md summary}
</project_context>

<output_path>.planning/phase-{N}-research.md</output_path>

Priority: NotebookLM (cross-notebook query) → local knowledge layer (knowledge.js search + qualia-recall) → Context7 → WebFetch → WebSearch.
Skip web round when local sources cover the question with confidence ≥ MEDIUM (per agents/researcher.md §1b).
Include: recommendation, rationale, versions, code examples, alternatives, pitfalls, sources.
", subagent_type="qualia-researcher", description="Phase {N} research")
```

### 5. Review

Read `.planning/phase-{N}-research.md`. Present findings:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Research complete"
```

Show:
- Recommendation
- Confidence
- Top 3 key findings
- Sources used

### 6. Confirm or Continue

- header: "Enough?"
- question: "Enough research, or dig deeper?"
- options:
  - "Enough"
  - "Dig deeper"

"Dig deeper" → ask what, re-spawn researcher with additional questions.

### 7. Commit

```bash
git add .planning/phase-{N}-research.md
git commit -m "docs(phase-{N}): research findings"
```

### 8. Route

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} RESEARCH DONE" "/qualia-plan {N}"
```

## Rules

1. **One session per run.** Don't research phases 1-5 in one call.
2. **Must produce a file.** Research in conversation only is worthless.
3. **Honor locked decisions.** Don't research alternatives to locked choices.
4. **Local-first.** Drain NotebookLM and the local memory (`projects/-home-qualia/memory/MEMORY.md`) before any external call. The team has already researched most domains we touch — querying existing notebooks is near-zero token cost AND higher-quality than fresh WebSearch.
5. **Context7 before WebFetch.** When you do go external, Context7 first for libraries; only WebFetch for non-library content (blog posts, case studies, post-mortems).
