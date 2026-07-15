#!/usr/bin/env node
/**
 * slop-detect — Standalone anti-pattern scanner for Qualia projects.
 *
 * Usage:
 *   node bin/slop-detect.mjs                       # scan whole repo (default globs)
 *   node bin/slop-detect.mjs path/to/file.tsx      # scan one file
 *   node bin/slop-detect.mjs src/components/       # scan a directory
 *   node bin/slop-detect.mjs --json                # machine-readable output
 *   node bin/slop-detect.mjs --severity=critical   # only critical findings
 *
 * Exit codes:
 *   0  no critical findings
 *   1  one or more critical findings
 *   2  invocation error
 *
 * Builder agents call this BEFORE commit. A non-zero exit blocks the commit.
 */

import { readFileSync, readdirSync, statSync, existsSync, watch as fsWatch } from "node:fs";
import { join, extname, relative, resolve } from "node:path";
import { argv, exit, cwd } from "node:process";

// ── Severity rubric (from rules/grounding.md) ─────────────────────────
const CRITICAL = "critical";
const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

// ── Anti-patterns ─────────────────────────────────────────────────────
// Each rule: { id, severity, label, fileGlob, pattern, allow?, fix }
const RULES = [
  // ── CRITICAL: absolute bans (block commit) ──────────────────────────
  {
    id: "ABS-FONT",
    severity: CRITICAL,
    label: "Banned font (Inter/Roboto/Arial/Helvetica/system-ui/Space Grotesk/Montserrat/Poppins/Lato/Open Sans)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss|html|svelte|vue|astro)$/,
    pattern: /(font-family|fontFamily)[^;{,]*(['"`])(Inter|Roboto|Arial|Helvetica|system-ui|Space\s*Grotesk|Montserrat|Poppins|Lato|Open\s*Sans)\b/i,
    allow: /Inter\s*Display|Inter\s*Tight/,
    fix: "Replace with a distinctive font (Fraunces, Geist, Söhne, JetBrains Mono, etc). See DESIGN.md §3 and qualia-design/design-brand.md.",
  },
  {
    id: "ABS-PURPLE-GRAD",
    severity: CRITICAL,
    label: "Purple-blue gradient (the #1 AI-design tell)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss|html|svelte|vue|astro)$/,
    pattern: /(from-(blue|indigo|violet)-\d+\s+to-(purple|violet|fuchsia|pink)-\d+|from-(purple|violet|fuchsia|pink)-\d+\s+to-(blue|indigo|violet)-\d+|linear-gradient[^;]*(blue|indigo)[^;]*(purple|violet|fuchsia)|linear-gradient[^;]*(purple|violet|fuchsia)[^;]*(blue|indigo))/i,
    fix: "Use one solid brand accent color. Emphasis via weight or size, not gradient text/bg.",
  },
  {
    id: "ABS-GRADIENT-TEXT",
    severity: CRITICAL,
    label: "Gradient text (background-clip: text)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss|html|svelte|vue|astro)$/,
    pattern: /(background-clip\s*:\s*text|bg-clip-text|-webkit-background-clip\s*:\s*text)/i,
    fix: "Decorative, never meaningful. Use a single solid color. Emphasis via weight or size.",
  },
  {
    id: "ABS-PURE-BLACK-WHITE",
    severity: CRITICAL,
    label: "Pure #000 or #fff (untuned, generic)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss)$/,
    pattern: /#(000000|FFFFFF|000|FFF)\b/,
    allow: /shadow|outline|currentColor|var\(/i,
    fix: "Tint every neutral toward brand hue. Use OKLCH with chroma 0.005-0.015. See design-laws.md §1.",
  },
  {
    id: "ABS-HEX-IN-JSX",
    severity: CRITICAL,
    label: "Hardcoded hex color in JSX/TSX (use design tokens)",
    fileGlob: /\.(tsx|jsx)$/,
    pattern: /style=\{[^}]*['"]#[0-9a-fA-F]{3,8}['"]/,
    fix: "Move color to a CSS custom property in DESIGN.md tokens. Reference via var(--name).",
  },
  {
    id: "ABS-SIDE-STRIPE",
    severity: CRITICAL,
    label: "Side-stripe border (decorative border-left ≥2px)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss)$/,
    pattern: /border-(left|right)\s*:\s*\d+(px|rem)\s+solid|border-l-(2|4|8)|border-r-(2|4|8)/,
    allow: /focus|active|outline/,
    fix: "Use full borders, background tints, leading icons, or nothing. See design-laws.md §8.",
  },

  // ── HIGH: strong tells ───────────────────────────────────────────────
  {
    id: "HI-MAX-W-CAP",
    severity: HIGH,
    label: "Hardcoded max-width container (no fluid full-width)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss)$/,
    pattern: /(max-w-7xl|max-w-\[1200|max-w-\[1280|max-w-\[1440|max-width\s*:\s*1200|max-width\s*:\s*1280)/,
    fix: "Use fluid padding: clamp(1rem, 5vw, 4rem). Cap content via max-width: 65ch on prose only.",
  },
  {
    id: "HI-OUTLINE-NONE",
    severity: HIGH,
    label: "outline:none without focus replacement (a11y violation)",
    fileGlob: /\.(tsx|jsx|ts|js|css|scss)$/,
    pattern: /outline\s*:\s*none|outline-none/,
    allow: /focus-visible|focus:ring|focus:outline/,
    fix: "Replace with a visible focus ring: 2px offset, contrasting color. See design-laws.md §accessibility.",
  },
  {
    id: "HI-IMG-NO-ALT",
    severity: HIGH,
    label: "<img> without alt attribute",
    fileGlob: /\.(tsx|jsx|html|svelte|vue|astro)$/,
    pattern: /<img\s+(?![^>]*\balt=)[^>]*>/,
    fix: "Every image needs alt text. Decorative: alt=\"\" + aria-hidden=\"true\". Meaningful: describe it.",
  },
  {
    id: "HI-GENERIC-CTA",
    severity: HIGH,
    label: "Generic CTA copy (Get Started / Learn More / Click Here)",
    fileGlob: /\.(tsx|jsx|html|svelte|vue|astro|md)$/,
    pattern: />\s*(Get Started|Learn More|Click Here|Welcome to|Read More|Find Out More)\s*</i,
    fix: "Name the action: 'Download invoice', 'Continue setup', 'Try the demo'.",
  },
  {
    id: "HI-EM-DASH",
    severity: HIGH,
    label: "Em dash in user-facing copy (— or '--')",
    // Scope: shipped UI files only. Markdown / docs prose is allowed em-dashes.
    fileGlob: /\.(tsx|jsx|html|svelte|vue|astro)$/,
    pattern: />\s*[^<]*[—][^<]*</,
    fix: "Use commas, colons, semicolons, periods, or parentheses. See design-laws.md §7.",
  },

  // ── MEDIUM: noisy signals ────────────────────────────────────────────
  {
    id: "MED-CARD-GRID-3",
    severity: MEDIUM,
    label: "Three/four-column card grid (likely identical-card slop)",
    fileGlob: /\.(tsx|jsx|html|svelte|vue|astro)$/,
    pattern: /(grid-cols-3|grid-cols-4|grid-template-columns\s*:\s*repeat\(\s*[34]\s*,)/,
    fix: "Vary card sizes and content shapes. Identical cards in a grid is the AI default hero pattern.",
  },
  {
    id: "MED-GLASSMORPHISM",
    severity: MEDIUM,
    label: "Glassmorphism (backdrop-blur on multiple surfaces — likely default)",
    fileGlob: /\.(tsx|jsx|css|scss)$/,
    pattern: /(backdrop-blur|backdrop-filter\s*:\s*blur)/,
    fix: "Glass effects are rare and purposeful, or nothing. Don't use them as default decoration.",
  },
  {
    id: "MED-CONTAINER-DEPTH",
    severity: MEDIUM,
    label: "Possible container-depth >2 (card on card on pill)",
    fileGlob: /\.(tsx|jsx)$/,
    pattern: /<div[^>]*className="[^"]*\b(card|panel|surface)[^"]*"[^>]*>\s*<div[^>]*className="[^"]*\b(card|panel|surface)/,
    fix: "Container depth max 2. Flatten nested cards into a single container with content.",
  },
  {
    id: "MED-ANIMATE-LAYOUT",
    severity: MEDIUM,
    label: "Animating layout properties (causes reflow, jank)",
    fileGlob: /\.(tsx|jsx|css|scss)$/,
    pattern: /transition\s*:\s*(width|height|top|left|right|bottom|margin|padding)\s/,
    fix: "Animate transform and opacity only. Layout properties trigger reflow.",
  },
  {
    id: "MED-BOUNCE-EASING",
    severity: MEDIUM,
    label: "Bounce/elastic easing (banned per design-laws.md §6)",
    fileGlob: /\.(tsx|jsx|css|scss|js|ts)$/,
    pattern: /(bounce|elastic|backIn|backOut|cubic-bezier\([^)]*1\.\d+)/i,
    fix: "Ease out with exponential curves: cubic-bezier(0.22, 1, 0.36, 1) or (0.16, 1, 0.3, 1).",
  },

  // ── LOW: cleanup ─────────────────────────────────────────────────────
  {
    id: "LOW-CONSOLE-LOG",
    severity: LOW,
    label: "console.log in production code",
    fileGlob: /\.(tsx|jsx|ts|js)$/,
    pattern: /console\.(log|debug)\(/,
    allow: /\/\/\s*(debug|todo)|test\.|spec\./i,
    fix: "Remove or replace with a proper logger.",
  },
];

// ── File walker ───────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  "node_modules", ".next", "dist", "build", ".git", ".turbo",
  "coverage", ".cache", "out", ".vercel", ".vscode", ".idea",
  ".planning", ".qa-screenshots",
  // v5.1: skip test fixtures by convention. Fixtures used as regression
  // targets (e.g. /qualia-polish --loop's broken.html) intentionally violate
  // the rules slop-detect enforces; scanning them flags real fixture bugs
  // as production slop.
  "fixtures", "__fixtures__",
]);

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (name.startsWith(".") && !["src", "app", "components", "lib"].includes(name)) {
      // skip dotfiles except known source dirs
      if (SKIP_DIRS.has(name)) continue;
    }
    const path = join(dir, name);
    let st;
    try { st = statSync(path); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      yield* walk(path);
    } else if (st.isFile()) {
      yield path;
    }
  }
}

// ── Scanner ───────────────────────────────────────────────────────────
function scanFile(path) {
  const findings = [];
  let content;
  try { content = readFileSync(path, "utf8"); } catch { return findings; }
  const lines = content.split("\n");

  for (const rule of RULES) {
    if (!rule.fileGlob.test(path)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!rule.pattern.test(line)) continue;
      if (rule.allow && rule.allow.test(line)) continue;
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        label: rule.label,
        file: path,
        line: i + 1,
        snippet: line.trim().slice(0, 120),
        fix: rule.fix,
      });
    }
  }
  return findings;
}

// ── CLI ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { paths: [], json: false, severity: null, help: false, watch: false };
  for (const a of argv.slice(2)) {
    if (a === "--json") args.json = true;
    else if (a === "--watch") args.watch = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a.startsWith("--severity=")) args.severity = a.split("=")[1];
    else if (a.startsWith("--")) {
      console.error(`Unknown flag: ${a}`);
      exit(2);
    } else args.paths.push(a);
  }
  return args;
}

