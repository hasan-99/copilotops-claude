#!/usr/bin/env node
/**
 * tokens.mjs — read/write design tokens for /qualia-polish --vibe.
 *
 * Commands:
 *   tokens.mjs sync --design .planning/DESIGN.md [--write]
 *     Diffs CSS vars + Tailwind tokens in code against DESIGN.md.
 *     Reports drift; with --write, patches DESIGN.md to match code.
 *
 *   tokens.mjs propose-variants --product .planning/PRODUCT.md --design .planning/DESIGN.md --count 3
 *     Generates N variant direction briefs from PRODUCT.md context.
 *     This script only formats the prompt scaffold; the LLM does the
 *     actual creative work and writes the final brief.
 *
 * Exit codes:
 *   0  success (drift report or variants emitted)
 *   1  drift found AND --write not set (informational, not a hard fail)
 *   2  invocation error (missing files, bad flags)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path, { join, basename, extname } from "node:path";
import { argv, exit, cwd } from "node:process";
import { spawnSync } from "node:child_process";

function flag(name, fallback) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}
function hasFlag(name) {
  return argv.includes(name);
}

const CMD = argv[2];

if (!CMD || CMD === "--help" || CMD === "-h") {
  console.log(`tokens.mjs — design-token utility for /qualia-polish --vibe

Usage:
  tokens.mjs sync --design <path> [--write]
  tokens.mjs propose-variants --product <path> --design <path> --count <N>
  tokens.mjs verify [--files a.css,b.tsx]   # post-vibe gate: tsc --noEmit + slop-detect

See skills/qualia-polish/SKILL.md.
`);
  exit(0);
}

// ─── CSS var extraction ───────────────────────────────────────────────

const CSS_ROOT_RE = /:root\s*\{([\s\S]*?)\}/g;
const CSS_VAR_RE = /--([a-z][a-z0-9-]*)\s*:\s*([^;]+);/gi;

function extractCssVarsFromFile(path) {
  let content;
  try { content = readFileSync(path, "utf8"); } catch { return []; }
  const vars = [];
  let m;
  CSS_ROOT_RE.lastIndex = 0;
  while ((m = CSS_ROOT_RE.exec(content)) !== null) {
    const block = m[1];
    let v;
    CSS_VAR_RE.lastIndex = 0;
    while ((v = CSS_VAR_RE.exec(block)) !== null) {
      vars.push({ name: v[1], value: v[2].trim(), source: path });
    }
  }
  return vars;
}

function findStyleFiles() {
  const candidates = [
    "app/globals.css", "app/global.css",
    "src/app/globals.css", "src/app/global.css",
    "src/styles/globals.css", "src/styles/global.css",
    "styles/globals.css", "styles/global.css",
  ];
  return candidates.filter((p) => existsSync(p));
}

function findTailwindConfig() {
  for (const name of ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs"]) {
    if (existsSync(name)) return name;
  }
  return null;
}

function extractTailwindTokens(configPath) {
  // Cheap parse: grep for color/font/spacing entries inside theme.extend.
  // Not a real JS parser — but it catches the common cases without sandbox risk.
  if (!configPath) return { colors: [], fonts: [], spacing: [] };
  let content;
  try { content = readFileSync(configPath, "utf8"); } catch { return { colors: [], fonts: [], spacing: [] }; }
  const out = { colors: [], fonts: [], spacing: [] };
  // Match: brand: '#abcdef' or brand: "oklch(...)"
  const colorRe = /([a-zA-Z][\w-]*)\s*:\s*['"`]((?:#[0-9a-fA-F]{3,8}|oklch\([^)]+\)|hsl\([^)]+\)|rgb\([^)]+\))[^'"`]*)['"`]/g;
  let m;
  while ((m = colorRe.exec(content)) !== null) {
    out.colors.push({ name: m[1], value: m[2], source: configPath });
  }
  // Match: fontFamily: { serif: ['Fraunces', ...], sans: [...] }
  const fontRe = /fontFamily\s*:\s*\{([\s\S]*?)\}/;
  const fontBlock = fontRe.exec(content);
  if (fontBlock) {
    const entryRe = /([a-zA-Z][\w-]*)\s*:\s*\[([^\]]+)\]/g;
    let f;
    while ((f = entryRe.exec(fontBlock[1])) !== null) {
      const primary = f[2].split(",")[0].trim().replace(/['"`]/g, "");
      out.fonts.push({ name: f[1], primary, source: configPath });
    }
  }
  return out;
}

function extractFontImports() {
  const fonts = new Set();
  // CSS @import url(...)
  for (const f of findStyleFiles()) {
    const content = readFileSync(f, "utf8");
    const importRe = /@import\s+url\(['"]?https?:\/\/fonts\.googleapis\.com\/css2?\?family=([A-Za-z0-9+%]+)/g;
    let m;
    while ((m = importRe.exec(content)) !== null) {
      fonts.add(decodeURIComponent(m[1].replace(/\+/g, " ")));
    }
  }
  // next/font usage in layout files
  for (const layout of ["app/layout.tsx", "app/layout.jsx", "src/app/layout.tsx", "src/app/layout.jsx"]) {
    if (!existsSync(layout)) continue;
    const content = readFileSync(layout, "utf8");
    const nextFontRe = /from\s+['"]next\/font\/google['"][\s\S]{0,400}?import\s*\{\s*([A-Z][a-zA-Z_]*)\s*\}/g;
    // Reverse: import { Fraunces } from 'next/font/google'
    const importRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]next\/font\/google['"]/g;
    let m;
    while ((m = importRe.exec(content)) !== null) {
      for (const name of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
        fonts.add(name.replace(/_/g, " "));
      }
    }
  }
  return [...fonts];
}

// ─── DESIGN.md parsing ────────────────────────────────────────────────

function readDesignMd(designPath) {
  if (!existsSync(designPath)) {
    console.error(`DESIGN.md not found at ${designPath}`);
    exit(2);
  }
  const content = readFileSync(designPath, "utf8");
  return content;
}

function extractDesignMdTokens(content) {
  const tokens = { vars: [], fonts: [] };
  // CSS-style vars anywhere in DESIGN.md
  const varRe = /--([a-z][a-z0-9-]*)\s*:\s*([^;\n]+);/gi;
  let m;
  while ((m = varRe.exec(content)) !== null) {
    tokens.vars.push({ name: m[1], value: m[2].trim() });
  }
  // Font-family lines
  const fontFamilyRe = /font-family\s*:\s*['"`]?([A-Z][A-Za-z0-9 ]+)['"`]?/g;
  while ((m = fontFamilyRe.exec(content)) !== null) {
    tokens.fonts.push(m[1].trim());
  }
  // Bare font names in §3 (Typography). Match "Font: Fraunces" or "Fraunces" on its own line.
  const namedFontRe = /^\s*(?:Font|font|Family|family)\s*:\s*([A-Z][A-Za-z0-9 ]+)\s*$/gm;
  while ((m = namedFontRe.exec(content)) !== null) {
    tokens.fonts.push(m[1].trim());
  }
  return tokens;
}

// ─── Sync ────────────────────────────────────────────────────────────

function cmdSync() {
  const designPath = flag("--design", ".planning/DESIGN.md");
  const write = hasFlag("--write");
  const designContent = readDesignMd(designPath);
  const designTokens = extractDesignMdTokens(designContent);
  const designVarMap = new Map(designTokens.vars.map((v) => [v.name, v.value]));
  const designFonts = new Set(designTokens.fonts.map((f) => f.toLowerCase()));

  const codeVars = [];
  for (const f of findStyleFiles()) codeVars.push(...extractCssVarsFromFile(f));
  const codeVarMap = new Map();
  for (const v of codeVars) {
    if (!codeVarMap.has(v.name)) codeVarMap.set(v.name, v);
  }

  const tw = extractTailwindTokens(findTailwindConfig());
  const codeFonts = new Set([
    ...extractFontImports().map((f) => f.toLowerCase()),
    ...tw.fonts.map((f) => f.primary.toLowerCase()),
  ]);

  const undocumented = []; // in code, not in DESIGN.md
  const orphaned = [];     // in DESIGN.md, not in code
  const drifted = [];      // both, but value differs

  for (const [name, v] of codeVarMap) {
    if (!designVarMap.has(name)) {
      undocumented.push({ name, value: v.value, source: v.source });
    } else if (designVarMap.get(name) !== v.value) {
      drifted.push({ name, code: v.value, design: designVarMap.get(name), source: v.source });
    }
  }
  for (const [name, value] of designVarMap) {
    if (!codeVarMap.has(name)) orphaned.push({ name, value });
  }

  const fontUndocumented = [...codeFonts].filter((f) => !designFonts.has(f));
  const fontOrphaned = [...designFonts].filter((f) => !codeFonts.has(f));

  // Report
  const report = {
    design_md: designPath,
    style_files: findStyleFiles(),
    tailwind_config: findTailwindConfig(),
    undocumented_vars: undocumented,
    orphaned_vars: orphaned,
    drifted_vars: drifted,
    undocumented_fonts: fontUndocumented,
    orphaned_fonts: fontOrphaned,
    counts: {
      undocumented: undocumented.length + fontUndocumented.length,
      orphaned: orphaned.length + fontOrphaned.length,
      drifted: drifted.length,
    },
  };

  if (hasFlag("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const c = report.counts;
    console.log(`design ↔ code drift report`);
    console.log(`  DESIGN.md:        ${designPath}`);
    console.log(`  Style files:      ${report.style_files.join(", ") || "(none found)"}`);
    console.log(`  Tailwind config:  ${report.tailwind_config || "(none found)"}`);
    console.log(``);
    console.log(`  Undocumented in DESIGN.md: ${c.undocumented}  (in code, not declared)`);
    for (const v of undocumented.slice(0, 10)) console.log(`    --${v.name}: ${v.value}  (${v.source})`);
    if (undocumented.length > 10) console.log(`    …and ${undocumented.length - 10} more`);
    for (const f of fontUndocumented.slice(0, 5)) console.log(`    font: ${f}  (loaded but not declared)`);
    console.log(``);
    console.log(`  Orphaned in DESIGN.md:     ${c.orphaned}  (declared, not used in code)`);
    for (const v of orphaned.slice(0, 10)) console.log(`    --${v.name}: ${v.value}`);
    if (orphaned.length > 10) console.log(`    …and ${orphaned.length - 10} more`);
    for (const f of fontOrphaned.slice(0, 5)) console.log(`    font: ${f}  (declared but never imported)`);
    console.log(``);
    console.log(`  Drifted values:            ${c.drifted}  (different in code vs DESIGN.md)`);
    for (const d of drifted.slice(0, 10)) {
      console.log(`    --${d.name}:`);
      console.log(`      code:    ${d.code}  (${d.source})`);
      console.log(`      DESIGN:  ${d.design}`);
    }
    if (drifted.length > 10) console.log(`    …and ${drifted.length - 10} more`);
  }

  // Patch
  if (write && (undocumented.length + drifted.length > 0)) {
    let patched = designContent;
    // Append an Updated tokens section with the code-truth values.
    const stamp = new Date().toISOString();
    const section = [
      ``,
      `## §sync — auto-synced from code (${stamp})`,
      ``,
      `<!-- Generated by /qualia-polish --vibe --sync --write. Reflects values actually present in code at sync time. -->`,
      ``,
      "```css",
      `:root {`,
      ...undocumented.map((v) => `  --${v.name}: ${v.value};  /* from ${v.source} */`),
      ...drifted.map((d) => `  --${d.name}: ${d.code};  /* was: ${d.design} */`),
      `}`,
      "```",
      ``,
    ].join("\n");
    patched = patched.trimEnd() + "\n" + section;
    writeFileSync(designPath, patched, "utf8");
    console.log(``);
    console.log(`✓ DESIGN.md patched with ${undocumented.length + drifted.length} token updates`);
  }

  // Exit code: success if no drift OR --write applied; informational fail otherwise.
  const totalDrift = report.counts.undocumented + report.counts.orphaned + report.counts.drifted;
  if (totalDrift === 0) exit(0);
  if (write) exit(0);
  exit(1);
}

