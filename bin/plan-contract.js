#!/usr/bin/env node
// Plan contract validator + helpers. See docs/plan-contract.md.
//
// Library + tiny CLI. Required by state.js and by skills that emit/consume
// `.planning/phase-{N}-contract.json`.
//
// Zero npm dependencies. Hand-rolled validator, ~100 LOC.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SCHEMA_VERSION = 1;

const PERSONAS = new Set([
  "security", "architect", "ux", "frontend",
  "backend", "data", "performance", "none",
]);

const CHECK_TYPES = new Set([
  "file-exists", "grep-match", "command-exit", "behavioral",
]);

// Scope-reduction detection — phrases that signal an LLM has watered down the
// spec. The plan-checker agent does the same scan on the markdown plan; this
// function does it on the JSON contract's free-text fields (action +
// acceptance_criteria) so both paths catch the same failure mode.
const SCOPE_REDUCTION_PHRASES = [
  /\bv1\b/i, /\bv2\b/i, /simplified version/i, /static for now/i,
  /hardcoded for now/i, /\bplaceholder\b/i, /basic version/i,
  /minimal implementation/i, /will be wired later/i,
  /dynamic in future phase/i, /skip for now/i, /\bstub\b/i,
  /mock for now/i, /we can improve this later/i, /quick win for now/i,
];

