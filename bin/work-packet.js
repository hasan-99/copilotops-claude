#!/usr/bin/env node
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");

const WORK_PACKET_FILE = path.join(".planning", "work-packet.json");

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

function uuid(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : "";
}

function localWorkPacketPath(cwd = process.cwd()) {
  return path.join(cwd, WORK_PACKET_FILE);
}

function normalizePacket(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const packet = raw.work_packet && typeof raw.work_packet === "object" ? raw.work_packet : raw;
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) return null;
  const id = uuid(packet.id || packet.work_packet_id);
  const projectId = uuid(packet.project_id || packet.erp_project_id);
  if (!id || !projectId) return null;
  return {
    id,
    project_id: projectId,
    assignment_id: uuid(packet.assignment_id) || null,
    employee_id: uuid(packet.employee_id) || null,
    deadline_date: typeof packet.deadline_date === "string" ? packet.deadline_date : null,
    current_milestone: Number.isFinite(packet.current_milestone) ? packet.current_milestone : null,
    current_milestone_name:
      typeof packet.current_milestone_name === "string" ? packet.current_milestone_name : null,
    current_phase: Number.isFinite(packet.current_phase) ? packet.current_phase : null,
    current_phase_name: typeof packet.current_phase_name === "string" ? packet.current_phase_name : null,
    next_command: typeof packet.next_command === "string" ? packet.next_command : "/qualia",
    definition_of_done:
      typeof packet.definition_of_done === "string" ? packet.definition_of_done : null,
    blockers: Array.isArray(packet.blockers) ? packet.blockers.filter((b) => typeof b === "string") : [],
    repo_url: typeof packet.repo_url === "string" ? packet.repo_url : null,
    vercel_url: typeof packet.vercel_url === "string" ? packet.vercel_url : null,
    framework_status:
      typeof packet.framework_status === "string" ? packet.framework_status : null,
    verification: typeof packet.verification === "string" ? packet.verification : null,
    snapshot_generated_at:
      typeof packet.snapshot_generated_at === "string" ? packet.snapshot_generated_at : null,
    last_report_at: typeof packet.last_report_at === "string" ? packet.last_report_at : null,
    status: typeof packet.status === "string" ? packet.status : "active",
    updated_at: typeof packet.updated_at === "string" ? packet.updated_at : null,
    employee: packet.employee && typeof packet.employee === "object" ? packet.employee : null,
    project: packet.project && typeof packet.project === "object" ? packet.project : null,
    mission_url: typeof packet.mission_url === "string" ? packet.mission_url : null,
  };
}

function readLocalWorkPacket(cwd = process.cwd()) {
  return normalizePacket(readJson(localWorkPacketPath(cwd), null));
}

function writeLocalWorkPacket(packet, options = {}) {
  const cwd = options.cwd || process.cwd();
  const file = options.file || localWorkPacketPath(cwd);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(packet, null, 2)}\n`);
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

function trackingProjectId(cwd = process.cwd()) {
  const tracking = readJson(path.join(cwd, ".planning", "tracking.json"), {});
  return uuid(tracking.erp_project_id);
}

function fetchJson(url, key, options = {}) {
  const endpoint = new URL(url);
  const transport = endpoint.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = transport.request(
      endpoint,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "User-Agent": "qualia-framework-work-packet",
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
            resolve(parsed);
          } else {
            const message =
              parsed && typeof parsed === "object" && parsed.message
                ? parsed.message
                : body || `HTTP ${res.statusCode}`;
            reject(new Error(`ERP work packet pull failed (${res.statusCode}): ${message}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("ERP work packet pull timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function pullWorkPacket(options = {}) {
  const cwd = options.cwd || process.cwd();
  const cfg = options.erp || erpConfig(options);
  if (!cfg.enabled) throw new Error("ERP disabled in Qualia config");
  if (!cfg.key) throw new Error("ERP API key missing in Qualia install");
  const projectId = uuid(options.projectId) || trackingProjectId(cwd);
  if (!projectId) {
    throw new Error("ERP project UUID required. Pass --project <uuid> or set tracking.erp_project_id");
  }
  const endpoint = new URL("/api/v1/work-packets", cfg.url);
  endpoint.searchParams.set("project_id", projectId);
  const response = await fetchJson(endpoint.toString(), cfg.key, options);
  const packet = normalizePacket(response);
  if (!packet) throw new Error("ERP returned an invalid work packet");
  return packet;
}

function parseArgs(argv) {
  const args = {
    action: "show",
    projectId: "",
    write: false,
    pretty: false,
    output: "",
  };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith("-")) args.action = rest.shift();
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--project" || arg === "-p") args.projectId = rest[++i] || "";
    else if (arg === "--write") args.write = true;
    else if (arg === "--pretty") args.pretty = true;
    else if (arg === "--output" || arg === "-o") args.output = rest[++i] || "";
  }
  return args;
}

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    if (args.action === "pull") {
      const packet = await pullWorkPacket({ projectId: args.projectId });
      const file = writeLocalWorkPacket(packet, { file: args.output || undefined });
      process.stdout.write(args.pretty ? `${JSON.stringify(packet, null, 2)}\n` : `${file}\n`);
      return;
    }
    const packet = readLocalWorkPacket();
    if (!packet) throw new Error("No local .planning/work-packet.json found");
    process.stdout.write(`${JSON.stringify(packet, null, args.pretty ? 2 : 0)}\n`);
  })().catch((error) => {
    console.error(`work-packet failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  WORK_PACKET_FILE,
  erpConfig,
  localWorkPacketPath,
  normalizePacket,
  pullWorkPacket,
  readLocalWorkPacket,
  trackingProjectId,
  uuid,
  writeLocalWorkPacket,
};
