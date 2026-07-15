#!/usr/bin/env node
// ~/.claude/bin/erp-retry.js
//
// ERP report retry queue. /qualia-report enqueues a report here if the
// inline 3-attempt-with-backoff upload fails. session-start.js drains the
// queue quietly on the next Claude Code launch; `qualia-framework erp-flush`
// drains it verbosely on demand.
//
// Why a queue: the prior v5.8 implementation told the user "$REPORT will
// appear in ERP after retry" but had no retry mechanism — data was stranded
// locally until the employee manually re-ran /qualia-report. Found by the
// 2026-05-11 deep-research audit. This module makes the promise real.
//
// Idempotency: every enqueued item carries the Idempotency-Key header that
// the original report attempt used. The ERP UPSERTs on
// (project_id, client_report_id) and deduplicates Idempotency-Key for 24h,
// so retry-of-a-just-succeeded item is safe.
//
// Hard rules:
// - Never throw out the queue file on parse error — back it up and start fresh.
// - Max 10 attempts per item before marking give_up=true (stops the cycle).
// - 401/422 are permanent failures: keep the item but mark give_up=true so
//   the user can see it and resolve manually (typically: fix the API key).
// - The CLI invocation NEVER exits non-zero unless the queue file is unreadable —
//   we don't want session-start.js to surface "hook error" red banners.
//
// Usage:
//   node erp-retry.js                  # drain all (with default 3-attempt budget per item)
//   node erp-retry.js --quiet          # no stdout unless errors
//   node erp-retry.js --max=3          # drain at most 3 items this run
//   node erp-retry.js --timeout=3000   # ms timeout per upload attempt
//   node erp-retry.js show             # print queue contents, drain nothing
//   node erp-retry.js clear            # delete the queue (use after manual fix)

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const http = require("http");
const urlLib = require("url");

const HOME = os.homedir();
function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(HOME, ".claude");
}

const QUALIA_HOME = qualiaHome();
const QUEUE_FILE = path.join(QUALIA_HOME, ".erp-retry-queue.json");
const API_KEY_FILE = path.join(QUALIA_HOME, ".erp-api-key");
const CONFIG_FILE = path.join(QUALIA_HOME, ".qualia-config.json");

const MAX_GIVE_UP_ATTEMPTS = 10;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_ITEMS = 100;

// ─── Args ───────────────────────────────────────────────
const args = process.argv.slice(2);
const ACTION = (args[0] && !args[0].startsWith("--")) ? args[0] : "drain";
const QUIET = args.includes("--quiet");
function flag(name, fallback) {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  if (!found) return fallback;
  const v = found.split("=", 2)[1];
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
const MAX_ITEMS = flag("max", DEFAULT_MAX_ITEMS);
const TIMEOUT_MS = flag("timeout", DEFAULT_TIMEOUT_MS);

function log(msg) { if (!QUIET) process.stdout.write(msg + "\n"); }
function logErr(msg) { process.stderr.write(msg + "\n"); }

// ─── Queue I/O ──────────────────────────────────────────
function readQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return { queue: [] };
  try {
    const raw = fs.readFileSync(QUEUE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.queue)) return { queue: [] };
    return parsed;
  } catch (e) {
    // Corrupt queue — back up and start fresh. Never silently destroy data.
    const bak = `${QUEUE_FILE}.bak.${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try { fs.copyFileSync(QUEUE_FILE, bak); } catch {}
    logErr(`erp-retry: queue file unparseable; backed up to ${bak} and starting fresh`);
    return { queue: [] };
  }
}

function writeQueue(data) {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Atomic: write tmp, rename. Mode 0600 because the payload contains
  // session notes that may reference internal project state.
  const tmp = `${QUEUE_FILE}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  try { fs.chmodSync(tmp, 0o600); } catch {}
  fs.renameSync(tmp, QUEUE_FILE);
}

function enqueue({ client_report_id, idempotency_key, url, payload, last_error, headers }) {
  if (!client_report_id || !url || !payload) {
    throw new Error("enqueue: client_report_id, url, payload are required");
  }
  const data = readQueue();
  // Dedupe — if this report id is already queued, update the existing item
  // instead of appending a duplicate.
  const existing = data.queue.find((it) => it.client_report_id === client_report_id);
  if (existing) {
    existing.idempotency_key = idempotency_key || existing.idempotency_key;
    existing.url = url;
    existing.payload = payload;
    if (headers) existing.headers = headers;
    existing.last_error = last_error || existing.last_error || "";
    existing.attempts = existing.attempts || 0;
    existing.give_up = false; // unblock a retry if user fixed the underlying issue
    existing.enqueued_at = new Date().toISOString();
  } else {
    data.queue.push({
      client_report_id,
      idempotency_key: idempotency_key || "",
      url,
      payload,
      ...(headers ? { headers } : {}),
      enqueued_at: new Date().toISOString(),
      attempts: 0,
      last_error: last_error || "",
      give_up: false,
    });
  }
  writeQueue(data);
}

