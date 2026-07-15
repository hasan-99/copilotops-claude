---
name: qualia-verify
description: "Goal-backward verification of a built phase — a parallel verifier PANEL (one lens each) greps code against acceptance criteria, per-finding adversarial skeptics vote majority-survives, and verify-panel.js aggregates a deterministic verdict. Triggers: 'verify this phase', 'check if it works', 'run verification', 'did the build pass'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# /qualia-verify — Verify a Phase

Spawn verifier to check phase goal. Does NOT trust build summaries; greps codebase.

## Usage
`/qualia-verify` — verify current built phase
`/qualia-verify {N}` — verify specific phase
`/qualia-verify {N} --auto` — verify + auto-chain: PASS → next phase/milestone; FAIL → gap closure; gap limit → halt
`/qualia-verify {N} --adversarial` — deepen the panel: 5 skeptics per finding instead of 3. Recommended for high-stakes phases (Handoff, payment/auth/migration).

## Process

### 1. Load Context

```bash
echo "---PLAN---"
cat .planning/phase-{N}-plan.md 2>/dev/null
echo "---CONTRACT---"
cat .planning/phase-{N}-contract.json 2>/dev/null || echo "NO_JSON_CONTRACT"
echo "---PREVIOUS---"
cat .planning/phase-{N}-verification.md 2>/dev/null || echo "NONE"
```

### 2. Run Machine Contract First

If `.planning/phase-{N}-contract.json` exists, run:

```bash
node C:\Users\hasan\.claude/bin/contract-runner.js .planning/phase-{N}-contract.json
```

If it fails, the phase cannot PASS. Still spawn the verifier to explain the failure and identify the smallest gap-closure tasks. If it passes, pass the evidence file into the verifier prompt.

### 3. Spawn Verifier Panel (parallel lenses, fresh context each)

A single LLM judge is adversarially fragile (a lone stray token flips ~35% of verdicts). Replace single-pass review with a **panel**: one verifier per *relevant* lens, spawned in parallel (separate `Agent()` calls in the SAME turn), each scoped to one concern and anchored on the SAME machine evidence (contract-run + harness-eval) as shared ground truth.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner verify {N} "{phase name}"
```

Pick lenses by what the phase touches (scale cost to risk — don't run all four on a one-file change):
- **correctness** — always.
- **security** — if the plan touches `auth|payment|rls|service_role|migration|secret|upload`.
- **performance** — if it touches data fetching, network-in-loop, large lists, or `--perf` is set.
- **design** — if it touches `.tsx/.jsx/.css/.scss` or `app/|components/|pages/`.

For each chosen lens `L`, spawn (all in one turn, then wait for all):

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/verifier.md

LENS: {L}. Review ONLY through the {L} lens — concerns owned by other lenses have their own reviewer; do not duplicate them.

Project: @.planning/PROJECT.md
Plan + AC + validation: @.planning/phase-{N}-plan.md
Machine contract: @.planning/phase-{N}-contract.json
Contract evidence (shared ground truth — do not re-derive): @.planning/evidence/phase-{N}-contract-run.json
{Re-verify → previous gaps: @.planning/phase-{N}-verification.md}

Verify the {L} concerns of this phase. Every finding needs file:line evidence and a Severity Rubric label.
Write your findings as a JSON array to .planning/phase-{N}-panel-{L}.json:
  [{\"file\":\"path\",\"line\":N,\"severity\":\"CRITICAL|HIGH|MEDIUM|LOW\",\"title\":\"one-line claim\"}]
Empty array [] if the {L} lens is clean. Also append a human '## {L} lens' section to .planning/phase-{N}-verification.md.
", subagent_type="qualia-verifier", description="Verify phase {N} — {L} lens")
```

### 3b. Browser QA (if phase touched frontend)

If plan Files include `.tsx`/`.jsx`/`.css`/`.scss` or `app/`/`pages/`/`components/` paths, spawn browser QA parallel:

```bash
# Detect frontend touch
grep -l "\.tsx\|\.jsx\|\.css\|app/\|components/\|pages/" .planning/phase-{N}-plan.md && FRONTEND=true
```

If frontend:

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/qa-browser.md

