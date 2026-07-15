#!/usr/bin/env node
// project-sync.js — the single Framework→ERP project-sync snapshot.
//
// WHY: the ERP already ingests per-session reports (report-payload.js →
// /api/v1/reports) and a lean progress rollup (project-snapshot.js →
// /api/v1/project-snapshots). What was missing is ONE complete payload the ERP
// can use to RECONCILE a project's milestones, phases, tasks, and reports in a
// single read — including REQ-ID completion per milestone and the trunk/merge
// model so the ERP understands how feature branches become deployed main.
//
// This composes (never duplicates) the existing snapshot:
//   - bin/project-snapshot.js   → identity, current position, journey, lifetime,
//                                  quality (harness_eval), progress_percent
//   - bin/state.js              → readMilestoneRequirements (REQ-ID completion),
//                                  parseStateMd (roadmap phase rows)
// and ADDS the B2-specific reconciliation surface on top:
//   - milestones[] enriched with REQ-ID completion (total/complete/incomplete),
//     phases count, tasks_completed, deployed_url, status (closed/current/future)
//   - task_rollup (lifetime tasks/build/deploy + current-phase gap_cycles)
//   - accountability { offroad_count, offroad[] } — off-milestone work tally
//   - integration { model: "trunk", ... } — the PR/merge model the ERP must grok
//   - schema_version so the ERP can evolve the contract safely
//
// Read-only. Zero npm dependencies. `--json` (or no flag) prints the object;
// library buildProjectSync() returns it. Exit 0 = built, 2 = no .planning/.

const fs = require("fs");
const os = require("os");
const path = require("path");

const snapshotLib = require("./project-snapshot.js");

// project-sync's contract version. Bump when the SHAPE changes so the ERP can
// branch on it. (Distinct from project-snapshot's snapshot_version.)
const SCHEMA_VERSION = 1;

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(file, fallback = "") {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

// REQ-ID completion for one milestone, read from .planning/REQUIREMENTS.md.
// Mirrors state.js readMilestoneRequirements() exactly (rows like
// `| CORE-01 | M2: Name | Phase 3 | Complete |`) but is parameterized on the
// planning dir so tests can point it at a temp fixture. tracked=false when
// REQUIREMENTS.md is absent or has no rows for the milestone (→ ERP skips the
// REQ gate for that milestone, can't reconcile what wasn't declared).
function milestoneRequirements(planningDir, milestoneNum) {
  const md = readText(path.join(planningDir, "REQUIREMENTS.md"), null);
  if (md == null) return { tracked: false, total: 0, complete: 0, incomplete: [] };
  const num = parseInt(milestoneNum, 10);
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, a) => !(i === 0 && c === "") && !(i === a.length - 1 && c === ""));
    if (cells.length < 4) continue;
    const [id, milestone, , status] = cells;
    if (!/^[A-Z]+-\d+$/.test(id)) continue; // skip header + non-REQ rows
    const m = milestone.match(/M(\d+)\b/);
    if (!m || parseInt(m[1], 10) !== num) continue;
    rows.push({ id, status: status || "" });
  }
  const incomplete = rows
    .filter((r) => r.status.trim().toLowerCase() !== "complete")
    .map((r) => ({ id: r.id, status: r.status }));
  return {
    tracked: rows.length > 0,
    total: rows.length,
    complete: rows.length - incomplete.length,
    incomplete,
  };
}

