---
name: qualia-idk
description: "Deep diagnostic for 'I don't know what's going on.' Reads conversation context + the planning folder + the codebase in three isolated scans, cross-references against the user's confusion, then returns plain-language guidance PLUS a paste-ready Qualia command sequence to unstick them. Use whenever the user says 'I don't know', 'something feels off', 'not sure what to do', 'am I doing this right', 'what's happening', 'help me understand', 'where am I', 'lost'."
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Agent
---

# /qualia-idk — "I Don't Know What's Going On"

Not a router. A **diagnostician**. Use when the user isn't stuck on a single command — they're stuck on **understanding the situation**. Returns guidance + a Qualia command sequence the user can paste.

## How This Differs from `/qualia`

| `/qualia` | `/qualia-idk` |
|---|---|
| Mechanical: reads state.js, returns one `/qualia-X` | Interpretive: reads conversation + planning + code |
| "What's my next command?" | "What is happening, and what sequence gets me unstuck?" |
| Always returns a skill name | Returns plain-language guidance + a multi-command sequence |
| Cheap, instant (~2s) | Three parallel scans, ~30–45s |

Run `/qualia` when the user knows what they're trying to do. Run `/qualia-idk` when the user's confusion is about **the situation itself** — scope, drift, or where to even begin.

## Process

### Step 0. Banner

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner router
node C:\Users\hasan\.claude/bin/qualia-ui.js spawn "diagnostic" "Reading conversation, planning, and codebase in isolation..."
```

Say: **"Let me take a proper look."**

### Step 1. Capture the User's Confusion

Look at the recent conversation. Note:
- What did the user just say or ask?
- Any recent errors, failed commands, surprising output?
- Any mismatch between what they expected and what happened?
- Sentiment cues: "lost", "stuck", "weird", "broken", "where am I" — record verbatim.

If conversation context is thin, ask:
- header: "What's unclear?"
- question: "Where are you stuck? (one sentence is fine)"
- Free text.

Store as `<user_confusion>`.

### Step 2. Capture Session Context (local, fast)

Before spawning scans, gather cheap session signals:

```bash
# Where is the user right now?
test -f .continue-here.md && head -30 .continue-here.md
test -f .planning/STATE.md && head -20 .planning/STATE.md
git log --oneline -5 2>/dev/null
git status --short 2>/dev/null | head -10

