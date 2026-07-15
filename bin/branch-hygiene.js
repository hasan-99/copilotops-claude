#!/usr/bin/env node
// branch-hygiene.js — the clock-out safety net for trunk integration.
//
// WHY: /qualia-ship integrates feature→main on every successful deploy, so the
// normal path leaves nothing open. But work that was BUILT and never SHIPPED
// strands on a local branch ahead of main, and the occasional review PR can
// linger. This surfaces both at /qualia-report so nothing rots silently.
//
// Detects:
//   - local branches with commits ahead of main that aren't merged (stranded work)
//   - open PRs (best-effort via `gh`; skipped silently when gh is absent/unauth)
//
// Read-only. Never blocks (report never blocks) — exit 0 = clean,
// 1 = stranded branches and/or stale PRs found, 2 = not a git repo.
// Zero npm dependencies.

const { spawnSync } = require("child_process");
const path = require("path");

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function mainBranch(cwd) {
  // Prefer an existing local main, else master, else the remote HEAD target.
  for (const b of ["main", "master"]) {
    if (git(["rev-parse", "--verify", "--quiet", b], cwd).ok) return b;
  }
  const head = git(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], cwd);
  if (head.ok && head.out) return head.out.replace(/^origin\//, "");
  return "main";
}

function strandedBranches(cwd, base) {
  const heads = git(["for-each-ref", "--format=%(refname:short)", "refs/heads/"], cwd);
  if (!heads.ok) return [];
  const out = [];
  for (const b of heads.out.split(/\r?\n/).filter(Boolean)) {
    if (b === base) continue;
    // commits on b not in base — unmerged work.
    const count = git(["rev-list", "--count", `${base}..${b}`], cwd);
    const ahead = count.ok ? Number(count.out) : 0;
    if (ahead > 0) {
      const last = git(["log", "-1", "--format=%cI", b], cwd);
      out.push({ branch: b, ahead, last_commit: last.ok ? last.out : null });
    }
  }
  return out.sort((a, b) => b.ahead - a.ahead);
}

// Best-effort open-PR list via gh. Absent/unauth/non-GitHub → [] (never an error).
function openPRs(cwd, staleDays, nowIso) {
  const r = spawnSync("gh", ["pr", "list", "--state", "open", "--json", "number,title,headRefName,createdAt", "--limit", "100"],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.status !== 0 || !r.stdout) return [];
  let prs;
  try { prs = JSON.parse(r.stdout); } catch { return []; }
  const now = nowIso ? Date.parse(nowIso) : null;
  return prs.map((p) => {
    let ageDays = null;
    if (now != null && p.createdAt) ageDays = Math.floor((now - Date.parse(p.createdAt)) / 86400000);
    return { number: p.number, title: p.title, branch: p.headRefName, age_days: ageDays, stale: ageDays != null && ageDays >= staleDays };
  });
}

function analyze(cwd, opts = {}) {
  const root = path.resolve(cwd || process.cwd());
  if (!git(["rev-parse", "--is-inside-work-tree"], root).ok) {
    return { ok: false, error: "NOT_A_GIT_REPO" };
  }
  const base = mainBranch(root);
  const stranded = strandedBranches(root, base);
  const prs = openPRs(root, opts.staleDays || 7, opts.now);
  const stalePrs = prs.filter((p) => p.stale);
  return {
    ok: stranded.length === 0 && stalePrs.length === 0,
    base,
    stranded,
    open_prs: prs,
    stale_prs: stalePrs,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else if (a === "--stale-days") args.staleDays = Number(argv[++i]);
    else if (a.startsWith("--stale-days=")) args.staleDays = Number(a.slice(13));
    else if (a === "--now") args.now = argv[++i]; // ISO; tests inject determinism
    else if (a.startsWith("--now=")) args.now = a.slice(6);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const result = analyze(args.cwd, { staleDays: args.staleDays, now: args.now });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : (result.error ? 2 : 1);
  }

  if (result.error === "NOT_A_GIT_REPO") {
    console.error("branch-hygiene: not a git repository");
    return 2;
  }
  if (result.ok) {
    console.log(`Branch hygiene clean — no work stranded off ${result.base}, no stale PRs.`);
    return 0;
  }
  if (result.stranded.length) {
    console.log(`⚠ ${result.stranded.length} branch(es) with unshipped commits ahead of ${result.base}:`);
    for (const s of result.stranded) {
      console.log(`  - ${s.branch} (+${s.ahead} commit${s.ahead === 1 ? "" : "s"}) — /qualia-ship it or merge, or delete if abandoned`);
    }
  }
  if (result.stale_prs.length) {
    console.log(`⚠ ${result.stale_prs.length} stale open PR(s):`);
    for (const p of result.stale_prs) console.log(`  - #${p.number} ${p.title} (${p.age_days}d, ${p.branch})`);
  }
  return 1;
}

module.exports = { analyze, strandedBranches, mainBranch };

if (require.main === module) {
  process.exit(main(process.argv));
}
