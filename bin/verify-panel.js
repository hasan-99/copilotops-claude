#!/usr/bin/env node
// verify-panel.js — deterministic aggregator for the verifier panel + skeptics.
//
// WHY: a single LLM judge is adversarially fragile — a lone stray token can
// swing it (~35% false positives in the lit). R8 replaces single-pass verify
// with (a) a PANEL of verifiers each scoring one lens (correctness / security /
// performance / design) and (b) per-finding adversarial SKEPTICS that vote on
// whether each finding is real. This module is the part that must NOT be a vibe:
// it dedupes the panel's findings, applies majority-survives over the skeptic
// votes, and computes the verdict + scores with the rules/grounding.md formula.
// Same inputs → same verdict.
//
// Input (panel JSON the skill assembles from agent outputs):
//   {
//     "phase": 2,
//     "lenses": ["correctness","security","performance","design"],
//     "findings": [
//       { "lens":"security", "file":"lib/auth.ts", "line":42,
//         "severity":"CRITICAL", "title":"service_role reachable client-side",
//         "votes": { "real": 2, "notReal": 1 } }
//     ]
//   }
//
// Exit 0 = PASS, 1 = FAIL, 2 = invocation error.
// Zero npm dependencies. Library + CLI.

const fs = require("fs");
const path = require("path");

const SEVERITY_WEIGHT = { CRITICAL: 8, HIGH: 4, MEDIUM: 2, LOW: 1 };
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function normSeverity(s) {
  const up = String(s || "").toUpperCase();
  return SEVERITY_WEIGHT[up] != null ? up : "LOW";
}

function slug(title) {
  return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 48);
}

function findingKey(f) {
  const file = String(f.file || "").replace(/\\/g, "/");
  const line = f.line != null ? f.line : "";
  return `${file}:${line}:${slug(f.title)}`;
}

// Merge findings that point at the same file:line:title (e.g. the correctness
// AND security lens both flagged it). Keep the highest severity, union the
// lenses, and sum the skeptic votes so the merged finding is judged once.
function dedupeFindings(findings) {
  const byKey = new Map();
  for (const raw of findings || []) {
    const f = {
      file: raw.file || null,
      line: raw.line != null ? raw.line : null,
      title: raw.title || "",
      severity: normSeverity(raw.severity),
      lenses: raw.lens ? [raw.lens] : (Array.isArray(raw.lenses) ? raw.lenses.slice() : []),
      votes: {
        real: Number((raw.votes && raw.votes.real) || 0),
        notReal: Number((raw.votes && raw.votes.notReal) || 0),
      },
    };
    const key = findingKey(f);
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, f); continue; }
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[prev.severity]) prev.severity = f.severity;
    for (const l of f.lenses) if (!prev.lenses.includes(l)) prev.lenses.push(l);
    prev.votes.real += f.votes.real;
    prev.votes.notReal += f.votes.notReal;
  }
  return [...byKey.values()];
}

// Majority-survives: a finding is KILLED only when the skeptics who voted are a
// strict majority calling it not-real. With no votes recorded it survives
// (unverified ≠ disproven — verification stays conservative).
function survives(finding) {
  const r = finding.votes.real;
  const n = finding.votes.notReal;
  if (r + n === 0) return true;
  return !(n > r);
}

function scoreFromCounts(counts) {
  const ws =
    counts.CRITICAL * SEVERITY_WEIGHT.CRITICAL +
    counts.HIGH * SEVERITY_WEIGHT.HIGH +
    counts.MEDIUM * SEVERITY_WEIGHT.MEDIUM +
    counts.LOW * SEVERITY_WEIGHT.LOW;
  return Math.max(1, 5 - Math.floor(ws / 8));
}

function emptyCounts() {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
}

function aggregate(panel) {
  const deduped = dedupeFindings(panel.findings || []);
  const surviving = [];
  const killed = [];
  for (const f of deduped) {
    (survives(f) ? surviving : killed).push({ ...f, verified: f.votes.real + f.votes.notReal > 0 });
  }

  const counts = emptyCounts();
  const perLens = {};
  for (const lens of panel.lenses || []) perLens[lens] = emptyCounts();
  for (const f of surviving) {
    counts[f.severity]++;
    for (const lens of f.lenses) {
      if (!perLens[lens]) perLens[lens] = emptyCounts();
      perLens[lens][f.severity]++;
    }
  }

  // A surviving CRITICAL or HIGH fails the phase (rules/grounding.md severity).
  const verdict = counts.CRITICAL === 0 && counts.HIGH === 0 ? "PASS" : "FAIL";
  const perLensScores = {};
  for (const [lens, c] of Object.entries(perLens)) perLensScores[lens] = scoreFromCounts(c);

  return {
    ok: verdict === "PASS",
    verdict,
    phase: panel.phase != null ? panel.phase : null,
    counts,
    score: scoreFromCounts(counts),
    per_lens_scores: perLensScores,
    surviving,
    killed,
    totals: { findings: deduped.length, surviving: surviving.length, killed: killed.length },
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
    "  verify-panel.js <panel.json> [--json] [--write] [--cwd DIR]",
    "",
    "Aggregates panel findings + skeptic votes → deterministic verdict.",
    "Exit 0 = PASS, 1 = FAIL, 2 = invocation error.",
  ].join("\n"));
}

