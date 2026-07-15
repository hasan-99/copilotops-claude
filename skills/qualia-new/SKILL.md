---
name: qualia-new
description: "Set up a new project — kickoff interview, research, CONTEXT.md glossary, decisions/ ADRs, JOURNEY.md, single approval gate, optional `--auto`. Triggers: 'new project', 'start a project', 'qualia-new', 'set up'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
---

# /qualia-new — New Project (Full Journey)

## Reference templates

Detailed agent-prompt templates and rendering formats live in `REFERENCE.md` (in this same skill folder). When a step below says "see REFERENCE.md section X", read that section before generating the spawn.

---

Initialize a project with the **entire arc mapped from kickoff to handoff**. All milestones defined upfront so the team follows a clear path, not improvising after each ship.

## Flags

- `/qualia-new` — full-journey flow, stops after approval (default, backward-compatible). **Progressive detail**: Milestone 1 gets full phase detail; M2..M{N-1} get sketched (names + one-line goals). Full detail for later milestones is filled in by `/qualia-milestone` when each one opens. This matches how real projects unfold — M1's discoveries reshape M3's plan, so deep-planning M3 now tends to waste effort.
- `/qualia-new --auto` — full-journey flow, then auto-chains into `/qualia-plan 1 → /qualia-build → /qualia-verify` for Milestone 1
- `/qualia-new --full-detail` — ALL milestones get full phase-level detail upfront (success criteria per phase for every milestone, not just M1). Use when the client wants a fully-committed plan at kickoff. Trade-off: later milestones often need revision as M1 ships. Combinable with `--auto`.
- `/qualia-new --quick` — 4-phase flat wizard for trivial projects (landing pages, prototypes). Skips research and journey mapping.

## The Shift From Previous Versions

**Before:** `/qualia-new` produced a v1 ROADMAP and stopped. Team improvised subsequent milestones ad hoc.

