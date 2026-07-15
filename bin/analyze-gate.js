#!/usr/bin/env node
// analyze-gate.js — cross-artifact consistency + coverage gate (Spec-Kit's
// most-copied feature). Runs BETWEEN plan and build: diffs the plan contract
// against the scope's acceptance criteria and the CONTEXT.md glossary, and
// flags requirements the plan under-covers plus contradictions it introduces.
//
// WHY: Qualia validates each artifact in isolation — plan-contract.js proves the
// contract is internally well-formed, harness-eval scores the built phase — but
// nothing diffs scope ↔ plan. That's exactly where a junior's idea silently
// loses intent: the scope asks for X, the plan quietly drops it, and no
// deterministic check notices. This is that check.
//
// DETERMINISTIC: keyword/token coverage, not an LLM. Same inputs → same output.
// Heuristic by nature (token overlap), so it is a *flag-for-review* gate: the
// caller decides hard-block (strict profile) vs advisory (standard). Exit 0 =
// clean, 1 = findings, 2 = invocation error.
//
// Inputs (auto-discovered from --phase, or passed explicitly):
//   contract  .planning/phase-{N}-contract.json   (required)
//   scope     .planning/phase-{N}-context.md       (optional)
//   context   .planning/CONTEXT.md                 (optional, glossary)
//
// Zero npm dependencies. Library + CLI.

const fs = require("fs");
const path = require("path");
const pc = require("./plan-contract.js");

// Tokens shorter than this, or in the stop list, carry no coverage signal.
const MIN_TOKEN_LEN = 4;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "you",
  "are", "was", "were", "will", "shall", "should", "must", "when", "then",
  "each", "every", "any", "all", "not", "but", "via", "per", "page", "user",
  "users", "data", "system", "feature", "support", "able", "ensure", "show",
  "display", "have", "has", "can", "its", "their", "they", "them", "which",
  "where", "what", "who", "how", "use", "uses", "used", "using", "new",
]);

// A requirement is "covered" when at least this fraction of its significant
// tokens appear somewhere in the plan corpus, OR ABS_OVERLAP distinct tokens do.
const COVERAGE_RATIO = 0.5;
const ABS_OVERLAP = 3;

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

function significantTokens(text) {
  return new Set(tokenize(text));
}

// covered ⇔ ≥COVERAGE_RATIO of the requirement's tokens are in the corpus, or
// ≥ABS_OVERLAP of them are. Requirements with no significant tokens are treated
// as covered (nothing to match — e.g. a one-word "Works.").
function coverage(reqText, corpusTokenSet) {
  const reqTokens = [...significantTokens(reqText)];
  if (reqTokens.length === 0) return { covered: true, overlap: 0, total: 0, ratio: 1 };
  const overlap = reqTokens.filter((t) => corpusTokenSet.has(t)).length;
  const ratio = overlap / reqTokens.length;
  return {
    covered: ratio >= COVERAGE_RATIO || overlap >= ABS_OVERLAP,
    overlap,
    total: reqTokens.length,
    ratio,
  };
}

// ── Scope parsing ───────────────────────────────────────────────────────
// Pull the bullets under "## Acceptance Criteria" (testable observables) from a
// phase-context / scope markdown file. Bullets look like "- AC1 — {criterion}"
// or plain "- {criterion}". Stops at the next "## " heading.
function parseScopeAcceptanceCriteria(md) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = /^##\s+Acceptance Criteria/i.test(line);
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (!m) continue;
    // Strip a leading "AC12 —"/"AC12:"/"AC12 -" label so it isn't matched as a token.
    const text = m[1].replace(/^AC\d+\s*[—:\-]\s*/i, "").trim();
    if (text) out.push(text);
  }
  return out;
}

