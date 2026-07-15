#!/usr/bin/env node
// ~/.claude/hooks/auto-update.js — daily silent update check in the background.
// PreToolUse hook on every Bash tool call. Fast path: single stat() call that
// returns immediately if last check was <24h ago. Cross-platform.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const _traceStart = Date.now();

function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}

const QUALIA_HOME = qualiaHome();
const CACHE_FILE = path.join(QUALIA_HOME, ".qualia-last-update-check");
const CONFIG_FILE = path.join(QUALIA_HOME, ".qualia-config.json");
const LOCK_FILE = path.join(QUALIA_HOME, ".qualia-updating");
const NOTIF_FILE = path.join(QUALIA_HOME, ".qualia-update-available.json");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    const traceFile = path.join(traceDir, `${new Date().toISOString().split("T")[0]}.jsonl`);
    fs.appendFileSync(traceFile, JSON.stringify(entry) + "\n");
  } catch {}
}

try {
  // Fast path: recently checked
  if (fs.existsSync(CACHE_FILE)) {
    const last = Number(fs.readFileSync(CACHE_FILE, "utf8")) || 0;
    if (Date.now() - last * 1000 < MAX_AGE_MS) {
      _trace("auto-update", "allow", { reason: "recently-checked" });
      process.exit(0);
    }
  }

  // Already updating
  if (fs.existsSync(LOCK_FILE)) {
    _trace("auto-update", "allow", { reason: "already-updating" });
    process.exit(0);
  }

  // Read current config
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    _trace("auto-update", "allow", { reason: "config-unreadable" });
    process.exit(0);
  }
  if (!cfg.code || !cfg.version) {
    _trace("auto-update", "allow", { reason: "config-incomplete" });
    process.exit(0);
  }

  // Synchronously fetch the latest version from npm. Tight timeout so the hook
  // never blocks Claude Code for long. Stamp the cache before the network call:
  // if npm/DNS is down, we avoid paying the timeout on every Bash command.
  let latest = "";
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    fs.writeFileSync(CACHE_FILE, String(Math.floor(Date.now() / 1000)));
    const r = spawnSync("npm", ["view", "qualia-framework", "version"], {
      encoding: "utf8",
      timeout: 3000,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "ignore"],
    });
    latest = ((r.stdout || "").trim());
  } catch (e) {
    _trace("auto-update", "npm-error", { error: e && e.message });
  }
  try { fs.unlinkSync(LOCK_FILE); } catch {}

  if (!latest) {
    _trace("auto-update", "allow", { reason: "npm-fetch-failed" });
    process.exit(0);
  }

  const cmp = (a, b) => {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i]||0) > (pb[i]||0)) return 1;
      if ((pa[i]||0) < (pb[i]||0)) return -1;
    }
    return 0;
  };

  if (cmp(latest, cfg.version) > 0) {
    // Update available — write a sticky notification file for ALL roles.
    // session-start.js renders a banner every session until the user runs
    // `npx qualia-framework update` manually. We do NOT auto-install during
    // a live Claude Code session because install rewrites ~/.claude/settings.json
    // and can corrupt the running session.
    try {
      fs.writeFileSync(NOTIF_FILE, JSON.stringify({
        current: cfg.version,
        latest: latest,
        detected_at: new Date().toISOString(),
      }, null, 2));
    } catch {}
    // Invalidate the session-start health cache so the next session re-checks
    // whether new critical files shipped in the latest version are installed.
    try {
      fs.unlinkSync(path.join(QUALIA_HOME, ".qualia-install-health.json"));
    } catch {}
    _trace("auto-update", "allow", { reason: "notification-written", current: cfg.version, latest });
  } else {
    // Already up to date — clear any stale notification file.
    try { fs.unlinkSync(NOTIF_FILE); } catch {}
    _trace("auto-update", "allow", { reason: "up-to-date", version: cfg.version });
  }
} catch (e) {
  // Never block the tool call, but leave a trace so failures are debuggable.
  _trace("auto-update", "error", { error: e && e.message });
}

process.exit(0);
