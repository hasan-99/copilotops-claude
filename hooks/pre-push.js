#!/usr/bin/env node
// ~/.claude/hooks/pre-push.js — stamp .planning/tracking.json on push.
//
// Stamps last_commit + last_pushed_at locally on every `git push`. Does NOT
// commit, stage, or push tracking.json. The file is consumed by local readers
// only:
//   - bin/statusline.js          (renders last-push time)
//   - hooks/stop-session-log.js  (renders session-stop banner)
//   - /qualia-report skill       (reads stamps for the report payload)
//   - bin/state.js               (state machine)
//
// History rationale (v6.2 — 2026-05-20): pre-v6.2 versions of this hook wrote
// the stamp, `git add`-ed it, then created a bot commit (`chore(track): ERP
// sync …`) so a downstream consumer — the ERP at portal.qualiasolutions.net —
// could read tracking.json straight from GitHub. That consumer was documented
// (docs/erp-contract.md) but never actually implemented; the ERP repo had no
// route, cron, or worker that reads tracking.json. The bot commits were
// polluting every Qualia project's history (and on auto-deploy-enabled Vercel
// projects, triggering useless redeploys) for no benefit. v6.2 strips the
// commit entirely — the stamps still happen, just locally.
//
// PreToolUse hook on `git push*` commands. Never blocks the push.
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
const TRACKING = path.join(".planning", "tracking.json");
const SHELL = process.platform === "win32";

// Self-filter — only stamp on actual `git push`. Claude's `if` matcher does
// substring matching (so unrelated commands with "git push" as a literal
// argument trip the hook) and Codex ignores the `if` field entirely. Direct
// invocation (no stdin) falls through to the legacy behavior so tests and
// manual runs still stamp tracking.json.
(function selfFilter() {
  if (process.stdin.isTTY) return;
  let command = null;
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (raw) {
      const payload = JSON.parse(raw);
      command = (payload && payload.tool_input && payload.tool_input.command) || "";
    }
  } catch {}
  if (command === null) return;
  if (!/^\s*git\s+push\b/.test(command)) process.exit(0);
})();

function git(args) {
  return spawnSync("git", args, { encoding: "utf8", timeout: 5000, shell: SHELL });
}

function atomicWrite(file, content) {
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function stampLocal() {
  if (!fs.existsSync(TRACKING)) return { skipped: "no-tracking-file" };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(TRACKING, "utf8"));
  } catch (err) {
    return { skipped: "tracking-unreadable", error: err.message };
  }

  const head = git(["log", "--oneline", "-1", "--format=%h"]);
  const lastCommit = (head.stdout || "").trim();
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  if (lastCommit) parsed.last_commit = lastCommit;
  parsed.last_updated = now;
  parsed.last_pushed_at = now;

  atomicWrite(TRACKING, JSON.stringify(parsed, null, 2) + "\n");
  return { stamped: true, sha: lastCommit, ts: now };
}

function _trace(result, extra) {
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const entry = {
      hook: "pre-push",
      result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart,
      ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

try {
  const result = stampLocal();
  _trace("allow", result);
} catch (err) {
  // Never block a push on a stamp failure — tracking.json is local telemetry.
  console.error(`⚠ tracking.json stamp failed: ${err.message}. Push proceeding.`);
  _trace("warn", { error: err.message });
}

process.exit(0);
