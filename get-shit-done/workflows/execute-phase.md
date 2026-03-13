<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean — delegates plan execution to subagents.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-plan context. Orchestrator: discover plans → analyze deps → group waves → spawn agents → handle checkpoints → collect results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node /home/qualia/.claude/get-shit-done/bin/gsd-tools.js init execute-phase "${PHASE_ARG}")
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.
</step>

<step name="handle_branching">
Check `branching_strategy` from init:

**"none":** Skip, continue on current branch.

**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"

**Team suggestion (optional):** Check if the phase in ROADMAP.md has a `team:` field (e.g., `team: full-stack-team`). If present, suggest:

```
Note: This phase has a team template configured (full-stack-team).
Consider using `/team full-stack "<phase goal>"` for coordinated multi-agent execution.
Continuing with standard execution...
```

This is a suggestion only — execution continues normally regardless. The user can cancel and run `/team` instead, or let standard execution proceed.
</step>

<step name="discover_and_group_plans">
Load plan inventory with wave grouping in one call:

```bash
PLAN_INDEX=$(node /home/qualia/.claude/get-shit-done/bin/gsd-tools.js phase-plan-index "${PHASE_NUMBER}")
```

Parse JSON for: `phase`, `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

**Filtering:** Skip plans where `has_summary: true`. If `--gaps-only`: also skip non-gap_closure plans. If all filtered: "No matching incomplete plans" → exit.

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives, 3-8 words} |
| 2 | 01-03 | ... |
```
</step>

<step name="execute_waves">
Execute each wave in sequence. Within a wave: parallel if `PARALLELIZATION=true`, sequential if `false`.

**For each wave:**

1. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>`. Extract what's being built and why.

   ```
   ---
   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, technical approach, why it matters}

   Spawning {count} agent(s)...
   ---
   ```

   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **Read files and spawn agents:**

   Content must be inlined — `@` syntax doesn't work across Task() boundaries.

   ```bash
   PLAN_CONTENT=$(cat "{plan_path}")
   STATE_CONTENT=$(cat .planning/STATE.md)
   CONFIG_CONTENT=$(cat .planning/config.json 2>/dev/null)
   # Content must be inlined — @ syntax doesn't work across Task() boundaries
   EXECUTE_PLAN_WF=$(cat /home/qualia/.claude/get-shit-done/workflows/execute-plan.md)
   SUMMARY_TMPL=$(cat /home/qualia/.claude/get-shit-done/templates/summary.md)
   CHECKPOINTS_REF=$(cat /home/qualia/.claude/get-shit-done/references/checkpoints.md)
   TDD_REF=$(cat /home/qualia/.claude/get-shit-done/references/tdd.md)
   # Detect if plan involves frontend work
   IS_FRONTEND=$(echo "$PLAN_CONTENT" | grep -qiE '\.(tsx|jsx|css|scss)|frontend|ui|component|page|layout|dashboard|form|modal' && echo "true" || echo "false")
   if [ "$IS_FRONTEND" = "true" ]; then
     DESIGN_CONTEXT=$(cat /home/qualia/.claude/get-shit-done/references/design-quality.md 2>/dev/null)
     FRONTEND_SKILL=$(cat /home/qualia/.claude/skills/frontend-master/SKILL.md 2>/dev/null)
   fi
   ```

   Each agent prompt:

   ```
   <objective>
   Execute plan {plan_number} of phase {phase_number}-{phase_name}.
   Commit each task atomically. Create SUMMARY.md. Update STATE.md.
   </objective>

   <execution_context>
   {execute_plan_wf}
   {summary_tmpl}
   {checkpoints_ref}
   {tdd_ref}
   </execution_context>

   <context>
   Plan:
   {plan_content}

   Project state:
   {state_content}

   Config (if exists):
   {config_content}
   </context>

   <success_criteria>
   - [ ] All tasks executed
   - [ ] Each task committed individually
   - [ ] SUMMARY.md created in plan directory
   - [ ] STATE.md updated with position and decisions
   </success_criteria>
   ```

   **If `IS_FRONTEND` is true**, append this block to the agent prompt before `</success_criteria>`:

   ```
   <design_quality>
   This plan involves frontend work. Use the frontend-master skill as your primary design guide.

   {frontend_skill}

   Build-time standards summary:
   {design_context}
   </design_quality>
   ```

   And add to success_criteria:
   ```
   - [ ] Frontend components meet design quality standards (no generic look, states handled, copy is clear, transitions present)
   ```

3. **Wait for all agents in wave to complete.**

4. **Report completion — spot-check claims first:**

   For each SUMMARY.md:
   - Verify first 2 files from `key-files.created` exist on disk
   - Check `git log --oneline --all --grep="{phase}-{plan}"` returns ≥1 commit
   - Check for `## Self-Check: FAILED` marker

   If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"

   If pass:
   ```
   ---
   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md}
   {Notable deviations, if any}

   {If more waves: what this enables for next wave}
   ---
   ```

   - Bad: "Wave 2 complete. Proceeding to Wave 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

