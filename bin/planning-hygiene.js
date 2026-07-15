#!/usr/bin/env node
// Scan and organize `.planning/` so project state stays navigable.

const fs = require("fs");
const path = require("path");

const ROOT_EXACT = new Set([
  "PROJECT.md",
  "PRODUCT.md",
  "DESIGN.md",
  "CONTEXT.md",
  "JOURNEY.md",
  "ROADMAP.md",
  "REQUIREMENTS.md",
  "STATE.md",
  "tracking.json",
  "project-discovery.md",
  "agent-runs.jsonl",
]);

const ROOT_PATTERNS = [
  /^phase-\d+(-gaps)?-plan\.md$/,
  /^phase-\d+-contract\.json$/,
  /^phase-\d+-verification\.md$/,
  /^phase-\d+-context\.md$/,
  /^phase-\d+-research\.md$/,
  /^phase-\d+-postmortem\.md$/,
  /^phase-\d+-deviations\.json$/,
];

const ALLOWED_DIRS = new Set([
  "archive",
  "assets",
  "agent-runs",
  "decisions",
  "design",
  "evidence",
  "reports",
  "research",
  "snapshots",
]);

function usage() {
  return `planning-hygiene.js — keep .planning organized

Usage:
  node planning-hygiene.js scan [--json] [--planning-dir .planning]
  node planning-hygiene.js organize --write [--planning-dir .planning]

scan is read-only. organize requires --write and only moves loose artifacts.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    command: args.find((arg) => !arg.startsWith("-")) || "scan",
    json: args.includes("--json"),
    write: args.includes("--write"),
    planningDir: ".planning",
  };

  const dirIndex = args.indexOf("--planning-dir");
  if (dirIndex !== -1 && args[dirIndex + 1]) {
    opts.planningDir = args[dirIndex + 1];
  }

  if (args.includes("-h") || args.includes("--help")) {
    opts.help = true;
  }

  return opts;
}

function isAllowedRootFile(name) {
  return ROOT_EXACT.has(name) || ROOT_PATTERNS.some((pattern) => pattern.test(name));
}

function routeForLooseFile(name) {
  if (/^DEBUG-\d{4}-\d{2}-\d{2}/.test(name)) return path.join("reports", "debug", name);
  if (/^FIX-\d{4}-\d{2}-\d{2}/.test(name)) return path.join("reports", "fix", name);
  if (name === "REVIEW.md" || /^REVIEW-/.test(name)) return path.join("reports", "review", name);
  if (name === "OPTIMIZE.md" || /^OPTIMIZE-/.test(name)) return path.join("reports", "optimize", name);
  if (/^REFACTOR-/.test(name)) return path.join("reports", "refactor", name);
  if (/^polish-critique-/.test(name)) return path.join("reports", "polish", name);
  if (/^vibe-after\./.test(name)) return path.join("assets", "vibe", name);
  if (name === "DESIGN-extracted.md") return path.join("design", name);
  return path.join("archive", "loose", name);
}

function listPlanningRoot(planningDir) {
  if (!fs.existsSync(planningDir)) {
    return { exists: false, entries: [] };
  }
  const entries = fs.readdirSync(planningDir, { withFileTypes: true })
    .filter((entry) => entry.name !== ".DS_Store")
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "dir" : "file",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { exists: true, entries };
}

function scan(planningDir) {
  const root = listPlanningRoot(planningDir);
  if (!root.exists) {
    return {
      ok: false,
      planning_dir: planningDir,
      status: "missing",
      loose: [],
      unknown_dirs: [],
      message: ".planning directory not found",
    };
  }

  const loose = [];
  const unknownDirs = [];

  for (const entry of root.entries) {
    if (entry.type === "dir") {
      if (!ALLOWED_DIRS.has(entry.name)) {
        unknownDirs.push({
          path: entry.name,
          suggested_path: path.join("archive", "loose", entry.name),
        });
      }
      continue;
    }

    if (!isAllowedRootFile(entry.name)) {
      loose.push({
        path: entry.name,
        suggested_path: routeForLooseFile(entry.name),
      });
    }
  }

  return {
    ok: loose.length === 0 && unknownDirs.length === 0,
    planning_dir: planningDir,
    status: loose.length === 0 && unknownDirs.length === 0 ? "clean" : "needs_organizing",
    loose,
    unknown_dirs: unknownDirs,
  };
}

function uniqueDestination(planningDir, relPath) {
  const parsed = path.parse(relPath);
  let candidate = relPath;
  let index = 2;
  while (fs.existsSync(path.join(planningDir, candidate))) {
    candidate = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

function moveEntry(planningDir, fromRel, toRel) {
  const from = path.join(planningDir, fromRel);
  const safeToRel = uniqueDestination(planningDir, toRel);
  const to = path.join(planningDir, safeToRel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  return safeToRel;
}

function organize(planningDir, write) {
  const result = scan(planningDir);
  if (!result.ok && result.status === "missing") {
    return result;
  }

  const moves = [];
  for (const item of [...result.loose, ...result.unknown_dirs]) {
    if (!write) {
      moves.push({ from: item.path, to: item.suggested_path, moved: false });
      continue;
    }
    const actual = moveEntry(planningDir, item.path, item.suggested_path);
    moves.push({ from: item.path, to: actual, moved: true });
  }

  return {
    ok: true,
    planning_dir: planningDir,
    status: write ? "organized" : "dry_run",
    moves,
  };
}

function printHuman(result) {
  if (result.status === "missing") {
    console.log(`planning hygiene: ${result.message}`);
    return;
  }

  if (result.status === "clean") {
    console.log(`planning hygiene: clean (${result.planning_dir})`);
    return;
  }

  if (result.moves) {
    console.log(`planning hygiene: ${result.status} (${result.moves.length} move${result.moves.length === 1 ? "" : "s"})`);
    for (const move of result.moves) {
      console.log(`  ${move.moved ? "moved" : "would move"} ${move.from} -> ${move.to}`);
    }
    return;
  }

  const count = result.loose.length + result.unknown_dirs.length;
  console.log(`planning hygiene: needs organizing (${count} item${count === 1 ? "" : "s"})`);
  for (const item of result.loose) {
    console.log(`  loose file ${item.path} -> ${item.suggested_path}`);
  }
  for (const item of result.unknown_dirs) {
    console.log(`  loose dir  ${item.path} -> ${item.suggested_path}`);
  }
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(usage());
    return 0;
  }

  let result;
  if (opts.command === "scan") {
    result = scan(opts.planningDir);
  } else if (opts.command === "organize" || opts.command === "fix") {
    result = organize(opts.planningDir, opts.write);
  } else {
    console.error(usage());
    return 2;
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  if (result.status === "missing") return 1;
  if (opts.command === "scan" && !result.ok) return 1;
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  ALLOWED_DIRS,
  ROOT_EXACT,
  ROOT_PATTERNS,
  isAllowedRootFile,
  routeForLooseFile,
  scan,
  organize,
};
