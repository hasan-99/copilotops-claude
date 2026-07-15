#!/usr/bin/env node
// ~/.claude/hooks/pre-deploy-gate.js — quality gates before production deploy.
// PreToolUse hook on `vercel --prod*` commands. Runs tsc, lint, tests, build,
// then scans for service_role leaks in client code.
// Exits 2 to BLOCK deploy (Claude Code PreToolUse hook contract).
// Exits 0 to allow.
// Cross-platform (Windows/macOS/Linux). No `grep` or `find` — pure Node.

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
const CONFIG = path.join(QUALIA_HOME, ".qualia-config.json");
let HOOK_COMMAND = null;

// Self-filter on the proposed bash command — only act when the user is
// actually trying to deploy. Claude Code's `if: "Bash(vercel --prod*)"` does
// substring matching (not glob), so commands that contain the literal text
// "vercel --prod" inside a for-loop or grep argument trip the gate. Codex
// ignores the `if` field entirely. Both runtimes therefore need this hook to
// inspect tool_input.command itself before doing any work.
//
// Direct invocation (no stdin — `node pre-deploy-gate.js`) is treated as
// "run the gate" so the test suite and manual `qualia-framework verify` flows
// keep working. Only when stdin contains a parseable tool_input.command that
// does NOT match a deploy pattern do we exit early.
(function selfFilter() {
  if (process.stdin.isTTY) return; // direct invocation — run full gate
  let command = null; // null = no stdin payload, "" = empty command, "str" = parsed
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (raw) {
      const payload = JSON.parse(raw);
      command = (payload && payload.tool_input && payload.tool_input.command) || "";
    }
  } catch {}
  if (command === null) return; // malformed or empty stdin — run full gate
  HOOK_COMMAND = command;
  if (!/^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(npx\s+)?vercel\s+(--prod|deploy\s+--prod)\b/.test(command)) {
    process.exit(0);
  }
})();

function _trace(hookName, result, extra) {
  try {
    const os = require("os");
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

function runGate(label, cmd, args, { required = true } = {}) {
  const r = spawnSync(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 120000,
    shell: process.platform === "win32",
  });
  if (r.status === 0) {
    console.log(`  ✓ ${label}`);
    return true;
  }
  if (required) {
    console.error(`BLOCKED: ${label} errors. Fix before deploying.`);
    const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
    if (output) {
      const lines = output.split(/\r?\n/).filter(Boolean).slice(-20);
      console.error(`Last ${lines.length} output line${lines.length === 1 ? "" : "s"}:`);
      for (const line of lines) console.error(`  ${line}`);
    } else if (r.error) {
      console.error(`  ${r.error.message}`);
    }
    _trace("pre-deploy-gate", "block", {
      gate: label,
      status: r.status,
      signal: r.signal || undefined,
      error: r.error ? r.error.message : undefined,
    });
    process.exit(2);
  }
  return false;
}

function hasScript(name) {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return pkg.scripts && typeof pkg.scripts[name] === "string";
  } catch {
    return false;
  }
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return {};
  }
}

function readTrackingState() {
  try {
    const tracking = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".planning", "tracking.json"), "utf8"));
    return {
      status: tracking.status || "",
      verification: tracking.verification || "",
      next_command: tracking.next_command || "",
    };
  } catch {
    return null;
  }
}