5. **Handle failures:** Report which plan failed → ask "Continue?" or "Stop?" → if continue, dependent plans may also fail. If stop, partial completion report.

6. **Execute checkpoint plans between waves** — see `<checkpoint_handling>`.

7. **Proceed to next wave.**
</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Flow:**

1. Spawn agent for checkpoint plan
2. Agent runs until checkpoint task or auth gate → returns structured state
3. Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
4. **Present to user:**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. User responds: "approved"/"done" | issue description | decision selection
6. **Spawn continuation agent (NOT resume)** using continuation-prompt.md template:
   - `{completed_tasks_table}`: From checkpoint return
   - `{resume_task_number}` + `{resume_task_name}`: Current task
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type
7. Continuation agent verifies previous commits, continues from resume point
8. Repeat until plan completes or user stops

**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.

**Checkpoints in parallel waves:** Agent pauses and returns while other parallel agents may complete. Present checkpoint, spawn continuation, wait for all before next wave.
</step>

<step name="aggregate_results">
After all waves:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```
</step>

<step name="design_polish_pass">
After all waves complete, check if this phase produced frontend work.

```bash
# Find the earliest commit from this phase across all plan numbering formats
PHASE_BASE=$(git log --oneline --all --grep="(${PHASE_NUMBER}-" --reverse 2>/dev/null | head -1 | cut -d' ' -f1)
if [ -z "$PHASE_BASE" ]; then
  # Fallback: try zero-padded format
  PADDED=$(printf "%02d" "${PHASE_NUMBER}")
  PHASE_BASE=$(git log --oneline --all --grep="(${PADDED}-" --reverse 2>/dev/null | head -1 | cut -d' ' -f1)
fi

if [ -n "$PHASE_BASE" ]; then
  FRONTEND_FILES=$(git diff --name-only ${PHASE_BASE}^..HEAD 2>/dev/null | grep -E '\.(tsx|jsx|css|scss)$' | head -30)
else
  # Last resort: check all uncommitted + recent commits
  FRONTEND_FILES=$(git diff --name-only HEAD~20..HEAD 2>/dev/null | grep -E '\.(tsx|jsx|css|scss)$' | head -30)
fi
```

**If no frontend files:** Skip to verify_phase_goal.

**If frontend files exist:** Run the impeccable diagnostic-then-fix flow.

### Step 1: Run /critique diagnostic

```bash
# Content must be inlined — @ syntax doesn't work across Task() boundaries
CRITIQUE_SKILL=$(cat /home/qualia/.claude/skills/critique/SKILL.md 2>/dev/null)
FRONTEND_SKILL=$(cat /home/qualia/.claude/skills/frontend-master/SKILL.md 2>/dev/null)
```

```
Task(
  prompt="You are a design director reviewing frontend work. Run a /critique diagnostic on all changed files.

<skill>
{critique_skill}
</skill>

<frontend_master>
{frontend_skill}
</frontend_master>

<files_to_review>
${FRONTEND_FILES}
</files_to_review>

<rules>
- Read each file before reviewing
- Follow the critique skill exactly: AI slop detection, visual hierarchy, information architecture, emotional resonance, states, typography, color, microcopy
- For each issue, specify which command to run (from the Priority Issues > Command field)
- Do NOT fix anything — only diagnose and recommend
- Output a structured report with:
  1. Anti-Patterns Verdict (pass/fail)
  2. Priority Issues (each with: what, why, fix, command)
  3. Minor Observations
- If everything looks good, report 'Design quality meets standards — no fixes needed'
</rules>",
  subagent_type="qualia-executor",
  description="Design critique for Phase ${PHASE_NUMBER}"
)
```

### Step 2: Parse critique and run recommended commands

Read the critique report. If it says "no fixes needed" — skip to verify_phase_goal.

If issues were found, collect the unique recommended commands from the report (e.g., `/polish`, `/harden`, `/animate`, `/normalize`, `/clarify`, `/bolder`, `/distill`, etc.).

For each recommended command, load the corresponding skill and spawn a fix agent:

```bash
# Load only the skills the critique recommended
# Example: if critique recommended /polish and /harden
for SKILL_NAME in ${RECOMMENDED_COMMANDS}; do
  SKILL_CONTENT=$(cat /home/qualia/.claude/skills/${SKILL_NAME}/SKILL.md 2>/dev/null)
  # Only proceed if skill file exists
  if [ -n "$SKILL_CONTENT" ]; then
    echo "Loading skill: ${SKILL_NAME}"
  fi