function help() {
  console.log(`slop-detect — Qualia anti-pattern scanner

Usage:
  slop-detect [path ...] [--json] [--severity=critical|high|medium|low] [--watch]

Examples:
  slop-detect                              # scan whole repo
  slop-detect src/components/Button.tsx    # scan one file
  slop-detect app/                         # scan a directory
  slop-detect --severity=critical          # only critical findings
  slop-detect --json > slop.json           # machine-readable
  slop-detect src/ --watch                 # re-scan on file change (proactive)

Exit codes:
  0  no critical findings
  1  one or more critical findings
  2  invocation error
`);
}

function severityOrder(s) { return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0; }
function severityColor(s) { return { critical: "\x1b[31m", high: "\x1b[33m", medium: "\x1b[36m", low: "\x1b[37m" }[s] || ""; }
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function scanAndReport(targets, args) {
  const files = [];
  for (const t of targets) {
    let st;
    try { st = statSync(t); } catch { continue; }
    if (st.isFile()) files.push(t);
    else for (const f of walk(t)) files.push(f);
  }
  const findings = [];
  for (const f of files) findings.push(...scanFile(f));
  const minSev = args.severity ? severityOrder(args.severity) : 1;
  const filtered = findings.filter((f) => severityOrder(f.severity) >= minSev);
  const stamp = new Date().toISOString().split("T")[1].split(".")[0];
  if (filtered.length === 0) {
    console.log(`${DIM}[${stamp}]${RESET} ${BOLD}\x1b[32m✓ no slop${RESET} (${files.length} files)`);
  } else {
    const crit = filtered.filter((f) => f.severity === CRITICAL).length;
    console.log(`${DIM}[${stamp}]${RESET} ${severityColor("critical")}${BOLD}${filtered.length} findings, ${crit} critical${RESET} (${files.length} files)`);
    for (const f of filtered.slice(0, 5)) {
      const rel = relative(cwd(), f.file);
      const color = severityColor(f.severity);
      console.log(`  ${color}●${RESET} ${rel}:${f.line} ${DIM}[${f.rule}]${RESET}  ${f.label}`);
    }
    if (filtered.length > 5) console.log(`  ${DIM}…and ${filtered.length - 5} more${RESET}`);
  }
}

