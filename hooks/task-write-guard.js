#!/usr/bin/env node
// ~/.claude/hooks/task-write-guard.js — runtime enforcement of the plan
// contract's declared file sets. PreToolUse hook on Edit/Write.
// Exits 2 to BLOCK. Exits 0 to allow. Cross-platform (Windows/macOS/Linux).
//
// WHY: plan-contract.js proves file-disjointness across parallel tasks at PLAN
// time, but nothing stops a builder writing outside its declared set at RUN
// time — the documented #1 cause of cross-wave merge conflicts and AI entropy
// (files nobody planned). This turns the static check into a deterministic
// guardrail ("a rule worth enforcing is worth a hook" — constitution).
//
// SCOPE & HONEST LIMITATION: Claude Code fires the same stateless hook for
// every subagent and gives it no task identity, so this hook cannot attribute a
// write to a *specific* task. What it CAN enforce — and does — is that, while a
// build is in flight, every Edit/Write targets a path DECLARED by SOME task in
// the active phase contract (files_modify ∪ files_create). Plan-time
// disjointness already guarantees no two tasks share a path, and the builder's
// <wave_context> prompt tells it which set is its own; so the residual gap
// ("T3 edits T4's declared file") is prompt-guarded while the high-frequency
// vector ("builder invents/edits a file nobody planned") is hard-blocked.
//
// The guard is SCOPED: it is a no-op unless a build is active (≥1 RUNNING entry
// in .agent-status/). Outside a build it never fires, so it can't interfere with
// the orchestrator, the verifier, or ordinary editing. Fails OPEN on any error.

const fs = require("fs");
const path = require("path");

const _traceStart = Date.now();

// ── stdin reader (same robust pattern as the other guards) ──────────────
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {}
}
function readInput() {
  const deadline = Date.now() + 1000;
  const buf = Buffer.alloc(65536);
  let data = "";
  try {
    while (Date.now() < deadline) {
      let n = 0;
      try {
        n = fs.readSync(0, buf, 0, buf.length, null);
      } catch (e) {
        if (e && (e.code === "EAGAIN" || e.code === "EWOULDBLOCK")) { sleepSync(1); continue; }
        break;
      }
      if (n === 0) break;
      data += buf.slice(0, n).toString("utf8");
    }
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function _trace(result, extra) {
  try {
    const os = require("os");
    const parent = path.basename(path.dirname(__dirname));
    const qualiaHome = process.env.QUALIA_HOME ||
      (parent === ".codex" || parent === ".claude" ? path.dirname(__dirname) : path.join(os.homedir(), ".claude"));
    const traceDir = path.join(qualiaHome, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const entry = { hook: "task-write-guard", result, timestamp: new Date().toISOString(), duration_ms: Date.now() - _traceStart, ...extra };
    fs.appendFileSync(path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`), JSON.stringify(entry) + "\n");
  } catch {}
}

function allow(reason, extra) { _trace("allow", { reason, ...extra }); process.exit(0); }

// OWNER / debugging escape hatch, mirroring git-guardrails' QUALIA_ALLOW_*.
if (process.env.QUALIA_ALLOW_OUTSIDE_CONTRACT === "1") allow("escape-hatch");

const input = readInput();
const ti = input.tool_input || {};
const rawPath = String(ti.file_path || "");
if (!rawPath) allow("no file_path");

const root = process.cwd();

// Reuse the status + contract libraries that ship alongside this hook (bin/ is a
// sibling of hooks/ in both the repo and the installed layout). If they're not
// resolvable (older/partial install), fail open.
let agentStatus, planContract;
try {
  agentStatus = require(path.join(__dirname, "..", "bin", "agent-status.js"));
  planContract = require(path.join(__dirname, "..", "bin", "plan-contract.js"));
} catch {
  allow("libs unavailable");
}

// SCOPE: only enforce during an active build (≥1 RUNNING agent-status entry).
let running;
try {
  running = agentStatus.listStatuses(root).filter((s) => s.status === "RUNNING");
} catch {
  allow("status unreadable");
}
if (!running || running.length === 0) allow("no active build");

// Locate the active phase contract. Prefer the phase declared by a RUNNING
// builder; fall back to the sole phase-*-contract.json if unambiguous.
function findContractPath() {
  const phases = [...new Set(running.map((s) => s.phase).filter((p) => p != null))];
  for (const p of phases) {
    const cp = path.join(root, ".planning", `phase-${p}-contract.json`);
    if (fs.existsSync(cp)) return cp;
  }
  try {
    const dir = path.join(root, ".planning");
    const matches = fs.readdirSync(dir).filter((f) => /^phase-\d+-contract\.json$/.test(f));
    if (matches.length === 1) return path.join(dir, matches[0]);
  } catch {}
  return null;
}

const contractPath = findContractPath();
if (!contractPath) allow("no active contract");

let contract;
try {
  const loaded = planContract.readContractFile(contractPath);
  if (!loaded.ok) allow("contract unreadable");
  contract = loaded.contract;
} catch {
  allow("contract parse error");
}

// Build the union of writable declared paths across all tasks.
// Edit/Write create or modify; deletes are out of band for this tool family.
function norm(p) {
  return String(p).replace(/\\/g, "/").replace(/^\.\//, "");
}
const declared = new Set();
for (const t of contract.tasks || []) {
  for (const f of t.files_modify || []) declared.add(norm(f));
  for (const f of t.files_create || []) declared.add(norm(f));
}

// Resolve the target to a path relative to the project root.
const abs = path.isAbsolute(rawPath) ? rawPath : path.resolve(root, rawPath);
const rel = norm(path.relative(root, abs));

// Out of project root → not this guard's concern (other guards handle secrets).
if (rel.startsWith("../") || rel === "" || path.isAbsolute(rel)) allow("outside project root", { rel });

// Framework scratch / planning artifacts are always writable during a build:
// the status protocol, evidence, deviations, plan and contract files.
if (rel.startsWith(".agent-status/") || rel.startsWith(".planning/")) allow("framework path", { rel });

if (declared.has(rel)) allow("declared", { rel });

// Not declared by any task → block.
console.error("⬢ task-write-guard — write outside the plan contract:");
console.error(`  ✗ ${rel}`);
console.error("");
console.error(`  No task in ${path.relative(root, contractPath)} declares this file`);
console.error("  (files_modify / files_create). Builders may only write files");
console.error("  their task planned. If this file is genuinely needed, add it to");
console.error("  the contract via the locked-decision channel, or re-plan the phase.");
console.error("  OWNER override: QUALIA_ALLOW_OUTSIDE_CONTRACT=1");
_trace("block", { rel, contract: path.relative(root, contractPath) });
process.exit(2);