# Recent planning artifacts (mtime tells us what was last touched)
ls -lt .planning/phase-*-*.md 2>/dev/null | head -8
ls -lt .planning/decisions/*.md 2>/dev/null | head -5

# Is there a halt / FAIL we should know about?
grep -l "FAIL\|INSUFFICIENT EVIDENCE\|HALT" .planning/phase-*-verification.md 2>/dev/null
```

Store as `<session_context>`.

### Step 3. Spawn Three Isolated Scans (Parallel)

Three fresh subagents. Each sees ONLY its scope — no cross-contamination. They run in parallel; wait for all three.

**Agent A — Planning View** (broader than v1: now reads CONTEXT, REQUIREMENTS, decisions/, all phase artifacts, not just the latest):

```
Agent(prompt="
You are a read-only diagnostic scanner for the .planning/ folder only.

Read ALL of the following if present:
  - .planning/PROJECT.md
  - .planning/CONTEXT.md (domain glossary)
  - .planning/JOURNEY.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/tracking.json
  - .planning/phase-*-plan.md (ALL, not just latest)
  - .planning/phase-*-verification.md (ALL — flag any FAILs)
  - .planning/phase-*-context.md (from /qualia-scope PHASE MODE, if any)
  - .planning/phase-*-research.md (if any)
  - .planning/DESIGN.md (skim)
  - .planning/decisions/*.md (ADRs — short read)
  - .continue-here.md (if present)

DO NOT read any source code — no src/, app/, components/, lib/, etc.
DO NOT run any build tools.

Produce a 'Plan View' report answering:
  1. What is this project? (one sentence from PROJECT.md)
  2. Where does the plan say we ARE? (current milestone N of M + phase P of Q + status)
  3. What SHOULD be true right now? (current phase's acceptance criteria)
  4. What's UNFINISHED? (upcoming phases / unresolved gaps from latest verification)
  5. Plan-level inconsistencies? (tracking.json vs STATE.md mismatch, JOURNEY.md missing, roadmap drift)
  6. Has any verification FAILED recently? Quote the FAIL summary if so.
  7. Are there hard decisions (ADRs in decisions/) that constrain the next step?

Keep it under 350 words. Be specific. No filler. Quote file:line for anything you assert.
", subagent_type="Explore", description="Plan-view scan")
```

**Agent B — Code View** (unchanged from v1):

```
Agent(prompt="
You are a read-only diagnostic scanner for the source code only.

DO NOT read anything in .planning/ — skip it entirely.

Scan the repo:
  - Package/framework detection (package.json, requirements.txt, etc.)
  - Entry points (app/, src/, pages/, index.*)
  - Key files referenced in recent commits (git log --oneline -5, then inspect)
  - Quick static checks: 'npx tsc --noEmit' output, lint errors, test status
  - Stubs: grep for TODO, FIXME, 'not implemented', empty catch blocks, unused exports
  - Dev server / deploy markers (vercel link, .env.local, supabase project ref)

Produce a 'Code View' report answering:
  1. What does the code LOOK LIKE it's building? (inferred from structure + imports)
  2. What ACTUALLY WORKS right now? (compile status, recent commits, smoke signals)
  3. What's STUBBED / INCOMPLETE? (concrete file:line citations)
  4. What's RUNNING locally or deployed?
  5. Code-level inconsistencies? (imports that don't resolve, routes referenced but not defined)

Under 300 words. Cite file:line. No filler.
", subagent_type="Explore", description="Code-view scan")
```

**Agent C — Conversation & Memory View** (new in v2):

```
Agent(prompt="
You are a read-only diagnostic scanner for the user's recent activity. Do NOT read .planning/ or source code.

Read:
  - C:\Users\hasan\.claude/knowledge/daily-log/<latest 1-2 dates>.md (recent session entries)
  - C:\Users\hasan\.claude/knowledge/concepts/<files referenced by the user's confusion>
  - .continue-here.md (if present)
  - git log --since='3 days ago' --oneline
  - git diff main...HEAD --stat (work in flight)

Cross-reference against the user's stated confusion: ${user_confusion}

Produce a 'Session View' report answering:
  1. What has the user been doing recently? (1-3 bullets from daily log + git)
  2. Is the user's CURRENT confusion consistent with their recent activity, or is there a discontinuity? (e.g. they were in M2-P3 yesterday but today they're asking about M3 setup)
  3. Are there saved learnings or ADRs that directly answer the user's confusion?
  4. Was there a recent halt, FAIL, or pause we should foreground?

Under 250 words. Quote daily-log line numbers or commit SHAs.
", subagent_type="Explore", description="Session-view scan")
```

### Step 4. Synthesize — Diagnosis + Command Sequence

With all three reports + `<user_confusion>` + `<session_context>` in hand, produce **exactly this shape**:

```markdown
## What I see

**The plan says:** {1-2 sentences — current milestone/phase/status, what should be true}

**The code says:** {1-2 sentences — what actually exists, what works, what's stubbed}

**Your recent activity:** {1-2 sentences — last 2-3 days of work in flight, last commit, last skill run}

**The mismatch (if any):** {1-2 sentences — where plan / code / activity disagree. If consistent, say "all three views align".}

## What I think is happening

{3-5 sentences, plain language. Tie the user's confusion to what you found. No jargon. If the user said "the login is broken", don't say "the auth middleware has a type inference issue" — say "you're seeing the login fail because the signin function isn't actually imported into the login page, even though phase-2-plan.md says it should be. Someone wrote the helper but forgot to wire it up — that's why verification went FAIL yesterday."}

## What to do next — paste-ready command sequence

```
{command 1}      # {one-line reason}
{command 2}      # {one-line reason}
{command 3}      # {one-line reason}
```

{One sentence on what this sequence accomplishes end-to-end.}

## Or, if you'd rather hand-pick:

1. **{action}** — {why}
2. **{action}** — {why}
3. **{optional}** — {why}
```

**Command-sequence picking rules** — choose from these established patterns:

| Situation found | Sequence |
|---|---|
| Plan says built but code has stubs | `/qualia-plan {N} --gaps` → `/qualia-build` → `/qualia-verify` |
| Verify FAILed and no postmortem ran | `/qualia-postmortem` → `/qualia-plan {N} --gaps` → `/qualia-build` |
| Stale `.continue-here.md`, ongoing context | `/qualia` (restores from `.continue-here.md` / STATE.md) |
| Brownfield drift (plan and code diverged hard) | `/qualia-map` → `/qualia-plan {N} --gaps` |
| Phase context missing (no `/qualia-scope` ran) | `/qualia-scope {N}` → `/qualia-plan {N}` |
| Specific error, scope clear | `/qualia-fix '<symptom>'` |
| Performance feels off, no profile | `/qualia-fix --perf '<route>'` or `/qualia-optimize --perf` |
| Design feels off | `/qualia-polish --critique` then `/qualia-polish` |
| User is overwhelmed | `/qualia-handoff` (save handoff), come back later |
| Truly nothing actionable found | Ask one specific question; don't invent a sequence |

Pick the sequence that fits the actual evidence. Substitute real `{N}` from the Plan-view scan.

### Step 5. Close

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js end "DIAGNOSED" "{first command in the sequence, if any}"
```

## Rules

1. **Three isolated scans, always.** Plan view never peeks at code or session. Code view never peeks at planning. Session view never peeks at code. This is what keeps the diagnosis honest — each agent sees one slice, the synthesis catches the delta.
2. **Plain language over jargon.** If you can't explain it to a non-dev, rewrite it.
3. **No fake certainty.** If the scans come back thin (brand-new repo, no planning artifacts yet), say so explicitly: "I don't have enough signal yet — here's what I'd do to gather more."
4. **Never invent facts.** If a scan didn't find something, don't claim it. Cite files.
5. **Command sequence > single recommendation.** The user came here because one command isn't enough. Give them a chain.
6. **The sequence must be paste-ready.** Real `{N}` values, real route names, no `<placeholder>` text outside the optional "if you'd rather hand-pick" section.
7. **Don't re-run if `/qualia` already knows.** If the user's confusion is purely "what's my next command", `/qualia` handles it cheaper — gently suggest it and stop.

## When NOT to Use

- User knows what they're doing and just wants the next command → `/qualia`
- User has a specific error message they want fixed → `/qualia-fix '<symptom>'`
- User wants to review code quality → `/qualia-review`
- User wants to pause and come back → `/qualia-handoff`

`/qualia-idk` is specifically for **"I'm not sure what I'm even looking at"** situations. Route to sharper tools when the question is sharper.
