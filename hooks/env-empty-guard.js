#!/usr/bin/env node
// hooks/env-empty-guard.js — block empty env var values on Vercel.
// PreToolUse hook on `Bash`. Blocks `vercel env add NAME ""` (empty value).
// Exits 2 to BLOCK, 0 to allow. Escape: QUALIA_ALLOW_EMPTY_ENV=1.

const fs = require("fs");
const path = require("path");
const os = require("os");

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
      hook: "env-empty-guard", result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart, ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

// Read hook payload from stdin.
let payload = "";
try { if (!process.stdin.isTTY) payload = fs.readFileSync(0, "utf8"); } catch {}

let command = "";
try {
  if (payload) command = (JSON.parse(payload).tool_input || {}).command || "";
} catch (e) {
  // Allow on parse error — this hook only cares about `vercel env` commands, and
  // a malformed payload is not by itself a reason to block unrelated tool calls.
  _trace("allow", { reason: "parse-error", error: e && e.message });
  process.exit(0);
}

// Only act on vercel env commands.
if (!/\bvercel\s+env\s+(add|pull)\b/.test(command)) {
  _trace("allow", { reason: "no-match" });
  process.exit(0);
}

// vercel env pull is always fine.
if (/\bvercel\s+env\s+pull\b/.test(command)) {
  _trace("allow", { reason: "env-pull" });
  process.exit(0);
}

// Detect empty value patterns in vercel env add.
const emptyPatterns = [
  /\bvercel\s+env\s+add\s+\S+\s+(""|'')\s*$/,    // vercel env add KEY "" / ''
  /\bvercel\s+env\s+add\s+\S+=\s*$/,              // vercel env add KEY=
  /\bvercel\s+env\b.*\s+""\s*/,                    // "" anywhere after vercel env
  /\bvercel\s+env\b.*\s+''\s*/,                    // '' anywhere after vercel env
];

if (emptyPatterns.some((re) => re.test(command))) {
  if (process.env.QUALIA_ALLOW_EMPTY_ENV === "1") {
    process.stderr.write("Warning: Empty env var allowed by QUALIA_ALLOW_EMPTY_ENV=1\n");
    _trace("bypassed", { command_preview: command.slice(0, 80) });
    process.exit(0);
  }
  process.stderr.write(
    `BLOCKED: empty env var value detected in: \`${command}\`. ` +
    "Confirm the value is intentional, then re-run with QUALIA_ALLOW_EMPTY_ENV=1 to bypass.\n"
  );
  _trace("block", { command_preview: command.slice(0, 80) });
  process.exit(2);
}

_trace("allow", { command_preview: command.slice(0, 80) });
process.exit(0);