**Now:** `/qualia-new` produces **JOURNEY.md** (all milestones → Handoff) + REQUIREMENTS.md (multi-milestone, REQ-IDs) + ROADMAP.md (Milestone 1's phase detail). **One approval gate** on the whole journey. Research always runs — no permission ask.

## Process

### Step 0. Banner

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner new
```

Banner only. Do NOT ask anything yet. The next thing the user sees is the project-shape gate — not a free-text "tell me what to build". Shape gate first, content second, because the shape drives the question set.

### Step 1. Project Type Gate (Demo vs Full vs Quick) — FIRST QUESTION

The single most important fork. Demo and Full produce different journeys, different research depth, different milestone counts. This is the literal first interaction with the user.

Use **AskUserQuestion** (interactive UI — never a plain-text prompt):

- header: "Project shape"
- question: "What kind of project is this? Pick one — it drives everything else."
- options:
  - "Demo" — one shippable milestone, real backend, no mocks. Built to win a client conversation, extensible via `/qualia-milestone` if they sign. 8-question discovery.
  - "Full project" — the full multi-milestone arc to Handoff, sized to the agreed capability set (no fixed milestone cap — the arc spans to done). 15-question discovery.
  - "Quick prototype" — landing page, throwaway, ≤1 day. Skips research and journey. (Equivalent to `--quick` flag.)

Store the answer as `PROJECT_TYPE=demo` | `PROJECT_TYPE=full` | `PROJECT_TYPE=quick`. It drives every downstream step.

**Demo design philosophy is non-negotiable (do NOT compromise on these regardless of speed pressure):**
- **1 milestone only.** No multi-milestone arc, no Handoff phase. The demo IS the artifact.
- **NO mock data.** Real backend, real database, real auth. Hardcoded JSON in components is a hard-block. If the data needs Supabase, ship Supabase.
- **Real agent/platform functionality.** The thing actually works end-to-end. A demo with broken flows is not a Qualia demo.
- **DESIGN.md mandatory.** OKLCH palette, distinctive typography, full token system. Slop-detect runs hard-block.
- **Focus = design + functionality.** No sales decks, no placeholder copy, no "lorem ipsum" anywhere.

Speed in a demo comes from skipping multi-milestone planning, NEVER from skipping design quality, mocking the backend, or cutting corners on the core flow.

### Step 2. Brownfield Check

```bash
test -f package.json && echo "HAS_PACKAGE"
test -d .git && echo "HAS_GIT"
test -f .planning/codebase/README.md && echo "ALREADY_MAPPED"
```

If existing code is detected AND not already mapped, **AskUserQuestion**:

- header: "Existing code detected"
- question: "Run `/qualia-map` to scan the repo first?"
- options: ["Yes — map it", "No — proceed without mapping"]

If yes, invoke the `qualia-map` skill inline, wait for completion, then continue. If quick prototype + brownfield, skip the map (quick is for greenfield trivial work; brownfield + quick is contradictory — route to `/qualia-feature` instead).

### Step 3. One-line Pitch (free-text — minimal, no clarification round)

The shape is locked, now capture the content in one sentence:

> **"What are you building? One sentence — a stranger should understand it."**

Accept whatever the user says, even if broad. **Do NOT start an ad-hoc clarification round here.** Depth comes from the structured discovery interview in Step 4, not from free-form questioning. If the answer is "a SaaS platform" — that's fine, write it down, move on. `/qualia-scope` will refine it through its 8 or 15 structured questions.

This is the ONLY free-text question in the kickoff flow. Everything else is `AskUserQuestion`.

### Step 4. Mandatory Discovery Interview (PROJECT MODE)

**Hard rule:** This is the next tool call after Step 3. No ad-hoc clarification, no free-form follow-up, no "let me ask a few quick things first." If the one-line pitch was "a SaaS platform", you invoke `/qualia-scope` NOW — that skill's structured questions are how breadth gets refined into depth.

Invoke `/qualia-scope` inline in PROJECT MODE — non-technical kickoff interview. 8 questions for demo, 15 for full project. Pass `PROJECT_TYPE` so the scope skill skips the type question.

This step REPLACES the old free-form "deep questioning" loop. The scope skill captures answers verbatim into `.planning/project-discovery.md`, which seeds PROJECT.md, PRODUCT.md, CONTEXT.md, and (for full projects) JOURNEY.md milestone names.

```bash
# Inline-invoke qualia-scope in PROJECT MODE
# (no phase number arg = PROJECT MODE; PROJECT_TYPE env tells it which question set)
PROJECT_TYPE=$PROJECT_TYPE qualia-scope
```

After the interview returns, `.planning/project-discovery.md` exists with the user's answers. Read it. Confirm understanding:

- header: "Ready?"
- question: "I have what I need to write PROJECT.md and move forward. Continue?"
- options: ["Continue", "More questions"]

If "More questions": re-invoke `/qualia-scope` for additional rounds. Otherwise continue.

### Step 5. Detect Project Type

From questioning answers, infer type → `website` | `ai-agent` | `voice-agent` | `mobile-app` | `null`. If matched, `cat C:\Users\hasan\.claude/qualia-templates/projects/{type}.md` gives suggested milestone arc. Store `template_type` for Step 13.

### Step 5a. Stack Preset Gate + Instantiate (ONE question, then lay down the scaffold)

This is the **only** stack question. It selects one of four preset directories at `C:\Users\hasan\.claude/qualia-templates/stacks/<id>/` and instantiates it. The preset carries the default tech, the env contract, the seed phase plan, and a runnable starter — so the project begins from a real skeleton, not an empty folder. Skip this step entirely on `--quick` (the quick wizard owns its own minimal layout).

Use **AskUserQuestion** (never a plain-text prompt):

- header: "Stack"
- question: "What kind of build is this? Pick one — it lays down the starter scaffold and the env it needs."
- options:
  - "Landing page" — static marketing site, no database, no auth. (`landing-page`)
  - "Full app" — authenticated product, Supabase + RLS + database. (`full-app`)
  - "AI agent" — LLM/chat/voice agent, Supabase + OpenRouter. (`ai-agent`)
  - "Internal tool" — staff portal, invite-only auth, role-gated. (`internal-tool`)

Map the answer to `STACK_ID` ∈ `{landing-page, full-app, ai-agent, internal-tool}`. Pre-select the option that matches `template_type` from Step 5 if one was detected (`website`→`landing-page`/`full-app`, `ai-agent`/`voice-agent`→`ai-agent`), but the user's pick always wins.

Then instantiate the preset (replace `<id>` with `STACK_ID`):

```bash
PRESET="C:\Users\hasan\.claude/qualia-templates/stacks/${STACK_ID}"

# 1. Lay down the starter scaffold into the project root (skeleton, not an app).
#    -n: never clobber a file the user already created.
mkdir -p .planning
cp -Rn "${PRESET}/scaffold/." . 2>/dev/null || true

# 2. Copy the env contract so /qualia-doctor can check it.
cp "${PRESET}/env.required.json" .planning/env.required.json

# 3. Seed the phase plan from the preset (roadmapper refines it in Step 13).
cp "${PRESET}/phases.md" .planning/phases.md

# 4. Keep the per-stack Definition-of-Done where verify can find it.
cp "${PRESET}/verify-checklist.md" .planning/verify-checklist.md
```

Record the chosen stack in `config.json` (Step 9) as `"stack_id": "${STACK_ID}"`. The seed `phases.md` is the roadmapper's starting point at Step 13 — it reads `.planning/phases.md` (preset plan) alongside `C:\Users\hasan\.claude/qualia-templates/projects/{template_type}.md` (milestone-arc hint) and the research synthesis, then writes the final ROADMAP.md. The scaffold gives Milestone 1 a real foundation to build on instead of an empty directory.

### Step 6. Design Direction (frontend only)

- header: "Design"
- question: "What's the design vibe?"
- options: ["Dark & Bold", "Clean & Minimal", "Colorful & Playful", "Corporate / Professional"]

Plus free-text: "Any brand colors or reference sites I should look at?"

### Step 7. Client Context

- header: "Client"
- question: "Client project or internal?"
- options: ["Client project", "Internal / Qualia", "Personal / Side project"]

If client, ask name. Check saved prefs:
```bash
node C:\Users\hasan\.claude/bin/knowledge.js search "{client name}"
```

### Step 8. Write PROJECT.md

Create `.planning/PROJECT.md` from the template. Include: client, what we're building, core value, validated + active requirements (empty for greenfield), out of scope, stack, design direction, decisions table.

```bash
git init 2>/dev/null
git add .planning/PROJECT.md
git commit -m "docs: initialize project"
```

### Step 8a. Seed CONTEXT.md and decisions/ (REQUIRED)

The domain glossary is the single highest-leverage piece of substrate — every road agent loads it BEFORE PROJECT.md/DESIGN.md. Misalignment is the #1 failure mode in AI coding; CONTEXT.md kills it.

```bash
# Copy template
cp C:\Users\hasan\.claude/qualia-templates/CONTEXT.md .planning/CONTEXT.md

# Initialize ADR folder with the template available for reference
mkdir -p .planning/decisions
cp C:\Users\hasan\.claude/qualia-templates/decisions/ADR-template.md .planning/decisions/_template.md

# A5: gitignore the per-step-mutated state (STATE.md, tracking.json, cursor) so
# only durable increment/release files are committed — multi-person safe.
cp C:\Users\hasan\.claude/qualia-templates/planning.gitignore .planning/.gitignore
```

Then **seed the glossary from the questioning answers**. For each domain term that came up during the Step 4 `/qualia-scope` interview — entities, actions, statuses, key nouns the user repeatedly said — add an entry to `.planning/CONTEXT.md` under `## Language` with:
- the term
- a one-sentence definition
- an `Avoid:` line listing rejected synonyms (terms the team should NOT use for this concept)

If the user used multiple terms for the same thing during questioning, capture the disambiguation under `## Flagged ambiguities` (e.g. "User → AuthUser vs Customer").

Replace `{{PROJECT_NAME}}` in CONTEXT.md with the project name.

```bash
git add .planning/CONTEXT.md .planning/decisions/
git commit -m "docs: seed CONTEXT.md domain glossary + decisions/ folder"
```

The glossary stays terse — one sentence per entry. It's loaded into every agent spawn; bloat costs tokens. `/qualia-scope` will grow it inline as decisions crystallize during phase planning.

### Step 8b. Write PRODUCT.md (REQUIRED)

`PRODUCT.md` is the "who and why" every road agent reads before designing or building. It is **required** — the planner, builder, and verifier all load it as substrate.

Ask the user 5 short questions (one at a time, each with a sensible default they can `[Enter]` past):

1. **Register** — "Is this design IS the product (marketing/landing/portfolio → `brand`) or design SERVES the product (app/admin/dashboard → `product`)?" Default: infer from project type.
2. **Three users** — "Name 3 specific humans who will use this. Not personas — real names + their workflow scenario." Default: project type defaults.
3. **Brand voice** — "Three adjectives, then one paragraph showing the voice in motion (an error message, a confirmation, an empty state)." Default: derive from PROJECT.md.
4. **Anti-references** — "Three sites this should NOT look like, with why." Required, no defaults — anti-references are more useful than positive references.
5. **One-sentence differentiation** — "What does someone remember 24 hours after first using this?" Required.

Write `.planning/PRODUCT.md` from `templates/PRODUCT.md`, filling the user's answers.

```bash
git add .planning/PRODUCT.md
git commit -m "docs: PRODUCT.md — register, users, voice, anti-references"
```

### Step 9. Create config.json

```json
{
  "mode": "interactive",
  "depth": "standard",
  "template_type": "{detected or null}",
  "stack_id": "{landing-page | full-app | ai-agent | internal-tool}",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

`stack_id` is the preset chosen at Step 5a. It tells `/qualia-doctor` which env contract to expect and `/qualia-verify` which per-stack Definition-of-Done to load.

**Note:** `workflow.research` is always `true`. It exists for telemetry but is no longer read as a gate.

### Step 10. Create DESIGN.md (frontend projects — OKLCH-first)

If frontend work is involved, generate `.planning/DESIGN.md` from `templates/DESIGN.md`. The generation MUST commit to four things upfront (these go in §1 of DESIGN.md):

1. **Aesthetic direction** — pick ONE: `editorial · brutalist · luxury · maximalist · retro-futuristic · organic · terminal-native · sci-fi · pastoral · industrial · ...`. Don't hedge ("modern minimal" is hedging — pick one extreme).
2. **Color strategy** — pick ONE: `Restrained · Committed · Full palette · Drenched`. See `qualia-design/design-laws.md` §2.
3. **Scene sentence** — one concrete sentence: who uses this, where, ambient light, mood. NOT "observability dashboard" — "SRE glancing at incident severity on a 27-inch monitor at 2am in a dim room." Run the sentence, not the category.
4. **Differentiation** — one sentence: what someone remembers 24 hours later.

Then fill the rest of DESIGN.md:
- §2 Color: OKLCH only, no `#000`/`#fff`, neutrals tinted toward brand hue (chroma 0.005-0.015), accent within the chosen strategy
- §3 Typography: distinctive display + refined body pair. **NEVER** Inter, Roboto, Arial, Helvetica, system-ui, Space Grotesk
- §4 Spacing: 8px grid + fluid `clamp()` for page padding
- §5 Components: token-driven button/input/card/table specs
- §6 Depth: 3-level shadow elevation, OKLCH-tinted (not gray)
- §7 Motion: easing tokens (ease-out-quart/expo), no bounce, `prefers-reduced-motion` respected
- §8 Iconography: ONE family
- §9 Responsive: mobile-first
- §10 Anti-pattern checklist (the auto-runnable one)

Cross-check the result against `qualia-design/design-laws.md` §8 absolute bans BEFORE writing — the design must not propose any banned pattern.

**Per-client token registry (R10).** Compile DESIGN.md §2/§3/§4 into a CSS-variable
registry so every builder inherits the real design system instead of inventing
one (and the `ABS-HEX-IN-JSX` ban has a target to point at):

```bash
node C:\Users\hasan\.claude/bin/design-tokens.js init --out .planning/design-tokens.json   # starter; edit to the client's brand
node C:\Users\hasan\.claude/bin/design-tokens.js compile .planning/design-tokens.json --out app/styles/tokens.css
```

`design-tokens.json` is the registry source of truth; `tokens.css` is the
generated artifact the scaffold imports. Builders reference `var(--color-…)` /
`var(--font-…)`, never a literal hex. Per `design-dials.md`, a client brand
registry caps DESIGN_VARIANCE at LOW for color/type. See `design-reference.md`.

```bash
git add .planning/DESIGN.md .planning/config.json
git commit -m "docs: DESIGN.md — direction commit + OKLCH palette + tokens"
```

### Step 11. Run Research (ALWAYS, no permission ask)

**In v4, research runs unconditionally.** The previous `workflow.research` gate is gone. Skipping research leads to generic roadmaps and surprises late in the project — the 4-agent cost is worth it.

Only `/qualia-new --quick` skips this step.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner research
mkdir -p .planning/research
```

**Research scope branches on `PROJECT_TYPE`:**

- **Demo** (`PROJECT_TYPE=demo`): pass `<scope>quick</scope>` to all 4 researchers AND the synthesizer. Each researcher gets a 3-call budget instead of 8. The synthesizer produces a single-milestone suggestion (no Handoff, no multi-milestone arc). Total research time drops roughly 3x with no loss of correctness on the demo path — the depth was wasted when there's only one milestone to ship.
- **Full project** (`PROJECT_TYPE=full`): standard scope, 8-call budget per researcher, full milestone-arc synthesis.

Say: **"Running 4 parallel research agents (stack, features, architecture, pitfalls)..."** (demo: append "— quick scope").

Spawn 4 researchers in parallel (single message, 4 Agent tool calls). See REFERENCE.md section "Researcher prompts (4 dimensions)" for the verbatim prompt templates. Include `<scope>quick</scope>` in each prompt when `PROJECT_TYPE=demo`.

**After all 4 complete, spawn synthesizer.** See REFERENCE.md section "Synthesizer prompt" for the verbatim prompt template. Include `<scope>quick</scope>` when `PROJECT_TYPE=demo`.

**Commit:**
```bash
git add .planning/research/
git commit -m "docs: research synthesis (4 dimensions, multi-milestone scope)"
```

Show key findings:
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Research complete"
```
Display top 3 from SUMMARY.md (stack recommendation, table stakes, top pitfall).

### Step 12. Feature Scoping (Multi-Milestone)

Read `.planning/research/FEATURES.md` and present the feature landscape. Features are scoped **to milestones** — you'll decide per-feature which milestone owns it.

For each category, use AskUserQuestion:

- header: "{Category name}"
- question: "Which {category} features are part of THIS project (the full agreed scope)? Anything selected must land in a milestone — the arc is sized to fit, no cap."
- multiSelect: true
- options: each feature from FEATURES.md + "None of these"

Track selections:
- Selected → in scope (roadmapper assigns each to a specific milestone by dependency order; the arc grows to cover all of them)
- Unselected → only goes to Post-Handoff/Out-of-Scope if the user EXPLICITLY defers it (matches discovery §8). Don't silently drop a table-stakes feature into v2 to keep the arc short.
- Unselected differentiators → Out of Scope

Gather any additional requirements the user wants that research missed.

### Step 13. Run Roadmapper

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner roadmap
```

**Roadmapper output branches on `PROJECT_TYPE`:**

- **Demo** (`PROJECT_TYPE=demo`): roadmapper produces a 1-milestone JOURNEY.md (the demo milestone, 2-4 phases) plus a matching REQUIREMENTS.md and a fully-detailed ROADMAP.md. No "Handoff" milestone is appended — the demo is its own complete artifact. The journey-tree at Step 15 shows a single rung; the "extend to full project" branch is handled later by `/qualia-milestone` if the client signs.
- **Full project** (`PROJECT_TYPE=full`): roadmapper produces the full milestone arc ending in Handoff (client projects), sized to cover the entire capability inventory from discovery §9 — no fixed milestone count. Milestone 1 fully detailed, M2..M{N-1} sketched (unless `--full-detail`).

Spawn the roadmapper with `<project_type>$PROJECT_TYPE</project_type>` in the prompt. If the user passed `--full-detail`, include `<full_detail>true</full_detail>` so the roadmapper writes complete phase detail for ALL milestones (full project only; demo always has full detail because there's only one milestone). See REFERENCE.md section "Roadmapper prompt" for the verbatim prompt template.

### Step 14. Coverage gate (before presenting — the genesis teeth)

Before showing the journey, verify the arc actually covers the whole agreed scope. This is what stops the framework from generating "milestones that don't finish the project."

1. Read the capability inventory: `.planning/project-discovery.md` §9 (full projects).
2. Read `.planning/REQUIREMENTS.md` traceability.
3. Confirm **every §9 capability has a REQ-ID mapped to a milestone** (Unmapped = 0), and the only items in `Post-Handoff (v2)` / `Out of Scope` are the ones the client explicitly deferred in §8.

If any §9 capability is unmapped, or agreed work was pushed to v2 to shorten the arc → **do NOT present for approval.** Re-spawn the roadmapper with the gap list and instruction to extend the arc until coverage is complete. Only proceed to the ladder when coverage is 100%.

(Demo projects skip this — they're a single milestone with no §9 inventory.)

### Step 15. Present the Journey (single view)

Render the branded journey ladder:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js journey-tree .planning/JOURNEY.md
```

This shows M1..M{N} as a vertical ladder: shipped milestones get a green dot, current gets a teal diamond with `[CURRENT]` tag, future get dim open circles. Handoff gets `[FINAL]` tag. Why-now + phase sketch render under current and final.

Also narrate the one-glance summary. See REFERENCE.md section "Journey ladder format" for the ASCII template.

### Step 16. Approval Gate (single — for the whole journey)

- header: "Journey"
- question: "Does this journey work for you?"
- options:
  - "Approve" — commit the full journey and continue
  - "Adjust" — tell me what to change (milestones, phases, exit criteria, scope)
  - "Review full JOURNEY.md" — show the raw file

**If "Adjust":** capture feedback, re-spawn roadmapper with revision context, re-present. Loop until approved.

**If "Review full JOURNEY.md":** `cat .planning/JOURNEY.md`, then re-ask.

**If "Approve":**

```bash
git add .planning/JOURNEY.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md
git commit -m "docs: journey + requirements + milestone 1 roadmap ({N} milestones)"
```

**After approval, show the progressive-detail reminder explicitly:**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Milestone 1 is fully planned now."
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Milestones 2..{N-1} are sketched (names + one-line goals)."
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Full phase detail for each later milestone gets written when /qualia-milestone opens it."
```

(Skip this block when `--full-detail` was used — all milestones are already fully planned in that case.)

### Step 17. Environment Setup

Supabase project? `supabase link` or create. Vercel project? `vercel link`. Env vars? `.env.local` with placeholders from PROJECT.md stack.

Skip if user says "I'll handle env myself."

```bash
git add .gitignore
git commit -m "chore: environment setup" 2>/dev/null
```

### Step 18. Auto-Apply Gate (or stop here)

If invoked with `--auto`, skip straight into building Milestone 1:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Auto mode — chaining into /qualia-plan 1"
```

Then inline-invoke `/qualia-plan 1`. That skill will chain into `/qualia-build 1 → /qualia-verify 1 → /qualia-plan 2 → ...` until Milestone 1's last phase verifies, at which point the chain pauses at the milestone boundary and asks:

- header: "Milestone 1 shipped"
- question: "Continue to Milestone 2 ({next milestone name})?"
- options: ["Continue", "Pause here"]

**Without `--auto`**, end with a clear pointer:

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "JOURNEY READY" "/qualia-plan 1"
```

Show summary:

```
⬢ PROJECT INITIALIZED

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | .planning/PROJECT.md        |
| Glossary       | .planning/CONTEXT.md        |
| Decisions      | .planning/decisions/        |
| Product        | .planning/PRODUCT.md        |
| Journey        | .planning/JOURNEY.md        |
| Requirements   | .planning/REQUIREMENTS.md   |
| Roadmap (M1)   | .planning/ROADMAP.md        |
| Design         | .planning/DESIGN.md         |
| Research       | .planning/research/         |
| State          | .planning/STATE.md          |
| Config         | .planning/config.json       |

{N} milestones | {X} requirements | Ready to build Milestone 1: {name}

▶ Next: /qualia-plan 1
(or rerun with /qualia-new --auto to chain through automatically)
```

## --quick Flag (Fast Path, Unchanged)

`/qualia-new --quick` still runs the 4-phase flat wizard for trivial projects (landing pages with 1-2 sections, throwaway prototypes). Creates PROJECT.md + a simplified ROADMAP.md + DESIGN.md + STATE.md. No JOURNEY.md, no research, no multi-milestone. Routes to `/qualia-plan 1`.

Do NOT use `--quick` for: client projects, anything with compliance stakes, anything longer than one week.

## Rules

1. **Project type is the first question, period.** Step 1 (Demo / Full / Quick) is the literal first interaction with the user — even before "what are you building". Every downstream step branches on the answer. Don't skip it, don't infer it, don't ask anything before it.
1a. **One stack question, then a real scaffold.** Step 5a asks exactly ONE stack-preset question (`landing-page` / `full-app` / `ai-agent` / `internal-tool`) and then instantiates it: copies `scaffold/` into the project (never clobbering existing files), copies `env.required.json` → `.planning/env.required.json`, and copies `phases.md` → `.planning/phases.md`. The project starts from a runnable skeleton, not an empty folder. Skip this step on `--quick`. Record the choice as `config.json.stack_id`.
2. **AskUserQuestion for every discrete-choice question.** Project type, brownfield gate, design vibe, client type, approval gate, auto-chain — all use the interactive UI. The ONLY free-text question in the kickoff flow is the Step 3 one-line pitch. No plain-text prompts for anything that has a closed set of answers.
3. **No ad-hoc clarification questioning.** After Step 3 (one-line pitch), the next tool call is `/qualia-scope`. No "let me ask a few quick things first", no "that's too broad, can you clarify". Depth is the scope skill's job — not yours.
4. **Discovery interview is mandatory.** Step 4 always invokes `/qualia-scope` in PROJECT MODE. No free-form questioning loop, no "I'll just sketch PROJECT.md from the user's first message." The interview is 8 questions for demo, 15 for full project.
5. **Research runs automatically.** No permission ask. Only `--quick` skips it. Demo path uses `<scope>quick</scope>` (3-call budget per researcher); full project uses standard 8-call budget.
6. **Demo design philosophy is non-negotiable.** Real backend always (Supabase, real auth), DESIGN.md mandatory, slop-detect hard-block, 1 milestone, focus on real agent/platform functionality + design quality. No mock data, no lorem ipsum, no broken flows. Speed comes from skipping multi-milestone planning, never from skipping design quality, mocking the backend, or cutting corners on the core flow. A demo that uses mock data is not a Qualia demo.
7. **Demos are 1 milestone; full projects are 2+ (as many as the agreed scope needs — no cap).** Demo journeys have no "Handoff" — the demo IS the artifact. Full client projects end in Handoff (fixed 4 phases); internal/ongoing products may end at their done-state milestone. The journey-tree adapts to any length. A full project's arc must cover every capability from discovery §9 — never trimmed to hit a milestone count.
8. **The full-project journey includes Handoff.** Every full project's final milestone is literally named "Handoff" with 4 standard phases. The roadmapper enforces this.
9. **Single approval gate.** One gate for the whole journey. Not per-milestone, not per-phase.
10. **Milestone 1 is fully detailed (full projects).** M2..M{N-1} are sketched. Detail fills in when each milestone opens. Demos are always fully detailed because they're 1 milestone.
11. **STATE.md through state.js.** Never edit STATE.md or tracking.json by hand.
12. **Inline skill invocation.** When Step 2 offers `/qualia-map` or Step 4 invokes `/qualia-scope`, invoke it inline — don't exit.
13. **CONTEXT.md is mandatory.** Every project gets a domain glossary at `.planning/CONTEXT.md`. Seeded from the discovery interview answers. Loaded by every road agent. Kept terse.
14. **ADRs are scarce.** `.planning/decisions/` exists from day one but only fills with hard-to-reverse, surprising-without-context, real-tradeoff decisions. Cargo-culting ADRs ruins the signal.