// ─── HTTP upload (native https — no curl bearer leak via /proc) ──
function postOnce(item, apiKey) {
  return new Promise((resolve) => {
    let u;
    try { u = urlLib.parse(item.url); } catch {
      return resolve({ code: "—", body: "", error: "invalid url" });
    }
    const lib = u.protocol === "https:" ? https : http;
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(item.payload),
    };
    if (item.idempotency_key) headers["Idempotency-Key"] = item.idempotency_key;
    // Per-item custom headers (e.g. the signed-event envelope:
    // Qualia-Event-Id / Qualia-Event-Timestamp / Qualia-Signature). Auth +
    // Content-* are framework-owned and not overridable.
    if (item.headers && typeof item.headers === "object") {
      for (const [k, v] of Object.entries(item.headers)) {
        if (/^(authorization|content-type|content-length)$/i.test(k)) continue;
        headers[k] = String(v);
      }
    }
    const req = lib.request({
      method: "POST",
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.path,
      headers,
      timeout: TIMEOUT_MS,
    }, (res) => {
      let chunks = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { chunks += c; });
      res.on("end", () => resolve({ code: String(res.statusCode), body: chunks.trim(), error: null }));
    });
    req.on("error", (e) => resolve({ code: "—", body: "", error: e.message || "request failed" }));
    req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch {} });
    req.write(item.payload);
    req.end();
  });
}

function readApiKey() {
  try { return fs.readFileSync(API_KEY_FILE, "utf8").trim(); } catch { return ""; }
}

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch { return {}; }
}

// ─── Actions ────────────────────────────────────────────
async function actionDrain() {
  const data = readQueue();
  if (data.queue.length === 0) {
    log("erp-retry: queue empty");
    return { drained: 0, kept: 0, give_up: 0 };
  }

  const cfg = readConfig();
  const erpEnabled = !cfg.erp || cfg.erp.enabled !== false;
  if (!erpEnabled) {
    log("erp-retry: ERP disabled in config; skipping drain (queue preserved)");
    return { drained: 0, kept: data.queue.length, give_up: 0 };
  }

  const apiKey = readApiKey();
  if (!apiKey) {
    log("erp-retry: API key missing; skipping drain (queue preserved)");
    return { drained: 0, kept: data.queue.length, give_up: 0 };
  }

  let drained = 0;
  let give_up = 0;
  const remaining = [];
  let processed = 0;

  for (const item of data.queue) {
    // Already given up — keep but don't try.
    if (item.give_up) {
      remaining.push(item);
      continue;
    }
    // Respect the per-run cap.
    if (processed >= MAX_ITEMS) {
      remaining.push(item);
      continue;
    }
    processed++;

    const result = await postOnce(item, apiKey);

    if (result.code === "200") {
      drained++;
      log(`  ✓ uploaded ${item.client_report_id}`);
      continue; // omit from remaining
    }

    item.attempts = (item.attempts || 0) + 1;
    item.last_error = result.error
      ? `network: ${result.error}`
      : `HTTP ${result.code}${result.body ? `: ${result.body.slice(0, 200)}` : ""}`;

    if (result.code === "401" || result.code === "422") {
      // Permanent — surface to user.
      item.give_up = true;
      give_up++;
      log(`  ✗ ${item.client_report_id} permanent fail (HTTP ${result.code}) — leaving in queue for manual review`);
    } else if (item.attempts >= MAX_GIVE_UP_ATTEMPTS) {
      item.give_up = true;
      give_up++;
      log(`  ✗ ${item.client_report_id} gave up after ${item.attempts} attempts (last: ${item.last_error})`);
    } else {
      log(`  · ${item.client_report_id} retry pending (attempt ${item.attempts}, last: ${item.last_error})`);
    }
    remaining.push(item);
  }

  writeQueue({ queue: remaining });

  if (drained > 0 || give_up > 0 || !QUIET) {
    log(`erp-retry: drained=${drained} kept=${remaining.length} give_up=${give_up}`);
  }
  return { drained, kept: remaining.length, give_up };
}

function actionShow() {
  const data = readQueue();
  if (data.queue.length === 0) {
    log("queue empty");
    return;
  }
  log(`${data.queue.length} item(s) in queue:`);
  for (const item of data.queue) {
    log(`  ${item.client_report_id}  enqueued=${item.enqueued_at}  attempts=${item.attempts || 0}${item.give_up ? "  GIVE_UP" : ""}`);
    if (item.last_error) log(`    last_error: ${item.last_error}`);
  }
}

function actionClear() {
  if (!fs.existsSync(QUEUE_FILE)) {
    log("queue already absent");
    return;
  }
  // Back up rather than rm — destructive ops on user data deserve a recovery point.
  const bak = `${QUEUE_FILE}.bak.${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try { fs.copyFileSync(QUEUE_FILE, bak); } catch {}
  try { fs.unlinkSync(QUEUE_FILE); } catch {}
  log(`queue cleared (backup at ${bak})`);
}

// ─── Export for in-process use (qualia-report skill enqueues directly;
//     auto-report.js reuses the POST + config/key readers so there is ONE
//     ERP-upload seam, not two). ──
module.exports = { enqueue, readQueue, writeQueue, postOnce, readApiKey, readConfig };

// ─── CLI entrypoint ─────────────────────────────────────
if (require.main === module) {
  (async () => {
    try {
      if (ACTION === "drain") await actionDrain();
      else if (ACTION === "show") actionShow();
      else if (ACTION === "clear") actionClear();
      else {
        logErr(`erp-retry: unknown action "${ACTION}". Use: drain | show | clear`);
        process.exit(2);
      }
    } catch (e) {
      logErr(`erp-retry: ${e && e.message ? e.message : e}`);
      // Soft-fail so session-start.js never blocks.
      process.exit(0);
    }
  })();
}
