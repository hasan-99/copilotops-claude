#!/usr/bin/env node
// eval-runner.js — layered assertion engine for AI features (chat / RAG / voice).
//
// WHY: Qualia gates UI and code (contract-runner, slop-detect, verify-panel) but
// has no equivalent for the AI artifacts it BUILDS. "The chatbot answers refund
// questions" is not checkable by a grep. This runs a suite of cases against
// captured AI outputs with LAYERED assertions: cheap deterministic checks first
// (contains / regex / json_path / length / latency / cost), then llm_rubric for
// the judgments only a model can make — same shape as contract-runner evidence.
//
// Deterministic-first by design: every assertion this module can settle WITHOUT
// a model, it settles here. `llm_rubric` assertions carry a `verdict`
// (pass|fail) that the /qualia-eval skill fills by spawning a judge BEFORE
// calling this runner — exactly how verify-panel consumes skeptic votes. An
// llm_rubric with no verdict is PENDING and fails the suite (never silently
// passes an unjudged rubric).
//
// Suite (JSON — zero-dependency; no YAML parser pulled in):
//   {
//     "feature": "support-chat",
//     "cases": [
//       { "name": "refund window",
//         "input": "what's your refund policy?",
//         "output": "We refund within 30 days...",   // or "output_file": "path"
//         "latency_ms": 1200, "cost_usd": 0.008,
//         "assert": [
//           { "type": "contains", "value": "30 days" },
//           { "type": "not_contains", "value": "I cannot help" },
//           { "type": "max_latency_ms", "value": 2000 },
//           { "type": "llm_rubric", "rubric": "grounded in policy, no hallucination", "verdict": "pass" }
//         ] } ] }
//
// Exit 0 = all cases pass, 1 = a failure or an unjudged rubric, 2 = bad input.
// Zero npm dependencies. Library + CLI.

const fs = require("fs");
const path = require("path");

function getPath(obj, dotted) {
  const parts = String(dotted).split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    const idx = /^\d+$/.test(p) ? Number(p) : p;
    cur = cur[idx];
  }
  return cur;
}

function safeRegex(src) {
  try { return new RegExp(src); } catch { return null; }
}

// Run one assertion against a case's captured output + metrics.
// Returns { ok, detail }.
function runAssertion(a, ctx) {
  const out = ctx.output != null ? String(ctx.output) : "";
  switch (a.type) {
    case "contains":
      return { ok: out.includes(String(a.value)), detail: `contains "${a.value}"` };
    case "not_contains":
      return { ok: !out.includes(String(a.value)), detail: `not_contains "${a.value}"` };
    case "equals":
      return { ok: out === String(a.value), detail: `equals "${a.value}"` };
    case "regex": {
      const re = safeRegex(a.value);
      if (!re) return { ok: false, detail: `invalid regex: ${a.value}` };
      return { ok: re.test(out), detail: `regex /${a.value}/` };
    }
    case "not_regex": {
      const re = safeRegex(a.value);
      if (!re) return { ok: false, detail: `invalid regex: ${a.value}` };
      return { ok: !re.test(out), detail: `not_regex /${a.value}/` };
    }
    case "min_length":
      return { ok: out.length >= Number(a.value), detail: `min_length ${a.value} (got ${out.length})` };
    case "max_length":
      return { ok: out.length <= Number(a.value), detail: `max_length ${a.value} (got ${out.length})` };
    case "json_valid":
      try { JSON.parse(out); return { ok: true, detail: "json_valid" }; }
      catch { return { ok: false, detail: "output is not valid JSON" }; }
    case "json_path": {
      let parsed;
      try { parsed = JSON.parse(out); } catch { return { ok: false, detail: "json_path: output not JSON" }; }
      const val = getPath(parsed, a.path);
      if (val === undefined) return { ok: false, detail: `json_path ${a.path}: missing` };
      if (a.equals !== undefined) return { ok: String(val) === String(a.equals), detail: `json_path ${a.path} equals "${a.equals}" (got "${val}")` };
      if (a.contains !== undefined) return { ok: String(val).includes(String(a.contains)), detail: `json_path ${a.path} contains "${a.contains}"` };
      return { ok: true, detail: `json_path ${a.path} present` };
    }
    case "max_latency_ms":
      if (ctx.latency_ms == null) return { ok: false, detail: "max_latency_ms: no latency_ms recorded on case" };
      return { ok: Number(ctx.latency_ms) <= Number(a.value), detail: `max_latency_ms ${a.value} (got ${ctx.latency_ms})` };
    case "max_cost_usd":
      if (ctx.cost_usd == null) return { ok: false, detail: "max_cost_usd: no cost_usd recorded on case" };
      return { ok: Number(ctx.cost_usd) <= Number(a.value), detail: `max_cost_usd ${a.value} (got ${ctx.cost_usd})` };
    case "llm_rubric": {
      const v = a.verdict != null ? String(a.verdict).toLowerCase() : null;
      if (v === null) return { ok: false, pending: true, detail: `llm_rubric PENDING (no judge verdict): "${a.rubric}"` };
      return { ok: v === "pass", detail: `llm_rubric "${a.rubric}" → ${v}` };
    }
    default:
      return { ok: false, detail: `unknown assertion type: ${a.type}` };
  }
}

