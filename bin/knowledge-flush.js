#!/usr/bin/env node
// ~/.claude/bin/knowledge-flush.js — non-interactive memory-layer flush.
//
// Runs the Qualia memory flush prompt from cron (or systemd timer, or any
// CI/scheduled job) without installing a separate slash command. Closes the
// memory loop end-to-end:
//
//   Stop hook (auto, every turn) → <install-home>/knowledge/daily-log/{date}.md
//   THIS SCRIPT (weekly cron)    → spawns the installed agent CLI
//   flush prompt                 → promotes raw → curated tier
//   bin/knowledge.js (every spawn) → reads index.md → reaches the right file
//
// Usage:
//   node ~/.claude/bin/knowledge-flush.js               # 7-day flush
//   node ~/.claude/bin/knowledge-flush.js --days 14     # custom window
//   node ~/.claude/bin/knowledge-flush.js --dry-run     # preview only
//   node ~/.claude/bin/knowledge-flush.js --project X   # scope to one project
//
// Recommended cron entry (weekly Sunday 3 AM local):
//   0 3 * * 0 node ~/.claude/bin/knowledge-flush.js >> ~/.claude/.qualia-flush.log 2>&1
//
// Behavior:
//   • If the required agent CLI isn't on PATH, exits 0 with a logged warning. Cron
//     spam is worse than a missed flush — a real failure surfaces in the
//     log file the user is presumably watching.
//   • If the daily-log dir is empty (nothing to flush), exits 0 silently.
//   • If the agent CLI returns non-zero, exits 1 with the error captured in
//     the log so cron can be configured to alert on it.
//   • Writes one structured JSONL line per run to ~/.claude/.qualia-flush.log
//     so the user can audit "when did the last 5 flushes run, what did they
//     produce?" without parsing free text.
//
// Cross-platform (Windows/macOS/Linux). Honors the same args as the skill.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const HOME = os.homedir();
function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(HOME, ".claude");
}

const QUALIA_HOME = qualiaHome();
const KNOWLEDGE_DIR = path.join(QUALIA_HOME, "knowledge");
const DAILY_DIR = path.join(KNOWLEDGE_DIR, "daily-log");
const LOG_FILE = path.join(QUALIA_HOME, ".qualia-flush.log");

const _start = Date.now();

function logEvent(event) {
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _start,
      ...event,
    });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

function which(cmd) {
  // Cross-platform `which`. Returns the first PATH match or null.
  // We don't shell out to `which` itself because it doesn't exist on Windows
  // (it's `where` there, with different semantics).
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
    : [""];
  const dirs = (process.env.PATH || "").split(sep);
  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, cmd + ext);
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {}
    }
  }
  return null;
}

// Pass-through args (so `--days 14`, `--dry-run`, `--project X` are visible to
// the agent prompt). We only parse `--days` locally to short-circuit when the
// daily-log is genuinely empty.
const argv = process.argv.slice(2);
const flagIdx = argv.indexOf("--days");
const days = flagIdx >= 0 ? parseInt(argv[flagIdx + 1], 10) || 7 : 7;

function dailyLogHasRecentEntries(windowDays) {
  if (!fs.existsSync(DAILY_DIR)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  try {
    const entries = fs.readdirSync(DAILY_DIR);
    for (const f of entries) {
      if (!f.endsWith(".md")) continue;
      const base = f.replace(/\.md$/, "");
      if (base >= cutoffStr) return true;
    }
  } catch {}
  return false;
}

// ── Preflight ────────────────────────────────────────────
// Per-host facts (which CLI, how to invoke it) come from the adapter — the one
// place runtime differences live. See bin/host-adapters.js.
const { adapter, hostForHome } = require("./host-adapters.js");
const host = adapter(hostForHome(QUALIA_HOME));
const agentCli = host.agentCli;
const agentBin = which(agentCli);
if (!agentBin) {
  logEvent({ event: "skipped", reason: `${agentCli}-cli-not-on-path` });
  // Exit 0 — a missing CLI on the host running cron is a config issue, not
  // a flush failure. Don't spam alerts.
  process.exit(0);
}

if (!dailyLogHasRecentEntries(days)) {
  logEvent({ event: "skipped", reason: "no-recent-daily-log", window_days: days });
  process.exit(0);
}

// ── Run ──────────────────────────────────────────────────
// `claude -p "<prompt>"` and `codex exec "<prompt>"` run a single
// non-interactive turn. Keep the prompt self-contained so no separate flush
// slash command needs to be installed.
const argsText = argv.join(" ").trim() || "(none)";
const prompt = [
  "Run the Qualia memory flush.",
  "",
  `Arguments: ${argsText}`,
  `Install home: ${QUALIA_HOME}`,
  "",
  "Read recent markdown files from knowledge/daily-log under the install home.",
  "Promote recurring patterns, decisions, fixes, and client preferences into the curated knowledge tier using bin/knowledge.js append.",
  "Do not promote one-off noise. If --dry-run is present, report planned promotions without writing.",
  "If --project NAME is present, limit promotions to that project.",
  "Finish with one line starting exactly: ⬢ Flushed daily-log",
].join("\n");

const cliArgs = host.agentExec(prompt);
const result = spawnSync(agentBin, cliArgs, {
  encoding: "utf8",
  timeout: 5 * 60 * 1000, // 5 min hard cap — flush should never take this long
  shell: process.platform === "win32",
  stdio: ["ignore", "pipe", "pipe"],
});

const stdout = (result.stdout || "").trim();
const stderr = (result.stderr || "").trim();
const status = typeof result.status === "number" ? result.status : -1;

if (status !== 0) {
  logEvent({
    event: "failed",
    status,
    prompt,
    stderr_tail: stderr.slice(-1000),
  });
  // Surface to stderr so cron's MAILTO sends an alert.
  console.error(`knowledge-flush: ${agentCli} exited ${status}`);
  if (stderr) console.error(stderr.slice(-2000));
  process.exit(1);
}

// Success: parse stdout for the skill's summary line if present, else log
// the full output tail.
const summaryMatch = stdout.match(/⬢ Flushed daily-log .+/);
logEvent({
  event: "ok",
  prompt,
  summary: summaryMatch ? summaryMatch[0] : stdout.split("\n").slice(-3).join(" | "),
});

// Echo the user-facing summary to stdout so cron logs / interactive runs
// both surface what happened.
if (summaryMatch) {
  console.log(summaryMatch[0]);
} else {
  console.log(stdout.split("\n").slice(-5).join("\n"));
}
process.exit(0);
