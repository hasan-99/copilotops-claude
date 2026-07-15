---
name: qualia-milestone
description: "Close current milestone and open next — loads scope from JOURNEY.md (no ad-hoc naming), archives, regenerates ROADMAP.md. Triggers: 'close milestone', 'next milestone', 'milestone done', 'M1 done open M2'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Agent
---

# /qualia-milestone — Milestone Closeout

Triggered after `/qualia-verify` passes on the LAST phase of the current milestone. Archives the current milestone's artifacts, marks its requirements Complete, and opens the next milestone — **scope pulled directly from JOURNEY.md**, not improvised.

## When to Use

- After `/qualia-verify N` passes on the LAST phase of the current milestone
- NOT for individual phase completions — use `/qualia-verify N` for that
- NOT for starting a brand-new project — use `/qualia-new` for that

## Usage

`/qualia-milestone` — close the current milestone, open the next from JOURNEY.md
`/qualia-milestone --auto` — close + open next, then pause at the milestone boundary to ask "Continue to M{N+1}?" (the one human gate in auto mode beyond initial journey approval)

## Process

### 1. Validate Readiness

```bash
node C:\Users\hasan\.claude/bin/state.js check
node C:\Users\hasan\.claude/bin/state.js reqs-check   # this milestone's REQ-ID completion
```

`state.js close-milestone` enforces three guards:
- `MILESTONE_NOT_READY` — any phase not verified
- `MILESTONE_TOO_SMALL` — milestone has < 2 phases
- `MILESTONE_REQS_INCOMPLETE` — a REQ-ID mapped to this milestone in REQUIREMENTS.md is not yet `Complete` (strict profile blocks; standard profile proceeds but the unfinished REQs are surfaced as `warnings` to log). This is what stops "finishing a milestone with scope still open."

If any fires (without `--force`), stop and show the error. Resolve before closing: verify remaining phases, finish the open requirements, or **explicitly defer** a requirement by moving it to `Out of Scope` in REQUIREMENTS.md (a conscious deferral, not silent). `--force` bypasses all three for retroactive bookkeeping only.

Run `reqs-check` first so the user sees exactly which requirements are still open before the close attempt — Step 4 (mark Complete) should already have flipped the finished ones.

### 1b. Demo-Extension Branch

Detect if this is a demo project closing its only milestone:

```bash
PROJECT_TYPE=$(grep -E "^project_type:" .planning/PROJECT.md | head -1 | awk '{print $2}')
MILESTONE_COUNT=$(grep -cE "^## Milestone " .planning/JOURNEY.md 2>/dev/null || echo 0)
```

If `PROJECT_TYPE=demo` AND `MILESTONE_COUNT=1`, the demo's one milestone is closing — there is no "next milestone" in the file. Ask the conversion question:

- header: "Demo shipped — what next?"
- question: "The demo milestone is done. Did the client sign? If yes, extend this into a full project (regenerate JOURNEY.md as a multi-milestone arc to Handoff). If no, this project closes here."
- options:
  - "Client signed — extend to full project"
  - "Demo only — close here, project is done"
  - "Pause" — don't close yet, decide later

**If "Client signed — extend to full project":**