Plan: @.planning/phase-{N}-plan.md
Verification: @.planning/phase-{N}-verification.md

Drive dev server, test routes phase touched. Append '## Browser QA' to verification file.
", subagent_type="qualia-qa-browser", description="Browser QA phase {N}")
```

Wait for both verifier + QA before step 3. Playwright MCP unavailable → QA returns BLOCKED (note, not phase failure).

### 3c. Skeptic Pass + Deterministic Aggregation

The panel FINDS; skeptics decide what's REAL; `verify-panel.js` decides the verdict — math, not a vibe.

**1. Assemble** the per-lens finding files into one panel skeleton (votes zeroed):

```bash
node C:\Users\hasan\.claude/bin/verify-panel.js assemble {N}   # → .planning/phase-{N}-panel.json
```

**2. Skeptic vote** on each CRITICAL/HIGH finding (MEDIUM/LOW auto-survive — they don't flip the C/H verdict; skipping skeptics on them is the documented cost bound, not a silent cap). For each such finding spawn **3 skeptics** (5 if `--adversarial`, Handoff milestone, or the finding's lens is `security`), each in fresh context, each prompted to REFUTE:

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/verifier.md

SKEPTIC. A panel verifier claims this finding. Try to REFUTE it: is it actually reachable on a real path, or already handled elsewhere, or a false positive? Default to refuted ONLY with evidence — uncertainty is NOT refutation.

Finding: {severity} — {title}
Location: {file}:{line}
Evidence to re-check yourself: @{file}

Return exactly one line: REAL — {file:line reason}   OR   NOT_REAL — {file:line reason}
", subagent_type="qualia-verifier", description="Skeptic {i}/3 — {title}")
```

Tally each finding's votes into `.planning/phase-{N}-panel.json` (`votes.real` / `votes.notReal`).

**3. Aggregate** deterministically:

```bash
node C:\Users\hasan\.claude/bin/verify-panel.js .planning/phase-{N}-panel.json --write
```

`verify-panel.js` dedupes findings across lenses, applies **majority-survives** (a finding is killed only when skeptics are a strict majority calling it not-real; ties and unvoted findings survive), computes category scores via the `rules/grounding.md` formula, and exits **0 = PASS / 1 = FAIL** (any surviving CRITICAL/HIGH → FAIL). That exit code IS the panel verdict — carry it into step 4. Artifacts: `.planning/phase-{N}-verification-panel.{json,md}`.

### 3d. INSUFFICIENT EVIDENCE downgrade (mandatory)

The verifier marks criteria it could not check (budget exhaustion, missing context) as `INSUFFICIENT EVIDENCE`. The orchestrator must treat those as FAIL before declaring PASS. Grep the verification file and downgrade immediately:

```bash
IE_COUNT=$(grep -c "INSUFFICIENT EVIDENCE" .planning/phase-{N}-verification.md 2>/dev/null || echo 0)
if [ "$IE_COUNT" -gt 0 ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js warn "${IE_COUNT} criteria marked INSUFFICIENT EVIDENCE — downgrading verdict to FAIL"
  # Rewrite the verdict line in-place
  sed -i 's/^result: PASS$/result: FAIL/' .planning/phase-{N}-verification.md
  sed -i 's/^## Verdict$/## Verdict\n\n**Downgraded to FAIL:** '"${IE_COUNT}"' criteria left unchecked. Re-run with larger budget (`max(25, tasks*5)` already applied) or simplify the phase plan./' .planning/phase-{N}-verification.md
fi
```

The same check runs across every lens section the panel wrote.

### 3. Present Results

Read verification report. Present:

**PASS:**
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "All {count} criteria passed"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} VERIFIED" "/qualia-plan {N+1}"
```
(Last phase → `/qualia-polish` as next command.)

**FAIL:**
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Passed: {pass_count}"
node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Failed: {fail_count}"
```

