#!/usr/bin/env node
// recall.js — the read side of Qualia memory. Unified recall across the two
// memory stores so an agent (or /qualia-recall) gets ONE answer, not two:
//
//   1. knowledge layer  — ~/.claude/knowledge/ (via knowledge.js, the canonical
//                          loader; we delegate so new files stay discoverable)
//   2. qualia-memory     — QUALIA_MEMORY_ROOT/wiki, the Obsidian LLM Wiki, the
//                          team's curated cross-project lessons
//
// Symmetric counterpart to /qualia-learn (write). Zero deps — shells out to
// knowledge.js and grep, same posture as state.js / memory-mcp/server.js.
//
// Usage:
//   recall.js <query...>                 # human digest across both stores
//   recall.js <query> --json             # machine output
//   recall.js <query> --scope knowledge  # one store only (knowledge | vault | all)
//   recall.js <query> --max 20           # cap hits per store (default 50)
//
// Exit: 0 = ran (even with zero hits), 2 = bad invocation.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveRole, loadDenyMatchers, isDenied } = require("./vault-access.js");

// ─── Store resolution ───────────────────────────────────────────────────────
// Mirror knowledge.js's home resolution so a temp QUALIA_HOME (tests) lines up.
function qualiaHome() {
  if (process.env.QUALIA_HOME) return process.env.QUALIA_HOME;
  const parent = path.basename(path.dirname(__dirname));
  if (parent === ".codex" || parent === ".claude") return path.dirname(__dirname);
  return path.join(os.homedir(), ".claude");
}
const KNOWLEDGE_JS = path.join(__dirname, "knowledge.js");
const VAULT_ROOT = process.env.QUALIA_MEMORY_ROOT || path.join(os.homedir(), "qualia-memory");
const WIKI = path.join(VAULT_ROOT, "wiki");

// Vault access control lives in vault-access.js (shared with the memory MCP) so
// the OWNER_ONLY / CONDITIONAL rule has exactly one implementation.

// ─── Knowledge layer (delegate to knowledge.js — single source of truth) ─────
// knowledge.js prints `relpath:line: text` per hit, or a `(no matches…)` /
// `(knowledge layer not initialized)` sentinel line. We parse the hit shape and
// drop the sentinels.
function searchKnowledge(query, max) {
  const r = spawnSync(process.env.NODE || "node", [KNOWLEDGE_JS, "search", query], {
    encoding: "utf8",
    timeout: 10000,
  });
  if (r.status !== 0 && !r.stdout) return [];
  const hits = [];
  for (const line of (r.stdout || "").split("\n")) {
    const m = line.match(/^(.+?):(\d+):\s?(.*)$/);
    if (!m) continue; // sentinel or blank
    hits.push({ store: "knowledge", file: m[1], line: Number(m[2]), snippet: m[3].trim() });
    if (hits.length >= max) break;
  }
  return hits;
}

// ─── Vault (grep over wiki — mirrors mcp/memory-mcp/server.js) ───────────────
function searchVault(query, max, role) {
  if (!fs.existsSync(WIKI)) return [];
  const r = spawnSync(
    "grep",
    ["-rniF", "--include=*.md", "--include=*.txt", "--include=*.canvas", "--include=*.base", "--", query, WIKI],
    { encoding: "utf8", timeout: 10000 }
  );
  // grep exit 1 = no matches (not an error); >1 = real error.
  if (r.status !== 0 && r.status !== 1) return [];
  // Non-OWNER roles get OWNER_ONLY / CONDITIONAL vault paths filtered out.
  const matchers = role === "OWNER" ? null : loadDenyMatchers(WIKI);
  const hits = [];
  for (const line of (r.stdout || "").split("\n")) {
    if (!line) continue;
    const m = line.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    const rel = path.relative(WIKI, m[1]) || path.basename(m[1]);
    // Compare against VAULT-ROOT-relative path, the manifest's frame of reference.
    if (matchers && isDenied(path.join("wiki", rel).split(path.sep).join("/"), matchers)) continue;
    hits.push({ store: "vault", file: rel, line: Number(m[2]), snippet: m[3].trim() });
    if (hits.length >= max) break;
  }
  return hits;
}

// ─── Rank: group by file, busiest file first, lines in order within a file ───
function rankByFile(hits) {
  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  return [...byFile.entries()]
    .map(([file, hs]) => ({ file, count: hs.length, hits: hs.sort((a, b) => a.line - b.line) }))
    .sort((a, b) => b.count - a.count);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { json: false, scope: "all", max: 50, terms: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--scope") opts.scope = (argv[++i] || "").toLowerCase();
    else if (a === "--max") opts.max = Math.max(1, parseInt(argv[++i], 10) || 50);
    else if (a === "-h" || a === "--help") opts.help = true;
    else opts.terms.push(a);
  }
  return opts;
}

function usage() {
  process.stderr.write(
    "recall.js — unified recall across the knowledge layer + qualia-memory vault\n\n" +
      "  recall.js <query...> [--scope all|knowledge|vault] [--json] [--max N]\n"
  );
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    process.exit(0);
  }

  // OWNER-only command. The curated cross-project memory recall is the OWNER's
  // surface; employees still have the read-only memory MCP for ALL_ROLES wiki
  // content. Deterministic gate — not just a prose note. Exit 3 = forbidden.
  const role = resolveRole(qualiaHome());
  if (role !== "OWNER") {
    process.stderr.write(
      "/qualia-recall is OWNER-only. Ask Fawzi if you need a cross-project lookup.\n"
    );
    process.exit(3);
  }

  const query = opts.terms.join(" ").trim();
  if (!query) {
    usage();
    process.exit(2);
  }
  if (!["all", "knowledge", "vault"].includes(opts.scope)) {
    process.stderr.write(`recall.js: invalid --scope '${opts.scope}' (use all|knowledge|vault)\n`);
    process.exit(2);
  }

  const knowledge = opts.scope === "vault" ? [] : searchKnowledge(query, opts.max);
  const vault = opts.scope === "knowledge" ? [] : searchVault(query, opts.max, role);
  const total = knowledge.length + vault.length;

  if (opts.json) {
    console.log(
      JSON.stringify(
        { query, scope: opts.scope, role, total, knowledge: rankByFile(knowledge), vault: rankByFile(vault) },
        null,
        2
      )
    );
    process.exit(0);
  }

  // Human digest.
  console.log(`recall "${query}" — ${total} hit${total === 1 ? "" : "s"} (knowledge: ${knowledge.length}, vault: ${vault.length})${role !== "OWNER" ? ` · role ${role}: OWNER-only vault paths hidden` : ""}`);
  const section = (label, hits) => {
    if (!hits.length) return;
    console.log(`\n${label}`);
    for (const grp of rankByFile(hits)) {
      console.log(`  ${grp.file} (${grp.count})`);
      for (const h of grp.hits.slice(0, 5)) {
        const snip = h.snippet.length > 120 ? h.snippet.slice(0, 117) + "…" : h.snippet;
        console.log(`    L${h.line}: ${snip}`);
      }
    }
  };
  section("Knowledge layer (~/.claude/knowledge/)", knowledge);
  section("Vault (qualia-memory/wiki/)", vault);
  if (total === 0) console.log("\n(no matches — try a broader term, or check the vault/knowledge layer exists)");
  process.exit(0);
}

main();