1. Update `.planning/PROJECT.md` frontmatter: `project_type: full`.
2. Run a brief discovery top-up — invoke `/qualia-scope` in PROJECT MODE, but only ask §9–§15 (the full-project-only questions). This adds the **capability inventory** (the whole project's scope), the **whole-project definition of done**, shipping order, compliance, integrations, content ownership, handoff team, and budget shape.
3. Spawn the roadmapper in `extend-to-full` mode (see prompt below). It reads the existing single milestone (now M1), the updated discovery, and produces a full JOURNEY.md with M2..M{N-1} sketches plus the Handoff milestone.
4. Then proceed with the standard close-milestone flow (Steps 2-9) — M1 closes, M2 opens, the user is asked to continue.

Roadmapper prompt for the extension:

```
Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/roadmapper.md

<mode>extend-demo-to-full</mode>
<existing_journey>.planning/JOURNEY.md</existing_journey>
<discovery>.planning/project-discovery.md</discovery>

<task>
The existing JOURNEY.md has 1 milestone (the demo, now M1 and shipped). Extend it
into the FULL milestone arc to Handoff — as many milestones as the agreed scope
needs (no cap), covering the entire capability inventory:

- Keep M1 exactly as-is (it shipped).
- Add M2..M{N-1} covering every capability in §9 of project-discovery.md (the
  capability inventory), ordered per §11 (shipping order). Every §9 capability
  must land in a milestone — nothing agreed is left unplanned.
- Append a Handoff milestone (fixed 4 phases: Polish, Content + SEO, Final QA,
  Handoff).
- Update REQUIREMENTS.md to add REQ-IDs for the new milestones.
- Do NOT regenerate ROADMAP.md here — that happens in Step 7 of /qualia-milestone
  when M2 opens.

Mark M2..M{N-1} as sketched, not fully detailed. The user gets full detail per
milestone when /qualia-milestone opens each one.
</task>
", subagent_type=\"qualia-roadmapper\", description=\"Extend demo to full project\")
```

**If "Demo only — close here":** treat the demo as a shipped-and-done project. Skip Steps 2-9 of the normal flow. Just run:

```bash
node C:\Users\hasan\.claude/bin/state.js close-milestone --force
node C:\Users\hasan\.claude/bin/qualia-ui.js end "DEMO SHIPPED" "/qualia-report"
```

In `--auto` mode, inline-invoke `/qualia-report` and stop.

**If "Pause":** stop, show:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Demo milestone left open. Run /qualia-milestone again when you decide."
```

If the demo branch did NOT fire (full project, or demo with multiple milestones already after extension), continue to Step 2.

### 2. Banner + Confirm

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner milestone
node C:\Users\hasan\.claude/bin/qualia-ui.js journey-tree .planning/JOURNEY.md
```

The journey-tree shows the user WHERE they are on the ladder before asking the close question. Read `.planning/JOURNEY.md` to find the next milestone's name + scope. Show:
- Current milestone name + phases completed + requirements delivered
- Next milestone name + phase sketch + why-now from JOURNEY.md

- header: "Close + open next?"
- question: "Close {current} and open Milestone {N+1}: {next name}?"
- options:
  - "Close + open next" — archive this one, regenerate ROADMAP.md for {next name}
  - "Pause" — don't close yet

### 3. Archive Current Milestone

```bash
milestone_slug="milestone-{N}-$(echo '{current name}' | tr '[:upper:] ' '[:lower:]-')"
mkdir -p .planning/archive/$milestone_slug

cp .planning/ROADMAP.md .planning/archive/$milestone_slug/ROADMAP.md
cp .planning/STATE.md .planning/archive/$milestone_slug/STATE.md
cp .planning/tracking.json .planning/archive/$milestone_slug/tracking.json
# Move per-phase artifacts if present
for f in .planning/phase-*-plan.md .planning/phase-*-verification.md .planning/phase-*-context.md .planning/phase-*-research.md .planning/phase-*-gaps-plan.md; do
  [ -f "$f" ] && mv "$f" .planning/archive/$milestone_slug/ 2>/dev/null
done
```

### 4. Mark Requirements Complete

Edit `.planning/REQUIREMENTS.md`:
- In the Traceability table, flip this milestone's REQ-IDs from Pending/In Progress → **Complete**
- Leave the per-milestone section structure intact (preserves history)

### 5. Close Milestone in State Machine

Closes current milestone's counters, appends a summary to `tracking.json` milestones[]:

```bash
node C:\Users\hasan\.claude/bin/state.js close-milestone
```

If all phases are verified and ≥ 2 phases exist, this succeeds without `--force`. Otherwise add `--force` (rare — usually means the user is closing a preview/demo milestone).

### 6. Read Next Milestone From JOURNEY.md

Parse `.planning/JOURNEY.md` to extract the next milestone's:
- name
- phase list with goals
- requirements covered (REQ-IDs)
- exit criteria

If the next milestone is **Handoff** (always the last milestone), use the fixed 4-phase Handoff template (Polish, Content + SEO, Final QA, Handoff) from the journey template.

If JOURNEY.md doesn't exist (legacy project pre-v4), fall back to asking the user:

- header: "Next milestone"
- question: "What's the next milestone called?"

Then manually sketch its phases. But ideally every v4 project has a JOURNEY.md from the start.

### 7. Regenerate ROADMAP.md for the New Milestone

Spawn the roadmapper with the next milestone's JOURNEY.md sketch as input:

```
Agent(prompt="
Read your role: @C:\Users\hasan\.claude/agents/roadmapper.md

<mode>next-milestone</mode>
<journey_file>.planning/JOURNEY.md</journey_file>
<next_milestone_num>{N+1}</next_milestone_num>
<next_milestone_name>{next name from JOURNEY.md}</next_milestone_name>

<task>
Regenerate .planning/ROADMAP.md for Milestone {N+1}. The sketch in JOURNEY.md
gives you phase names + one-line goals — elevate to full phase-level detail:
- 2-5 success criteria per phase
- requirements coverage from REQUIREMENTS.md (section for this milestone)
- dependency ordering

Do NOT re-plan completed milestones. Do NOT create a new JOURNEY.md — the
existing one stays the source of truth.

After writing ROADMAP.md, update STATE.md via:
  node C:\Users\hasan\.claude/bin/state.js init --force \\
    --project '{project}' --client '{client}' --type '{type}' \\
    --milestone_name '{next name}' \\
    --phases '<JSON: next milestone phases>' \\
    --total_phases <count>

--force is needed because a project already exists.
</task>
", subagent_type="qualia-roadmapper", description="Open milestone {N+1}")
```

### 8. Commit

```bash
git add .planning/
git commit -m "milestone: close M{N} ({current name}) → open M{N+1} ({next name})"
```

### 9. Route (auto-chain aware — the milestone boundary is a human gate in auto mode)

**Case A: this WAS the Handoff milestone closing → project is done.**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js milestone-complete {N} "Handoff" ""
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PROJECT SHIPPED" "/qualia-report"
```

In `--auto` mode, inline-invoke `/qualia-report` and stop. No further chaining — the project is done.

**Case B: a non-final milestone just closed → next milestone is open.**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js milestone-complete {N} "{current name}" "{next name}"
```

**In `--auto` mode**, pause here and ask (this is ONE of the two human gates in auto mode, the other being journey approval at `/qualia-new` time):

- header: "Milestone {N} shipped"
- question: "Continue to Milestone {N+1}: {next name} now?"
- options:
  - "Continue" — inline-invoke `/qualia-plan 1 --auto` for the new milestone
  - "Pause here" — stop and let the user resume later with `/qualia-plan 1 --auto`

If "Continue": the auto-chain resumes. If "Pause": stop, show:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "M{N} CLOSED · M{N+1} READY" "/qualia-plan 1 --auto"
```

**In guided mode**, always stop and show the next step regardless of position:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "M{N} CLOSED · M{N+1} OPEN" "/qualia-plan 1"
```

## What Stays, What Changes

**Stays:**
- `.planning/PROJECT.md` — the project identity doesn't change
- `.planning/JOURNEY.md` — the North Star is the SAME file across all milestones; don't regenerate it
- `.planning/DESIGN.md` — design system persists
- `.planning/archive/` — historical milestones preserved
- `tracking.json` lifetime fields + milestones[] array — cumulative history

**Changes:**
- `.planning/REQUIREMENTS.md` — this milestone's REQ-IDs marked Complete
- `.planning/ROADMAP.md` — regenerated for the new milestone's phases
- `.planning/STATE.md` — reset to Phase 1 of the new milestone

**Discarded (but archived):**
- `.planning/phase-*-*.md` files from the closed milestone — moved to archive

## Rules

1. **Don't close early.** state.js enforces: all phases verified + ≥ 2 phases, unless `--force`.
2. **JOURNEY.md is the source of truth for next milestone.** Don't ask the user to name it unless JOURNEY.md is missing (legacy project).
3. **Archive, don't delete.** Old phase work stays accessible via `.planning/archive/`.
4. **New milestone = fresh phase numbering.** First phase of the new milestone is Phase 1, not Phase {N+1}.
5. **Report aware.** `tracking.json.milestones[]` gets a summary entry on close so local status and `/qualia-report` have milestone context.
6. **Handoff is the final milestone (full projects).** If the current milestone IS Handoff, there is no "next" — route to `/qualia-report` and the project is done.
7. **Demo closes via the demo-extension branch (Step 1b).** A demo's single milestone closing triggers the "client signed?" question. The framework never silently auto-extends a demo without asking — the conversion is a real business decision.