function findScopeReductionPhrases(text) {
  if (typeof text !== "string") return [];
  const hits = [];
  for (const re of SCOPE_REDUCTION_PHRASES) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function validateCheck(check, taskId, idx) {
  const errs = [];
  const where = `tasks[id=${taskId}].verification[${idx}]`;
  if (!isPlainObject(check)) return [`${where}: not an object`];
  if (!CHECK_TYPES.has(check.type)) {
    errs.push(`${where}.type: must be one of ${[...CHECK_TYPES].join("|")}`);
    return errs;
  }
  switch (check.type) {
    case "file-exists":
      if (typeof check.path !== "string" || !check.path) errs.push(`${where}.path: required string`);
      if (check.must_contain != null && typeof check.must_contain !== "string") errs.push(`${where}.must_contain: must be string`);
      break;
    case "grep-match":
      if (typeof check.path !== "string" || !check.path) errs.push(`${where}.path: required string`);
      if (typeof check.pattern !== "string" || !check.pattern) errs.push(`${where}.pattern: required string`);
      else { try { new RegExp(check.pattern); } catch { errs.push(`${where}.pattern: invalid regex`); } }
      if (check.expect !== "present" && check.expect !== "absent") errs.push(`${where}.expect: must be "present" or "absent"`);
      break;
    case "command-exit":
      if (typeof check.command !== "string" || !check.command) errs.push(`${where}.command: required string`);
      else if (/[;&|`$<>(){}\\]/.test(check.command)) errs.push(`${where}.command: shell metacharacters not allowed (use args[])`);
      if (!isStringArray(check.args || [])) errs.push(`${where}.args: must be string[]`);
      if (typeof check.expected_exit !== "number") errs.push(`${where}.expected_exit: required number`);
      if (check.timeout_ms != null && (typeof check.timeout_ms !== "number" || check.timeout_ms <= 0)) {
        errs.push(`${where}.timeout_ms: must be positive number`);
      }
      if (check.expect_stdout_match != null) {
        if (typeof check.expect_stdout_match !== "string") errs.push(`${where}.expect_stdout_match: must be string`);
        else { try { new RegExp(check.expect_stdout_match); } catch { errs.push(`${where}.expect_stdout_match: invalid regex`); } }
      }
      break;
    case "behavioral":
      if (typeof check.description !== "string" || !check.description) errs.push(`${where}.description: required string`);
      if (!Array.isArray(check.evidence_required) || check.evidence_required.length === 0) {
        errs.push(`${where}.evidence_required: must be a non-empty array`);
      } else {
        check.evidence_required.forEach((ev, i) => {
          const w = `${where}.evidence_required[${i}]`;
          if (!isPlainObject(ev)) { errs.push(`${w}: not an object`); return; }
          if (typeof ev.path !== "string" || !ev.path) errs.push(`${w}.path: required string`);
          if (typeof ev.description !== "string" || !ev.description) errs.push(`${w}.description: required string`);
          if (ev.matcher != null) {
            if (typeof ev.matcher !== "string") errs.push(`${w}.matcher: must be string`);
            else { try { new RegExp(ev.matcher); } catch { errs.push(`${w}.matcher: invalid regex`); } }
          }
        });
      }
      break;
  }
  return errs;
}

function validateTask(task, idx, allIds) {
  const errs = [];
  const where = `tasks[${idx}]`;
  if (!isPlainObject(task)) return [`${where}: not an object`];
  if (typeof task.id !== "string" || !/^T\d+$/.test(task.id)) errs.push(`${where}.id: must match ^T\\d+$`);
  if (typeof task.title !== "string" || !task.title) errs.push(`${where}.title: required string`);
  if (typeof task.wave !== "number" || task.wave < 1) errs.push(`${where}.wave: must be positive number`);
  if (!isStringArray(task.depends_on || [])) errs.push(`${where}.depends_on: must be string[]`);
  if (task.persona != null && !PERSONAS.has(task.persona)) errs.push(`${where}.persona: invalid value`);
  if (!isStringArray(task.files_modify || [])) errs.push(`${where}.files_modify: must be string[]`);
  if (!isStringArray(task.files_create || [])) errs.push(`${where}.files_create: must be string[]`);
  if (!isStringArray(task.files_delete || [])) errs.push(`${where}.files_delete: must be string[]`);
  if (!isStringArray(task.acceptance_criteria || []) || (task.acceptance_criteria || []).length === 0) {
    errs.push(`${where}.acceptance_criteria: must be a non-empty string[]`);
  }
  if (typeof task.action !== "string") errs.push(`${where}.action: required string`);
  else {
    if (task.action.length > 500) errs.push(`${where}.action: must be ≤ 500 characters (got ${task.action.length})`);
    const actionHits = findScopeReductionPhrases(task.action);
    if (actionHits.length) errs.push(`${where}.action: scope-reduction phrase(s) detected: ${actionHits.join(", ")} — rewrite to deliver the actual spec, or split via locked-decision channel`);
  }
  for (let i = 0; i < (task.acceptance_criteria || []).length; i++) {
    const acHits = findScopeReductionPhrases(task.acceptance_criteria[i]);
    if (acHits.length) errs.push(`${where}.acceptance_criteria[${i}]: scope-reduction phrase(s) detected: ${acHits.join(", ")}`);
  }
  if (!isStringArray(task.context_files || [])) errs.push(`${where}.context_files: must be string[]`);
  if (!Array.isArray(task.verification) || task.verification.length === 0) {
    errs.push(`${where}.verification: must be a non-empty array`);
  } else {
    task.verification.forEach((c, i) => errs.push(...validateCheck(c, task.id, i)));
  }

  // disjointness across files_modify/create/delete
  const m = new Set(task.files_modify || []);
  const c = new Set(task.files_create || []);
  const d = new Set(task.files_delete || []);
  for (const p of m) if (c.has(p) || d.has(p)) errs.push(`${where}: ${p} appears in multiple file lists`);
  for (const p of c) if (d.has(p)) errs.push(`${where}: ${p} appears in multiple file lists`);

  // depends_on references must exist
  for (const dep of task.depends_on || []) {
    if (!allIds.has(dep)) errs.push(`${where}.depends_on: references unknown id "${dep}"`);
  }
  return errs;
}

function detectCycles(tasks) {
  const graph = new Map(tasks.map((t) => [t.id, t.depends_on || []]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
  const cycles = [];
  function dfs(u, stack) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of graph.get(u) || []) {
      if (!graph.has(v)) continue;
      const cv = color.get(v);
      if (cv === GRAY) { cycles.push([...stack, v].join(" → ")); return; }
      if (cv === WHITE) dfs(v, stack);
    }
    color.set(u, BLACK);
    stack.pop();
  }
  for (const k of graph.keys()) if (color.get(k) === WHITE) dfs(k, []);
  return cycles;
}

function validate(contract) {
  const errs = [];
  if (!isPlainObject(contract)) return ["contract: not an object"];
  if (contract.version !== SCHEMA_VERSION) errs.push(`version: must be ${SCHEMA_VERSION}, got ${contract.version}`);
  if (typeof contract.phase !== "number" || contract.phase < 1) errs.push("phase: must be positive number");
  if (typeof contract.goal !== "string" || !contract.goal) errs.push("goal: required string");
  if (typeof contract.why !== "string" || !contract.why) errs.push("why: required string");
  if (typeof contract.generated_at !== "string") errs.push("generated_at: required ISO 8601 string");
  if (!["planner", "compile-plan", "manual"].includes(contract.generated_by)) {
    errs.push('generated_by: must be "planner" | "compile-plan" | "manual"');
  }
  if (typeof contract.source_plan_hash !== "string") errs.push("source_plan_hash: required string (empty for manual)");
  if (!isStringArray(contract.success_criteria || []) || (contract.success_criteria || []).length === 0) {
    errs.push("success_criteria: must be a non-empty string[]");
  }
  if (!Array.isArray(contract.tasks) || contract.tasks.length === 0) {
    errs.push("tasks: must be a non-empty array");
    return errs;
  }

  const ids = new Set();
  for (const t of contract.tasks) {
    if (t && typeof t.id === "string") {
      if (ids.has(t.id)) errs.push(`tasks: duplicate id "${t.id}"`);
      ids.add(t.id);
    }
  }

  contract.tasks.forEach((t, i) => errs.push(...validateTask(t, i, ids)));

  const cycles = detectCycles(contract.tasks);
  if (cycles.length) errs.push(`tasks: cycle detected: ${cycles[0]}`);

  // wave > max(deps wave)
  const byId = new Map(contract.tasks.map((t) => [t.id, t]));
  for (const t of contract.tasks) {
    const deps = (t.depends_on || []).map((id) => byId.get(id)).filter(Boolean);
    if (deps.length === 0) continue;
    const maxDepWave = Math.max(...deps.map((d) => d.wave || 0));
    if ((t.wave || 0) <= maxDepWave) {
      errs.push(`tasks[id=${t.id}].wave: must be > ${maxDepWave} (max wave of its dependencies)`);
    }
  }

  return errs;
}

function parseSafely(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function hashPlan(text) {
  return "sha256:" + crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function checkDrift(contractPath, planMdPath) {
  if (!fs.existsSync(contractPath)) return { ok: false, reason: "contract-missing" };
  if (!fs.existsSync(planMdPath)) return { ok: false, reason: "plan-md-missing" };
  const parsed = parseSafely(fs.readFileSync(contractPath, "utf8"));
  if (!parsed.ok) return { ok: false, reason: "contract-unparseable", detail: parsed.error };
  const stored = parsed.value.source_plan_hash;
  if (!stored) return { ok: true, drift: false, reason: "no-hash-stored" };
  const current = hashPlan(fs.readFileSync(planMdPath, "utf8"));
  return { ok: true, drift: stored !== current, stored, current };
}

function readContractFile(contractPath) {
  if (!fs.existsSync(contractPath)) {
    return { ok: false, error: "CONTRACT_MISSING", message: `Contract file not found: ${contractPath}` };
  }
  const parsed = parseSafely(fs.readFileSync(contractPath, "utf8"));
  if (!parsed.ok) {
    return { ok: false, error: "CONTRACT_UNPARSEABLE", message: parsed.error };
  }
  return { ok: true, contract: parsed.value };
}

function cliUsage() {
  console.error([
    "Usage:",
    "  plan-contract.js validate <contract.json> [--json]",
    "  plan-contract.js drift <contract.json> <plan.md> [--json]",
    "  plan-contract.js hash <plan.md>",
  ].join("\n"));
}

function printResult(payload, asJson) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (payload.ok) {
    if (payload.action === "validate") console.log(`VALID ${payload.path}`);
    else if (payload.action === "drift") console.log(payload.drift ? "DRIFT" : "NO_DRIFT");
    else if (payload.action === "hash") console.log(payload.hash);
    else console.log("OK");
    return;
  }
  console.error(`${payload.error || "ERROR"}: ${payload.message || (payload.errors || []).join("; ")}`);
}

function main(argv) {
  const cmd = argv[2];
  const asJson = argv.includes("--json");
  if (!cmd || cmd === "--help" || cmd === "-h") {
    cliUsage();
    return 2;
  }

  if (cmd === "validate") {
    const contractPath = argv[3];
    if (!contractPath || contractPath.startsWith("--")) {
      cliUsage();
      return 2;
    }
    const loaded = readContractFile(contractPath);
    if (!loaded.ok) {
      printResult({ ok: false, action: "validate", path: contractPath, ...loaded }, asJson);
      return 2;
    }
    const errors = validate(loaded.contract);
    const payload = { ok: errors.length === 0, action: "validate", path: contractPath, errors };
    printResult(payload, asJson);
    return payload.ok ? 0 : 1;
  }

  if (cmd === "drift") {
    const contractPath = argv[3];
    const planPath = argv[4];
    if (!contractPath || !planPath || contractPath.startsWith("--") || planPath.startsWith("--")) {
      cliUsage();
      return 2;
    }
    const result = checkDrift(contractPath, planPath);
    const payload = { ok: !!result.ok && !result.drift, action: "drift", path: contractPath, plan: planPath, ...result };
    printResult(payload, asJson);
    return payload.ok ? 0 : 1;
  }

  if (cmd === "hash") {
    const planPath = argv[3];
    if (!planPath || planPath.startsWith("--")) {
      cliUsage();
      return 2;
    }
    if (!fs.existsSync(planPath)) {
      printResult({ ok: false, action: "hash", error: "PLAN_MISSING", message: `Plan file not found: ${planPath}` }, asJson);
      return 2;
    }
    const hash = hashPlan(fs.readFileSync(planPath, "utf8"));
    printResult({ ok: true, action: "hash", path: planPath, hash }, asJson);
    return 0;
  }

  cliUsage();
  return 2;
}

module.exports = {
  SCHEMA_VERSION,
  validate,
  parseSafely,
  hashPlan,
  checkDrift,
  readContractFile,
  findScopeReductionPhrases,
};

if (require.main === module) {
  process.exit(main(process.argv));
}