Per gap:
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js fail "{gap description}"
```

**Self-healing:** before re-planning gaps, run postmortem so the framework learns from the miss. Writes `.planning/phase-{N}-postmortem.md`. Does NOT auto-apply deltas unless user runs `/qualia-postmortem --apply`.

```
/qualia-postmortem --phase {N}
```

End:
```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} GAPS FOUND" "/qualia-plan {N} --gaps"
```

### 4. Update State

Write the deterministic eval artifact before changing state:

```bash
node C:\Users\hasan\.claude/bin/harness-eval.js --phase {N} --run --write
```

Run the zero-token anti-slop scan as a deterministic gate (same role as `migration-guard`/`branch-guard` — the scanner exits non-zero on CRITICAL design tells). A CRITICAL finding is a verification FAIL, not a soft note:

```bash
node C:\Users\hasan\.claude/bin/slop-detect.mjs --severity=critical
```

The phase is PASS only if ALL of these agree: the panel verdict (§3c `verify-panel.js` exit 0), the harness-eval status, and the anti-slop scan. If any is FAIL/non-zero, mark the phase FAIL. The state machine also refuses PASS when a contract exists but `.planning/evidence/phase-{N}-contract-run.json` is missing/failing, or when the verification report contains `INSUFFICIENT EVIDENCE`.

```bash
node C:\Users\hasan\.claude/bin/state.js transition --to verified --phase {N} --verification {pass|fail} --evidence .planning/evals/harness-eval-*.json
```
PASS + more phases → state.js auto-advances.
FAIL + gap_cycles >= limit → GAP_CYCLE_LIMIT, escalate.
FAIL + gap_cycles < limit → `/qualia-plan {N} --gaps`.
Do NOT edit STATE.md or tracking.json manually; state.js handles both.

**Emit the lifecycle event** (R14 — feeds the ERP live run-tree). Signed, non-blocking, a no-op when ERP is disabled:

```bash
node C:\Users\hasan\.claude/bin/erp-event.js emit {verify_pass|verify_fail} --target project:{project} ${ERP_PROJECT_ID:+--project $ERP_PROJECT_ID}
```

Use `verify_pass` on PASS, `verify_fail` on FAIL. The same emitter serves other lifecycle points — `session_started` (session start), `phase_planned` (`/qualia-plan`), `build_wave_started` (`/qualia-build`) — all optional and queued through `erp-retry.js`, so they never block the session.

Capture new state for auto-chain routing:

```bash
NEW_STATE=$(node C:\Users\hasan\.claude/bin/state.js check)
# Parse: .phase, .total_phases, .status, .verification
# Read .planning/JOURNEY.md to check if last phase of milestone
```

### 4b. Route (auto-chain aware)

**`--auto` mode** router decides next step based on result + journey position:

| Result | Journey position | Action |
|---|---|---|
| PASS | More phases in milestone | `/qualia-plan {N+1} --auto` |
| PASS | Last phase of milestone (not Handoff) | `/qualia-milestone --auto` |
| PASS | Last phase of Handoff | `/qualia-ship` → `/qualia-handoff` → `/qualia-report` |
| FAIL | gap_cycles < limit | `/qualia-plan {N} --gaps --auto` |
| FAIL | gap_cycles >= limit | **HALT** — escalation, require human |

Last phase: verified phase == total from JOURNEY.md.
Handoff: milestone name == "Handoff" AND last phase.

**Halt (gap cycle limit):**

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Phase {N} failed verification {cycles} times -- gap limit reached"
node C:\Users\hasan\.claude/bin/qualia-ui.js warn "Human intervention required. Options:"
echo "  1. Re-plan from scratch: /qualia-plan {N}"
echo "  2. Adjust roadmap (scope wrong)"
echo "  3. Escalate to Fawzi (EMPLOYEE role)"
```

**Guided mode:**

```bash
# PASS (or "/qualia-milestone" if last phase, "/qualia-polish" if overall last)
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} VERIFIED" "/qualia-plan {N+1}"
# FAIL
node C:\Users\hasan\.claude/bin/qualia-ui.js end "PHASE {N} GAPS FOUND" "/qualia-plan {N} --gaps"
```

### 5. Passive Knowledge Capture (on FAIL)

On FAIL, after showing gaps:

> *"Any recurring issue worth saving to common-fixes.md? (yes / no / which ones)"*

Yes → spawn `/qualia-learn` with type=`fix` per flagged gap. Do NOT auto-save every failure; only user-flagged.