// Count phase rows declared for the project from STATE.md's roadmap table.
// Used only as a fallback when a closed milestone summary carries no phase
// count of its own. Best-effort: returns 0 when STATE.md is absent/malformed.
function roadmapPhaseCount(planningDir) {
  const md = readText(path.join(planningDir, "STATE.md"), "");
  const m = md.match(/\| # \| Phase \| Goal \| Status \|\n\|[-|]+\|\n([\s\S]*?)(?=\n##|\n$|$)/);
  if (!m) return 0;
  return m[1]
    .trim()
    .split("\n")
    .filter((row) => row.split("|").map((c) => c.trim()).filter(Boolean).length >= 4).length;
}

// Build the unified milestones[] for reconciliation. Source of truth ordering:
//   1. JOURNEY.md milestones (the full planned arc) — gives num + name + total.
//   2. tracking.milestones[] (closed summaries) — gives closed_at + per-milestone
//      phases_completed/tasks_completed + deployed_url.
//   3. tracking.milestone (current) — marks the active one.
//   4. REQUIREMENTS.md — REQ-ID completion per milestone.
// Each entry's `status` is closed | current | future so the ERP can reconcile
// which milestones to mark done, in-progress, or pending.
function buildMilestones(options) {
  const { journey, closed, currentNum, planningDir } = options;
  const closedByNum = new Map();
  for (const m of closed) {
    const n = Number(m && m.num);
    if (Number.isFinite(n)) closedByNum.set(n, m);
  }

  // The full set of milestone numbers we know about: journey ∪ closed ∪ current.
  const nums = new Set();
  for (const m of journey) nums.add(Number(m.num));
  for (const n of closedByNum.keys()) nums.add(n);
  if (Number.isFinite(currentNum)) nums.add(currentNum);
  const ordered = [...nums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);

  const nameByNum = new Map(journey.map((m) => [Number(m.num), m.name]));

  return ordered.map((num) => {
    const closedSummary = closedByNum.get(num) || null;
    const status = closedSummary
      ? "closed"
      : num === currentNum
        ? "current"
        : "future";
    const req = milestoneRequirements(planningDir, num);
    const entry = {
      num,
      name:
        (closedSummary && closedSummary.name) ||
        nameByNum.get(num) ||
        `Milestone ${num}`,
      status,
      phases: Number(
        (closedSummary && (closedSummary.phases_completed != null
          ? closedSummary.phases_completed
          : closedSummary.phases)) || 0
      ),
      tasks_completed: Number(
        (closedSummary && closedSummary.tasks_completed) || 0
      ),
      requirements: {
        tracked: req.tracked,
        total: req.total,
        complete: req.complete,
        incomplete: req.incomplete,
      },
    };
    if (closedSummary && closedSummary.closed_at) entry.closed_at = closedSummary.closed_at;
    const deployedUrl = (closedSummary && closedSummary.deployed_url) || "";
    if (deployedUrl) entry.deployed_url = deployedUrl;
    return entry;
  });
}

function buildProjectSync(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const planning = options.planningDir || path.join(cwd, ".planning");
  const now = options.now || new Date().toISOString();

  // Compose the lean dashboard snapshot — reuse its identity/current/journey/
  // lifetime/quality blocks verbatim instead of re-deriving them here.
  const snapshot = snapshotLib.buildSnapshot({
    cwd,
    home,
    planningDir: planning,
    qualiaHome: options.qualiaHome,
    now,
  });

  const tracking = readJson(path.join(planning, "tracking.json"), {});
  const journeyText = readText(path.join(planning, "JOURNEY.md"), "");
  const journey = snapshotLib.parseJourneyMilestones(journeyText);
  const closed = Array.isArray(tracking.milestones) ? tracking.milestones : [];
  const currentNum = Number(tracking.milestone || snapshot.current.milestone || 1);
  const lifetime = snapshot.lifetime;

  const milestones = buildMilestones({ journey, closed, currentNum, planningDir: planning });
  // Fill a current/future milestone's phase count from the roadmap when it has
  // none of its own (closed summaries already carry phases_completed).
  const roadmapPhases = roadmapPhaseCount(planning) || Number(tracking.total_phases || 0);
  for (const m of milestones) {
    if (m.status === "current" && !m.phases) m.phases = roadmapPhases;
  }

  const offroad = Array.isArray(tracking.offroad) ? tracking.offroad : [];
  const offroadCount = Number(
    (tracking.lifetime && tracking.lifetime.offroad_count) || offroad.length || 0
  );

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now,
    source: "qualia-framework",
    payload: "project-sync",
    framework_version: snapshot.framework_version,
    identifiers: snapshot.identifiers,
    project: {
      ...snapshot.project,
      lifecycle: tracking.lifecycle || "build",
      ...(tracking.launched_at ? { launched_at: tracking.launched_at } : {}),
      ...(tracking.launch_source ? { launch_source: tracking.launch_source } : {}),
    },
    current: snapshot.current,
    quality: snapshot.quality,
    // Full milestone arc enriched with REQ-ID completion — the spine of ERP
    // reconciliation. journey.total_milestones rides along for the denominator.
    total_milestones: snapshot.journey.total_milestones,
    milestones,
    // Cumulative + current task accounting so the ERP can roll tasks up without
    // replaying every report.
    task_rollup: {
      tasks_completed: lifetime.tasks_completed,
      phases_completed: lifetime.phases_completed,
      milestones_completed: lifetime.milestones_completed,
      total_phases_all_milestones: lifetime.total_phases,
      build_count: lifetime.build_count,
      deploy_count: lifetime.deploy_count,
      current_phase_gap_cycles: snapshot.current.gap_cycles,
    },
    // Accountability: off-milestone work the OWNER + ERP should see (mirrors the
    // branch-guard main-push tally — drift is counted, not hidden).
    accountability: {
      offroad_count: offroadCount,
      offroad: offroad.slice(-10),
    },
    // The PR/merge model the ERP must understand to map branch→main→deploy:
    // feature branches integrate to main at /qualia-ship (trunk model); pushes
    // to a protected branch are recorded for accountability via branch-guard's
    // employee_main_push events (POST /api/v1/policy-events; the local journal
    // lives in the install home, referenced not read here).
    integration: {
      model: "trunk",
      integrates_at: "/qualia-ship",
      protected_branches: ["main", "master"],
      main_push_event_type: "employee_main_push",
      main_push_events_path: "~/.claude/.main-push-events.json",
      note:
        "Feature branches integrate to main at /qualia-ship (then deploy). " +
        "Direct pushes to a protected branch are allowed but recorded as " +
        "employee_main_push policy events for per-employee accountability.",
    },
    timestamps: snapshot.timestamps,
  };
}

