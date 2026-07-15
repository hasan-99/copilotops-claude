# Changelog

All notable changes to the Qualia Framework are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Note: git tags for historical versions were not retained; commit references are approximate
> and dates reflect commit history rather than npm publish timestamps.

## [7.0.1] - 2026-06-22 (/qualia-recall is OWNER-only)

### Changed — `/qualia-recall` restricted to OWNER
- `recall.js` now resolves the install role up front and **refuses any role other
  than `OWNER`** (exit 3, clear message) — a deterministic gate, not a prose note.
  Previously the command was available to everyone and only the *vault content*
  was role-filtered. Employees keep `/qualia-learn` (write side) and the read-only
  memory MCP for ALL_ROLES wiki content; the curated cross-project recall is the
  OWNER's surface. Skill description + body mark it OWNER-only; the employee
  manual drops it from the command reference. `tests/recall.test.sh` now asserts
  OWNER→allowed, EMPLOYEE/MANAGER/unknown→refused (20 cases). All 24 suites green.

## [7.0.0] - 2026-06-22 (v7 — the restructure is complete)

The v7 milestone release. The 6.12→6.29 line landed the whole v7 restructure
brief; this marks it shipped. Highlights across the arc:

- **v7.0 lifecycle** — build→operate, forced-handoff removed; the three missing
  runtime primitives wired as deterministic gates: R1 file-disjointness pre-write
  hook, R2 `.agent-status` fan-in barrier, R3 cross-artifact `/analyze` gate.
- **v7.1 memory** — `/qualia-recall` (read side of `/qualia-learn`), a single
  shared vault access-control module honoring `wiki/_meta/access.md` (enforced by
  both recall and the read-only memory MCP), and `bin/repo-map.js` (R18).
- **v7.2 verification** — the framework's OWN test surface is now gated in CI
  (R6: `runner.js` joined `npm test`); R7 `/qualia-eval`, R8 verifier panel, R19
  voice DoD confirmed.
- **v7.3 codex-adapter** — CLAUDE.md + AGENTS.md from one source (R4); every
  runtime-behavior branch routed through `host-adapters.js` (R5).
- **Design + scale** — tunable design dials + ban→do-instead pre-flight (R9),
  per-client token registry (R10), `/qualia-build --batch` migration lane (R20).
- **ERP event integration (R14/R12)** — one signed, append-only `framework_events`
  log: the framework signs and emits lifecycle events; the ERP verifies (HMAC
  byte-matched across repos) and renders a live run-tree. Live in production.

Test surface at release: 24 shell suites + 179 cross-platform node tests, both
gated by `npm test`. No functional change in this bump — it tags the milestone.

## [6.29.0] - 2026-06-22 (R14 client — the framework now emits signed events to the ERP)

The ERP side of R14 (the `framework_events` table + `/api/v1/events` +
`/api/v1/policy-events`) shipped in the `qualia-erp` repo and is live in
production. This is the framework EMIT side that closes the loop.

### Added — `bin/erp-event.js`: signed lifecycle-event emitter
- Builds a `FrameworkEvent` envelope and queues it for `POST /api/v1/events`.
  HMAC-SHA256 keyed by the install's `qlt_` token over `${id}.${timestamp}.${body}`
  — **byte-identical** to the ERP's `lib/framework-events.ts` verifier (tested as
  a cross-repo contract), so signatures verify with no extra secret. Headers
  carry id/timestamp/signature (Standard-Webhooks shape); the event is the body.
- Non-blocking + graceful: ERP disabled or no API key ⇒ silent no-op; unsigned
  posts still authenticate via Bearer (recorded `signature_valid=false`).
  `emit <action> [--target type:ref] [--project uuid] [--meta k=v] [--json]
  [--dry-run]`, plus an `emitEvent()` export for in-process callers.

### Changed
- `bin/erp-retry.js`: the retry queue now carries optional per-item `headers`
  (so the signed-event envelope rides the existing idempotent retry rails);
  Auth/Content-* stay framework-owned and non-overridable.
- `/qualia-verify`: emits `verify_pass` / `verify_fail` after the state
  transition — the first live lifecycle signal into the ERP run-tree. Other
  points (`session_started`, `phase_planned`, `build_wave_started`) documented.
- `docs/erp-contract.md`: new "POST /api/v1/events" section (envelope, headers,
  signing).
- `tests/erp-event.test.sh` (14 cases incl. the cross-repo signature match);
  run-all now **24 suites**, all green (+179 node).

## [6.28.0] - 2026-06-22 (R20 — the migration lane for /qualia-build)

### Added — `bin/batch-plan.js` + `/qualia-build --batch`
- The wave model fits a phase; it doesn't fit a 50–500-file codemod. `--batch` is
  a map-reduce over a flat file list: `batch-plan.js` splits it into
  FILE-DISJOINT batches (each a worktree-isolated worker with tiny context that
  opens its own commit) grouped into concurrency-capped waves, fanned in through
  ONE staging branch. Deterministic split (dedup, complete, disjoint, waves ≤
  max-workers); the orchestration lives in the skill.
- `--from FILE`/stdin, `--batch-size`, `--max-workers`, `--staging`, `--json`.
  Zero-dep. `/qualia-build --batch` documents the full orchestration (staging
  branch → per-wave worktree workers → fan-in → test once → ship), including
  "log any dropped batch — no silent partial migrations."
- `tests/batch-plan.test.sh` (15); run-all now **23 suites**, all green (+179 node).

## [6.27.0] - 2026-06-22 (R9 + R10 — design dials, ban→do-instead pre-flight, per-client token registry)

Two framework-area design enhancements: steer generation away from slop upfront,
and ground every builder in a real per-client design system.

### Added — R9: tunable design dials + generation-time pre-flight
- `qualia-design/design-dials.md`: DESIGN_VARIANCE / MOTION_INTENSITY /
  VISUAL_DENSITY (LOW|MED|HIGH) with concrete mappings + register/project-type
  gating, plus a ban→do-instead table mirroring slop-detect's rules WITH the
  positive alternative (avoids the pink-elephant backfire). The generation-time
  half of the anti-slop contract; slop-detect remains the post-hoc gate.
- `templates/DESIGN.md` §0 declares the dials; `/qualia-polish` Stage 0 resolves
  them and cites the bans before editing.

### Added — R10: per-client design-token registry
- `bin/design-tokens.js`: compiles a client brand spec (`design-tokens.json`)
  into a CSS-variable registry (`tokens.css`). `/qualia-new` scaffolds it;
  builders reference `var(--…)`, never a literal hex. The shadcn-registry
  pattern — first-party brand data is the escape from design monoculture.
- `tests/design-tokens.test.sh` (14) + the dials contract test in lib.test.sh;
  run-all now **22 suites**, all green (+ 179 node).

## [6.26.0] - 2026-06-22 (R18 — a cheap symbol map for brownfield onboarding)

### Added — `bin/repo-map.js`, wired into `/qualia-map`
- Aider's repo-map idea, in the framework's zero-dep idiom: a deterministic
  symbol map of a codebase (top-level exports/functions/classes/types per file,
  busiest files first) via language-aware regexes for JS/TS, Python, Go, Rust,
  Ruby, Java, PHP. NO tree-sitter native dependency — the brief named tree-sitter
  but that fights the framework's zero-dep posture; regex extraction gets the
  "what's in this repo and where" signal at zero cost.
- `/qualia-map` now runs it BEFORE the mapper agents (`repo-map.json`), so they
  onboard from a structural index instead of reading the tree blind — cheaper,
  better-grounded brownfield scans. `--json`, `--max-files`; skips
  node_modules/dist/.git/etc.; exit 2 on bad dir. Registered in
  runtime-manifest + lib install set; `tests/repo-map.test.sh` (14 cases).
  run-all now **21 suites**.

## [6.25.0] - 2026-06-21 (v7.3 codex-adapter — the last runtime branch moves into the seam)

v7.3 is complete. R4 (emit AGENTS.md alongside CLAUDE.md from one canonical
source) was already shipped via `bin/compile-instructions.js` — both files
compile from `templates/instructions.md` through the host adapter, with a
`--check` drift guard gated by the `instructions` suite. This release finishes R5.

### Changed — R5: agent-CLI invocation is now an adapter fact (no more stray runtime branch)
- `host-adapters.js` was already the real seam (declarative `HOSTS`, per-host
  paths/naming/instruction-file). The one genuine `if (codex)` behavior branch
  still living outside it was in `knowledge-flush.js`: it hardcoded
  `codex`/`claude` as the CLI and `exec`/`-p` as the invocation. Those are
  per-host FACTS — moved into the adapter: `agentCli` + `agentExecPrefix`
  (declarative) → `adapter().agentExec(prompt)` (computed argv), plus
  `hostForHome(home)` so the home→host mapping has one owner.
- `knowledge-flush.js` now asks the adapter instead of branching. When a third
  runtime arrives it's one `HOSTS` entry, not a grep-and-patch. lib.test.sh
  covers the new facts.
- Left intentionally: the `qualiaHome()` install-root idiom repeated across
  bins/hooks treats both hosts IDENTICALLY (it's home resolution, not a behavior
  branch) — sweeping 20 files for a no-op-difference helper is high-risk,
  low-value, and would touch hot paths. Noted, not done.

## [6.24.0] - 2026-06-21 (v7.2 verification — gate the framework's own test surface)

v7.2 verification is complete. R7 (`/qualia-eval` lane), R8 (verify-panel +
adversarial skeptics), and R19 (voice-agent archetype DoD) shipped earlier and
are confirmed green. This release closes R6.

### Fixed — R6: the framework's own checks can no longer silently regress
- The cross-platform `tests/runner.js` harness (179 node:test cases, incl. the
  memory-MCP suite) was **never run by `npm test`** — only the shell suite was.
  That is exactly why it silently drifted to 21 failures: nothing ran it. Now
  `npm test` runs BOTH (`test:shell && test:node`), so CI (`run: npm test`)
  gates the full surface — 20 shell suites + 179 node tests. Added a `test:node`
  script. Verified CI-safe (179/179 with an empty HOME, no install required).
- This is R6's real intent for a deterministic/offline framework: a machine gate
  on the framework's OWN checks. The LLM-prompt-level eval of skills is out of
  scope for offline CI; `/qualia-eval` (R7) already provides that lane for the AI
  artifacts projects build.

## [6.23.0] - 2026-06-21 (v7.1 memory loop — recall, vault access control, harness health)

Completes the v7.1 memory work: the read side now exists, the vault has real
access control, and the cross-platform test harness is green again.

### Added — `/qualia-recall` + `bin/recall.js`: the read side of memory
- Kills the `/qualia-recall` ghost (referenced in `agents/researcher.md` and
  `skills/qualia-research` but never built). `recall.js` unifies BOTH stores in
  one ranked digest: the knowledge layer (delegates to `knowledge.js` so new
  files stay discoverable) + the qualia-memory vault (grep over `wiki/`).
  `--json`, `--scope all|knowledge|vault`, `--max`. Zero deps. Registered in
  `command-surface` ACTIVE_SKILLS + `runtime-manifest`.

### Added — vault access control (`bin/vault-access.js`, `rules/access.md`)
- The vault's `wiki/_meta/access.md` manifest named `/qualia-recall` as an
  enforcer, referenced an enforcing rule at `C:\Users\hasan\.claude/rules/access.md`, and
  expected readers to honor OWNER_ONLY / CONDITIONAL paths — but **none of those
  existed**. Now: `vault-access.js` is the single implementation (parse manifest,
  resolve role, deny non-OWNER reads of OWNER_ONLY/CONDITIONAL paths,
  fail-closed on unknown role); `rules/access.md` is the always-on enforcing
  rule; **both** `recall.js` and the always-on memory MCP enforce it through that
  one module so the security rule can't drift. No-manifest ⇒ no filtering (the
  wiki is curated-by-design; sensitive stores live outside `wiki/`).

### Fixed — test harness health
- `tests/runner.js` (cross-platform node:test harness) had drifted to 154/21;
  re-synced to current bin/hook contracts (MISSING_CONTRACT/evidence,
  SUSPICIOUS_NAME, set-erp-key stdin, branch-guard v6.10 allowed+recorded) with
  no assertions weakened. Now **179**, with the new memory-MCP access cases.
- `tests/recall.test.sh` (18 cases) added; `run-all` now **20 suites**, all green.

### Fixed — vault docs (qualia-memory repo)
- `CLAUDE.md` named a non-existent `flush.py` for session capture (the real
  mechanism is the claude-memory-compiler SessionEnd hook) and carried a stale
  `/home/qualia-new/` path. Corrected. No framework write-back leg was built:
  the vault's session loop is external and already exists; the framework's
  knowledge tier is separate by design.

## [6.22.0] - 2026-06-21 (session continuity + ERP project-sync — built by two parallel worktree agents)

Two independent continuity features, built concurrently in isolated git worktrees and integrated together.

### Added — B1: `/qualia` surfaces the latest session report at session start (`bin/last-report.js`)
- Finds the newest `.planning/reports/report-*.md` (filename date desc, mtime tiebreak) and extracts a tight digest: `{ found, file, date, summary, next, age_days }` — summary from the report's `## What Was Done`, next-step from `## Next Steps`, markdown-flattened and capped. `--json`, `--cwd`, `--now ISO` (deterministic age); exit 0 found / 1 none / 2 bad input.
- Wired into the `/qualia` router "Get State" step: when a project is loaded, the router prints the last-session digest at the TOP of its output, so the operator — or a teammate picking the project up — instantly sees where work was left off. `tests/last-report.test.sh` (28 assertions).

