#!/usr/bin/env node
const fs = require("fs");
const http = require("http");
const https = require("https");
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

function parseJourneyMilestones(content) {
  if (!content) return [];
  const milestones = [];
  const re = /^##\s+Milestone\s+(\d+)\s*[·•-]\s*(.+?)\s*(?:\[[^\]]+\])?\s*$/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    milestones.push({
      num: Number(match[1]),
      name: match[2].trim(),
    });
  }
  return milestones;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildSnapshot(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const installHome = options.qualiaHome || qualiaHome(home);
  const now = options.now || new Date().toISOString();
  const planning = options.planningDir || path.join(cwd, ".planning");
  const tracking = readJson(path.join(planning, "tracking.json"), {});
  const config = readJson(path.join(installHome, ".qualia-config.json"), {});
  const journey = parseJourneyMilestones(readText(path.join(planning, "JOURNEY.md"), ""));
  const gitRemote = tracking.git_remote || git(["config", "--get", "remote.origin.url"], cwd);
  const projectId = tracking.project_id || repoSlug(gitRemote) || path.basename(cwd);
  const currentMilestone = Number(tracking.milestone || 1);
  const currentPhase = Number(tracking.phase || 0);
  const latestHarnessEval = harnessEval.latestEval(cwd);
  const workPacket = readLocalWorkPacket(cwd);
  const totalPhases = Number(tracking.total_phases || 0);
  const lifetime = tracking.lifetime && typeof tracking.lifetime === "object" ? tracking.lifetime : {};
  const closedMilestones = Array.isArray(tracking.milestones) ? tracking.milestones : [];
  const closedMilestoneNums = new Set(
    closedMilestones
      .map((m) => Number(m && m.num))
      .filter((n) => Number.isFinite(n))
  );
  const journeyTotal = journey.length || Math.max(currentMilestone, closedMilestones.length || 1);
  const phaseProgress =
    totalPhases > 0 && currentPhase > 0 ? (Math.max(0, currentPhase - 1) / totalPhases) : 0;
  const projectProgress =
    journeyTotal > 0
      ? ((closedMilestoneNums.size + Math.min(1, phaseProgress)) / journeyTotal) * 100
      : 0;

  return {
    snapshot_version: 1,
    generated_at: now,
    source: "qualia-framework",
    framework_version: config.version || "",
    identifiers: {
      project_id: projectId,
      team_id: tracking.team_id || "qualia-solutions",
      git_remote: gitRemote || "",
      ...(uuid(tracking.erp_project_id) ? { erp_project_id: uuid(tracking.erp_project_id) } : {}),
      ...(uuid(tracking.client_id) ? { client_id: uuid(tracking.client_id) } : {}),
      ...(uuid(tracking.workspace_id) ? { workspace_id: uuid(tracking.workspace_id) } : {}),
      ...(workPacket ? { work_packet_id: workPacket.id } : {}),
      ...(workPacket && workPacket.assignment_id ? { assignment_id: workPacket.assignment_id } : {}),
      ...(workPacket && workPacket.deadline_date
        ? { assignment_deadline: workPacket.deadline_date }
        : {}),
    },
    project: {
      name: tracking.project || path.basename(cwd),
      client: tracking.client || "",
      status: tracking.status || "setup",
      deployed_url: tracking.deployed_url || "",
      progress_percent: clampPercent(projectProgress),
    },
    current: {
      milestone: currentMilestone,
      milestone_name: tracking.milestone_name || "",
      phase: currentPhase,
      phase_name: tracking.phase_name || "",
      total_phases: totalPhases,
      tasks_done: Number(tracking.tasks_done || 0),
      tasks_total: Number(tracking.tasks_total || 0),
      verification: tracking.verification || "pending",
      gap_cycles: (tracking.gap_cycles || {})[String(currentPhase)] || 0,
    },
    quality: {
      harness_eval: latestHarnessEval
        ? {
            status: latestHarnessEval.status,
            score: latestHarnessEval.score,
            phase: latestHarnessEval.phase,
            generated_at: latestHarnessEval.generated_at,
            artifact: latestHarnessEval.artifacts && latestHarnessEval.artifacts.json,
          }
        : null,
    },
    journey: {
      total_milestones: journeyTotal,
      milestones: journey.map((milestone) => ({
        ...milestone,
        status:
          closedMilestoneNums.has(milestone.num)
            ? "closed"
            : milestone.num === currentMilestone
              ? "active"
              : "pending",
      })),
      closed_milestones: closedMilestones,
    },
    lifetime: {
      tasks_completed: Number(lifetime.tasks_completed || 0),
      phases_completed: Number(lifetime.phases_completed || 0),
      milestones_completed: Number(lifetime.milestones_completed || closedMilestoneNums.size || 0),
      total_phases: Number(lifetime.total_phases || 0),
      last_closed_milestone: Number(lifetime.last_closed_milestone || 0),
      build_count: Number(tracking.build_count || 0),
      deploy_count: Number(tracking.deploy_count || 0),
    },
    timestamps: {
      session_started_at: tracking.session_started_at || "",
      last_pushed_at: tracking.last_pushed_at || "",
      last_updated: tracking.last_updated || "",
    },
  };
}

