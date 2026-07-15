#!/usr/bin/env node
// erp-event.js — the framework EMIT side of the unified event log (R14).
//
// Builds a signed FrameworkEvent envelope and queues it for the ERP's
// POST /api/v1/events. The HMAC is keyed by the install's API token (the same
// qlt_ key used for reports), so the ERP — which holds only the token's hash but
// sees the plaintext Bearer per request — can verify body integrity + replay.
// Standard-Webhooks shape: id/timestamp/signature ride in headers, the event in
// the body. Non-blocking and graceful: ERP disabled or no key ⇒ a silent no-op.
//
// Mirrors lib/framework-events.ts on the ERP side — signingContent and the
// HMAC-SHA256/base64 must stay byte-identical or signatures won't verify.
//
// Usage:
//   erp-event.js emit <action> [--target type:ref]... [--project <uuid>]
//                 [--meta k=v]... [--ctx k=v]... [--json] [--dry-run]
//   # e.g. erp-event.js emit verify_pass --target project:acme --project <uuid>
//
// Exit: 0 = queued or skipped (never blocks a session), 2 = bad invocation.

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}
const QUALIA_HOME = qualiaHome();
const CONFIG_FILE = path.join(QUALIA_HOME, ".qualia-config.json");
const API_KEY_FILE = path.join(QUALIA_HOME, ".erp-api-key");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}
function readApiKey() {
  try {
    return fs.readFileSync(API_KEY_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

// The exact bytes the ERP re-signs: `${id}.${timestamp}.${rawBody}`. rawBody is
// the EXACT payload string we queue — erp-retry posts it verbatim.
function signingContent(id, timestamp, rawBody) {
  return `${id}.${timestamp}.${rawBody}`;
}
function computeSignature(content, secret) {
  return crypto.createHmac("sha256", secret).update(content).digest("base64");
}

// Build (and optionally sign) the envelope. Pure; injectable id/now for tests.
function buildSignedEvent(action, opts = {}) {
  const cfg = opts.config || readConfig();
  const apiKey = opts.apiKey != null ? opts.apiKey : readApiKey();
  const id = opts.id || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const ts = String(opts.now != null ? opts.now : Math.floor(Date.now() / 1000));

  const event = {
    action,
    actor: opts.actor || {
      code: cfg.code,
      name: cfg.installed_by,
      role: cfg.role,
    },
    ...(opts.targets && opts.targets.length ? { targets: opts.targets } : {}),
    ...(opts.context ? { context: opts.context } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
    occurred_at: opts.occurredAt || new Date(Number(ts) * 1000).toISOString(),
    ...(opts.erpProjectId ? { erp_project_id: opts.erpProjectId } : {}),
    ...(opts.workspaceId ? { workspace_id: opts.workspaceId } : {}),
  };

  const payload = JSON.stringify(event);
  const headers = { "Qualia-Event-Id": id, "Qualia-Event-Timestamp": ts };
  // Sign only when we have a key — unsigned posts still authenticate via Bearer
  // and the ERP records them signature_valid=false.
  if (apiKey) headers["Qualia-Signature"] = computeSignature(signingContent(id, ts, payload), apiKey);

  return { id, ts, event, payload, headers };
}

// In-process emit (hooks/skills can require this). Returns a result object;
// never throws on ERP/network conditions.
function emitEvent(action, opts = {}) {
  const cfg = opts.config || readConfig();
  if (cfg.erp && cfg.erp.enabled === false) return { ok: true, skipped: "erp-disabled" };
  const erpUrl = (cfg.erp && cfg.erp.url) || "https://portal.qualiasolutions.net";
  const built = buildSignedEvent(action, { ...opts, config: cfg });
  if (opts.dryRun) return { ok: true, dryRun: true, ...built };

  try {
    const retryPath = path.join(QUALIA_HOME, "bin", "erp-retry.js");
    const enqueue = fs.existsSync(retryPath)
      ? require(retryPath).enqueue
      : require("./erp-retry.js").enqueue;
    enqueue({
      client_report_id: built.id, // event_id is unique → no false dedupe
      idempotency_key: built.id,
      url: `${erpUrl.replace(/\/$/, "")}/api/v1/events`,
      payload: built.payload,
      headers: built.headers,
    });
    return { ok: true, queued: true, ...built };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e), ...built };
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function parseKv(list) {
  const out = {};
  for (const item of list) {
    const i = item.indexOf("=");
    if (i > 0) out[item.slice(0, i)] = item.slice(i + 1);
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] !== "emit") {
    process.stderr.write("erp-event.js emit <action> [--target type:ref] [--project uuid] [--meta k=v] [--ctx k=v] [--json] [--dry-run]\n");
    process.exit(2);
  }
  const action = argv[1];
  if (!action || action.startsWith("--")) {
    process.stderr.write("erp-event.js: <action> is required (e.g. verify_pass)\n");
    process.exit(2);
  }
  const targets = [];
  const metaKv = [];
  const ctxKv = [];
  const opts = { json: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") {
      const t = argv[++i] || "";
      const c = t.indexOf(":");
      targets.push(c > 0 ? { type: t.slice(0, c), ref: t.slice(c + 1) } : { ref: t });
    } else if (a === "--project") opts.erpProjectId = argv[++i];
    else if (a === "--workspace") opts.workspaceId = argv[++i];
    else if (a === "--meta") metaKv.push(argv[++i] || "");
    else if (a === "--ctx") ctxKv.push(argv[++i] || "");
    else if (a === "--json") opts.json = true;
    else if (a === "--dry-run") opts.dryRun = true;
  }
  if (targets.length) opts.targets = targets;
  if (metaKv.length) opts.metadata = parseKv(metaKv);
  if (ctxKv.length) opts.context = parseKv(ctxKv);

  const result = emitEvent(action, opts);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.skipped) {
    console.log(`erp-event: skipped (${result.skipped})`);
  } else if (result.dryRun) {
    console.log(`erp-event: [dry-run] ${action} id=${result.id} signed=${!!result.headers["Qualia-Signature"]}`);
  } else if (result.queued) {
    console.log(`⬢ event queued: ${action} (${result.id})`);
  } else if (!result.ok) {
    console.error(`erp-event: ${result.error}`);
  }
  process.exit(0);
}

module.exports = { emitEvent, buildSignedEvent, signingContent, computeSignature };

if (require.main === module) main();
