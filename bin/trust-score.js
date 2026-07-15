#!/usr/bin/env node
// Qualia trust score — compact harness health summary.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const pc = require("./plan-contract.js");
const ledger = require("./state-ledger.js");
const { binFiles } = require("./runtime-manifest.js");
const { ACTIVE_SKILLS } = require("./command-surface.js");

const HOMES = [
  { name: "Claude", dir: path.join(os.homedir(), ".claude") },
  { name: "Codex", dir: path.join(os.homedir(), ".codex") },
];

const REQUIRED_BIN = binFiles();

// Spine scripts: the load-bearing executables that, if they fail to even parse,
// render the install dead. binFiles() does not include these, so probe them
// explicitly — existence AND Node loadability (`--check`). A syntax-broken
// cli.js (the C1 regression) must force overall status off PASS.
const SPINE_SCRIPTS = ["cli.js", "install.js", "state.js"];

const REQUIRED_HOOKS = [
  "session-start.js", "auto-update.js", "branch-guard.js", "pre-push.js",
  "pre-deploy-gate.js", "migration-guard.js", "git-guardrails.js",
  "stop-session-log.js", "fawzi-approval-guard.js", "vercel-account-guard.js", "env-empty-guard.js",
  "supabase-destructive-guard.js",
];

const REQUIRED_DESIGN_FILES = [
  "design-laws.md",
  "design-rubric.md",
  "design-brand.md",
  "design-product.md",
  "design-reference.md",
  "frontend.md",
  "graphics.md",
];

const REQUIRED_EMPLOYEE_SKILLS = ACTIVE_SKILLS;

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function readText(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function installedHomes() {
  return HOMES.filter((h) => exists(path.join(h.dir, ".qualia-config.json")));
}

function inspectInstall(homes) {
  if (homes.length === 0) {
    return { status: "fail", score: 0, issues: ["no Qualia install config found"], targets: [] };
  }
  const issues = [];
  let spineBroken = false;
  for (const home of homes) {
    for (const f of REQUIRED_BIN) {
      if (!exists(path.join(home.dir, "bin", f))) issues.push(`${home.name}: missing bin/${f}`);
    }
    // Spine probe: Node loadability of spine scripts that ARE installed.
    // cli.js / install.js run via npx / the installer and are not part of the
    // runtime manifest, so their ABSENCE is not a failure (state.js absence is
    // already reported via REQUIRED_BIN). But any spine script that IS present
    // must pass `--check` — a syntax-broken installed spine forces status off
    // PASS (this is the check that catches a dead cli.js).
    for (const f of SPINE_SCRIPTS) {
      const fp = path.join(home.dir, "bin", f);
      if (!exists(fp)) continue;
      const r = spawnSync(process.execPath, ["--check", fp], { encoding: "utf8" });
      if (r.status !== 0) {
        const detail = (r.stderr || r.error?.message || "").split("\n")[0].trim();
        issues.push(`${home.name}: spine bin/${f} fails --check${detail ? ` (${detail})` : ""}`);
        spineBroken = true;
      }
    }
    if (home.name === "Claude") {
      if (!exists(path.join(home.dir, "CLAUDE.md"))) issues.push("Claude: missing CLAUDE.md");
      if (!exists(path.join(home.dir, "settings.json"))) issues.push("Claude: missing settings.json");
    } else {
      if (!exists(path.join(home.dir, "AGENTS.md"))) issues.push("Codex: missing AGENTS.md");
      if (!exists(path.join(home.dir, "hooks.json"))) issues.push("Codex: missing hooks.json");
      if (!exists(path.join(home.dir, "config.toml"))) issues.push("Codex: missing config.toml");
    }
  }
  // A broken spine is a hard failure: the install cannot run. Force fail status
  // (drives overall status to FAIL) and zero the score regardless of other issues.
  if (spineBroken) {
    return {
      status: "fail",
      score: 0,
      issues,
      targets: homes.map((h) => h.name),
    };
  }
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(6, 20 - issues.length * 2) : 20,
    issues,
    targets: homes.map((h) => h.name),
  };
}