// Pull "Avoid:" aliases from CONTEXT.md glossary lines. The glossary bans
// alternative terms ("**Avoid:** AuthUser vs Customer"); using a banned alias in
// the plan is a genuine, deterministic cross-artifact contradiction.
function parseGlossaryBannedTerms(md) {
  if (!md) return [];
  const banned = new Set();
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/\*{0,2}Avoid:?\*{0,2}\s*(.+)$/i);
    if (!m) continue;
    // "AuthUser vs Customer (unless disambiguated)" → ["AuthUser", "Customer"]
    const body = m[1].replace(/\([^)]*\)/g, " ");
    for (const part of body.split(/\bvs\b|,|\/|;/i)) {
      const term = part.trim().replace(/[.*_`]/g, "");
      // Only meaningful identifier-like aliases (skip prose).
      if (/^[A-Za-z][A-Za-z0-9 _-]{2,}$/.test(term) && !STOPWORDS.has(term.toLowerCase())) {
        banned.add(term.trim());
      }
    }
  }
  return [...banned];
}

// ── Core analysis ─────────────────────────────────────────────────────────
function analyze({ contract, scopeMd, contextMd }) {
  const findings = [];

  const tasks = (contract && contract.tasks) || [];
  const successCriteria = (contract && contract.success_criteria) || [];

  // The plan corpus = everything the plan promises to do.
  const planText = [
    contract.goal,
    contract.why,
    ...successCriteria,
    ...tasks.map((t) => t.title),
    ...tasks.map((t) => t.action),
    ...tasks.flatMap((t) => t.acceptance_criteria || []),
  ].filter(Boolean).join("\n");
  const planTokens = significantTokens(planText);

  // Per-task corpora for success-criterion → task mapping.
  const taskCorpora = tasks.map((t) => ({
    id: t.id,
    tokens: significantTokens([t.title, t.action, ...(t.acceptance_criteria || [])].filter(Boolean).join("\n")),
  }));

  // 1. Scope acceptance criteria under-covered by the plan (the core check).
  const scopeACs = parseScopeAcceptanceCriteria(scopeMd);
  for (const ac of scopeACs) {
    const cov = coverage(ac, planTokens);
    if (!cov.covered) {
      findings.push({
        type: "uncovered-scope-ac",
        severity: "HIGH",
        message: `Scope acceptance criterion under-covered by the plan: "${ac}"`,
        detail: `${cov.overlap}/${cov.total} key terms found in the contract (need ≥${Math.ceil(cov.total * COVERAGE_RATIO)} or ${ABS_OVERLAP}). The plan may have dropped this requirement.`,
      });
    }
  }

  // 2. Contract success criteria with no task home (orphan requirement).
  for (const sc of successCriteria) {
    const best = taskCorpora
      .map((tc) => ({ id: tc.id, cov: coverage(sc, tc.tokens) }))
      .sort((a, b) => b.cov.ratio - a.cov.ratio)[0];
    if (!best || !best.cov.covered) {
      findings.push({
        type: "uncovered-success-criterion",
        severity: "MEDIUM",
        message: `Success criterion maps to no task: "${sc}"`,
        detail: "No task's title/action/acceptance-criteria covers this success criterion. Either a task is missing or the criterion is unowned.",
      });
    }
  }

  // 3. Glossary contradictions — a banned alias used in the plan text.
  const banned = parseGlossaryBannedTerms(contextMd);
  for (const term of banned) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(planText)) {
      findings.push({
        type: "glossary-violation",
        severity: "MEDIUM",
        message: `Plan uses a term CONTEXT.md bans: "${term}"`,
        detail: "The glossary lists this under Avoid:. Use the canonical term so spec, plan, and code agree.",
      });
    }
  }

  // 4. Scope-reduction phrases anywhere in the plan's free text (reuse the
  //    plan-contract scanner — surfaced here as part of the cross-artifact gate).
  for (const t of tasks) {
    const fields = [["action", t.action], ...(t.acceptance_criteria || []).map((a, i) => [`acceptance_criteria[${i}]`, a])];
    for (const [field, val] of fields) {
      const hits = pc.findScopeReductionPhrases(val);
      if (hits.length) {
        findings.push({
          type: "scope-reduction",
          severity: "HIGH",
          message: `Task ${t.id} ${field} contains scope-reduction language: ${hits.join(", ")}`,
          detail: "The plan waters down the spec. Deliver the actual requirement or split it via the locked-decision channel.",
        });
      }
    }
  }

  const bySeverity = (s) => findings.filter((f) => f.severity === s).length;
  return {
    ok: findings.length === 0,
    phase: contract.phase,
    counts: {
      total: findings.length,
      high: bySeverity("HIGH"),
      medium: bySeverity("MEDIUM"),
      scope_acs_checked: scopeACs.length,
      success_criteria_checked: successCriteria.length,
      glossary_terms_checked: banned.length,
    },
    scope_present: scopeMd != null,
    context_present: contextMd != null,
    findings,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function readMaybe(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else if (a.startsWith("--cwd=")) args.cwd = a.slice(6);
    else if (a === "--contract") args.contract = argv[++i];
    else if (a.startsWith("--contract=")) args.contract = a.slice(11);
    else if (a === "--scope") args.scope = argv[++i];
    else if (a.startsWith("--scope=")) args.scope = a.slice(8);
    else if (a === "--context") args.context = argv[++i];
    else if (a.startsWith("--context=")) args.context = a.slice(10);
    else if (a === "--phase") args.phase = argv[++i];
    else if (a.startsWith("--phase=")) args.phase = a.slice(8);
    else args._.push(a);
  }
  if (args.phase == null && args._.length && /^\d+$/.test(args._[0])) args.phase = args._[0];
  return args;
}

function usage() {
  console.error([
    "Usage:",
    "  analyze-gate.js <phase> [--cwd DIR] [--json]",
    "  analyze-gate.js --contract <c.json> [--scope <s.md>] [--context <ctx.md>] [--json]",
    "",
    "Cross-artifact coverage gate between plan and build.",
    "Exit 0 = clean, 1 = findings, 2 = invocation error.",
  ].join("\n"));
}

function main(argv) {
  const args = parseArgs(argv);
  const root = path.resolve(args.cwd || process.cwd());
  const planning = path.join(root, ".planning");

  let contractPath = args.contract;
  let scopePath = args.scope;
  let contextPath = args.context;
  if (!contractPath && args.phase != null) {
    contractPath = path.join(planning, `phase-${args.phase}-contract.json`);
    if (scopePath == null) scopePath = path.join(planning, `phase-${args.phase}-context.md`);
    if (contextPath == null) contextPath = path.join(planning, "CONTEXT.md");
  }
  if (!contractPath) { usage(); return 2; }

  const loaded = pc.readContractFile(contractPath);
  if (!loaded.ok) {
    if (args.json) console.log(JSON.stringify({ ok: false, ...loaded }, null, 2));
    else console.error(`${loaded.error}: ${loaded.message}`);
    return 2;
  }

  const result = analyze({
    contract: loaded.contract,
    scopeMd: scopePath ? readMaybe(scopePath) : null,
    contextMd: contextPath ? readMaybe(contextPath) : null,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }

  const c = result.counts;
  if (result.ok) {
    console.log(`ANALYZE PASS phase ${result.phase}: scope↔plan consistent ` +
      `(${c.scope_acs_checked} scope AC, ${c.success_criteria_checked} success criteria, ${c.glossary_terms_checked} glossary terms checked)`);
    if (!result.scope_present) console.log("  note: no scope file (phase-N-context.md) — scope-coverage check skipped");
    return 0;
  }

  console.error(`ANALYZE FINDINGS phase ${result.phase}: ${c.total} (${c.high} HIGH, ${c.medium} MEDIUM)`);
  if (!result.scope_present) console.error("  note: no scope file — scope-coverage check was skipped");
  for (const f of result.findings) {
    console.error(`  [${f.severity}] ${f.message}`);
    console.error(`         ${f.detail}`);
  }
  return 1;
}

module.exports = {
  analyze,
  coverage,
  tokenize,
  parseScopeAcceptanceCriteria,
  parseGlossaryBannedTerms,
};

if (require.main === module) {
  process.exit(main(process.argv));
}
