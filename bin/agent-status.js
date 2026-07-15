#!/usr/bin/env node
// agent-status.js — machine-readable per-task build status + fan-in barrier.
//
// The gap this closes: `qualia-build` spawns one subagent per task and the
// orchestrator LLM has to *read* each builder's "DONE/BLOCKED/PARTIAL" prose to
// know a wave finished. That's not a barrier — it's the model noticing. This
// helper persists each builder's outcome to `.agent-status/<task>.json` so wave
// completion gates on a deterministic, pollable signal (the parallel-worktrees
// convention) and drives a live wave view.
//
// Builder convention (see skills/qualia-build):
//   1. At task start:  agent-status.js write <task> RUNNING --phase N --wave W
//   2. At task end:    agent-status.js write <task> DONE --commit <hash>
//                      (or BLOCKED / PARTIAL with a --note)
// Orchestrator after spawning a wave:
//      agent-status.js barrier <contract.json> --wave W   # exit 0 ⇔ all DONE
//
// Zero npm dependencies. Library + tiny CLI.

const fs = require("fs");
const path = require("path");
const pc = require("./plan-contract.js");

const STATUSES = new Set(["RUNNING", "DONE", "BLOCKED", "PARTIAL"]);
const STATUS_DIR = ".agent-status";

function statusDir(root) {
  return path.join(root, STATUS_DIR);
}

// Task ids match ^T\d+$ (plan-contract schema). Reject anything else so a bad
// arg can't write outside .agent-status/ via a traversal in the filename.
function isTaskId(task) {
  return typeof task === "string" && /^T\d+$/.test(task);
}

function statusFile(root, task) {
  return path.join(statusDir(root), `${task}.json`);
}

function writeStatus(root, entry) {
  if (!isTaskId(entry.task)) throw new Error(`invalid task id: ${entry.task} (must match ^T\\d+$)`);
  const status = String(entry.status || "").toUpperCase();
  if (!STATUSES.has(status)) throw new Error(`invalid status: ${entry.status} (must be ${[...STATUSES].join("|")})`);
  const dir = statusDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const record = {
    task: entry.task,
    status,
    commit: entry.commit || null,
    note: entry.note || null,
    phase: entry.phase != null ? Number(entry.phase) : null,
    wave: entry.wave != null ? Number(entry.wave) : null,
    updated_at: entry.now || new Date().toISOString(),
  };
  fs.writeFileSync(statusFile(root, entry.task), JSON.stringify(record, null, 2) + "\n");
  return record;
}

function readStatus(root, task) {
  try {
    return JSON.parse(fs.readFileSync(statusFile(root, task), "utf8"));
  } catch {
    return null;
  }
}

function listStatuses(root) {
  const dir = statusDir(root);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    } catch {}
  }
  out.sort((a, b) => String(a.task).localeCompare(String(b.task), undefined, { numeric: true }));
  return out;
}

function clearStatuses(root) {
  const dir = statusDir(root);
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".json")) { fs.unlinkSync(path.join(dir, f)); n++; }
  }
  try { fs.rmdirSync(dir); } catch {}
  return n;
}

// True when a build is in flight: at least one task is RUNNING. R1's pre-write
// guard keys off this so it only enforces file-discipline during a build.
function buildActive(root) {
  return listStatuses(root).some((s) => s.status === "RUNNING");
}

function expectedTaskIds(contract, wave) {
  const tasks = (contract && contract.tasks) || [];
  const filtered = wave != null ? tasks.filter((t) => Number(t.wave) === Number(wave)) : tasks;
  return filtered.map((t) => t.id);
}

