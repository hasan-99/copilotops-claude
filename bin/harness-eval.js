#!/usr/bin/env node
// Qualia harness eval — deterministic project scoring + evidence artifact.
//
// This is the mechanical layer above trust-score and contract-runner. It writes
// one JSON/Markdown artifact that can be attached to reports, snapshots, and
// state transitions instead of relying on a prose "looks good" verdict.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pc = require("./plan-contract.js");
const contractRunner = require("./contract-runner.js");
const trust = require("./trust-score.js");

function parseArgs(argv) {
  const args = { cwd: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--run") args.run = true;
    else if (a === "--write") args.write = true;
    else if (a === "--no-write") args.no_write = true;
    else if (a === "--phase") args.phase = Number(argv[++i]);
    else if (a.startsWith("--phase=")) args.phase = Number(a.slice("--phase=".length));
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice("--cwd=".length);
  }
  return args;
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function readText(file, fallback = "") {
  try { return fs.readFileSync(file, "utf8"); } catch { return fallback; }
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function stateCheck(cwd) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "state.js"), "check"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000,
  });
  const parsed = readJsonFromString(r.stdout);
  return {
    ok: r.status === 0 && parsed && parsed.ok === true,
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    parsed,
  };
}

function readJsonFromString(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function latestEval(cwd) {
  const dir = path.join(cwd, ".planning", "evals");
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => /^harness-eval-.*\.json$/.test(f))
      .map((f) => path.join(dir, f))
      .sort();
    if (!files.length) return null;
    return readJson(files[files.length - 1], null);
  } catch {
    return null;
  }
}

function addCheck(checks, name, weight, status, evidence, data) {
  checks.push({
    name,
    weight,
    status,
    score: status === "pass" || status === "not_applicable" ? weight : status === "warn" ? Math.floor(weight / 2) : 0,
    evidence,
    ...(data && typeof data === "object" ? data : {}),
  });
}

function verificationVerdict(text) {
  if (!text) return "";
  const explicit = text.match(/^result:\s*(PASS|FAIL)$/im);
  if (explicit) return explicit[1].toLowerCase();
  const md = text.match(/\bVerdict\b.*\b(PASS|FAIL)\b/i);
  if (md) return md[1].toLowerCase();
  if (/PHASE\s+PASS|ALL\s+CRITERIA\s+PASSED/i.test(text)) return "pass";
  if (/PHASE\s+FAIL|FAILED\s+CRITERIA|GAPS\s+FOUND/i.test(text)) return "fail";
  return "";
}

