#!/usr/bin/env node
// hooks/supabase-destructive-guard.js — block destructive Supabase CLI commands.
// PreToolUse hook on `Bash`. Exits 2 to BLOCK, 0 to allow.
//
// Blocked: supabase db reset, supabase db push --force, supabase migration repair.
// Escape: QUALIA_ALLOW_DESTRUCTIVE=1 (shared with git-guardrails.js).
// Why: DB wipes left orphan rows requiring full re-wipe (insights friction).

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
      hook: "supabase-destructive-guard", result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart, ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

const DESTRUCTIVE = [
  /\b(npx\s+)?supabase\s+db\s+reset\b/,
  /\b(npx\s+)?supabase\s+db\s+push\s+.*--force\b/,
  /\b(npx\s+)?supabase\s+migration\s+repair\b/,
];

// Read hook payload from stdin.
let payload = "";
try { if (!process.stdin.isTTY) payload = fs.readFileSync(0, "utf8"); } catch {}
let command = "";
try { if (payload) command = (JSON.parse(payload).tool_input || {}).command || ""; } catch {}

if (!command) { _trace("allow", { reason: "no-command" }); process.exit(0); }

const matched = DESTRUCTIVE.find((re) => re.test(command));
if (!matched) { _trace("allow", {}); process.exit(0); }

const preview = command.slice(0, 80);

if (process.env.QUALIA_ALLOW_DESTRUCTIVE === "1") {
  console.error("Warning: Destructive Supabase command allowed by QUALIA_ALLOW_DESTRUCTIVE=1");
  _trace("bypassed", { pattern_matched: matched.source, command_preview: preview });
  process.exit(0);
}

const msg = [
  `BLOCKED: destructive Supabase command: \`${preview}\`.`,
  "This will destroy production data.",
  "Run with QUALIA_ALLOW_DESTRUCTIVE=1 if intentional,",
  "OR use safer alternatives: `supabase db diff` to preview,",
  "`supabase migration new` to add reversible changes.",
].join(" ");
console.error(msg);
_trace("block", { pattern_matched: matched.source, command_preview: preview });
process.exit(2);
