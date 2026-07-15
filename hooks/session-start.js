#!/usr/bin/env node
// ~/.claude/hooks/session-start.js — branded context panel on session start.
// Cross-platform (Windows/macOS/Linux). Zero shell dependencies.
//
// CRITICAL: this hook must NEVER exit non-zero. Claude Code treats any non-zero
// exit from a SessionStart hook as a "hook error" and shows a red banner. The
// banner is purely informational — we'd rather render nothing than block a
// session. Every call is wrapped in try/catch and we always exit 0 at the end.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const _traceStart = Date.now();

// ANSI colors used by the no-project welcome panel. Defined here because this
// file does not import qualia-ui (the hook must run even on a broken install).
const TEAL = "\x1b[38;2;0;206;209m";
const DIM = "\x1b[38;2;80;90;100m";
const RESET = "\x1b[0m";

const HOME = os.homedir();
function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  if (fs.existsSync(path.join(path.dirname(__dirname), "bin", "qualia-ui.js"))) {
    return path.dirname(__dirname);
  }
  return path.join(HOME, ".claude");
}

const QUALIA_HOME = qualiaHome();
const UI = path.join(QUALIA_HOME, "bin", "qualia-ui.js");
const STATE_FILE = path.join(".planning", "STATE.md");
const CONTINUE_HERE = ".continue-here.md";
const NOTIF_FILE = path.join(QUALIA_HOME, ".qualia-update-available.json");
const HEALTH_FILE = path.join(QUALIA_HOME, ".qualia-install-health.json");
const ERP_RETRY = path.join(QUALIA_HOME, "bin", "erp-retry.js");
const ERP_QUEUE = path.join(QUALIA_HOME, ".erp-retry-queue.json");
const WORK_PACKET_BIN = path.join(QUALIA_HOME, "bin", "work-packet.js");

// Critical files referenced by skills via @-import. If any are missing, skills
// silently get empty context and produce ungrounded output. We spot-check these
// on session-start and write a cached result (1-per-day) to HEALTH_FILE so we
// don't stat on every session.
const CRITICAL_FILES = [
  path.join(QUALIA_HOME, "rules", "grounding.md"),
  path.join(QUALIA_HOME, "rules", "security.md"),
  path.join(QUALIA_HOME, "rules", "deployment.md"),
  path.join(QUALIA_HOME, "qualia-design", "frontend.md"),
  path.join(QUALIA_HOME, "bin", "state.js"),
];

function checkInstallHealth() {
  // Returns null if healthy, or an array of missing files if damaged.
  // Caches result in HEALTH_FILE for 24h to avoid repeated stat overhead.
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      const cached = JSON.parse(fs.readFileSync(HEALTH_FILE, "utf8"));
      const age = Date.now() - (cached.checked_at || 0);
      if (age < 24 * 60 * 60 * 1000) {
        return cached.missing && cached.missing.length ? cached.missing : null;
      }
    }
  } catch {}
  const missing = CRITICAL_FILES.filter((f) => !fs.existsSync(f));
  try {
    fs.writeFileSync(
      HEALTH_FILE,
      JSON.stringify({ checked_at: Date.now(), missing }, null, 2),
    );
  } catch {}
  return missing.length ? missing : null;
}

function runUi(...args) {
  if (!fs.existsSync(UI)) return;
  try {
    spawnSync(process.execPath, [UI, ...args], {
      stdio: "inherit",
      timeout: 3000,
    });
  } catch {}
}

function getNextCommand() {
  const stateJs = path.join(QUALIA_HOME, "bin", "state.js");
  if (!fs.existsSync(stateJs)) return "";
  try {
    const r = spawnSync(process.execPath, [stateJs, "check"], {
      encoding: "utf8",
      timeout: 3000,
    });
    if (!r.stdout) return "";
    const j = JSON.parse(r.stdout);
    return j.next_command || "";
  } catch {
    return "";
  }
}

function readWorkPacket() {
  try {
    if (!fs.existsSync(WORK_PACKET_BIN)) return null;
    const mod = require(WORK_PACKET_BIN);
    if (!mod || typeof mod.readLocalWorkPacket !== "function") return null;
    return mod.readLocalWorkPacket(process.cwd());
  } catch {
    return null;
  }
}

function renderWorkPacketContext() {
  const packet = readWorkPacket();
  if (!packet) return;
  const project = packet.project && packet.project.name ? packet.project.name : "ERP mission";
  const deadline = packet.deadline_date || "no deadline";
  const next = packet.next_command || "/qualia";
  const employee = packet.employee && packet.employee.name ? ` · ${packet.employee.name}` : "";
  const text = `${project}: due ${deadline} · next ${next}${employee}`;
  if (fs.existsSync(UI)) runUi("info", text);
  else console.log(`QUALIA: ${text}`);
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(QUALIA_HOME, ".qualia-config.json"), "utf8"));
  } catch {
    return {};
  }
}

