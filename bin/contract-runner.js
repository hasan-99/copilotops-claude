#!/usr/bin/env node
// Execute Qualia phase contract checks and write evidence.
// No shell interpolation: command checks run through spawnSync(argv).

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pc = require("./plan-contract.js");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--no-write") args.no_write = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice("--cwd=".length);
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.error([
    "Usage:",
    "  contract-runner.js <contract.json> [--cwd DIR] [--json] [--no-write]",
    "",
    "Runs file-exists, grep-match, command-exit, and behavioral evidence checks.",
  ].join("\n"));
}

function rel(root, p) {
  return path.resolve(root, p);
}

function checkFileExists(root, check) {
  const file = rel(root, check.path);
  if (!fs.existsSync(file)) return { ok: false, detail: `missing file: ${check.path}` };
  if (check.must_contain != null) {
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes(check.must_contain)) {
      return { ok: false, detail: `file does not contain required text: ${check.path}` };
    }
  }
  return { ok: true };
}

function checkGrepMatch(root, check) {
  const file = rel(root, check.path);
  if (!fs.existsSync(file)) return { ok: false, detail: `missing file: ${check.path}` };
  const content = fs.readFileSync(file, "utf8");
  const re = new RegExp(check.pattern);
  const present = re.test(content);
  if (check.expect === "present" && !present) return { ok: false, detail: `pattern absent: ${check.pattern}` };
  if (check.expect === "absent" && present) return { ok: false, detail: `pattern present: ${check.pattern}` };
  return { ok: true };
}

function checkCommandExit(root, check) {
  const started = Date.now();
  const r = spawnSync(check.command, check.args || [], {
    cwd: root,
    encoding: "utf8",
    timeout: check.timeout_ms || 30_000,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  const status = typeof r.status === "number" ? r.status : 1;
  if (status !== check.expected_exit) {
    return {
      ok: false,
      detail: `exit ${status}, expected ${check.expected_exit}`,
      duration_ms: Date.now() - started,
      stdout: (r.stdout || "").slice(-1000),
      stderr: (r.stderr || r.error?.message || "").slice(-1000),
    };
  }
  if (check.expect_stdout_match != null) {
    const re = new RegExp(check.expect_stdout_match);
    if (!re.test(r.stdout || "")) {
      return {
        ok: false,
        detail: `stdout did not match: ${check.expect_stdout_match}`,
        duration_ms: Date.now() - started,
        stdout: (r.stdout || "").slice(-1000),
        stderr: (r.stderr || "").slice(-1000),
      };
    }
  }
  return {
    ok: true,
    duration_ms: Date.now() - started,
    stdout: (r.stdout || "").slice(-1000),
    stderr: (r.stderr || "").slice(-1000),
  };
}

function checkBehavioral(root, check) {
  for (const ev of check.evidence_required || []) {
    const file = rel(root, ev.path);
    if (!fs.existsSync(file)) {
      return { ok: false, detail: `missing evidence file: ${ev.path}` };
    }
    if (ev.matcher != null) {
      const content = fs.readFileSync(file, "utf8");
      const re = new RegExp(ev.matcher);
      if (!re.test(content)) {
        return { ok: false, detail: `evidence matcher failed for ${ev.path}: ${ev.matcher}` };
      }
    }
  }
  return { ok: true };
}

function runCheck(root, check) {
  try {
    if (check.type === "file-exists") return checkFileExists(root, check);
    if (check.type === "grep-match") return checkGrepMatch(root, check);
    if (check.type === "command-exit") return checkCommandExit(root, check);
    if (check.type === "behavioral") return checkBehavioral(root, check);
    return { ok: false, detail: `unknown check type: ${check.type}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

function writeEvidence(root, contract, result) {
  const dir = path.join(root, ".planning", "evidence");
  fs.mkdirSync(dir, { recursive: true });
  const phase = Number(contract.phase || 0) || "unknown";
  const file = path.join(dir, `phase-${phase}-contract-run.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
  return path.relative(root, file);
}

function runContract(contract, opts = {}) {
  const root = path.resolve(opts.cwd || process.cwd());
  const errors = pc.validate(contract);
  if (errors.length > 0) {
    return {
      ok: false,
      error: "CONTRACT_INVALID",
      errors,
      checked: 0,
      failed: errors.length,
      results: [],
    };
  }

  const results = [];
  for (const task of contract.tasks || []) {
    for (let i = 0; i < (task.verification || []).length; i++) {
      const check = task.verification[i];
      const r = runCheck(root, check);
      results.push({
        task_id: task.id,
        task_title: task.title,
        index: i,
        type: check.type,
        ok: !!r.ok,
        detail: r.detail || "",
        duration_ms: r.duration_ms,
        stdout: r.stdout,
        stderr: r.stderr,
      });
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  const payload = {
    ok: failed === 0,
    phase: contract.phase,
    goal: contract.goal,
    checked: results.length,
    failed,
    generated_at: new Date().toISOString(),
    results,
  };
  if (!opts.no_write) payload.evidence_file = writeEvidence(root, contract, payload);
  return payload;
}

function main(argv) {
  const args = parseArgs(argv);
  const contractPath = args._[0];
  if (!contractPath || contractPath === "--help" || contractPath === "-h") {
    usage();
    return 2;
  }
  const loaded = pc.readContractFile(contractPath);
  if (!loaded.ok) {
    const payload = { ok: false, ...loaded, path: contractPath };
    if (args.json) console.log(JSON.stringify(payload, null, 2));
    else console.error(`${payload.error}: ${payload.message}`);
    return 2;
  }
  const result = runContract(loaded.contract, {
    cwd: args.cwd,
    no_write: args.no_write,
  });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`PASS phase ${result.phase}: ${result.checked} check(s)`);
    if (result.evidence_file) console.log(`Evidence: ${result.evidence_file}`);
  } else {
    console.error(`FAIL phase ${result.phase || "?"}: ${result.failed} of ${result.checked || result.failed} check(s) failed`);
    for (const r of result.results || []) {
      if (!r.ok) console.error(`- ${r.task_id} ${r.type}: ${r.detail}`);
    }
    if (result.error) for (const e of result.errors || []) console.error(`- ${e}`);
  }
  return result.ok ? 0 : 1;
}

module.exports = { runContract, runCheck };

if (require.main === module) {
  process.exit(main(process.argv));
}
