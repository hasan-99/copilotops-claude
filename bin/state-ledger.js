#!/usr/bin/env node
// State ledger — append-only, hash-chained events for Qualia state mutations.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SCHEMA_VERSION = 1;

function qualiaDir(cwd = process.cwd()) {
  return path.join(cwd, ".planning", "qualia");
}

function ledgerPath(cwd = process.cwd()) {
  return path.join(qualiaDir(cwd), "state.jsonl");
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function hash(value) {
  return `sha256:${crypto.createHash("sha256").update(String(value)).digest("hex")}`;
}

function hashContent(content) {
  if (content == null) return null;
  return hash(content);
}

function newEventId() {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${ts}${rand}`;
}

function readEvents(cwd = process.cwd()) {
  const file = ledgerPath(cwd);
  if (!fs.existsSync(file)) return [];
  const events = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)) {
    try { events.push(JSON.parse(line)); } catch {}
  }
  return events;
}

function lastEvent(cwd = process.cwd()) {
  const events = readEvents(cwd);
  return events.length ? events[events.length - 1] : null;
}

function actor() {
  return process.env.QUALIA_ACTOR ||
    process.env.CLAUDE_USER_NAME ||
    process.env.USER ||
    process.env.USERNAME ||
    "unknown";
}

function compactState(state) {
  if (!state) return null;
  return {
    phase: state.phase,
    status: state.status,
    phase_name: state.phase_name,
    total_phases: state.total_phases,
  };
}

function compactTracking(tracking) {
  if (!tracking) return null;
  return {
    project: tracking.project,
    phase: tracking.phase,
    status: tracking.status,
    milestone: tracking.milestone,
    milestone_name: tracking.milestone_name,
    tasks_done: tracking.tasks_done,
    tasks_total: tracking.tasks_total,
    verification: tracking.verification,
    report_seq: tracking.report_seq,
  };
}

function eventHash(event) {
  const clean = { ...event };
  delete clean.event_hash;
  return hash(stableJson(clean));
}

function append(cwd, input) {
  const previous = lastEvent(cwd);
  const event = {
    schema_version: SCHEMA_VERSION,
    event_id: input.event_id || newEventId(),
    timestamp: input.timestamp || new Date().toISOString(),
    actor: input.actor || actor(),
    command: input.command || "",
    action: input.action,
    result: input.result || "success",
    phase_before: input.phase_before,
    phase_after: input.phase_after,
    status_before: input.status_before,
    status_after: input.status_after,
    state_before: compactState(input.state_before),
    state_after: compactState(input.state_after),
    tracking_before: compactTracking(input.tracking_before),
    tracking_after: compactTracking(input.tracking_after),
    state_hash_before: hashContent(input.state_raw_before),
    state_hash_after: hashContent(input.state_raw_after),
    tracking_hash_before: hashContent(input.tracking_raw_before),
    tracking_hash_after: hashContent(input.tracking_raw_after),
    evidence_refs: Array.isArray(input.evidence_refs) ? input.evidence_refs : [],
    previous_event_hash: previous ? previous.event_hash : null,
  };

  for (const key of Object.keys(event)) {
    if (event[key] === undefined) delete event[key];
  }
  event.event_hash = eventHash(event);

  ensureDir(qualiaDir(cwd));
  fs.appendFileSync(ledgerPath(cwd), JSON.stringify(event) + "\n");
  return { ok: true, event_id: event.event_id, event_hash: event.event_hash };
}

function validate(cwd = process.cwd()) {
  const events = readEvents(cwd);
  const errors = [];
  let previousHash = null;
  events.forEach((event, index) => {
    if (event.previous_event_hash !== previousHash) {
      errors.push(`event ${index + 1}: previous_event_hash mismatch`);
    }
    const expected = eventHash(event);
    if (event.event_hash !== expected) {
      errors.push(`event ${index + 1}: event_hash mismatch`);
    }
    previousHash = event.event_hash || null;
  });
  return { ok: errors.length === 0, count: events.length, errors };
}

function main(argv) {
  const cmd = argv[2] || "validate";
  if (cmd === "validate") {
    const result = validate(process.cwd());
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  if (cmd === "tail") {
    const limit = parseInt(argv[3] || "10", 10);
    console.log(JSON.stringify(readEvents(process.cwd()).slice(-limit), null, 2));
    return 0;
  }
  console.error("Usage: state-ledger.js <validate|tail> [limit]");
  return 2;
}

module.exports = {
  SCHEMA_VERSION,
  append,
  validate,
  readEvents,
  ledgerPath,
  hash,
  stableJson,
};

if (require.main === module) process.exit(main(process.argv));