### Added — B2: full project-sync reconciliation payload for the ERP (`bin/project-sync.js`)
- A single deterministic snapshot the ERP can reconcile a whole project from: identity + lifecycle/launched_at, `milestones[]` (closed/current/future + per-milestone REQ-ID completion + phases/tasks/deployed_url), current position, `task_rollup`, `accountability` (offroad), `integration` (the trunk-merge model), and a `schema_version`. **Composes** `project-snapshot.js` (reuses its builders) rather than duplicating or bloating that stable endpoint. `--json`/`--write`/`--pretty`; read-only; graceful on missing JOURNEY/REQUIREMENTS. `tests/project-sync.test.sh` (38 assertions).
- `docs/erp-contract.md`: new "Project Sync Payload" section — every field, the server-side reconciliation steps, and the PR/merge model (branch → main at ship → deploy; main-push accountability). Explicit **Framework-emits vs ERP-backend-ingests** split.
- **Backend remains (out of this repo):** a `POST /api/v1/project-sync` endpoint + server reconciliation (upsert milestones by num, completion from REQ counts, roll up phases/tasks, store offroad, encode the merge model). The framework emits + documents; it does not POST yet (the ERP team mirrors `project-snapshot.js`'s upload plumbing once the endpoint exists).

run-all now 19 suites; both bins in the manifest + install-set; all suites green.

## [6.21.0] - 2026-06-21 (work-unit goals on both runtimes — Codex /goal + the Claude Code equivalent)

Every defined unit of work should declare one objective + one budget, so it stays anchored and the operator sees burn-vs-budget. The framework had this for Codex (`/goal`) but `rules/codex-goal.md` explicitly told Claude Code to "skip — no equivalent surface." Claude Code DOES have an equivalent (the session task-list + turn budget); this wires it up and broadens goal-setting to every work-unit skill.

### Changed — `rules/codex-goal.md` is now a both-runtimes "work-unit goal" rule
- One shared helper (`codex-goal.js {scope}`, via the host-adapter-rendered `C:\Users\hasan\.claude/bin`) produces the objective + token budget from STATE.md/ROADMAP.md.
- **Codex** path unchanged: native `/goal` / `update_goal`.
- **Claude Code** path (new): set the goal via the harness **task-list** (a tracked task titled with the objective, in_progress→completed) + state the budget in the banner. Same discipline — one named objective + budget per unit — native surface on each runtime.

### Changed — goal-setting wired into every work-unit skill
- Existing blocks in `/qualia-plan`, `/qualia-build`, `/qualia-feature` relabeled from "Codex goal (Codex runtime only)" to runtime-neutral **"Set the work-unit goal."**
- Added to `/qualia-fix` (scope `quick`/`feature`) and `/qualia-update` (scope `feature` — it runs its own lean loop without `/qualia-plan`, so it needs its own goal). `/qualia-milestone` deliberately omitted — it routes into `/qualia-plan`, which sets the goal (no double-set).

No bin or schema change; all 17 suites pass.

## [6.20.0] - 2026-06-21 (scope integrity — the roadmap finishes the project, and the team can't drift off it)

The deepest fix this cycle. Teams were drifting off-plan — inventing milestones, building features with no link to the roadmap — and the root cause was upstream: **`/qualia-new` under-scoped the project** (a v1 slice capped at 5 milestones, overflow dumped into an unplanned "v2"), so the agreed work literally wasn't in the arc and the team was *forced* to improvise. Two layers: make genesis cover the whole project, then bind the team to it. (Layer 1 shipped in the prior commit; this entry covers the full feature.)

### Layer 1 — genesis covers the whole project (commit `feat(genesis)`)
- **Interview reworked** (`templates/project-discovery.md`): added §9 **capability inventory** (every capability needed for DONE — the whole thing) + §10 **whole-project definition-of-done**; dropped the old §9 "stop at 3–5 chapters" self-cap. Full path 14 → 15 questions, refocused from brand-vibe to functional completeness.
- **Milestone cap removed** (`agents/roadmapper.md`, `templates/journey.md`, `templates/requirements.md`): the arc spans until the §9 inventory reaches the §10 done-state — as many milestones as needed. `Post-Handoff`/`Out of Scope` holds ONLY explicit client deferrals (§8), never overflow. Handoff optional for internal/ongoing products.
- **Coverage gate** (`/qualia-new` Step 14): genesis refuses to present a journey that leaves any §9 capability unmapped (0 unmapped before the approval ladder).

### Layer 2 — bind the team to the arc (this commit)
- **Milestone close gates on requirements** (`bin/state.js`): new `MILESTONE_REQS_INCOMPLETE` — close refuses (strict) / warns (standard) when a REQ-ID mapped to the milestone in REQUIREMENTS.md isn't `Complete`. Stops "finishing a milestone with scope still open". New `state.js reqs-check [--milestone N]` exposes the same check (exit 0/1) for `/qualia-milestone` to show coverage before closing.
- **Off-road work is recorded, not silent** (`bin/state.js` note path): `transition --to note` gains `--scope in|off --ref {REQ/why}`. Off-road work increments `lifetime.offroad_count` and appends to an `offroad[]` ledger (OWNER + ERP visible), mirroring branch-guard's accountability model.
- **`/qualia-feature` + `/qualia-fix` scope gate**: before building, both check the active milestone. In-scope → proceed, tagged `--scope in`. Off-road → **strict blocks** (route to `/qualia-scope`/`/qualia-milestone` to fold it into the arc) / **standard records** (`--scope off`, counted). The drift vector the user named is now governed at the source.

### Tests
- `tests/state.test.sh`: +5 cases — `reqs-check` (complete/incomplete/milestone-filter/untracked), `--scope off` tally + ledger, `--scope in` no-op, `--force` bypass. 96 state assertions green; all 17 suites pass. (Genesis is prose/templates — validated by the skills + refs suites.)

## [6.19.0] - 2026-06-21 (trunk integration — ship is the merge point, report sweeps)

Fixes a real lifecycle gap + doc drift: **no skill ever integrated feature → main.** Branches/PRs accumulated with nothing closing them; `/qualia-ship` deployed *from the feature branch* and said "never push to main," so production ran branch code while `main` lagged ("main is always deployable" was false in practice); and three sources disagreed on the policy (the hard rule said "through review", `branch-guard` 6.10 said "accountability not block", `infrastructure.md` still claimed PR-review was enforced). This completes the 6.10 "accountability over block" turn into a coherent trunk model.

### Changed — `/qualia-ship` integrates to main, deploys from main, closes the branch
- New §3: commit → fast-forward-integrate the feature branch into `main` (auto-rebase if `main` moved; STOP on conflict) → push. `branch-guard` records the main push (accountability). §4 deploys from `main` HEAD, so the deployed artifact == `main` byte-for-byte. New §4b deletes the integrated branch on a verified deploy. The normal path now leaves **zero lingering branches/PRs**.

### Added — `bin/branch-hygiene.js` + `/qualia-report` sweep (the safety net)
- `branch-hygiene.js`: read-only clock-out sweep — finds local branches with commits **ahead of `main` that were never shipped** (stranded work) and **stale open PRs** (best-effort via `gh`, skipped when absent). Exit 0 clean / 1 found / 2 not-a-repo; `--json`; library `analyze`. Detects `main` or `master` as base.
- `/qualia-report` Step 5b runs it so stranded work surfaces to the employee + OWNER at clock-out instead of rotting.

### Fixed — policy drift now single-voiced
- `rules/infrastructure.md`: the stale "main requires PR reviews (enforced by guards)" line replaced with the real model (integrate-at-ship; main pushes allowed + recorded; report sweeps; keep GitHub branch protection off, or switch ship to an auto-merged PR if you re-enable it).
- Canonical hard rule (`templates/instructions.md` → recompiled `CLAUDE.md`/`AGENTS.md`): "ship through review" → "`/qualia-ship` integrates it to main." Drift guard green.

### Tests
- `tests/branch-hygiene.test.sh` (new, 13 cases): not-a-repo, clean, stranded branch (ahead count + json), ff-merged-no-longer-stranded, `master` base detection, `analyze()` lib. run-all now 17 suites; manifest + `lib.test.sh` install set updated.

## [6.18.0] - 2026-06-21 (v7 kernel, step 8 — R7: /qualia-eval lane for AI features)

Qualia gates UI and code — `contract-runner` proves the code exists, `verify-panel` proves it's correct — but it had **no gate for the AI artifacts a project builds**. "The chatbot answers the refund question" / "the RAG answer is grounded" / "the agent stays under 2s" is not checkable by a grep. R7 adds the equivalent gate, layered: cheap deterministic assertions first, model judgment only where a model is required.

### Added — `bin/eval-runner.js` (layered assertion runner, zero-dependency)
- Runs an eval suite (JSON — no YAML parser pulled in) of cases against captured AI outputs. **Deterministic assertion types** settled with no model: `contains`, `not_contains`, `equals`, `regex`, `not_regex`, `min_length`, `max_length`, `json_valid`, `json_path` (`equals`/`contains`), `max_latency_ms`, `max_cost_usd`. Outputs inline or via `output_file`.
- **`llm_rubric`** is the only model-dependent type — it carries a `verdict` (pass|fail) the skill fills by spawning a judge BEFORE the runner (same pattern `verify-panel` uses for skeptic votes). An unjudged rubric is PENDING and **fails** the suite — never a silent pass. Asserting a latency/cost budget with no metric recorded also fails (no silent pass).
- Exit 0 = all cases pass, 1 = failure/unjudged, 2 = bad input. `--write` emits `.planning/evals/eval-{feature}.json`. Library exports `run`, `runAssertion`, `getPath`.

### Added — `/qualia-eval` skill (new active surface)
- The lane: capture the AI feature's real outputs → spawn one judge per `llm_rubric` (reusing the `qualia-verifier` agent, role-anchored) → `eval-runner.js` settles deterministic assertions + folds in verdicts → gate. Usable standalone (`/qualia-eval suite.json`) or as a phase verify-step gate (`/qualia-eval {N}`), where a FAIL has the same standing as a failing contract. Registered in `command-surface.js` `ACTIVE_SKILLS`.

### Tests
- `tests/eval-runner.test.sh` (new, 19 cases): deterministic pass/fail, latency budget (incl. missing-metric → fail), `json_valid`/`json_path`, `llm_rubric` pass/fail/pending, `output_file` resolution + graceful missing-file, `--write` artifact, `runAssertion`/`getPath` units, malformed→exit 2. run-all now 16 suites; manifest + `lib.test.sh` install set updated; `qualia-eval` passes the skill smoke + refs suites.

## [6.17.0] - 2026-06-21 (v7 kernel, step 7 — R16: dependency-derived wave width + --parallel knob)

`/qualia-build` spawned EVERY task in a contract "wave" concurrently, with no cap — two failure modes at once: over-serialization (the planner's hand-numbered waves can be deeper than the dependency graph requires) and over-parallelization (a wide wave spawns 9 builders past the 3–5 sweet spot where coordination cost overwhelms the gain — the LangGraph `max_concurrency` lesson). R16 replaces orchestrator guesswork with a deterministic scheduler derived from the task DAG.

### Added — `bin/wave-plan.js` (deterministic build scheduler, zero-dependency)
- Recomputes **minimal-depth waves** from `depends_on` (topological levels = maximal safe parallelism), then splits each level into **batches capped at `max_concurrency`**. Output is an ordered `batches[]` the orchestrator spawns one at a time. Same contract + cap → same schedule.
- `max_concurrency`: `--parallel N` → exactly N; **auto** (default) → 1 if <3 tasks ("don't parallelize tiny phases"), else 5.
- Flags **over-serialization** (a task whose declared wave is deeper than the DAG requires — the schedule runs it earlier) and wide-level capping. Cycle in the DAG → exit 1; library exports `deriveLevels`, `resolveConcurrency`, `plan`.

### Changed — `/qualia-build` consumes the derived schedule
- **§2** now runs `wave-plan.js .planning/phase-{N}-contract.json [--parallel K] --json` and spawns the emitted batches in order (not the raw contract `wave` numbers, not all-at-once). New `--parallel K` usage knob.
- **Batch fan-in barrier:** `agent-status.js` (R2) gains a `barrier --tasks T1,T2` mode that gates on an explicit batch (no contract needed) — required because derived waves needn't match the contract's declared wave numbers, so the per-wave barrier would mismatch. The build now barriers per batch, keeping R16 + R2 coherent.

### Tests
- `tests/wave-plan.test.sh` (new, 23 cases): chain/independent/tiny/diamond DAGs, auto vs `--parallel` cap, wide-level batching, over-serialization flag, cycle→exit 1, `deriveLevels`/`resolveConcurrency` units. `tests/agent-status.test.sh` +3 `barrier --tasks` cases. run-all now 15 suites; manifest + `lib.test.sh` install set updated.

## [6.16.0] - 2026-06-21 (v7 kernel, step 6 — R8: verifier panel + adversarial skeptics)

A single LLM judge is adversarially fragile — the literature puts a lone stray token at ~35% false positives, and self-grading bias hides ~70% of findings. `/qualia-verify` was a single cooperative verifier with an optional second pass. R8 replaces it with a **panel** (one verifier per lens) + **per-finding skeptics** (majority-survives), and — crucially — makes the SURVIVE/KILL and PASS/FAIL decision **deterministic math**, not another LLM judgment.

### Added — `bin/verify-panel.js` (deterministic aggregator, zero-dependency)
- **`aggregate(panel)`**: dedupes findings across lenses (same `file:line:title` → one finding; highest severity wins, lenses union, votes sum), applies **majority-survives** (a finding is killed only when skeptics are a strict majority calling it not-real — ties and unvoted findings survive: unverified ≠ disproven), and computes category + per-lens scores via the **`rules/grounding.md` formula** (`5 − floor(weighted_sum/8)`). Verdict FAIL iff any surviving CRITICAL/HIGH. Exit 0 = PASS, 1 = FAIL.
- **`assemble <phase>`**: globs the per-lens `phase-{N}-panel-{lens}.json` files into one `phase-{N}-panel.json` skeleton (votes zeroed) so the orchestrator never hand-builds the panel.
- `--write` emits `.planning/phase-{N}-verification-panel.{json,md}`. Library exports (`aggregate`, `dedupeFindings`, `survives`, `scoreFromCounts`, `assemble`) for reuse.

### Changed — `/qualia-verify` is now panel-based
- **§3 Panel:** spawns one `qualia-verifier` per *relevant* lens (correctness always; security/performance/design by what the phase touches — cost scales to risk, not a flat 4×), in parallel, each anchored on the same contract-run + harness-eval evidence as shared ground truth, each emitting structured findings JSON.
- **§3c Skeptics + aggregation:** assemble → 3 skeptics per CRITICAL/HIGH finding (5 with `--adversarial`/Handoff/security lens), each prompted to *refute* with evidence → tally votes → `verify-panel.js` produces the verdict. MEDIUM/LOW auto-survive (documented cost bound, not a silent cap). The old single-verifier + adversarial-second-pass sections are replaced.
- **§4:** the phase is PASS only if the panel verdict, harness-eval, AND anti-slop all agree. Reuses the existing `qualia-verifier` agent (lens/skeptic are prompt modes — no new agent registration).

### Tests
- `tests/verify-panel.test.sh` (new, 28 cases): empty→PASS, surviving CRITICAL→FAIL, skeptic-killed→PASS, tie/no-vote survive, cross-lens dedupe (severity-max + vote-sum + lens-union), grounding-formula scores, MEDIUM/LOW-only→PASS, `--write` artifacts, `assemble` round-trip, malformed→exit 2. Registered in `run-all.sh` (now 14 suites); `lib.test.sh` trust-score install set carries `verify-panel.js`.

## [6.15.0] - 2026-06-21 (v7 kernel, step 5 — R4+R5: single-source the dual-runtime surface)

Dual-runtime drift is the #1 risk of supporting both Claude Code and Codex. `CLAUDE.md` and `AGENTS.md` were hand-maintained twins — and they *had already drifted* (the MVP-first line and the substrate list differed between them). This batch makes that class of bug unmergeable: one canonical source, compiled per host, with a drift guard in CI.

### Added — R4: one canonical instruction source, compiled to both files
- **`templates/instructions.md`** is now the single source of truth. `CLAUDE.md` and `AGENTS.md` are **generated artifacts** (committed, like a lockfile) carrying a `GENERATED` header.
- **`bin/compile-instructions.js`** compiles the canonical into both files. `--check` mode is the **drift guard**: it exits non-zero if either committed file is stale, making "edited one twin, forgot the other" impossible to merge. Wired into the test suite + an `npm run compile:instructions` script.
- Host-specific content uses conditional blocks (`<!--QUALIA-HOST claude-->…<!--/QUALIA-HOST-->`): the Claude file keeps the Pocock budget note, the Codex file keeps the cross-vendor (Cursor/Continue/Aider/Devin) note — the **body is byte-identical**, only the footer differs. The pre-existing drift is resolved (AGENTS.md regained the full MVP-first line + the constitution substrate entry).

### Changed — R5: `host-adapters.js` is now the single per-host contract
- The adapter is the **one place** anything runtime-specific is declared: `instructionFile`, `configFile`, `agentDir`, `agentExt`, and the Claude→Codex `naming` map (lifted out of a hardcoded swap buried in `renderText`). Nothing else branches on runtime — callers ask the adapter. A third runtime becomes one `HOSTS` entry, not a grep-and-patch.
- Render pipeline split into composable stages: `applyNaming` (display-string swaps) + `applyPaths` (`${QUALIA_*}` tokens + `.claude→.codex`), with `renderText = applyPaths∘applyNaming` (unchanged public behavior) and `compileInstructions = applyNaming∘stripHostBlocks` (naming + blocks, paths/`{{ROLE}}` left for install).
- **`install.js`** now routes both instruction files through `adapter(host).instructionFile` and renders `AGENTS.md` with `codexText()` — a **latent bug fix**: CLAUDE.md always got token/path rendering, AGENTS.md never did, so any `${QUALIA_*}`/`.claude/` reference in the Codex file would have shipped unresolved.

### Tests
- `tests/instructions.test.sh` (new, 25 cases): drift guard passes on HEAD + fails on an uncompiled canonical edit (with restore); CLAUDE/AGENTS bodies identical + host-specific footers preserved; adapter contract facts; `stripHostBlocks` keep/drop per host; `compileInstructions` swaps naming but leaves tokens/`{{ROLE}}`; `renderText` path regression. Registered in `run-all.sh` (now 13 suites). End-to-end install verified: both files render with the role substituted and correct footers.

## [6.14.0] - 2026-06-20 (v7 kernel, step 4 — R3: the cross-artifact analyze gate)

Spec-Kit's most-copied feature, ported. Qualia validated each artifact in isolation — `plan-contract.js` proves the contract is internally well-formed, `harness-eval` scores the built phase — but **nothing diffed scope ↔ plan**. That's exactly where a junior's idea silently loses intent: the scope asks for X, the plan quietly drops it, and no deterministic check notices. This adds that check, between plan and build.

### Added — `bin/analyze-gate.js` (deterministic, zero-LLM, zero-dependency)
- Diffs the plan contract against **intent**: scope acceptance criteria (`.planning/phase-{N}-context.md` `## Acceptance Criteria`) and the CONTEXT.md glossary. Pure keyword/token coverage — same inputs → same output.
- **Four checks:** (1) *uncovered scope AC* — a scope requirement whose key terms don't appear in the contract (HIGH; the plan dropped it); (2) *orphan success criterion* — a contract success criterion no task covers (MEDIUM); (3) *glossary violation* — the plan uses a term CONTEXT.md lists under `Avoid:` (MEDIUM; a genuine spec↔plan contradiction); (4) *scope-reduction language* in task actions/ACs (HIGH; reuses `plan-contract.findScopeReductionPhrases`).
- CLI `analyze-gate.js <phase>` auto-discovers contract + scope + CONTEXT.md; `--json` for machine output. Exit 0 = clean, 1 = findings, 2 = invocation error. Library exports (`analyze`, `coverage`, `parseScopeAcceptanceCriteria`, `parseGlossaryBannedTerms`) for reuse.

### Changed — wired into `qualia-build` as the plan→build gate (§1a), profile-aware
- Runs `analyze-gate.js {N}` before any build. **strict** profile → a HIGH finding is a stop (route to `/qualia-plan --gaps` or `/qualia-scope`); **standard** → surface + proceed with an explicit ack and a logged waiver. **No scope file = scope-coverage skipped, not a failure** — scope-less phases and `/qualia-feature` trivia still build.
- Deliberately **not** a `state.js` hard precondition: scope files are optional, so gating the `built` transition there would brick builds for projects that never ran `/qualia-scope`. The gate lives at the skill seam and degrades gracefully.
- Shipped into installed `bin/` via `runtime-manifest.js`.

### Tests
- `tests/analyze-gate.test.sh` (new, 21 cases): clean pass, under-covered scope AC, orphan success criterion, glossary violation, no-scope skip, missing-contract error, `coverage()` overlap/disjoint units, AC-parser label-strip + section-boundary. Registered in `run-all.sh` (now 12 suites). `lib.test.sh` trust-score install set carries `analyze-gate.js`.

## [6.13.0] - 2026-06-20 (v7 kernel, step 3 — enforce what you already declare: 3 missing primitives)

The v7 brief's loudest meta-theme is **"enforce, don't just declare"** — every static contract Qualia already computes should have a runtime gate. This batch wires the three primitives the research flagged as genuinely missing (R1, R2 + the slop-gate quick win), turning prose instructions and plan-time checks into deterministic, hook-governed guardrails. No new dependencies; all 11 suites green.

### Added — R1: runtime plan-contract file-scope guard (`hooks/task-write-guard.js`)
- `plan-contract.js` proves file-disjointness across parallel tasks at **plan** time, but nothing stopped a builder writing outside its declared set at **run** time — the documented #1 cross-wave-conflict + AI-entropy vector. New PreToolUse `Edit|Write` hook closes it.
- **Scoped:** a no-op unless a build is in flight (≥1 `RUNNING` entry in `.agent-status/` — the R2 signal), so it never interferes with the orchestrator, verifier, or ordinary editing. During a build it **blocks any write to a path not declared by some task** in the active phase contract (`files_modify ∪ files_create`). `.planning/` and `.agent-status/` are always writable. **Fails open** on any error; OWNER escape `QUALIA_ALLOW_OUTSIDE_CONTRACT=1`.
- **Honest limitation (documented in-file):** Claude Code gives a stateless hook no task identity, so it enforces "declared by SOME task" not "by THIS task" — plan-time disjointness + the builder's `<wave_context>` prompt cover the residual gap. Registered in `install.js` (`QUALIA_HOOK_SET` + the `Edit|Write` block); hook count 14 → 15.

### Added — R2: machine-readable per-task status + wave fan-in barrier (`bin/agent-status.js`)
- `contract-runner.js` only checked exit codes; wave completion relied on the orchestrator LLM **reading** each builder's "DONE/BLOCKED/PARTIAL" prose. New helper persists each builder's outcome to `.agent-status/<task>.json` (`RUNNING | DONE | BLOCKED | PARTIAL` + commit hash) — the parallel-worktrees convention.
- CLI: `write` / `read` / `list` / `clear`, plus `barrier <contract.json> [--wave W]` which **exits 0 ⇔ every expected task is DONE** (a pollable barrier, not "did the model notice"). Task ids validated against `^T\d+$` (rejects path traversal). `buildActive()` export is the signal R1 keys off.
- `qualia-build`: builders now write `RUNNING` at start + `DONE/BLOCKED/PARTIAL` at end; the orchestrator runs the barrier after each wave (a `BLOCKED`/`PARTIAL` task holds the wave) and clears scratch at completion. Shipped into installed `bin/` via `runtime-manifest.js`.

### Added — slop-detect wired into the verify + ship gates (quick win)
- The anti-slop scanner (`bin/slop-detect.mjs`) already existed and exits non-zero on CRITICAL design tells; this adds the **gate wiring** (same role as `migration-guard`/`branch-guard`). `pre-deploy-gate.js` re-runs it at `vercel --prod` time as the hard, non-bypassable block (CRITICAL → deploy refused). Skipped silently when the scanner isn't installed (brownfield/older installs); OWNER-only `QUALIA_SKIP_SLOP=1` escape mirrors `QUALIA_SKIP_LINT`. Surfaced in `qualia-verify` (CRITICAL = verification FAIL) and `qualia-ship` Quality Gates.

### Tests
- `tests/agent-status.test.sh` (new, 24 cases): round-trip, validation/traversal rejection, wave + phase barriers, BLOCKED-holds, list/clear, `buildActive`. Registered in `run-all.sh`.
- `tests/hooks.test.sh`: +10 `task-write-guard` cases (idle no-op, declared allow, undeclared block, `files_create`, framework-path exemptions, escape hatch, absolute paths, quiet-after-DONE, fail-open) and +4 `pre-deploy-gate` anti-slop cases (gradient block, clean pass, OWNER-only skip, graceful skip when absent).
- Hook-count assertions bumped 14 → 15 (`install-smoke`, `bin`); `runner.js` install test corrected to 15; `lib.test.sh` trust-score install set carries `agent-status.js`.

## [6.12.0] - 2026-06-20 (v7 kernel, step 2 — lifecycle: build → operate, the forced handoff is gone)

The v7.0-defining change the redesign brief called out as #1 (Section 6, "the change you raised"): a project that has **launched** should stop being a milestone-journey dragged to a Handoff, and become an **update stream**. This is the v7 thesis in miniature — a behavior hard-coded in prose ("the final milestone is always Handoff, never negotiable") is now a **branch on explicit state**.

### Added — a `lifecycle: "build" | "operate"` dimension to the state machine
- **`bin/state.js`:** new projects default to `lifecycle: "build"` (unchanged behavior). New `state.js launch [--deployed-url U] [--source erp|manual]` flips a project to `"operate"`, stamping `launched_at` + `launch_source` (idempotent — relaunching is a no-op). This is the discrete, **ERP-drivable** "is_live" event (the ERP can call it when it detects a project is live), so "launched" is state, not a milestone the team must mislabel as handoff.
- **The forced-handoff funnel is now lifecycle-gated:** `checkPreconditions` requires `HANDOFF.md` for `handed_off` **only in `build` mode**. An `operate` project can complete without ever producing a handoff. (Build mode is byte-for-byte unchanged — verified by a regression test.)
- **`nextCommand` is lifecycle-aware:** in `operate`, a final-phase `verified(pass)` routes to `/qualia-update` (not `/qualia-polish → ship → handoff`); a `verified(pass)` on the last phase increments `lifetime.updates_completed` (the operate analogue of closing a milestone). `cmdCheck` now surfaces `lifecycle` + `launched_at`.
- **`/qualia-update` skill (new):** the operate-mode counterpart to `/qualia-milestone` — a lean plan → build → verify → ship loop with no milestone/handoff machinery. Added to `ACTIVE_SKILLS`.
- **ERP contract:** `bin/report-payload.js` now sends `lifecycle` (+ `launched_at`/`launch_source` when set) so the ERP counts updates vs milestones and stops expecting a handoff for a live product. `templates/journey.md` rule 3 demoted from "the final milestone is always Handoff, never negotiable" to a **build-mode convention**.
- **Tests:** 7 new `state.test.sh` cases (build default; launch→operate stamping + routing; idempotent launch; operate verified→`/qualia-update` + `updates_completed` bump; **build mode still requires HANDOFF.md**; operate mode allows `handed_off` without it). All 10 suites green (89 state cases).

> Verification evidence (6.10.0) stays fully in force in operate mode — an update's contract still runs and its evidence must be clean to PASS. Lifecycle relaxes the *handoff* requirement, never the *evidence* requirement.

## [6.11.0] - 2026-06-20 (main-push: accountability instead of a block)

Owner policy change: an employee pushing to `main`/`master` is **no longer blocked** — it is **counted**. The framework records each employee main-push locally (per-employee running total) and reports it to the ERP as a policy-event the OWNER can see, plus a visible on-push notice. OWNER pushes are unaffected and silent.

### Changed — `hooks/branch-guard.js` is now allow-and-record, never block
- Was: `fail()`/exit 2 (BLOCK) on any non-OWNER push to a protected branch. Now: detects the same protected-branch pushes (current branch **and** `<src>:main` refspec), records an `employee_main_push` event to `C:\Users\hasan\.claude/.main-push-events.json` (`{counts:{<actor>:{total}}, events:[…]}`, mode 0600), enqueues it to the ERP `/api/v1/policy-events` endpoint via `erp-retry.js` (idempotent, `client_report_id` = `QS-MAINPUSH-<actor>-<count>`), prints a non-blocking NOTICE, and **exits 0**. Mirrors the existing `fawzi-approval-guard` model. The hook no longer blocks on missing/malformed config either — it never blocks.
- **ERP side:** `docs/erp-contract.md` now documents the `employee_main_push` event type (stored by `(type, actor_code)` for a per-employee tally, `branch` field replaces `sample`).
- Docs updated to the new reality (`EMPLOYEE-QUICKSTART.md`, `docs/qualia-manual.html`, installer comments + the push hook's status message now reads "Recording branch activity").
- Tests rewritten (`tests/hooks.test.sh`): employee main-push → exit 0 + recorded + count increments + notice; refspec `:main` → recorded; feature-branch / OWNER / missing-config → allowed, not recorded. All 10 suites green.

> Trade-off (by owner decision): `branch-guard` is no longer a hard gate on `main`; "main is always deployable" now rests on review discipline + the visible per-employee tally rather than a block. `git-guardrails` still blocks genuinely destructive pushes (force-push to main, branch -D).

## [6.10.0] - 2026-06-20 (v7 kernel, step 1 — verification evidence is no longer optional)

Closes the headline finding of the v7 redesign brief: **the verification gate could PASS with zero evidence.** This was real — verified on disk against 6.9.2. The fix is the first incremental step of the v7 "invariants in an enforceable kernel, not prose" thesis, shipped on the 6.x line (main stays deployable).

### Fixed — a phase can no longer reach `verified(pass)` without machine evidence
- **Root cause:** the enforcement machinery already existed (`contract-runner.js`, `state.js checkMachineEvidence`), but it was *bypassable by omission*. `checkMachineEvidence` only engages when `phase-N-contract.json` exists (`state.js:1024` returned `{ok:true}` when absent), and nothing forced a contract — the `planned` precondition checked the plan file but never the contract. So the common no-contract path fell through to the prose verifier.
- **Structural fix (`bin/state.js`):** the `planned` precondition now requires a valid `phase-N-contract.json` (exists + parseable + non-empty `tasks[]`), failing `MISSING_CONTRACT`/`INVALID_CONTRACT` otherwise. Because every planned phase now has a contract, `checkMachineEvidence` always engages at the `verified` gate — machine evidence (`evidence/phase-N-contract-run.json` with `ok:true`) becomes mandatory for PASS. "I built it" is no longer sufficient; "the contract ran clean" is required. (Implements the 2026-05-22 harness audit's Finding 3.)
- **Defense-in-depth (`agents/verifier.md`):** the design-rubric instruction "Default to 3 unless evidence supports otherwise" — which *contradicted* `rules/grounding.md` ("Score without evidence = 0") — is replaced. An unevidenced dimension is now `INSUFFICIENT EVIDENCE` and scores 1 (FAIL). A verifier that runs no checks and writes "3" across the board now produces a FAIL, and `state.js:983` already refuses PASS on that literal.
- **Tests (`tests/state.test.sh`):** `make_valid_plan` now emits a contract + passing evidence by default so happy-path setups satisfy the new preconditions; the two cases that exercise *absence* (missing-evidence guard, `--require-contract` missing) strip them explicitly. All 10 suites green.

### Removed — dead `qualia-discuss` skill directory
- The skill was already retired in `bin/command-surface.js` (folded into `/qualia-scope`), but its 222-line `SKILL.md` still shipped in the tarball. Deleted the directory; `RETIRED_SKILLS` continues to clean it from older installs.

## [6.9.2] - 2026-06-20 (docs — visual field manual)

### Added — `docs/qualia-manual.html`
- A self-contained, single-file introductory **Field Manual** in the Qualia house style (dark + teal `#00FFD1`), shipped in the npm package (`files`). It is the human-friendly visual companion to `docs/EMPLOYEE-QUICKSTART.md`: what the framework is, the plan→build→verify→ship→report loop, employee-mode install, the full command map grouped by purpose, a first-project walkthrough, the five hard rules, the credentials-and-who-issues-them table, and the `/qualia` "when you're lost" escape hatch. Content is grounded in the existing quickstart + skill set — nothing invented. Interactive but dependency-free: sticky scroll-spy nav, click-to-copy command chips, reveal-on-scroll, mobile-responsive, skip-link for a11y. `docs/EMPLOYEE-QUICKSTART.md` now links to it.

## [6.9.1] - 2026-06-16 (fix — stale update banner)

### Fixed — session-start showed a false "update available" banner after catching up
- `hooks/session-start.js` rendered the cached `.qualia-update-available.json` notice on every session without checking it against the installed version. Because `auto-update.js` only clears that file on its next (throttled) run, the window between an install and that run showed a stale "Current 6.8.1 → Latest 6.9.0" banner even though 6.9.0 was already installed. `maybeRenderUpdateBanner` now validates the notice against `.qualia-config.json` and self-clears (skips render) when the installed version is at or past the advertised `latest`. Regression covered by two new cases in `tests/hooks.test.sh` (stale self-clears; genuine notice preserved).

## [6.9.0] - 2026-06-13 (employee on-ramps — stack presets, employee-mode install, shared knowledge pull)

Implements Part A of the 2026-06-13 restructure plan: turn the framework from an owner-only tool into something a new employee can take idea→deployed without tribal knowledge. **Additive only** — no skill, agent, hook, or rule was rewritten; these are on-ramps built *around* the existing loop.

### Added — project-type stack presets (`templates/stacks/`)
- **Four presets matching real Qualia work:** `landing-page` (Next.js SSG, no DB), `full-app` (Next.js + Supabase auth/RLS + Tailwind), `ai-agent` (adds OpenRouter + optional Retell/ElevenLabs/Telnyx voice), `internal-tool` (Supabase portal-style auth). Each preset ships `stack.json`, `env.required.json` (`{name, purpose, howToObtain, ownerIssued}`), `phases.md`, `verify-checklist.md`, and a minimal-but-runnable `scaffold/` (full-app/internal-tool include `lib/supabase` server+client adapters and an RLS-from-first-migration `0001_init.sql`; ai-agent adds a `lib/openrouter` adapter + `app/api/chat` route + `evals/`). `templates/stacks/README.md` documents the contract. This kills the "every project gets identical generic phases / no working skeleton" gaps.

### Changed — `/qualia-new` instantiates a preset
- Adds one project-type question, then lays down the chosen preset's scaffold, folds `phases.md` into the plan, and copies `env.required.json` to the new project's `.planning/env.required.json`. `--quick` skips it. Existing flow otherwise unchanged.

### Changed — `/qualia-doctor` validates the preset's env + CLI auth
- Reads `.planning/env.required.json` (fallback `./env.required.json`), checks each var (env or `.env.local`) and CLI logins (`vercel`, `supabase`, `gh`), and prints PASS/FAIL with the exact fix command. For `ownerIssued: true` vars it routes to "ask the OWNER (Fawzi)" instead of a self-serve command.

### Added — two-mode install (OWNER / EMPLOYEE)
- `npx qualia-framework install` accepts the explicit keyword `EMPLOYEE` at the install-code prompt: installs the full framework with **no team code**, `erp.enabled=false`. OWNER/team-code installs are byte-for-byte unchanged, and a genuinely bogus or empty code is still rejected (no silent self-elevation). `/qualia-report` degrades gracefully when no team code is set — it writes a **local** report file and says so, instead of failing. New `docs/EMPLOYEE-QUICKSTART.md` walks install→doctor→new→build/verify→ship→report with the credential each step needs.

### Added — shared knowledge pull (Part C bridge)
- On install/update the framework pulls a **read-only** copy of the `qualia-memory` vault's sanitized `wiki/_export/` (configurable via `QUALIA_KNOWLEDGE_SOURCE` / `QUALIA_KNOWLEDGE_SUBPATH`, git URL or local path) into the knowledge dir, skipping gracefully when unavailable. Freshness comes from the vault's nightly ERP-report ingest, not sync infra. The export is financial-data-sanitized at the source (see qualia-memory `scripts/export-team-wiki.py`).

### Fixed — test drift
- `tests/bin.test.sh` (Codex backup discipline #122/#123) now greps the `backups/` subdir, matching the v6.8.1 `bakPath()` relocation. The behavior was correct; the test path was stale.

## [6.8.1] - 2026-06-10 (installer hygiene — global hook sweep, bin purge, bak routing)

Found via a live audit of an installed `~/.claude`: the retired brain experiment's `brain-inject.js` was still wired under `UserPromptSubmit`, firing a failing node process on every user prompt, and had survived four releases because the settings merge never looked at that event.

### Fixed — installer
- **Settings hook sweep is now global.** The merge previously only cleaned events present in `qualiaHooks`, so deprecated entries under other events (`UserPromptSubmit`, etc.) were never pruned. The installer now sweeps every hook event for (a) retired Qualia hook commands and (b) `node "<CLAUDE_DIR>/..."` commands whose target file no longer exists, dropping empty blocks/events. User hooks (non-node or outside `CLAUDE_DIR`) are untouched.
- **`brain-inject.js` added to `DEPRECATED_HOOKS`** — the UserPromptSubmit half of the brain experiment was missing from the v6.8.0 prune list.
- **`bin/` orphan purge** — `DEPRECATED_BIN` removes the retired `build-brain-index.js`; bin/ previously had no deprecation pass at all.
- **`.bak` files routed to `backups/`** — `settings.json.bak.*` / `CLAUDE.md.bak.*` no longer accumulate in the `~/.claude` root across reinstalls; all three backup sites now write into a `backups/` subdir via a shared `bakPath()` helper.

## [6.8.0] - 2026-06-06 (audit remediation — installer, guards, trust-score, polish)

Closes the verified findings from the 2026-06-06 framework audit (4 CRITICAL · 7 HIGH · 33 MEDIUM, adversarially verified). Root cause of most CRITICALs was a stale/incomplete install, not source rot — fixed in the installer so a clean reinstall is complete and correct.

### Fixed — installer (the highest-leverage fixes)
- **Installed CLI no longer crashes.** `bin/install.js` now writes a root `package.json` (version marker) into the install, and `bin/cli.js` guards the `require("../package.json")` read (falls back to `.qualia-config.json`). The installed `qualia-framework` CLI was dead via `MODULE_NOT_FOUND`.
- **`references/archetypes/*.md` now install to the canonical `references/` path** (in addition to `qualia-references/`), so `/qualia-scope` and `constitution.md` resolve their archetype DoDs. `qualia-scope` reads them via absolute paths.
- **Companion docs shipped:** `SOUL.md`, `FLAGS.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md` are now copied by the installer and included in the npm package `files`.
- **`auto-report.js` added to the runtime manifest** so the Stop-hook ship-time auto-report is actually installed; `stop-session-log.js` guards the spawn with `fs.existsSync`.
- **Installer is idempotent for hooks:** reinstall prunes orphan `.js` hooks (e.g. legacy `brain-*.js`) and `DEPRECATED_HOOKS` lists them.

### Fixed — guards fail closed (were failing open / silent)
- **`pre-deploy-gate`:** hook-registration timeout raised 180→600s and per-gate budgets lowered to 120s so four quality gates + security scan can't exhaust the hook timeout and let a deploy through. Brownfield ship-policy short-circuit now logs to stderr. `QUALIA_SKIP_LINT` is OWNER-gated.
- **`migration-guard`:** block reason now printed to **stderr** (was stdout, invisible to the model on exit 2).
- **`security-scan`:** unreadable files are recorded in `skipped[]`, degrade the score, and force a non-clean exit — no more silent fail-open per file.
- **`trust-score`:** now load-probes spine scripts (`node --check`) that are present, so a syntax-broken installed script forces status off PASS (it previously reported 100/PASS regardless).

### Changed — config
- **Renamed the env key `CLAUDE_AGENT_FORK_ENABLED` → `CLAUDE_CODE_FORK_SUBAGENT`** — the official Claude Code variable (v2.1.117+); the old name was a no-op. Installer + `cli.js` repair env now agree.
- Installer writes a `$schema` reference and seeds a scoped `permissions.allow` baseline instead of leaving it empty.

### Fixed — skills, agents, rules, docs
- Repointed dangling command routes (`/qualia-status`→`/qualia-doctor`, `/qualia-debug`→`/qualia-fix`, `/qualia-pause`,`/qualia-resume`→`/qualia`/`/qualia-handoff`), fixed `~/qualia-memory` path, added 6 omitted skills to the `/qualia-road` map.
- Added `rules/grounding.md`/`rules/trust-boundary.md` references to agents that were missing them; granted the verifier `Write` and qa-browser `Edit` (the contracts that require writing the verification file).
- Fixed stale rule paths (`rules/design-rubric.md`→`qualia-design/design-rubric.md`), replaced the non-existent `/supabase` skill references with `npx supabase`, annotated knowledge index stubs.

### Improved — polish subsystem
- Screenshot capture is now **full-page** (was above-the-fold only) across all backends; visual-evaluator scores below-fold sections.
- `--vibe` now routes back through verification (tsc + slop-detect + a scoped vision pass) instead of terminating at the token swap.
- Deterministic loop token accounting (fixed per-iteration cost) and an iteration-monotonicity assertion; single-sourced design rubric + the 10-font banned list (lockstep with `bin/slop-detect.mjs`).

## [6.7.1] - 2026-05-31 (docs patch — A4 surface-collapse follow-up)

Documentation-only patch. No code or behavior changes.

### Fixed

- **User-facing help docs caught up with the A4 surface collapse.** `docs/onboarding.html` and `templates/help.html` still advertised `/qualia-discuss` as a live slash command, though it was retired into `qualia-scope` in 6.7.0 (`RETIRED_SKILLS`, PR #64). Both now point at `/qualia-scope` with accurate PROJECT/PHASE-mode descriptions (PR #66). No code path was affected — `qualia-discuss` was already absent from `ACTIVE_SKILLS`.

## [6.7.0] - 2026-05-31 (A5 — per-increment, concurrency-aware state model)

Additive release. No breaking changes. Completes A5: multiple people can work the same project on different branches without merge-conflicting on the planning files. The change is **dual-layout** — projects without `.planning/increments/` run the exact legacy code path (all 65 prior state tests pass unchanged); the new path activates only after `state.js migrate`.

### Added

- **Per-increment layout (`bin/state.js`)** — the committed source of truth becomes one file per increment, `.planning/increments/{id}.md` (frontmatter: `status`, `claimed_by`, `branch`, `verification`, `gap_cycles`, build counters, `deployed_url`; body carries a Definition-of-Done checklist), wrapped in `.planning/releases/{rid}.md`. Two people editing two increments edit two files → **no conflict by construction**.
- **`STATE.md` + `tracking.json` + `.cursor.json` are now LOCAL generated views** — `regenerateViews()` rebuilds them from the increment files. `tracking.json` stays **fat** (mirrors the active increment + keeps identity/lifetime + gains an `increments`/`releases`/`mode` index), so all 13 back-compat consumers (`report-payload.js`, `project-snapshot.js`, `trust-score.js`, `statusline.js`, hooks, …) keep working with zero edits. They're gitignored, so the only per-step-mutated files are never committed.
- **`state.js migrate`** — non-destructive conversion of a legacy project: backs up `STATE.md`+`tracking.json`, writes a reversible `migration-manifest.json`, is idempotent, and supports `migrate --revert` (byte-identical restore). Hard-stop, human-initiated — never silent.
- **`state.js claim` / `state.js release`** — claim writes `claimed_by`+`branch` onto one increment (a second actor is refused with `ALREADY_CLAIMED`); release ships the increment, runs the **profile-aware Definition-of-Done gate** (strict: any open `- [ ]` blocks; standard: open lines need a `WAIVED:` reason; `--force` overrides), and clears the claim.
- **`templates/planning.gitignore`** — installed into `.planning/.gitignore` by `qualia-new`; lists the now-local generated files.

### Changed

- **`check` and `transition` are increment-aware** when `.planning/increments/` exists — `check` is read-only and returns `my_claim` / `next_increment` / `claimed_increments[]` so the router skips work held by another person; `transition` operates on one increment file (by `--id`, or `--phase N`/cursor for full back-compat with the existing plan→build→verify→ship flow).
- **Skills repointed** — `qualia-scope` claims the scoped increment, `qualia-ship` releases it, `qualia` routes around others' claims, `qualia-new` scaffolds `.planning/.gitignore`. All gated on the increment layout; legacy projects are unaffected.

### Security

- **Increment-id validation** (`isValidIncrementId`) — `claim`/`release`/`transition --id` reject any id that isn't a plain `inc-<slug>` token before it reaches `path.join`, closing a path-traversal vector (`--id "../../etc/passwd"` → `INVALID_ID`).

### Tested

- 14 new `tests/state.test.sh` assertions (state suite 65 → 79, all green): migration + idempotency + byte-identical revert, claim/double-claim, router skip, release + DoD gate (strict/standard/force), id-traversal guard, and the **two-actor zero-conflict keystone** (two clones ship two increments on two branches → merge to main with zero conflicts, `STATE.md` never committed). All 10 suites green.

## [6.6.0] - 2026-05-31 (B1 auto-capture — ship-time ERP reporting)

Additive release. No breaking changes. Completes B1: the ERP receives a session report **automatically when work ships**, with no manual `/qualia-report` — closing the "data is self-reported and optional" gap.

### Added

- **`bin/auto-report.js`** — ship-time auto-capture. `maybeAutoReport()` fires ONLY when a project reaches `status: shipped`, deduped once per shipped `(milestone, phase)` via a marker file, and POSTs a session report tagged `source: 'auto'`. Fail-soft: enqueues to the existing `erp-retry` queue on any failure, never throws, never blocks. (Deliberately NOT triggered per-turn — the Stop hook fires every turn, so a naive hook there would spam the ERP with a new report every few minutes.)
- **`source` provenance on the report payload** — `bin/report-payload.js` `buildPayload()` tags `source` (`'auto'` when `SOURCE=auto`, else `'manual'`) and honors `DRY_RUN` for safe testing. The ERP side (`session_reports.source`) shipped separately in `qualia-erp`.

### Changed

- **`hooks/stop-session-log.js`** — spawns `auto-report.js` **detached** (fire-and-forget) so the hook stays fast and non-blocking; the auto-report's own guards make it a no-op except the one turn right after a ship.
- **`bin/erp-retry.js`** — exports `postOnce` / `readApiKey` / `readConfig` so auto-report and the manual `/qualia-report` flow share ONE ERP-upload seam.

### Tested

- New `tests/auto-report.test.sh` (14 assertions): source tagging, every guard (no key, ERP disabled, not-shipped), ship-time POST delivering `source:'auto'` to a stub endpoint, dedupe, fail-soft enqueue. All 10 suites green. E2E-verified against the live ERP (a real `source='auto'` row landed, then was removed).

## [6.5.0] - 2026-05-30 (Seniority profiles + archetype-aware intake hardening)

Additive release. No breaking changes. Completes the A1/A3 intake work, adds the seniority profile primitive, and hardens the router against state drift.

### Added

- **Seniority profile (`strict` / `standard`)** — a project now carries a `Profile:` field (STATE.md + tracking.json), resolved as `$QUALIA_PROFILE` (env wins) → STATE.md → tracking.json → `strict` (safe default; anything but the exact string `standard` coerces to `strict`). `state.js check` surfaces it; `state.js init --profile` sets it and re-init preserves it. `state.js` only stores/surfaces the field — gate enforcement is a documented contract owned by the consuming skill (`qualia-scope`), not enforced in `state.js`. Router + `guide.md` document the semantics: `strict` = hard gates, no waivers; `standard` = advisory, waiver logged to `.planning/decisions/`. (`bin/state.js`, `skills/qualia/SKILL.md`, `guide.md`)
- **`web-app` + `voice-agent` archetypes** — completes the archetype Definition-of-Done set that `qualia-scope` reads at runtime (`references/archetypes/${ARCHETYPE}.md`); the skill previously broke for these two selections. `qualia-scope` also registered in `bin/command-surface.js` `ACTIVE_SKILLS`. (`references/archetypes/web-app.md`, `references/archetypes/voice-agent.md`)

### Fixed

- **Router no longer self-cancels on a drifted `STATE.md`.** `state.js check` read phase/status from `STATE.md` and returned `NO_PROJECT` (exit 1) whenever it was missing/corrupt — even with `tracking.json` intact — which made the `/qualia` router's parallel command batch cancel its siblings. `check` now reconstructs from the surviving file, exits 0, and routes to `state.js fix`; true `NO_PROJECT` (both files absent) is unchanged. (`bin/state.js`)

### Changed

- **De-brittled skill-surface tests.** `tests/lib.test.sh`'s surface manifest and trust-score fixtures now derive from `command-surface.js` `ACTIVE_SKILLS` instead of hardcoding a count — adding or removing a skill no longer requires test edits.

### Docs

- **A5 multi-person concurrency spec + line-cited implementation plan** (`docs/implementation-handoff.md`, `docs/a5-concurrency-plan.md`): partition state per-increment with `claimed_by`/`branch`, demote `STATE.md` to a generated dashboard, so concurrent contributors on different increments never conflict on planning files. Build deferred (highest-risk `state.js` rework — its own effort).

### Deferred

- **Command-surface collapse.** Retiring `qualia-discuss` into `qualia-scope` is blocked on `qualia-scope` first absorbing the PROJECT MODE intake interface (`PROJECT_TYPE`, `project-discovery.md`); retiring it now would break `qualia-new` kickoff. All 26 skills remain active.

## [6.4.0] - 2026-05-28 (Audit-driven remediation + mechanism grafts)

Substantive additive release. No breaking changes. Consolidates four feature commits previously labeled v6.3.1–v6.3.4 in commit messages (never published) plus today's CI cleanup and polish.

### Added

- **`/qualia-idk` restored + enhanced** — three-scan diagnostic (planning + code + conversation/memory), returns guidance plus a paste-ready Qualia command sequence. Was retired in v6.3.0; owner pivot brought it back deeper. (`skills/qualia-idk/SKILL.md`)
- **`/qualia-secure`** — security audit of agent config (CLAUDE.md / settings.json / hooks / MCP). Two-pass: fast static pattern scan + optional Opus 4.7 adversarial red/blue/auditor pipeline. (`skills/qualia-secure/SKILL.md`, `bin/security-scan.js`)
- **`hooks/pre-compact.js`** — PreCompact hook writes `.planning/.compaction-snapshot.md` with in-flight state before context compaction. No git pollution (unlike the v6.2.0-removed version) — pure sidecar that `/qualia-resume` and `session-start` consume.
- **`bin/learning-candidates.js`** (`qualia-framework learn-scan`) — scans recent commits + daily-log for repeated fix-scope patterns and hot files; writes `C:\Users\hasan\.claude/knowledge/learning-candidates.md` with action hints.
- **`bin/status-snapshot.js`** (`qualia-framework status`) — portable operator snapshot (install health + active project + work in flight + ERP queue + memory state). Markdown / `--json` / `--write` / `--exit-code`.
- **`bin/security-scan.js`** (`qualia-framework secure`) — static scanner for AI-agent config surfaces. Detects leaked secrets (Anthropic/OpenAI/GitHub/AWS/Supabase JWT/Vercel/Bearer), unscoped Bash tool, service_role-in-client smells, hook hygiene issues. `--deep` emits a prompt pack for the `/qualia-secure` adversarial pass.
- **`bin/prune-deprecated.js`** — shared helper used by both install and doctor. Detects and removes ghost retired skills from `C:\Users\hasan\.claude/skills/` and `~/.codex/skills/`. Errors are surfaced (not swallowed) so users see permission/mount issues that would otherwise leave trap skills installed.
- **`SOUL.md`** — 17-line identity statement (Identity / Stance / 5 named principles / What We Reject). Linked from `README.md` and `CLAUDE.md`.
- **`FLAGS.md`** — single-page index of every Qualia skill flag, grouped by lane.
- **`TROUBLESHOOTING.md`** — 185-line problem-to-fix doc, grounded in actual error strings from `bin/state.js`, hooks, ERP retry.
- **Hard rules now pair negative with positive principle** in `CLAUDE.md` and `AGENTS.md` (italic explanation per rule).

### Changed

- **`doctor` auto-prunes ghost retired skills** in every install home and lists each failure if any prune step errors out.
- **17 SKILL.md descriptions slimmed** to one verb-phrase + short Triggers list (was 3–6 sentence trigger essays). Aggregate savings: ~600 words per session in harness-routing instructions.
- **`README.md` and `guide.md` openers slimmed** — version-history walls (35+ and 25+ lines respectively) moved to `CHANGELOG.md`. Both files now lead with thesis + first commands + cross-links (`SOUL.md` / `FLAGS.md` / `TROUBLESHOOTING.md`).
- **`ACTIVE_SKILLS` count: 23 → 25** (`qualia-idk` restored, `qualia-secure` added).
- **Hooks count: 12 → 13** (`pre-compact.js` reintroduced with sidecar mechanism).

### Fixed

- **macOS CI** — `tests/refs.test.sh` refactored off bash 4 `declare -A` (macOS ships bash 3.2). Replaced with temp-file key-value store. macOS CI went from red since 2026-05-21 to all 6/6 green on first PR after the fix.
- **CI matrix cleanup** — Windows runners dropped from the matrix. Qualia is Cyprus-stack (Linux/macOS dev); Windows isn't supported. Two coercion attempts (`pwd -W`, `cygpath -m`) didn't catch every shell-side path interpolation site, and the cure was more brittle than the disease. The workflow comment documents the path forward if Windows support is ever needed (env-var-pass paths instead of bash-interpolating them).
- **CodeRabbit advisory** — `bin/prune-deprecated.js` no longer silently swallows filesystem errors; returns `{removed, errors}` and surfaces failures via doctor or non-zero exit on the CLI.
- **CodeRabbit advisory** — `README.md` "First commands" code fence got a `text` language specifier (satisfies MD040).
- **Stale `/qualia-idk` reference** in `/qualia` skill description removed; clean separation between the mechanical router and the deep diagnostic.

### Audit artifacts

Three `.planning/codebase/` audit documents drove this release: `qualia-confusion-audit.md` (16 cited defects with file:line citations), `ecc-vs-qualia.md` (8-pair head-to-head skill comparison), `qualia-vs-ecc-final.md` (16-query NotebookLM consolidated audit with execution order). The release closes 14 of 14 actionable items from the final audit; 1 item (Q2 AGENTS.md skill table) was deliberately rejected to preserve the 25-line instruction-budget cap.

## [6.3.0] - 2026-05-23 (Harness hardening + command surface reduction)

### Changed

- **Default install surface reduced from 35-ish skills to 23 active skills.** `bin/command-surface.js` is now the canonical active/retired skill manifest; installer summary and Claude/Codex skill copying use it.
- **Retired helper commands are deleted from shipped skill source and pruned on upgrade.** The installer still removes folded helpers such as `qualia-debug`, `qualia-vibe`, `qualia-idk`, `qualia-pause`, `qualia-resume`, `qualia-zoom`, `qualia-issues`, `qualia-triage`, `qualia-hook-gen`, `qualia-skill-new`, and `qualia-flush` from older installed homes.
- **`/qualia-polish --vibe` absorbs the separate vibe command.** Vibe token/extract scripts now ship under `skills/qualia-polish/scripts/`.

### Added

- **`bin/harness-eval.js`** writes deterministic project eval artifacts under `.planning/evals/`, combining state health, ledger validation, plan contract validation, machine evidence, verification report status, trust score, and ERP linkage into a 0-100 score.
- **ERP reports and project snapshots carry the latest harness eval summary** (`status`, `score`, `phase`, `generated_at`, artifact path).
- **`qualia-framework eval` CLI** runs the harness eval (`--run --write --json` supported).

### Fixed

- **PASS state transitions now require evidence.** When a phase contract exists, `state.js transition --to verified --verification pass` refuses to pass without a clean `.planning/evidence/phase-N-contract-run.json`; it also refuses PASS if the verification report contains `INSUFFICIENT EVIDENCE`.

## [6.2.11] - 2026-05-23 (Owner approval integrity)

### Changed

- **Fawzi OWNER code changed** from `QS-FAWZI-01` to `QS-FAWZI-11`.
- **Employee force-ship override is blocked.** `QUALIA_SHIP_FORCE=1` is OWNER-only in `/qualia-ship` and in the deploy hook.
- **Ship refusals are shorter and routed.** When the framework refuses deploy from the wrong state, it says why and prints the correct next command.

### Added

- **`fawzi-approval-guard.js`** silently records employee proxy-approval claims such as "Fawzi said OK" into a local counter and ERP policy-event queue.
- **ERP policy-event contract** for `/api/v1/policy-events`.

## [6.2.9] - 2026-05-22 (Codex hook noise + status line)

### Fixed

- **PreToolUse hook spam.** Codex was printing eight "Running PreToolUse hook: Qualia X..." status messages on every Bash tool call, even though six of the eight hooks would immediately exit 0 because their `if` filter excluded them. Codex's hook schema doesn't include an `if` field — only `command`, `commandWindows`, `timeout`, `async`, `statusMessage`. The `if:` we shipped was silently dropped and Codex showed the `statusMessage` for every entry in the matched group before running it. v6.2.9 removes `statusMessage` from all conditional hooks; only the always-running hooks (`auto-update`, `git-guardrails`) still show a status line. Conditional hooks render silently.
- **`pre-deploy-gate.js` firing on unrelated commands.** Claude Code's `if: "Bash(vercel --prod*)"` matcher does substring matching (not glob), so any Bash command containing the literal text `vercel --prod` or `pre-deploy-gate` as a token tripped the gate and ran the full tsc/lint/test/build sweep. Added an inline `selfFilter()` IIFE at the top of the hook that reads `tool_input.command` from stdin and exits 0 fast unless the command actually starts with `vercel --prod` or `vercel deploy --prod`. Same pattern added to `pre-push.js`.

### Added

- **`[tui] status_line = [...]` in Codex `config.toml`.** Installer now writes (or appends to existing config) the rich Codex bottom status line: `model-with-reasoning · task-progress · current-dir · git-branch · context-used · five-hour-limit · weekly-limit`. Codex doesn't support custom-command status lines like Claude's `statusLine`, so the Qualia phase/state info continues to render via the `SessionStart` banner at the top of the session; this commit ensures Codex's native bottom status line is at least configured for richness, not left to default. Existing user configs are appended-to only when they have no `[tui]` block; otherwise left untouched.

## [6.2.8] - 2026-05-22 (Codex /goal integration + install hardening)

### Fixed

- **Codex agent TOMLs missing `name` field.** `renderCodexAgentToml` now emits `name = "..."` as the first line of every `~/.codex/agents/*.toml`. v6.2.7 shipped without this and Codex 0.133 rejected all 9 agent files at session start with `Ignoring malformed agent role definition: ... must define a non-empty \`name\``.
- **ERP API key missing on Codex installs.** When both targets are installed, the installer now mirrors `C:\Users\hasan\.claude/.erp-api-key` → `~/.codex/.erp-api-key` (0600). Without this, every ERP write from a Codex session 401'd and the retry queue grew silently.
- **Deprecated skills lingered after upgrade.** Installer now prunes `qualia-task`, `qualia-quick`, `qualia-polish-loop`, `qualia-design`, `qualia-prd` from both `C:\Users\hasan\.claude/skills/` and `~/.codex/skills/` on every run. Previously left orphaned after the v5.7.0 / v5.8.0 / v4 consolidations.

### Added

- **`bin/codex-goal.js`** — reads `.planning/STATE.md` + `.planning/ROADMAP.md` and emits a `/goal {objective}` line plus a token-budget suggestion calibrated to scope (`phase` 80k · `task` 30k · `feature` 30k · `quick` 10k). Output is meant to be pasted into a Codex session or consumed by the model via the `update_goal` tool.
- **`rules/codex-goal.md`** — guidance: detect Codex runtime, run `codex-goal.js`, call `update_goal` or surface the `/goal` line. Skip entirely on Claude Code.
- **`/goal` integration wired into phase-start skills** — `qualia-build`, `qualia-plan`, `qualia-feature` each open with a Step 0 that references `rules/codex-goal.md`. Codex users get native burn-vs-budget tracking against the active phase/task objective without extra typing.

## [6.2.7] - 2026-05-21 (Codex runtime compatibility)

### Added

- **Codex-native install surface** now writes `~/.codex/hooks.json`, `~/.codex/hooks/*.js`, `~/.codex/agents/*.toml`, `~/.codex/bin/*.js`, `~/.codex/rules/`, `~/.codex/skills/`, `~/.codex/qualia-design/`, `~/.codex/qualia-templates/`, `~/.codex/knowledge/`, and `~/.codex/qualia-guide.md`.
- **Codex agent conversion** turns framework `agents/*.md` frontmatter/body into Codex TOML agents.

### Changed

- Shared runtime scripts and hooks now resolve their Qualia install home from `~/.claude` or `~/.codex`, so Codex-only installs no longer depend on a Claude install existing.
- Installer tests and packaged smoke tests now prove Codex runtime files are present, not just `AGENTS.md`.

## [6.2.6] - 2026-05-21 (project snapshot upload)

### Added

- **`qualia-framework project-snapshot --upload`** posts the current project snapshot to ERP's project snapshot intake.
- **Upload coverage** verifies the Framework sends the 0-to-100 progress object, ERP identifiers, and bearer token to `/api/v1/project-snapshots`.

## [6.2.5] - 2026-05-21 (project snapshot export)

### Added

- **`qualia-framework project-snapshot`** exports a single project progress JSON object for ERP/admin import.
- **`--write` snapshot mode** writes `.planning/snapshots/project-snapshot-*.json` with shared IDs, current milestone/phase, closed milestones, lifetime counters, and a 0–100 progress percentage.

## [6.2.4] - 2026-05-21 (report payload contract hardening)

### Added

- **`bin/report-payload.js`** is now the canonical Framework -> ERP report payload builder used by `/qualia-report`.
- **Executable coverage** now proves slug-like ERP IDs are omitted while canonical UUID fields are sent, keeping admin/project linking reliable.

## [6.2.3] - 2026-05-21 (ERP ID guard hotfix)

### Fixed

- **`/qualia-report`** now only sends `erp_project_id`, `client_id`, and `workspace_id` when values are UUID-shaped. This prevents ERP `422 VALIDATION_FAILED` responses when local `tracking.json` contains slug-like values such as `acme` or `qualia-solutions`.
- **ERP contract docs and work-packet template** now label ERP-native identifiers as UUIDs. Local slugs remain in `project_id` and `team_id`.

## [6.2.2] - 2026-05-21 (memory/ERP operating model)

This patch incorporates the Framework/Memory/ERP connection note into the framework without reviving the old passive git-scrape model.

### Added

- **`docs/ecosystem-operating-model.md`** documents the boundary: Framework builds, Memory remembers, ERP operates. `.planning` imports stay explicit and approved; ERP does not depend on passive git scraping or hook-created bot commits.
- **`docs/reviews/v6.2.2-memory-erp-audit.md`** records how the downloaded Framework/Memory/ERP note was applied and where it needed correction.
- **`templates/work-packet.md`** gives ERP/admins a clean way to hand approved project context into Claude Code or Codex sessions.
- **`docs/release.md`** documents the pre-publish, publish, and post-publish proof path so local package smoke is not mistaken for public install proof.
- **`tests/published-install-smoke.test.sh`** is the release-only public smoke: it fails until npm `latest` matches `package.json`, then runs `npx qualia-framework@latest install` into an isolated HOME/cache and verifies Claude + Codex output.

### Changed

- **`tracking.json` and `/qualia-report`** now preserve/pass through optional `erp_project_id`, `client_id`, and `workspace_id` identifiers when present, so ERP dashboards can link reports without guessing from names.
- **`tests/install-smoke.test.sh`** now isolates npm cache/log/userconfig state and reports npm pack stderr instead of swallowing pack failures.
- **`skills/qualia-report`** now shows the safe piped `set-erp-key` command instead of the retired positional-key syntax.

## [6.2.1] - 2026-05-21 (revival audit surface guard)

This patch closes the remaining active-surface drift found during the framework revival audit. v6.2.0 removed hook-created bot commits, but several user-facing surfaces still described the old model: ERP reads from git, `pre-compact` saves state, 32 skills, and stale v6.0 headings.

### Changed

- **README / guide / onboarding** now reflect the current package identity, 33-skill surface, `/qualia-vibe`, and the explicit `/qualia-report` ERP contract.
- **`skills/qualia-road`, `skills/qualia-milestone`, `agents/roadmapper`, and `docs/erp-contract.md`** now describe `tracking.json` as local/report telemetry, not passive ERP git input.
- **`skills/qualia-verify`** now states the current fail-closed `INSUFFICIENT EVIDENCE` behavior directly instead of describing the old false-pass vector as if it still applied.
- **`skills/qualia-polish`** now requires optional Lighthouse/axe gate skips to be reported, not silently hidden.
- **`docs/reviews/v6.2.1-revival-audit.md`** records the evidence, remaining release blocker, and next high-leverage work.

### Tests

- **`tests/refs.test.sh`** now also guards stale active-surface claims: passive ERP tracking, removed pre-compact guidance, stale skill count, stale README version, old `INSUFFICIENT EVIDENCE` wording, and silent optional gate language.
- **`tests/install-smoke.test.sh`** builds the actual npm tarball, extracts it, runs the packaged installer with target `Both`, and verifies Claude `CLAUDE.md`, Codex `AGENTS.md`, 11 hooks, no `pre-compact`, and matching installed config version.

## [6.2.0] - 2026-05-20 (no more hook-created bot commits)

Two hooks were creating bot commits whose only purpose was to feed a phantom consumer:

- **`hooks/pre-push.js`** — created `chore(track): ERP sync …` on every push to stamp `.planning/tracking.json` into git. Rationale: "the ERP at portal.qualiasolutions.net reads tracking.json from GitHub." That rationale was false; the ERP repo has no route, cron, MCP, or background worker that reads `tracking.json` (verified — search returns only marketing copy and one substring-match comment).
- **`hooks/pre-compact.js`** — committed STATE.md + tracking.json on every Claude Code context compaction. Rationale: "preserve mutations across compactions." Misdiagnosed; `bin/state.js` already provides crash-safe atomic writes (`state.js:18`) plus a write-ahead journal (`state.js:36-64`) and recovery (`state.js:49-63`). Compaction is in-memory only — disk writes survive it without help.

The bot commits were pushing data into git for a consumer that doesn't exist, polluting every Qualia project's history, and on any Vercel project with GitHub auto-deploy accidentally on, triggering redeploys for nothing.

v6.2 strips both. The pre-push hook still stamps `tracking.json` locally so `bin/statusline.js`, `hooks/stop-session-log.js`, and `/qualia-report` see fresh telemetry — it just doesn't touch git anymore. The pre-compact hook is deleted outright; `state.js` already covers crash safety with a stronger guarantee (atomic + journaled) than git ever did.

### Changed

- **`hooks/pre-push.js`** — rewrite. Stamps `last_commit`, `last_updated`, `last_pushed_at` locally only. No `git add`, no `git commit`, no rollback dance, no branch-guard mirroring (irrelevant without a commit). Net code reduction: ~220 → ~85 lines.
- **`docs/erp-contract.md`** — strikes the false "ERP reads `tracking.json` directly from git" claim and removes the dangling `GET /api/v1/tracking/:project` endpoint that was documented but never implemented on the ERP.
- **`bin/install.js`** — fixes the false "tracking.json syncs to ERP on every push" install-summary line; drops empty hook-event keys after Qualia-owned cleanup so settings.json doesn't accumulate empty `PreCompact: []` arrays.

### Removed

- **`hooks/pre-compact.js`** — deleted. Added to `DEPRECATED_HOOKS` array in `bin/install.js` so existing installs get the file unlinked from `C:\Users\hasan\.claude/hooks/`. Added to `QUALIA_LEGACY_HOOK_FILES` in `bin/cli.js` so the `wire` path also strips it. The PreCompact event entry in user `settings.json` is detected and removed; if PreCompact is now empty, the key is dropped.

### Migration

No action required. Existing `chore(track): ERP sync` and `state: pre-compaction save` commits in your project histories stay (you can't unmake history); v6.2 just stops creating new ones. Existing ERP integrations are unaffected — `/qualia-report` continues to POST to `/api/v1/reports` exactly as before. On upgrade, the framework will:

1. Delete `C:\Users\hasan\.claude/hooks/pre-compact.js` from existing installs.
2. Strip any `pre-compact.js` references from your `C:\Users\hasan\.claude/settings.json`.
3. Drop the `PreCompact` key entirely if it becomes empty.

## [6.1.0] - 2026-05-17 (design pivot path — /qualia-vibe + design-surface fixes)

The design path was missing a fast pivot. `/qualia-polish` polishes within a chosen vibe; `/qualia-polish --redesign` rebuilds from scratch (~30 min). When a client says "different vibe" and you want a 3-minute token swap, neither fits. v6.1 adds **`/qualia-vibe`** — the impeccable middle path.

This release also closes the design-surface bugs surfaced by the v6.0 audit (viewport mismatch, slop-detect path resolution, dead `/qualia-design` references, bounce-easing contradiction) and adds the EventMaster discipline as a real rule.

### New — `/qualia-vibe` skill

Layout-preserving aesthetic pivot. Modes:

- **Default** — propose ONE direction (per `rules/one-opinion.md`), justify it from PRODUCT.md / anti-references / scene sentence, apply on approval. Never enumerates a menu of options.
- **`--variants N`** — the opt-in menu, when the user explicitly asked for choices. Default N=3, max 5. Uses `AskUserQuestion`.
- **`--extract <URL or image path>`** — reverse-engineer a DESIGN.md draft from a reference site or screenshot. Captures via `playwright-capture.mjs`, runs an extract-mode prompt (description, not scoring), emits a DESIGN.md draft for user review.
- **`--sync [--write]`** — show drift between code (CSS vars, Tailwind config, font imports) and DESIGN.md. Three categories reported: undocumented (in code, not declared), orphaned (declared, not used), drifted (different values). With `--write`, patches DESIGN.md to match code.

Hard contract: vibe NEVER touches JSX structure, routing, data flow, or layout grid. Only tokens (color, type, depth, motion) + DESIGN.md sections 1, 2, 3, 6, 7. If a pivot would need structural change, vibe stops and routes to `/qualia-polish --redesign`.

Supporting scripts:

- `skills/qualia-vibe/scripts/tokens.mjs` — `sync` (code↔DESIGN.md diff + patch) and `propose-variants` (LLM prompt scaffold). Pure utility, no LLM call.
- `skills/qualia-vibe/scripts/extract.mjs` — capture orchestrator + extract-mode prompt scaffold. Pure utility, no LLM call.
- Reuses `skills/qualia-polish/scripts/playwright-capture.mjs`, `bin/slop-detect.mjs`, `agents/visual-evaluator.md`.

### New — `rules/one-opinion.md`

Codifies the EventMaster discipline (from a real session where the user pivoted aesthetic 3 times in one block and finally said `ANYTHING JUST CHANGE IT STOP ASKING`). Rule: when proposing a design decision the user has not already named, propose ONE opinionated direction with justification — never a menu. If rejected, ask what didn't fit and propose ONE replacement. Lazy-loaded by `/qualia-vibe`, `/qualia-polish` Stage 0, `/qualia-new` DESIGN.md step.

### Fixed — design-surface bugs from v6.0 audit

- **Viewport mismatch:** `/qualia-polish` SKILL.md Stage 4 said 1280px desktop. `agents/visual-evaluator.md`, `REFERENCE.md`, and `playwright-capture.mjs` all use 1440. Aligned to 1440.
- **slop-detect path in `loop.mjs`:** Was hardcoded to `C:\Users\hasan\.claude/bin/slop-detect.mjs` and silently skipped the gate if missing. Now searches `SLOP_DETECT_SCRIPT` env, `C:\Users\hasan\.claude/bin/...`, and the framework-relative path. Skip is now logged-on-miss, not silent.
- **`loop.mjs commit-fix` git identity:** Was failing on fresh clones with no global git config. Now sets `Qualia Polish Loop / polish-loop@qualia.solutions` inline so the commit works regardless.
- **Dead `/qualia-design` references:** `qualia-design/frontend.md` still listed `/qualia-design` as an active command — it was deleted in v4.5. Replaced with `/qualia-polish` and `/qualia-vibe`.
- **Bounce easing token contradicting design-laws:** `qualia-design/design-reference.md` shipped `--ease-spring: cubic-bezier(0.34, 1.56, …)` as a generic token — but `design-laws.md` §6 and `slop-detect.mjs` MED-BOUNCE-EASING ban that exact curve. Removed the token, replaced with a note explaining when (and only when) brand-register vibes can override the ban.
- **Stale "deferred to v5.2" in REFERENCE.md:** Multi-route and reduced-motion have been implemented for releases. Removed from the deferred list and replaced with an "aesthetic pivot belongs in /qualia-vibe" pointer.
- **Menu-of-options anti-pattern in `/qualia-polish` Stage 0:** Brief format listed `{editorial · brutalist · luxury · maximalist · …}` as options. Per `rules/one-opinion.md`, agent now proposes ONE direction inferred from PRODUCT.md. Pushback routes to `/qualia-vibe`, not to enumerating more.

### Changed — `bin/slop-detect.mjs`

- **Added banned fonts:** Montserrat, Poppins, Lato, Open Sans (already banned in `qualia-design/design-brand.md` but missing from the linter).
- **Added `--watch` flag:** Re-scan on file change with 200ms debounce. Watches tracked extensions (`tsx/jsx/ts/js/css/scss/html/svelte/vue/astro`). Makes slop-detect proactive instead of pre-commit only.
- **Broadened default scan paths:** Added `packages/` and `apps/` to the default roots (turbo / nx / pnpm-workspaces monorepo conventions).

### Surface counts

- **33 skills** (was 32). `/qualia-vibe` added.
- **8 rules** in `rules/` (7 always-loaded + 1 lazy-loaded). `rules/one-opinion.md` added (lazy-loaded by design-adjacent skills).
- Same 9 agents, same 12 hooks.

### Migration

- Run `npx qualia-framework@latest install` (or `migrate`) once. Pulls in `/qualia-vibe` and `rules/one-opinion.md`.
- `/qualia-vibe --extract` requires Playwright to be installed in the target project (same dependency as `/qualia-polish --loop`).
- `/qualia-vibe --sync` works on any project with `app/globals.css`, `src/app/globals.css`, or similar, and optionally `tailwind.config.{ts,js,mjs,cjs}`.
- No skill removed, no command renamed.

---

## [6.0.0] - 2026-05-17 (audit, cleanup, reliability)

A wide-surface audit pass. No new flagship feature — every change is a real bug, a silent failure surfaced, an outdated reference replaced, or a token-budget reduction. The framework is the same shape and the road commands behave exactly as before; what changed is that broken edges are now fixed.

### Fixed — uninstall and migrate left orphan files on disk

`cli.js` shipped a `QUALIA_HOOK_FILES` manifest listing 9 hooks but the framework ships 12. Uninstall left `env-empty-guard.js`, `supabase-destructive-guard.js`, and `vercel-account-guard.js` orphaned under `C:\Users\hasan\.claude/hooks/`. Same shape for agents: `QUALIA_AGENT_FILES` was missing `visual-evaluator.md`. And `cmdMigrate()` `requiredBashHooks` was missing the same 3 hooks, so users on `qualia-framework migrate` ended up with an incomplete hook set vs. those on a fresh `install`. All three manifests now match what ships.

### Fixed — silent catches in hooks

`auto-update.js` had two bare `catch {}` blocks (the npm-version fetch and the top-level wrapper) that swallowed every error type including ENOMEM and ETIMEDOUT. `pre-compact.js` had the same shape around the commit logic. Both now write to `C:\Users\hasan\.claude/.qualia-traces/` so failures are debuggable instead of vanishing. `env-empty-guard.js` was exiting 2 (BLOCK) on any unparseable stdin payload — which meant a malformed JSON from an unrelated tool call would block the user from running `vercel env`. Now allows on parse error and only blocks when it actually matched a `vercel env add` with an empty value.

### Fixed — phantom `rules/frontend.md` references

`CLAUDE.md`, `AGENTS.md`, and `skills/qualia-feature/SKILL.md` pointed at `rules/frontend.md` which has not existed since the design substrate moved to `qualia-design/` in v4.5. Agents loading these references hit a dead end. Now points at `qualia-design/frontend.md`. Also added `rules/architecture.md` (the deep-modules rule from v5.x) to the discoverable substrate list.

### Fixed — skill bugs that the registry never caught

- `/qualia-learn` declared `Read, Write, Edit, Glob, Grep` in `allowed-tools` but its process calls `node C:\Users\hasan\.claude/bin/knowledge.js` and `git add`. Without `Bash` the skill literally could not run its own instructions. Added.
- `/qualia-map` describes an `AskUserQuestion` Re-scan? prompt but did not declare the tool. Added.
- `/qualia-plan` Rule 2 said "Max 3 revision cycles" while the description and process said "max 2." Reconciled to 2 (matches the actual revision-loop code).
- `/qualia-postmortem` had `skills/qualia-design/SKILL.md` in its design-regression lookup table — that path has not existed since the polish skill consolidated design work. Now points at `qualia-polish` + `qualia-design/design-laws.md`.

### Fixed — agent tool frontmatter gaps

`agents/planner.md` referenced `mcp__context7__*` tools but did not declare them in frontmatter; same for `agents/qa-browser.md` and Playwright MCP. Both agents were unable to call the tools their process described. Both frontmatters updated.

### Fixed — hardcoded `/tmp` paths

`agents/verifier.md` drift audit wrote to `/tmp/used-tokens` and `/tmp/declared` (Windows-incompatible, symlink-attackable on multi-user systems). Now uses `mktemp` with cleanup. `agents/qa-browser.md` dev-server log goes to `${TMPDIR:-/tmp}/qualia-dev-server-$$.log` instead.

### Changed — `tests/run-all.sh` replaces the `&&`-chain test orchestrator

`npm test` used to chain 8 suites with `&&`, so the first failure aborted everything else and you only ever saw the failure of the earliest-failing suite. New `tests/run-all.sh` runs every suite, collects failures, and prints which suites failed at the end. Also stripped silent `|| true` from `slop-detect.test.sh` so genuine slop-detect crashes can no longer pass the suite invisibly.

### Changed — `rules/trust-boundary.md` extracts duplicated security block

Builder, planner, verifier, and visual-evaluator each carried a ~150-token inline copy of the trust-boundary block (~600 tokens duplicated across the four agents). Extracted to `rules/trust-boundary.md`; agents reference it with one line and add the role-specific reporting shape. Net: ~500 tokens saved per phase that spawns the full agent set, plus a single canonical place to update the rule.

### Removed — stale version stamps from user-facing skill surfaces

`/qualia-road` had four "v4.5.0+" / "v5.0+" / "v5.1+" / "v5.3+" headings; removed. `/qualia-new` headings stamped `(v5.0 — REQUIRED)` / `(v4.5.0 OKLCH-first)`; removed. `/qualia-flush` had a "deferred to v4.3.0" caveat that has long since been fixed in `knowledge.js`; updated to reflect current behavior. Similar cleanups in `/qualia-polish`, `/qualia-verify`, `/qualia-milestone`, `/qualia-hook-gen`, `/qualia-feature`. `/qualia-feature` description no longer mentions the removed `/qualia-quick` and `/qualia-task`. Stale `<!-- v5.9: -->` comments in agent headers stripped.

### Archived — pre-v4 CHANGELOG entries

Moved v2.x and v3.x release notes (851 lines) to `docs/archive/CHANGELOG-pre-v4.md`. Main `CHANGELOG.md` now ends at v4.0.0 with a pointer to the archive. The active changelog dropped from 2726 to 1875 lines.

### Fixed — `templates/help.html` drift

Showed "28 skills" (actual 32) and was missing entries for `/qualia-hook-gen`, `/qualia-issues`, `/qualia-road`, `/qualia-triage`, `/qualia-zoom`, `/zoho-workflow`. Added. `docs/onboarding.html` version-stamped `v5.5`; bumped to v6.0.

### Test posture

489 tests still passing on the full suite. No tests removed; one test (em-dash detection) tightened to also assert exit code, not just message presence. Test runner is now fail-collect, not fail-fast, so future regressions in early suites do not hide later regressions.

### Migration notes (v5.9.x → v6.0.0)

- Run `npx qualia-framework@latest install` (or `migrate`) once. The migrate path now wires the three v5.0 hooks (`vercel-account-guard.js`, `env-empty-guard.js`, `supabase-destructive-guard.js`) that earlier migrate runs missed.
- If you had a previous uninstall leave orphan hook files, re-run `npx qualia-framework@latest uninstall` to clean them up cleanly.
- No skill removed; no command renamed; no API change.

---

## [5.9.2] - 2026-05-16 (hook ordering + ERP payload fixes)

**Two production bugs that were silently corrupting state.** Neither was caught by tests because both required specific runtime conditions to reproduce — a blocked push in one case, a fresh project with no session_started_at stamp in the other. Both surfaced from real session traces, not synthetic testing.

### Fixed — pre-push.js no longer orphans a bot commit when the push is blocked

- **Root cause:** Claude Code PreToolUse hooks run *in parallel*, not in declared order. `pre-push.js` (stamps `tracking.json` and creates a bot commit) and `branch-guard.js` (blocks non-OWNER pushes to main/master) both fire on `git push *`. When `pre-push` ran and `branch-guard` exited 2, the bot commit was already in the local branch — orphaned, sitting around to be shipped on the next push to a feature branch.
- **Fix:** `pre-push.js` now self-gates with a `wouldBeBlocked()` mirror of `branch-guard`'s checks (role from config + refspec parse + current-branch fallback). If the push would be blocked, it skips `commitStamp()` entirely and exits 0. `branch-guard` still produces the user-facing block message via its own exit-2.
- **Why not just declare ordering?** Claude Code hook config doesn't expose execution-order priorities for PreToolUse. The only safe primitive is self-gating. When v6.0 extracts the shared runtime, both hooks call one `wouldBeBlocked()` from `lib/`.

### Fixed — qualia-report ERP payload no longer 422s on empty datetimes

- **Root cause:** The payload builder coalesced missing `session_started_at` and `last_pushed_at` to `''` via `t.session_started_at||''`. The ERP validator (Pydantic-style) accepts missing-Optional but rejects empty-string-as-datetime → HTTP 422 on every fresh project, never-pushed branch, or brand-new session.
- **Fix:** Conditional spread in the payload object — `...(t.session_started_at?{session_started_at:t.session_started_at}:{})` — drops the key entirely when the value is empty. ERP accepts the missing-Optional cleanly. Applied to both fields.
- **Verified:** Manual retry without the empty datetime keys succeeded with HTTP 200 in the session that caught the bug.

### Files changed

- `hooks/pre-push.js` — added `wouldBeBlocked()` and early-exit
- `skills/qualia-report/SKILL.md` — payload builder uses conditional spreads
- `package.json`, `README.md`, `guide.md` — version bumped to 5.9.2
- `CHANGELOG.md` — this entry

### Carries forward from v5.9.1

Demo-first gate at kickoff, AskUserQuestion-only mode, single free-text question, hard hand-off to `/qualia-discuss`.

---

## [5.9.1] - 2026-05-11 (qualia-new — demo-first gate, AskUserQuestion everywhere)

**Targeted UX fix for the kickoff flow.** Observed a session where `/qualia-new` opened with a free-text "tell me what you want to make" prompt, then drifted into ad-hoc clarification questioning ("What does the SaaS DO?") before ever reaching the Demo vs Full gate. That's both spec violation and bad UX — the shape gate drives the entire downstream question set, so it must come first.

### Changed — qualia-new step ordering

- **Step 1 is now the Demo/Full/Quick gate** via `AskUserQuestion`. It is the literal first interaction with the user — before "what are you building". Banner-only Step 0 stays; the next thing the user sees is the project-shape picker.
- **Step 3 is the only free-text question** in the kickoff flow: a single one-line pitch, accepted as-is even if broad ("a SaaS platform" is a valid answer). No clarification round, no ad-hoc questioning.
- **Step 4 hand-off to `/qualia-discuss` is now a hard rule.** "The next tool call after Step 3 must be `/qualia-discuss`. No free-form follow-up." Discovery depth is the discuss skill's job — not improvised.
- All downstream steps renumbered (old Step 2 → 5, etc.). Internal references updated.

### Changed — qualia-new Rules section

- New Rule 1: Project type is the first question, period — even before "what are you building".
- New Rule 2: `AskUserQuestion` for every discrete-choice question; free-text only for Step 3.
- New Rule 3: No ad-hoc clarification questioning between Step 3 and `/qualia-discuss`.
- Demo non-negotiables (Rule 6) made explicit: 1 milestone, no mock data, real backend, real agent/platform functionality, DESIGN.md mandatory, focus on design + functionality. Speed never comes from mocking the backend.

### Changed — qualia-discuss PROJECT MODE

- P1 (project-type detection): when invoked standalone, uses `AskUserQuestion` (interactive UI) — never a plain-text prompt. When invoked by `/qualia-new`, skip the gate entirely (already locked upstream).

### Why

The screenshot evidence: a fresh `/qualia-new` session was free-form questioning the user before locking project shape. That violates the spec and produces shallow discovery — which then poisons every downstream phase. Reordering puts the shape gate first (where it always belonged) and tightens the rules so no future session can ad-hoc-clarify its way past the structured interview.

---

## [5.9.0] - 2026-05-11 (Deep-research fixes — surface drift, ERP retry queue, model tiering)

**The "fix what the deep-research audit found" release.** Three independent wins
shipped together: every dead command reference on user-facing surfaces is gone,
the ERP report upload now has a real retry mechanism (not just a lying message),
and four structured agents move from inherited Opus to Sonnet for a substantial
cost cut with no flow change.

### Fixed — surface drift

- `rules/speed.md` no longer recommends `/qualia-quick` and `/qualia-task` (removed in v5.7). Now points at `/qualia-feature`.
- `templates/help.html` Quick Paths section no longer lists `/qualia-quick`, `/qualia-task`, `/qualia-design`. Replaced with `/qualia-feature` and `/qualia-polish`.
- `docs/onboarding.html` no longer lists `/qualia-quick`, `/qualia-task`, `/qualia-prd`, or `/qualia-polish-loop`. Updated to point at `/qualia-feature` and `/qualia-polish --loop`.
- `docs/playwright-loop-pilot-results.md` path references updated from `skills/qualia-polish-loop/` to `skills/qualia-polish/` (the v5.8.0 consolidation moved them; the historical pilot doc still pointed at the old location).
- New `tests/refs.test.sh` greps every active surface for backticked `/qualia-*` references and asserts each name maps to a shipped skill. Wired into `npm test`. Excludes historical surfaces (`docs/reviews/`, `docs/research/`, CHANGELOG) and migration-context prose ("Replaces /qualia-quick"). 10 references checked.

### Added — ERP report retry queue

- New `bin/erp-retry.js` script. Persistent queue at `C:\Users\hasan\.claude/.erp-retry-queue.json`. Replaces the v5.8.0 "will appear in ERP after retry" message which was misleading — no retry mechanism existed before this release.
- `skills/qualia-report/SKILL.md` Step 6 enqueues failed uploads (all 3 attempts exhausted) into the queue with the full payload, idempotency key, and last error. Local commit still happens first; the queue is only the cloud-sync mechanism.
- `hooks/session-start.js` drains up to 5 queued items quietly on every Claude Code launch (2.5s per-item timeout, 8s total budget, fire-and-forget).
- New CLI: `qualia-framework erp-flush [show|clear]`. Drains verbosely, lists current queue, or clears with backup. Useful after rotating the API key or when the ERP comes back online.
- Permanent failures (401, 422) and 10-attempt exhaustion mark the item `give_up: true` — it stays in the queue for visibility but is no longer auto-retried until the user runs `erp-flush` after fixing the underlying issue.

### Added — ERP payload contract completion

- `Idempotency-Key` header now sent with every report upload. Deterministic UUID-v5 hash of `(client_report_id, submitted_at, project)` so retries carry the same key. The ERP's documented 24-hour replay window protects against response-lost-mid-flight duplicates (`docs/erp-contract.md:42-49`).
- `session_duration_minutes` now computed from `tracking.json.session_started_at` to `submitted_at` and included in the payload. The ERP's example payload (`docs/erp-contract.md:93`) already expected this; the framework was silently omitting it.

### Changed — verifier strictness

- `/qualia-verify` now grep-checks the verification report for `INSUFFICIENT EVIDENCE` lines after the verifier returns. Any occurrence downgrades the verdict to FAIL. Closes the deep-research audit's #1 false-pass vector — the verifier was instructed to emit INSUFFICIENT EVIDENCE on tool-budget exhaustion, but the orchestrator was treating those as silent PASS.
- `agents/verifier.md` tool budget changes from fixed 25 calls to `max(25, task_count * 5)`. A 3-task phase still gets 25 calls; a 10-task phase now gets 50. The fixed budget was tight on phases with many tasks.

### Changed — model tiering (cost cut, zero flow risk)

- Four structured agents move to Sonnet via `model: sonnet` frontmatter:
  - `agents/verifier.md` — deterministic grep + score against criteria
  - `agents/plan-checker.md` — 11-rule structured checklist
  - `agents/roadmapper.md` — template-driven milestone decomposition
  - `agents/qa-browser.md` — mechanical browser interaction + finding capture
- `builder.md`, `planner.md`, `researcher.md`, `visual-evaluator.md` stay on inherited Opus where real architectural / vision / synthesis reasoning lives.
- `research-synthesizer.md` already used Haiku — unchanged.
- Net effect on a typical phase cycle (1 plan + 1-2 checker spawns + 1 verifier + 0-1 QA-browser): roughly 40% cost reduction without changing any prompts or skill flow.

### Fixed — progress bar

- `bin/state.js:332` progress formula was `(phase - 1) / total_phases` which meant a completed 3-phase project showed 66% forever and a 1-phase project showed 0%. Now factors in `verified|polished|shipped|handed_off` statuses so the bar reaches 100% when the project is actually done.

### Tests

- 472 assertions passing (up from 462). The 10 new assertions come from `tests/refs.test.sh`. All seven prior test suites continue to pass with the v5.9 changes.

### Migration notes

- No breaking changes. Skills, agents, hooks, state machine, and CLI are all backward-compatible.
- Existing installs upgrade via `npx qualia-framework@latest install`. After upgrade, the next `/qualia-report` failure will enqueue the report; the queue drains on the next session-start. Old reports stranded by v5.8.0 are not auto-recovered (they were never queued), but re-running `/qualia-report` for those days will succeed if the ERP is reachable.
- Cost-curious users can confirm the model tiering by running `qualia-framework agents --failed` after a phase verification — the `model` field on each spawn record will show `sonnet` for the four tiered agents.

## [5.8.0] - 2026-05-11 (Surface cleanup, polish-loop consolidation)

**The "stop shipping deprecated skills" release.** Removes the three skills
deprecated in v5.7.0 and consolidates `/qualia-polish-loop` into `/qualia-polish`
as a `--loop` flag. Skill count drops from 35 to 32.

### Removed

- **`/qualia-quick`** removed. Was deprecated in v5.7.0; use `/qualia-feature`,
  which auto-routes to the inline path for trivial work.
- **`/qualia-task`** removed. Was deprecated in v5.7.0; use `/qualia-feature`,
  which auto-routes to a fresh builder spawn for 1-5 file work.
- **`/qualia-prd`** removed. Niche surface that overlapped `/qualia-discuss`
  in PROJECT MODE (v5.6.0). Conversation-to-spec capture now lives in
  `/qualia-discuss` for kickoff and in regular phase-context docs for
  mid-project additions.

### Changed

- **`/qualia-polish-loop` consolidated into `/qualia-polish --loop`**. The
  autonomous visual-polish loop is now a flag on `/qualia-polish`, not a
  separate skill. Scripts moved from `skills/qualia-polish-loop/scripts/`
  to `skills/qualia-polish/scripts/`; fixtures and REFERENCE.md follow.
  Visual evaluator agent description updated to point at the new surface.
  The seven-scope table in `/qualia-polish` gains a "Loop" row.

### Migration notes

- Most workflows update by find-and-replace: `/qualia-polish-loop` becomes
  `/qualia-polish --loop`. Flag syntax (`--brief PATH`, `--max N`,
  `--viewports`, `--ref PATH`, `--budget N`, `--reduced-motion`,
  `--routes`) is preserved.
- `/qualia-quick`, `/qualia-task`, `/qualia-prd` are gone with no shim.
  Projects still typing these will see a "command not found" path. The
  v5.7.0 deprecation warnings were the migration window.
- README and guide.md reflect the new skill count (32) and v5.8 framing.

### Tests

- `tests/bin.test.sh` updated: polish-loop path assertions now target
  `skills/qualia-polish/`. Pass labels renamed. Added v5.8 cleanup
  assertions confirming non-existence of `qualia-quick`, `qualia-task`,
  `qualia-prd` and presence of `qualia-feature`.

## [5.7.0] - 2026-05-11 (Feature consolidation, /qualia-feature)

**The "one command instead of three for everything between a typo and a phase"
release.** Replaces the `/qualia-quick` + `/qualia-task` split with a single
auto-scoped `/qualia-feature` command. The old commands stay functional for one
minor-version migration window so the ~40 active projects on prior versions
don't break overnight.

### Added

- **`/qualia-feature` skill** (`skills/qualia-feature/SKILL.md`). Auto-scopes
  the work into one of three buckets:
  - **inline**: typo, comment edit, 1-line config change, single rename. Direct
    work in the current Claude context, no subagent spawn.
  - **spawn**: add a component, add a route, fix a non-trivial bug, refactor
    one module. Fresh builder spawn with atomic commit and validation contract.
  - **refuse**: 5+ files or multi-step workflow. Routes to `/qualia-plan`
    instead of trying to fit a phase into a single-task slot.

  Escape hatches: `--force-spawn` and `--force-inline` flags override the
  classifier when it guesses wrong. The interactive gate also offers
  "Force inline", "Force spawn", and "Route to /qualia-plan" options.

### Changed

- **`/qualia-quick` and `/qualia-task` marked deprecated**
  (`skills/qualia-quick/SKILL.md`, `skills/qualia-task/SKILL.md`). Both still
  work as before for v5.7.x. They print a one-line deprecation warning and
  end with "use /qualia-feature next time" instead of the plain end banner.
  Removal scheduled for v5.8.0.

- **Primary-surface references updated**. The road skill, the install banner,
  and the session-start tip now point at `/qualia-feature` as the canonical
  single-feature path. Old references to `/qualia-quick` are gone from those
  primary surfaces (the deprecated skills themselves still self-document).

### Migration notes

- Existing projects don't break. `/qualia-quick` and `/qualia-task` still run
  end-to-end with the same behavior they had in v5.6.0; the only change is the
  deprecation warning on entry.
- The classifier is intentionally confident. When in doubt, it picks `spawn`
  (one fewer surprise than guessing `inline` and contaminating the current
  context). Use `--force-inline` for the over-scoped cases.
- v5.8.0 will remove `/qualia-quick` and `/qualia-task` entirely. Plan to
  switch primary usage to `/qualia-feature` during the v5.7.x window.

## [5.6.0] - 2026-05-11 (Demo vs Full Project, mandatory discovery)

**The "every project starts with the right kickoff shape" release.** Splits the
project workflow into two paths at the very first fork: demo (single
shippable milestone for sales conversations) versus full project (multi-milestone
arc to Handoff). Makes the kickoff interview mandatory and structured, not an
ad-hoc free-form chat. Surfaces a clean conversion path when a demo client signs.

### Added

- **Step 0.6 Project Type Gate** in `skills/qualia-new/SKILL.md`. Asks Demo vs
  Full Project as the first decision after the brownfield check. Every
  downstream step (research scope, journey shape, milestone count) branches
  on this answer. Demo design philosophy is enforced: real backend always,
  DESIGN.md mandatory, slop-detect hard-block. Speed comes from skipping
  multi-milestone planning, never from skipping design quality or mocking the
  backend.

- **PROJECT MODE in `/qualia-discuss`** (`skills/qualia-discuss/SKILL.md`).
  Two-mode skill now. With no args, runs the non-technical kickoff interview
  (8 questions for demo, 14 for full project), captures answers verbatim to
  `.planning/project-discovery.md`. With a phase number arg (e.g.
  `/qualia-discuss 2`), runs the existing technical pre-plan grilling
  unchanged. The PROJECT MODE rule "never go technical here" preserves the
  client's own phrasing as input to PRODUCT.md voice and CONTEXT.md glossary.

- **Mandatory discovery in `/qualia-new` Step 1**. Replaces the free-form
  deep-questioning loop with an inline invocation of `/qualia-discuss` in
  PROJECT MODE. The discovery doc seeds PROJECT.md, PRODUCT.md, CONTEXT.md,
  and (full projects only) JOURNEY.md milestone names.

- **`templates/project-discovery.md`**, the new discovery document template.
  Demo path covers §1-§8 (pitch, users, "remember 24h later" sentence,
  anti-references, brand voice, success criterion, hard constraints, out of
  scope). Full project adds §9-§14 (milestone arc, compliance, integrations,
  content ownership, post-handoff team, budget/timeline shape).

- **Demo-Extension Branch in `/qualia-milestone`** (`skills/qualia-milestone/SKILL.md`).
  When a demo project closes its only milestone, asks "did the client sign?".
  On yes: invokes `/qualia-discuss` for the §9-§14 top-up, then spawns the
  roadmapper in `extend-demo-to-full` mode to add M2..M{N-1} plus Handoff,
  with M1 untouched because it shipped. On no: closes the demo as a shipped
  artifact and routes to `/qualia-report`.

- **`<scope>quick</scope>` in researcher agents** (`agents/researcher.md`,
  `agents/research-synthesizer.md`). Demo projects pass `quick` scope; each
  researcher gets a 3-call budget instead of 8. The synthesizer produces a
  single-milestone suggestion (no Handoff, no multi-milestone arc). Total
  research time drops roughly 3x with no loss of correctness on the demo
  path. The depth was wasted when there's only one milestone to ship.

- **`project_type` frontmatter** in `templates/project.md`. Stored as
  `project_type: demo | full`. The milestone-close branch reads it to decide
  whether to fire the demo-extension question.

### Changed

- **`/qualia-discuss` description and routing.** Description now documents
  both modes. The skill picks mode based on whether an arg is passed (no
  arg = PROJECT MODE, numeric arg = PHASE MODE). All existing PHASE MODE
  behavior is preserved unchanged.

- **`/qualia-new` Step 8 research scope** now branches on `PROJECT_TYPE`.
  Demo projects pass `<scope>quick</scope>` to all 4 researchers and the
  synthesizer; full projects use the standard 8-call budget per researcher.

- **`/qualia-new` Step 10 roadmapper output** now branches on `PROJECT_TYPE`.
  Demo: 1 milestone (the demo itself, 2-4 phases), no Handoff, fully detailed.
  Full: standard 2-5 milestone arc ending in Handoff.

### Migration notes

- Projects on v5.5 or earlier do not have `project_type` in their PROJECT.md.
  The milestone-close branch treats missing `project_type` as `full` and
  skips the demo-extension question. Backward-compatible.
- Existing in-flight projects don't need to re-run discovery. The mandatory
  interview only fires at `/qualia-new` kickoff for net-new projects.
- `/qualia-discuss N` (phase-mode usage) is unchanged. Existing scripts and
  team habits keep working.

## [5.5.0] - 2026-05-09 (Plan-discipline pass)

**The "stop the LLM from quietly simplifying the spec" release.** Pre-execution
discipline upgrades that catch the most common failure modes (silent scope
reduction, missing requirement coverage, decision drift) before the builder
spawns and burns context. Synthesised from a deep research pass across six
external coding-agent frameworks; only the patterns with clear leverage and
no ceremony tax were inherited.

### Added

- **Scope-Reduction Prohibition** in `agents/planner.md` and `agents/builder.md`.
  Banned phrases (`v1`, `simplified version`, `hardcoded for now`, `will be
  wired later`, `stub`, `placeholder`, etc.) plus three legitimate split
  reasons (context cost over 50%, missing info, dependency conflict). LLMs
  systematically simplify specs; this is a zero-token-cost guardrail in
  steady state that targets the #1 quality failure mode.

- **Decision Coverage Audit** in `agents/planner.md`. Planner verifies that
  every `D-NN` row from `.planning/phase-{N}-context.md` is covered by a task
  before returning the plan. Closes the discuss → plan → verify → ship
  traceability loop.

- **Auto-heal loop in builder Self-Verify** (`agents/builder.md`). On `tsc`
  or `slop-detect` failure, fix and retry up to 2x before BLOCKED. Moves
  correctness checks from post-hoc verifier to in-builder self-heal,
  saving a verifier round per failure.

- **Plan-checker Rule 9: Decision Coverage** (`agents/plan-checker.md`).
  Reads `.planning/phase-{N}-context.md`; BLOCKS if any `D-NN` is unclaimed
  by the plan, or if a `Deferred Ideas` row is being implemented.

- **Plan-checker Rule 10: Scope Reduction Detection**. Greps the plan for
  banned phrases; BLOCKS with a quoted citation. Exception is the project's
  own product versioning (e.g. `migrate to API v2`).

- **Plan-checker Rule 11: Requirement Coverage**. Reads ROADMAP.md for
  per-phase REQ-IDs; BLOCKS if any REQ-ID listed for the current phase is
  not referenced by any task.

- **`findScopeReductionPhrases()` in `bin/plan-contract.js`**. The same scan
  runs on the JSON contract path (`task.action`, `task.acceptance_criteria`)
  so both paths catch the same failure mode. Exported for reuse.

### Changed

- **`/qualia-discuss` output format** (`skills/qualia-discuss/SKILL.md`).
  Locked Decisions now carry stable `D-NN` IDs in a four-column table
  (`ID | Decision | Rationale | Source`). Downstream agents reference these
  IDs in commit messages and task Why fields for traceability.

- **`templates/phase-context.md`** gains an `ID` column on the Locked
  Decisions table.

### Removed

- **9 build-time engineering archive docs** (~140KB) referenced only from
  CHANGELOG: `install-redesign-builder-prompt.md`, `install-redesign-pilot.md`,
  `instruction-budget-audit.md`, `journey-demo.html`, the four
  `playwright-loop-*` engineering notes (the active `pilot-results.md`
  stays), `polish-loop-supervised-run.md`, and the matching archived
  session report.

### Tests

- New regression: `tests/lib.test.sh` covers scope-reduction detection on
  both `task.action` and `task.acceptance_criteria` (16 passing, was 15).
- Total suite: **491 passing across 7 suites**, no regressions.

### Notes

- Plan-checker now covers 6 of 7 industry-standard goal-backward dimensions.
  Per-task context budget enforcement was intentionally skipped (heuristic,
  false-positive prone, low signal); the existing Quality Degradation Curve
  in `rules/grounding.md` covers the prompt-side hint.
- No public API changes. Skill and agent prompt deltas are additive; existing
  plans without `D-NN` IDs or REQ-IDs in ROADMAP.md continue to pass (Rules
  9 and 11 are conditional on those artifacts existing).

## [5.4.0] — 2026-05-07 (Token-discipline + grounding pass)

**The "less tokens, no quality loss" release.** Driven by a re-study of
Matt Pocock's *Skills and Strategies for Real Engineering*, Patrick
Debois's *Context is the New Code*, Karpathy on Software 3.0, and Mario
Zechner on agentic search. Eight PRs landed:

### Added

- **`rules/architecture.md`** — deep modules (Ousterhout), locality
  over DRY, adapters at seams, layered service boundaries, interface
  stability, test-the-seam-not-the-function. Auto-loaded only on
  architectural-judgment tasks.

- **`rules/speed.md`** — CLI-first / MCP tier-list rule. Default to
  CLI; reach for MCP only when the CLI doesn't expose the operation
  or there's no CLI alternative. Per-MCP guidance for the 10+ MCP
  servers we use. The `/supabase` skill (replacing 32 supabase MCP
  tools) is the canonical pattern.

- **`docs/instruction-budget-audit.md`** — anchors the discipline. The
  ~22 KB-per-session leak from auto-loaded design rules is documented
  with cost breakdown and a relocation plan.

- **`tests/skills.test.sh`** (168 assertions) — smoke tests every
  `skills/*/SKILL.md`: frontmatter parses, name matches folder,
  description ≥ 50 chars, has trigger phrases (or `disable-model-
  invocation`), body has h1 + section. **Plus a cache-aware spawn
  audit:** every spawn to a custom `qualia-*` subagent must anchor
  the prompt with `@C:\Users\hasan\.claude/agents/{name}.md` so Anthropic's prompt
  cache reuses the prefix (documented 81–90% cost reduction).

- **`tests/slop-detect.test.sh`** (9 assertions) — behavioral tests
  for the AI-tells gatekeeper. Verifies em-dash detection (HIGH),
  banned-font detection (CRITICAL exits 1), purple-blue gradient
  detection (CRITICAL), JSON output, missing-path graceful exit.

- **NotebookLM-first research path** in `agents/researcher.md` and
  `/qualia-research`. Mandatory pre-flight: query `mcp__notebooklm-mcp__
  cross_notebook_query` and `~/qualia-memory` (via knowledge.js +
  qualia-recall) BEFORE any external Context7/WebFetch/WebSearch
  call. Local pre-flight is FREE (not counted against the 8-call
  external budget). Skip web round when local sources cover ≥ 80% at
  confidence ≥ MEDIUM. Estimated 60–80% reduction in research-phase
  tokens for `/qualia-new` and `/qualia-research` — the team has 21
  curated NotebookLM notebooks covering most domains we ship in.

- **Citation-enforcement preambles** in `agents/builder.md`,
  `agents/verifier.md`, `agents/plan-checker.md`, `agents/qa-browser.md`,
  `agents/researcher.md`, `agents/research-synthesizer.md`,
  `agents/roadmapper.md`. Every claim cites `file:line — "quoted"`,
  no hedging language (banned: "seems", "appears", "probably",
  "might", "likely", "possibly"), `INSUFFICIENT EVIDENCE` is the
  correct answer when tool-budget is exhausted. Closes the *Never
  Trust an LLM* gap surfaced by Pocock and Karpathy's *jagged
  intelligence* framing.

- **Trigger phrases** added to three previously-vague skill
  descriptions: `qualia-map` ("map this codebase", "brownfield
  setup"), `qualia-milestone` ("close milestone", "next milestone"),
  `qualia-research` ("best practices for X", "compare libraries").
  Skills now fire on natural-language requests, not just slash command.

### Changed

- **Design substrate relocated** from `C:\Users\hasan\.claude/rules/` (auto-loaded
  by Claude Code's harness on every session) to `C:\Users\hasan\.claude/qualia-design/`
  (load-on-demand via explicit `Read`). Six files affected:
  `design-laws.md`, `design-brand.md`, `design-product.md`,
  `design-rubric.md`, `design-reference.md`, `frontend.md`. **~22 KB
  of instruction budget recovered per session** for non-frontend work.
  Skills/agents that need the substrate `Read` it explicitly when they
  need it (already the pattern in `agents/builder.md` and
  `agents/verifier.md`). `bin/install.js` migrates legacy paths
  on next install.

- **`state.js cmdTransition`** split from a 195-line monolith into 7
  named helpers (`applyNoteOrActivity`, `applyPlannedTransition`,
  `applyBuiltTransition`, `applyVerifiedTransition`,
  `applyPolishedTransition`, `applyShippedTransition`,
  `commitTransitionAtomic`). Orchestrator now reads top-to-bottom in
  84 lines. Behavior preserved exactly — verified by all 59
  state.test.sh assertions.

- **Skill description boundaries sharpened** for the four
  picker-confusable pairs: `qualia-quick` vs `qualia-task` ("NO
  spawn" vs "FRESH builder spawn"), `qualia-road` vs `qualia-help`
  ("TERMINAL" vs "BROWSER HTML"). Picker now disambiguates correctly.

- **`rules/infrastructure.md`** Supabase guidance reconciled with the
  new CLI-first rule. Was: "MCP server is available for direct
  database operations". Now: "prefer `npx supabase` over MCP; reach
  for MCP only when CLI can't".

- **`README.md`** — three updates:
  - `## Don't run Claude's /init` warning at the top, directing users
    to `/qualia-new` (greenfield) or `/qualia-map` (brownfield) per
    Pocock's *Never run /init* — built-in `/init` generates bloated
    docs that rot and consume instruction budget.
  - `## What's Inside` — split rules section into 6 always-loaded
    rules (`rules/`) + 6 lazy-loaded design files (`qualia-design/`).
  - Skill listings now include `/qualia-flush`, `/qualia-postmortem`,
    `/zoho-workflow` (previously installed but undocumented).

- **`SESSION_REPORT.md` + `V4_REVIEW.md`** moved to `docs/archive/`.
  Historical artifacts; git history preserves them.

### Test surface

| Group | Assertions |
|---|---:|
| statusline | 14 |
| state | 59 |
| hooks | 66 |
| bin | 146 |
| lib | 15 |
| skills (new) | 178 |
| slop-detect (new) | 9 |
| **Total** | **487** |

### Source attribution (research basis)

- Matt Pocock — *Skills and Strategies for Real Engineering with
  Claude Code* (13-source NotebookLM): citation discipline,
  instruction-budget rule, deep modules, never-run-/init, never-trust-
  an-LLM.
- Patrick Debois — *Context is the New Code*: CDLC, eval pillar.
- Andrej Karpathy — *Software 3.0 / Vibe Coding to Agentic
  Engineering*: jagged intelligence, verifiable intelligence.
- Mario Zechner — *Tokens*: agentic search, context rot.
- Plus 12 sources in *Context and Tools: Mastering the AI Engineering
  Lifecycle* on RAG, agent harnesses, voice agents, CLI vs MCP.

## [5.3.0] — 2026-05-05 (Matt Pocock gaps)

**The "absorb the missing patterns" release.** A re-study of Matt
Pocock's published skills repo and Claude-Code-for-Real-Engineers
content surfaced three patterns Qualia hadn't yet absorbed: the
PRD-from-conversation flow, the parallel-interface-alternatives pattern
in deep-module refactoring, and the instruction-budget-to-hook
generator. v5.3 ships all three. Most of Matt's other patterns
(CONTEXT.md, ADRs, slim CLAUDE.md, /qualia-discuss = grill, /qualia-test
--tdd, /qualia-issues = to-issues, /qualia-zoom = zoom-out, /qualia-debug
= diagnose, /qualia-optimize --deepen ≈ improve-codebase-architecture)
were already in v5.x.

### Added

- **`/qualia-prd`** — synthesize the current conversation into a
  durable PRD at `.planning/PRD-{slug}.md`. Optionally opens a parent
  GitHub issue. No interview — just synthesis. Pairs with
  `/qualia-issues` to break the PRD into vertical-slice issues.
  Distinct from `/qualia-plan` (phase-operational) — `/qualia-prd` is
  feature-durable. Distinct from `/qualia-new` (one-shot project
  setup) — `/qualia-prd` runs every time a new feature needs a spec.
  Forked subagent for synthesis: full conversation context flows into
  the fork, only `{path, summary}` flows back to the parent session.
  Token discipline preserved.

- **`/qualia-hook-gen`** — convert a CLAUDE.md or rules/*.md
  instruction into a deterministic Claude Code `pre-tool-use` hook.
  Three patterns: block (exit 2 with message), rewrite (block with
  alternative), warn (exit 0 with stderr message). Generates
  `hooks/block-{name}.js` (pure Node, cross-platform — no `.sh`) and
  the `settings.json` patch. Tests the hook before committing. After
  install, surfaces the now-redundant CLAUDE.md line so the user can
  trim instruction budget. Refuses non-deterministic rules
  (stylistic / judgment-based) — recommends a skill or ESLint rule
  instead. Closes the gap between Matt's "instruction-budget
  discipline" advocacy and actually shrinking real-project CLAUDE.md
  files.

- **Step 5b: Parallel Interface Design (Wave 3)** in
  `/qualia-optimize --deepen` — after the strategist returns
  deepening candidates and the user picks one, spawn 3 fan-out agents
  IN THE SAME RESPONSE TURN, each producing a *radically different*
  interface design (variant 1 = functional/data-oriented, variant 2 =
  OOP/encapsulated, variant 3 = event-driven/message-based). Present
  the 3 alternatives in a comparison table; user picks 1, 2, 3, or
  hybrid. Then a synthesizer writes the Refactor RFC to
  `.planning/REFACTOR-{slug}.md` honoring the user's pick. From
  Matt's improve-codebase-architecture skill — produces dramatically
  better refactor RFCs than a single-pass proposal. ~15K tokens per
  candidate (cached prefix shared across the 3 spawns).

- **9 new tests** (bin.test.sh #135-143): qualia-prd installs,
  describes synthesis flow, documents fork-based token discipline;
  qualia-hook-gen installs, documents block/rewrite/warn patterns,
  mandates pure-Node hooks; qualia-optimize Step 5b parallel-interface
  is documented; qualia-optimize REFERENCE.md has the spawn template;
  package.json version assertion accepts 5.3.x.

### Changed

- **`skills/qualia-optimize/SKILL.md`** — adds "Step 5b: Wave 3 --
  Parallel Interface Design" section. Triggers in `--deepen` mode
  only after candidate selection.
- **`skills/qualia-optimize/REFERENCE.md`** — adds the verbatim
  "Parallel interface design prompt" with per-variant lens
  assignments and output contract (5 numbered sections per variant).
- `package.json` version bumped to 5.3.0.

### Honest carryover (still deferred)

- **CLAUDE.md slimming to 1 line** (Matt's "you are on WSL on
  Windows" pattern) — Qualia's CLAUDE.md is multi-tenant team-aware
  with role substitution. Can't go to 1 line without losing role
  injection. Wait until install.js can inline role into a session
  prompt instead of a global file. v5.4+ candidate.
- **`user-invocable: false` frontmatter convention** — small
  marking that says "this skill is invoked by other skills, not
  users." Low impact, fold into v5.3.x patch.
- **Graybox-locking pattern in /qualia-test** — when refactoring
  a deep module, lock the interface with comprehensive tests.
  Educational extension, fold into /qualia-test's TDD docs in
  v5.3.x.
- **"What-to-do / supporting-info" structured sections** in
  SKILL.md — Matt's recent authoring convention. Fold into
  `/qualia-skill-new` template in v5.3.x.

### Why these changes

The Matt-Pocock NotebookLM study surfaced exactly what we'd missed.
v5.0 absorbed the philosophy (instruction-budget discipline, alignment
substrate, deep modules); v5.1 shipped the visual-polish loop; v5.2
hardened it. v5.3 closes the remaining patterns gap so Qualia is at
parity with Matt's published toolkit while still carrying its own
flagship contributions (visual-polish loop, multi-target install,
state-machine project lifecycle, ERP integration, the 8-dimension
design rubric, the Karpathy raw-to-wiki memory layer).

Tests: 291 (v5.2) → **300 (v5.3)**. All passing. slop-detect clean
on all v5.3 changes.

## [5.2.0] — 2026-05-05 (Polish-loop reliability)

**The "close the v5.1 deferrals" release.** v5.1 shipped the autonomous
visual-polish loop (`/qualia-polish-loop`) with three named deferrals in
the CHANGELOG: the `prefers-reduced-motion` forced-capture flag, multi-
route sweeps, and the first real-project supervised run. v5.2 closes all
three. The loop is now production-ready against multi-page sites and
honors user a11y intent at capture time.

### Added

- **`--reduced-motion`** flag on `playwright-capture.mjs` and
  `loop.mjs init`. Forces `prefers-reduced-motion: reduce` in the
  captured page. Implemented for both backends — Playwright's
  `newContext({ reducedMotion: 'reduce' })` and Chromium's
  `--force-prefers-reduced-motion` CLI flag. State records
  `state.reduced_motion: true` so the vision evaluator knows to score
  motion on CSS-declaration quality only (not penalize "no animation
  visible"). Closes v5.1 §5g adversarial deferral.
- **`--routes URL1,URL2,URL3`** flag on `loop.mjs init`. Multi-route
  mode. State stores both `state.url` (first URL, for backward compat
  with single-route SKILL.md drivers) and `state.urls` (full list).
  Orchestrator drives capture+eval per URL each iteration; aggregate
  scores are min across URLs and viewports. The kill-switch fingerprint
  set is shared across all URLs — a regression on any route halts the
  loop. Closes v5.1 §"Multi-route sweeps" deferral.
- **`docs/polish-loop-supervised-run.md`** — write-up of the first
  supervised end-to-end run. Captures real wall-clock time, token
  estimates, both flag combinations exercised, what worked, what
  surprised. Removes the "first real-project supervised run not done"
  caveat from v5.1's CHANGELOG.
- **6 new tests** (tests #129-134 in `bin.test.sh`) covering: `--routes`
  multi-route init, `state.url` first-entry backward compat,
  `--reduced-motion` flag recording, capture --help documents
  `--reduced-motion`, init rejects missing `--url`/`--routes`, report
  renders multi-route header.

### Changed

- **`scripts/loop.mjs report`** — when `state.urls.length > 1`, the
  header renders `**URLs (N):** url1, url2, ...` instead of single
  URL. Reduced-motion mode renders an extra `**Reduced motion:**
  forced` row.
- **`scripts/loop.mjs init`** — accepts either `--url` or `--routes`
  (one is required, `--routes` wins if both given). Records
  `state.reduced_motion` for downstream capture invocations.
- `package.json` version bumped to 5.2.0.

### Honest caveats

- Multi-route mode requires the SKILL.md driver to loop the
  capture+eval per URL each iteration. The state-machine primitives
  (`init`, `record`, `commit-fix`, `report`) are URL-agnostic, but the
  orchestrator (Claude session) has to invoke them N times per
  iteration where N is `state.urls.length`. The SKILL.md guidance for
  multi-route is documented in `loop.mjs --help` and the v5.2
  supervised run write-up.
- `--reduced-motion` on the chromium-binary backend uses Chrome's
  `--force-prefers-reduced-motion` flag which has been stable since
  Chrome 87 (2020). Older browsers may ignore it; Playwright's
  `reducedMotion: 'reduce'` is more reliable when both backends are
  available.
- Pixel-similarity reference-image comparison still deferred to v5.3.
  The `--ref` flag remains rubric-anchored (the evaluator looks at
  both screenshots and scores against the rubric). True
  structural-similarity comparison needs an embedding step that's
  outside the scope of this release.

### Tests

274 (v5.0) → 285 (v5.1) → **291 (v5.2)**. All passing. slop-detect
clean (0 critical) on all v5.2 changes.

## [5.1.0] — 2026-05-03 (Multi-target install + live-progress redesign)

**The "first impression matters" release.** Every Qualia user — Fawzi,
Hasan, Moayad, Rama, Sally, future hires — meets the framework first
through `npx qualia-framework install`. v5.0's installer was functional
but minimal: silent for 5 seconds, then a wall of green checkmarks. v5.1
turns the install into a polished, intentional document: live progress on
every operation, per-section timing, and a target-selection prompt that
acknowledges Qualia ships AGENTS.md (the open standard adopted by Codex,
Cursor, Continue, Aider, Devin) and meets users wherever they edit.

The root cause this addresses: silence reads as a hung process. When the
installer copies 33 skills + 12 hooks + 24 templates and prints nothing
between section headers and the final summary, the user wonders if their
laptop froze. Live updates tell them the framework is alive and working
through the list. Visual feedback is trust.

### Added

- **Multi-target install** — after the team-code prompt, the installer
  asks: install to Claude Code (`C:\Users\hasan\.claude/`), OpenAI Codex
  (`~/.codex/`), or both. Default is `1` (Claude Code only) so legacy
  scripts keep working untouched. `2` writes only `~/.codex/AGENTS.md`
  with role substitution; `3` does both. Codex CLI is detected via
  `which codex`; if absent, the installer warns and writes the file
  anyway so the user is set up for when they install Codex.
- **Live-progress lifecycle** — every meaningful copy operation prints a
  `⏳ doing...` line that overwrites in place to `✓ done` when the op
  completes. Long-running ops (settings.json merge, recursive template
  copy) show a Braille-pattern spinner. Sub-50ms ops skip the "doing"
  state and go straight to `✓` to avoid noise.
- **Per-section summaries** — each install phase (Skills, Agents, Rules,
  Hooks, Templates, etc.) closes with a `└─ N items · Xs` line showing
  the count and elapsed time. The final summary card adds rows for
  **Targets** (Claude Code · Codex · Both) and **Time** (total install
  duration), plus a contextual "first command to try" hint that
  recommends `/qualia` if a `.planning/` folder exists in the current
  directory and `/qualia-new` otherwise.
- **`bin/qualia-ui.js` extended** — exports `step()`, `spinner()`,
  `progress()`, `box()`, `kv()`, `divider()`, `section()`,
  `sectionClose()` for require-side consumption from `install.js` and
  any future CLI work. The existing CLI dispatch (`node qualia-ui.js
  banner` etc.) is preserved — gated behind `require.main === module`
  so importing the file doesn't trigger argv parsing.
- **`docs/install-redesign-pilot.md`** — captured output of all three
  install scenarios (Claude only, Codex only, Both), timing
  measurements, and the TTY-degradation verification.

### Changed

- **`bin/install.js`** — same semantic install logic as v5.0 (skills,
  agents, hooks, rules, templates, knowledge layer, ERP config,
  settings.json merge with backup) wrapped in the new live-progress
  primitives + section timing. Backward compatible: a piped install
  with only the team code (`echo "QS-FAWZI-11" | npx qualia-framework
  install`) still completes correctly and defaults to Claude only.
- **`bin/qualia-ui.js`** — module is now require-able (gated CLI
  dispatch) and exports the new primitives alongside an OKLCH-tinted
  color palette. Color discipline preserved: teal/green/dim/white from
  v5.0; errors stay red, warns stay yellow.
- **`package.json`** — `files` array adds `AGENTS.md` so the Codex
  install can read the framework copy at install time (it was already
  shipped in source but excluded from the published tarball).
- **`tests/bin.test.sh`** — adds 11 tests for v5.1: target=1/2/3 paths,
  legacy single-line backward compat, Codex AGENTS.md backup before
  overwrite, no redundant backup on identical re-install, non-TTY log
  cleanliness (no orphan `\r` / hide-cursor / clear-line escapes),
  summary card shows Targets+Time, qualia-ui exports check, qualia-ui
  CLI dispatch still works, package.json version bump assertion.

### Honest caveats

- **Codex install scope in v5.1: AGENTS.md only (superseded by v6.2.7).** Codex's runtime did not
  then consume Claude-style skills/hooks/agents on disk in a way
  the framework can map 1:1 (Codex agents use a `.toml` format and a
  different hook schema). AGENTS.md carries the rules — the open
  standard Codex / Cursor / Continue / Aider / Devin all read — and
  commands continue to route through Claude Code. If Codex grows
  skill/hook support that lines up, the framework will extend the
  Codex install path here without breaking AGENTS.md compat.
- **Spinner cosmetics on `cmd.exe`.** Modern Windows Terminal renders
  Braille frames fine. Older `cmd.exe` may render them as boxes; the
  install still completes correctly. The non-TTY (piped) path skips
  spinners entirely and prints plain `✓` lines.
- **Total install time shown in seconds.** On modern hardware the entire
  install completes in ~100–300ms, so the Time row often shows `0.1s`
  or `0.2s`. Not a bug — the framework is just fast.
- **Two readline races avoided.** v5.1's first implementation had a
  subtle bug: between `await askCode()` and `await askTarget()`, EOF
  on piped stdin emitted `'close'` before the second `question()`
  could attach a line listener — `target` always defaulted to `1`
  even when the user piped `CODE\n2\n`. Fixed by pre-buffering all
  stdin lines synchronously when the input is non-TTY. Documented here
  so future contributors don't reinvent the bug.

### Why these changes

A boring install signals a boring framework. v5.0 was functional; v5.1
is the version Fawzi can demo to a client and have them say "this feels
like a product." The Codex addition is strategic: AGENTS.md adoption
across Codex / Cursor / Continue / Aider / Devin means Qualia rules can
follow the user across vendors without forking the framework. v5.1 makes
that explicit, opt-in, and one keystroke away (`2` or `3`).

Hooks/skills/agents stay Claude-only because Claude Code is where the
framework's automation lives. AGENTS.md is the rule layer; the rest is
the engine.



## [5.0.0] — 2026-05-03 (Visual-Polish Loop addendum)

**The "see your own work" addition** to the v5.0.0 release.
Adds `/qualia-polish-loop`, the autonomous visual-polish loop that
screenshots a live URL at three viewports, scores against the
8-dimension `rules/design-rubric.md` using a vision-anchored evaluator,
fixes the top issues, and loops until every dimension scores 3 or the
kill-switch trips. Closes the design-iteration churn friction documented
in Fawzi's `/insights` data (the #1 strategic workflow opportunity from
v5.0's hardening audit).

The root cause this addresses: the framework's design QA was text-only.
`slop-detect` grep-scans CSS for known anti-patterns. The verifier
scores design by reading TSX/CSS. Both miss visual failures that only
show on a rendered page — hero-video framing on mobile, breakpoint
collapse, spacing rhythm, motion presence. `/qualia-polish-loop` is the
first Qualia skill that actually looks at what the browser draws.

### Added

- **`/qualia-polish-loop`** — new flagship skill. CLI:
  `/qualia-polish-loop {url} [--brief PATH] [--max 8] [--viewports 375,768,1440] [--budget 100000]`.
  Pre-flight gates check substrate, brief, browser backend, URL
  reachability, working-tree cleanliness, and token budget before any
  capture runs. Each iteration: capture (3 viewports) → spawn the
  vision evaluator → record the verdict → spawn 1-3 fix-builders in
  parallel → commit each fix with `qpl-{N}:` prefix → loop. Stops on
  SUCCESS (all 8 dims 3, no critical issues), KILL on regression
  (same issue fingerprint 3 consecutive iterations), KILL on budget,
  KILL on max iterations.
- **`agents/visual-evaluator.md`** — new agent role. Vision-anchored,
  rubric-inlined, JSON-output-contract. Defaults to score 3
  (acceptable); only deviates with cited evidence. Aggregate score is
  the MINIMUM across viewports per dimension — a layout that's elegant
  on desktop but breaks at 375px is a fail. Trust-boundary block
  refuses prompt injection from inlined project files.
- **`skills/qualia-polish-loop/scripts/playwright-capture.mjs`** —
  capture helper. Auto-selects backend: `import('playwright')` first,
  then cached `~/.cache/ms-playwright/chromium-*` binary, then
  `google-chrome` / `chromium` on PATH. No npm dependency required if
  any Chrome-family binary is already on disk.
- **`skills/qualia-polish-loop/scripts/loop.mjs`** — deterministic
  state-machine orchestrator. Subcommands: `init`, `record`, `status`,
  `commit-fix`, `report`. State persists in JSON outside the LLM
  context (iteration counter, fingerprints, fixes, verdict). The
  `commit-fix` subcommand runs `slop-detect` first; critical findings
  block the commit and the fix-builder must retry.
- **`skills/qualia-polish-loop/scripts/score.mjs`** — pure scoring
  utility. Takes 8 dimension scores, computes pass/fail per the rubric
  formula. Pipe-friendly. Used by the orchestrator and reusable for
  ad-hoc scoring.
- **`skills/qualia-polish-loop/fixtures/clean.html`** — synthetic
  well-designed page for self-test Scenario 1 (Fraunces + JetBrains
  Mono, OKLCH palette, varied work-grid layout, fluid clamp() spacing,
  reduced-motion respected, 65ch line lengths).
- **`skills/qualia-polish-loop/fixtures/broken.html`** — synthetic
  deliberately-bad page for self-test Scenario 2. Hits Inter font,
  blue-purple gradient, gradient text, three identical cards, side-stripe
  border, generic CTAs, max-width:1280, em-dash, outline:none — the
  full slop suite.
- **`docs/playwright-loop-pilot-results.md`** — self-test results across
  the 3 mandated scenarios with screenshots, scores, iteration counts,
  token measurements.
- **`docs/playwright-loop-design-notes.md`** — 1-page integration notes:
  how /qualia-polish-loop relates to /qualia-polish, when to use which,
  what's deferred to v5.2.

### Changed

- **`bin/install.js`** — recursively copies `scripts/` and `fixtures/`
  subfolders from each skill (was: only `SKILL.md` + `REFERENCE.md`).
  Required so `qualia-polish-loop` can ship its Node helpers and HTML
  test fixtures alongside the skill.
- **`skills/qualia-road/SKILL.md`** — already mentions
  `/qualia-polish-loop` (added in the v5.1-prep commit).
- **`tests/bin.test.sh`** — adds 5 install assertions for the new skill,
  agent, and `scripts/` subfolder copying.
- `package.json` stays at 5.0.0 — polish-loop folded into the same v5.0 release window per Fawzi's "all v5, not v5.1" call.

### Honest caveats

- The vision evaluator runs as a Claude Agent spawn, NOT a separate
  vision-API call. Token cost per iteration is ~14.5K (3 PNG reads +
  rubric + brief + previous-iteration delta). The 100K budget cap covers
  ~6-7 iterations comfortably; 8 needs `--budget 150000`.
- Capture defaults to dev-localhost. Vercel-preview mode is opt-in
  (`--deploy preview`) and slower (~30-60s/iter for the deploy).
- Chromium-only — same precedent as `qualia-polish` Stage 4. Cross-
  browser visual diffs are deferred to v5.2.
- One URL per invocation. Multi-route sweeps require chaining the loop
  per route. Deferred to v5.2.

### Why these changes

Insights from `/insights` data (122 sessions, 292 commits, 10 days)
identified design-iteration churn as the #1 recurring friction pattern.
Quotes from the transcripts: "many frustrating iterations" on hero
videos, "FUCK U / I CHANGED THE PAGE SO U STOP LYING" when Claude
described unchanged screens. The root cause is that Claude could not
see what the browser actually drew — only what was in the source. Every
fix that didn't show up was a fight.

`/qualia-polish-loop` makes Claude look. Three viewports per iteration,
real screenshots, vision-anchored scoring, deterministic kill-switch
when the loop oscillates. It's the first Qualia skill where the agent
can verify its own work end-to-end without a human in the visual loop.



## [5.0.0] — 2026-05-03

**The "alignment discipline + insights-driven hardening" release.**
Inspired by Matt Pocock's [skills](https://github.com/mattpocock/skills)
repo and [Claude Code for Real Engineers](https://www.aihero.dev/cohorts/claude-code-for-real-engineers-2026-04),
with a hardening pass driven by Fawzi's actual `/insights` data (122
sessions, 292 commits, 10 days) and a 6-agent deep-research audit of
the framework codebase.

Misalignment is the #1 failure mode in AI coding — vague plans become
shipped bugs, terms overload across phases, decisions drift between
sessions. v5.0 introduces an alignment substrate (CONTEXT.md domain
glossary, decisions/ ADR folder), slims the global instruction budget
per Matt's strongest claim ("LLMs realistically hold 300–500 instructions;
bloating CLAUDE.md hamstrings every spawn"), folds grilling/deepening/TDD
into existing skills, adds three small new skills for the autonomous
loop (zoom, issues, triage), AND ships three insights-driven hooks
(Vercel account verification, empty env-var guard, Supabase destructive-
command guard) that prevent the documented top friction patterns
deterministically. All existing skills remain. No substitution.

**Honest delta from earlier v5 drafts:** the deep-research audit caught
real issues introduced by my own v5 work (dead `/qualia-grill` references
in the road, a new prompt-injection surface from inlining CONTEXT.md
into agent spawns, gh CLI heredoc shell injection in qualia-issues +
qualia-triage). Those are all fixed before release.

### Added

- **`templates/CONTEXT.md`** — domain glossary template seeded by
  `/qualia-new` from the discovery questioning. Loaded by every road
  agent BEFORE PROJECT.md and DESIGN.md. Each term has a one-sentence
  definition and an `Avoid:` list of rejected synonyms. Updated inline
  by `/qualia-discuss` as decisions crystallize. Killer of the "wait,
  what do you mean by *user*?" round-trips that waste tokens and surface
  bugs late.
- **`templates/decisions/ADR-template.md`** — Architecture Decision
  Record template. Created sparingly: only for hard-to-reverse,
  surprising-without-context, real-tradeoff decisions. Cargo-culting
  ADRs ruins the signal. `/qualia-discuss` writes them when triggered.
- **`/qualia-zoom`** — 50-line user-fired-only skill
  (`disable-model-invocation: true`). Maps an unfamiliar code area in
  domain-glossary terms — modules, callers, dependencies, smallest safe
  edit window. Used 50× a day in mature projects. Doesn't propose
  changes — just orients.
- **`/qualia-issues`** — Externalize a phase plan to GitHub as
  independent vertical-slice issues with `needs-triage` label. Each
  issue is demoable end-to-end (schema → API → UI → tests),
  dependency-ordered. Uses CONTEXT.md domain language in titles.
  Externalized work means parallel humans, parallel sessions, or
  autonomous agents can pull from the queue.
- **`/qualia-triage`** — State machine over the open issue queue:
  `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human`
  / `wontfix`. Optionally routes `ready-for-agent` issues into
  autonomous `/qualia-build` runs. Together with `/qualia-issues` this
  is the autonomous-loop unlock — agent pulls from backlog, builds,
  verifies, closes, picks next.
- **`/qualia-road`** — Discoverable workflow map (every command, when
  to use it, how phases chain). Lives in `skills/qualia-road/SKILL.md`
  so the agent loads it on demand instead of carrying the road in the
  global system prompt. Trigger phrases: "how does Qualia work",
  "what's the workflow", "show me the road", "what command does X".
- **`docs/reviews/matt-pocock-skills-analysis.md`** — Deep analysis of
  Matt's repo and the alignment-discipline framing, with the original
  15-change proposal and the rationale for each accepted/rejected fold.

### Changed

- **`CLAUDE.md` slimmed from 88 lines to ~22.** The Road, Quality
  Gates, Context Isolation, Compaction, and prose explanations all
  moved out of the global system prompt. They now live in
  `/qualia-road` (discoverable) and the hooks (deterministic
  enforcement). Per Matt's strongest claim: LLMs realistically hold
  300–500 instructions; everything in CLAUDE.md burns budget on every
  spawn. Steering rules belong in skills (loaded on relevant tasks) or
  hooks (enforced deterministically), not in CLAUDE.md.
- **`AGENTS.md` slimmed identically** — multi-vendor mirror (Codex,
  Cursor, Continue, Aider, Devin) of CLAUDE.md. Same content, same
  size, cross-tool compatibility.
- **`/qualia-discuss` upgraded with grilling pattern.** Was passive
  "capture decisions"; now actively grills: one question at a time,
  proposes a recommended answer with each, walks every branch of the
  decision tree until resolved. Updates CONTEXT.md inline as terms
  crystallize. Writes ADRs only for hard-to-reverse decisions. Auto-
  creates CONTEXT.md from template if missing. Same job (write
  `phase-{N}-context.md`), much more powerful interview.
- **`/qualia-optimize` gained deepening pillar.** New `--deepen` mode
  spawns the architecture strategist with Ousterhout vocabulary
  (depth, locality, leverage, seam, deletion test). The Wave 2
  architecture-strategist prompt now includes deepening lens for full
  mode too. Reads CONTEXT.md and decisions/ as substrate. Refuses
  "extract a helper function" candidates that don't pass the deletion
  test — adding shallow modules is the disease, not the cure.
- **`/qualia-test` gained `--tdd` mode.** Vertical-slice
  red→green→refactor loop. Anti-pattern: writing all tests first then
  all impl (horizontal). Correct: one test → one minimal impl → repeat.
  Test through public interface only. Never refactor while red. Each
  cycle is a commit.
- **`/qualia-map` gained onboarding adapter.** New 5th parallel agent
  detects existing issue tracker (GH/GL/local), labels (mapped to
  canonical roles), domain docs (CONTEXT.md/glossary location), and
  existing CLAUDE.md/AGENTS.md. Writes `.planning/agents/{tracker,
  labels, domain}.md` adapter config. APPENDS (never overwrites)
  agent-skills block to existing CLAUDE.md/AGENTS.md. Brownfield
  projects now get Qualia capabilities without losing their existing
  process.
- **`/qualia-new` emits CONTEXT.md and decisions/.** New Step 5a
  copies the templates and seeds the glossary from questioning
  answers (terms the user repeatedly used → glossary entries with
  `Avoid:` lines). Required for every new project — domain glossary
  is the single highest-leverage piece of substrate.
- **`/qualia-report` tightened from 299 → 240 lines.** Hasan and
  Moayad will not get stuck on it. Improvements: empty-day handling
  (asks the employee what they did instead of forcing a fake report),
  structured synthesis template (verb list + 3-6 bullet format,
  blocker discipline), graceful pre-flight (no STATE.md / no git → soft
  warnings only, never blocks), git-push failure handling (exit code
  check, never silently fails), encouraging closing message ("You can
  clock out now. See you tomorrow."), self-service common-errors
  table for permission-denied/network/auth issues. ERP payload
  preserved verbatim — `client_report_id` (QS-REPORT-NN), full
  milestones[], build_count/deploy_count/deployed_url for tree
  rendering, 3-attempt retry with 1s/3s/9s backoff, 401/422 permanent-
  failure handling. The ERP connection stays beautiful: every payload
  field the portal needs is populated, every error path is actionable.

### Hardening pass (insights-driven hooks, security, instruction-budget)

Added after the deep-research audit. Each item maps to a documented
friction pattern in Fawzi's `/insights` report or a security/integrity
issue surfaced by the 6 specialist agents.

**New hooks (insights-driven friction prevention)**

- **`hooks/vercel-account-guard.js`** — PreToolUse on `vercel --prod*` /
  `vercel deploy*`. Verifies active Vercel account against
  `C:\Users\hasan\.claude/.vercel-allowed-teams` (one team slug per line, mode 0600).
  Fail-OPEN when config is missing (don't block legit deploys when the
  user hasn't set the allowlist yet); fail-CLOSED when the active team
  doesn't match an allowed entry. Prevents the documented "wrong Vercel
  account redeploys" friction.
- **`hooks/env-empty-guard.js`** — PreToolUse on `vercel env*`. Detects
  `vercel env add NAME ""` / `''` / trailing-`=` patterns and blocks
  with a clear message. Escape: `QUALIA_ALLOW_EMPTY_ENV=1`. Prevents
  the documented "empty env vars on production" incident.
- **`hooks/supabase-destructive-guard.js`** — PreToolUse on `supabase*` /
  `npx supabase*`. Blocks `supabase db reset`, `supabase db push --force`,
  `supabase migration repair`. Escape: `QUALIA_ALLOW_DESTRUCTIVE=1`
  (shared with git-guardrails). Prevents the documented "DB wipe leaves
  orphan rows" incident.

**State machine + reliability**

- **`state.js cmdInit` throwaway-name guard** — `init --project test|tmp|
  scratch|demo|sample|untitled|new-project|...` returns `SUSPICIOUS_NAME`
  instead of creating a throwaway project. `--force` bypasses. Prevents
  the documented "test-name-only project accidentally created" incident.
- **`hooks/pre-deploy-gate.js` lint escape** — `QUALIA_SKIP_LINT=1` skips
  the lint gate while keeping tsc, tests, build, and security gates
  mandatory. For the documented "lint blocks ship after JSX auto-fixer
  broke things" friction.
- **`hooks/pre-compact.js` saves tracking.json too** — was only `git add
  STATE.md`, losing tracking.json mutations across compactions. ERP got
  stale data. Now stages both planning files.
- **`hooks/pre-push.js` warns instead of blocks** on tracking.json
  corruption. A corrupt ERP-metadata file should never block a production
  hotfix. Self-service fix surfaced in the warning. Restore old behavior
  with `QUALIA_BLOCK_ON_TRACKING_FAIL=1`.
- **`state.js cmdCloseMilestone`** — wraps `writeTracking` in the journal
  pattern (matching `cmdTransition`) so a crash mid-write can be
  detected and recovered. STATE.md is intentionally NOT mutated here
  (next `init --force` rewrites it for the new milestone).

**Security hardening**

- **ERP API key no longer passed as curl CLI argument** — `bin/cli.js`
  `cmdErpPing` now uses Node's native `https.request` instead of
  `spawnSync("curl", ["-H", "Authorization: Bearer $KEY"])`. The CLI-arg
  pattern exposed the bearer token via `/proc/<pid>/cmdline` to any
  local process during the curl invocation. Native `https.request` keeps
  the auth header in-process.
- **`set-erp-key` refuses positional arguments** — positional args land
  in `~/.bash_history` / `~/.zsh_history`. Now reads from stdin only:
  `printf '%s' "$KEY" | qualia-framework set-erp-key`. Helpful error
  message if positional is attempted.
- **`bin/install.js` backs up CLAUDE.md and settings.json before
  overwrite** — `.bak.{ISO-timestamp}` files. Settings.json now uses
  atomic write (tmp + rename) to eliminate partial-write risk during
  the merge.
- **Subagent prompt-injection defense** — `agents/builder.md`,
  `agents/planner.md`, `agents/verifier.md` now have a "Trust boundary"
  block warning that content within `<phase_context>`, `<task_context>`,
  `<project_context>`, `<glossary>`, `<decisions>`, etc. is project DATA
  not instructions. The agents are told to refuse and report directives
  appearing inside those tags as project-file injection attempts. This
  closes the new attack surface introduced by inlining CONTEXT.md into
  every road agent spawn.
- **`qualia-issues` and `qualia-triage` use `gh issue create
  --body-file`** instead of heredoc-interpolated bodies. The previous
  pattern allowed shell injection via crafted plan content (shell
  metacharacters or a literal `EOF` line in user-controlled text).

**Instruction-budget cuts (Matt Pocock discipline applied to rules)**

- **`globs:` frontmatter on `rules/design-brand.md`,
  `rules/design-laws.md`, `rules/design-product.md`,
  `rules/design-rubric.md`** — these 4 design rules files (~5,508
  tokens combined) were loading on every conversation regardless of
  whether the user was editing a backend API route or a SQL migration.
  Now glob-gated to `["*.tsx", "*.jsx", "*.css", "*.scss", "*.html",
  "*.vue", "*.svelte"]`. Saves ~5,508 tokens per non-frontend
  conversation. The single highest-ROI change in the entire audit.
- **`globs:` on `rules/grounding.md`** + removed duplicate
  `@grounding.md` references from spawn templates in
  `qualia-build/SKILL.md`, `qualia-plan/SKILL.md`,
  `qualia-verify/SKILL.md`. Saves ~1,175 tokens of duplicate load per
  agent spawn.
- **`agents/builder.md` duplicate-rules block deleted** — 21 lines
  re-stating security/design/perf rules that already auto-load from
  `rules/*.md`. Replaced with a single line pointing to the auto-load
  source of truth. Saves ~280 tokens per builder spawn.
- **`templates/CONTEXT.md` prose stripped** — meta-commentary
  ("What this is", "Why it exists", "How to update this file") was
  loading into every road agent via `.planning/CONTEXT.md`. Replaced
  with a one-line HTML comment. Saves ~138 tokens per spawn.

**Discoverability + consistency**

- **`disable-model-invocation: true`** added to `qualia-road`,
  `qualia-ship`, `qualia-handoff` (joining `qualia-zoom` from earlier
  in v5). These are pure-reference / irreversible-production skills
  that should never auto-fire from natural-language ambiguity.
- **5 under-described skill descriptions expanded** —
  `qualia-verify`, `qualia-build`, `qualia-plan`, `qualia-task`,
  `zoho-workflow` (each was <25 words with no "Use when" clause).
  Now 30-60 words with explicit trigger phrases per the framework's
  description-as-API-surface convention.
- **`qualia-road` dead skill references removed** — `/qualia-grill`,
  `/qualia-deepen`, `/qualia-tdd`, `/qualia-onboard` were listed as
  commands but were folded into existing skills. Replaced with the
  actual folded locations (`/qualia-discuss`, `/qualia-optimize
  --deepen`, `/qualia-test --tdd`, `/qualia-map`).
- **`templates/CONTEXT.md` `/qualia-grill` reference removed** — same
  fold, same dead reference, same fix.
- **README.md and guide.md updated to v5** — version, skill count
  (32), hook count (12), template count (24), v5 changes summary.

### Test coverage (+34 new tests, 226 → 260)

19 v5-specific tests added in Wave B and 15 hardening-pass tests
added in Wave C. Coverage now includes: CONTEXT.md install,
decisions/ADR-template install, all 4 new skill folder installs,
qualia-discuss grilling reference, qualia-discuss CONTEXT.md
reference, qualia-road `disable-model-invocation`, qualia-road dead-
ref guard, CONTEXT.md template `/qualia-grill` guard, builder.md
trust-boundary block, qualia-issues `--body-file` (no heredoc
injection), 3 new hooks parse-validity + install, state.js
`next-report-id` (alloc + increment + --peek), state.js init
suspicious-name guard (3 cases), pre-deploy-gate `QUALIA_SKIP_LINT`
escape.

### Deferred to v5.1

- **SKILL.md / REFERENCE.md / scripts/ split** for skills > 200 lines
  (qualia-new at 487, qualia-optimize at 466, others 200–300). The
  pattern is correct per Matt's progressive-disclosure rule, but no
  precedent exists in the framework's loader behavior, and the v5.0
  test suite assumes single-file skills. Deferring is honest. The
  oversized skills are still cohesive and execution-essential —
  splitting will be a focused v5.1 project with loader-behavior
  testing.
- **Caveman-mode template** for in-flight subagent prompts (~25%
  token reduction × 50 builder spawns per project). Worth real money
  at scale. Deferred to keep v5.0 scope honest.
- **Autonomous visual-polish loop with Playwright MCP** — for the
  documented "design iteration churn" friction (5-10 manual rounds
  on hero videos, mobile layouts). The insights report's #1 strategic
  workflow opportunity. Substantial design work; v5.1.
- **Parallel lead-enrichment swarm** — multi-source confidence-scored
  merge for lead-gen pipelines. Insights report's #2 strategic
  opportunity. v5.1.

### Why these changes

Matt Pocock teaches that the bottleneck on AI-coding quality is not
the model — it's the alignment between human, agent, code, and
domain. Every skill in his repo fixes one alignment failure mode.
Qualia v4.5.0 was strong on execution machinery (phase/wave/task
hierarchy, fresh-context spawning, the verifier loop, the design
substrate) but treated alignment as a one-shot at `/qualia-new`.
v5.0 adds the alignment rituals that prevent decision drift between
phases: a domain glossary every agent reads, ADRs for hard-to-reverse
decisions, grilling that exposes vagueness before code is written,
deepening that fights shallow-module entropy, vertical-slice TDD that
keeps tests honest. Combined with Qualia's existing execution machinery
this is genuinely a different framework. The instruction-budget
discipline (CLAUDE.md slim) is the multiplier — every spawn now uses
its 300–500 instruction budget on the work, not on rules-it-already-knows.

## [4.5.0] — 2026-05-02

**The "Design as a thread" release.** Design stops being a final phase
and becomes a verification dimension every road agent honors. Informed
by deep research (UI-Bench, Refactoring UI, Anthropic frontend-design
skill, awesome-claude-design), the impeccable repo's vocabulary
(OKLCH, registers, scene sentence, second-order slop test), and 5
internal research agents.

### Added

- **`rules/design-laws.md`** — universal design rules both registers
  honor: OKLCH mandate, color strategy commitment scale, scene sentence
  for theme, absolute bans (gradient text, side-stripe borders,
  glassmorphism default, hero-metric template, identical card grids,
  modal-as-first-thought), no em-dashes, second-order slop test, single
  icon family rule, container depth max 2.
- **`rules/design-brand.md`** — Brand register (marketing, landing,
  portfolio): distinctiveness is the bar. Reflex-reject aesthetic lanes.
  Pre-code design brief (direction, color strategy, scene sentence,
  differentiation). Banned display fonts. Allowed visual flourishes
  (gradient meshes, noise, parallax signature motion).
- **`rules/design-product.md`** — Product register (app UI, admin,
  dashboards): earned familiarity is the bar. Reference-app anchoring.
  Density target table (comfortable / standard / compact / ultra-compact).
  Per-component rules (buttons 3 variants max, tables tabular numerals,
  empty states require icon + context + action).
- **`rules/design-rubric.md`** — 8-dimension anchored 1-5 scoring used
  by verifier and `/qualia-polish --critique`. Default to 3 (= ships).
  Score below 3 fails the phase, same as functional bug.
- **`templates/PRODUCT.md`** — REQUIRED at /qualia-new (v4.5.0+). Users,
  brand voice, register, anti-references (mandatory 3-5), strategic
  principles, differentiation. Substrate every road agent loads.
- **`templates/DESIGN.md`** — Rewritten OKLCH-first. Mandatory direction
  block (aesthetic, color strategy, scene sentence, differentiation).
  Token-driven components. Anti-pattern checklist auto-runnable.
- **`bin/slop-detect.mjs`** — Standalone CLI scanner. ~17 anti-pattern
  rules across critical / high / medium / low. Exit 1 on critical
  blocks commit. No AI required. Builders run pre-commit.
- **`/qualia-polish` rewritten as scope-adaptive** — six modes:
  Component (~30s) | Section (~3m) | App (~12m) | Redesign (~30m) |
  Critique (read-only) | Quick (~1m). Stage selection follows from
  scope. Mandatory preflight gates (PRODUCT, DESIGN, slop-detect).
- **Vision-loop architecture** for Redesign scope: webapp-testing skill
  + 3-viewport matrix (375/768/1280) + anchored rubric prompt + 2-iter
  hard cap with regression-stop.

### Changed

- **`agents/planner.md`** — Inputs add product_context, design_spec,
  design_substrate. Task template adds **Design:** field (required for
  any .tsx/.jsx/.css task) with register, tokens used, scope, anti-
  pattern guard line.
- **`agents/plan-checker.md`** — New Rule 7b: frontend tasks must have
  Design field with valid register, non-empty token list, no raw hex.
  Greps plan for absolute-ban patterns and rejects.
- **`agents/builder.md`** — Self-verify step 4 mandatory: slop-detect
  on touched frontend files. Exit 1 BLOCKS commit. Rule 5 frontend
  standards rewritten to point at design substrate as source of truth.
- **`agents/verifier.md`** — Adds Design Verification block: slop-detect
  gate (Step A), 8-dim rubric scoring (Step B), drift audit (Step C).
  Combined phase verdict: functional AND slop-detect AND rubric pass.
- **`/qualia-new`** — Adds Step 5b (PRODUCT.md generation, 5 questions,
  required) and rewrites Step 7 (DESIGN.md OKLCH-first with mandatory
  4-line direction commit).
- **`bin/cli.js`** — QUALIA_BIN_FILES adds slop-detect.mjs.
  QUALIA_RULE_FILES adds design-laws / design-brand / design-product /
  design-rubric. Help text removes /qualia-design, adds /qualia-polish.
- **`bin/install.js`** — slop-detect.mjs copied to C:\Users\hasan\.claude/bin and
  chmodded executable. New rules + PRODUCT.md template auto-picked up
  by directory walks.
- **`CLAUDE.md` + `AGENTS.md`** — Road updated: design described as a
  thread through every phase, not just Handoff Phase 1. /qualia-polish
  six modes documented.

### Removed

- **`/qualia-design`** skill — its surface area is fully covered by
  `/qualia-polish` modes. Help text and references purged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

---

## [4.4.0] — 2026-04-28

**The "Plan as Data + Agent Telemetry" release.** Lays the substrate for deterministic verification and per-spawn observability. Skill rewiring lands in 4.5.

### Added

- **`bin/plan-contract.js`** — JSON plan contract validator (zero deps, ~150 LOC). Replaces ad-hoc markdown re-parsing. Schema in `docs/plan-contract.md`. Four verification check types (`file-exists`, `grep-match`, `command-exit`, `behavioral`); behavioral evidence is structured (`{path, matcher?, description}`), blocking vibes-based passes at the schema level.
- **`bin/agent-runs.js`** — append-only JSONL telemetry writer (`.planning/agent-runs.jsonl`). OTel GenAI-aligned field names. 14-code closed `failure_reason` enum. Side log files only on failure. Spec in `docs/agent-runs.md`.
- **`qualia-framework agents`** — reader CLI. Flags: `--failed`, `--task <id>`, `--phase <n>`, `prune --before YYYY-MM-DD`.
- **`docs/plan-contract.md`** + **`docs/agent-runs.md`** — committed v1 specs with locked design decisions.
- **Drift detection:** `source_plan_hash` field on contracts; `plan-contract.checkDrift()` flags when the markdown plan diverges from its compiled contract.
- **Privacy:** `QUALIA_TELEMETRY=off` disables agent-runs writes (reads still surface history).
- `tests/lib.test.sh` — 15 cases covering both libraries.
- `qualia-framework set-erp-key` for saving/enabling the ERP API key without manually editing `C:\Users\hasan\.claude/.erp-api-key`.
- Targeted shell test scripts in `package.json` (`test:state`, `test:hooks`, `test:bin`, `test:lib`, `test:statusline`, `test:shell`); `npm test` runs the full shell gate.

### Changed

- `migrate` now wires the full v4.3 hook set, including `git-guardrails.js`, `pre-compact.js`, and the `Stop` event.
- `migrate` help text updated — no longer says "v2 to v3."
- README/help docs now match the current package counts: 28 skills, 9 hooks, 8 agents, 6 rules, 21 templates.
- `auto-update` caches failed npm lookups so offline registry checks do not add a timeout to every Bash command.
- `install.js` copies `plan-contract.js` and `agent-runs.js` into `C:\Users\hasan\.claude/bin/`; `doctor` checks both.

### Fixed

- State mutators now fail loudly with `STATE_LOCK_TIMEOUT` instead of proceeding without `.planning/.state.lock`.
- `pre-push` now blocks when tracking sync cannot be committed instead of letting a stale ERP state push through silently.
- `pre-compact` detects untracked `.planning/STATE.md` before compaction.
- `pre-deploy-gate` surfaces the last gate output lines on failure instead of hiding root cause behind a generic block message.
- `stop-session-log` reads `tracking.total_phases` and still supports legacy `phase_total`.
- CLI analytics now reads top-level trace fields (`verification`, `gap_closure`) written by `state.js`.
- Stale tests reconciled with v4.3 behavior: retired `block-env-edit`, PreToolUse exit code 2, forced milestone close tests, opt-in ERP key setup.

### Changed

- `migrate` now wires the full v4.3 hook set, including `git-guardrails.js`, `pre-compact.js`, and the `Stop` event.
- README/help docs now match the current package counts: 28 skills, 9 hooks, 8 agents, 6 rules, and 21 templates.
- `auto-update` caches failed npm lookups so offline registry checks do not add a timeout to every Bash command.

### Fixed

- State mutators now fail loudly with `STATE_LOCK_TIMEOUT` instead of proceeding without `.planning/.state.lock`.
- `pre-push` now blocks when tracking sync cannot be committed instead of letting a stale ERP state push through silently.
- `pre-compact` detects untracked `.planning/STATE.md` before compaction.
- `pre-deploy-gate` surfaces the last gate output lines on failure instead of hiding root cause behind a generic block message.
- `stop-session-log` reads `tracking.total_phases` and still supports legacy `phase_total`.
- CLI analytics now reads top-level trace fields (`verification`, `gap_closure`) written by `state.js`.
- Stale tests were reconciled with v4.3 behavior: retired `block-env-edit`, PreToolUse exit code 2, forced milestone close tests, and opt-in ERP key setup.

## [4.3.0] — 2026-04-26

**The "Compound + Self-Healing" release.** Five sequenced phases (#9–#13 on GitHub) shipped in one window, scoped from the 2026-04-25 NotebookLM deep-dive on Anthropic's subagent upgrade, Karpathy's LLM knowledge bases, Cole Medin's parallel-worktrees playbook, and the mattpocock skills directory. Closes 11 of the 12 top-priority findings from the v4.1.0 audit. The framework now (a) compounds across every session through an automated memory layer, (b) heals itself when the verifier catches a gap, and (c) blocks destructive git operations universally.

### Added

#### Memory layer (Karpathy raw → wiki, end-to-end automated)

- **`hooks/stop-session-log.js`** — Stop hook seeding the **raw tier**. Appends one mechanical line per turn to `C:\Users\hasan\.claude/knowledge/daily-log/{YYYY-MM-DD}.md` (project, branch, phase, task counts, commit count, top-3 touched files). Rate-limited 5min, skipped on no activity, never blocks.
- **`bin/knowledge.js`** — Unified memory-layer loader. Subcommands: `load <file>` (with aliases `patterns`/`fixes`/`client` or any bare filename), `list`, `search <query>`, `append --type <pattern|fix|client> --title <T> --body <B>`, `path <file>`, `help`. Default invocation prints `index.md`. Subdirectory support: bare-name lookups auto-discover in `concepts/`/`connections/`/`daily-log/` if no top-level match exists; `concepts/foo` works as a qualified path; top-level wins on collision. Every command exits 0 on missing files with a `(no entries)` stub so skills can pipe output safely.
- **`/qualia-flush` skill** — The LLM job that promotes raw → curated. Reads recent `daily-log/*.md` (default 14-day window, configurable), groups by project, identifies recurring patterns/decisions, writes promotions via `knowledge.js append`. Conservative: single-occurrence entries stay raw until they recur. `--dry-run`, `--project NAME` supported.
- **`bin/knowledge-flush.js`** — Cron-runnable non-interactive `/qualia-flush` runner. Wraps `claude -p "/qualia-flush --days 7"` with a 5-minute hard cap and writes a structured JSONL audit log to `C:\Users\hasan\.claude/.qualia-flush.log`. Cron-spam-safe: missing CLI / empty daily-log → exits 0 with a logged skip; only true execution failures exit 1. Recommended cron: `0 3 * * 0 node C:\Users\hasan\.claude/bin/knowledge-flush.js >> C:\Users\hasan\.claude/.qualia-flush.log 2>&1`.
- **`templates/knowledge/{agents,index}.md`** — Karpathy meta-doc + index entry point. Installed once at `C:\Users\hasan\.claude/knowledge/`, never overwrites existing content. Closes v4.1.0 audit finding #3 ("11 of 14 knowledge files are invisible") by giving every agent one deterministic place to start.
- **Builder reads knowledge before writing code** (`agents/builder.md` §2b). New "Load Relevant Knowledge" section instructs the builder to call `knowledge.js` first. Hardcoded `cat` is forbidden — the loader is the only sanctioned path. Closes v4.1.0 audit finding #2 (the most-flagged miss).

#### Self-healing AI layer

- **`/qualia-postmortem` skill** — Cole Medin's pillar 5: "anytime we encounter a bug in a pull request, we don't just fix the bug, we fix the underlying system that allowed for the bug." After a verify FAIL, identifies which AI-layer file (`agents/X.md`, `rules/Y.md`, `skills/Z/SKILL.md`) should have caught the gap and proposes a surgical delta. Writes `.planning/phase-{N}-postmortem.md` for review. With `--apply`, edits the installed file and TODOs a framework-repo PR so the lesson survives reinstall. Promotes generalizable patterns to the knowledge layer. Conservative: max 3 deltas per postmortem.
- **`/qualia-verify --adversarial` flag** — Spawns a SECOND verifier in fresh context with an adversarial prompt ("find what's wrong, not what's right"). Auto-enabled for the Handoff milestone and any phase whose plan touches `auth|payment|migration|rls|service_role` files. Findings union with the cooperative pass; either pass finding CRITICAL or HIGH = phase FAIL. Mitigates the "kid grading their own homework" bias documented in the NotebookLM source.
- **`/qualia-verify` auto-invokes `/qualia-postmortem` on FAIL** before the gap-closure re-plan. The postmortem writes the report by default — no destructive AI-layer edits unless the user runs `--apply`.

#### Forked subagents

- **`CLAUDE_CODE_FORK_SUBAGENT=1`** in `C:\Users\hasan\.claude/settings.json` env block. Anthropic shipped forked subagents in 2026-04 to solve the "design subagent loses 50k tokens of nuance" failure mode. Forks inherit full conversation history + share the prompt cache. On by default for all installs.
- **`/qualia-design` prefers forks for batch fan-out** when the conversation contains design-taste context. Blank-context spawns still used for mechanical anti-pattern fixes.

#### Operational tooling

- **`hooks/git-guardrails.js`** — PreToolUse/Bash hook blocking destructive git ops universally (OWNER too): `git push --force`/`-f` to main/master, `git reset --hard` while on main/master, `git clean -fd[x]`, `git branch -D main|master`, `rm -rf .git`. `--force-with-lease` is allowed. Escape hatch: `QUALIA_ALLOW_DESTRUCTIVE=1`. Exits 2 with a clear reason and remediation suggestion. Inspired by `mattpocock/skills/git-guardrails-claude-code`.
- **`qualia-framework doctor`** (aliases: `health`, `health-check`) — Post-install diagnostic. Critical files, all 9 hooks present, knowledge layer initialized, `settings.json` hook wiring (SessionStart + PreToolUse + PreCompact + Stop), config metadata. Exits 0 if healthy, 1 with itemized issues. Inspired by davila7/claude-code-templates' `--health-check`.
- **`qualia-framework flush`** — Convenience CLI wrapper around `bin/knowledge-flush.js` for ad-hoc invocation. `qualia-framework flush --dry-run` previews what the next cron run would do.

### Changed

- **Hook count: 7 → 9.** Added `git-guardrails.js`, `stop-session-log.js`. New `Stop` event in `settings.json`.
- **`/qualia-learn` rewritten to use the loader.** Duplicate detection now goes through `knowledge.js search`. Append step uses `knowledge.js append --type pattern --title ...` — no manual ID generation, no shell-escaping concerns.
- **`/qualia-debug`, `/qualia-plan`, `/qualia-new`, `/qualia-review` migrated off hardcoded `cat`.** Five `cat C:\Users\hasan\.claude/knowledge/*.md` calls across four skills now go through the loader. Newly-added knowledge files become reachable to every skill via the index automatically.
- **`agents/research-synthesizer.md` uses `model: haiku`.** Conservative first entry in the model-per-agent matrix. Synthesizer is pure markdown merging — no new reasoning needed, ~7× cheaper. Other agents (planner/builder/verifier/plan-checker/roadmapper/qa-browser) retain their default model — they're stakes-bearing.
- **`bin/install.js` initializes the knowledge layer** on first install (never overwrites existing content). The `templates/knowledge/` subdirectory is excluded from the regular templates copy to avoid double-installation.
- **`bin/install.js` ships `knowledge.js` + `knowledge-flush.js`** to `C:\Users\hasan\.claude/bin/` alongside `state.js`/`qualia-ui.js`/`statusline.js`. `QUALIA_BIN_FILES` updated for clean uninstall.

### Fixed

- **Two pre-existing test failures** in `tests/bin.test.sh` that had been broken since v3.2.0: hook-count assertion still expected 8 hooks (had been wrong for two releases), and the hook-wiring assertion still grep'd for the deleted `block-env-edit.js`. Both updated to match the v4.3.0 install state (9 hooks, no block-env-edit).

### Notes

Cumulative tests: **+49 new passing assertions**, 2 broken tests fixed, 168/168 node tests + 78/79 bin tests + 61/68 hook tests (the 7 pre-deploy-gate + 1 erp-api-key shell failures predate this release and are tracked separately).

What's deferred to v4.4.0: worktree-aware phase parallelism (Cole Medin's pillars 2–4 — `bin/qualia-worktree.sh`, port-from-hash, Supabase branch-per-worktree), audit cleanup (orphan skills, color drift, per-employee memory scoping — v4.1.0 findings #4, #6, #7, #8), `npm publish` post-merge.

For developers integrating the framework: re-run `npx qualia-framework@latest install` after this release lands to pick up the new hooks, knowledge layer, and `bin/` scripts. Existing `C:\Users\hasan\.claude/knowledge/*.md` content is preserved on reinstall.

## [4.1.1] — 2026-04-22

**Critical silent-fail hotfix.** Follow-up to the v4.1.0 audit (`docs/reviews/v4.1.0-audit.html`) which surfaced 142 findings across 4 dimensions. This release addresses the 5 highest-risk issues — each one previously let an operation fail silently or skip safety checks without telling the user. Subsequent releases (v4.2.0 structural, v4.3.0 harness patterns) will handle the remaining findings.

### Fixed

- **`grounding.md` phantom on stale installs** (`hooks/session-start.js`, `hooks/auto-update.js`). Users who upgraded from v4.0.5 → v4.1.0 without re-running `npx qualia-framework@latest install` had no `C:\Users\hasan\.claude/rules/grounding.md`, so every planner/builder/verifier spawn silently received empty grounding context. Session-start now spot-checks 5 critical files (`grounding.md`, `security.md`, `frontend.md`, `deployment.md`, `state.js`) once per 24h and prints a loud banner with the exact install command when anything is missing. `auto-update.js` invalidates the health cache on every version bump so newly-shipped critical files are verified on the next session.
- **`qualia-report` ERP upload silent-fail chain** (`skills/qualia-report/SKILL.md`). Three independent silent failures were producing garbage reports: empty `API_KEY` → sent `Authorization: Bearer ` (blank token) then surfaced a generic 401 with "Ask Fawzi" and no diagnostic. Empty `CLIENT_REPORT_ID` from a state.js failure → commit message dropped the ID, ERP payload carried empty string. `SUBMITTED_BY` shell-interpolated into `node -e` script → a single quote in `git config user.name` silently broke the payload. Fixes: guard empty API key before the POST loop with a clear `C:\Users\hasan\.claude/.erp-api-key` diagnostic, validate `CLIENT_REPORT_ID` is non-empty and fail loudly if state.js didn't return one, pass `SUBMITTED_BY`/`SUBMITTED_AT`/`CLIENT_REPORT_ID`/`REPORT_FILE` via environment variables (which are inert to shell metacharacters) instead of string interpolation, and make the 401 handler actually explain the likely cause.
- **`/qualia-ship` had no state guard and a hallucinated domain** (`skills/qualia-ship/SKILL.md`). The skill would run from any state (setup/planned/built — even `shipped` → double-deploy possible), its security scan only grepped `service_role` (missed hardcoded keys, tracked `.env`, `dangerouslySetInnerHTML`), and its post-deploy verification used a literal `{domain}` placeholder that expected the LLM to hallucinate the URL. Now: state gate refuses any status except `polished` or `verified+pass` (with `--force` escape hatch for hotfixes), security scan inlines the CRITICAL checks from `/qualia-review` verbatim so the two skills agree, and the URL is read from `tracking.json.deployed_url` with a loud error if missing. Description also gained the missing trigger phrases (`deploy`, `ship it`, `go live`, `push to prod`, `launch`).
- **`templates/help.html:410` mis-described `/qualia-idk`.** Was listed as "Alias for /qualia. The smart router handles all 'idk' situations" — directly contradicts the actual SKILL.md which defines it as a diagnostic intelligence running two isolated scans. Team members reading the help page were sent to the wrong skill. Description now matches the skill.
- **`hooks/session-start.js` silent error swallow.** The top-level `try { ... } catch { }` block recorded `result: "allow"` in traces even when the try body threw, so silent session-start crashes were invisible in analytics. Error cases now log to `.qualia-traces/{date}.jsonl` with `result: "error"` and the exception message.
- **CI was failing on every PR, across all 18 matrix cells, and being ignored.** The `.github/workflows/test.yml` used `actions/setup-node@v4` with `cache: 'npm'`, which requires a `package-lock.json` — but this framework has zero runtime deps and no lockfile. Every PR since the workflow was added reported FAILURE before tests even ran, and merges happened on red CI. Removed the `cache:` key; tests now actually execute on every push.
- **`pre-push.js` now passes `-c core.autocrlf=false` on its stamp commands.** Defensive fix against the Windows failure mode where autocrlf normalization produces an empty diff, the stamp-commit fails, and the hook's rollback restores stale `last_commit`. The behavioral test for this path is temporarily skipped on Windows (tracked for v4.1.2) — the Linux + macOS matrix is fully green with this change. Windows platform-specific investigation needs a live Windows box and is out of scope for this hotfix.

### Notes

Full framework review (142 findings) and v4.2.0 / v4.3.0 / v4.4.0 roadmap documented separately. This release handles the 5 highest-risk silent-fail paths; subsequent releases handle structural debt (3-tier memory, unified color module, orphan skill consolidation) and harness-engineering patterns (adversarial build, continuous reviewer agents, component-fetch skill).

## [4.1.0] — 2026-04-21

**Command quality + build workflow hardening.** Deep research across 5 parallel Opus agents surfaced 15 concrete improvements — shipped across 4 commits. Every agent spawn now loads a shared **Grounding Protocol** (cite-or-INSUFFICIENT-EVIDENCE, no hedging, file:line evidence required for every finding) and deterministic scoring rubrics. Build workflow gains cache-aware prompt ordering (92% prefix-cache hit rate per Anthropic docs), explicit parallel wave dispatch, and a structured builder output contract. `qualia-debug` was fully rewritten from interactive to investigative one-shot. Research reports committed to `docs/research/`. 168/168 tests passing.

### Added

- **`rules/grounding.md` — shared Grounding Protocol + 5 rubrics.** New file referenced from every skill that spawns a subagent. Contains: 8-rule Grounding Protocol (every claim requires `file:line — "quoted"` evidence, no hedging language, scores require rubric citations, output shapes are contracts, tool budgets enforced, preconditions checked); **Severity Rubric** with objective criteria per level and a deterministic `max(1, 5 − ⌊weighted_sum/8⌋)` category-score formula; **Task-Done Rubric** (compiles / no stubs / wired / AC validated / committed); **Evidence Citation Format**; **Deviation JSON Format**; **Design Quality Rubric** (6 dimensions × 3 levels); **cache-aware prompt-ordering rule**. Install.js picks this up automatically via `rules/` directory copy.
- **Structured Output Contract for builder** (`agents/builder.md`). Builder must return `DONE — Task {N}: {commit_hash}` with file list, `BLOCKED — {reason}` with JSON deviation block (`{type, task, file, planned, actual, impact}`), or `PARTIAL — {done}; remaining: {left}`. Orchestrator can now parse results programmatically instead of regex-guessing free-text.
- **Explicit file-based dependency graph for wave assignment** (`agents/planner.md`). Replaces vibes-based "tasks with no dependencies" with a mechanical algorithm: build `writes(T)` / `reads(T)` sets from Files and Context fields, declare edge A→B when `writes(A) ∩ reads(B) ≠ ∅`, topological-sort into waves, enforce write-conflict check within each wave. Worked example table included. Same inputs → same waves.
- **Rule 8 for plan-checker** (`agents/plan-checker.md`). Each task's `**Validation:**` list must include at least one `grep-match` or `command-exit` that tests behavior — a task whose only Validation is `test -f {file}` fails the rule. Stops stubs and placeholders from passing the build gate.
- **Tool budgets** across 3 open-ended agents: researcher (3 Context7 + 3 WebFetch + 2 WebSearch per dimension), verifier (25 bash/grep per invocation), plan-checker (10 per invocation), qualia-debug (10 Read/Grep/Bash). Enforces INSUFFICIENT EVIDENCE return over speculative output when budget exhausted.
- **Frontend gate on verifier's Design Verification section** (`agents/verifier.md`). Grep the phase plan for `.tsx`/`.jsx`/`.css`/`Persona:\s*(frontend|ux)` first — if absent, skip the ~40-command design verification block entirely. Saves substantial time on backend-only phases.
- **`<wave_context>` block in builder prompts** (`skills/qualia-build/SKILL.md`). Lists sibling tasks in the same wave (title + files only, ~50 tokens per task) so parallel builders don't make conflicting semantic choices on shared types or patterns.
- **Evidence citation requirement for milestone suggestions** (`agents/research-synthesizer.md`). Every arc entry must cite `[DIMENSION.md: <finding>]`. Speculative milestones marked `[speculative — no source]`.
- **Parallel Agent fan-out in `qualia-design`** for >5 target files. Batches of 5, one Agent per batch, all dispatched in a single response turn. Post-fix verification greps catch reverted anti-patterns (`outline:none` without replacement, generic fonts, `max-w-7xl`, missing alt, blue-purple gradients).
- **Parallelized security scans in `qualia-review`.** Independent greps now explicitly dispatched as parallel Bash calls in one turn. Saves 15-30s on large codebases.
- **Typed input contracts across 7 agents** (planner, plan-checker, builder, verifier, researcher, qa-browser, roadmapper). Replaces prose "You receive: X + Y" with `<variable>` blocks + types + sources. Catches missing inputs at prompt-assembly time instead of mid-execution.
- **`<full_detail>` declared in roadmapper Input section.** Was a ghost parameter referenced in the body but never declared — orchestrator had no mechanism to pass it.
- **Cache-aware prompt structure in `qualia-build`.** Split `<phase_context>` (PROJECT.md/DESIGN.md, phase-stable) from `<task_context>` (per-task @files, varies). Stable prefix first, dynamic last — preserves Anthropic prompt-caching prefix-hit across parallel wave tasks (docs report 92% hit rate + 81% cost reduction at Claude Code scale when prefix is byte-identical).
- **Research reports in `docs/research/`** documenting the analysis: `2026-04-21-command-quality-deep-research.md` (15-item synthesis from 4 parallel Opus audits) and `2026-04-21-industry-best-practices.md` (255 lines, cited sources on prompt caching, verification loops, hallucination reduction, multi-agent orchestration).

### Changed

- **Plan-checker revision loop capped at 2 iterations** (was 3). Amazon/NeurIPS 2025 measured reflection gains at 74%→86% for 1 round, only 88% for 3 rounds — iteration 3 added 2pp over iteration 1, not worth the extra planner spawn. Updated `qualia-plan/SKILL.md`, `plan-checker.md`, and all stale "3 cycles" references.
- **`qualia-review` scoring replaced subjective thresholds with deterministic formula.** Quick-reference table rewritten to match the computed formula (earlier drafts had inconsistent boundary rules — verified mechanically during release QA and corrected).
- **Verifier now receives PROJECT.md inlined in its spawn prompt.** Previously blind to project conventions — Quality scoring rubric referenced "project conventions" but verifier had no way to read them.
- **Wave dispatch explicitly parallel in `qualia-build/SKILL.md`.** Replaced "parallel if multiple" language with an explicit instruction: spawn all wave tasks as separate `Agent()` calls in the SAME response turn — do NOT await one before the next. Prior natural-language phrasing relied on harness behavior rather than enforcing true concurrency.
- **`qualia-debug` rewritten from interactive to investigative one-shot.** Previously required 4 mandatory user questions and a diagnosis-confirmation gate before any investigation. Now parses symptom from `$ARGUMENTS`, runs diagnostic grep batches (general/frontend/perf modes), hard 10-call tool budget, INSUFFICIENT EVIDENCE return instead of speculative fixes, structured DEBUG-{timestamp}.md report output to `.planning/`. Matches the one-shot pattern of every other `/qualia-*` command.
- **`qualia-design` critique section now uses the structured Design Quality Rubric** (File | Dimension | Issue | Line | Severity) instead of vibes-based evaluation. Any dimension scoring below 4 is a mandatory fix.

### Fixed

- **Latent `grep -qL` bug in `qualia-review` API auth check.** The combination of `-q` (quiet) and `-L` (list non-matching files) is undefined in POSIX and was producing inverted "UNPROTECTED" output. Rewrote as a clean `if ! grep -q ... then echo UNPROTECTED` loop. Verified against mock directory of protected + unprotected routes.
- **Full `npx next build` removed from `qualia-review` Performance Scan.** A 30-120s side-effectful build triggered during a "scan" command was a hidden cost that made review surprisingly slow and polluted `.next/`. Replaced with `du -sh .next/static/chunks/*.js` against existing build artifacts, with a warning if no build output exists.

### Notes

- **Always pin `@latest` when upgrading.** npx caches at `~/.npm/_npx/` and has no time-based TTL, so `npx qualia-framework install` can silently re-run a cached old copy. Use `npx qualia-framework@latest install` (or `npx clear-npx-cache` first). README updated to reflect this. ([npm/rfcs#700](https://github.com/npm/rfcs/issues/700))
- Users who update the framework must re-run the install script so `C:\Users\hasan\.claude/rules/grounding.md` lands — every skill's spawn prompt now references this file.
- Any client projects mid-phase where the plan-checker was on iteration 3 will now escalate at iteration 2. Acceptable trade-off per the measured reflection-gain data.
- The builder Output Contract (`DONE/BLOCKED/PARTIAL`) is advisory today — existing orchestrator skills do not programmatically parse it. Enforcement will land in a follow-up minor when the parsing is wired through.

### Deferred to v4.2.0

- Mechanical-fix bypass in plan-checker (skip planner re-spawn for frontmatter/wave-assignment issues — ~4 hrs orchestration work, regression risk not suitable for this release).
- Pre-Build Context Packet (single JSON consolidating PROJECT.md + DESIGN.md + plan + wave-context before spawning any builders).
- Intra-wave task verification (run task Validation contracts immediately after each builder completes, before next wave starts).
- New agents: migrator, dependency-auditor, rollback.
- `curl` fallback in qa-browser for environments without Playwright MCP.

## [4.0.5] — 2026-04-19

**Statusline refresh.** The phase segment now shows milestone + tasks +
blockers (not just phase number), and the line closes with a
`⬢ Qualia · {firstName}` signature pulled from
`C:\Users\hasan\.claude/.qualia-config.json`. Static `hooks N` / `skills N` counters
removed — they never changed between projects, so they added noise
without signal. All 168 tests still green.

### Added

- **`bin/statusline.js` — milestone segment.** When
  `.planning/tracking.json` has `milestone` + `milestone_name`, the
  statusline renders `M{n}·{shortName}` (name truncated to 14 chars)
  before the phase number. Previously only the phase number (`P1/3`)
  was visible — milestone context had to be looked up manually.
- **`bin/statusline.js` — task progress.** When `tasks_total > 0`,
  renders `T{done}/{total}` alongside the phase. Gives mid-phase
  progress at a glance during `/qualia-build` waves.
- **`bin/statusline.js` — blocker badge.** When
  `tracking.json.blockers` is a non-empty array, renders `!{n}` in
  red. Intentionally loud — blockers should never sit unnoticed.
- **`bin/statusline.js` — Qualia signature.** Line 2 now ends with
  `⬢ Qualia · {firstName}` where `firstName` is the first whitespace-
  delimited token of `installed_by` in `C:\Users\hasan\.claude/.qualia-config.json`.
  Branded closer, makes the statusline feel like ours, not a generic
  Claude Code tool.

### Removed

- **`bin/statusline.js` — hooks/skills counters.** The `hooks N`
  and `skills N` indicators were removed from line 1. Both counts are
  effectively static across all projects on a single machine (a given
  install has the same hooks and skills everywhere), so they were
  visual noise — they didn't help the employee understand *this*
  project's state. `mem N` is retained because it genuinely varies
  per project (different memories accumulated per working directory).

## [4.0.4] — 2026-04-18

**Audit follow-up + ERP integration upgrade.** Eight concrete improvements
from the framework deep-dive audit. Tests: 164 → 168 (+4 regression tests,
covering the new `next-report-id` subcommand and the JOURNEY.md
pre-populate on `close-milestone`).

### Added

- **`qualia-framework erp-ping`** — new CLI subcommand that POSTs a
  synthetic `dry_run: true` payload to the ERP and prints HTTP code,
  response body, and the ERP-returned `report_id`. Single-command
  connectivity + key-validity + endpoint health check. Aliased as `ping`.
- **`QS-REPORT-NN` client-side identifiers** — every session report
  now carries a stable, sequential client ID (`QS-REPORT-01`, `-02`, …
  per project) stored in `tracking.json.report_seq` and sent to the ERP
  in a new `client_report_id` field. Survives retries, survives UUID
  changes on the ERP side, is the preferred dedupe key going forward.
- **`state.js next-report-id [--peek]`** — new mutator subcommand that
  increments `report_seq` and returns the next `QS-REPORT-NN`. `--peek`
  returns without incrementing (for `/qualia-report --dry-run`).
- **`/qualia-report --dry-run`** — assemble + print the payload but
  skip the POST, skip the git commit, and peek the sequence counter
  without consuming one. Useful for previewing before a real clock-out.
- **`/qualia-report` now retries with backoff** — 3 attempts at 1s, 3s,
  9s on transient failures (timeout, 5xx, network). 401/422 are
  permanent failures and fail fast. Local report commit is unchanged —
  no data loss on upload failure, just a stale ERP view until retry.
- **`/qualia-report` now displays both IDs on success** — "Uploaded as
  QS-REPORT-03 (ERP: {uuid})". Employees and the ERP share the same
  stable reference.
- **`/qualia-new --full-detail`** — new flag that instructs the
  roadmapper to write full phase-level detail for EVERY milestone
  upfront (not just M1). Default behavior (progressive detail)
  unchanged. `agents/roadmapper.md` honors `<full_detail>` in its
  prompt contract.
- **Visible progressive-detail notice** — after journey approval,
  `/qualia-new` now explicitly tells the user "Milestone 1 is fully
  planned. M2..M{N-1} are sketched. Full detail fills in when
  /qualia-milestone opens each one." Previously only in template
  comments — easy for a new team member to miss.

### Fixed

- `bin/state.js` `close-milestone` now reads `.planning/JOURNEY.md` to
  pre-populate `tracking.json.milestone_name` with the next milestone's
  name. Previously, between `close-milestone` and the next
  `state.js init --force` from the roadmapper, `milestone_name` sat
  blank — the ERP tree view would briefly show an unnamed milestone.
  Falls back to blank if JOURNEY.md is missing (legacy projects, pre-v4).
- `bin/cli.js` — `QUALIA_AGENT_FILES` expanded from 4 to all 8 agents
  (`planner`, `builder`, `verifier`, `qa-browser`, **`plan-checker`**,
  **`researcher`**, **`research-synthesizer`**, **`roadmapper`**).
  `qualia-framework uninstall` would previously leave the last 4 on
  disk as orphans.
- `bin/cli.js` `cmdMigrate` — removed `block-env-edit.js` from
  `requiredEditHooks`. That hook was deleted in v3.2.0 and
  `install.js` actively purges it; `migrate` was trying to wire a
  non-existent file into `settings.json`.
- `bin/install.js` + `bin/cli.js` — unpinned
  `next-devtools-mcp@0.3.10` → `@latest`. The pin was silent drift.
- `bin/install.js` — warn (instead of OK) when an existing
  `C:\Users\hasan\.claude/.erp-api-key` is under 10 bytes. Clearly truncated or
  placeholder keys no longer silently pass install. Real bearer tokens
  are ≥ 20 bytes; the threshold is deliberately loose to avoid false
  positives.

### Changed

- `templates/tracking.json` — new field `report_seq: 0`.
- `docs/erp-contract.md` — documented `client_report_id` (recommended)
  and `dry_run` (optional) on the POST payload.

### Tests

- 164 → 168 (+4). New coverage: `next-report-id` increments,
  `next-report-id --peek` is side-effect-free, `close-milestone`
  pre-populates `milestone_name` from JOURNEY.md, and the fallback
  path when JOURNEY.md is absent.

## [4.0.3] — 2026-04-18

**Zero-deferral release.** Closes the last two items that were previously
deferred as trade-offs.

### Fixed

- `hooks/pre-compact.js`: `--no-verify` and `--no-gpg-sign` are now
  configurable via `C:\Users\hasan\.claude/.qualia-config.json`:

  ```json
  {
    "pre_compact": {
      "respect_user_hooks": true,
      "respect_gpg_signing": true
    }
  }
  ```

  Default behavior is unchanged (bot commits bypass both, because
  compaction can fire at any moment and pre-commit test suites would
  routinely block the auto-save and lose STATE.md). Compliance-sensitive
  projects opt into strict mode per-flag. The flags used are included
  in the hook trace.

### Added

- **All 26 skills now declare `allowed-tools`** in frontmatter. Per-skill
  conservative tool unions — wider rather than narrower to avoid
  breakage. Read-only skills (`qualia-help`, `qualia-resume`) declare
  it explicitly. The framework no longer relies on the user's default
  permission mode for tool scoping.

## [4.0.2] — 2026-04-18

**Stability pass.** Closes every remaining HIGH + MEDIUM item from the
v4.0.0 audit that could surface as a silent failure or instability.
Tests: 159 → 164 (+5 regression tests).

### Fixed — HIGH

- `hooks/session-start.js`: `readConfig()` now defined above its call
  site. Previously worked by function-declaration hoisting — would have
  silently broken on any refactor to `const readConfig = …`.
- `bin/state.js`: write-ahead journal (`.planning/.state.journal`)
  captures the pre-transition snapshot of STATE.md + tracking.json
  before the dual write. On next mutator invocation, if the journal
  exists we recover both files to the pre-transition state. A crashed
  mutator (SIGKILL / power loss between the two renames) no longer
  leaves the pair inconsistent. A corrupt journal is cleared, not fatal.

### Fixed — MEDIUM

- `hooks/migration-guard.js`: DELETE / UPDATE `WHERE` scan is now
  per-statement (split on `;`) instead of file-global. A file
  containing `DELETE FROM foo;` followed by any later `… WHERE …`
  (in a SELECT, JOIN, etc.) would previously pass the check.
- `hooks/migration-guard.js`: stdin read retry loop now sleeps 1ms
  between EAGAIN retries via `Atomics.wait` instead of spinning CPU.
- `hooks/pre-push.js`: commit-failure path now unstages tracking.json
  and restores the working-tree copy, so the user's next manual commit
  isn't polluted by an aborted ERP-stamp change.
- `bin/cli.js` — `cleanSettingsJson`: iterates ALL hook-event keys in
  settings.json instead of the hardcoded three (SessionStart /
  PreToolUse / PreCompact). Future hook events get cleaned automatically.
- `bin/cli.js` — hook cleanup: introduce `QUALIA_LEGACY_HOOK_FILES`
  for removed-in-past-version hook filenames (currently
  `block-env-edit.js`). Uninstall cleans legacy hooks too.
- `bin/statusline.js`: memory-path `dirKey` now strips BOTH `/` and `\`
  so Windows installs get a correct project key and the memory count
  actually renders.

### Tests

- +5 regression tests:
  · state.js recovers STATE.md + tracking.json from `.state.journal`
  · state.js: corrupt `.state.journal` is cleared without crashing
  · migration-guard: `DELETE FROM x; SELECT … WHERE …;` still blocks
  · migration-guard: `UPDATE … SET …; SELECT … WHERE …;` still blocks
  · install.js: reinstall preserves user-added hooks in settings.json

## [4.0.1] — 2026-04-18

**Post-v4.0.0 audit cleanup.** No behavior changes on the happy path —
all fixes patch latent bugs, silent failure modes, and documentation
drift found in a full-framework audit. Tests grew from 156 to 159.

### Fixed — ship-blockers

- `bin/qualia-ui.js`: `/qualia` journey-tree no longer crashes when
  `JOURNEY.md` lacks a `project:` frontmatter line. A `const projectName`
  was shadowing the function name inside its own initializer, triggering
  `ReferenceError: Cannot access 'projectName' before initialization`.
- `templates/help.html`: version pill, subtitle, and footer now render
  the real installed version. Previously hardcoded `v3.6.0` in three
  places, and the `sed "s/{{VERSION}}/$VERSION/g"` in `/qualia-help`
  had nothing to replace.
- `skills/qualia-help/SKILL.md`: version fallback chain rewritten —
  `.qualia-config.json` → `package.json` → `"latest"`. Previously
  fell back to the string `"v3"`.
- `skills/qualia-design/SKILL.md` + `rules/frontend.md`: remove references
  to 5 non-existent design skills (`/bolder`, `/design-quieter`,
  `/colorize`, `/distill`, `/delight`). The rules file ships to every
  user project; the ghost commands would have 404'd.
- `CLAUDE.md`: Road section rewritten to describe the v4 hierarchy.
  Previously no mention of milestones, `JOURNEY.md`, `/qualia-milestone`,
  `/qualia-idk`, or `--auto` — the file Claude reads every session was
  still on v3 mental model.
- `CHANGELOG.md`: add link references for v3.1.0 through v4.0.0 and
  point `[Unreleased]` at v4.0.0. Previous version headers rendered
  as plain text on GitHub / npm.

### Fixed — real bugs

- `hooks/pre-deploy-gate.js`: exits **2** (not 1) on block, matching
  Claude Code's PreToolUse hook contract. Previous code explicitly
  acknowledged the violation in a comment. Test assertions updated in
  `tests/runner.js` and `tests/hooks.test.sh`.
- `bin/state.js` — lock: replace 50ms CPU busy-wait with
  `Atomics.wait`-backed `sleepSync` (no CPU starvation on constrained
  CI runners). Lock fall-through now traces `state-lock/fallthrough`
  so repeated contention is visible instead of silent.
- `bin/state.js` — `cmdTransition`: back up BOTH `STATE.md` and
  `tracking.json` before the dual write, so a failure in the second
  write can roll both files back to a consistent pre-transition state.
- `bin/install.js`: hooks are now merged into `settings.json` instead
  of clobbered. Previous code did `settings.hooks = {...}`, silently
  destroying any user-added hook entries on every reinstall.
  Qualia-owned hook commands are matched by filename and replaced;
  everything else is preserved.

### Fixed — docs / drift

- `agents/plan-checker.md`: Rule 2 heading "6 mandatory fields" →
  "7 mandatory fields" (list contained 7).
- `skills/qualia-task/SKILL.md` + `skills/qualia-plan/SKILL.md`:
  legacy `Done when:` → `Acceptance Criteria:` (matches v3.7.0 story-file
  format that plan-checker validates against).
- `docs/erp-contract.md`: add v4 fields `milestone_name` and
  `milestones[]` to the request body example and required-fields table.
  `/qualia-report` already sent these; the contract doc didn't document
  them.
- `guide.md`: "The 10 Commands" → "The Road Commands" (table has 13 rows).
- `skills/qualia-new/SKILL.md`: strip stale "Unlike v3" language.

### Tests

- +3 new regression tests (156 → 159):
  · `transition --to shipped` actually increments `deploy_count`
  · `qualia-ui journey-tree` renders milestones without crashing
  · `qualia-ui journey-tree` falls back to `projectName()` when
    `JOURNEY.md` frontmatter lacks `project:`

### Deferred to v4.1

- `allowed-tools` frontmatter sweep across 26 skills — requires
  per-skill audit to avoid accidentally blocking tool access that
  skills rely on.
- Finer-grained per-statement `WHERE`-clause scan in
  `migration-guard.js` / `pre-deploy-gate.js`.

## [4.0.0] — 2026-04-18

**Full Journey release.** `/qualia-new` now maps the entire project
arc from kickoff to client handoff upfront, and the Road can chain
itself end-to-end in `--auto` mode with only two human gates per
project. The milestone / phase / task hierarchy is locked down so the
ERP renders a clean tree, and the team stops improvising milestones
after each ship.

### The big shift

Before v4, `/qualia-new` produced a v1 ROADMAP and stopped. Each
subsequent milestone was invented when the previous one shipped,
leading to structural drift (milestones collapsing into single
phases, "Phase 0" entries at milestone level, skipped milestone
numbers). The ERP rendered a flat list of heterogeneous entries.

v4 treats the **Journey** as a first-class artifact:

```
Project
└─ Journey (all milestones defined upfront)
   └─ Milestone (a release — 2-5 total, Handoff is always last)
      └─ Phase (a feature-sized deliverable, 2-5 tasks)
         └─ Task (atomic unit, one commit, verification contract)
```

### Added

- **`.planning/JOURNEY.md`** — the North Star document. Lists every
  milestone with why-now, exit criteria, and phase sketches. Written
  during `/qualia-new`, updated on milestone closure. Hard rules: 2-5
  milestones, ≥ 2 phases per non-Handoff milestone, final milestone
  is always literally named "Handoff" with the fixed 4-phase template
  (Polish, Content + SEO, Final QA, Handoff).
- **`/qualia-new` full-journey flow** — produces JOURNEY.md +
  REQUIREMENTS.md (grouped by milestone) + ROADMAP.md (M1's phase
  detail). **Research runs unconditionally** (no more `workflow.research`
  gate). **Single approval** on the whole journey replaces multiple
  mid-flow gates.
- **`--auto` flag on `/qualia-new`, `/qualia-plan`, `/qualia-build`,
  `/qualia-verify`, `/qualia-milestone`** — chains the Road end-to-end.
  Two human gates per project total: journey approval at kickoff, and
  one pause at each milestone boundary ("Continue to M{N+1}?"). One
  halt case: gap-cycle limit exceeded on a failed phase.
- **Milestone readiness guards** in `state.js close-milestone`:
  `MILESTONE_NOT_READY` (any phase not verified) and `MILESTONE_TOO_SMALL`
  (< 2 phases), both bypassable with `--force`.
- **`tracking.json.milestones[]`** — array of closed milestone summaries
  (num, name, total_phases, phases_completed, tasks_completed,
  shipped_url, closed_at). The ERP uses this to render the project
  tree without replaying git history.
- **`tracking.json.milestone_name`** — human name of the current
  milestone ("Foundation", "Core Features", etc.). Appears in status
  bar and ERP.
- **`build_count` and `deploy_count` bump automatically** on every
  `built` and `shipped` transition. Previously always zero.
- **Pre-inline context at builder dispatch.**
  `/qualia-build` reads PROJECT.md, DESIGN.md, and every `@file`
  referenced in the task's Context BEFORE spawning the builder subagent.
  Inlines them under `<pre-loaded-context>`. Saves 3-5 Read tool calls
  per task; builder starts already oriented.
- **`qualia-ui.js journey-tree`** — ASCII ladder visualization of
  JOURNEY.md. Shipped milestones = green dot, current = teal diamond,
  future = dim open circle, Handoff = [FINAL] tag. Shown by
  `/qualia` router and at `/qualia-milestone` confirmation step.
- **`qualia-ui.js milestone-complete`** — celebration banner on
  milestone closure. Distinguishes Handoff closure ("PROJECT SHIPPED")
  from intermediate milestones ("Next: {name}").
- **5 new banner actions:** milestone ◆, journey ◯, auto ⚡,
  research ◱, roadmap ◐.
- **`qualia-report` ERP payload updated** — now sends all v4 fields
  (project_id, team_id, git_remote, milestone_name, milestones[],
  build_count, deploy_count, session_started_at, last_pushed_at) so
  the ERP renders tree and dedupes correctly.
- **`/qualia-idk` is now a real diagnostic skill**, not a `/qualia` alias.
  When the user's confusion is about *understanding the situation*
  (not picking the next command), it spawns two parallel isolated
  `Explore` subagents: one scans `.planning/` only, the other scans
  source code only. Each produces a 250-word view of its side. The
  main skill synthesizes both views + the user's stated confusion
  into a structured "What I see / What I think is happening / What
  to do next" diagnosis in plain language. Catches plan↔code drift
  that a state-only router can't see.

### Changed

- **`/qualia-handoff` is now explicit about the 4 deliverables** —
  verified production URL, updated documentation, client assets archive,
  ERP finalization. Halts if URL is down or latency > 1s, or if
  `.planning/archive/` is empty (project bypassed `/qualia-milestone`
  and has no archived milestones).
- **`/qualia-milestone` reads next milestone from JOURNEY.md** instead
  of asking the user to name it. Dedicated `journey-tree` visualization
  at confirmation + `milestone-complete` banner at close.
- **`roadmapper` agent rewritten** to produce JOURNEY + REQUIREMENTS +
  ROADMAP. **Dropped** the old "no review/deploy/handoff phases" rule —
  the Handoff milestone is now a first-class feature milestone with
  the 4 standard phases and their own requirements (HAND-01..HAND-15
  in REQUIREMENTS.md).
- **`plan-checker` Rule 2** — task story-file fields are mandatory
  (Why / Depends on / Acceptance Criteria / Validation). Inherited
  from v3.7.0's story-file format.
- **`/qualia` description scoped back to mechanical state routing.**
  Previously claimed "idk / stuck / lost / confused" triggers; those
  interpretive shades now route to `/qualia-idk`. `/qualia` stays the
  fast mechanical router ("what's my next command").
- **`templates/requirements.md`** — multi-milestone format with fixed
  Handoff section.
- **`templates/roadmap.md`** — scoped to current milestone only, with
  pointer to JOURNEY.md for the full arc.

### Tests

150 → 156 green. +6 covering: MILESTONE_NOT_READY, MILESTONE_TOO_SMALL,
milestones[] append idempotency, check-output exposure of milestones +
milestone_name, milestone summary cumulative task count (not current-
phase only), build_count bump on `built`.

### Migration

Fully additive. Projects created on v3.x continue to work:
- Plans without story-file fields: `state.js` accepts both legacy
  `Done when:` and v3.7.0 `Acceptance Criteria:` anchors.
- tracking.json missing `milestones[]` or `milestone_name`: `ensureLifetime`
  hydrates them to `[]` and `""` with zero risk.
- Projects without JOURNEY.md (legacy): `/qualia-milestone` falls back
  to asking the user for the next milestone name. Recommended migration:
  run `/qualia-map` then regenerate JOURNEY.md via the roadmapper, but
  not required.

### Lineage of patterns

- **Story-file plan format** — embedded rationale and acceptance
  criteria per task (arrived in v3.7.0).
- **State-machine auto-advance** — the `--auto` loop (arrived in v4.0.0).
- **Pre-inline context at dispatch** — the builder `<pre-loaded-context>`
  block (arrived in v4.0.0).
- **Journey-as-first-class-artifact** — JOURNEY.md (arrived in v4.0.0).

---

_v2.x and v3.x history archived at [docs/archive/CHANGELOG-pre-v4.md](docs/archive/CHANGELOG-pre-v4.md)._