function writeProjectSync(sync, options = {}) {
  const cwd = options.cwd || process.cwd();
  const planning = options.planningDir || path.join(cwd, ".planning");
  const outDir = options.outDir || path.join(planning, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = sync.generated_at.replace(/[:.]/g, "-");
  const file = path.join(outDir, `project-sync-${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(sync, null, 2)}\n`);
  return file;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { cwd: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--write") args.write = true;
    else if (a === "--pretty") args.pretty = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else if (a === "--now") args.now = argv[++i];
    else if (a.startsWith("--now=")) args.now = a.slice(6);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const cwd = args.cwd || process.cwd();
  const planning = path.join(cwd, ".planning");
  if (!fs.existsSync(planning)) {
    console.error("project-sync: no .planning/ found — run /qualia-new to start.");
    return 2;
  }
  const sync = buildProjectSync({ cwd, now: args.now });
  if (args.write) {
    const file = writeProjectSync(sync, { cwd });
    process.stdout.write(`${file}\n`);
    return 0;
  }
  process.stdout.write(`${JSON.stringify(sync, null, args.pretty || args.json ? 2 : 0)}\n`);
  return 0;
}

module.exports = {
  buildProjectSync,
  buildMilestones,
  milestoneRequirements,
  writeProjectSync,
  SCHEMA_VERSION,
};

if (require.main === module) {
  try {
    process.exit(main(process.argv));
  } catch (error) {
    console.error(`project-sync failed: ${error.message}`);
    process.exit(1);
  }
}
