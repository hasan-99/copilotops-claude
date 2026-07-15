#!/usr/bin/env node
// wave-plan.js — derive a deterministic build schedule from the task DAG.
//
// WHY: /qualia-build spawned EVERY task in a contract "wave" concurrently, with
// no cap. That's two failure modes at once:
//   1. Over-serialization — the planner's hand-numbered waves can be deeper than
//      the dependency graph requires (tasks that COULD run together placed in
//      separate waves), so the build is slower than necessary.
//   2. Over-parallelization — a wide wave (say 9 independent tasks) spawns 9
//      concurrent builders, past the 3–5 sweet spot where coordination +
//      context cost overwhelms the gain (the LangGraph max_concurrency lesson).
//
// This recomputes waves from `depends_on` (minimal-depth topological levels —
// maximal safe parallelism) and splits each level into batches capped at
// max_concurrency. Output is an ordered list of batches the orchestrator spawns
// one at a time. Deterministic: same contract + same cap → same schedule.
//
// max_concurrency:
//   --parallel N  → exactly N (N ≥ 1)
//   auto (default)→ 1 if < 3 total tasks ("don't parallelize tiny phases"),
//                   else SWEET (5).
//
// Zero npm dependencies. Library + CLI. Exit 0 ok, 1 cycle, 2 invocation error.

const fs = require("fs");
const path = require("path");
const pc = require("./plan-contract.js");

const SWEET = 5;

function numericId(id) {
  const m = String(id).match(/\d+/);
  return m ? Number(m[0]) : 0;
}

// Minimal-depth level for each task: level = 1 + max(level(deps)); roots = 1.
// Returns { levels: Map<id,level>, cycle: [...] | null }.
function deriveLevels(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const levels = new Map();
  const visiting = new Set();

  function depth(id, trail) {
    if (levels.has(id)) return levels.get(id);
    if (visiting.has(id)) {
      const err = new Error("cycle");
      err.cycle = [...trail, id];
      throw err;
    }
    const t = byId.get(id);
    const deps = (t && t.depends_on) || [];
    visiting.add(id);
    let max = 0;
    for (const d of deps) {
      if (!byId.has(d)) continue; // unknown dep — plan-contract validates this separately
      max = Math.max(max, depth(d, [...trail, id]));
    }
    visiting.delete(id);
    const lvl = max + 1;
    levels.set(id, lvl);
    return lvl;
  }

  try {
    for (const t of tasks) depth(t.id, []);
  } catch (e) {
    if (e.cycle) return { levels: null, cycle: e.cycle };
    throw e;
  }
  return { levels, cycle: null };
}

function resolveConcurrency(taskCount, parallel) {
  if (parallel != null) {
    const n = Number(parallel);
    if (!Number.isFinite(n) || n < 1) throw new Error(`--parallel must be an integer ≥ 1 (got ${parallel})`);
    return Math.floor(n);
  }
  return taskCount < 3 ? 1 : SWEET;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function plan(contract, opts = {}) {
  const tasks = (contract.tasks || []).slice();
  const { levels, cycle } = deriveLevels(tasks);
  if (cycle) return { ok: false, error: "CYCLE", cycle: cycle.join(" → ") };

  const maxConcurrency = resolveConcurrency(tasks.length, opts.parallel);

  // Group task ids by derived level, ordered numerically within a level.
  const byLevel = new Map();
  for (const t of tasks) {
    const lvl = levels.get(t.id);
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(t.id);
  }
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);

  // Emit batches: each derived level split into ≤ maxConcurrency chunks.
  const batches = [];
  for (const lvl of sortedLevels) {
    const ids = byLevel.get(lvl).sort((a, b) => numericId(a) - numericId(b));
    for (const group of chunk(ids, maxConcurrency)) {
      batches.push({ wave: lvl, batch: batches.length + 1, tasks: group });
    }
  }

  // Note where the planner's declared wave is deeper than necessary (the DAG
  // permits more parallelism than the contract used).
  const notes = [];
  const declared = new Map(tasks.map((t) => [t.id, t.wave]));
  let overSerialized = 0;
  for (const t of tasks) {
    const d = declared.get(t.id);
    const derived = levels.get(t.id);
    if (typeof d === "number" && d > derived) overSerialized++;
  }
  if (overSerialized > 0) {
    notes.push(`${overSerialized} task(s) declared a deeper wave than the dependency graph requires — the schedule below runs them earlier (more parallel).`);
  }
  const widest = Math.max(0, ...sortedLevels.map((l) => byLevel.get(l).length));
  if (widest > maxConcurrency) {
    notes.push(`widest level has ${widest} independent tasks; capped to batches of ${maxConcurrency}.`);
  }

  return {
    ok: true,
    phase: contract.phase != null ? contract.phase : null,
    task_count: tasks.length,
    max_concurrency: maxConcurrency,
    derived_levels: sortedLevels.length,
    batch_count: batches.length,
    batches,
    notes,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--parallel") args.parallel = argv[++i];
    else if (a.startsWith("--parallel=")) args.parallel = a.slice(11);
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.error([
    "Usage:",
    "  wave-plan.js <contract.json> [--parallel N] [--json] [--cwd DIR]",
    "",
    "Derives a dependency-ordered, concurrency-capped build schedule.",
    "Exit 0 = ok, 1 = cycle in DAG, 2 = invocation error.",
  ].join("\n"));
}

function main(argv) {
  const args = parseArgs(argv);
  const contractPath = args._[0];
  if (!contractPath || contractPath === "-h" || contractPath === "--help") { usage(); return 2; }
  const root = path.resolve(args.cwd || process.cwd());

  const loaded = pc.readContractFile(path.resolve(root, contractPath));
  if (!loaded.ok) {
    if (args.json) console.log(JSON.stringify({ ok: false, ...loaded }));
    else console.error(`${loaded.error}: ${loaded.message}`);
    return 2;
  }

  let result;
  try {
    result = plan(loaded.contract, { parallel: args.parallel });
  } catch (e) {
    if (args.json) console.log(JSON.stringify({ ok: false, error: "BAD_ARG", message: e.message }));
    else console.error(`ERROR: ${e.message}`);
    return 2;
  }

  if (!result.ok) {
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else console.error(`${result.error}: ${result.cycle || ""}`);
    return result.error === "CYCLE" ? 1 : 2;
  }

  if (args.json) { console.log(JSON.stringify(result, null, 2)); return 0; }

  console.log(`Build schedule — phase ${result.phase}: ${result.task_count} task(s), ` +
    `${result.batch_count} batch(es), max ${result.max_concurrency} concurrent`);
  for (const b of result.batches) {
    console.log(`  wave ${b.wave} · batch ${b.batch}: ${b.tasks.join(", ")}`);
  }
  for (const n of result.notes) console.log(`  note: ${n}`);
  return 0;
}

module.exports = { deriveLevels, resolveConcurrency, plan, SWEET };

if (require.main === module) {
  process.exit(main(process.argv));
}
