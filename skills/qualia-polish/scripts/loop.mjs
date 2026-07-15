#!/usr/bin/env node
/**
 * loop.mjs — orchestrator state-machine for /qualia-polish --loop.
 *
 * Claude (the parent session) drives the loop by issuing CLI commands. This
 * script keeps the deterministic state — iteration counter, regression
 * fingerprints, token budget, success/kill verdict — out of the LLM context.
 *
 *   loop.mjs init    --url X --brief PATH --max 8 --budget 100000 --state STATE.json
 *   loop.mjs record  --state STATE.json --eval EVAL.json
 *   loop.mjs status  --state STATE.json     # → JSON: continue|success|killed|out_of_budget
 *   loop.mjs commit-fix --state STATE.json --file PATH --slug SLUG
 *   loop.mjs report  --state STATE.json     # → final markdown to stdout
 *
 * Eval JSON contract (what the vision evaluator returns):
 *   {
 *     "iteration": 1,            // optional; if present must equal state.iteration+1 (monotonicity assertion)
 *     "viewport_results": [{ viewport, scores, top_issues }],
 *     "aggregate_scores": { typography, color, spatial, layout, shadow, motion, microcopy, container, graphics },
 *     "top_issues": [{ dim, severity, description, likely_file, fix }]
 *   }
 *   NOTE: any ev.tokens_used is IGNORED — the budget charges a fixed
 *   PER_ITER_TOKENS per iteration (deterministic kill-switch).
 *
 * State JSON shape (written by this script, read by Claude):
 *   {
 *     "url", "brief_path", "max_iterations", "token_budget", "tokens_used",
 *     "iteration", "verdict", "iterations": [...], "fingerprints": {...}, "fixes": [...]
 *   }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path, { dirname } from "node:path";
import { argv, exit } from "node:process";
import { spawnSync } from "node:child_process";

const DIMS = ["typography", "color", "spatial", "layout", "shadow", "motion", "microcopy", "container", "graphics"];

// Deterministic per-iteration token charge (evaluator + 3 builders ≈ 14500,
// per REFERENCE.md:197). The budget kill-switch must NOT trust ev.tokens_used —
// that is a model-guessed number and an under-report would defeat the budget
// guard. Charge a fixed, known cost per iteration instead.
const PER_ITER_TOKENS = 14500;

// ── helpers ──────────────────────────────────────────────────────────────
function loadState(p) {
  if (!existsSync(p)) { console.error(`state file not found: ${p}`); exit(2); }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { console.error(`state file unreadable: ${e.message}`); exit(2); }
}
function saveState(p, s) {
  if (!existsSync(dirname(p))) mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
}
function flag(name, def = null) {
  const i = argv.indexOf(name);
  if (i < 0) return def;
  return argv[i + 1] || def;
}
function flagInt(name, def) { const v = flag(name); return v == null ? def : parseInt(v, 10); }

function fingerprintIssue(issue) {
  const dim = String(issue.dim || "").toLowerCase().replace(/\W+/g, "_");
  const file = String(issue.likely_file || issue.file || "_unknown").split("/").pop().replace(/\W+/g, "_");
  const kw = String(issue.description || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 32);
  return `${dim}__${file}__${kw}`;
}

// ── commands ─────────────────────────────────────────────────────────────
function cmdInit() {
  const statePath = flag("--state");
  if (!statePath) { console.error("--state required"); exit(2); }
  const routesFlag = flag("--routes");
  const urlFlag = flag("--url");
  if (!routesFlag && !urlFlag) { console.error("--url or --routes required"); exit(2); }
  const urls = routesFlag
    ? routesFlag.split(",").map((s) => s.trim()).filter(Boolean)
    : [urlFlag];
  const max = flagInt("--max", 8);
  const budget = flagInt("--budget", 100000);
  const state = {
    url: urls[0],          // primary URL (backward compat with single-route SKILL.md)
    urls,                  // full list — multi-route mode when length > 1
    brief_path: flag("--brief", null),
    reference_path: flag("--ref", null),
    reduced_motion: argv.includes("--reduced-motion"),
    max_iterations: max,
    token_budget: budget,
    tokens_used: 0,
    iteration: 0,
    verdict: "pending",
    iterations: [],
    fingerprints: {},
    fixes: [],
    started_at: new Date().toISOString(),
  };
  saveState(statePath, state);
  console.log(JSON.stringify({ ok: true, state_path: statePath, state }, null, 2));
}

function cmdRecord() {
  const statePath = flag("--state");
  const evalPath = flag("--eval");
  if (!statePath || !evalPath) { console.error("--state and --eval required"); exit(2); }
  const state = loadState(statePath);
  const ev = JSON.parse(readFileSync(evalPath, "utf8"));

  // Monotonicity assertion: each record() advances exactly one iteration. If the
  // evaluator reports an iteration that disagrees with the script's own counter,
  // the loop is desynced — fail loudly instead of trusting the eval's number,
  // which would corrupt regression fingerprinting (state.iteration is the key
  // used at :108-134) and budget accounting.
  const expected = state.iteration + 1;
  if (ev.iteration != null && ev.iteration !== expected) {
    console.error(`loop desync: eval.iteration=${ev.iteration} expected=${expected}`);
    exit(2);
  }
  state.iteration = expected;
  const scores = ev.aggregate_scores || {};
  const failingDims = DIMS.filter((d) => (scores[d] ?? 3) < 3);
  const total = DIMS.reduce((a, d) => a + (scores[d] ?? 3), 0);
  const pass = failingDims.length === 0;
  const issues = Array.isArray(ev.top_issues) ? ev.top_issues.slice(0, 3) : [];

  // regression tracking — update fingerprints
  const seenThisIter = new Set();
  for (const it of issues) {
    const fp = fingerprintIssue(it);
    seenThisIter.add(fp);
    if (!state.fingerprints[fp]) state.fingerprints[fp] = { iterations: [], description: it.description, dim: it.dim };
    if (!state.fingerprints[fp].iterations.includes(state.iteration)) {
      state.fingerprints[fp].iterations.push(state.iteration);
    }
  }
  // Reset fingerprints that did NOT recur this iteration so we count CONSECUTIVE recurrences.
  // The kill criterion is "same issue recurred 3x consecutively" — non-consecutive doesn't kill.
  for (const fp of Object.keys(state.fingerprints)) {
    if (!seenThisIter.has(fp)) {
      const fpRec = state.fingerprints[fp];
      const last = fpRec.iterations[fpRec.iterations.length - 1];
      if (last !== state.iteration && last !== state.iteration - 1) {
        // gap → reset run length but keep history
        fpRec.iterations = [];
      }
    }
  }

  const regression = Object.entries(state.fingerprints).find(([, v]) => {
    const its = v.iterations.slice(-3);
    return its.length >= 3 && its.every((n, i, arr) => i === 0 || n === arr[i - 1] + 1);
  });

  // Charge the fixed per-iteration cost — do NOT trust ev.tokens_used.
  state.tokens_used += PER_ITER_TOKENS;

  state.iterations.push({
    iteration: state.iteration,
    scores: { ...scores },
    aggregate: total,
    pass,
    failing_dims: failingDims,
    top_issues: issues,
    tokens_used: PER_ITER_TOKENS,
    timestamp: new Date().toISOString(),
  });

  // verdict logic — order matters
  if (pass) state.verdict = "success";
  else if (regression) {
    state.verdict = "killed_regression";
    state.kill_reason = `LOOP_REGRESSION_DETECTED: ${regression[0]} recurred in 3 consecutive iterations`;
    state.kill_fingerprint = regression[0];
  } else if (state.tokens_used > state.token_budget) {
    state.verdict = "out_of_budget";
    state.kill_reason = `OUT_OF_BUDGET: ${state.tokens_used} > ${state.token_budget}`;
  } else if (state.iteration >= state.max_iterations) {
    state.verdict = "killed_max_iterations";
    state.kill_reason = `MAX_ITERATIONS_REACHED: ${state.iteration} >= ${state.max_iterations}`;
  } else {
    state.verdict = "continue";
  }

  saveState(statePath, state);
  console.log(JSON.stringify({
    iteration: state.iteration,
    pass,
    verdict: state.verdict,
    failing_dims: failingDims,
    aggregate: total,
    tokens_used: state.tokens_used,
    token_budget: state.token_budget,
    issues_to_fix: state.verdict === "continue" ? issues : [],
    kill_reason: state.kill_reason || null,
  }, null, 2));
  // exit codes: 0 = success, 1 = continue, 2 = error, 3 = killed
  if (state.verdict === "success") exit(0);
  if (state.verdict === "continue") exit(1);
  exit(3);
}

function cmdStatus() {
  const statePath = flag("--state");
  if (!statePath) { console.error("--state required"); exit(2); }
  const state = loadState(statePath);
  console.log(JSON.stringify({
    verdict: state.verdict,
    iteration: state.iteration,
    max_iterations: state.max_iterations,
    tokens_used: state.tokens_used,
    token_budget: state.token_budget,
    fixes_applied: state.fixes.length,
    last_aggregate: state.iterations.length ? state.iterations[state.iterations.length - 1].aggregate : null,
  }, null, 2));
}

function cmdCommitFix() {
  const statePath = flag("--state");
  const file = flag("--file");
  const slug = flag("--slug", "fix");
  if (!statePath || !file) { console.error("--state and --file required"); exit(2); }
  const state = loadState(statePath);

  // slop-detect gate — block on critical findings. Resolve the script path with
  // a search order so installs that put slop-detect in non-default locations
  // still gate. Silent skip is reserved for genuinely missing installs.
  const slopBin = process.env.SLOP_DETECT_BIN || "node";
  const slopCandidates = [
    process.env.SLOP_DETECT_SCRIPT,
    `${process.env.HOME}/.claude/bin/slop-detect.mjs`,
    path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "bin", "slop-detect.mjs"),
  ].filter(Boolean);
  const slopScript = slopCandidates.find((p) => existsSync(p));
  if (slopScript) {
    const r = spawnSync(slopBin, [slopScript, file], { encoding: "utf8" });
    if (r.status === 1) {
      console.log(JSON.stringify({ ok: false, gate: "slop-detect", file, output: r.stdout }, null, 2));
      exit(2);
    }
  }

  // Stage + commit. Set a bot identity inline so the commit works on fresh
  // clones where git user.name / user.email aren't configured yet.
  const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 48);
  const msg = `qpl-${state.iteration}: ${safeSlug}`;
  const add = spawnSync("git", ["add", file], { encoding: "utf8" });
  if (add.status !== 0) { console.error(add.stderr); exit(2); }
  const commit = spawnSync("git", [
    "-c", "user.name=Qualia Polish Loop",
    "-c", "user.email=polish-loop@qualia.solutions",
    "commit", "-m", msg,
  ], { encoding: "utf8" });
  if (commit.status !== 0) {
    // empty diff → nothing to commit; not fatal
    if (/nothing to commit/i.test(commit.stdout + commit.stderr)) {
      console.log(JSON.stringify({ ok: true, committed: false, reason: "no-op" }));
      return;
    }
    console.error(commit.stderr); exit(2);
  }
  const sha = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
  state.fixes.push({ iteration: state.iteration, file, slug: safeSlug, sha, ts: new Date().toISOString() });
  saveState(statePath, state);
  console.log(JSON.stringify({ ok: true, committed: true, sha, msg }, null, 2));
}

function cmdReport() {
  const statePath = flag("--state");
  if (!statePath) { console.error("--state required"); exit(2); }
  const state = loadState(statePath);
  const lines = [];
  lines.push(`# Visual-Polish Loop Report`);
  lines.push("");
  if (Array.isArray(state.urls) && state.urls.length > 1) {
    lines.push(`- **URLs (${state.urls.length}):** ${state.urls.join(", ")}`);
  } else {
    lines.push(`- **URL:** ${state.url}`);
  }
  lines.push(`- **Brief:** ${state.brief_path || "_(none)_"}`);
  if (state.reduced_motion) lines.push(`- **Reduced motion:** forced`);
  lines.push(`- **Started:** ${state.started_at}`);
  lines.push(`- **Final verdict:** ${state.verdict.toUpperCase()}${state.kill_reason ? ` — ${state.kill_reason}` : ""}`);
  lines.push(`- **Iterations:** ${state.iteration} / ${state.max_iterations}`);
  lines.push(`- **Tokens used:** ${state.tokens_used} / ${state.token_budget}`);
  lines.push(`- **Fixes committed:** ${state.fixes.length}`);
  lines.push("");
  lines.push("## Iteration log");
  for (const it of state.iterations) {
    lines.push("");
    lines.push(`### Iteration ${it.iteration}`);
    const dims = DIMS.map((d) => `${d.slice(0, 4)}=${it.scores[d] ?? "?"}`).join(" ");
    lines.push(`- Scores: ${dims}`);
    lines.push(`- Aggregate: ${it.aggregate}/${DIMS.length * 5} (avg ${(it.aggregate / DIMS.length).toFixed(2)})`);
    lines.push(`- Pass: ${it.pass ? "YES" : "NO"} ${it.failing_dims.length ? `(failing: ${it.failing_dims.join(", ")})` : ""}`);
    if (it.top_issues && it.top_issues.length) {
      lines.push(`- Top issues:`);
      for (const iss of it.top_issues) {
        lines.push(`  - **${iss.dim}** [${iss.severity}] ${iss.description} → ${iss.likely_file || "_(file?)_"}`);
      }
    }
  }
  if (state.fixes.length) {
    lines.push("");
    lines.push("## Fix commits (revertable)");
    for (const f of state.fixes) lines.push(`- \`${f.sha}\` qpl-${f.iteration}: ${f.slug} — ${f.file}`);
  }
  if (Object.keys(state.fingerprints).length) {
    lines.push("");
    lines.push("## Issue fingerprints (regression tracker)");
    for (const [fp, rec] of Object.entries(state.fingerprints)) {
      lines.push(`- \`${fp}\` — iterations ${JSON.stringify(rec.iterations)} — ${rec.description || ""}`);
    }
  }
  console.log(lines.join("\n"));
}

// ── dispatch ─────────────────────────────────────────────────────────────
const cmd = argv[2];
switch (cmd) {
  case "init":       cmdInit(); break;
  case "record":     cmdRecord(); break;
  case "status":     cmdStatus(); break;
  case "commit-fix": cmdCommitFix(); break;
  case "report":     cmdReport(); break;
  case "--help":
  case "-h":
  case undefined:
    console.log(`loop.mjs — orchestrator for /qualia-polish --loop

Commands:
  init       --state PATH (--url URL | --routes URL1,URL2,...) [--brief PATH] [--ref PATH] [--max 8] [--budget 100000] [--reduced-motion]
  record     --state PATH --eval PATH
  status     --state PATH
  commit-fix --state PATH --file PATH --slug TEXT
  report     --state PATH > report.md

Multi-route mode (v5.2):
  --routes wins over --url. State stores both state.url (first, backward
  compat) and state.urls (full list). Orchestrator drives capture+eval
  per URL; aggregate scores are min across URLs and viewports.

Reduced-motion mode (v5.2):
  --reduced-motion is recorded in state.reduced_motion. Capture script
  is invoked with --reduced-motion which forces prefers-reduced-motion.
  Vision evaluator scores motion on CSS-declaration quality only.

Exit codes (record):
  0 = success (all dims >= 3)    1 = continue (more iterations needed)
  2 = invocation error            3 = killed (regression / budget / max)`);
    exit(cmd ? 0 : 2);
  default:
    console.error(`unknown command: ${cmd}`);
    exit(2);
}
