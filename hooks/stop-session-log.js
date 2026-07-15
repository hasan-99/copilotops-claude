#!/usr/bin/env node
// ~/.claude/hooks/stop-session-log.js — append a one-line session checkpoint
// to ~/.claude/knowledge/daily-log/{YYYY-MM-DD}.md.
//
// Stop hook (fires when a Claude Code turn ends). This is the seed of the
// memory layer (v4.2.0): every turn that produced something noteworthy gets a
// line in today's daily log. Future versions will run an LLM "flush" job over
// the daily log to promote durable knowledge into the wiki tier.
//
// Design constraints:
//   • NEVER block — exit 0 always, even on internal failure.
//   • Fast — under 100ms, no network, no LLM call. The log is mechanical.
//   • Cheap to skip — if there's been no git activity since the last write,
//     and we wrote a line within the last 5 minutes, we skip. Daily log
//     stays scannable instead of becoming a turn-by-turn replay.
//   • No PII / secrets — only project name, branch, phase, task counts,
//     commit count. Never the contents of files or env vars.
//
// Format: append to today's file under a single H2 header per project:
//
//   ## qualia-framework
//   - 14:32 · branch=feat/x · phase=2/4 · tasks=3/5 · commits=2 · touched=src/foo.ts,src/bar.ts
//   - 16:08 · branch=feat/x · phase=2/4 · tasks=4/5 · commits=4
//
// Cross-platform (Windows/macOS/Linux). Zero shell dependencies.

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
const KNOWLEDGE_DIR = path.join(QUALIA_HOME, "knowledge");
const DAILY_DIR = path.join(KNOWLEDGE_DIR, "daily-log");
const LAST_WRITE_FILE = path.join(QUALIA_HOME, ".qualia-last-session-log");
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function _trace(result, extra) {
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    fs.appendFileSync(
      path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`),
      JSON.stringify({
        hook: "stop-session-log",
        result,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - _traceStart,
        ...extra,
      }) + "\n",
    );
  } catch {}
}

function git(args, opts = {}) {
  try {
    const r = spawnSync("git", args, {
      encoding: "utf8",
      timeout: 2000,
      shell: process.platform === "win32",
      ...opts,
    });
    if (r.status !== 0) return "";
    return (r.stdout || "").trim();
  } catch {
    return "";
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

try {
  // ── B1 auto-capture: fire-and-forget the ship-time auto-report ─────────
  // Detached subprocess so this hook stays fast (no network here, per its
  // design). auto-report.js guards on status===shipped + a per-shipped-unit
  // dedupe marker, so it's a cheap no-op on every turn except the one right
  // after a ship. Wrapped + unref'd so it never blocks or breaks the session.
  try {
    const autoReportPath = path.join(__dirname, "..", "bin", "auto-report.js");
    if (fs.existsSync(autoReportPath)) {
      const { spawn } = require("child_process");
      const child = spawn(
        process.execPath,
        [autoReportPath],
        { cwd: process.cwd(), detached: true, stdio: "ignore" },
      );
      child.unref();
    }
  } catch {}

  // ── Skip if too soon since last write ────────────────────
  const now = Date.now();
  let lastWrite = 0;
  try {
    if (fs.existsSync(LAST_WRITE_FILE)) {
      lastWrite = parseInt(fs.readFileSync(LAST_WRITE_FILE, "utf8").trim(), 10) || 0;
    }
  } catch {}
  if (now - lastWrite < MIN_INTERVAL_MS) {
    _trace("skip", { reason: "interval", since_last_ms: now - lastWrite });
    process.exit(0);
  }

  // ── Resolve project context ──────────────────────────────
  // Operate from the cwd; if not a git repo, fall back to basename.
  const cwd = process.cwd();
  const repoRoot = git(["rev-parse", "--show-toplevel"], { cwd }) || cwd;
  const project = path.basename(repoRoot);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot }) || "";

  // Phase + task info from .planning/tracking.json (Qualia projects only).
  let phase = "";
  let tasks = "";
  const tracking = readJson(path.join(repoRoot, ".planning", "tracking.json"));
  if (tracking) {
    const p = tracking.phase || 0;
    const pt = tracking.total_phases || tracking.phase_total || 0;
    if (pt > 0) phase = `${p}/${pt}`;
    const td = tracking.tasks_done || 0;
    const tt = tracking.tasks_total || 0;
    if (tt > 0) tasks = `${td}/${tt}`;
  }

  // Commits in this session window — heuristic: commits in last 8 hours by us.
  // (Stop fires per turn, so a tighter window misses session boundaries.)
  const commitCount = (() => {
    const out = git(["log", "--since=8.hours", "--pretty=oneline"], { cwd: repoRoot });
    if (!out) return 0;
    return out.split("\n").filter(Boolean).length;
  })();

  // Top 3 touched files (uncommitted) — useful for resuming next session.
  const touched = (() => {
    const out = git(["diff", "--name-only", "HEAD"], { cwd: repoRoot });
    if (!out) return [];
    return out.split("\n").filter(Boolean).slice(0, 3);
  })();

  // Skip if literally nothing happened — no commits, no diff, no phase progress.
  if (commitCount === 0 && touched.length === 0 && !phase) {
    _trace("skip", { reason: "no-activity" });
    process.exit(0);
  }

  // ── Compose the line ─────────────────────────────────────
  const time = new Date().toTimeString().slice(0, 5); // HH:MM, local time
  const parts = [`${time}`];
  if (branch) parts.push(`branch=${branch}`);
  if (phase) parts.push(`phase=${phase}`);
  if (tasks) parts.push(`tasks=${tasks}`);
  if (commitCount > 0) parts.push(`commits=${commitCount}`);
  if (touched.length > 0) parts.push(`touched=${touched.join(",")}`);
  const line = `- ${parts.join(" · ")}`;

  // ── Append to today's file ───────────────────────────────
  if (!fs.existsSync(DAILY_DIR)) fs.mkdirSync(DAILY_DIR, { recursive: true });
  const today = new Date().toISOString().split("T")[0];
  const file = path.join(DAILY_DIR, `${today}.md`);

  let existing = "";
  try {
    if (fs.existsSync(file)) existing = fs.readFileSync(file, "utf8");
  } catch {}

  const projectHeader = `## ${project}`;
  if (!existing) {
    const header = `# Daily log — ${today}\n\n_Auto-generated by Qualia Framework. Each entry is one Stop-hook checkpoint per project per session._\n\n${projectHeader}\n${line}\n`;
    fs.writeFileSync(file, header);
  } else if (!existing.includes(projectHeader)) {
    fs.appendFileSync(file, `\n${projectHeader}\n${line}\n`);
  } else {
    // Append the line under the existing project header. Insert after the last
    // line that belongs to this project's section (next ## or EOF).
    const headerIdx = existing.indexOf(projectHeader);
    const afterHeader = headerIdx + projectHeader.length;
    const nextHeaderIdx = existing.indexOf("\n## ", afterHeader);
    const insertAt = nextHeaderIdx === -1 ? existing.length : nextHeaderIdx;
    // Trim trailing newlines in the section so our append lands on a clean line.
    const before = existing.slice(0, insertAt).replace(/\n+$/, "");
    const after = existing.slice(insertAt);
    fs.writeFileSync(file, `${before}\n${line}\n${after}`);
  }

  fs.writeFileSync(LAST_WRITE_FILE, String(now));
  _trace("logged", { project, branch, phase, tasks, commits: commitCount });
  process.exit(0);
} catch (err) {
  _trace("error", { error: err && err.message ? err.message : String(err) });
  // Stop hooks must never block the user — exit 0 even on internal error.
  process.exit(0);
}