function fallbackText() {
  // If qualia-ui.js is missing, emit plain text. Keeps the session informative
  // even on a broken install.
  if (fs.existsSync(STATE_FILE)) {
    try {
      const content = fs.readFileSync(STATE_FILE, "utf8");
      const phase = (content.match(/^Phase:\s*(.+)$/m) || [])[1] || "—";
      const status = (content.match(/^Status:\s*(.+)$/m) || [])[1] || "—";
      console.log(`QUALIA: Project loaded. Phase: ${phase.trim()} | Status: ${status.trim()}`);
      console.log("QUALIA: Run /qualia for next step.");
    } catch {
      console.log("QUALIA: Project detected but STATE.md could not be read.");
    }
  } else if (fs.existsSync(CONTINUE_HERE)) {
    console.log("QUALIA: Handoff file found. Read .continue-here.md to resume.");
  } else {
    console.log("QUALIA: No project detected. Run /qualia-new to start.");
  }
}

function maybeDrainErpQueue() {
  // Fire-and-forget drain of any reports stranded from a prior /qualia-report
  // upload failure. Cheap fast-path: only spawn if the queue file exists and
  // erp-retry.js is installed. Quiet mode + small max so we never block the
  // session-start critical path. The script itself exits 0 even on internal
  // errors — see erp-retry.js's CLI tail.
  try {
    if (!fs.existsSync(ERP_QUEUE) || !fs.existsSync(ERP_RETRY)) return;
    spawnSync(process.execPath, [ERP_RETRY, "drain", "--quiet", "--max=5", "--timeout=2500"], {
      stdio: "ignore",
      timeout: 8000,
    });
  } catch {}
}

function cmpVersions(a, b) {
  // Returns >0 if a>b, <0 if a<b, 0 if equal. Tolerates missing/non-numeric
  // segments by treating them as 0. Pure semver-major.minor.patch compare.
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function maybeRenderUpdateBanner() {
  // EMPLOYEE-only sticky banner. auto-update.js writes NOTIF_FILE when a new
  // version is detected; we render it every session until the user actually
  // runs `npx qualia-framework@latest install`. auto-update.js clears the file
  // when it next runs and finds the version caught up — but it is throttled, so
  // between an install and that next run the notif can be stale. We therefore
  // self-validate here against the installed version (.qualia-config.json) and
  // clear+skip a stale notice rather than show a false "update available".
  if (!fs.existsSync(NOTIF_FILE) || !fs.existsSync(UI)) return;
  try {
    const notif = JSON.parse(fs.readFileSync(NOTIF_FILE, "utf8"));
    if (!notif || !notif.current || !notif.latest) return;
    const installed = readConfig().version;
    if (installed && cmpVersions(installed, notif.latest) >= 0) {
      // Already at or past the advertised latest — the notice is stale.
      try { fs.unlinkSync(NOTIF_FILE); } catch {}
      return;
    }
    runUi("update", notif.current, notif.latest);
  } catch {}
}

function renderHealthWarning(missing) {
  // Loud, non-blocking warning when critical install files are missing.
  // Tells the user exactly what to run — never silent.
  const label = missing.map((f) => path.basename(f)).join(", ");
  if (fs.existsSync(UI)) {
    runUi("warn", `Install incomplete — missing: ${label}`);
    runUi("info", "Run: npx qualia-framework@latest install");
  } else {
    console.log(`QUALIA: Install incomplete — missing ${label}`);
    console.log(`QUALIA: Run: npx qualia-framework@latest install`);
  }
}

try {
  maybeRenderUpdateBanner();
  maybeDrainErpQueue();

  const healthMissing = checkInstallHealth();
  if (healthMissing) renderHealthWarning(healthMissing);

  if (!fs.existsSync(UI)) {
    fallbackText();
  } else if (fs.existsSync(STATE_FILE)) {
    runUi("banner", "router");
    renderWorkPacketContext();
    const next = getNextCommand();
    if (next) {
      console.log("");
      runUi("next", next);
    }
  } else if (fs.existsSync(CONTINUE_HERE)) {
    runUi("banner", "resume");
    runUi("warn", "Previous session found — type /qualia to pick up where you left off");
    console.log("");
  } else {
    // No project — show a welcoming first-run experience
    const config = readConfig();
    const name = config.installed_by || "";
    runUi("banner", "router");
    if (name) {
      console.log(`  ${TEAL}Ready when you are, ${name}.${RESET}`);
    }
    console.log("");
    console.log(`  ${DIM}Start here:${RESET}`);
    console.log(`    ${TEAL}/qualia-new${RESET}    ${DIM}Set up a new project${RESET}`);
    console.log(`    ${TEAL}/qualia${RESET}        ${DIM}What should I do next?${RESET}`);
    console.log(`    ${TEAL}/qualia-feature${RESET} ${DIM}Single feature (auto-scoped)${RESET}`);
    console.log("");
  }
} catch (e) {
  // Hook must never exit non-zero. Log to trace so silent crashes are visible
  // in analytics, but do not print to stderr (would clutter the banner).
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(
      file,
      JSON.stringify({
        hook: "session-start",
        result: "error",
        error: String(e && e.message ? e.message : e),
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
  } catch {}
}

function _trace(hookName, result, extra) {
  try {
    const traceDir = path.join(QUALIA_HOME, ".qualia-traces");
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    const entry = {
      hook: hookName,
      result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - _traceStart,
      ...extra,
    };
    const file = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch {}
}

_trace("session-start", "allow");
process.exit(0);
