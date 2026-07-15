#!/usr/bin/env node
// ~/.claude/bin/auto-report.js — B1 auto-capture (framework side).
//
// Fires at SHIP TIME: when a Qualia project's tracking.json reaches
// status `shipped`, POST a session report to the ERP tagged `source: "auto"`,
// so the ERP reflects real shipped work without anyone running /qualia-report.
//
// Design (mirrors the constraints learned the hard way):
//   • Ship-time, NOT per-turn. The Stop hook fires every turn; this guards on
//     status===shipped + a per-shipped-unit dedupe marker, so it POSTs exactly
//     ONCE per shipped (milestone, phase) — never a per-turn spam stream.
//   • Fail-soft. Never throws, never blocks. On any upload failure it enqueues
//     to the existing erp-retry queue (drained by session-start) and exits 0.
//   • One ERP-upload seam. Reuses erp-retry's postOnce/enqueue/config/key
//     readers and report-payload's buildPayload — no duplicated contract.
//   • No double-posting. The dedupe marker means re-running on the same shipped
//     unit is a no-op; the ERP also UPSERTs on (project_id, client_report_id).
//
// Invoked fire-and-forget (detached) by hooks/stop-session-log.js, or directly:
//   node auto-report.js            # run the guarded auto-report for cwd
//   SOURCE handled internally as "auto"; set DRY_RUN=1 to mark the report dry.

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { buildPayload } = require("./report-payload.js");
const { enqueue, postOnce, readApiKey, readConfig } = require("./erp-retry.js");

function qualiaHome(home = os.homedir()) {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(home, ".claude");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function markerFile(home, projectKey) {
  const safe = String(projectKey || "project").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return path.join(qualiaHome(home), `.qualia-auto-report-${safe}.json`);
}

function erpUrl(cfg) {
  const base = (cfg && cfg.erp && cfg.erp.url) || "https://portal.qualiasolutions.net";
  return base.replace(/\/+$/, "") + "/api/v1/reports";
}

function allocateReportId(cwd) {
  // Sequential QS-REPORT-NN via state.js (the same allocator /qualia-report uses).
  try {
    const r = spawnSync("node", [path.join(__dirname, "state.js"), "next-report-id"], {
      cwd,
      encoding: "utf8",
      timeout: 4000,
    });
    if (r.status === 0 && r.stdout) {
      const parsed = JSON.parse(r.stdout);
      if (parsed && parsed.report_id) return parsed.report_id;
    }
  } catch {}
  return "";
}

// The single decision + action. Returns a small status object; never throws.
async function maybeAutoReport({ cwd = process.cwd(), home = os.homedir(), env = process.env } = {}) {
  try {
    // Guard 1 — ERP configured. No key / disabled → silent no-op.
    const cfg = readConfig();
    if (cfg && cfg.erp && cfg.erp.enabled === false) return { skipped: "erp-disabled" };
    const apiKey = readApiKey();
    if (!apiKey) return { skipped: "no-key" };

    // Guard 2 — Qualia project at SHIP time only.
    const tracking = readJson(path.join(cwd, ".planning", "tracking.json"));
    if (!tracking) return { skipped: "no-project" };
    if (String(tracking.status) !== "shipped") return { skipped: "not-shipped" };

    // Guard 3 — dedupe: one report per shipped (milestone, phase).
    const projectKey =
      tracking.project_id ||
      tracking.project ||
      path.basename(cwd);
    const unit = `${tracking.milestone || 1}:${tracking.phase || 0}:shipped`;
    const mFile = markerFile(home, projectKey);
    const marker = readJson(mFile) || {};
    if (marker.last === unit) return { skipped: "already-reported", unit };

    // Allocate a sequential client_report_id (the ERP dedupe key).
    const clientReportId = allocateReportId(cwd);
    const idempotencyKey = crypto.randomUUID();
    const payload = buildPayload({
      cwd,
      home,
      env: { ...env, SOURCE: "auto", CLIENT_REPORT_ID: clientReportId },
    });
    const body = JSON.stringify(payload);
    const url = erpUrl(cfg);

    const result = await postOnce(
      { url, payload: body, idempotency_key: idempotencyKey },
      apiKey,
    );

    const writeMarker = (extra) => {
      try {
        fs.writeFileSync(
          mFile,
          JSON.stringify({ last: unit, client_report_id: clientReportId, at: new Date().toISOString(), ...extra }, null, 2),
          { mode: 0o600 },
        );
      } catch {}
    };

    if (result.code === "200") {
      writeMarker({ posted: true });
      return { posted: clientReportId, unit };
    }

    // Any non-200 → enqueue for the retry queue (session-start drains it).
    // Mark the unit so we don't re-allocate a new id on the next turn; the
    // queued item carries this client_report_id and the ERP dedupes on it.
    try {
      enqueue({
        client_report_id: clientReportId,
        idempotency_key: idempotencyKey,
        url,
        payload: body,
        last_error: result.error ? `network: ${result.error}` : `HTTP ${result.code}`,
      });
    } catch {}
    writeMarker({ queued: true, last_error: result.error || `HTTP ${result.code}` });
    return { queued: clientReportId, unit, error: result.error || `HTTP ${result.code}` };
  } catch (e) {
    // Auto-capture must never break a session.
    return { skipped: "error", error: e && e.message ? e.message : String(e) };
  }
}

module.exports = { maybeAutoReport };

if (require.main === module) {
  maybeAutoReport()
    .then((r) => {
      if (process.env.QUALIA_DEBUG) process.stdout.write(JSON.stringify(r) + "\n");
      process.exit(0);
    })
    .catch(() => process.exit(0));
}