function readState() {
  const stateJs = path.join(QUALIA_HOME, "bin", "state.js");
  if (fs.existsSync(stateJs)) {
    try {
      const r = spawnSync(process.execPath, [stateJs, "check"], {
        encoding: "utf8",
        timeout: 3000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      if (r.status === 0 && r.stdout) return JSON.parse(r.stdout);
    } catch {}
  }
  return readTrackingState();
}

function blockDeploy(reason, nextCommand) {
  console.error(`BLOCKED: ${reason}`);
  if (nextCommand) console.error(`Run: ${nextCommand}`);
  _trace("pre-deploy-gate", "block", { reason, next_command: nextCommand || "" });
  process.exit(2);
}

function enforceShipPolicy() {
  if (!HOOK_COMMAND) return;

  const config = readConfig();
  const role = String(config.role || "").toUpperCase();
  const force = process.env.QUALIA_SHIP_FORCE === "1" || /\bQUALIA_SHIP_FORCE=1\b/.test(HOOK_COMMAND);
  const state = readState();
  const status = state && state.status ? String(state.status) : "";
  const verification = state && state.verification ? String(state.verification) : "";
  const nextCommand = (state && state.next_command) || "/qualia";

  if (force && role !== "OWNER") {
    blockDeploy("QUALIA_SHIP_FORCE is OWNER-only.", nextCommand);
  }

  // If this is not a Qualia-managed project, keep the legacy behavior: run the
  // quality/security gates but do not invent state.
  if (!state || !status) {
    console.error("⬢ pre-deploy-gate: no ship-state (brownfield) — skipping ship-policy gate, quality gates still run");
    return;
  }

  const shippable = status === "polished" || (status === "verified" && verification === "pass");
  if (!shippable && !force) {
    blockDeploy(`Ship refused from state '${status}' (verification: ${verification || "none"}).`, nextCommand);
  }
}

enforceShipPolicy();

// Directories that should never be walked (build outputs, deps, caches).
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "out",
  "build",
  "coverage",
  ".next",
  ".vercel",
  ".turbo",
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// Lines we treat as safe even if they contain `service_role`:
//   - comments (// ... | /* ... | * ...)
//   - env-var reads of SUPABASE_SERVICE_ROLE (server-side env access pattern)
//   - explicit allowlist via eslint-disable
function isSafeLine(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("/*")) return true;
  if (trimmed.startsWith("*")) return true;
  if (line.includes("process.env.SUPABASE_SERVICE_ROLE")) return true;
  if (line.includes("eslint-disable")) return true;
  return false;
}

// Word-boundary tightened from a literal-substring match.
// `\b` at start prevents matches like `myservice_role`; the trailing word
// char is intentionally allowed so common leak patterns ("service_role",
// "service_role_literal_leak", `service_role_key`) still trip the scanner.
const SERVICE_ROLE_RE = /\bservice_role/;

function scanServiceRoleLeaks() {
  const roots = ["app", "components", "src", "pages", "lib"];
  const leaks = [];
  for (const root of roots) {
    for (const file of walk(root)) {
      // --- Path-based skips (no I/O needed) ---

      // Skip server-only files (convention: *.server.ts, server/ dirs)
      if (/\.server\.|[\\/]server[\\/]/.test(file)) continue;

      // Skip App Router route handlers (always server-side)
      if (/[\\/]route\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;

      // Skip middleware (always server-side)
      if (/[\\/]middleware\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;

      // Skip files in app/api/ directory (always server-side)
      if (/[\\/]app[\\/]api[\\/]/.test(file)) continue;

      // --- Content-based checks (requires reading file) ---
      try {
        const content = fs.readFileSync(file, "utf8");

        // Skip files with "use server" directive (Server Actions / Server Components)
        if (/^["']use server["']/m.test(content)) continue;

        // Line-by-line scan so we can honor per-line allowlists.
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          if (!SERVICE_ROLE_RE.test(line)) continue;
          if (isSafeLine(line)) continue;
          leaks.push(file);
          break;
        }
      } catch {}
    }
  }
  return leaks;
}

console.log("⬢ Pre-deploy gate...");

// TypeScript
if (fs.existsSync("tsconfig.json")) {
  runGate("TypeScript", "npx", ["tsc", "--noEmit"]);
}

// Lint (with QUALIA_SKIP_LINT=1 escape — for the documented "lint blocks
// ship" friction when the lint failures are pre-existing or auto-fixer-broken).
// The skip is OWNER-only, mirroring the QUALIA_SHIP_FORCE role-gate above.
if (hasScript("lint")) {
  const skipLint = process.env.QUALIA_SKIP_LINT === "1";
  const lintRole = String(readConfig().role || "").toUpperCase();
  if (skipLint && lintRole !== "OWNER") {
    const lintState = readState();
    blockDeploy("QUALIA_SKIP_LINT is OWNER-only.", (lintState && lintState.next_command) || "/qualia");
  }
  if (skipLint) {
    console.log("  ⚠ Lint skipped (QUALIA_SKIP_LINT=1)");
    _trace("pre-deploy-gate", "skip-lint", { reason: "QUALIA_SKIP_LINT=1" });
  } else {
    runGate("Lint", "npm", ["run", "lint"]);
  }
}

// Tests
if (hasScript("test")) {
  runGate("Tests", "npm", ["test"]);
}

// Build
if (hasScript("build")) {
  runGate("Build", "npm", ["run", "build"]);
}

// Security: no service_role in client code
const leaks = scanServiceRoleLeaks();
if (leaks.length > 0) {
  console.error("BLOCKED: service_role found in client code. Remove before deploying.");
  for (const f of leaks.slice(0, 10)) {
    console.error(`  ✗ ${f}`);
  }
  _trace("pre-deploy-gate", "block", { gate: "security", leaks: leaks.slice(0, 10) });
  process.exit(2);
}
console.log("  ✓ Security");

// Anti-slop: zero-token deterministic scan for the AI-design tells the
// constitution bans (banned fonts, purple-blue gradients, etc). slop-detect
// exits 1 on CRITICAL findings; we translate that to a deploy block (exit 2).
// Skipped silently when the scanner isn't installed (brownfield / older
// installs) so it never breaks a project that predates it. OWNER-only escape
// hatch mirrors QUALIA_SKIP_LINT.
const slopScript = path.join(QUALIA_HOME, "bin", "slop-detect.mjs");
if (fs.existsSync(slopScript)) {
  const skipSlop = process.env.QUALIA_SKIP_SLOP === "1";
  if (skipSlop) {
    const slopRole = String(readConfig().role || "").toUpperCase();
    if (slopRole !== "OWNER") {
      const slopState = readState();
      blockDeploy("QUALIA_SKIP_SLOP is OWNER-only.", (slopState && slopState.next_command) || "/qualia");
    }
    console.log("  ⚠ Anti-slop skipped (QUALIA_SKIP_SLOP=1)");
    _trace("pre-deploy-gate", "skip-slop", { reason: "QUALIA_SKIP_SLOP=1" });
  } else {
    const r = spawnSync(process.execPath, [slopScript, "--severity=critical"], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 60000,
    });
    if (r.status === 1) {
      console.error("BLOCKED: anti-slop scan found CRITICAL design tells. Fix before deploying.");
      const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
      if (output) {
        const lines = output.split(/\r?\n/).filter(Boolean).slice(-20);
        for (const line of lines) console.error(`  ${line}`);
      }
      _trace("pre-deploy-gate", "block", { gate: "slop", status: r.status });
      process.exit(2);
    }
    console.log("  ✓ Anti-slop");
  }
}

console.log("⬢ All gates passed.");

_trace("pre-deploy-gate", "allow");
process.exit(0);
