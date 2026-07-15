#!/usr/bin/env node
// repo-map.js — a cheap, deterministic symbol map of a codebase. The zero-dep
// answer to Aider's tree-sitter repo-map (R18): give /qualia-map (and any agent
// onboarding to a brownfield repo) the STRUCTURE — every file's top-level
// symbols — without reading whole files. Grounds the scan; cuts token cost.
//
// Not a parser: language-aware regexes over top-level (column-0) declarations.
// Good enough to answer "what's in this repo and where" — exports, functions,
// classes, types — ranked by symbol density so the busiest files surface first.
//
// Usage:
//   repo-map.js [dir]                 # human tree (default cwd)
//   repo-map.js [dir] --json          # machine output
//   repo-map.js [dir] --max-files N   # cap files shown (default 60)
//
// Exit: 0 = ran, 2 = bad invocation / dir missing. Zero deps.

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  ".git", "node_modules", "dist", "build", ".next", "out", "coverage", "vendor",
  ".venv", "venv", "__pycache__", ".turbo", ".cache", "target", "bin/obj",
  ".pytest_cache", ".mypy_cache", ".gradle", "Pods", ".terraform",
]);

// Per-extension symbol extractors. Each regex captures the symbol name in a
// named-or-numbered group; `kind` labels it. Anchored to line start (top-level).
const EXTRACTORS = {
  js: jsLike, jsx: jsLike, ts: jsLike, tsx: jsLike, mjs: jsLike, cjs: jsLike,
  py: py, go: go, rs: rs, rb: rb, java: java, php: php,
};

function scanLines(content, rules) {
  const out = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { re, kind } of rules) {
      const m = line.match(re);
      if (m) {
        out.push({ kind, name: m[m.length - 1], line: i + 1 });
        break;
      }
    }
  }
  return out;
}

function jsLike(c) {
  return scanLines(c, [
    { re: /^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/, kind: "fn" },
    { re: /^export\s+(?:default\s+)?class\s+(\w+)/, kind: "class" },
    { re: /^export\s+(?:abstract\s+)?(?:interface|type|enum)\s+(\w+)/, kind: "type" },
    { re: /^export\s+(?:const|let|var)\s+(\w+)/, kind: "const" },
    { re: /^(?:async\s+)?function\s+(\w+)/, kind: "fn" },
    { re: /^class\s+(\w+)/, kind: "class" },
    { re: /^(?:export\s+)?default\s+class\s+(\w+)/, kind: "class" },
  ]);
}
function py(c) {
  return scanLines(c, [
    { re: /^(?:async\s+)?def\s+(\w+)/, kind: "fn" },
    { re: /^class\s+(\w+)/, kind: "class" },
  ]);
}
function go(c) {
  return scanLines(c, [
    { re: /^func\s+\([^)]*\)\s+(\w+)/, kind: "method" },
    { re: /^func\s+(\w+)/, kind: "fn" },
    { re: /^type\s+(\w+)/, kind: "type" },
  ]);
}
function rs(c) {
  return scanLines(c, [
    { re: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, kind: "fn" },
    { re: /^(?:pub\s+)?struct\s+(\w+)/, kind: "struct" },
    { re: /^(?:pub\s+)?enum\s+(\w+)/, kind: "enum" },
    { re: /^(?:pub\s+)?trait\s+(\w+)/, kind: "trait" },
  ]);
}
function rb(c) {
  return scanLines(c, [
    { re: /^\s*def\s+([\w.?!]+)/, kind: "fn" },
    { re: /^\s*class\s+(\w+)/, kind: "class" },
    { re: /^\s*module\s+(\w+)/, kind: "module" },
  ]);
}
function java(c) {
  return scanLines(c, [
    { re: /^\s*(?:public|private|protected)?\s*(?:abstract\s+)?class\s+(\w+)/, kind: "class" },
    { re: /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:interface|enum)\s+(\w+)/, kind: "type" },
  ]);
}
function php(c) {
  return scanLines(c, [
    { re: /^\s*(?:abstract\s+)?class\s+(\w+)/, kind: "class" },
    { re: /^\s*function\s+(\w+)/, kind: "fn" },
    { re: /^\s*(?:interface|trait)\s+(\w+)/, kind: "type" },
  ]);
}

function walk(root, max) {
  const results = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".") {
        if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      }
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name)) continue;
        stack.push(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).slice(1).toLowerCase();
        const extract = EXTRACTORS[ext];
        if (!extract) continue;
        let content;
        try {
          content = fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        if (content.length > 2 * 1024 * 1024) continue; // skip huge/minified
        const symbols = extract(content);
        if (symbols.length) results.push({ file: path.relative(root, full), symbols });
      }
    }
    if (results.length > 5000) break; // hard backstop
  }
  // Busiest files first — the structural backbone surfaces at the top.
  results.sort((a, b) => b.symbols.length - a.symbols.length || a.file.localeCompare(b.file));
  void max;
  return results;
}

function parseArgs(argv) {
  const opts = { dir: ".", json: false, maxFiles: 60 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--max-files") opts.maxFiles = Math.max(1, parseInt(argv[++i], 10) || 60);
    else if (a === "-h" || a === "--help") opts.help = true;
    else opts.dir = a;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write("repo-map.js [dir] [--json] [--max-files N]\n");
    process.exit(0);
  }
  const root = path.resolve(opts.dir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    process.stderr.write(`repo-map.js: not a directory: ${opts.dir}\n`);
    process.exit(2);
  }
  const files = walk(root, opts.maxFiles);
  const totalSymbols = files.reduce((n, f) => n + f.symbols.length, 0);

  if (opts.json) {
    console.log(JSON.stringify({ root, total_files: files.length, total_symbols: totalSymbols, files: files.slice(0, opts.maxFiles) }, null, 2));
    process.exit(0);
  }

  console.log(`repo-map: ${files.length} source file${files.length === 1 ? "" : "s"}, ${totalSymbols} top-level symbols`);
  if (files.length > opts.maxFiles) console.log(`(showing the ${opts.maxFiles} densest; pass --max-files to widen)`);
  for (const f of files.slice(0, opts.maxFiles)) {
    console.log(`\n${f.file}  (${f.symbols.length})`);
    for (const s of f.symbols.slice(0, 24)) {
      console.log(`  ${s.kind.padEnd(6)} ${s.name}  :${s.line}`);
    }
    if (f.symbols.length > 24) console.log(`  … +${f.symbols.length - 24} more`);
  }
  process.exit(0);
}

main();
