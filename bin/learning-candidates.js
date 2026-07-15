#!/usr/bin/env node
// bin/learning-candidates.js — scan recent git history + daily-log for
// repeated patterns and emit a list of skill-creation candidates.
//
// Run via:
//   qualia-framework learn-scan           # writes ~/.claude/knowledge/learning-candidates.md
//   qualia-framework learn-scan --print    # also prints to stdout
//   qualia-framework learn-scan --since=7  # look at last 7 days (default: 14)
//
// What it detects:
//   1. Repeated fix-scope patterns — "fix(auth):" appearing 3+ times in 14 days
//      → suggest a skill or hook that prevents/diagnoses that class of bug.
//   2. Repeated touched-file patterns — same file appearing in 4+ session
//      checkpoints → suggest factoring or codifying the workflow around it.
//   3. Repeated phrases in daily-log entries — heuristic, low-signal v1.
//
// What it does NOT do:
//   - Auto-create skills. That's /qualia-skill-new's job (with human review).
//   - Touch the wiki tier (knowledge/concepts/). That's /qualia-flush's job.
//   - Run continuously in background. ECC's Haiku observer is over-engineered
//     for Qualia's weekly cadence. Run this manually or via /qualia-flush.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}

function git(args, opts = {}) {
  try {
    const r = spawnSync("git", args, { encoding: "utf8", timeout: 3000, shell: process.platform === "win32", ...opts });
    if (r.status !== 0) return "";
    return (r.stdout || "").trim();
  } catch {
    return "";
  }
}

function parseArgs(argv) {
  const args = { print: false, sinceDays: 14 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--print") args.print = true;
    else if (a.startsWith("--since=")) {
      const n = parseInt(a.split("=")[1], 10);
      if (n > 0) args.sinceDays = n;
    } else if (a === "--since" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (n > 0) args.sinceDays = n;
    }
  }
  return args;
}

// Conventional Commits subject parser. Returns {type, scope} or null.
function parseCommitSubject(subject) {
  const m = subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i);
  if (!m) return null;
  return { type: m[1].toLowerCase(), scope: m[2] || "", description: m[4] };
}

function scanRepoCommits(repoRoot, sinceDays) {
  const out = git(["log", `--since=${sinceDays}.days`, "--pretty=%H%x09%s"], { cwd: repoRoot });
  if (!out) return [];
  const commits = [];
  for (const line of out.split("\n")) {
    const [sha, subject] = line.split("\t");
    if (!sha || !subject) continue;
    const parsed = parseCommitSubject(subject);
    if (parsed) commits.push({ sha, subject, ...parsed });
  }
  return commits;
}

function aggregateFixPatterns(commits) {
  // Group fix-type commits by scope (or by first-word of description if no scope).
  const groups = new Map();
  for (const c of commits) {
    if (c.type !== "fix") continue;
    const key = c.scope || c.description.split(" ")[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!key) continue;
    const arr = groups.get(key) || [];
    arr.push(c);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .filter(([, arr]) => arr.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([scope, arr]) => ({ scope, count: arr.length, samples: arr.slice(0, 3).map((c) => `${c.sha.slice(0, 7)} ${c.subject}`) }));
}

function readDailyLogs(qhome, sinceDays) {
  const dir = path.join(qhome, "knowledge", "daily-log");
  if (!fs.existsSync(dir)) return [];
  const cutoff = Date.now() - sinceDays * 86_400_000;
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
    if (!m) continue;
    const date = new Date(m[1] + "T00:00:00Z").getTime();
    if (date < cutoff) continue;
    try {
      out.push({ date: m[1], content: fs.readFileSync(path.join(dir, f), "utf8") });
    } catch {}
  }
  return out;
}

function aggregateTouchedFiles(dailyLogs) {
  // Look for "touched=a,b,c" across entries. Count occurrences per file.
  const counts = new Map();
  for (const log of dailyLogs) {
    const matches = log.content.matchAll(/touched=([^\s·]+)/g);
    for (const m of matches) {
      for (const f of m[1].split(",")) {
        const k = f.trim();
        if (!k) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

function render({ sinceDays, fixPatterns, touchedFiles, repoRoot }) {
  const lines = [];
  lines.push(`# Learning candidates — generated ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Scope: last ${sinceDays} days.`);
  if (repoRoot) lines.push(`Repo: ${repoRoot}`);
  lines.push("");
  lines.push("Each candidate below is a pattern that recurred enough times to be worth promoting into a skill, agent, or hook. Review and act:");
  lines.push("- `/qualia-skill-new` — create a Qualia skill for the workflow");
  lines.push("- `/qualia-hook-gen` — convert a CLAUDE.md instruction into a deterministic hook");
  lines.push("- `/qualia-learn` — save a one-off learning to the knowledge wiki");
  lines.push("- Ignore — patterns that aren't worth automating");
  lines.push("");

  lines.push("## Repeated fix-scopes (Conventional Commits)");
  if (fixPatterns.length === 0) {
    lines.push("(none — no scope has 3+ fixes in the window)");
  } else {
    for (const fp of fixPatterns) {
      lines.push(`### \`fix(${fp.scope})\` — ${fp.count} commits`);
      lines.push("Recent samples:");
      for (const s of fp.samples) lines.push(`- ${s}`);
      lines.push("");
      lines.push(`> **Suggested action:** if this keeps recurring, add a guard hook or a /qualia-skill-new dedicated to debugging \`${fp.scope}\`.`);
      lines.push("");
    }
  }

  lines.push("## Repeatedly-touched files");
  if (touchedFiles.length === 0) {
    lines.push("(none — no file appeared in 4+ session checkpoints)");
  } else {
    lines.push("File | Touched count");
    lines.push("---|---:");
    for (const t of touchedFiles) lines.push(`\`${t.file}\` | ${t.count}`);
    lines.push("");
    lines.push("> **Suggested action:** files touched this often may be a hotspot (deserves more tests) or a friction point (deserves a skill that automates the recurring edit).");
  }
  lines.push("");
  lines.push("---");
  lines.push("_Generated by `bin/learning-candidates.js`. Re-run with `qualia-framework learn-scan` or `qualia-framework learn-scan --since=30`._");

  return lines.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const qhome = qualiaHome();
  const cwd = process.cwd();
  const repoRoot = git(["rev-parse", "--show-toplevel"], { cwd }) || "";

  const commits = repoRoot ? scanRepoCommits(repoRoot, args.sinceDays) : [];
  const fixPatterns = aggregateFixPatterns(commits);
  const dailyLogs = readDailyLogs(qhome, args.sinceDays);
  const touchedFiles = aggregateTouchedFiles(dailyLogs);

  const doc = render({ sinceDays: args.sinceDays, fixPatterns, touchedFiles, repoRoot });

  const outDir = path.join(qhome, "knowledge");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "learning-candidates.md");
  fs.writeFileSync(outPath, doc);

  // Stamp last-scan time.
  fs.writeFileSync(path.join(qhome, ".qualia-last-learning-scan"), String(Date.now()));

  if (args.print) {
    process.stdout.write(doc);
  } else {
    console.log(`Wrote ${fixPatterns.length} fix-pattern candidate(s) + ${touchedFiles.length} hot file(s) to ${outPath}`);
  }
}

module.exports = { main, aggregateFixPatterns, aggregateTouchedFiles, parseCommitSubject };

if (require.main === module) {
  try { main(); }
  catch (e) {
    console.error(`learn-scan failed: ${e.message}`);
    process.exit(1);
  }
}
