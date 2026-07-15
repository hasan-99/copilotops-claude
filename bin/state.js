#!/usr/bin/env node
// Qualia State Machine — atomic state transitions with precondition validation
// No external dependencies. Node >= 18 only.

const fs = require("fs");
const path = require("path");
const stateLedger = require("./state-ledger.js");

const PLANNING = ".planning";
const STATE_FILE = path.join(PLANNING, "STATE.md");
const TRACKING_FILE = path.join(PLANNING, "tracking.json");
const LOCK_FILE = path.join(PLANNING, ".state.lock");
const JOURNAL_FILE = path.join(PLANNING, ".state.journal");

// ─── A5: per-increment, concurrency-aware layout ────────
// When `.planning/increments/` exists, the committed source of truth is one
// file per increment (carrying status + claimed_by + branch). STATE.md and
// tracking.json become LOCAL (gitignored) generated views, so two people on
// two branches never conflict on the planning files: they touch different
// increment files, and the only per-step-mutated files (STATE.md, tracking.json,
// cursor) are never committed. Projects without `increments/` keep the legacy
// single-file behavior verbatim — all new behavior is gated on hasIncrementLayout().
const INCREMENTS_DIR = path.join(PLANNING, "increments");
const RELEASES_DIR = path.join(PLANNING, "releases");
const CURSOR_FILE = path.join(PLANNING, ".cursor.json");
const BACKUP_DIR = path.join(PLANNING, ".backup");
const GITIGNORE_FILE = path.join(PLANNING, ".gitignore");
const MIGRATION_MANIFEST = path.join(PLANNING, "migration-manifest.json");

// ─── Atomic write (tmp + rename) ─────────────────────────
// Prevents half-written files when SIGINT, OOM, or AV scanners
// interrupt mid-write. Same-filesystem rename is atomic on POSIX
// and best-effort atomic on Windows (NTFS replaces in one syscall).
function atomicWrite(file, content) {
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, content);
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // Cleanup tmp on failure (Windows EBUSY, EPERM, etc.)
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

// ─── Write-ahead journal (two-file crash recovery) ──────
// STATE.md + tracking.json are written back-to-back. A SIGKILL or power
// loss between the two renames can leave the pair inconsistent. The
// journal captures the pre-write snapshot; if a journal is still present
// on next startup, we know the previous mutator crashed mid-write and
// restore both files to the pre-transaction state.
function writeJournal(preState, preTracking) {
  if (!fs.existsSync(PLANNING)) return;
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    pid: process.pid,
    state: preState != null ? preState : null,
    tracking: preTracking != null ? preTracking : null,
  });
  atomicWrite(JOURNAL_FILE, payload);
}
function clearJournal() {
  try { fs.unlinkSync(JOURNAL_FILE); } catch {}
}
function recoverFromJournal() {
  if (!fs.existsSync(JOURNAL_FILE)) return false;
  try {
    const raw = fs.readFileSync(JOURNAL_FILE, "utf8");
    const j = JSON.parse(raw);
    if (j.state != null) atomicWrite(STATE_FILE, j.state);
    if (j.tracking != null) atomicWrite(TRACKING_FILE, j.tracking);
    clearJournal();
    try { _trace("state-journal", "recover", { from_pid: j.pid, journal_ts: j.ts }); } catch {}
    return true;
  } catch {
    // Corrupt journal — best effort: remove so we don't loop on recovery.
    clearJournal();
    return false;
  }
}

// ─── Exclusive lock ──────────────────────────────────────
// Prevents two concurrent state.js mutations from racing on the dual
// STATE.md + tracking.json write. Read commands (check, validate-plan)
// don't take the lock — only mutators do.

// Synchronous sleep without CPU spin. Atomics.wait on a zero-initialized
// SharedArrayBuffer blocks until the timeout elapses and yields the CPU.
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // SharedArrayBuffer unavailable (extremely old runtimes) — last-resort
    // tight loop, bounded to the requested duration.
    const t = Date.now() + ms;
    while (Date.now() < t) {}
  }
}

function acquireLock(timeoutMs = 5000) {
  if (!fs.existsSync(PLANNING)) return null; // nothing to lock yet
  const start = Date.now();
  const ours = `${process.pid}@${new Date().toISOString()}`;
  while (Date.now() - start < timeoutMs) {
    try {
      const fd = fs.openSync(LOCK_FILE, "wx");
      fs.writeSync(fd, ours);
      fs.closeSync(fd);
      return LOCK_FILE;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // Stale lock? If older than 30s, steal it.
      try {
        const stat = fs.statSync(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > 30_000) {
          fs.unlinkSync(LOCK_FILE);
          continue;
        }
      } catch {}
      sleepSync(50);
    }
  }
  const waited = Date.now() - start;
  try { _trace("state-lock", "timeout", { waited_ms: waited }); } catch {}
  const err = new Error(
    `Could not acquire ${LOCK_FILE} after ${waited}ms. Another state mutation may still be running.`
  );
  err.code = "STATE_LOCK_TIMEOUT";
  err.waited_ms = waited;
  throw err;
}

function releaseLock(lock) {
  if (!lock) return;
  try { fs.unlinkSync(lock); } catch {}
}

// ─── Trace ──────────────────────────────────────────────
// Signature normalized: _trace(event, result, data?). Old callers passed
// (event, data) with `result` as a string in `data` — that produced
// nonsense JSONL ({0:"a",1:"l",2:"l",...}). Always use the 3-arg form.
//
// Log rotation: trace files older than TRACE_RETENTION_DAYS are pruned
// on every write. Heavy users used to accumulate unbounded MB/day in
// ~/.claude/.qualia-traces/. The prune is best-effort and never throws.
const TRACE_RETENTION_DAYS = 30;

function _pruneTraces(traceDir) {
  try {
    const cutoff = Date.now() - TRACE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(traceDir)) {
      if (!name.endsWith(".jsonl")) continue;
      const p = path.join(traceDir, name);
      try {
        const stat = fs.statSync(p);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(p);
      } catch {}
    }
  } catch {}
}