function writeSnapshot(snapshot, options = {}) {
  const cwd = options.cwd || process.cwd();
  const planning = options.planningDir || path.join(cwd, ".planning");
  const outDir = options.outDir || path.join(planning, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = snapshot.generated_at.replace(/[:.]/g, "-");
  const file = path.join(outDir, `project-snapshot-${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return file;
}

function erpConfig(options = {}) {
  const home = options.home || os.homedir();
  const installHome = options.qualiaHome || qualiaHome(home);
  const config = readJson(path.join(installHome, ".qualia-config.json"), {});
  const erp = config.erp || {};
  const url = (erp.url || "https://portal.qualiasolutions.net").replace(/\/+$/, "");
  const keyFile = path.join(installHome, erp.api_key_file || ".erp-api-key");
  const key = readText(keyFile, "").trim();
  return {
    enabled: erp.enabled !== false,
    url,
    key,
  };
}

function uploadSnapshot(snapshot, options = {}) {
  const cfg = options.erp || erpConfig(options);
  if (!cfg.enabled) {
    return Promise.reject(new Error("ERP disabled in Qualia config"));
  }
  if (!cfg.key) {
    return Promise.reject(new Error("ERP API key missing in Qualia install"));
  }

  const endpoint = new URL("/api/v1/project-snapshots", cfg.url);
  const payload = JSON.stringify(snapshot);
  const transport = endpoint.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "qualia-framework-project-snapshot",
        },
        timeout: options.timeout || 15000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = body ? JSON.parse(body) : null;
          } catch {
            parsed = body;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: parsed });
          } else {
            const message =
              typeof parsed === "object" && parsed && parsed.message
                ? parsed.message
                : body || `HTTP ${res.statusCode}`;
            reject(new Error(`ERP snapshot upload failed (${res.statusCode}): ${message}`));
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("ERP snapshot upload timed out"));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function parseArgs(argv) {
  return {
    upload: argv.includes("--upload"),
    write: argv.includes("--write"),
    pretty: argv.includes("--pretty"),
  };
}

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const snapshot = buildSnapshot();
    if (args.write) {
      const file = writeSnapshot(snapshot);
      process.stdout.write(`${file}\n`);
    }
    if (args.upload) {
      const response = await uploadSnapshot(snapshot);
      process.stdout.write(`${JSON.stringify(response.body || { ok: true })}\n`);
    }
    if (!args.write && !args.upload) {
      process.stdout.write(`${JSON.stringify(snapshot, null, args.pretty ? 2 : 0)}\n`);
    }
  })().catch((error) => {
    console.error(`project-snapshot failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildSnapshot,
  erpConfig,
  parseJourneyMilestones,
  repoSlug,
  uploadSnapshot,
  uuid,
  writeSnapshot,
};
