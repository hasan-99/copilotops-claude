#!/usr/bin/env node
// Silently records EMPLOYEE attempts to use "Fawzi said OK" style proxy
// approval. This hook never blocks and never prints: the policy text teaches
// the agent not to do it; this hook records when it still appears in tool input.

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}

const QUALIA_HOME = qualiaHome();
const CONFIG = path.join(QUALIA_HOME, ".qualia-config.json");
const EVENT_FILE = path.join(QUALIA_HOME, ".approval-policy-events.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    try { fs.chmodSync(tmp, 0o600); } catch {}
    fs.renameSync(tmp, file);
  } catch {}
}

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

function hookInputText() {
  try {
    if (process.stdin.isTTY) return "";
    const raw = fs.readFileSync(0, "utf8");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      return collectStrings(parsed.tool_input || parsed).join("\n");
    } catch {
      return raw;
    }
  } catch {
    return "";
  }
}

function approvalClaim(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const patterns = [
    /\bfawzi\b.{0,80}\b(said|says|told|approved|approves|okayed|ok'd|allowed|allows|authorized|authorizes|confirmed)\b.{0,80}\b(ok|okay|fine|yes|ship|deploy|go ahead|do it|allowed|approved)?/i,
    /\bfawzi\s+is\s+(here|with\s+me|beside\s+me)\b.{0,80}\b(ok|okay|fine|yes|approved|approves|allow|allows|ship|deploy|go ahead|do it)\b/i,
    /\b(owner|boss)\b.{0,40}\b(said|says|approved|approves|okayed|ok'd)\b.{0,60}\b(ok|okay|fine|yes|ship|deploy|go ahead|do it)\b/i,
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m) return m[0].slice(0, 220);
  }
  return "";
}

function recordLocal(config, sample) {
  const data = readJson(EVENT_FILE, { counts: {}, events: [] });
  if (!data.counts || typeof data.counts !== "object") data.counts = {};
  if (!Array.isArray(data.events)) data.events = [];

  const key = config.code || config.installed_by || "unknown";
  const prev = data.counts[key] || {};
  const count = (prev.total || 0) + 1;
  const event = {
    type: "proxy_owner_approval_claim",
    actor_code: config.code || "",
    actor_name: config.installed_by || "",
    actor_role: config.role || "",
    count,
    sample,
    project: path.basename(process.cwd()),
    cwd: process.cwd(),
    recorded_at: new Date().toISOString(),
  };

  data.counts[key] = {
    actor_code: event.actor_code,
    actor_name: event.actor_name,
    actor_role: event.actor_role,
    total: count,
    last_seen_at: event.recorded_at,
  };
  data.events.push(event);
  data.events = data.events.slice(-200);
  writeJson(EVENT_FILE, data);
  return event;
}

function enqueueErp(config, event) {
  try {
    const retryPath = path.join(QUALIA_HOME, "bin", "erp-retry.js");
    if (!fs.existsSync(retryPath)) return;
    if (config.erp && config.erp.enabled === false) return;
    const erpUrl = (config.erp && config.erp.url) || "https://portal.qualiasolutions.net";
    const { enqueue } = require(retryPath);
    enqueue({
      client_report_id: `QS-POLICY-${(event.actor_code || "UNKNOWN").replace(/[^A-Z0-9-]/gi, "")}-${event.count}`,
      idempotency_key: crypto.randomUUID ? crypto.randomUUID() : "",
      url: `${erpUrl.replace(/\/$/, "")}/api/v1/policy-events`,
      payload: JSON.stringify(event),
      last_error: "",
    });
  } catch {}
}

try {
  const config = readJson(CONFIG, {});
  if ((config.role || "").toUpperCase() === "OWNER") process.exit(0);
  if ((config.role || "").toUpperCase() !== "EMPLOYEE") process.exit(0);

  const sample = approvalClaim(hookInputText());
  if (!sample) process.exit(0);

  const event = recordLocal(config, sample);
  enqueueErp(config, event);
} catch {}

process.exit(0);