// ─── Variants scaffold ───────────────────────────────────────────────

function cmdProposeVariants() {
  const productPath = flag("--product", ".planning/PRODUCT.md");
  const designPath = flag("--design", ".planning/DESIGN.md");
  const count = parseInt(flag("--count", "3"), 10);
  if (!Number.isFinite(count) || count < 2 || count > 5) {
    console.error("--count must be 2..5");
    exit(2);
  }

  const product = existsSync(productPath) ? readFileSync(productPath, "utf8") : "";
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";

  // Emit a structured scaffold the LLM uses to generate variants.
  const scaffold = {
    instruction: `Generate exactly ${count} aesthetic-direction variants for /qualia-polish --vibe --variants. Each variant must be opinionated and concrete — no "modern minimal" hedging. Variants must be meaningfully different from each other AND from the current direction.`,
    context: {
      product_md: product.slice(0, 4000),
      current_direction_lines: design
        .split("\n")
        .filter((l) => /aesthetic\s+direction|direction\s*:/i.test(l))
        .slice(0, 5),
    },
    output_contract: {
      shape: `One variant per block, exactly N=${count} blocks. Per variant: name, direction (1 sentence), color (1 sentence), typography (1 sentence), motion (1 sentence). No prose justification beyond those 4 lines.`,
    },
    rules: [
      "No banned fonts (Inter/Roboto/Arial/Helvetica/system-ui/Space Grotesk/Montserrat/Poppins/Lato/Open Sans).",
      "No purple-blue gradients.",
      "No bounce/elastic easing.",
      `Respect anti-references from PRODUCT.md if present.`,
      "Each variant should be commit-able as-is — concrete enough that /qualia-polish --vibe can apply it without further questions.",
    ],
  };

  console.log(JSON.stringify(scaffold, null, 2));
  exit(0);
}