function _trace(event, result, data) {
  try {
    const os = require("os");
    const parent = path.basename(path.dirname(__dirname));
    const qualiaHome = process.env.QUALIA_HOME ||
      (parent === ".codex" || parent === ".claude" ? path.dirname(__dirname) : path.join(os.homedir(), ".claude"));
    const traceDir = path.join(qualiaHome, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    // Prune ~1% of the time (cheap on most invocations, bounded over time).
    if (Math.random() < 0.01) _pruneTraces(traceDir);
    const entry = {
      hook: event,
      result: result || "allow",
      timestamp: new Date().toISOString(),
      ...(data && typeof data === "object" ? data : {}),
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch { /* trace failures must not disrupt state machine */ }
}

// ─── Arg Parsing ─────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2).replace(/-/g, "_");
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

// ─── File I/O ────────────────────────────────────────────
function readTracking() {
  try {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, "utf8"));
  } catch {
    return null;
  }
}

function readTrackingRaw() {
  try {
    return fs.readFileSync(TRACKING_FILE, "utf8");
  } catch {
    return null;
  }
}

function parseTrackingRaw(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeTracking(t) {
  atomicWrite(TRACKING_FILE, JSON.stringify(t, null, 2) + "\n");
}

// ─── A5: increment / release / cursor layer (additive) ───
// All functions below are pure I/O + render helpers for the per-increment
// layout. Nothing in the legacy path calls them; they activate only once a
// project has been migrated (hasIncrementLayout() === true).

// Identity for claim ownership. Mirrors state-ledger.js actor() (env-based,
// not git config) so claimed_by matches the ledger's recorded actor.
function actor() {
  return (
    process.env.QUALIA_ACTOR ||
    process.env.CLAUDE_USER_NAME ||
    process.env.USER ||
    process.env.USERNAME ||
    "unknown"
  );
}

function hasIncrementLayout() {
  try {
    return fs.existsSync(INCREMENTS_DIR);
  } catch {
    return false;
  }
}

// Defense-in-depth: an increment id is interpolated into a file path, so it
// must never contain path separators or `..`. Reject anything that isn't a
// plain inc-slug token before it reaches path.join().
function isValidIncrementId(id) {
  return typeof id === "string" && /^inc-[A-Za-z0-9_-]+$/.test(id);
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "increment";
}

function incrementId(num, name) {
  return `inc-${String(num).padStart(4, "0")}-${slugify(name)}`;
}

// Roadmap statuses in legacy STATE.md use a few non-canonical tokens
// ("ready", "—", "completed"). Normalize to the canonical state-machine
// statuses so migrated increments transition with the existing VALID_FROM.
function mapRoadmapStatus(raw) {
  const v = String(raw || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (v === "ready" || v === "—" || v === "-" || v === "" || v === "todo") return "setup";
  if (v === "completed" || v === "complete" || v === "done") return "verified";
  const known = ["setup", "planned", "built", "verified", "polished", "shipped", "handed_off", "failed"];
  return known.includes(v) ? v : "setup";
}

// CRLF-tolerant frontmatter parser for increment / release files. Returns
// { fields, body } where fields is a flat key->string map of the `key: value`
// lines between the leading `---` fences, and body is everything after.
function parseFrontmatter(content) {
  if (!content) return null;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*?)\r?$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return { fields, body: m[2] || "" };
}

function parseIncrementMd(content) {
  const fm = parseFrontmatter(content);
  if (!fm || !fm.fields.id) return null;
  const f = fm.fields;
  const num = parseInt(f.num || f.phase) || 0;
  return {
    id: f.id,
    release: f.release || "r1",
    num,
    phase: num, // phase == num: the original roadmap index, kept for back-compat
    title: f.title || "",
    goal: f.goal || "",
    archetype: f.archetype || "",
    status: f.status || "setup",
    claimed_by: f.claimed_by || "",
    branch: f.branch || "",
    verification: f.verification || "pending",
    gap_cycles: parseInt(f.gap_cycles) || 0,
    tasks_done: parseInt(f.tasks_done) || 0,
    tasks_total: parseInt(f.tasks_total) || 0,
    wave: parseInt(f.wave) || 0,
    build_count: parseInt(f.build_count) || 0,
    deploy_count: parseInt(f.deploy_count) || 0,
    deployed_url: f.deployed_url || "",
    body: fm.body,
  };
}

function renderIncrementMd(inc) {
  const fm = [
    `id: ${inc.id}`,
    `release: ${inc.release || "r1"}`,
    `num: ${inc.num}`,
    `title: ${inc.title || ""}`,
    `goal: ${inc.goal || ""}`,
    `archetype: ${inc.archetype || ""}`,
    `status: ${inc.status || "setup"}`,
    `claimed_by: ${inc.claimed_by || ""}`,
    `branch: ${inc.branch || ""}`,
    `verification: ${inc.verification || "pending"}`,
    `gap_cycles: ${inc.gap_cycles || 0}`,
    `tasks_done: ${inc.tasks_done || 0}`,
    `tasks_total: ${inc.tasks_total || 0}`,
    `wave: ${inc.wave || 0}`,
    `build_count: ${inc.build_count || 0}`,
    `deploy_count: ${inc.deploy_count || 0}`,
    `deployed_url: ${inc.deployed_url || ""}`,
  ].join("\n");
  // Preserve an existing body verbatim (round-trip safe); seed a default body
  // with a DoD section the first time an increment is materialized.
  const body = (inc.body && inc.body.trim())
    ? inc.body.replace(/^\n+/, "")
    : `# ${inc.title || inc.id}\n\nGoal: ${inc.goal || "TBD"}\n\n## Acceptance Criteria\n- TBD\n\n## Definition of Done\n- [ ] TBD\n`;
  return `---\n${fm}\n---\n\n${body}`;
}

function incrementPath(id) {
  return path.join(INCREMENTS_DIR, `${id}.md`);
}

function readIncrement(id) {
  try {
    return parseIncrementMd(fs.readFileSync(incrementPath(id), "utf8"));
  } catch {
    return null;
  }
}

function writeIncrement(inc) {
  if (!fs.existsSync(INCREMENTS_DIR)) fs.mkdirSync(INCREMENTS_DIR, { recursive: true });
  atomicWrite(incrementPath(inc.id), renderIncrementMd(inc));
}

function listIncrements() {
  try {
    return fs
      .readdirSync(INCREMENTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readIncrement(f.replace(/\.md$/, "")))
      .filter(Boolean)
      .sort((a, b) => a.num - b.num);
  } catch {
    return [];
  }
}

// Definition-of-Done gate input: scan an increment body for open checklist
// lines. A line `- [ ] ...` is OPEN unless it carries a `WAIVED:` marker.
function incrementOpenDoD(inc) {
  if (!inc || !inc.body) return [];
  const open = [];
  for (const line of inc.body.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s*\[\s\]\s*(.+?)\s*$/);
    if (m && !/WAIVED:/i.test(line)) open.push(m[1]);
  }
  return open;
}
function incrementWaivedDoD(inc) {
  if (!inc || !inc.body) return [];
  const waived = [];
  for (const line of inc.body.split(/\r?\n/)) {
    if (/^\s*[-*]\s*\[\s\]/.test(line) && /WAIVED:/i.test(line)) waived.push(line.trim());
  }
  return waived;
}

// ─── Release files ──────────────────────────────────────
function parseReleaseMd(content) {
  const fm = parseFrontmatter(content);
  if (!fm || !fm.fields.id) return null;
  const incs = [];
  for (const line of fm.body.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s*(inc-[a-z0-9-]+)\s*$/i);
    if (m) incs.push(m[1]);
  }
  return {
    id: fm.fields.id,
    title: fm.fields.title || "",
    type: fm.fields.type || "rolling",
    status: fm.fields.status || "active",
    increments: incs,
  };
}
function renderReleaseMd(rel) {
  const list = (rel.increments || []).map((i) => `- ${i}`).join("\n");
  return `---\nid: ${rel.id}\ntitle: ${rel.title || ""}\ntype: ${rel.type || "rolling"}\nstatus: ${rel.status || "active"}\n---\n\n## Increments\n${list}\n`;
}
function releasePath(rid) {
  return path.join(RELEASES_DIR, `${rid}.md`);
}
function readRelease(rid) {
  try {
    return parseReleaseMd(fs.readFileSync(releasePath(rid), "utf8"));
  } catch {
    return null;
  }
}
function writeRelease(rel) {
  if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });
  atomicWrite(releasePath(rel.id), renderReleaseMd(rel));
}
function listReleases() {
  try {
    return fs
      .readdirSync(RELEASES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readRelease(f.replace(/\.md$/, "")))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Local cursor (never committed) ─────────────────────
function readCursor() {
  try {
    return JSON.parse(fs.readFileSync(CURSOR_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeCursor(c) {
  atomicWrite(CURSOR_FILE, JSON.stringify(c, null, 2) + "\n");
}

const A5_DONE_STATUSES = new Set(["verified", "polished", "shipped", "handed_off"]);

// The "active" increment for dashboard/tracking mirroring: explicit cursor,
// else the first not-yet-done increment, else the last.
function activeIncrement(increments, cursor) {
  if (!increments.length) return null;
  const cur = cursor && cursor.current_increment;
  if (cur) {
    const hit = increments.find((i) => i.id === cur);
    if (hit) return hit;
  }
  return increments.find((i) => !A5_DONE_STATUSES.has(i.status)) || increments[increments.length - 1];
}

// Build the writeStateMd() input object from increments — STATE.md becomes a
// pure projection of the committed increment files.
function dashboardStateFromIncrements(increments, active, t) {
  return {
    phase: active ? active.num : 1,
    total_phases: increments.length || 1,
    phase_name: active ? active.title : "",
    status: active ? active.status : "setup",
    assigned_to: active ? active.claimed_by : "",
    profile: (t && t.profile) || "strict",
    verification: active ? active.verification : "pending",
    last_activity: (t && t.last_activity) || "State regenerated from increments",
    phases: increments.map((i) => ({ num: i.num, name: i.title, goal: i.goal, status: i.status })),
    blockers: t && Array.isArray(t.blockers) && t.blockers.length ? t.blockers.join("; ") : "None.",
    resume: (t && t.resume) || "—",
  };
}

// Regenerate the two LOCAL views (tracking.json + STATE.md) from the committed
// increment files. tracking.json stays FAT (mirrors the active increment +
// keeps identity/lifetime) so all back-compat consumers keep working; it gains
// a per-increment index + releases index + mode for the ERP. Idempotent.
function regenerateViews(activity) {
  const increments = listIncrements();
  const cursor = readCursor();
  const active = activeIncrement(increments, cursor);
  const t = ensureLifetime(readTracking() || {});
  if (activity) t.last_activity = activity;

  // Mirror the active increment's per-phase fields into tracking for consumers.
  if (active) {
    t.phase = active.num;
    t.phase_name = active.title;
    t.status = active.status;
    t.verification = active.verification;
    t.tasks_done = active.tasks_done;
    t.tasks_total = active.tasks_total;
    t.wave = active.wave;
    t.build_count = active.build_count;
    t.deploy_count = active.deploy_count;
    t.deployed_url = active.deployed_url || t.deployed_url || "";
    t.gap_cycles = t.gap_cycles || {};
    t.gap_cycles[String(active.num)] = active.gap_cycles;
  }
  t.total_phases = increments.length;
  t.mode = t.mode || (listReleases()[0] ? listReleases()[0].type : "rolling");
  // Lightweight indexes for the ERP / dashboards (derived, not authoritative).
  t.increments = increments.map((i) => ({
    id: i.id, num: i.num, title: i.title, status: i.status,
    claimed_by: i.claimed_by, branch: i.branch, verification: i.verification,
  }));
  t.releases = listReleases().map((r) => ({ id: r.id, type: r.type, status: r.status, increments: r.increments }));
  t.next_command = active
    ? nextCommand(active.status, active.num, increments.length, active.verification)
    : "/qualia";
  t.last_updated = new Date().toISOString();
  writeTracking(t);

  // STATE.md dashboard (gitignored projection).
  writeStateMd(dashboardStateFromIncrements(increments, active, t));
  return { increments, active, tracking: t };
}

// ─── A5: increment-aware check (read-only, concurrency router) ───
// Returns the response shape legacy consumers expect PLUS the concurrency
// fields: my_claim, next_increment, claimed_increments[]. It never writes, so
// it's safe inside the /qualia parallel Bash batch and never conflicts.
function cmdCheckIncrement(opts) {
  const me = actor();
  const increments = listIncrements();
  const t = ensureLifetime(readTracking() || {});
  if (!increments.length) {
    return output({ ok: false, error: "NO_INCREMENTS", message: "increments/ exists but is empty. Run `state.js migrate` or `state.js fix`." });
  }
  const isDone = (i) => A5_DONE_STATUSES.has(i.status);
  const claimed_increments = increments
    .filter((i) => i.claimed_by && i.claimed_by !== me && !isDone(i))
    .map((i) => ({ id: i.id, num: i.num, title: i.title, status: i.status, claimed_by: i.claimed_by, branch: i.branch }));
  const mine = increments.find((i) => i.claimed_by === me && !isDone(i));
  const next_unclaimed = increments.find((i) => !isDone(i) && (!i.claimed_by || i.claimed_by === me));
  const focus = mine || next_unclaimed || activeIncrement(increments, readCursor());
  const totalPhases = increments.length;
  const allDone = increments.every(isDone);
  const next_command = mine
    ? nextCommand(mine.status, mine.num, totalPhases, mine.verification)
    : next_unclaimed
      ? nextCommand(next_unclaimed.status, next_unclaimed.num, totalPhases, next_unclaimed.verification)
      : (allDone ? "/qualia-polish" : "/qualia");

  output({
    ok: true,
    layout: "increments",
    phase: focus ? focus.num : 1,
    phase_name: focus ? focus.title : "",
    total_phases: totalPhases,
    status: focus ? focus.status : "setup",
    assigned_to: focus ? focus.claimed_by : "",
    profile: resolveProfile(null, t),
    milestone: t.milestone || 1,
    milestone_name: t.milestone_name || "",
    milestones: t.milestones || [],
    lifetime: t.lifetime,
    verification: focus ? focus.verification : "pending",
    gap_cycles: focus ? focus.gap_cycles : 0,
    gap_cycle_limit: getGapCycleLimit(),
    tasks_done: focus ? focus.tasks_done : 0,
    tasks_total: focus ? focus.tasks_total : 0,
    deployed_url: focus ? focus.deployed_url : "",
    actor: me,
    my_claim: mine ? mine.id : "",
    next_increment: next_unclaimed ? next_unclaimed.id : "",
    claimed_increments,
    increments: increments.map((i) => ({ id: i.id, num: i.num, title: i.title, status: i.status, claimed_by: i.claimed_by, branch: i.branch, verification: i.verification })),
    next_command,
  });
}

// ─── A5: increment-aware transition ─────────────────────
// Operates on ONE increment file (by --id or cursor). The committed mutation
// is a single increment file; tracking.json + STATE.md are regenerated locally.
function cmdTransitionIncrement(opts, target) {
  const increments = listIncrements();

  // note/activity short-circuit — log to (local) tracking + regenerate.
  if (target === "note" || target === "activity") {
    const t = ensureLifetime(readTracking() || {});
    if (opts.notes) t.notes = opts.notes;
    if (opts.tasks_done) {
      const c = parseInt(opts.tasks_done) || 0;
      if (c > 0) t.lifetime.tasks_completed += c;
    }
    // Scope tagging (anti-drift): /qualia-feature + /qualia-fix declare whether
    // the work served the active milestone (--scope in --ref CORE-03) or was
    // off-road (--scope off). Off-road work is COUNTED + ledgered so it can't
    // drift invisibly — the OWNER + ERP see the tally, mirroring branch-guard.
    const scope = String(opts.scope || "").toLowerCase();
    if (scope === "off" || scope === "in") {
      if (typeof t.lifetime.offroad_count !== "number") t.lifetime.offroad_count = 0;
      if (scope === "off") {
        t.lifetime.offroad_count += 1;
        if (!Array.isArray(t.offroad)) t.offroad = [];
        t.offroad.push({
          at: new Date().toISOString(),
          milestone: parseInt(t.milestone, 10) || null,
          ref: opts.ref || null,
          note: opts.notes || null,
        });
        if (t.offroad.length > 50) t.offroad = t.offroad.slice(-50); // keep recent
      }
    }
    writeTracking(t);
    regenerateViews(opts.notes || "Activity logged");
    return output({ ok: true, action: target, layout: "increments", scope: scope || undefined, offroad_count: t.lifetime.offroad_count });
  }

  // Resolve the target increment: explicit --id, else --phase N (back-compat
  // with phase-addressed skills: maps to the increment whose num === N), else
  // the cursor, else the active increment.
  if (opts.id && !isValidIncrementId(opts.id)) return output(fail("INVALID_ID", `Invalid increment id '${opts.id}' (must match inc-<slug>).`));
  const byPhase = opts.phase ? (increments.find((i) => i.num === parseInt(opts.phase)) || {}).id : "";
  const id = opts.id || byPhase || readCursor().current_increment || "";
  const inc = id ? readIncrement(id) : activeIncrement(increments, readCursor());
  if (!inc) return output(fail("UNKNOWN_INCREMENT", id ? `No increment '${id}' under ${INCREMENTS_DIR}` : "No active increment — set the cursor or pass --id."));

  const phase = inc.num;
  const prevStatus = inc.status;
  const check = checkPreconditions({ phase, status: inc.status, total_phases: increments.length }, target, { ...opts, phase });
  if (!check.ok) {
    const forceable = ["PRECONDITION_FAILED", "GAP_CYCLE_LIMIT", "INVALID_PLAN"];
    if (opts.force && forceable.includes(check.error)) {
      console.error(`WARNING: Forcing transition despite: ${check.message}`);
    } else {
      return output(check);
    }
  }

  const t = ensureLifetime(readTracking() || {});
  inc.status = target;
  if (target === "planned") {
    if (prevStatus === "verified") inc.gap_cycles = (inc.gap_cycles || 0) + 1;
  } else if (target === "built") {
    inc.tasks_done = parseInt(opts.tasks_done) || 0;
    inc.tasks_total = parseInt(opts.tasks_total) || 0;
    inc.wave = parseInt(opts.wave) || 0;
    inc.build_count = (inc.build_count || 0) + 1;
  } else if (target === "verified") {
    inc.verification = opts.verification;
    if (opts.verification !== "pass") {
      inc.status = "failed";
    } else {
      t.lifetime.tasks_completed += inc.tasks_done || 0;
      t.lifetime.phases_completed += 1;
      inc.gap_cycles = 0;
      // Auto-advance the cursor to the next increment on a pass.
      const idx = increments.findIndex((i) => i.id === inc.id);
      const nextInc = increments[idx + 1];
      if (nextInc) writeCursor({ current_increment: nextInc.id });
    }
  } else if (target === "shipped") {
    inc.deployed_url = opts.deployed_url || "";
    inc.deploy_count = (inc.deploy_count || 0) + 1;
  }

  writeIncrement(inc);
  writeTracking(t); // persist lifetime bump before regenerate re-reads tracking
  regenerateViews(`${target} (${inc.id})`);

  const ledger = recordLedgerEvent({ action: target, phase_before: phase, phase_after: inc.num, status_before: prevStatus, status_after: inc.status });
  _trace("state-transition", "allow", { layout: "increments", id: inc.id, status: inc.status, previous_status: prevStatus, verification: inc.verification });

  const result = {
    ok: true,
    layout: "increments",
    id: inc.id,
    phase: inc.num,
    phase_name: inc.title,
    status: inc.status,
    previous_status: prevStatus,
    verification: inc.verification,
    gap_cycles: inc.gap_cycles || 0,
    next_command: nextCommand(inc.status, inc.num, increments.length, inc.verification),
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else if (ledger.error) {
    result.ledger_error = ledger.error;
  }
  output(result);
}

// Ensure lifetime + milestone fields exist (backward compat for old tracking files)
function ensureLifetime(t) {
  if (!t) return t;
  if (typeof t.milestone !== "number") t.milestone = 1;
  if (typeof t.milestone_name !== "string") t.milestone_name = "";
  if (!Array.isArray(t.milestones)) t.milestones = [];
  if (typeof t.report_seq !== "number") t.report_seq = 0;
  // Seniority profile (backward compat): old tracking.json files predate this
  // field. Anything other than the exact string 'standard' defaults to 'strict'.
  if (t.profile !== "standard" && t.profile !== "strict") t.profile = "strict";
  if (!t.lifetime || typeof t.lifetime !== "object") {
    t.lifetime = {
      tasks_completed: 0,
      phases_completed: 0,
      milestones_completed: 0,
      total_phases: 0,
    };
  }
  // v7 lifecycle (backward compat): pre-v7 tracking.json predates these fields.
  if (t.lifecycle !== "operate" && t.lifecycle !== "build") t.lifecycle = "build";
  if (typeof t.lifetime.updates_completed !== "number") t.lifetime.updates_completed = 0;
  return t;
}

// Parse JOURNEY.md and extract the human name of the Nth milestone.
// Matches headers like:
//   ## Milestone 2 · Core Features
//   ## Milestone 2 · Core Features     [CURRENT]
//   ## Milestone 5 · Handoff           [FINAL]
// Returns "" if JOURNEY.md is absent or the milestone isn't in it.
function readNextMilestoneNameFromJourney(milestoneNum) {
  try {
    const journeyPath = path.join(PLANNING, "JOURNEY.md");
    if (!fs.existsSync(journeyPath)) return "";
    const content = fs.readFileSync(journeyPath, "utf8");
    const re = new RegExp(`^##\\s+Milestone\\s+${milestoneNum}\\s*[·•-]\\s*([^\\n\\[]+)`, "m");
    const m = content.match(re);
    if (m && m[1]) return m[1].trim();
    return "";
  } catch {
    return "";
  }
}

// A milestone name is a "placeholder" when it's blank or the literal
// "Milestone N" fallback that close-milestone historically emitted when
// tracking.json carried no real name. Placeholders must never beat a real
// name from JOURNEY.md (observed in ERP reports as {"num":"9","name":"Milestone 9"}).
function isPlaceholderMilestoneName(name, num) {
  const trimmed = String(name == null ? "" : name).trim();
  if (!trimmed) return true;
  return new RegExp(`^Milestone\\s+${num}$`, "i").test(trimmed);
}

// Resolve the human name for milestone `num`. Preference order:
//   1. `candidate` (e.g. tracking.json milestone_name) when it's a real name
//   2. the `## Milestone N · Name` header in JOURNEY.md
//   3. the "Milestone N" placeholder — last resort only
function resolveMilestoneName(num, candidate) {
  const trimmed = String(candidate == null ? "" : candidate).trim();
  if (!isPlaceholderMilestoneName(trimmed, num)) return trimmed;
  const fromJourney = readNextMilestoneNameFromJourney(num);
  if (fromJourney) return fromJourney;
  return `Milestone ${num}`;
}

// Normalize a milestone name for dedupe comparisons.
function normalizeMilestoneName(name) {
  return String(name == null ? "" : name).trim().toLowerCase();
}

// Parse the REQUIREMENTS.md traceability table for one milestone's REQ-IDs and
// their status. Rows look like: `| CORE-01 | M2: Name | Phase 3 | Complete |`.
// Returns { tracked: bool, total, incomplete: [{id, status}] }. tracked=false
// when REQUIREMENTS.md is absent or has no rows for this milestone (→ gate
// skips, like analyze-gate's no-scope-file: can't enforce what isn't declared).
function readMilestoneRequirements(milestoneNum) {
  let md;
  try { md = fs.readFileSync(path.join(PLANNING, "REQUIREMENTS.md"), "utf8"); }
  catch { return { tracked: false, total: 0, incomplete: [] }; }
  const num = parseInt(milestoneNum, 10);
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((c, i, a) => !(i === 0 && c === "") && !(i === a.length - 1 && c === ""));
    if (cells.length < 4) continue;
    const [id, milestone, , status] = cells;
    if (!/^[A-Z]+-\d+$/.test(id)) continue; // skip header + non-REQ rows
    const m = milestone.match(/M(\d+)\b/);
    if (!m || parseInt(m[1], 10) !== num) continue;
    rows.push({ id, status: status || "" });
  }
  const incomplete = rows.filter((r) => r.status.trim().toLowerCase() !== "complete");
  return { tracked: rows.length > 0, total: rows.length, incomplete };
}

function readState() {
  try {
    return fs.readFileSync(STATE_FILE, "utf8");
  } catch {
    return null;
  }
}

// ─── STATE.md Parser ─────────────────────────────────────
function parseStateMd(content) {
  if (!content) return null;
  const schema_errors = [];
  const get = (prefix) => {
    // CRLF tolerance: Windows editors save with `\r\n`. Use `(.+?)\r?$` so
    // the `\r` is consumed, not captured. `.trim()` is still applied as
    // belt-and-suspenders for any other trailing whitespace.
    const m = content.match(new RegExp(`^${prefix}:\\s*(.+?)\\r?$`, "m"));
    return m ? m[1].trim() : "";
  };
  const hasField = (prefix) =>
    new RegExp(`^${prefix}:\\s*`, "m").test(content);

  const phaseMatch = content.match(
    /^Phase:\s*(\d+)\s+of\s+(\d+)\s*[—-]\s*(.+?)\r?$/m
  );
  if (!phaseMatch) {
    schema_errors.push({
      field: "phase_header",
      message: 'Missing or malformed "Phase: N of M — Name" header',
      severity: "error",
    });
  }

  // Status field presence (independent of value)
  if (!hasField("Status")) {
    schema_errors.push({
      field: "status_field",
      message: "Missing Status: field",
      severity: "warning",
    });
  }

  // Parse roadmap table
  const phases = [];
  const tableHeaderRe = /\| # \| Phase \| Goal \| Status \|/;
  const tableMatch = content.match(
    /\| # \| Phase \| Goal \| Status \|\n\|[-|]+\|\n([\s\S]*?)(?=\n##|\n$|$)/
  );
  if (!tableHeaderRe.test(content)) {
    schema_errors.push({
      field: "roadmap_table",
      message: "Roadmap table header not found",
      severity: "error",
    });
  } else if (!tableMatch) {
    // Header is there but the separator row or body is malformed
    schema_errors.push({
      field: "roadmap_table",
      message: "Roadmap table is malformed (missing separator row or body)",
      severity: "error",
    });
  } else {
    for (const row of tableMatch[1].trim().split("\n")) {
      const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        phases.push({
          num: parseInt(cols[0]),
          name: cols[1],
          goal: cols[2],
          status: cols[3],
        });
      }
    }
  }

  // Row count vs header "of M"
  if (phaseMatch) {
    const declaredTotal = parseInt(phaseMatch[2]);
    if (phases.length && phases.length !== declaredTotal) {
      schema_errors.push({
        field: "roadmap_rows",
        message: `Expected ${declaredTotal} phases in roadmap, found ${phases.length}`,
        severity: "warning",
      });
    }
  }

  return {
    phase: phaseMatch ? parseInt(phaseMatch[1]) : 1,
    total_phases: phaseMatch ? parseInt(phaseMatch[2]) : phases.length || 1,
    phase_name: phaseMatch ? phaseMatch[3].trim() : "",
    status: get("Status").toLowerCase().replace(/\s+/g, "_") || "setup",
    assigned_to: get("Assigned to") || "",
    // Seniority profile: 'standard' lets a senior waive a gate; anything else
    // (including missing or typo'd values) coerces to 'strict' — the safe default.
    profile: get("Profile").toLowerCase() === "standard" ? "standard" : "strict",
    phases,
    schema_errors,
  };
}

// ─── STATE.md Writer ─────────────────────────────────────
function writeStateMd(s) {
  // Completed phases count toward progress. A phase counts as "done" once the
  // state has advanced past `built` (i.e. status in verified/polished/shipped/handed_off).
  // Without this adjustment, a 3-phase project shows 66% at completion and a
  // 1-phase project shows 0% — the bar would never reach 100%.
  const DONE_STATUSES = new Set(["verified", "polished", "shipped", "handed_off"]);
  const currentDone = DONE_STATUSES.has(s.status) && s.verification !== "fail" ? 1 : 0;
  const phaseFrac = Math.min(
    100,
    Math.round(((s.phase - 1 + currentDone) / s.total_phases) * 100)
  );
  const filled = Math.round(phaseFrac / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  const now = new Date().toISOString().split("T")[0];

  const roadmap = s.phases
    .map((p) => `| ${p.num} | ${p.name} | ${p.goal} | ${p.status} |`)
    .join("\n");

  const md = `# Project State

## Project
See: .planning/PROJECT.md

## Current Position
Phase: ${s.phase} of ${s.total_phases} — ${s.phase_name}
Status: ${s.status}
Assigned to: ${s.assigned_to}
Profile: ${s.profile || "strict"}
Last activity: ${now} — ${s.last_activity || "State updated"}

Progress: [${bar}] ${phaseFrac}%

## Roadmap
| # | Phase | Goal | Status |
|---|-------|------|--------|
${roadmap}

## Blockers
${s.blockers || "None."}

## Session
Last session: ${now}
Last worked by: ${s.assigned_to}
Resume: ${s.resume || "—"}
`;
  atomicWrite(STATE_FILE, md);
}

// ─── Precondition Checks ─────────────────────────────────
const VALID_FROM = {
  planned: ["setup", "verified"], // verified(fail) → planned = gap closure
  built: ["planned"],
  verified: ["built"],
  polished: ["verified"],
  shipped: ["polished"],
  handed_off: ["shipped"],
  done: ["handed_off"],
};

// ─── Configurable Gap Cycle Limit ────────────────────────
function getGapCycleLimit() {
  // Priority: tracking.json.gap_cycle_limit > PROJECT.md > default (2)
  try {
    const t = readTracking();
    if (t && typeof t.gap_cycle_limit === "number" && t.gap_cycle_limit > 0) {
      return t.gap_cycle_limit;
    }
  } catch {}

  try {
    const projectMd = fs.readFileSync(path.join(PLANNING, "PROJECT.md"), "utf8");
    const match = projectMd.match(/^gap_cycle_limit:\s*(\d+)/m);
    if (match) return parseInt(match[1]);
  } catch {}

  return 2; // default
}

function checkPreconditions(current, target, opts) {
  const phase = parseInt(opts.phase) || current.phase;

  // Special transitions (no status gate)
  if (target === "note" || target === "activity") return { ok: true };

  // Check valid transition
  const allowed = VALID_FROM[target];
  if (!allowed) return fail("INVALID_STATUS", `Unknown status: ${target}`);
  if (!allowed.includes(current.status)) {
    return fail(
      "PRECONDITION_FAILED",
      `Cannot go from '${current.status}' to '${target}'. Allowed from: ${allowed.join(", ")}`
    );
  }

  // File checks
  if (target === "planned") {
    const planFile = path.join(PLANNING, `phase-${phase}-plan.md`);
    if (!fs.existsSync(planFile))
      return fail("MISSING_FILE", `Plan file not found: ${planFile}`);
    // Validate plan content (not just existence)
    const planContent = fs.readFileSync(planFile, "utf8");
    const taskHeaders = planContent.match(/^## Task \d+/gm);
    if (!taskHeaders || taskHeaders.length === 0)
      return fail("INVALID_PLAN", "Plan file has no task headers (expected '## Task N')");
    // Accept either legacy "**Done when:**" or story-file "**Acceptance Criteria:**"
    // so old in-flight plans don't break on upgrade.
    const doneWhenCount = (planContent.match(/\*\*Done when:\*\*/g) || []).length;
    const acCount = (planContent.match(/\*\*Acceptance Criteria:\*\*/g) || []).length;
    const anchors = doneWhenCount + acCount;
    if (anchors < taskHeaders.length)
      return fail("INVALID_PLAN", `${taskHeaders.length} tasks but only ${anchors} 'Done when:' or 'Acceptance Criteria:' anchors`);
    // v7 kernel: a phase cannot reach `planned` without a machine contract.
    // checkMachineEvidence() at the `verified` gate only engages when
    // phase-N-contract.json exists; if a contract could be skipped here, the
    // entire evidence requirement is bypassable by omission and the prose
    // verifier (which can PASS on inaction) would govern. Requiring it here is
    // what makes "I built it" insufficient and "the contract ran clean" required.
    const contractFile = path.join(PLANNING, `phase-${phase}-contract.json`);
    if (!fs.existsSync(contractFile))
      return fail(
        "MISSING_CONTRACT",
        `Machine contract not found: ${contractFile}. /qualia-plan must compile the plan into a JSON contract before 'planned'. Regenerate with /qualia-plan, or build it via bin/plan-contract.js.`
      );
    try {
      const c = JSON.parse(fs.readFileSync(contractFile, "utf8"));
      if (!c || !Array.isArray(c.tasks) || c.tasks.length === 0)
        return fail("INVALID_CONTRACT", `${contractFile} has no tasks[]; not a valid phase contract.`);
    } catch (e) {
      return fail("INVALID_CONTRACT", `Could not parse ${contractFile}: ${e.message}`);
    }
  }

  if (target === "verified") {
    const vFile = path.join(PLANNING, `phase-${phase}-verification.md`);
    if (!fs.existsSync(vFile))
      return fail("MISSING_FILE", `Verification file not found: ${vFile}`);
    if (!opts.verification || !["pass", "fail"].includes(opts.verification))
      return fail("MISSING_ARG", "--verification must be 'pass' or 'fail'");
    if (opts.verification === "pass") {
      const vContent = fs.readFileSync(vFile, "utf8");
      if (/\bINSUFFICIENT EVIDENCE\b/.test(vContent)) {
        return fail("INSUFFICIENT_EVIDENCE", `${vFile} contains INSUFFICIENT EVIDENCE; PASS is not allowed`);
      }
      const evidenceCheck = checkMachineEvidence(phase);
      if (!evidenceCheck.ok) return evidenceCheck;
    }
  }

  if (target === "shipped") {
    if (!opts.deployed_url)
      return fail("MISSING_ARG", "--deployed-url is required for 'shipped'");
  }

  if (target === "handed_off") {
    // v7 lifecycle: the HANDOFF.md requirement is a BUILD-mode convention, not a
    // universal law. An "operate" project (a launched, repeatedly-shipping
    // product or retainer) has no single handoff moment, so it must not be
    // forced to produce one. opts.lifecycle is threaded from tracking by the
    // caller; absent/"build" keeps the original requirement.
    const lifecycle = opts.lifecycle || "build";
    if (lifecycle === "build") {
      const hFile = path.join(PLANNING, "HANDOFF.md");
      if (!fs.existsSync(hFile))
        return fail("MISSING_FILE", `Handoff file not found: ${hFile}`);
    }
  }

  // Gap-closure circuit breaker (configurable limit)
  if (target === "planned" && current.status === "verified") {
    const t = readTracking() || {};
    const cycles = (t.gap_cycles || {})[String(phase)] || 0;
    const limit = getGapCycleLimit();
    if (cycles >= limit) {
      return fail(
        "GAP_CYCLE_LIMIT",
        `Phase ${phase} has failed verification ${cycles} times (limit: ${limit}). Escalate to Fawzi or re-plan from scratch.`
      );
    }
  }

  return { ok: true };
}

function fail(error, message) {
  return { ok: false, error, message };
}

function checkMachineEvidence(phase) {
  const contractFile = path.join(PLANNING, `phase-${phase}-contract.json`);
  if (!fs.existsSync(contractFile)) return { ok: true };

  const evidenceFile = path.join(PLANNING, "evidence", `phase-${phase}-contract-run.json`);
  if (!fs.existsSync(evidenceFile)) {
    return fail(
      "MISSING_EVIDENCE",
      `Contract exists for phase ${phase}, but machine evidence is missing: ${evidenceFile}. Run contract-runner.js or qualia-framework eval --run --write.`
    );
  }
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
  } catch (e) {
    return fail("INVALID_EVIDENCE", `Could not parse ${evidenceFile}: ${e.message}`);
  }
  if (!evidence || evidence.ok !== true) {
    return fail("FAILING_EVIDENCE", `${evidenceFile} does not prove the contract passed`);
  }
  return { ok: true };
}

function recordLedgerEvent(meta) {
  try {
    return stateLedger.append(process.cwd(), {
      command: `state.js ${process.argv.slice(2).join(" ")}`.trim(),
      ...meta,
    });
  } catch (err) {
    try { _trace("state-ledger", "error", { action: meta && meta.action, error: err.message }); } catch {}
    return { ok: false, error: err.message };
  }
}

// ─── Next Command Logic ──────────────────────────────────
// `lifecycle` (default "build") changes the route once a project has launched.
// In "operate" the project is an UPDATE STREAM, not a milestone journey: there is
// no polish → ship → handoff terminal chain. After the last phase verifies, the
// next move is the next update (/qualia-update), and the project never gets
// dragged to a handoff it has outgrown. This is the v7 thesis in miniature —
// a behavior that was hard-coded in prose is now a branch on explicit state.
function nextCommand(status, phase, totalPhases, verification, lifecycle) {
  const operate = lifecycle === "operate";
  switch (status) {
    case "setup":
      return `/qualia-plan ${phase}`;
    case "planned":
      return `/qualia-build ${phase}`;
    case "built":
      return `/qualia-verify ${phase}`;
    case "verified":
      if (verification === "fail") return `/qualia-plan ${phase} --gaps`;
      if (phase < totalPhases) return `/qualia-plan ${phase + 1}`;
      return operate ? "/qualia-update" : "/qualia-polish";
    case "polished":
      return "/qualia-ship";
    case "shipped":
      // In build mode a shipped project hands off once. In operate it loops:
      // the deploy was just another update.
      return operate ? "/qualia-update" : "/qualia-handoff";
    case "handed_off":
      return "/qualia-report";
    case "done":
      return operate ? "/qualia-update" : "Done.";
    default:
      return `/qualia`;
  }
}

// ─── Commands ────────────────────────────────────────────

// ─── Seniority profile gate contract ────────────────────
// The effective profile resolves as: $QUALIA_PROFILE (env wins) → STATE.md
// Profile: line → tracking.json profile → 'strict' (default). Any value other
// than the exact string 'standard' coerces to 'strict' — the safe gate.
//
// Gate semantics (the contract; enforcement lives in the CONSUMING skill,
// qualia-scope — state.js only stores and surfaces the field, it does NOT
// enforce gates here or in cmdTransition):
//   strict   = hard gates, no waivers. The Definition-of-Done gate cannot be
//              exited until every area is covered and no [NEEDS CLARIFICATION]
//              markers remain.
//   standard = gates advisory. A senior may exit the gate early with a reason
//              logged as an ADR in .planning/decisions/.
function resolveProfile(s, t) {
  const raw =
    process.env.QUALIA_PROFILE ||
    (s && s.profile) ||
    (t && t.profile) ||
    "strict";
  return String(raw).toLowerCase() === "standard" ? "standard" : "strict";
}

function cmdCheck(opts) {
  // A5: migrated projects route through the concurrency-aware, read-only check.
  if (hasIncrementLayout()) return cmdCheckIncrement(opts);
  const t = readTracking();
  const s = parseStateMd(readState());
  // True NO_PROJECT only when BOTH the durable tracking AND the dashboard are
  // absent. Either alone is a recoverable half-state.
  if (!t && !s) {
    return output({
      ok: false,
      error: "NO_PROJECT",
      message: "No .planning/ found. Run /qualia-new to start.",
    });
  }
  // STATE.md missing/corrupt but tracking.json intact. STATE.md is a derivable
  // view — tracking.json already carries phase/status/milestone (the statusline
  // reads them straight from it). Reconstruct and route to repair instead of
  // falsely reporting NO_PROJECT. Critically, exit 0: cmdCheck feeds the
  // /qualia router, which runs it inside a PARALLEL Bash batch. A non-zero exit
  // makes the harness cancel the sibling commands ("Cancelled: parallel tool
  // call ... errored"), so a recoverable state must never exit non-zero.
  if (t && !s) {
    ensureLifetime(t);
    const phase = Number(t.phase || 1) || 1;
    return output({
      ok: true,
      phase,
      phase_name: t.phase_name || "",
      total_phases: Number(t.total_phases || 0) || 0,
      status: String(t.status || "setup"),
      assigned_to: t.assigned_to || "",
      profile: resolveProfile(null, t),
      milestone: t.milestone || 1,
      milestone_name: t.milestone_name || "",
      milestones: t.milestones || [],
      lifetime: t.lifetime,
      verification: t.verification || "pending",
      gap_cycles: (t.gap_cycles || {})[String(phase)] || 0,
      gap_cycle_limit: getGapCycleLimit(),
      tasks_done: t.tasks_done || 0,
      tasks_total: t.tasks_total || 0,
      deployed_url: t.deployed_url || "",
      next_command: "state.js fix",
      warning:
        "STATE.md missing or unparseable — reconstructed from tracking.json. " +
        "Run `state.js fix` to rewrite it canonically, then continue.",
      recovered_from: "tracking.json",
    });
  }
  // tracking.json missing but STATE.md present (the inverse half-state). The
  // rest of cmdCheck needs tracking for lifetime/milestone/verification, so
  // route to repair (`state.js fix` rebuilds tracking from STATE.md) rather
  // than crash on a null tracking object. Exit 0 for the same batch reason.
  if (!t && s) {
    return output({
      ok: true,
      phase: s.phase,
      phase_name: s.phase_name,
      total_phases: s.total_phases,
      status: s.status,
      assigned_to: s.assigned_to,
      profile: resolveProfile(s, null),
      milestone: 1,
      milestone_name: "",
      milestones: [],
      lifetime: undefined,
      verification: "pending",
      gap_cycles: 0,
      gap_cycle_limit: getGapCycleLimit(),
      tasks_done: 0,
      tasks_total: 0,
      deployed_url: "",
      next_command: "state.js fix",
      warning:
        "tracking.json missing — reconstructed from STATE.md. " +
        "Run `state.js fix` to rebuild tracking, then continue.",
      recovered_from: "STATE.md",
    });
  }
  ensureLifetime(t);
  output({
    ok: true,
    phase: s.phase,
    phase_name: s.phase_name,
    total_phases: s.total_phases,
    status: s.status,
    assigned_to: s.assigned_to,
    profile: resolveProfile(s, t),
    milestone: t.milestone || 1,
    milestone_name: t.milestone_name || "",
    milestones: t.milestones || [],
    lifetime: t.lifetime,
    verification: t.verification || "pending",
    gap_cycles: (t.gap_cycles || {})[String(s.phase)] || 0,
    gap_cycle_limit: getGapCycleLimit(),
    tasks_done: t.tasks_done || 0,
    tasks_total: t.tasks_total || 0,
    deployed_url: t.deployed_url || "",
    lifecycle: t.lifecycle || "build",
    launched_at: t.launched_at || "",
    next_command: nextCommand(
      s.status,
      s.phase,
      s.total_phases,
      t.verification,
      t.lifecycle
    ),
    schema_errors: s.schema_errors && s.schema_errors.length ? s.schema_errors : undefined,
  });
}

// ─── cmdTransition helpers ──────────────────────────────────────────────
// cmdTransition was a 195-line orchestrator that mixed validation, the
// note/activity short-circuit, per-status mutations, atomic write, and
// trace+output into one block. Split into focused helpers below; the
// orchestrator now reads top-to-bottom in ~50 lines. Behavior is
// preserved exactly — verified by the 59 state.test.sh assertions.

// Handles the note/activity short-circuit. Returns the success payload
// when the target is note/activity (caller should `return output(...)`),
// or null if not handled (caller proceeds with normal transition).
function applyNoteOrActivity(target, s, t, opts) {
  if (target !== "note" && target !== "activity") return null;
  if (opts.notes) t.notes = opts.notes;
  // Count tasks from quick/task work toward lifetime
  if (opts.tasks_done) {
    const count = parseInt(opts.tasks_done) || 0;
    if (count > 0) {
      ensureLifetime(t);
      t.lifetime.tasks_completed += count;
    }
  }
  // Scope tagging (anti-drift): /qualia-feature + /qualia-fix declare whether the
  // work served the active milestone (--scope in --ref CORE-03) or was off-road
  // (--scope off). Off-road work is COUNTED + ledgered so it can't drift
  // invisibly — the OWNER + ERP see the tally, mirroring branch-guard.
  const scope = String(opts.scope || "").toLowerCase();
  let offroadCount;
  if (scope === "in" || scope === "off") {
    ensureLifetime(t);
    if (typeof t.lifetime.offroad_count !== "number") t.lifetime.offroad_count = 0;
    if (scope === "off") {
      t.lifetime.offroad_count += 1;
      if (!Array.isArray(t.offroad)) t.offroad = [];
      t.offroad.push({
        at: new Date().toISOString(),
        milestone: parseInt(t.milestone, 10) || null,
        ref: opts.ref || null,
        note: opts.notes || null,
      });
      if (t.offroad.length > 50) t.offroad = t.offroad.slice(-50);
    }
    offroadCount = t.lifetime.offroad_count;
  }
  t.last_updated = new Date().toISOString();
  writeTracking(t);
  s.last_activity = opts.notes || "Activity logged";
  writeStateMd(s);
  return {
    ok: true,
    phase: s.phase,
    status: s.status,
    action: target,
    scope: scope || undefined,
    offroad_count: offroadCount,
  };
}

// Per-status mutations. Each helper mutates `s` and `t` in place (JS
// objects are by-reference) and returns nothing. They DO NOT write to
// disk — the orchestrator commits everything atomically at the end.

function applyPlannedTransition(s, t, prevStatus, phase) {
  // Gap closure: increment counter if coming from verified(fail).
  if (prevStatus === "verified") {
    if (!t.gap_cycles) t.gap_cycles = {};
    t.gap_cycles[String(phase)] = (t.gap_cycles[String(phase)] || 0) + 1;
    s.last_activity = `Gap closure #${t.gap_cycles[String(phase)]} planned (phase ${phase})`;
  }
  if (s.phases[phase - 1]) s.phases[phase - 1].status = "planned";
}

function applyBuiltTransition(s, t, opts, phase) {
  t.tasks_done = parseInt(opts.tasks_done) || 0;
  t.tasks_total = parseInt(opts.tasks_total) || 0;
  t.wave = parseInt(opts.wave) || 0;
  t.build_count = (parseInt(t.build_count) || 0) + 1;
  s.last_activity = `Phase ${phase} built (${t.tasks_done}/${t.tasks_total} tasks)`;
  if (s.phases[phase - 1]) s.phases[phase - 1].status = "built";
}

function applyVerifiedTransition(s, t, opts, phase) {
  t.verification = opts.verification;
  s.last_activity = `Phase ${phase} verified — ${opts.verification}`;
  if (s.phases[phase - 1]) {
    s.phases[phase - 1].status =
      opts.verification === "pass" ? "verified" : "failed";
  }

  if (opts.verification !== "pass") return;

  // Auto-advance on pass: accumulate into lifetime BEFORE resetting
  // current counters so the totals are correct.
  ensureLifetime(t);
  t.lifetime.tasks_completed += (t.tasks_done || 0);
  t.lifetime.phases_completed += 1;

  if (phase < s.total_phases) {
    s.phase = phase + 1;
    s.phase_name = s.phases[phase]?.name || `Phase ${phase + 1}`;
    s.status = "setup";
    t.phase = s.phase;
    t.phase_name = s.phase_name;
    t.status = "setup";
    t.verification = "pending";
    t.tasks_done = 0;
    t.tasks_total = 0;
    s.last_activity = `Phase ${phase} passed — advancing to phase ${s.phase}`;
  }
  // Reset gap counter for the passed phase.
  if (t.gap_cycles) t.gap_cycles[String(phase)] = 0;
}

function applyPolishedTransition(s) {
  // Polish is a whole-project pass. Mark every already-passed phase as
  // polished. (Previously only the last row was touched and was set to
  // "verified" — wrong status string, lost current-phase context.)
  for (const p of s.phases) {
    const st = (p.status || "").toLowerCase();
    if (st === "verified" || st === "polished" || st === "completed" || st === "complete") {
      p.status = "polished";
    }
  }
}

function applyShippedTransition(t, opts) {
  t.deployed_url = opts.deployed_url || "";
  t.deploy_count = (parseInt(t.deploy_count) || 0) + 1;
}

// Atomically commit the new state + tracking. Writes a journal snapshot
// of the pre-transition files first; if the process dies between the
// two real writes, the next invocation restores both from the journal.
// Each individual write is torn-write safe (tmp + rename); the journal
// closes the gap between the two writes.
//
// Returns null on success, or a `fail(...)` object on write error
// (caller should pass through to `output(...)`).
function commitTransitionAtomic(s, t) {
  const backupState = readState();
  const backupTracking = (() => {
    try { return fs.readFileSync(TRACKING_FILE, "utf8"); } catch { return null; }
  })();
  try {
    writeJournal(backupState, backupTracking);
    writeStateMd(s);
    writeTracking(t);
    clearJournal();
    return null;
  } catch (e) {
    // Revert whichever file is out of sync with pre-transition state.
    try { if (backupState) atomicWrite(STATE_FILE, backupState); } catch {}
    try { if (backupTracking) atomicWrite(TRACKING_FILE, backupTracking); } catch {}
    clearJournal();
    return fail("WRITE_ERROR", e.message);
  }
}

function cmdTransition(opts) {
  const target = opts.to;
  if (!target) return output(fail("MISSING_ARG", "--to is required"));

  // A5: migrated projects transition per-increment (one committed file).
  if (hasIncrementLayout()) return cmdTransitionIncrement(opts, target);

  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = parseTrackingRaw(beforeTrackingRaw);
  const s = parseStateMd(beforeStateRaw);
  if (!t || !s) {
    return output(fail("NO_PROJECT", "No .planning/ found. Run /qualia-new."));
  }

  // Refuse transitions if STATE.md has schema errors (severity=error)
  if (s.schema_errors && s.schema_errors.some((e) => e.severity === "error")) {
    return output(
      fail(
        "STATE_SCHEMA_ERROR",
        "STATE.md is malformed. Run `node state.js check` to see errors. Consider `state.js fix` to rewrite canonically."
      )
    );
  }

  // Note/activity short-circuit (no status change, no precondition check)
  const noteResult = applyNoteOrActivity(target, s, t, opts);
  if (noteResult) {
    const ledger = recordLedgerEvent({
      action: target,
      phase_before: s.phase,
      phase_after: s.phase,
      status_before: s.status,
      status_after: s.status,
      state_before: s,
      state_after: s,
      tracking_before: parseTrackingRaw(beforeTrackingRaw),
      tracking_after: t,
      state_raw_before: beforeStateRaw,
      state_raw_after: readState(),
      tracking_raw_before: beforeTrackingRaw,
      tracking_raw_after: readTrackingRaw(),
      evidence_refs: opts.evidence ? [opts.evidence] : [],
    });
    if (ledger.ok) {
      noteResult.ledger_event_id = ledger.event_id;
      noteResult.ledger_event_hash = ledger.event_hash;
    } else {
      noteResult.ledger_error = ledger.error;
    }
    return output(noteResult);
  }

  const phase = parseInt(opts.phase) || s.phase;

  // Precondition check (lifecycle threaded so the handoff gate can relax in operate)
  const check = checkPreconditions({ ...s, phase }, target, { ...opts, phase, lifecycle: t.lifecycle });
  if (!check.ok) {
    // --force bypasses status-ordering and plan-content errors. The use case
    // is retroactive bookkeeping: a phase was built without /qualia-plan and
    // the user is catching STATE.md up to reality. --force never bypasses
    // MISSING_FILE or MISSING_ARG — those would leave the state machine
    // pointing at nothing.
    const forceableErrors = ["PRECONDITION_FAILED", "GAP_CYCLE_LIMIT", "INVALID_PLAN"];
    if (opts.force && forceableErrors.includes(check.error)) {
      console.error(`WARNING: Forcing transition despite: ${check.message}`);
    } else {
      return output(check);
    }
  }

  const prevStatus = s.status;

  // Apply common transition fields
  s.status = target;
  s.last_activity = `${target} (phase ${phase})`;
  t.status = target;
  t.phase = phase;
  t.phase_name = s.phases[phase - 1]?.name || s.phase_name;
  t.last_updated = new Date().toISOString();

  // Per-status mutations
  if (target === "planned") applyPlannedTransition(s, t, prevStatus, phase);
  if (target === "built") applyBuiltTransition(s, t, opts, phase);
  if (target === "verified") applyVerifiedTransition(s, t, opts, phase);
  if (target === "polished") applyPolishedTransition(s);
  if (target === "shipped") applyShippedTransition(t, opts);

  // v7: in operate mode, a verified(pass) on the final phase completes one UPDATE.
  // This is the operate-mode analogue of closing a milestone in build mode.
  if (
    target === "verified" &&
    opts.verification === "pass" &&
    t.lifecycle === "operate" &&
    phase >= (parseInt(s.total_phases) || phase)
  ) {
    ensureLifetime(t);
    t.lifetime.updates_completed = (t.lifetime.updates_completed || 0) + 1;
  }

  // Atomic commit
  const writeError = commitTransitionAtomic(s, t);
  if (writeError) return output(writeError);

  const ledger = recordLedgerEvent({
    action: target,
    phase_before: phase,
    phase_after: s.phase,
    status_before: prevStatus,
    status_after: s.status,
    state_before: parseStateMd(beforeStateRaw),
    state_after: s,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
    evidence_refs: opts.evidence ? [opts.evidence] : [],
  });

  // Trace transition for analytics
  _trace("state-transition", "allow", {
    phase: s.phase,
    status: s.status,
    previous_status: prevStatus,
    verification: t.verification,
    gap_closure: prevStatus === "verified" && target === "planned",
  });

  const result = {
    ok: true,
    phase: s.phase,
    phase_name: s.phase_name,
    status: s.status,
    previous_status: prevStatus,
    verification: t.verification,
    gap_cycles: (t.gap_cycles || {})[String(s.phase)] || 0,
    lifecycle: t.lifecycle || "build",
    next_command: nextCommand(s.status, s.phase, s.total_phases, t.verification, t.lifecycle),
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

function cmdInit(opts) {
  if (!opts.project) return output(fail("MISSING_ARG", "--project required"));

  // v5.0: Throwaway-name guard. The insights report documents the user
  // accidentally creating a project literally named "test-name-only" instead
  // of the real client name. Names matching common scratch/test patterns get
  // a 1-line confirmation step (bypass with --force).
  if (!opts.force) {
    const SUSPICIOUS = /^(test|tmp|temp|foo|bar|baz|scratch|demo|sample|untitled|new[\W_-]?project|example)(\b|[\W_-])/i;
    if (SUSPICIOUS.test(opts.project)) {
      return output(
        fail(
          "SUSPICIOUS_NAME",
          `Project name '${opts.project}' looks temporary/test-like. If this is the real client project name, re-run with --force. Otherwise re-run with the actual project name.`
        )
      );
    }
  }

  // Refuse to clobber an active project unless --force.
  // Lifetime preservation runs lower in this fn — but current-phase fields
  // (phase, status, wave, tasks_done, tasks_total, gap_cycles) ARE wiped
  // on init, which is a footgun for an in-progress project.
  if (!opts.force && fs.existsSync(STATE_FILE)) {
    return output(
      fail(
        "ALREADY_INITIALIZED",
        "Project already initialized at .planning/STATE.md. Use --force to re-initialize (preserves lifetime, resets current phase)."
      )
    );
  }

  // Parse phases
  let phases = [];
  if (opts.phases) {
    try {
      phases = JSON.parse(opts.phases);
    } catch {
      return output(fail("INVALID_ARG", "--phases must be valid JSON array"));
    }
  }
  const totalPhases = parseInt(opts.total_phases) || phases.length || 1;

  // Ensure phases array has entries
  while (phases.length < totalPhases) {
    phases.push({
      name: `Phase ${phases.length + 1}`,
      goal: "TBD",
    });
  }

  // Create .planning/ if needed
  if (!fs.existsSync(PLANNING)) fs.mkdirSync(PLANNING, { recursive: true });

  const now = new Date().toISOString();
  const date = now.split("T")[0];

  // Read existing tracking for lifetime data preservation across milestone resets
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const prev = readTracking();
  const prevLife = prev ? ensureLifetime(prev) : null;

  // Seniority profile: explicit --profile standard opts in; otherwise preserve
  // the prior project's profile on re-init, defaulting to the safe 'strict'.
  // Any value other than the exact string 'standard' coerces to 'strict'.
  const profileSource = opts.profile || (prevLife ? prevLife.profile : "strict");
  const profile = profileSource === "standard" ? "standard" : "strict";

  // Build state
  const s = {
    phase: 1,
    total_phases: totalPhases,
    phase_name: phases[0].name,
    status: "setup",
    assigned_to: opts.assigned_to || "",
    profile,
    last_activity: `Project initialized`,
    phases: phases.map((p, i) => ({
      num: i + 1,
      name: p.name,
      goal: p.goal,
      status: i === 0 ? "ready" : "—",
    })),
    blockers: "None.",
    resume: "—",
  };

  // Defensive lifetime hydrate: even if `prevLife.lifetime` is partial (an
  // older tracking.json missing some keys), the spread would leave gaps that
  // later `+=` would NaN. Build with safe defaults, then overlay.
  const defaultLifetime = {
    tasks_completed: 0,
    phases_completed: 0,
    milestones_completed: 0,
    total_phases: 0,
    last_closed_milestone: 0,
    updates_completed: 0,
  };
  const lifetime = prevLife
    ? { ...defaultLifetime, ...(prevLife.lifetime || {}) }
    : { ...defaultLifetime };

  // Preserve milestones array across re-init (v4: milestone summaries for ERP tree).
  const prevMilestones = (prevLife && Array.isArray(prevLife.milestones)) ? prevLife.milestones : [];

  // Build tracking — current-phase fields reset, lifetime + identity preserved
  const t = {
    project: opts.project,
    client: opts.client || (prevLife ? prevLife.client : ""),
    type: opts.type || (prevLife ? prevLife.type : ""),
    assigned_to: opts.assigned_to || (prevLife ? prevLife.assigned_to : ""),
    team_id: opts.team_id || (prevLife ? prevLife.team_id || "" : ""),
    project_id: opts.project_id || (prevLife ? prevLife.project_id || "" : ""),
    erp_project_id: opts.erp_project_id || (prevLife ? prevLife.erp_project_id || "" : ""),
    client_id: opts.client_id || (prevLife ? prevLife.client_id || "" : ""),
    workspace_id: opts.workspace_id || (prevLife ? prevLife.workspace_id || "" : ""),
    git_remote: opts.git_remote || (prevLife ? prevLife.git_remote || "" : ""),
    milestone: prevLife ? prevLife.milestone : 1,
    milestone_name: opts.milestone_name || (prevLife ? prevLife.milestone_name || "" : ""),
    milestones: prevMilestones,
    phase: 1,
    phase_name: phases[0].name,
    total_phases: totalPhases,
    status: "setup",
    profile,
    // v7 lifecycle: a new project starts in "build" (milestone journey).
    // `launch` flips it to "operate" (update stream). Preserved across re-init.
    lifecycle: prevLife ? (prevLife.lifecycle || "build") : "build",
    launched_at: prevLife ? (prevLife.launched_at || "") : "",
    launch_source: prevLife ? (prevLife.launch_source || "") : "",
    wave: 0,
    tasks_done: 0,
    tasks_total: 0,
    verification: "pending",
    gap_cycles: {},
    blockers: [],
    session_started_at: now,
    last_updated: now,
    last_pushed_at: prevLife ? prevLife.last_pushed_at || "" : "",
    last_commit: prevLife ? prevLife.last_commit : "",
    build_count: prevLife ? (prevLife.build_count || 0) : 0,
    deploy_count: prevLife ? (prevLife.deploy_count || 0) : 0,
    deployed_url: prevLife ? prevLife.deployed_url : "",
    notes: "",
    submitted_by: opts.assigned_to || (prevLife ? prevLife.submitted_by || "" : ""),
    lifetime,
  };
  // lifetime.total_phases starts at 0 for new projects. It accumulates only via
  // close-milestone (which adds current total_phases before the next init).
  // The ERP computes grand total as: lifetime.total_phases + current total_phases.

  writeStateMd(s);
  writeTracking(t);

  const ledger = recordLedgerEvent({
    action: "init",
    phase_before: null,
    phase_after: 1,
    status_before: null,
    status_after: "setup",
    state_before: parseStateMd(beforeStateRaw),
    state_after: s,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
  });

  const result = {
    ok: true,
    action: "init",
    project: opts.project,
    phase: 1,
    total_phases: totalPhases,
    status: "setup",
    next_command: "/qualia-plan 1",
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

// v7: the one-time launch event. Flips the project from "build" (milestone
// journey) to "operate" (update stream). This is the discrete transition the
// ERP can drive when it detects a project is live (is_live / status:Launched),
// so "the product is launched" becomes explicit state instead of a milestone the
// team is forced to call "handoff". Idempotent: launching an operate project is
// a no-op. lifecycle is canonical in tracking.json; cmdCheck surfaces it.
function cmdLaunch(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = parseTrackingRaw(beforeTrackingRaw);
  if (!t) return output(fail("NO_PROJECT", "No .planning/ found. Run /qualia-new."));
  ensureLifetime(t);

  if (t.lifecycle === "operate") {
    return output({
      ok: true,
      action: "launch",
      already_launched: true,
      lifecycle: "operate",
      launched_at: t.launched_at || "",
      launch_source: t.launch_source || "",
      next_command: "/qualia-update",
      message: "Already launched (operate lifecycle). Nothing to do.",
    });
  }

  t.lifecycle = "operate";
  t.launched_at = new Date().toISOString();
  t.launch_source = opts.source === "erp" ? "erp" : "manual";
  if (opts.deployed_url) t.deployed_url = opts.deployed_url;
  t.last_updated = new Date().toISOString();
  writeTracking(t);

  const ledger = recordLedgerEvent({
    action: "launch",
    phase_before: t.phase || null,
    phase_after: t.phase || null,
    status_before: t.status || null,
    status_after: t.status || null,
    state_before: parseStateMd(beforeStateRaw),
    state_after: parseStateMd(readState()),
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
    evidence_refs: opts.deployed_url ? [opts.deployed_url] : [],
  });

  const result = {
    ok: true,
    action: "launch",
    lifecycle: "operate",
    launched_at: t.launched_at,
    launch_source: t.launch_source,
    deployed_url: t.deployed_url || "",
    next_command: "/qualia-update",
    message:
      "Launched. The project is now an UPDATE STREAM (operate): no forced polish → ship → handoff. Ship updates with the build/verify/ship loop; the forced handoff is gone.",
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

function cmdFix(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const raw = readState();
  const t = readTracking();
  if (!raw && !t) {
    return output(
      fail("NO_PROJECT", "No .planning/ found. Run /qualia-new.")
    );
  }
  const parsed = parseStateMd(raw) || {
    phase: 1,
    total_phases: 1,
    phase_name: "",
    status: "setup",
    assigned_to: "",
    phases: [],
    schema_errors: [
      { field: "content", message: "STATE.md missing or empty", severity: "error" },
    ],
  };
  const previousErrors = (parsed.schema_errors || []).length;

  // Prefer tracking.json values when parsed fields are defaulted/missing
  const tr = t || {};
  const totalPhases =
    parseInt(tr.total_phases) || parsed.total_phases || parsed.phases.length || 1;
  const phaseNum = parseInt(tr.phase) || parsed.phase || 1;
  const phaseName =
    (parsed.phase_name && parsed.phase_name.trim()) ||
    tr.phase_name ||
    `Phase ${phaseNum}`;
  const status = parsed.status || tr.status || "setup";
  const assignedTo = parsed.assigned_to || tr.assigned_to || "";

  // Build a phases array of the right length
  const phases = [];
  for (let i = 0; i < totalPhases; i++) {
    const existing = parsed.phases[i];
    phases.push({
      num: i + 1,
      name: existing?.name || `Phase ${i + 1}`,
      goal: existing?.goal || "TBD",
      status: existing?.status || (i === 0 ? "ready" : "—"),
    });
  }

  const s = {
    phase: phaseNum,
    total_phases: totalPhases,
    phase_name: phaseName,
    status,
    assigned_to: assignedTo,
    last_activity: "STATE.md repaired by state.js fix",
    phases,
    blockers: "None.",
    resume: "—",
  };

  try {
    writeStateMd(s);
  } catch (e) {
    return output(fail("WRITE_ERROR", e.message));
  }

  const ledger = recordLedgerEvent({
    action: "fix",
    phase_before: parsed.phase,
    phase_after: s.phase,
    status_before: parsed.status,
    status_after: s.status,
    state_before: parsed,
    state_after: s,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
  });

  const result = {
    ok: true,
    action: "fix",
    previous_errors: previousErrors,
    fixed: true,
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

// ─── A5: .planning/.gitignore ───────────────────────────
// The structural fix: the only files mutated every step (STATE.md, tracking.json,
// cursor) are LOCAL; only increment/release files are committed. This gitignore
// enforces that. Kept in sync with templates/planning.gitignore.
const PLANNING_GITIGNORE = [
  "# A5: per-step-mutated planning state is LOCAL (generated views), never committed.",
  "# Only increments/ and releases/ are the durable, committed source of truth —",
  "# so two people on two branches never conflict on the planning files.",
  "STATE.md",
  "tracking.json",
  ".cursor.json",
  ".state.lock",
  ".state.journal",
  ".backup/",
  "migration-manifest.json",
  "",
].join("\n");

function writePlanningGitignore() {
  atomicWrite(GITIGNORE_FILE, PLANNING_GITIGNORE);
}

// ─── A5: non-destructive migration ──────────────────────
// Converts a legacy single-file project (STATE.md + tracking.json) to the
// per-increment layout. Backs up both files first, writes a reversible
// manifest, is idempotent (re-run is a no-op once increments/ exists), and
// supports `migrate --revert` to restore byte-identical originals.
function cmdMigrate(opts) {
  if (opts.revert) return cmdMigrateRevert(opts);

  // Idempotent guard: already migrated → no-op.
  if (hasIncrementLayout()) {
    return output({ ok: true, action: "migrate", already_migrated: true, message: "increments/ already exists — nothing to do." });
  }

  const stateRaw = readState();
  const trackingRaw = readTrackingRaw();
  if (!stateRaw && !trackingRaw) {
    return output(fail("NO_PROJECT", "No .planning/ found. Nothing to migrate."));
  }

  const s = parseStateMd(stateRaw);
  const t = ensureLifetime(readTracking() || {});
  if (!s || !s.phases || !s.phases.length) {
    return output(fail("MIGRATE_NO_ROADMAP", "Could not parse a roadmap from STATE.md. Run `state.js fix` first, then migrate."));
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const created = [];
  let ids = [];

  try {
    // 1. Backup originals.
    if (!fs.existsSync(BACKUP_DIR)) { fs.mkdirSync(BACKUP_DIR, { recursive: true }); created.push(BACKUP_DIR); }
    const backupState = stateRaw != null ? path.join(BACKUP_DIR, `STATE.md.${stamp}`) : null;
    const backupTracking = trackingRaw != null ? path.join(BACKUP_DIR, `tracking.json.${stamp}`) : null;
    if (backupState) atomicWrite(backupState, stateRaw);
    if (backupTracking) atomicWrite(backupTracking, trackingRaw);

    // 2. One increment file per roadmap phase. The CURRENT phase carries the
    //    live status/verification from tracking; others use the roadmap row.
    const curPhase = Number(t.phase || s.phase) || s.phase;
    for (const p of s.phases) {
      const id = incrementId(p.num, p.name);
      const isCurrent = p.num === curPhase;
      const status = isCurrent
        ? mapRoadmapStatus(t.status || s.status || p.status)
        : mapRoadmapStatus(p.status);
      const inc = {
        id,
        release: "r1",
        num: p.num,
        title: p.name,
        goal: p.goal || "",
        archetype: t.type || "",
        status,
        claimed_by: "",
        branch: "",
        verification: isCurrent ? (t.verification || "pending") : "pending",
        gap_cycles: (t.gap_cycles || {})[String(p.num)] || 0,
        tasks_done: isCurrent ? (t.tasks_done || 0) : 0,
        tasks_total: isCurrent ? (t.tasks_total || 0) : 0,
        wave: isCurrent ? (t.wave || 0) : 0,
        build_count: isCurrent ? (t.build_count || 0) : 0,
        deploy_count: isCurrent ? (t.deploy_count || 0) : 0,
        deployed_url: isCurrent ? (t.deployed_url || "") : "",
        // Legacy increments carry a satisfied DoD line so the ship gate never
        // retroactively traps a phase that predates A5's DoD tracking.
        body: `# ${p.name}\n\nGoal: ${p.goal || "TBD"}\n\n## Acceptance Criteria\n- (migrated from legacy roadmap)\n\n## Definition of Done\n- [x] Legacy increment migrated from STATE.md roadmap (pre-A5 — DoD not retroactively tracked)\n`,
      };
      writeIncrement(inc);
      ids.push(id);
      created.push(incrementPath(id));
    }

    // 3. Wrap all increments in a single rolling release.
    const rel = { id: "r1", title: t.milestone_name || "Release 1", type: t.mode || "rolling", status: "active", increments: ids };
    writeRelease(rel);
    created.push(releasePath("r1"));

    // 4. Cursor points at the current phase's increment.
    const curId = ids[curPhase - 1] || ids[0];
    writeCursor({ current_increment: curId });
    created.push(CURSOR_FILE);

    // 5. gitignore the now-local views.
    writePlanningGitignore();
    created.push(GITIGNORE_FILE);

    // 6. Manifest (reversible).
    const manifest = {
      migrated_at: new Date().toISOString(),
      schema: "a5-increments-v1",
      backup: { state: backupState, tracking: backupTracking },
      created,
      increment_ids: ids,
      cursor: curId,
    };
    atomicWrite(MIGRATION_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

    // 7. Regenerate the local views (tracking index + STATE.md) from increments.
    regenerateViews();
  } catch (e) {
    return output(fail("MIGRATE_WRITE_ERROR", e.message));
  }

  recordLedgerEvent({ action: "migrate", phase_before: s.phase, phase_after: s.phase, status_before: s.status, status_after: s.status });

  output({
    ok: true,
    action: "migrate",
    increments: created.filter((c) => c.includes("increments")).length,
    increment_ids: ids,
    cursor: ids[(Number(t.phase || s.phase) || s.phase) - 1] || ids[0],
    note: "STATE.md + tracking.json are now gitignored generated views. If they were previously committed, run `git rm --cached .planning/STATE.md .planning/tracking.json` to stop tracking them. Revert anytime with `state.js migrate --revert`.",
    next_command: nextCommand(s.status, s.phase, s.total_phases, t.verification),
  });
}

function cmdMigrateRevert(opts) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MIGRATION_MANIFEST, "utf8"));
  } catch {
    return output(fail("NO_MANIFEST", "No migration-manifest.json found — nothing to revert."));
  }
  try {
    // Restore originals byte-identically.
    if (manifest.backup && manifest.backup.state && fs.existsSync(manifest.backup.state)) {
      atomicWrite(STATE_FILE, fs.readFileSync(manifest.backup.state, "utf8"));
    }
    if (manifest.backup && manifest.backup.tracking && fs.existsSync(manifest.backup.tracking)) {
      atomicWrite(TRACKING_FILE, fs.readFileSync(manifest.backup.tracking, "utf8"));
    }
    // Remove generated layout.
    for (const dir of [INCREMENTS_DIR, RELEASES_DIR]) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    for (const f of [CURSOR_FILE, GITIGNORE_FILE, MIGRATION_MANIFEST]) {
      try { fs.unlinkSync(f); } catch {}
    }
  } catch (e) {
    return output(fail("REVERT_ERROR", e.message));
  }
  output({ ok: true, action: "migrate-revert", restored: true, message: "Restored STATE.md + tracking.json from backup; removed increments/, releases/, cursor, gitignore, manifest." });
}

// ─── A5: claim an increment for exclusive work ──────────
// Writes claimed_by (this actor) + branch onto ONE increment file — committed
// on the feature branch. A second actor claiming a held increment is refused.
function cmdClaim(opts) {
  if (!hasIncrementLayout()) {
    return output(fail("NOT_MIGRATED", "No increments/ — run `state.js migrate` first."));
  }
  const id = opts.id || (readCursor().current_increment || "");
  if (!id) return output(fail("MISSING_ARG", "--id is required (or set the cursor)"));
  if (!isValidIncrementId(id)) return output(fail("INVALID_ID", `Invalid increment id '${id}' (must match inc-<slug>).`));
  const inc = readIncrement(id);
  if (!inc) return output(fail("UNKNOWN_INCREMENT", `No increment '${id}' under ${INCREMENTS_DIR}`));

  const me = actor();
  if (inc.claimed_by && inc.claimed_by !== me && !opts.force) {
    return output(fail("ALREADY_CLAIMED", `Increment '${id}' is held by '${inc.claimed_by}' (branch '${inc.branch}'). Use --force to steal.`));
  }

  inc.claimed_by = me;
  inc.branch = opts.branch || inc.branch || "";
  writeIncrement(inc);
  writeCursor({ current_increment: id });
  regenerateViews(`Claimed ${id} (${me})`);
  recordLedgerEvent({ action: "claim", phase_before: inc.num, phase_after: inc.num, status_before: inc.status, status_after: inc.status });
  output({ ok: true, action: "claim", id, claimed_by: me, branch: inc.branch, status: inc.status, next_command: nextCommand(inc.status, inc.num, listIncrements().length, inc.verification) });
}

// ─── A5: release (ship) an increment + clear its claim ──
// Sets the increment to shipped, records the deployed URL, runs the
// Definition-of-Done gate (profile-aware), and clears claimed_by so the file
// merges to main untouched by other actors.
function cmdRelease(opts) {
  if (!hasIncrementLayout()) {
    return output(fail("NOT_MIGRATED", "No increments/ — run `state.js migrate` first."));
  }
  const id = opts.id || (readCursor().current_increment || "");
  if (!id) return output(fail("MISSING_ARG", "--id is required (or set the cursor)"));
  if (!isValidIncrementId(id)) return output(fail("INVALID_ID", `Invalid increment id '${id}' (must match inc-<slug>).`));
  const inc = readIncrement(id);
  if (!inc) return output(fail("UNKNOWN_INCREMENT", `No increment '${id}' under ${INCREMENTS_DIR}`));
  if (!opts.deployed_url) return output(fail("MISSING_ARG", "--deployed-url is required for release"));

  // Definition-of-Done gate (profile-aware). strict: ANY open `- [ ]` line
  // blocks (no waivers). standard: open lines allowed only if each is WAIVED.
  // --force (OWNER override) bypasses either.
  const profile = resolveProfile(null, readTracking());
  const open = incrementOpenDoD(inc); // open AND unwaived
  const anyOpenLine = /(^|\n)\s*[-*]\s*\[\s\]/.test(inc.body || "");
  if (!opts.force) {
    if (profile === "strict" && anyOpenLine) {
      return output(fail("DOD_INCOMPLETE", `Definition of Done has unchecked items (strict profile, no waivers). Check or remove them before release, or use --force.`));
    }
    if (profile === "standard" && open.length) {
      return output(fail("DOD_INCOMPLETE", `Definition of Done has ${open.length} unchecked item(s) without a WAIVED: reason (standard profile). Waive with a reason or check them, or use --force.`));
    }
  }

  inc.status = "shipped";
  inc.deployed_url = opts.deployed_url;
  inc.deploy_count = (inc.deploy_count || 0) + 1;
  const wasClaimedBy = inc.claimed_by;
  inc.claimed_by = ""; // release the claim
  writeIncrement(inc);
  regenerateViews(`Released ${id} → shipped`);
  recordLedgerEvent({ action: "release", phase_before: inc.num, phase_after: inc.num, status_before: wasClaimedBy ? "claimed" : inc.status, status_after: "shipped" });
  _trace("state-release", "allow", { id, deployed_url: inc.deployed_url });
  output({ ok: true, action: "release", id, status: "shipped", deployed_url: inc.deployed_url, claim_cleared_from: wasClaimedBy || "", next_command: "/qualia-report" });
}

function cmdValidatePlan(opts) {
  const phase = parseInt(opts.phase) || 1;
  const planFile = path.join(PLANNING, `phase-${phase}-plan.md`);
  const contractFile = path.join(PLANNING, `phase-${phase}-contract.json`);

  if (!fs.existsSync(planFile)) {
    return output(fail("MISSING_FILE", `Plan file not found: ${planFile}`));
  }

  const content = fs.readFileSync(planFile, "utf8");
  const errors = [];

  // Check frontmatter exists
  if (!/^---\n/.test(content)) {
    errors.push("Missing frontmatter (---) at start of file");
  }

  // Check task count > 0
  const taskHeaders = content.match(/^## Task \d+/gm);
  if (!taskHeaders || taskHeaders.length === 0) {
    errors.push("No task headers found (expected '## Task N — title')");
  }

  // Check "Done when" OR "Acceptance Criteria" anchor exists for each task
  // (story-file format uses Acceptance Criteria; legacy format uses Done when)
  const taskCount = taskHeaders ? taskHeaders.length : 0;
  const doneWhenCount = (content.match(/\*\*Done when:\*\*/g) || []).length;
  const acCount = (content.match(/\*\*Acceptance Criteria:\*\*/g) || []).length;
  const anchors = doneWhenCount + acCount;
  if (anchors < taskCount) {
    errors.push(
      `${taskCount} tasks but only ${anchors} 'Done when:' or 'Acceptance Criteria:' anchors`
    );
  }

  // Check Success Criteria section exists
  if (!/## Success Criteria/m.test(content)) {
    errors.push("Missing '## Success Criteria' section");
  }

  // Check goal in frontmatter
  if (!/^goal:/m.test(content)) {
    errors.push("Missing 'goal:' in frontmatter");
  }

  // ─── Verification Contract Validation (non-blocking) ────
  const warnings = [];
  const VALID_CHECK_TYPES = ["file-exists", "grep-match", "command-exit", "behavioral"];
  let contractCount = 0;
  let contractStatus = "missing";
  let contractErrors = [];

  // JSON contracts are the new machine-readable trust layer. Keep missing
  // contracts as a warning by default for in-flight legacy projects; callers can
  // opt into the hard gate with --require-contract.
  try {
    const pc = require("./plan-contract.js");
    if (fs.existsSync(contractFile)) {
      const loaded = pc.readContractFile(contractFile);
      if (!loaded.ok) {
        contractStatus = "invalid";
        contractErrors = [loaded.message || loaded.error || "contract unreadable"];
      } else {
        contractErrors = pc.validate(loaded.contract);
        const drift = pc.checkDrift(contractFile, planFile);
        if (contractErrors.length > 0) {
          contractStatus = "invalid";
        } else if (drift.ok && drift.drift) {
          contractStatus = "drifted";
          contractErrors = [`source_plan_hash drift: stored ${drift.stored}, current ${drift.current}`];
        } else {
          contractStatus = "valid";
          contractCount = Array.isArray(loaded.contract.tasks) ? loaded.contract.tasks.length : 0;
        }
      }
    }
  } catch (e) {
    contractStatus = "unavailable";
    contractErrors = [e.message];
  }

  if (contractStatus === "missing") {
    const msg = `JSON contract missing: ${contractFile}`;
    if (opts.require_contract) errors.push(msg);
    else warnings.push(msg);
  } else if (contractStatus !== "valid") {
    const msg = `JSON contract ${contractStatus}: ${contractErrors.join("; ")}`;
    if (opts.require_contract) errors.push(msg);
    else warnings.push(msg);
  }

  if (/^## Verification Contract/m.test(content)) {
    // Extract the contract section (from header to next ## or end of file)
    const contractSectionMatch = content.match(
      /^## Verification Contract\s*\n([\s\S]+)/m
    );
    if (contractSectionMatch) {
      // Trim at the next ## heading that isn't ### (i.e., a new top-level section)
      let contractSection = contractSectionMatch[1];
      const nextH2 = contractSection.search(/\n## (?!#)/);
      if (nextH2 !== -1) contractSection = contractSection.substring(0, nextH2);
      // Each contract starts with ### Contract for Task N
      const contractBlocks = contractSection.match(/^### Contract for Task \d+/gm);
      const markdownContractCount = contractBlocks ? contractBlocks.length : 0;
      if (contractStatus !== "valid") contractCount = markdownContractCount;

      if (markdownContractCount === 0) {
        warnings.push("Verification Contract section exists but contains no contract blocks (expected '### Contract for Task N')");
      } else {
        // Split into individual contract blocks for validation
        const blockSplits = contractSection.split(/^(?=### Contract for Task \d+)/m).filter(Boolean);
        for (const block of blockSplits) {
          const taskNumMatch = block.match(/^### Contract for Task (\d+)/);
          if (!taskNumMatch) continue;
          const taskNum = taskNumMatch[1];

          const checkTypeMatch = block.match(/\*\*Check type:\*\*\s*(.+)/);
          const hasCommand = /\*\*Command:\*\*/.test(block);
          const hasExpected = /\*\*Expected:\*\*/.test(block);
          const hasFailIf = /\*\*Fail if:\*\*/.test(block);

          if (!checkTypeMatch) {
            warnings.push(`Contract for Task ${taskNum}: missing 'Check type'`);
          } else {
            const checkType = checkTypeMatch[1].trim().toLowerCase();
            if (!VALID_CHECK_TYPES.includes(checkType)) {
              warnings.push(
                `Contract for Task ${taskNum}: invalid check type '${checkType}' (valid: ${VALID_CHECK_TYPES.join(", ")})`
              );
            }
            // behavioral type doesn't require Command or Expected
            const isBehavioral = checkType === "behavioral";
            if (!isBehavioral && !hasCommand) {
              warnings.push(`Contract for Task ${taskNum}: missing 'Command' (required for ${checkType})`);
            }
            if (!isBehavioral && !hasExpected) {
              warnings.push(`Contract for Task ${taskNum}: missing 'Expected' (required for ${checkType})`);
            }
          }

          if (!hasFailIf) {
            warnings.push(`Contract for Task ${taskNum}: missing 'Fail if'`);
          }
        }
      }

      // Warn if contract count < task count
      if (taskCount > 0 && markdownContractCount > 0 && markdownContractCount < taskCount) {
        warnings.push(
          `Only ${markdownContractCount} Markdown contract(s) for ${taskCount} task(s) — not all tasks have verification contracts`
        );
      }
    }
  }

  if (errors.length > 0) {
    return output({
      ok: false,
      error: "PLAN_VALIDATION_FAILED",
      phase,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: `Plan file has ${errors.length} issue(s)`,
    });
  }

  output({
    ok: true,
    action: "validate-plan",
    phase,
    task_count: taskCount,
    done_when_count: doneWhenCount,
    ac_count: acCount,
    contract_count: contractCount,
    contract_file: contractFile,
    contract_status: contractStatus,
    contract_errors: contractErrors.length > 0 ? contractErrors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}

// ─── Close Milestone ─────────────────────────────────────
// Idempotent: a sentinel `lifetime.last_closed_milestone` records the most
// recently closed milestone so re-running close-milestone (e.g., after a
// hiccup) does NOT double-count. To re-close a milestone deliberately, pass
// --force.
// Report REQ-ID completion for a milestone (defaults to the current one). The
// same check close-milestone gates on — exposed so /qualia-milestone can show
// coverage before closing, and so it's directly testable. Exit 0 = all complete
// (or untracked), 1 = incomplete requirements remain.
function cmdReqsCheck(opts) {
  const t = readTracking();
  const milestone = opts.milestone != null ? parseInt(opts.milestone, 10) : (t ? parseInt(t.milestone, 10) || 1 : 1);
  const reqs = readMilestoneRequirements(milestone);
  const ok = !reqs.tracked || reqs.incomplete.length === 0;
  output({
    ok,
    action: "reqs-check",
    milestone,
    tracked: reqs.tracked,
    total: reqs.total,
    complete: reqs.total - reqs.incomplete.length,
    incomplete: reqs.incomplete,
  });
  process.exitCode = ok ? 0 : 1;
}

function cmdCloseMilestone(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = readTracking();
  const s = parseStateMd(readState());
  if (!t || !s) {
    return output(fail("NO_PROJECT", "No .planning/ found."));
  }
  ensureLifetime(t);
  const closeWarnings = [];

  // parseInt — legacy tracking.json files carry milestone as a string ("9"),
  // which would corrupt `closedMilestone + 1` ("91") and break num dedupe.
  const closedMilestone = parseInt(t.milestone, 10) || 1;
  if (
    !opts.force &&
    typeof t.lifetime.last_closed_milestone === "number" &&
    t.lifetime.last_closed_milestone >= closedMilestone
  ) {
    return output(
      fail(
        "ALREADY_CLOSED",
        `Milestone ${closedMilestone} was already closed (last_closed_milestone=${t.lifetime.last_closed_milestone}). Use --force to close again.`
      )
    );
  }

  // ─── v4 guard rails ─────────────────────────────────────
  // A milestone is only closable if it actually acted like one:
  //   (a) all its phases are verified/polished/completed, AND
  //   (b) it had ≥ 2 phases (so a 1-phase "milestone" is forced back to being a phase).
  // Both guards are bypassable with --force for retroactive bookkeeping.
  if (!opts.force) {
    const totalPhases = parseInt(t.total_phases) || s.phases.length || 0;
    if (totalPhases < 2) {
      return output(
        fail(
          "MILESTONE_TOO_SMALL",
          `Milestone ${closedMilestone} has only ${totalPhases} phase(s). A milestone needs ≥ 2 phases OR must be a shipped release gate. Use --force if this is intentional (e.g. a preview/demo milestone).`
        )
      );
    }
    const unfinished = s.phases.filter((p) => {
      const st = (p.status || "").toLowerCase();
      return !(st === "verified" || st === "polished" || st === "completed" || st === "complete");
    });
    if (unfinished.length > 0) {
      return output(
        fail(
          "MILESTONE_NOT_READY",
          `Milestone ${closedMilestone} has ${unfinished.length} unfinished phase(s): ${unfinished.map((p) => `${p.num}:${p.name}`).join(", ")}. Verify them first, or use --force.`
        )
      );
    }
    // REQ-ID coverage gate: a milestone isn't "done" just because its phases
    // verified — its agreed requirements must actually be Complete. Stops
    // "finishing a milestone with scope left open". strict blocks; standard warns.
    const reqs = readMilestoneRequirements(closedMilestone);
    if (reqs.tracked && reqs.incomplete.length > 0) {
      const profile = resolveProfile(s, t);
      const list = reqs.incomplete.map((r) => `${r.id}:${r.status || "Pending"}`).join(", ");
      if (profile === "strict") {
        return output(
          fail(
            "MILESTONE_REQS_INCOMPLETE",
            `Milestone ${closedMilestone} has ${reqs.incomplete.length}/${reqs.total} requirement(s) not Complete in REQUIREMENTS.md: ${list}. Finish or explicitly defer them (move to Out of Scope), or use --force.`
          )
        );
      }
      closeWarnings.push(`${reqs.incomplete.length}/${reqs.total} requirement(s) not Complete: ${list} (standard profile — proceeding; record why in the report).`);
    }
  }

  // ─── Append a summary to milestones[] so the ERP can render the tree ──
  // This is the minimal metadata needed to reconstruct "milestone N of the
  // project contained these phases" without replaying git history.
  const phasesCompleted = s.phases.filter((p) => {
    const st = (p.status || "").toLowerCase();
    return st === "verified" || st === "polished" || st === "completed" || st === "complete";
  }).length;
  // tasks_completed for THIS milestone = lifetime.tasks_completed minus the
  // sum of tasks already counted in prior milestones[] entries. This gives
  // the correct per-milestone count even though `t.tasks_done` only reflects
  // the current phase, not the cumulative milestone total.
  const priorMilestoneTasks = Array.isArray(t.milestones)
    ? t.milestones.reduce((sum, m) => sum + (parseInt(m && m.tasks_completed) || 0), 0)
    : 0;
  const tasksCompletedThisMilestone = Math.max(
    0,
    (parseInt(t.lifetime && t.lifetime.tasks_completed) || 0) - priorMilestoneTasks
  );
  // Resolve the REAL milestone name: non-placeholder tracking.json
  // milestone_name first, then the JOURNEY.md `## Milestone N · Name` header,
  // and only as a last resort the "Milestone N" placeholder.
  const milestoneName = resolveMilestoneName(closedMilestone, t.milestone_name);
  const summary = {
    num: closedMilestone,
    name: milestoneName,
    total_phases: parseInt(t.total_phases) || s.phases.length || 0,
    phases_completed: phasesCompleted,
    tasks_completed: tasksCompletedThisMilestone,
    shipped_url: t.deployed_url || "",
    closed_at: new Date().toISOString(),
  };
  t.milestones = Array.isArray(t.milestones) ? t.milestones : [];
  // Idempotency + dedupe: update in place when the same milestone number is
  // already logged (num may be a string in legacy entries), OR when the same
  // real name is already logged under a different num (renumbering drift —
  // observed as duplicate names in ERP session_reports.milestones).
  let existing = t.milestones.findIndex(
    (m) => m && parseInt(m.num, 10) === closedMilestone
  );
  if (existing < 0 && !isPlaceholderMilestoneName(milestoneName, closedMilestone)) {
    existing = t.milestones.findIndex(
      (m) => m && normalizeMilestoneName(m.name) === normalizeMilestoneName(milestoneName)
    );
  }
  if (existing >= 0) {
    t.milestones[existing] = summary;
  } else {
    t.milestones.push(summary);
  }

  t.lifetime.milestones_completed += 1;
  t.lifetime.total_phases += (parseInt(t.total_phases) || 0);
  t.lifetime.last_closed_milestone = closedMilestone;
  t.milestone = closedMilestone + 1;
  // Try to pre-populate next milestone's name from JOURNEY.md so the ERP
  // tree view doesn't show a blank between close-milestone and the next
  // state.js init --force (which happens in /qualia-milestone step 7).
  // If JOURNEY.md is missing or unparseable, fall through with blank —
  // /qualia-milestone will still set it via init --force.
  t.milestone_name = readNextMilestoneNameFromJourney(t.milestone);
  t.last_updated = new Date().toISOString();

  // v5.0 — journal-protected write. STATE.md is intentionally NOT mutated here
  // (the next /qualia-milestone step calls `state.js init --force` which fully
  // rewrites STATE.md for the new milestone). The journal still snapshots
  // tracking.json so a crash mid-write can be detected and recovered by the
  // next session via recoverFromJournal().
  const backupTracking = (() => {
    try { return fs.readFileSync(TRACKING_FILE, "utf8"); } catch { return null; }
  })();
  try {
    writeJournal(null, backupTracking);
    writeTracking(t);
    clearJournal();
  } catch (e) {
    // Restore tracking.json from backup if write failed mid-way.
    try { if (backupTracking) atomicWrite(TRACKING_FILE, backupTracking); } catch {}
    clearJournal();
    return output(fail("WRITE_ERROR", `close-milestone write failed: ${e.message}. tracking.json restored from backup.`));
  }

  _trace("close-milestone", "allow", {
    closed_milestone: closedMilestone,
    next_milestone: t.milestone,
    lifetime: t.lifetime,
  });

  const ledger = recordLedgerEvent({
    action: "close-milestone",
    phase_before: s.phase,
    phase_after: s.phase,
    status_before: s.status,
    status_after: s.status,
    state_before: s,
    state_after: s,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
  });

  const result = {
    ok: true,
    action: "close-milestone",
    closed_milestone: closedMilestone,
    next_milestone: t.milestone,
    lifetime: t.lifetime,
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  if (closeWarnings.length) result.warnings = closeWarnings;
  output(result);
}

// ─── Backfill Lifetime ───────────────────────────────────
// Reconstructs lifetime counters from STATE.md roadmap + plan files.
// Safe to run multiple times (idempotent — recalculates from source).
function cmdBackfillLifetime(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = readTracking();
  const s = parseStateMd(readState());
  if (!t || !s) {
    return output(fail("NO_PROJECT", "No .planning/ found."));
  }
  ensureLifetime(t);

  let phasesCompleted = 0;
  let tasksCompleted = 0;

  // Count completed phases from roadmap table
  for (const p of s.phases) {
    const st = (p.status || "").toLowerCase();
    if (st === "verified" || st === "completed" || st === "complete") {
      phasesCompleted++;

      // Count tasks from that phase's plan file
      const planFile = path.join(PLANNING, `phase-${p.num}-plan.md`);
      const gapsPlanFile = path.join(PLANNING, `phase-${p.num}-gaps-plan.md`);
      for (const f of [planFile, gapsPlanFile]) {
        try {
          if (fs.existsSync(f)) {
            const content = fs.readFileSync(f, "utf8");
            const taskHeaders = content.match(/^## Task \d+/gm);
            if (taskHeaders) tasksCompleted += taskHeaders.length;
          }
        } catch {}
      }
    }
  }

  // Also count the current phase if it's past built (tasks exist but phase not yet verified)
  const currentStatus = (t.status || "").toLowerCase();
  if (currentStatus === "built" || currentStatus === "verified") {
    // Current phase tasks are already in t.tasks_done — add if not already counted
    const currentPhaseAlreadyCounted = s.phases.some(
      (p) => p.num === t.phase && ["verified", "completed", "complete"].includes((p.status || "").toLowerCase())
    );
    if (!currentPhaseAlreadyCounted && t.tasks_done > 0) {
      tasksCompleted += t.tasks_done;
    }
  }

  const previous = { ...t.lifetime };

  // Use Math.max — backfill must NEVER reduce lifetime counters. If the user
  // ran close-milestone previously (rolling phases into lifetime) and then
  // calls backfill, the recomputed value reflects only the current milestone
  // and would otherwise destroy the historical accumulation.
  t.lifetime.phases_completed = Math.max(t.lifetime.phases_completed || 0, phasesCompleted);
  t.lifetime.tasks_completed = Math.max(t.lifetime.tasks_completed || 0, tasksCompleted);
  // total_phases is accumulated by close-milestone only — backfill leaves it.
  t.last_updated = new Date().toISOString();

  writeTracking(t);

  _trace("backfill-lifetime", "allow", {
    previous,
    computed: t.lifetime,
    phases_scanned: s.phases.length,
  });

  const ledger = recordLedgerEvent({
    action: "backfill-lifetime",
    phase_before: s.phase,
    phase_after: s.phase,
    status_before: s.status,
    status_after: s.status,
    state_before: s,
    state_after: s,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
  });

  const result = {
    ok: true,
    action: "backfill-lifetime",
    previous,
    computed: t.lifetime,
    phases_scanned: s.phases.length,
    phases_completed: phasesCompleted,
    tasks_completed: tasksCompleted,
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

// ─── Backfill Milestones from JOURNEY.md ─────────────────
// Reconstructs the milestones[] array + lifetime counters from the
// "Milestone arc" table in .planning/JOURNEY.md. Required when a project
// pre-dates v4 milestone bookkeeping (or had its tracking.json reset)
// but JOURNEY.md captures the historical arc. Idempotent — only adds
// missing milestones or overwrites entries flagged backfilled:true.
//
// JOURNEY.md table format expected:
//   | # | Milestone | Status | Phases | Closed |
//   | 1 | Name      | CLOSED | 1–13   | YYYY-MM-DD |
//   | 5 | Name      | OPEN   | rolling| —      |
//
// Phase counting handles ranges (`1–13` → 13), comma lists (`14, 15, 16.1–16.6` → 8),
// and "rolling" / "—" / "-" → 0.
function cmdBackfillMilestones(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = readTracking();
  if (!t) return output(fail("NO_PROJECT", "No .planning/ found."));
  ensureLifetime(t);

  const journeyPath = path.join(PLANNING, "JOURNEY.md");
  if (!fs.existsSync(journeyPath)) {
    return output(fail("NO_JOURNEY", "JOURNEY.md not found. Cannot backfill without milestone history source."));
  }

  const content = fs.readFileSync(journeyPath, "utf8");

  // Parse the milestone arc table. Each row must have 5 columns:
  // num | name | status | phases | closed
  const rows = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(
      /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(CLOSED|OPEN|CURRENT)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/i
    );
    if (m) {
      rows.push({
        num: parseInt(m[1], 10),
        name: m[2].trim(),
        status: m[3].trim().toUpperCase(),
        phasesStr: m[4].trim(),
        closedStr: m[5].trim(),
      });
    }
  }

  if (rows.length === 0) {
    return output(
      fail(
        "NO_MILESTONE_TABLE",
        "No milestone arc table found in JOURNEY.md. Expected `| # | Milestone | Status | Phases | Closed |` header followed by rows."
      )
    );
  }

  // Count phases from a phasesStr.
  // "1–13" → 13. "14, 15, 16.1–16.6" → 8. "19–25" → 7. "rolling" / "—" / "-" → 0.
  const countPhases = (s) => {
    if (!s) return 0;
    const lower = s.toLowerCase();
    if (lower === "—" || lower === "-" || lower === "rolling" || lower === "n/a") return 0;
    let count = 0;
    for (const seg of s.split(",")) {
      const trimmed = seg.trim();
      if (!trimmed || trimmed === "—" || trimmed === "-") continue;
      // Match X–Y or X-Y where X/Y can be "13" or "16.6"
      const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)$/);
      if (range) {
        const startStr = range[1];
        const endStr = range[2];
        // Sub-phase range like "16.1–16.6" → count by sub-index difference + 1
        if (startStr.includes(".") && endStr.includes(".")) {
          const startSub = parseInt(startStr.split(".")[1], 10);
          const endSub = parseInt(endStr.split(".")[1], 10);
          count += Math.max(0, endSub - startSub + 1);
        } else {
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          count += Math.max(0, end - start + 1);
        }
      } else {
        // Single phase like "14" or "17.1"
        count += 1;
      }
    }
    return count;
  };

  const closed = rows.filter((r) => r.status === "CLOSED").sort((a, b) => a.num - b.num);
  const openRow = rows.find((r) => r.status === "OPEN" || r.status === "CURRENT");

  t.milestones = Array.isArray(t.milestones) ? t.milestones : [];
  let added = 0;
  let updated = 0;
  let totalClosedPhases = 0;
  const closedSummaries = [];

  for (const row of closed) {
    const phaseCount = countPhases(row.phasesStr);
    totalClosedPhases += phaseCount;

    const dateMatch = row.closedStr.match(/\d{4}-\d{2}-\d{2}/);
    const closedAt = dateMatch ? `${dateMatch[0]}T00:00:00.000Z` : "";

    const summary = {
      num: row.num,
      name: row.name,
      total_phases: phaseCount,
      phases_completed: phaseCount,
      tasks_completed: 0, // unknown for historical backfill
      shipped_url: "",
      closed_at: closedAt,
      backfilled: true,
    };
    closedSummaries.push({ num: row.num, name: row.name, phases: phaseCount });

    // Match by num first (parseInt — legacy entries store num as a string),
    // then by normalized real name under a different num (renumbering drift).
    let existing = t.milestones.findIndex(
      (mm) => mm && parseInt(mm.num, 10) === row.num
    );
    if (existing < 0 && !isPlaceholderMilestoneName(row.name, row.num)) {
      existing = t.milestones.findIndex(
        (mm) => mm && normalizeMilestoneName(mm.name) === normalizeMilestoneName(row.name)
      );
    }
    if (existing >= 0) {
      // Don't override entries that came from real /qualia-milestone close
      // (they have richer data). Only overwrite previously-backfilled entries.
      if (t.milestones[existing].backfilled) {
        t.milestones[existing] = summary;
        updated++;
      } else if (
        isPlaceholderMilestoneName(
          t.milestones[existing].name,
          parseInt(t.milestones[existing].num, 10)
        ) ||
        parseInt(t.milestones[existing].num, 10) !== row.num
      ) {
        // Real close entry but with a placeholder name ("Milestone 9") or a
        // stale num — repair the identity fields in place, keep the richer
        // close data (tasks_completed, shipped_url, closed_at).
        t.milestones[existing].num = row.num;
        t.milestones[existing].name = row.name;
        updated++;
      }
    } else {
      t.milestones.push(summary);
      added++;
    }
  }

  // Stable order by milestone number.
  t.milestones.sort((a, b) => (a.num || 0) - (b.num || 0));

  const lastClosed = closed.length > 0 ? closed[closed.length - 1].num : 0;

  // Math.max — never reduce lifetime counters. Preserves real /qualia-milestone
  // history if a project was partly closed properly and partly backfilled.
  t.lifetime.milestones_completed = Math.max(
    t.lifetime.milestones_completed || 0,
    closed.length
  );
  t.lifetime.last_closed_milestone = Math.max(
    t.lifetime.last_closed_milestone || 0,
    lastClosed
  );
  t.lifetime.total_phases = Math.max(
    t.lifetime.total_phases || 0,
    totalClosedPhases
  );

  // Set current milestone — prefer the OPEN row; otherwise next-after-last-closed.
  if (openRow) {
    t.milestone = openRow.num;
    t.milestone_name = openRow.name;
  } else if (lastClosed > 0) {
    t.milestone = lastClosed + 1;
    t.milestone_name = readNextMilestoneNameFromJourney(t.milestone);
  }

  t.last_updated = new Date().toISOString();
  writeTracking(t);

  _trace("backfill-milestones", "allow", {
    added,
    updated,
    closed_count: closed.length,
    total_phases: totalClosedPhases,
    lifetime: t.lifetime,
  });

  const afterState = parseStateMd(readState());
  const ledger = recordLedgerEvent({
    action: "backfill-milestones",
    phase_before: afterState ? afterState.phase : undefined,
    phase_after: afterState ? afterState.phase : undefined,
    status_before: afterState ? afterState.status : undefined,
    status_after: afterState ? afterState.status : undefined,
    state_before: parseStateMd(beforeStateRaw),
    state_after: afterState,
    tracking_before: parseTrackingRaw(beforeTrackingRaw),
    tracking_after: t,
    state_raw_before: beforeStateRaw,
    state_raw_after: readState(),
    tracking_raw_before: beforeTrackingRaw,
    tracking_raw_after: readTrackingRaw(),
  });

  const result = {
    ok: true,
    action: "backfill-milestones",
    added,
    updated,
    closed: closedSummaries,
    open_milestone: openRow ? { num: openRow.num, name: openRow.name } : null,
    lifetime: t.lifetime,
  };
  if (ledger.ok) {
    result.ledger_event_id = ledger.event_id;
    result.ledger_event_hash = ledger.event_hash;
  } else {
    result.ledger_error = ledger.error;
  }
  output(result);
}

// ─── Next Report ID ──────────────────────────────────────
// Increments report_seq and returns the next QS-REPORT-NN id. Per-project
// counter (lives in tracking.json). /qualia-report calls this to tag each
// session report with a stable, human-readable client ID before POSTing
// to the ERP. If --peek is passed, the next id is returned WITHOUT
// incrementing — useful for --dry-run previews.
function cmdNextReportId(opts) {
  const beforeStateRaw = readState();
  const beforeTrackingRaw = readTrackingRaw();
  const t = readTracking();
  if (!t) return output(fail("NO_PROJECT", "No .planning/ found."));
  ensureLifetime(t);
  const peek = !!opts.peek;
  const next = (parseInt(t.report_seq) || 0) + 1;
  const id = `QS-REPORT-${String(next).padStart(2, "0")}`;
  if (!peek) {
    t.report_seq = next;
    t.last_updated = new Date().toISOString();
    writeTracking(t);
  }
  const result = { ok: true, action: "next-report-id", report_id: id, report_seq: next, peeked: peek };
  if (!peek) {
    const afterState = parseStateMd(readState());
    const beforeState = parseStateMd(beforeStateRaw);
    const ledger = recordLedgerEvent({
      action: "next-report-id",
      phase_before: beforeState ? beforeState.phase : undefined,
      phase_after: afterState ? afterState.phase : undefined,
      status_before: beforeState ? beforeState.status : undefined,
      status_after: afterState ? afterState.status : undefined,
      state_before: beforeState,
      state_after: afterState,
      tracking_before: parseTrackingRaw(beforeTrackingRaw),
      tracking_after: t,
      state_raw_before: beforeStateRaw,
      state_raw_after: readState(),
      tracking_raw_before: beforeTrackingRaw,
      tracking_raw_after: readTrackingRaw(),
    });
    if (ledger.ok) {
      result.ledger_event_id = ledger.event_id;
      result.ledger_event_hash = ledger.event_hash;
    } else {
      result.ledger_error = ledger.error;
    }
  }
  output(result);
}

// ─── Output ──────────────────────────────────────────────
function output(obj) {
  console.log(JSON.stringify(obj, null, 2));
  if (!obj.ok) process.exit(1);
}

// ─── Main ────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);

// Mutators must hold the .planning/.state.lock for the duration of their
// dual STATE.md + tracking.json writes. Read commands (check, validate-plan)
// don't need the lock. A lock timeout is a hard failure for mutators; racing
// state writes are worse than asking the user to retry.
const READ_ONLY = new Set(["check", "validate-plan"]);
let __lock = null;
if (!READ_ONLY.has(cmd)) {
  // Before acquiring the lock, recover from any journal left by a crashed
  // previous mutator. Runs for mutators only; read commands should still
  // return the actual on-disk state even if it's mid-recovery.
  try { recoverFromJournal(); } catch {}
  try {
    __lock = acquireLock();
  } catch (err) {
    output(fail(err.code || "STATE_LOCK_ERROR", err.message));
  }
  process.on("exit", () => releaseLock(__lock));
  process.on("SIGINT", () => { releaseLock(__lock); process.exit(130); });
  process.on("SIGTERM", () => { releaseLock(__lock); process.exit(143); });
}

try {
  switch (cmd) {
    case "check":
      cmdCheck(opts);
      break;
    case "transition":
      cmdTransition(opts);
      break;
    case "launch":
      cmdLaunch(opts);
      break;
    case "init":
      cmdInit(opts);
      break;
    case "fix":
      cmdFix(opts);
      break;
    case "validate-plan":
      cmdValidatePlan(opts);
      break;
    case "close-milestone":
      cmdCloseMilestone(opts);
      break;
    case "reqs-check":
      cmdReqsCheck(opts);
      break;
    case "backfill-lifetime":
      cmdBackfillLifetime(opts);
      break;
    case "backfill-milestones":
      cmdBackfillMilestones(opts);
      break;
    case "next-report-id":
      cmdNextReportId(opts);
      break;
    case "migrate":
      cmdMigrate(opts);
      break;
    case "claim":
      cmdClaim(opts);
      break;
    case "release":
      cmdRelease(opts);
      break;
    default:
      output(
        fail(
          "UNKNOWN_COMMAND",
          `Usage: state.js <check|transition|init|fix|validate-plan|close-milestone|backfill-lifetime|backfill-milestones|next-report-id|migrate|claim|release> [--options]`
        )
      );
  }
} finally {
  releaseLock(__lock);
}