// Fan-in barrier: compare the persisted statuses against the expected task ids.
// Expected set = an explicit opts.tasks list (used by wave-plan batches, whose
// derived waves needn't match the contract's declared wave numbers), else the
// contract task ids optionally scoped to opts.wave. ok ⇔ every expected task is
// DONE. Anything else (missing/running/blocked/partial) holds the barrier.
function barrier(root, contract, opts = {}) {
  const expected = Array.isArray(opts.tasks) && opts.tasks.length
    ? opts.tasks
    : expectedTaskIds(contract, opts.wave);
  const byTask = new Map(listStatuses(root).map((s) => [s.task, s]));
  const tasks = expected.map((id) => {
    const s = byTask.get(id);
    return { task: id, status: s ? s.status : "MISSING", commit: s ? s.commit : null, note: s ? s.note : null };
  });
  const count = (st) => tasks.filter((t) => t.status === st).length;
  const done = count("DONE");
  return {
    ok: expected.length > 0 && done === expected.length,
    wave: opts.wave != null ? Number(opts.wave) : null,
    expected: expected.length,
    done,
    blocked: count("BLOCKED"),
    partial: count("PARTIAL"),
    running: count("RUNNING"),
    missing: count("MISSING"),
    tasks,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────
function parseFlags(argv, start) {
  const flags = { _: [] };
  for (let i = start; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") flags.json = true;
    else if (a === "--cwd") flags.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) flags.cwd = a.slice(6);
    else if (a === "--wave") flags.wave = argv[++i];
    else if (a.startsWith("--wave=")) flags.wave = a.slice(7);
    else if (a === "--tasks") flags.tasks = argv[++i];
    else if (a.startsWith("--tasks=")) flags.tasks = a.slice(8);
    else if (a === "--commit") flags.commit = argv[++i];
    else if (a.startsWith("--commit=")) flags.commit = a.slice(9);
    else if (a === "--note") flags.note = argv[++i];
    else if (a.startsWith("--note=")) flags.note = a.slice(7);
    else if (a === "--phase") flags.phase = argv[++i];
    else if (a.startsWith("--phase=")) flags.phase = a.slice(8);
    else flags._.push(a);
  }
  return flags;
}

function usage() {
  console.error([
    "Usage:",
    "  agent-status.js write <task> <status> [--commit H] [--note N] [--phase P] [--wave W] [--cwd DIR]",
    "  agent-status.js read <task> [--cwd DIR] [--json]",
    "  agent-status.js list [--cwd DIR] [--json]",
    "  agent-status.js barrier <contract.json> [--wave W] [--cwd DIR] [--json]",
    "  agent-status.js barrier --tasks T1,T2 [--cwd DIR] [--json]   (batch gate; no contract needed)",
    "  agent-status.js clear [--cwd DIR]",
    "",
    "status ∈ RUNNING | DONE | BLOCKED | PARTIAL",
    "barrier exits 0 ⇔ every expected task is DONE.",
  ].join("\n"));
}

function main(argv) {
  const cmd = argv[2];
  if (!cmd || cmd === "-h" || cmd === "--help") { usage(); return 2; }
  const flags = parseFlags(argv, 3);
  const root = path.resolve(flags.cwd || process.cwd());

  if (cmd === "write") {
    const [task, status] = flags._;
    if (!task || !status) { usage(); return 2; }
    try {
      const rec = writeStatus(root, {
        task, status, commit: flags.commit, note: flags.note, phase: flags.phase, wave: flags.wave,
      });
      if (flags.json) console.log(JSON.stringify(rec));
      else console.log(`${rec.task} ${rec.status}${rec.commit ? ` @ ${rec.commit}` : ""}`);
      return 0;
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      return 2;
    }
  }

  if (cmd === "read") {
    const [task] = flags._;
    if (!task) { usage(); return 2; }
    const rec = readStatus(root, task);
    if (!rec) { console.error(`no status for ${task}`); return 1; }
    if (flags.json) console.log(JSON.stringify(rec));
    else console.log(`${rec.task} ${rec.status}${rec.commit ? ` @ ${rec.commit}` : ""}${rec.note ? ` — ${rec.note}` : ""}`);
    return 0;
  }

  if (cmd === "list") {
    const all = listStatuses(root);
    if (flags.json) { console.log(JSON.stringify(all, null, 2)); return 0; }
    if (all.length === 0) { console.log("(no agent statuses)"); return 0; }
    for (const s of all) console.log(`${s.task}  ${s.status.padEnd(8)}${s.commit ? ` @ ${s.commit}` : ""}${s.note ? ` — ${s.note}` : ""}`);
    return 0;
  }

  if (cmd === "barrier") {
    const [contractPath] = flags._;
    const taskList = flags.tasks ? flags.tasks.split(",").map((s) => s.trim()).filter(Boolean) : null;
    // --tasks gates on an explicit batch; otherwise the contract supplies the set.
    let contract = null;
    if (!taskList) {
      if (!contractPath) { usage(); return 2; }
      const loaded = pc.readContractFile(contractPath);
      if (!loaded.ok) {
        if (flags.json) console.log(JSON.stringify({ ok: false, ...loaded }));
        else console.error(`${loaded.error}: ${loaded.message}`);
        return 2;
      }
      contract = loaded.contract;
    }
    const result = barrier(root, contract, { wave: flags.wave, tasks: taskList });
    if (flags.json) { console.log(JSON.stringify(result, null, 2)); return result.ok ? 0 : 1; }
    const scope = taskList ? `batch ${taskList.join(",")}` : (result.wave != null ? `wave ${result.wave}` : "phase");
    if (result.ok) {
      console.log(`BARRIER PASS (${scope}): ${result.done}/${result.expected} DONE`);
    } else {
      console.error(`BARRIER HOLD (${scope}): ${result.done}/${result.expected} DONE` +
        ` (running=${result.running} blocked=${result.blocked} partial=${result.partial} missing=${result.missing})`);
      for (const t of result.tasks) if (t.status !== "DONE") console.error(`  - ${t.task}: ${t.status}${t.note ? ` — ${t.note}` : ""}`);
    }
    return result.ok ? 0 : 1;
  }

  if (cmd === "clear") {
    const n = clearStatuses(root);
    console.log(`cleared ${n} status file(s)`);
    return 0;
  }

  usage();
  return 2;
}

module.exports = {
  STATUSES,
  STATUS_DIR,
  writeStatus,
  readStatus,
  listStatuses,
  clearStatuses,
  buildActive,
  expectedTaskIds,
  barrier,
};

if (require.main === module) {
  process.exit(main(process.argv));
}
