#!/usr/bin/env node
// batch-plan.js — the deterministic core of /qualia-build --batch (R20).
//
// The wave model fits feature builds (a handful of dependency-linked tasks); it
// does NOT fit a 50–500-file mechanical migration (a codemod). This splits a
// flat file list into worktree-isolated, FILE-DISJOINT batches — each a small
// worker with tiny context that opens its own commit — then groups them into
// concurrency-capped waves that fan in through one staging branch. Map-reduce
// over files. Zero-dep; the orchestration (spawning workers, merging) lives in
// the /qualia-build skill — this owns the split so it's deterministic + testable.
//
// Usage:
//   batch-plan.js <file> [<file> …]        # files as args
//   batch-plan.js --from LIST              # newline-delimited file (- = stdin)
//   …  --batch-size N (default 20)  --max-workers K (default 5)
//      --staging BRANCH (default batch/staging)  --json
//
// Exit: 0 ok (even 0 files), 2 bad invocation. Zero deps.

const fs = require("fs");

function parseArgs(argv) {
  const o = { files: [], batchSize: 20, maxWorkers: 5, staging: "batch/staging", json: false, from: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batch-size") o.batchSize = Math.max(1, parseInt(argv[++i], 10) || 20);
    else if (a === "--max-workers") o.maxWorkers = Math.max(1, parseInt(argv[++i], 10) || 5);
    else if (a === "--staging") o.staging = argv[++i] || o.staging;
    else if (a === "--from") o.from = argv[++i];
    else if (a === "--json") o.json = true;
    else if (a === "-h" || a === "--help") o.help = true;
    else o.files.push(a);
  }
  return o;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function readList(from) {
  let raw;
  if (from === "-") {
    try { raw = fs.readFileSync(0, "utf8"); } catch { raw = ""; }
  } else {
    try { raw = fs.readFileSync(from, "utf8"); } catch {
      process.stderr.write(`batch-plan.js: cannot read ${from}\n`);
      process.exit(2);
    }
  }
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

function buildPlan(files, opts) {
  // De-dup while preserving order — a file must land in exactly one batch.
  const seen = new Set();
  const unique = [];
  for (const f of files) {
    if (!seen.has(f)) { seen.add(f); unique.push(f); }
  }
  const groups = chunk(unique, opts.batchSize);
  const pad = String(groups.length).length;
  const batches = groups.map((batchFiles, i) => {
    const id = String(i + 1).padStart(pad, "0");
    return { id, branch: `batch/${opts.staging.replace(/^batch\//, "")}-${id}`, file_count: batchFiles.length, files: batchFiles };
  });
  // Batches are file-disjoint → all parallelizable; cap concurrency into waves.
  const waves = chunk(batches.map((b) => b.id), opts.maxWorkers);
  return {
    total_files: unique.length,
    batch_size: opts.batchSize,
    max_workers: opts.maxWorkers,
    batch_count: batches.length,
    wave_count: waves.length,
    staging_branch: opts.staging,
    waves,
    batches,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write("batch-plan.js <file…> | --from LIST [--batch-size N] [--max-workers K] [--staging B] [--json]\n");
    process.exit(0);
  }
  let files = opts.files;
  if (opts.from) files = files.concat(readList(opts.from));
  const plan = buildPlan(files, opts);

  if (opts.json) {
    console.log(JSON.stringify(plan, null, 2));
    process.exit(0);
  }

  console.log(`batch-plan: ${plan.total_files} files → ${plan.batch_count} batches (≤${plan.batch_size} each) → ${plan.wave_count} waves (≤${plan.max_workers} workers)`);
  console.log(`staging branch: ${plan.staging_branch}`);
  for (let w = 0; w < plan.waves.length; w++) {
    console.log(`\nwave ${w + 1}: ${plan.waves[w].join(", ")}`);
    for (const id of plan.waves[w]) {
      const b = plan.batches.find((x) => x.id === id);
      console.log(`  batch ${id} → ${b.branch} (${b.file_count} files)`);
    }
  }
  if (plan.batch_count === 0) console.log("(no files — nothing to migrate)");
  process.exit(0);
}

main();
