# /qualia-new Reference Templates

Detailed agent-prompt templates and rendering formats referenced by SKILL.md.
Each section is a verbatim template -- copy it, fill the `{placeholders}`, and spawn.

## Researcher prompts (4 dimensions)

Spawn all 4 as parallel `Agent()` calls in a single message. Each uses the same structure with a different `<dimension>`.

```
Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/researcher.md

<dimension>stack</dimension>
<domain>{inferred domain from PROJECT.md}</domain>
<project_context>{PROJECT.md summary}</project_context>
<milestone_context>multi-milestone -- research must cover scalability through Milestone 3+</milestone_context>
<output_path>.planning/research/STACK.md</output_path>
", subagent_type="qualia-researcher", description="Stack research")

Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/researcher.md

<dimension>features</dimension>
<domain>{inferred domain}</domain>
<project_context>{PROJECT.md summary}</project_context>
<milestone_context>multi-milestone -- distinguish v1 table stakes from v2 differentiators</milestone_context>
<output_path>.planning/research/FEATURES.md</output_path>
", subagent_type="qualia-researcher", description="Features research")

Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/researcher.md

<dimension>architecture</dimension>
<domain>{inferred domain}</domain>
<project_context>{PROJECT.md summary}</project_context>
<milestone_context>multi-milestone -- Phase 1 foundations must support final-milestone requirements</milestone_context>
<output_path>.planning/research/ARCHITECTURE.md</output_path>
", subagent_type="qualia-researcher", description="Architecture research")

Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/researcher.md

<dimension>pitfalls</dimension>
<domain>{inferred domain}</domain>
<project_context>{PROJECT.md summary}</project_context>
<milestone_context>multi-milestone -- flag risks that stall LATER milestones, not just v1</milestone_context>
<output_path>.planning/research/PITFALLS.md</output_path>
", subagent_type="qualia-researcher", description="Pitfalls research")
```

## Synthesizer prompt

Spawn after all 4 researchers complete.

```
Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/research-synthesizer.md

Merge the 4 research files at .planning/research/ into .planning/research/SUMMARY.md.
This is a multi-milestone project -- the SUMMARY must suggest a FULL milestone arc
that covers the ENTIRE capability set to its done-state (as many milestones as the
scope needs, ending in Handoff for client projects -- no milestone cap), not just a
v1 phase list. Include roadmap implications AND handoff implications (what client
takeover requires).
", subagent_type="qualia-research-synthesizer", description="Synthesize research")
```

## Roadmapper prompt

Spawn with full-journey mandate. If the user passed `--full-detail`, set `<full_detail>true</full_detail>`.

```
Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/roadmapper.md

<task>
Create the FULL JOURNEY for this project:
  - .planning/JOURNEY.md -- all milestones (≥2, no upper cap; ending in Handoff for client projects) covering every capability from discovery §9, with exit criteria
  - .planning/REQUIREMENTS.md -- requirements grouped by milestone
  - .planning/ROADMAP.md -- Milestone 1's phase detail (and ALL milestones if full_detail=true)

User-scoped v1 features:
{list of features selected in Step 9, grouped by category}

Template type: {template_type from config.json}
If set, use C:\Users\hasan\.claude/qualia-templates/projects/{type}.md as the milestone arc starting point.

Stack preset: {stack_id from config.json}
If .planning/phases.md exists (laid down by the Step 5a stack preset), read it as the
seed phase plan for Milestone 1 — it is tuned to this stack's archetype. The runnable
scaffold for this stack is already in the project root, so Milestone 1's foundation
phase should build ON the scaffold (auth wiring, first migration, first feature),
not re-scaffold from scratch.

<full_detail>{true if --full-detail, else false}</full_detail>
  - false (default): Milestone 1 gets full phase detail; M2..M{N-1} stay as sketches. Detail fills in when each milestone opens via /qualia-milestone.
  - true: every milestone (M1..Handoff) gets full phase-level detail in ROADMAP.md upfront. Useful when the client wants a fully-committed plan at kickoff.

The final milestone MUST be named 'Handoff' with the fixed 4 phases
(Polish, Content + SEO, Final QA, Handoff). Do not omit it.

After writing, update STATE.md via:
  node C:\Users\hasan\.claude/bin/state.js init \
    --project '{name}' --client '{client}' --type '{type}' \
    --milestone_name '{Milestone 1 name}' \
    --phases '<JSON: Milestone 1 phases only>' \
    --total_phases <count>
</task>
", subagent_type="qualia-roadmapper", description="Create full journey")
```

## Journey ladder format

The branded journey ladder rendered in Step 11. Use `node C:\Users\hasan\.claude/bin/qualia-ui.js journey-tree .planning/JOURNEY.md` for the programmatic version. The manual ASCII fallback format is below.

```
## Proposed Journey

**{N} milestones to handoff** | **{X}/{X} capabilities mapped** | Full §9 inventory covered (0 unmapped)

  +-- Milestone 1 . {Name}               [CURRENT]
  |  Why now: {one line}
  |  Exit: {outcome 1}, {outcome 2}
  |  Phases: 1. {name} -> 2. {name} -> 3. {name}
  |  Requirements: {REQ-IDs}
  +--
         |
         v
  +-- Milestone 2 . {Name}
  |  Why now: {one line}
  |  Exit: {outcome 1}, {outcome 2}
  |  Phases: 1. {name} -> 2. {name}
  |  Requirements: {REQ-IDs}
  +--
         |
         v
  ...
         |
         v
  +-- Milestone {N} . Handoff           [FINAL]
  |  Exit: Deployed, docs, credentials, walkthrough
  |  Phases: 1. Polish -> 2. Content + SEO -> 3. Final QA -> 4. Handoff
  +--

Milestone 1 is fully planned. Milestones 2..{N-1} are sketched and will be detailed
when they open. Milestone {N} (Handoff) uses the standard 4-phase template.
```