function runWatch(targets, args) {
  console.log(`${BOLD}slop-detect --watch${RESET}  ${DIM}(targets: ${targets.map((t) => relative(cwd(), t) || ".").join(", ")})${RESET}`);
  console.log(`${DIM}Ctrl+C to stop.${RESET}\n`);
  // Initial scan
  scanAndReport(targets, args);
  // Debounce so a flurry of writes coalesces into one rescan
  let pending = null;
  const trigger = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      scanAndReport(targets, args);
    }, 200);
  };
  const watchers = [];
  for (const t of targets) {
    try {
      const isDir = statSync(t).isDirectory();
      const w = fsWatch(t, isDir ? { recursive: true } : {}, (_evt, filename) => {
        if (!filename) return trigger();
        // Only act on tracked file extensions
        if (!/\.(tsx|jsx|ts|js|css|scss|html|svelte|vue|astro)$/.test(filename)) return;
        trigger();
      });
      watchers.push(w);
    } catch (e) {
      console.error(`watch: ${t} — ${e.message}`);
    }
  }
  // Keep alive
  process.on("SIGINT", () => {
    for (const w of watchers) try { w.close(); } catch {}
    process.exit(0);
  });
}

function main() {
  const args = parseArgs(argv);
  if (args.help) { help(); exit(0); }

  const targets = args.paths.length
    ? args.paths.map((p) => resolve(p))
    : [
        "app", "components", "src", "lib", "pages",
        "packages", "apps", // monorepo conventions (turbo, nx, pnpm workspaces)
      ]
        .map((d) => resolve(cwd(), d))
        .filter((d) => existsSync(d));

  if (targets.length === 0) targets.push(resolve(cwd()));

  if (args.watch) return runWatch(targets, args);

  // Collect files
  const files = [];
  for (const t of targets) {
    let st;
    try { st = statSync(t); } catch {
      console.error(`Path does not exist: ${t}`);
      exit(2);
    }
    if (st.isFile()) files.push(t);
    else for (const f of walk(t)) files.push(f);
  }

  // Scan
  const findings = [];
  for (const f of files) findings.push(...scanFile(f));

  // Filter by severity
  const minSev = args.severity ? severityOrder(args.severity) : 1;
  const filtered = findings.filter(f => severityOrder(f.severity) >= minSev);

  // Output
  if (args.json) {
    console.log(JSON.stringify({
      scanned_files: files.length,
      total_findings: filtered.length,
      by_severity: {
        critical: filtered.filter(f => f.severity === CRITICAL).length,
        high: filtered.filter(f => f.severity === HIGH).length,
        medium: filtered.filter(f => f.severity === MEDIUM).length,
        low: filtered.filter(f => f.severity === LOW).length,
      },
      findings: filtered,
    }, null, 2));
  } else {
    if (filtered.length === 0) {
      console.log(`${BOLD}\x1b[32m✓ no slop detected${RESET}  (${files.length} files scanned)`);
    } else {
      // Group by severity, sorted highest first
      const bySev = {};
      for (const f of filtered) (bySev[f.severity] ||= []).push(f);
      const order = ["critical", "high", "medium", "low"];
      for (const sev of order) {
        const items = bySev[sev];
        if (!items) continue;
        const color = severityColor(sev);
        console.log(`\n${color}${BOLD}${sev.toUpperCase()}${RESET}  ${items.length} finding${items.length === 1 ? "" : "s"}`);
        console.log(`${DIM}${"─".repeat(60)}${RESET}`);
        for (const f of items) {
          const rel = relative(cwd(), f.file);
          console.log(`${color}●${RESET} ${BOLD}${rel}:${f.line}${RESET}  ${DIM}[${f.rule}]${RESET}`);
          console.log(`  ${f.label}`);
          console.log(`  ${DIM}${f.snippet}${RESET}`);
          console.log(`  ${color}→${RESET} ${f.fix}`);
          console.log();
        }
      }
      const crit = (bySev.critical || []).length;
      const total = filtered.length;
      console.log(`${BOLD}${total}${RESET} total · ${BOLD}${crit}${RESET} critical · ${files.length} files scanned`);
      if (crit > 0) console.log(`${severityColor("critical")}${BOLD}commit blocked${RESET} — fix critical findings first`);
    }
  }

  // Exit code
  const criticalCount = filtered.filter(f => f.severity === CRITICAL).length;
  exit(criticalCount > 0 ? 1 : 0);
}

main();