function inspectHooks(homes) {
  if (homes.length === 0) return { status: "fail", score: 0, issues: ["no install targets"] };
  const issues = [];
  for (const home of homes) {
    for (const h of REQUIRED_HOOKS) {
      if (!exists(path.join(home.dir, "hooks", h))) issues.push(`${home.name}: missing hooks/${h}`);
    }
  }
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(4, 12 - issues.length) : 12,
    issues,
  };
}

function inspectProject(cwd) {
  const planning = path.join(cwd, ".planning");
  if (!exists(planning)) return { status: "not_applicable", score: 12, issues: [], phase: null };
  const tracking = readJson(path.join(planning, "tracking.json"));
  const stateText = readText(path.join(planning, "STATE.md"));
  const issues = [];
  if (!tracking) issues.push("tracking.json missing or invalid");
  if (!stateText) issues.push("STATE.md missing");
  const phaseMatch = stateText.match(/^Phase:\s*(\d+)/m);
  const statusMatch = stateText.match(/^Status:\s*(.+)$/m);
  const phase = phaseMatch ? Number(phaseMatch[1]) : (tracking && Number(tracking.phase)) || 1;
  if (!phaseMatch && stateText) issues.push("STATE.md phase header missing");
  if (!statusMatch && stateText) issues.push("STATE.md status missing");
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(4, 12 - issues.length * 4) : 12,
    issues,
    phase,
    project_status: statusMatch ? statusMatch[1].trim() : tracking?.status || "",
  };
}

function inspectContracts(cwd, phase) {
  const planning = path.join(cwd, ".planning");
  if (!exists(planning) || !phase) return { status: "not_applicable", score: 18, issues: [] };
  const planPath = path.join(planning, `phase-${phase}-plan.md`);
  const contractPath = path.join(planning, `phase-${phase}-contract.json`);
  if (!exists(planPath)) return { status: "not_applicable", score: 18, issues: [] };
  if (!exists(contractPath)) return { status: "degraded", score: 6, issues: [`phase ${phase}: JSON contract missing`] };
  const loaded = pc.readContractFile(contractPath);
  if (!loaded.ok) return { status: "fail", score: 0, issues: [`phase ${phase}: contract unreadable (${loaded.message || loaded.error})`] };
  const errors = pc.validate(loaded.contract);
  if (errors.length) return { status: "fail", score: 0, issues: [`phase ${phase}: contract invalid (${errors.length} issue(s))`] };
  const drift = pc.checkDrift(contractPath, planPath);
  if (drift.ok && drift.drift) return { status: "fail", score: 0, issues: [`phase ${phase}: contract drifted from plan`] };
  return { status: "pass", score: 18, issues: [], contract: path.relative(cwd, contractPath) };
}

function inspectLedger(cwd) {
  const planning = path.join(cwd, ".planning");
  if (!exists(planning)) return { status: "not_applicable", score: 10, issues: [] };
  const file = ledger.ledgerPath(cwd);
  if (!exists(file)) return { status: "degraded", score: 4, issues: ["state ledger missing"] };
  const result = ledger.validate(cwd);
  if (!result.ok) return { status: "fail", score: 0, issues: result.errors };
  if (result.count === 0) return { status: "degraded", score: 4, issues: ["state ledger empty"] };
  return { status: "pass", score: 10, issues: [], events: result.count };
}

function inspectMemory(homes) {
  if (homes.length === 0) return { status: "fail", score: 0, issues: ["no install targets"] };
  const issues = [];
  for (const home of homes) {
    if (!exists(path.join(home.dir, "knowledge", "index.md"))) issues.push(`${home.name}: missing knowledge/index.md`);
    if (!exists(path.join(home.dir, "knowledge", "agents.md"))) issues.push(`${home.name}: missing knowledge/agents.md`);
    if (!exists(path.join(home.dir, "knowledge", "daily-log"))) issues.push(`${home.name}: missing knowledge/daily-log`);
  }
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(2, 5 - issues.length) : 5,
    issues,
  };
}