done
```

Spawn a single fix agent with all recommended skills loaded:

```
Task(
  prompt="You are a design quality fixer. Apply the recommended fixes from the critique report.

<critique_report>
{critique_output}
</critique_report>

<skills>
{For each recommended command, inline its SKILL.md content here}
</skills>

<frontend_master>
{frontend_skill}
</frontend_master>

<files_to_fix>
${FRONTEND_FILES}
</files_to_fix>

<rules>
- Read each file before modifying — understand context first
- Only modify files in the list above
- Only fix what the critique identified — do not refactor or restructure logic
- Apply each recommended skill to address its specific issues
- Commit changes as: style(${PHASE_NUMBER}): design quality — [summary of what was fixed]
- If a recommended fix would require architectural changes, skip it and note why
</rules>",
  subagent_type="qualia-executor",
  description="Design fixes for Phase ${PHASE_NUMBER}"
)
```

### Step 3: Report

```
---
## Design Quality Pass

**Critique:** {pass/fail verdict}
**Issues found:** {N}
**Commands applied:** {list of skills that ran}
**Fixed:** {summary of changes}

{If issues were skipped: list why}
---
```

Report before proceeding to verify_phase_goal.
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```
Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Check must_haves against actual codebase. Create VERIFICATION.md.",
  subagent_type="qualia-verifier",
  model="{verifier_model}"
)
```

Read status:
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/qualia:plan-phase {phase} --gaps` |

**If human_needed:**
```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

"approved" → continue | Report issues → gap closure
```

**If gaps_found:**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/qualia:plan-phase {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

Also: `cat {phase_dir}/{phase}-VERIFICATION.md` — full report
Also: `/qualia:verify-work {X}` — manual testing first
```

Gap closure cycle: `/qualia:plan-phase {X} --gaps` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/qualia:execute-phase {X} --gaps-only` → verifier re-runs automatically (see below).

**Mandatory re-verification after gap closure:**

When executing with `--gaps-only`, after all gap plans complete (aggregate_results), automatically re-run verification — do NOT skip to update_roadmap. The flow is:

1. Gap plans execute via execute_waves
2. aggregate_results reports completion
3. verify_phase_goal re-runs (spawn qualia-verifier again)
4. **If `passed`:** → update_roadmap (phase complete)
5. **If `gaps_found` again:** Present new gaps, offer another `/qualia:plan-phase {X} --gaps` cycle. **Never mark phase complete with gaps.**
6. **If `human_needed`:** Present for manual testing as usual

A phase MUST NOT be marked complete in ROADMAP.md until verification returns `passed` or the user explicitly approves after `human_needed`. There is no bypass.
</step>

<step name="update_roadmap">
Mark phase complete in ROADMAP.md (date, status). **Only reachable when verification status is `passed` or user approved `human_needed` items.**

```bash
node /home/qualia/.claude/get-shit-done/bin/gsd-tools.js commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/phases/{phase_dir}/*-VERIFICATION.md .planning/REQUIREMENTS.md
```
</step>

<step name="offer_next">

**If more phases:**
```
## Next Up

**Phase {X+1}: {Name}** — {Goal}

`/clear` then `/qualia:plan-phase {X+1}`
```

**If milestone complete:**
```
MILESTONE COMPLETE!

All {N} phases executed.

`/clear` then `/qualia:complete-milestone`
```
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Subagents: fresh 200k each. No polling (Task blocks). No context bleed.
</context_efficiency>

<failure_handling>
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/qualia:execute-phase {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>