function writeArtifacts(cwd, result) {
  const dir = path.join(cwd, ".planning", "evals");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = result.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(dir, `harness-eval-${stamp}.json`);
  const mdPath = path.join(dir, `harness-eval-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n");
  const lines = [
    `# Harness Eval`,
    ``,
    `**Generated:** ${result.generated_at}`,
    `**Phase:** ${result.phase || "n/a"}`,
    `**Status:** ${result.status}`,
    `**Score:** ${result.score}/100`,
    ``,
    `## Checks`,
    ``,
    `| Check | Status | Score | Evidence |`,
    `|---|---:|---:|---|`,
    ...result.checks.map((c) => `| ${c.name} | ${c.status} | ${c.score}/${c.weight} | ${String(c.evidence || "").replace(/\|/g, "\\|")} |`),
    ``,
  ];
  fs.writeFileSync(mdPath, lines.join("\n"));
  result.artifacts = {
    json: rel(cwd, jsonPath),
    markdown: rel(cwd, mdPath),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n");
  return result.artifacts;
}

function buildHarnessEval(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const planning = path.join(cwd, ".planning");
  const generatedAt = options.now || new Date().toISOString();
  const checks = [];

  const state = stateCheck(cwd);
  if (!fs.existsSync(planning)) {
    addCheck(checks, "planning_state", 15, "fail", "No .planning directory; run /qualia-new");
    return finalize({ cwd, generatedAt, phase: options.phase || 0, checks, statusOverride: "FAIL" }, options);
  }

  const tracking = readJson(path.join(planning, "tracking.json"), {});
  const phase = Number(options.phase || state.parsed?.phase || tracking.phase || 0);
  addCheck(
    checks,
    "planning_state",
    15,
    state.ok ? "pass" : "fail",
    state.ok ? "state.js check returned ok" : "state.js check failed",
    { state: state.parsed || null }
  );

  const ledgerResult = (() => {
    try {
      const stateLedger = require("./state-ledger.js");
      return stateLedger.validate(cwd);
    } catch (e) {
      return { ok: false, errors: [e.message] };
    }
  })();
  addCheck(
    checks,
    "state_ledger",
    10,
    ledgerResult.ok ? "pass" : "fail",
    ledgerResult.ok ? `${ledgerResult.count || 0} hash-chained event(s)` : (ledgerResult.errors || []).join("; ")
  );

  const planPath = path.join(planning, `phase-${phase}-plan.md`);
  const contractPath = path.join(planning, `phase-${phase}-contract.json`);
  const hasPlan = fs.existsSync(planPath);
  const hasContract = fs.existsSync(contractPath);
  let loadedContract = null;

  if (!hasPlan && !hasContract) {
    addCheck(checks, "plan_contract", 20, "not_applicable", `No current phase plan/contract for phase ${phase}`);
  } else if (!hasContract) {
    addCheck(checks, "plan_contract", 20, "fail", `Missing ${rel(cwd, contractPath)}`);
  } else {
    const loaded = pc.readContractFile(contractPath);
    loadedContract = loaded.ok ? loaded.contract : null;
    const errors = loaded.ok ? pc.validate(loaded.contract) : [loaded.message || loaded.error];
    const drift = hasPlan ? pc.checkDrift(contractPath, planPath) : { ok: true, drift: false };
    const ok = loaded.ok && errors.length === 0 && !(drift.ok && drift.drift);
    addCheck(
      checks,
      "plan_contract",
      20,
      ok ? "pass" : "fail",
      ok ? `${rel(cwd, contractPath)} valid and in sync` : [...errors, drift.drift ? "contract drifted from plan" : ""].filter(Boolean).join("; "),
      { contract: rel(cwd, contractPath) }
    );
  }

  const evidencePath = path.join(planning, "evidence", `phase-${phase}-contract-run.json`);
  let evidence = readJson(evidencePath, null);
  if (loadedContract && options.run) {
    evidence = contractRunner.runContract(loadedContract, { cwd });
  }
  if (!loadedContract) {
    addCheck(checks, "machine_evidence", 20, "not_applicable", "No contract to execute");
  } else if (evidence && evidence.ok === true) {
    addCheck(checks, "machine_evidence", 20, "pass", `${rel(cwd, evidencePath)} passed ${evidence.checked || 0} check(s)`);
  } else {
    addCheck(
      checks,
      "machine_evidence",
      20,
      "fail",
      evidence ? `${evidence.failed || "unknown"} failing machine check(s)` : `Missing ${rel(cwd, evidencePath)}`
    );
  }

  const verificationPath = path.join(planning, `phase-${phase}-verification.md`);
  const verification = readText(verificationPath, "");
  const ieCount = (verification.match(/INSUFFICIENT EVIDENCE/g) || []).length;
  const verdict = verificationVerdict(verification);
  if (!verification) {
    addCheck(checks, "verification_report", 15, "fail", `Missing ${rel(cwd, verificationPath)}`);
  } else if (ieCount > 0) {
    addCheck(checks, "verification_report", 15, "fail", `${ieCount} insufficient-evidence marker(s)`);
  } else if (verdict === "pass" || verdict === "fail") {
    addCheck(checks, "verification_report", 15, verdict === "pass" ? "pass" : "warn", `${rel(cwd, verificationPath)} verdict=${verdict}`);
  } else {
    addCheck(checks, "verification_report", 15, "warn", `${rel(cwd, verificationPath)} has no machine-readable verdict`);
  }

  const trustScore = trust.buildTrustScore(cwd);
  addCheck(
    checks,
    "framework_trust_score",
    10,
    trustScore.status === "FAIL" ? "fail" : trustScore.status === "DEGRADED" ? "warn" : "pass",
    `trust-score=${trustScore.score}/100 status=${trustScore.status}`,
    { trust_score: trustScore.score }
  );

  const hasErpId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tracking.erp_project_id || "");
  const hasProjectKey = !!(tracking.project_id || tracking.project);
  addCheck(
    checks,
    "erp_linkage",
    10,
    hasErpId ? "pass" : hasProjectKey ? "warn" : "fail",
    hasErpId ? "tracking.json has erp_project_id UUID" : hasProjectKey ? "project key exists, ERP UUID missing" : "missing project/project_id for ERP correlation"
  );

  return finalize({ cwd, generatedAt, phase, checks }, options);
}

function finalize(base, options) {
  const score = Math.max(0, Math.min(100, base.checks.reduce((n, c) => n + (c.score || 0), 0)));
  const failed = base.checks.filter((c) => c.status === "fail").length;
  const warned = base.checks.filter((c) => c.status === "warn").length;
  const status = base.statusOverride || (failed ? "FAIL" : score >= 85 ? "PASS" : warned ? "WARN" : "PASS");
  const result = {
    ok: status !== "FAIL",
    status,
    score,
    phase: base.phase,
    generated_at: base.generatedAt,
    checks: base.checks,
  };
  if (options.write && !options.no_write && fs.existsSync(path.join(base.cwd, ".planning"))) {
    writeArtifacts(base.cwd, result);
  }
  return result;
}

function printHuman(result) {
  console.log(`Harness eval: ${result.score}/100 (${result.status})`);
  for (const c of result.checks) {
    console.log(`${c.name}: ${c.status} (${c.score}/${c.weight}) — ${c.evidence}`);
  }
  if (result.artifacts) {
    console.log(`Artifacts: ${result.artifacts.json}, ${result.artifacts.markdown}`);
  }
}

function main(argv) {
  const args = parseArgs(argv);
  const result = buildHarnessEval(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  return result.ok ? 0 : 1;
}

module.exports = {
  buildHarnessEval,
  latestEval,
  verificationVerdict,
};

if (require.main === module) process.exit(main(process.argv));

