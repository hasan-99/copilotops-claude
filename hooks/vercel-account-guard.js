#!/usr/bin/env node
// ~/.claude/hooks/vercel-account-guard.js — block deploys from wrong Vercel account.
//
// PreToolUse hook on `Bash`. Reads the proposed command from the Claude Code
// hook payload (stdin JSON: tool_input.command) and exits 2 to BLOCK, 0 to
// allow. Triggers only when the command matches `vercel --prod` or `vercel deploy`.
//
// Allowed teams are read from ~/.claude/.vercel-allowed-teams (one slug per
// line, mode 0600). Missing config file = fail-open with stderr warning.
//
// Cross-platform (Windows/macOS/Linux). No external dependencies.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const _traceStart = Date.now();

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}

const QUALIA_HOME = qualiaHome();

function _trace(result, extra) {
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const entry = {
      hook: "vercel-account-guard",
      result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart,
      ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

// Read hook payload from stdin.
let command = "";
try {
  if (!process.stdin.isTTY) {
    const raw = fs.readFileSync(0, "utf8");
    if (raw) command = (JSON.parse(raw).tool_input || {}).command || "";
  }
} catch {}

if (!command) {
  _trace("allow", { reason: "no-command" });
  process.exit(0);
}

// Only act on vercel deploy commands.
if (!/vercel\s+(--prod|deploy)/.test(command)) {
  _trace("allow", { reason: "not-vercel-deploy" });
  process.exit(0);
}

// Read allowed teams (one slug per line).
const teamsFile = path.join(QUALIA_HOME, ".vercel-allowed-teams");
let allowed;
try {
  allowed = fs.readFileSync(teamsFile, "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
} catch {
  allowed = [];
}
if (allowed.length === 0) {
  console.error("No .vercel-allowed-teams configured -- skipping account check");
  _trace("skipped", { reason: "no-config" });
  process.exit(0);
}

// Run `vercel whoami` to get the active account (fail-open on error).
const r = spawnSync("vercel", ["whoami"], {
  encoding: "utf8", timeout: 5000, shell: process.platform === "win32",
});
const actual = ((r.status === 0 && !r.error) ? (r.stdout || "") : "").trim();
if (!actual) {
  console.error("vercel whoami failed or empty -- skipping account check");
  _trace("skipped", { reason: "whoami-unavailable" });
  process.exit(0);
}

if (allowed.includes(actual)) {
  _trace("allow", { actual, allowed_count: allowed.length });
  process.exit(0);
}

// Block: wrong account.
const msg = `BLOCKED: Wrong Vercel account/team. Active: '${actual}'. Allowed: ${allowed.join(", ")}. Run \`vercel switch ${allowed[0]}\` first, or add this team to ${path.join(QUALIA_HOME, ".vercel-allowed-teams")}.`;
console.error(msg);
console.log(msg);
_trace("block", { actual, allowed_count: allowed.length, reason: "wrong-account" });
process.exit(2);
