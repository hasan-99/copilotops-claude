#!/usr/bin/env node
// Agent runs telemetry — JSONL writer + reader. See docs/agent-runs.md.
//
// Pure library. Atomic writes via fs.appendFileSync (single write() syscall
// to an O_APPEND file descriptor; safe at our record sizes — see the spec).
//
// Zero npm dependencies.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SCHEMA_VERSION = 1;

const VALID_AGENT_TYPES = new Set([
  "planner", "plan-checker", "builder", "verifier", "qa-browser",
  "researcher", "research-synthesizer", "roadmapper", "team-orchestrator",
  "custom",
]);

const VALID_STATUS = new Set([
  "success", "partial", "blocked", "failure", "timeout", "interrupted",
]);

// One UUID per process — fallback when Claude Code doesn't expose a session id.
let _processSessionId = null;
function processSessionId() {
  if (!_processSessionId) {
    const buf = crypto.randomBytes(16);
    // RFC 4122 v4
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const h = buf.toString("hex");
    _processSessionId = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  return _processSessionId;
}

// ULID-ish: timestamp prefix + random suffix. Sortable by time.
function newRunId() {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const rand = crypto.randomBytes(10).toString("hex").toUpperCase();
  return `${ts}${rand}`.slice(0, 26);
}

function planningDir(cwd) {
  return path.join(cwd || process.cwd(), ".planning");
}

function jsonlPath(cwd) {
  return path.join(planningDir(cwd), "agent-runs.jsonl");
}

function logDir(cwd) {
  return path.join(planningDir(cwd), "agent-runs");
}

function telemetryEnabled() {
  return (process.env.QUALIA_TELEMETRY || "").toLowerCase() !== "off";
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function truncTail(s, max) {
  if (typeof s !== "string") return undefined;
  if (s.length <= max) return s;
  return s.slice(s.length - max);
}

// ─── Writer ────────────────────────────────────────────────────────────

// start({ agent_type, model, ... }) → opaque token used by finish()
function start(opts) {
  const now = new Date().toISOString();
  const token = {
    started_at: now,
    started_ms: Date.now(),
    record: {
      schema_version: SCHEMA_VERSION,
      run_id: opts.run_id || newRunId(),
      parent_run_id: opts.parent_run_id || undefined,
      skill_invocation_id: opts.skill_invocation_id || processSessionId(),
      session_id: opts.session_id || processSessionId(),
      agent_type: opts.agent_type,
      agent_name: opts.agent_name || undefined,
      model: opts.model,
      effort: opts.effort || undefined,
      project: opts.project || undefined,
      phase: opts.phase != null ? opts.phase : undefined,
      milestone: opts.milestone != null ? opts.milestone : undefined,
      task_id: opts.task_id || undefined,
      wave: opts.wave != null ? opts.wave : undefined,
      retry_of: opts.retry_of || undefined,
      started_at: now,
    },
  };
  return token;
}

// finish(token, { status, ... }) → writes the JSONL line + optional log file
function finish(token, result) {
  if (!token || !token.record) throw new Error("finish: invalid token");
  if (!telemetryEnabled()) return { written: false, reason: "telemetry-off" };

  const cwd = result.cwd || process.cwd();
  if (!fs.existsSync(planningDir(cwd))) {
    return { written: false, reason: "no-planning-dir" };
  }

  const finishedMs = Date.now();
  const record = {
    ...token.record,
    status: result.status,
    started_at: token.record.started_at,
    finished_at: new Date(finishedMs).toISOString(),
    duration_ms: finishedMs - token.started_ms,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    cache_read_tokens: result.cache_read_tokens,
    cache_creation_tokens: result.cache_creation_tokens,
    tool_calls_count: result.tool_calls_count,
    files_changed: Array.isArray(result.files_changed) ? [...new Set(result.files_changed)] : undefined,
    commit_sha: result.commit_sha || undefined,
    verifier_score: result.verifier_score,
    verification_result: result.verification_result,
    failure_reason: result.failure_reason,
    failure_detail: truncTail(result.failure_detail, 500),
  };

  if (!VALID_AGENT_TYPES.has(record.agent_type)) {
    record.failure_reason = record.failure_reason || "unknown";
    // don't reject — we want the trace even if the caller misnamed itself
  }
  if (!VALID_STATUS.has(record.status)) {
    record.status = "failure";
    record.failure_reason = record.failure_reason || "unknown";
  }

  // Side log for non-success runs.
  if (record.status !== "success" && typeof result.full_stderr === "string" && result.full_stderr.length) {
    try {
      ensureDir(logDir(cwd));
      const logFile = path.join(logDir(cwd), `${record.run_id}.log`);
      fs.writeFileSync(logFile, result.full_stderr);
      record.log_file = path.relative(cwd, logFile).split(path.sep).join("/");
    } catch {
      // Side-log is best-effort — never block the JSONL write.
    }
  }

  // Drop undefined keys for a compact line.
  const clean = {};
  for (const [k, v] of Object.entries(record)) if (v !== undefined) clean[k] = v;

  const line = JSON.stringify(clean) + "\n";
  ensureDir(planningDir(cwd));
  fs.appendFileSync(jsonlPath(cwd), line);
  return { written: true, run_id: record.run_id, log_file: record.log_file };
}

// ─── Reader ────────────────────────────────────────────────────────────

function read(cwd, opts) {
  const file = jsonlPath(cwd);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const records = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); }
    catch { /* skip corrupt line; we never want a single bad record to mask the rest */ }
  }
  let out = records;
  if (opts && opts.failed) {
    out = out.filter((r) => r.status !== "success");
  }
  if (opts && opts.task_id) {
    out = out.filter((r) => r.task_id === opts.task_id);
  }
  if (opts && opts.phase != null) {
    out = out.filter((r) => r.phase === opts.phase);
  }
  if (opts && opts.limit) {
    out = out.slice(-opts.limit);
  }
  return out;
}

function prune(cwd, beforeIso) {
  const file = jsonlPath(cwd);
  if (!fs.existsSync(file)) return { removed: 0, logs_removed: 0 };
  const cutoff = Date.parse(beforeIso);
  if (!Number.isFinite(cutoff)) throw new Error(`prune: invalid date "${beforeIso}"`);

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const kept = [];
  const removedRunIds = [];
  for (const line of lines) {
    let rec;
    try { rec = JSON.parse(line); }
    catch { kept.push(line); continue; } // preserve unparseable; never destroy data we don't understand
    const ts = Date.parse(rec.finished_at || rec.started_at || "");
    if (Number.isFinite(ts) && ts < cutoff) {
      removedRunIds.push(rec.run_id);
    } else {
      kept.push(line);
    }
  }
  fs.writeFileSync(file, kept.join("\n") + (kept.length ? "\n" : ""));

  let logsRemoved = 0;
  if (fs.existsSync(logDir(cwd))) {
    for (const id of removedRunIds) {
      const lf = path.join(logDir(cwd), `${id}.log`);
      try { fs.unlinkSync(lf); logsRemoved++; } catch {}
    }
  }
  return { removed: removedRunIds.length, logs_removed: logsRemoved };
}

module.exports = {
  SCHEMA_VERSION,
  start,
  finish,
  read,
  prune,
  // exposed for tests / introspection
  newRunId,
  processSessionId,
  jsonlPath,
  logDir,
};