function inspectDesign(homes) {
  if (homes.length === 0) return { status: "fail", score: 0, issues: ["no install targets"] };
  const issues = [];
  for (const home of homes) {
    for (const f of REQUIRED_DESIGN_FILES) {
      if (!exists(path.join(home.dir, "qualia-design", f))) issues.push(`${home.name}: missing qualia-design/${f}`);
    }
    if (!exists(path.join(home.dir, "skills", "qualia-polish", "SKILL.md"))) {
      issues.push(`${home.name}: missing qualia-polish skill`);
    }
    if (!exists(path.join(home.dir, "agents", home.name === "Codex" ? "visual-evaluator.toml" : "visual-evaluator.md"))) {
      issues.push(`${home.name}: missing visual-evaluator agent`);
    }
    if (!exists(path.join(home.dir, "bin", "slop-detect.mjs"))) {
      issues.push(`${home.name}: missing slop-detect.mjs`);
    }
  }
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(2, 8 - issues.length) : 8,
    issues,
  };
}

function inspectEmployeeExperience(homes) {
  if (homes.length === 0) return { status: "fail", score: 0, issues: ["no install targets"] };
  const issues = [];
  for (const home of homes) {
    for (const skill of REQUIRED_EMPLOYEE_SKILLS) {
      if (!exists(path.join(home.dir, "skills", skill, "SKILL.md"))) issues.push(`${home.name}: missing ${skill} skill`);
    }
    if (!exists(path.join(home.dir, "qualia-guide.md"))) issues.push(`${home.name}: missing qualia-guide.md`);
    if (!exists(path.join(home.dir, "qualia-templates", "help.html"))) issues.push(`${home.name}: missing help.html`);
  }
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(1, 5 - issues.length) : 5,
    issues,
  };
}

function inspectErp(homes) {
  if (homes.length === 0) return { status: "not_applicable", score: 10, issues: [] };
  const issues = [];
  let enabled = false;
  let queueCount = 0;
  for (const home of homes) {
    const cfg = readJson(path.join(home.dir, ".qualia-config.json")) || {};
    if (cfg.erp && cfg.erp.enabled !== false) {
      enabled = true;
      const keyFile = path.join(home.dir, cfg.erp.api_key_file || ".erp-api-key");
      if (!exists(keyFile)) issues.push(`${home.name}: ERP enabled but API key missing`);
    }
    const queue = readJson(path.join(home.dir, ".erp-retry-queue.json"));
    if (Array.isArray(queue)) queueCount += queue.length;
  }
  if (!enabled) return { status: "not_applicable", score: 10, issues: [], queue_count: queueCount };
  if (queueCount > 0) issues.push(`ERP retry queue has ${queueCount} item(s)`);
  return {
    status: issues.length ? "degraded" : "pass",
    score: issues.length ? Math.max(3, 10 - issues.length * 3) : 10,
    issues,
    queue_count: queueCount,
  };
}

function buildTrustScore(cwd = process.cwd()) {
  const homes = installedHomes();
  const install = inspectInstall(homes);
  const hooks = inspectHooks(homes);
  const project = inspectProject(cwd);
  const contracts = inspectContracts(cwd, project.phase);
  const state_ledger = inspectLedger(cwd);
  const memory = inspectMemory(homes);
  const erp = inspectErp(homes);
  const design = inspectDesign(homes);
  const employee_experience = inspectEmployeeExperience(homes);
  const checks = { install, hooks, project, contracts, state_ledger, memory, erp, design, employee_experience };
  const score = Math.max(0, Math.min(100, Object.values(checks).reduce((n, c) => n + (c.score || 0), 0)));
  const failCount = Object.values(checks).filter((c) => c.status === "fail").length;
  const degradedCount = Object.values(checks).filter((c) => c.status === "degraded").length;
  const status = failCount ? "FAIL" : degradedCount ? "DEGRADED" : "PASS";
  return { ok: failCount === 0, status, score, generated_at: new Date().toISOString(), checks };
}

function printHuman(result) {
  console.log(`Trust score: ${result.score}/100 (${result.status})`);
  for (const [name, check] of Object.entries(result.checks)) {
    const label = `${name[0].toUpperCase()}${name.slice(1)}`;
    console.log(`${label}: ${check.status} (${check.score})`);
    for (const issue of check.issues || []) console.log(`  - ${issue}`);
  }
}

function main(argv) {
  const result = buildTrustScore(process.cwd());
  if (argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  return result.status === "FAIL" ? 1 : 0;
}

module.exports = {
  buildTrustScore,
  inspectInstall,
  inspectProject,
  inspectContracts,
  inspectLedger,
  inspectDesign,
  inspectEmployeeExperience,
};

if (require.main === module) process.exit(main(process.argv));