function resolveOutput(root, c) {
  if (c.output != null) return c.output;
  if (c.output_file) {
    try { return fs.readFileSync(path.resolve(root, c.output_file), "utf8"); }
    catch (e) { return { __error: `output_file unreadable: ${e.message}` }; }
  }
  return "";
}

function run(suite, opts = {}) {
  const root = path.resolve(opts.cwd || process.cwd());
  const cases = [];
  let pending = 0;
  for (const c of suite.cases || []) {
    const output = resolveOutput(root, c);
    const ctx = { output: (output && output.__error) ? "" : output, latency_ms: c.latency_ms, cost_usd: c.cost_usd };
    const assertions = [];
    if (output && output.__error) {
      assertions.push({ type: "output", ok: false, detail: output.__error });
    }
    for (const a of c.assert || []) {
      const r = runAssertion(a, ctx);
      if (r.pending) pending++;
      assertions.push({ type: a.type, ok: !!r.ok, pending: !!r.pending, detail: r.detail });
    }
    const ok = assertions.length > 0 && assertions.every((x) => x.ok);
    cases.push({ name: c.name || "(unnamed)", ok, assertions });
  }
  const passed = cases.filter((c) => c.ok).length;
  return {
    ok: cases.length > 0 && passed === cases.length,
    feature: suite.feature || "(unnamed feature)",
    total_cases: cases.length,
    passed_cases: passed,
    failed_cases: cases.length - passed,
    pending,
    cases,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--write") args.write = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.error([
    "Usage:",
    "  eval-runner.js <suite.json> [--json] [--write] [--cwd DIR]",
    "",
    "Layered assertion runner for AI-feature eval suites.",
    "Exit 0 = all cases pass, 1 = failure/unjudged rubric, 2 = invocation error.",
  ].join("\n"));
}

function main(argv) {
  const args = parseArgs(argv);
  const suitePath = args._[0];
  if (!suitePath || suitePath === "-h" || suitePath === "--help") { usage(); return 2; }
  const root = path.resolve(args.cwd || process.cwd());

  let suite;
  try {
    suite = JSON.parse(fs.readFileSync(path.resolve(root, suitePath), "utf8"));
  } catch (e) {
    console.error(`ERROR: cannot read eval suite: ${e.message}`);
    return 2;
  }

  const result = run(suite, { cwd: root });

  if (args.write) {
    const dir = path.join(root, ".planning", "evals");
    try {
      fs.mkdirSync(dir, { recursive: true });
      const slug = String(result.feature).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      fs.writeFileSync(path.join(dir, `eval-${slug || "feature"}.json`), JSON.stringify(result, null, 2) + "\n");
    } catch (e) {
      console.error(`WARN: could not write eval artifact: ${e.message}`);
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }

  console.log(`EVAL ${result.ok ? "PASS" : "FAIL"} [${result.feature}]: ` +
    `${result.passed_cases}/${result.total_cases} cases` +
    (result.pending ? ` (${result.pending} rubric(s) unjudged)` : ""));
  for (const c of result.cases) {
    if (c.ok) continue;
    console.log(`  ✗ ${c.name}`);
    for (const a of c.assertions) if (!a.ok) console.log(`      - ${a.detail}`);
  }
  return result.ok ? 0 : 1;
}

module.exports = { run, runAssertion, getPath };

if (require.main === module) {
  process.exit(main(process.argv));
}
