#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const harnessEval = require("./harness-eval.js");
const { readLocalWorkPacket } = require("./work-packet.js");

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

function qualiaHome(home = os.homedir()) {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  const claude = path.join(home, ".claude");
  if (fs.existsSync(path.join(claude, ".qualia-config.json"))) return claude;
  return claude;
}

function git(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 3000,
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function repoSlug(remote) {
  return (remote || "")
    .replace(/^git@github\.com:/, "github.com/")
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
}

function uuid(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : "";
}

function sessionDurationMinutes(startedAt, submittedAt) {
  if (!startedAt) return 0;
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(submittedAt) || Date.now();
  if (Number.isNaN(startMs) || endMs <= startMs) return 0;
  return Math.round((endMs - startMs) / 60000);
}

function recentCommitHashes(cwd) {
  const out = git(["log", "--oneline", "--since=8 hours ago", "--format=%h"], cwd);
  return out ? out.split("\n").filter(Boolean) : [];
}

function buildPayload(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const env = options.env || process.env;
  const trackingPath = options.trackingPath || path.join(cwd, ".planning", "tracking.json");
  const configPath = options.configPath || path.join(qualiaHome(home), ".qualia-config.json");
  const reportFile = options.reportFile || env.REPORT_FILE;
  const submittedAt = env.SUBMITTED_AT || new Date().toISOString();

  const tracking = readJson(trackingPath, {});
  const config = readJson(configPath, {});
  const notes = readText(reportFile, "").substring(0, 60000);
  const gitRemote = tracking.git_remote || git(["config", "--get", "remote.origin.url"], cwd);
  const projectKey = tracking.project_id || repoSlug(gitRemote) || path.basename(cwd);
  const phase = tracking.phase;
  const latestHarnessEval = harnessEval.latestEval(cwd);
  const workPacket = readLocalWorkPacket(cwd);

  // Performance-audit telemetry captured during the session by the
  // usage-capture UserPromptSubmit hook. Cleared by /qualia-report after upload.
  const usagePath = options.usagePath || path.join(cwd, ".planning", ".session-usage.json");
  const usage = readJson(usagePath, {});
  const commandUsage =
    usage && typeof usage.command_usage === "object" && usage.command_usage
      ? usage.command_usage
      : {};
  const promptSamples = Array.isArray(usage.prompt_samples) ? usage.prompt_samples : [];

  return {
    project: tracking.project || path.basename(cwd),
    project_id: projectKey,
    team_id: tracking.team_id || "qualia-solutions",
    git_remote: gitRemote,
    ...(uuid(tracking.erp_project_id) ? { erp_project_id: uuid(tracking.erp_project_id) } : {}),
    ...(uuid(tracking.client_id) ? { client_id: uuid(tracking.client_id) } : {}),
    ...(uuid(tracking.workspace_id) ? { workspace_id: uuid(tracking.workspace_id) } : {}),
    ...(workPacket ? { work_packet_id: workPacket.id } : {}),
    ...(workPacket && workPacket.assignment_id ? { assignment_id: workPacket.assignment_id } : {}),
    ...(workPacket && workPacket.deadline_date
      ? { assignment_deadline: workPacket.deadline_date }
      : {}),
    client: tracking.client || "",
    client_report_id: env.CLIENT_REPORT_ID || "",
    framework_version: config.version || "",
    milestone: tracking.milestone || 1,
    milestone_name: tracking.milestone_name || "",
    milestones: Array.isArray(tracking.milestones) ? tracking.milestones : [],
    phase,
    phase_name: tracking.phase_name,
    total_phases: tracking.total_phases,
    status: tracking.status,
    // v7 lifecycle: "build" (milestone journey) or "operate" (post-launch update
    // stream). The ERP uses this to count updates vs milestones and to stop
    // expecting a "handoff" for a launched product. lifetime.updates_completed
    // rides along in `lifetime` below.
    lifecycle: tracking.lifecycle || "build",
    ...(tracking.launched_at ? { launched_at: tracking.launched_at } : {}),
    ...(tracking.launch_source ? { launch_source: tracking.launch_source } : {}),
    tasks_done: tracking.tasks_done || 0,
    tasks_total: tracking.tasks_total || 0,
    verification: tracking.verification || "pending",
    gap_cycles: (tracking.gap_cycles || {})[String(phase)] || 0,
    build_count: tracking.build_count || 0,
    deploy_count: tracking.deploy_count || 0,
    command_usage: commandUsage,
    prompt_samples: promptSamples,
    deployed_url: tracking.deployed_url || "",
    ...(tracking.session_started_at ? { session_started_at: tracking.session_started_at } : {}),
    ...(tracking.last_pushed_at ? { last_pushed_at: tracking.last_pushed_at } : {}),
    session_duration_minutes: sessionDurationMinutes(tracking.session_started_at, submittedAt),
    lifetime: tracking.lifetime || {},
    ...(latestHarnessEval ? {
      harness_eval: {
        status: latestHarnessEval.status,
        score: latestHarnessEval.score,
        phase: latestHarnessEval.phase,
        generated_at: latestHarnessEval.generated_at,
        artifact: latestHarnessEval.artifacts && latestHarnessEval.artifacts.json,
      },
    } : {}),
    commits: recentCommitHashes(cwd),
    notes,
    submitted_by: env.SUBMITTED_BY || "unknown",
    submitted_at: submittedAt,
    // B1 — provenance. 'auto' = captured automatically at ship-time (auto-report.js);
    // 'manual' = a deliberate /qualia-report. Defaults to 'manual' so the manual
    // flow is unchanged; auto-report passes SOURCE=auto.
    source: env.SOURCE === "auto" ? "auto" : "manual",
    ...(env.DRY_RUN === "1" ? { dry_run: true } : {}),
  };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(buildPayload())}\n`);
  } catch (error) {
    console.error(`report-payload failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildPayload,
  repoSlug,
  uuid,
};
