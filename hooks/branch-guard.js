#!/usr/bin/env node
// ~/.claude/hooks/branch-guard.js — ACCOUNTABILITY for non-OWNER pushes to
// main/master. Policy changed in v6.10: pushing to main is no longer BLOCKED.
// Instead every employee push to a protected branch is COUNTED — recorded
// locally (per-employee total) and reported to the ERP as a policy-event the
// OWNER can see — and the employee gets a visible notice. OWNER pushes are
// unaffected and silent. This hook never blocks (always exits 0).
//
// PreToolUse hook on `git push*`. Reads role from ~/.claude/.qualia-config.json.
// Mirrors the allow-and-record model of fawzi-approval-guard.js.
// Cross-platform (Windows/macOS/Linux).

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const _traceStart = Date.now();

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}

const QUALIA_HOME = qualiaHome();
const CONFIG = path.join(QUALIA_HOME, ".qualia-config.json");
const EVENT_FILE = path.join(QUALIA_HOME, ".main-push-events.json");

function _trace(result, extra) {
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const entry = {
      hook: "branch-guard",
      result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart,
      ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    try { fs.chmodSync(tmp, 0o600); } catch {}
    fs.renameSync(tmp, file);
  } catch {}
}

// Record the push locally and return the event (with the running per-actor count).
function recordLocal(config, branch) {
  const data = readJson(EVENT_FILE, { counts: {}, events: [] });
  if (!data.counts || typeof data.counts !== "object") data.counts = {};
  if (!Array.isArray(data.events)) data.events = [];

  const key = config.code || config.installed_by || "unknown";
  const prev = data.counts[key] || {};
  const count = (prev.total || 0) + 1;
  const event = {
    type: "employee_main_push",
    actor_code: config.code || "",
    actor_name: config.installed_by || "",
    actor_role: config.role || "",
    count,
    branch,
    project: path.basename(process.cwd()),
    cwd: process.cwd(),
    recorded_at: new Date().toISOString(),
  };

  data.counts[key] = {
    actor_code: event.actor_code,
    actor_name: event.actor_name,
    actor_role: event.actor_role,
    total: count,
    last_seen_at: event.recorded_at,
  };
  data.events.push(event);
  data.events = data.events.slice(-200);
  writeJson(EVENT_FILE, data);
  return event;
}

// Queue the event for the ERP (idempotent, retried by erp-retry.js). Same
// /api/v1/policy-events endpoint the proxy-approval guard uses — the ERP stores
// by (type, actor_code) so the OWNER sees a per-employee main-push tally.
function enqueueErp(config, event) {
  try {
    if (config.erp && config.erp.enabled === false) return;
    const retryPath = path.join(QUALIA_HOME, "bin", "erp-retry.js");
    if (!fs.existsSync(retryPath)) return;
    const erpUrl = (config.erp && config.erp.url) || "https://portal.qualiasolutions.net";
    const { enqueue } = require(retryPath);
    enqueue({
      client_report_id: `QS-MAINPUSH-${(event.actor_code || "UNKNOWN").replace(/[^A-Z0-9-]/gi, "")}-${event.count}`,
      idempotency_key: crypto.randomUUID ? crypto.randomUUID() : "",
      url: `${erpUrl.replace(/\/$/, "")}/api/v1/policy-events`,
      payload: JSON.stringify(event),
      last_error: "",
    });
  } catch {}
}

function notify(event, branch) {
  // Visible, non-blocking notice. The push proceeds either way.
  const who = event.actor_name || event.actor_code || "you";
  const lines = [
    `⬢ NOTICE: ${who} pushed to '${branch}'.`,
    `  Recorded (framework + ERP) and visible to the OWNER — main-push #${event.count}.`,
    `  Prefer a feature branch + review for changes that aren't trivially safe.`,
  ];
  for (const l of lines) console.error(l);
}

// ── role ────────────────────────────────────────────────────────────────────
const config = readJson(CONFIG, null);
if (!config) {
  // Can't classify without config — but the hook no longer blocks anything.
  _trace("allow", { reason: "config missing/unreadable" });
  process.exit(0);
}
const role = (config.role || "").toUpperCase();

// OWNER pushes to main are normal and unremarkable. Anything that isn't a known
// EMPLOYEE is also left alone (nothing to attribute).
if (role !== "EMPLOYEE") {
  _trace("allow", { role });
  process.exit(0);
}

// ── detect a push that targets a protected branch ───────────────────────────
let pushCommand = "";
try {
  if (!process.stdin.isTTY) {
    const raw = fs.readFileSync(0, "utf8");
    if (raw && raw.trim()) {
      const payload = JSON.parse(raw);
      pushCommand = (payload && payload.tool_input && payload.tool_input.command) || "";
    }
  }
} catch {
  // No stdin or non-JSON — fall through to the --show-current check.
}

// Explicit refspec form: <src>:<dst>, :<dst>, +<src>:<dst> targeting main/master.
function refspecTargetsProtected(cmd) {
  if (!cmd || typeof cmd !== "string") return null;
  const tokens = cmd.split(/\s+/).filter(Boolean);
  const pushIdx = tokens.indexOf("push");
  if (pushIdx === -1) return null;
  for (let i = pushIdx + 1; i < tokens.length; i++) {
    let tok = tokens[i];
    if (tok.startsWith("-")) continue;
    if (tok.startsWith("+")) tok = tok.slice(1);
    tok = tok.replace(/^['"]|['"]$/g, "");
    if (tok.includes(":")) {
      const parts = tok.split(":");
      const dst = parts[parts.length - 1].replace(/^refs\/heads\//, "");
      if (dst === "main" || dst === "master") return dst;
    }
  }
  return null;
}

let target = refspecTargetsProtected(pushCommand);
if (!target) {
  const r = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    timeout: 3000,
    shell: process.platform === "win32",
  });
  const branch = ((r.stdout || "").trim());
  if (branch === "main" || branch === "master") target = branch;
}

if (!target) {
  // Not a protected-branch push — nothing to record.
  _trace("allow", { role });
  process.exit(0);
}

// ── count + notify, then ALLOW ──────────────────────────────────────────────
const event = recordLocal(config, target);
enqueueErp(config, event);
notify(event, target);
_trace("allow", { role, recorded: true, branch: target, count: event.count });
process.exit(0);