function toMarkdown(r) {
  const lines = [];
  lines.push(`# Verifier Panel — phase ${r.phase}`);
  lines.push("");
  lines.push(`result: ${r.verdict}`);
  lines.push(`score: ${r.score}/5`);
  lines.push(`findings: ${r.totals.surviving} surviving / ${r.totals.killed} killed by skeptics`);
  lines.push("");
  lines.push(`Severity (surviving): CRITICAL ${r.counts.CRITICAL} · HIGH ${r.counts.HIGH} · MEDIUM ${r.counts.MEDIUM} · LOW ${r.counts.LOW}`);
  lines.push("");
  if (r.surviving.length) {
    lines.push("## Surviving findings");
    for (const f of r.surviving) {
      const where = f.file ? `${f.file}${f.line != null ? `:${f.line}` : ""}` : "(no location)";
      lines.push(`- **[${f.severity}]** ${f.title} — ${where} _(lens: ${f.lenses.join(", ") || "?"}; votes ${f.votes.real}✓/${f.votes.notReal}✗)_`);
    }
    lines.push("");
  }
  if (r.killed.length) {
    lines.push("## Killed by skeptics (majority not-real)");
    for (const f of r.killed) {
      const where = f.file ? `${f.file}${f.line != null ? `:${f.line}` : ""}` : "(no location)";
      lines.push(`- ~~[${f.severity}] ${f.title}~~ — ${where} _(votes ${f.votes.real}✓/${f.votes.notReal}✗)_`);
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

// Assemble per-lens finding files (.planning/phase-{N}-panel-{lens}.json, each
// an array of {file,line,severity,title}) into one panel.json — findings tagged
// with their lens, votes zeroed for the skeptic pass to fill. Deterministic so
// the orchestrator never hand-builds the panel skeleton.
function assemble(root, phase) {
  const dir = path.join(root, ".planning");
  const re = new RegExp(`^phase-${phase}-panel-([a-z]+)\\.json$`);
  const lenses = [];
  const findings = [];
  let files = [];
  try { files = fs.readdirSync(dir); } catch { files = []; }
  for (const f of files.sort()) {
    const m = f.match(re);
    if (!m) continue;
    const lens = m[1];
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    lenses.push(lens);
    for (const item of arr) {
      findings.push({
        lens,
        file: item.file || null,
        line: item.line != null ? item.line : null,
        severity: item.severity || "LOW",
        title: item.title || "",
        votes: { real: 0, notReal: 0 },
      });
    }
  }
  return { phase: Number(phase), lenses, findings };
}

function main(argv) {
  // assemble subcommand: verify-panel.js assemble <phase> [--cwd DIR]
  if (argv[2] === "assemble") {
    const sub = parseArgs(["", "", ...argv.slice(3)]);
    const phase = sub._[0];
    if (phase == null) { usage(); return 2; }
    const root = path.resolve(sub.cwd || process.cwd());
    const panel = assemble(root, phase);
    const out = path.join(root, ".planning", `phase-${phase}-panel.json`);
    try {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(panel, null, 2) + "\n");
    } catch (e) {
      console.error(`ERROR: could not write ${out}: ${e.message}`);
      return 2;
    }
    console.log(`assembled ${panel.findings.length} finding(s) from ${panel.lenses.length} lens file(s) → ${path.relative(root, out)}`);
    return 0;
  }

  const args = parseArgs(argv);
  const panelPath = args._[0];
  if (!panelPath || panelPath === "-h" || panelPath === "--help") { usage(); return 2; }
  const root = path.resolve(args.cwd || process.cwd());

  let panel;
  try {
    panel = JSON.parse(fs.readFileSync(path.resolve(root, panelPath), "utf8"));
  } catch (e) {
    console.error(`ERROR: cannot read panel JSON: ${e.message}`);
    return 2;
  }

  const result = aggregate(panel);

  if (args.write && result.phase != null) {
    const dir = path.join(root, ".planning");
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `phase-${result.phase}-verification-panel.json`), JSON.stringify(result, null, 2) + "\n");
      fs.writeFileSync(path.join(dir, `phase-${result.phase}-verification-panel.md`), toMarkdown(result));
    } catch (e) {
      console.error(`WARN: could not write panel artifacts: ${e.message}`);
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`PANEL ${result.verdict} phase ${result.phase}: ` +
      `${result.totals.surviving} surviving (${result.counts.CRITICAL}C/${result.counts.HIGH}H/${result.counts.MEDIUM}M/${result.counts.LOW}L), ` +
      `${result.totals.killed} killed by skeptics, score ${result.score}/5`);
    if (!result.ok) for (const f of result.surviving) {
      if (f.severity === "CRITICAL" || f.severity === "HIGH") {
        console.log(`  [${f.severity}] ${f.title} — ${f.file || "?"}${f.line != null ? `:${f.line}` : ""}`);
      }
    }
  }
  return result.ok ? 0 : 1;
}

module.exports = {
  dedupeFindings,
  survives,
  scoreFromCounts,
  aggregate,
  assemble,
  SEVERITY_WEIGHT,
};

if (require.main === module) {
  process.exit(main(process.argv));
}