// ─── Post-vibe verify (script-side piece of W7.3) ─────────────────────
// Deterministic gate the orchestrator (SKILL.md Stage 6) calls AFTER a --vibe
// token swap, so a vibe pivot never ships unverified. This runs the two
// machine-checkable gates — `tsc --noEmit` and `slop-detect` on changed files.
// The screenshot + visual-evaluator pass remains orchestration (the parent
// session / another agent), not a script primitive.
function resolveSlopScript() {
  const candidates = [
    process.env.SLOP_DETECT_SCRIPT,
    `${process.env.HOME}/.claude/bin/slop-detect.mjs`,
    path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "bin", "slop-detect.mjs"),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

function cmdVerify() {
  const filesFlag = flag("--files", null);
  const files = typeof filesFlag === "string"
    ? filesFlag.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const gates = [];

  // Gate 1 — tsc --noEmit (skipped if no tsconfig in cwd).
  if (existsSync(join(cwd(), "tsconfig.json"))) {
    const r = spawnSync("npx", ["tsc", "--noEmit"], { encoding: "utf8" });
    gates.push({ gate: "tsc", ok: r.status === 0, output: (r.stderr || r.stdout || "").split("\n").slice(0, 20).join("\n") });
  } else {
    gates.push({ gate: "tsc", ok: true, skipped: "no tsconfig.json in cwd" });
  }

  // Gate 2 — slop-detect on the changed files (resolved like commit-fix does).
  const slopScript = resolveSlopScript();
  if (!slopScript) {
    gates.push({ gate: "slop-detect", ok: true, skipped: "slop-detect.mjs not found" });
  } else if (files.length === 0) {
    gates.push({ gate: "slop-detect", ok: true, skipped: "no --files provided" });
  } else {
    const slopBin = process.env.SLOP_DETECT_BIN || "node";
    const r = spawnSync(slopBin, [slopScript, ...files], { encoding: "utf8" });
    gates.push({ gate: "slop-detect", ok: r.status !== 1, output: (r.stdout || "").split("\n").slice(0, 20).join("\n") });
  }

  const allPass = gates.every((g) => g.ok);
  console.log(JSON.stringify({
    command: "verify",
    files,
    gates,
    pass: allPass,
    note: "screenshot + visual-evaluator pass is orchestrated by SKILL.md Stage 6, not by this script",
  }, null, 2));
  exit(allPass ? 0 : 1);
}

// ─── Dispatch ────────────────────────────────────────────────────────

switch (CMD) {
  case "sync": cmdSync(); break;
  case "propose-variants": cmdProposeVariants(); break;
  case "verify": cmdVerify(); break;
  default:
    console.error(`Unknown command: ${CMD}`);
    exit(2);
}
