#!/usr/bin/env node
// ~/.claude/hooks/pre-compact.js — snapshot in-flight session context to
// .planning/.compaction-snapshot.md so /qualia-resume (or the next session)
// can surface what was active when compaction wiped the conversation.
//
// PreCompact hook (fires before Claude Code compacts the context window).
//
// Why this hook returned in v6.3.2:
//   v6.2.0 removed the original pre-compact.js because it created BOT COMMITS
//   to stamp STATE.md / tracking.json. That was the wrong mechanism —
//   state.js's atomic write + journal already gives crash safety. This v2
//   hook does NOT touch git, does NOT touch tracking.json, does NOT write
//   through state.js. It only writes to a sidecar file that survives
//   compaction and tells the next session "here's what was in flight".
//
// Design constraints (same shape as stop-session-log.js):
//   • NEVER block — exit 0 always, even on internal failure.
//   • Fast — under 200ms, no network, no LLM call.
//   • No PII / secrets — file paths, commit subjects, phase numbers only.
//   • Idempotent — overwrites the sidecar on every fire; we only care
//     about the LATEST pre-compaction state.
//   • No git commits, no state.js mutations.
//
// Sidecar format (.planning/.compaction-snapshot.md):
//   # Pre-compaction snapshot — {ISO timestamp}
//   ## State
//   Phase: 2 of 4 — built
//   ## Work in flight
//   - 3 modified files (uncommitted)
//   - foo.ts, bar.ts, baz.test.ts
//   ## Recent commits (last 5)
//   - abc1234 feat: implement signin
//   - def5678 test: signin happy path
//   ## Active planning artifacts
//   - .planning/phase-2-plan.md (modified 14m ago)
//   - .planning/phase-2-verification.md (modified 3h ago)

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const _traceStart = Date.now();

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(require("os").homedir(), ".claude");
}

function _trace(result, extra) {
  try {
    const traceDir = path.join(qualiaHome(), ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    fs.appendFileSync(
      path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`),
      JSON.stringify({
        hook: "pre-compact",
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

function safeStatM(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

function humanAge(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

try {
  const cwd = process.cwd();
  const repoRoot = git(["rev-parse", "--show-toplevel"], { cwd }) || cwd;
  const planningDir = path.join(repoRoot, ".planning");

  // Skip if not a Qualia project (no .planning/ dir) — nothing to snapshot.
  if (!fs.existsSync(planningDir)) {
    _trace("skip", { reason: "no-planning-dir" });
    process.exit(0);
  }

  const now = Date.now();
  const tracking = readJson(path.join(planningDir, "tracking.json")) || {};
  const stateText = (() => {
    try { return fs.readFileSync(path.join(planningDir, "STATE.md"), "utf8"); }
    catch { return ""; }
  })();

  // State header line (one line from STATE.md, or fall back to tracking.json).
  const stateLine = (() => {
    const phaseLine = stateText.split("\n").find((l) => /^Phase:/i.test(l));
    const statusLine = stateText.split("\n").find((l) => /^Status:/i.test(l));
    if (phaseLine || statusLine) return [phaseLine, statusLine].filter(Boolean).join(" — ");
    const p = tracking.phase || "?";
    const total = tracking.total_phases || tracking.phase_total || "?";
    const status = tracking.status || "?";
    return `Phase: ${p} of ${total} — ${status}`;
  })();

  // Work in flight: uncommitted modified files.
  const modified = (() => {
    const out = git(["diff", "--name-only", "HEAD"], { cwd: repoRoot });
    return out ? out.split("\n").filter(Boolean) : [];
  })();
  const staged = (() => {
    const out = git(["diff", "--name-only", "--cached"], { cwd: repoRoot });
    return out ? out.split("\n").filter(Boolean) : [];
  })();
  const inFlight = [...new Set([...modified, ...staged])].slice(0, 10);

  // Recent commits — last 5, single-line.
  const recentCommits = (() => {
    const out = git(["log", "--pretty=%h %s", "-5"], { cwd: repoRoot });
    return out ? out.split("\n").filter(Boolean) : [];
  })();

  // Active planning artifacts: phase-*-* files modified in last 24h.
  const activePlanning = (() => {
    try {
      const files = fs.readdirSync(planningDir).filter((f) => /^phase-\d+/.test(f) && f.endsWith(".md"));
      const day = 24 * 3600_000;
      return files
        .map((f) => ({ name: f, age: now - safeStatM(path.join(planningDir, f)) }))
        .filter((x) => x.age < day)
        .sort((a, b) => a.age - b.age)
        .slice(0, 5);
    } catch { return []; }
  })();

  // Open deviations / verification FAILs in current phase.
  const phaseNum = tracking.phase || 0;
  const verifyFails = (() => {
    if (!phaseNum) return [];
    const vPath = path.join(planningDir, `phase-${phaseNum}-verification.md`);
    if (!fs.existsSync(vPath)) return [];
    try {
      const v = fs.readFileSync(vPath, "utf8");
      const fails = (v.match(/^[^\n]*\bFAIL\b[^\n]*$/gm) || []).slice(0, 5);
      const insufficient = (v.match(/^[^\n]*INSUFFICIENT EVIDENCE[^\n]*$/gm) || []).slice(0, 3);
      return [...fails, ...insufficient];
    } catch { return []; }
  })();

  // Compose snapshot. Markdown so the next session can render it as-is.
  const ts = new Date().toISOString();
  const lines = [
    `# Pre-compaction snapshot — ${ts}`,
    "",
    "_Written by `hooks/pre-compact.js` immediately before Claude Code compacted the context window. `/qualia-resume` and session-start surface this so the next session sees what was active._",
    "",
    "## State",
    stateLine || "(no state info)",
    "",
  ];

  lines.push("## Work in flight");
  if (inFlight.length === 0) {
    lines.push("(no uncommitted changes)");
  } else {
    lines.push(`${inFlight.length} file(s):`);
    for (const f of inFlight) lines.push(`- ${f}`);
  }
  lines.push("");

  lines.push("## Recent commits");
  if (recentCommits.length === 0) {
    lines.push("(no commit history)");
  } else {
    for (const c of recentCommits) lines.push(`- ${c}`);
  }
  lines.push("");

  lines.push("## Active planning artifacts (modified in last 24h)");
  if (activePlanning.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of activePlanning) lines.push(`- ${p.name} — ${humanAge(p.age)}`);
  }
  lines.push("");

  if (verifyFails.length > 0) {
    lines.push("## Open verification issues");
    for (const f of verifyFails) lines.push(`- ${f.trim()}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("_Sidecar file. Not committed to git. Read by `/qualia-resume` and `session-start` to restore in-flight context after compaction._");

  fs.writeFileSync(path.join(planningDir, ".compaction-snapshot.md"), lines.join("\n") + "\n");
  _trace("snapshot", {
    in_flight: inFlight.length,
    commits: recentCommits.length,
    active_planning: activePlanning.length,
    verify_fails: verifyFails.length,
  });
  process.exit(0);
} catch (err) {
  _trace("error", { error: err && err.message ? err.message : String(err) });
  process.exit(0);
}
