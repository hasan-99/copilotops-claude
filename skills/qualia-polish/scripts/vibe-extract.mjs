#!/usr/bin/env node
/**
 * extract.mjs — reverse-engineer a DESIGN.md draft from a URL or screenshot.
 *
 * Pipeline:
 *   1. If source is a URL → capture screenshot at 1440 via playwright-capture.mjs.
 *      If source is a local image path → use it directly.
 *   2. Emit a JSON scaffold the LLM uses to generate the extracted token bundle.
 *   3. The skill (qualia-polish --vibe) reads the scaffold, runs the vision evaluator in
 *      extract mode, gets the bundle back, renders it as a DESIGN.md draft.
 *
 * This script does NOT call any LLM directly — it stages the inputs and emits
 * a deterministic JSON contract. The /qualia-polish --vibe skill orchestrates the LLM
 * call.
 *
 * Usage:
 *   extract.mjs --source <URL or image path> [--out <path>]
 *
 * Exit codes:
 *   0  success — JSON scaffold emitted to stdout, screenshot path included
 *   1  capture failed (network, no playwright, bad URL)
 *   2  invocation error
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { argv, exit, env } from "node:process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

function flag(name, fallback) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  return argv[i + 1] || fallback;
}

const source = flag("--source");
const outDraft = flag("--out", ".planning/design/DESIGN-extracted.md");

if (!source) {
  console.error("--source required (URL or local image path)");
  exit(2);
}

// ─── Stage 1: locate or capture screenshot ────────────────────────────

let screenshotPath;

const isUrl = /^https?:\/\//i.test(source);
if (isUrl) {
  const stamp = Date.now().toString(36);
  const outDir = join(tmpdir(), `qualia-polish-vibe-extract-${stamp}`);
  mkdirSync(outDir, { recursive: true });
  screenshotPath = join(outDir, "ref-1440.png");

  // Resolve playwright-capture.mjs — search the same order as loop.mjs.
  const candidates = [
    env.QUALIA_CAPTURE_SCRIPT,
    `${env.HOME}/.claude/skills/qualia-polish/scripts/playwright-capture.mjs`,
    resolve(dirname(new URL(import.meta.url).pathname), "..", "..", "qualia-polish", "scripts", "playwright-capture.mjs"),
  ].filter(Boolean);
  const captureScript = candidates.find((p) => existsSync(p));
  if (!captureScript) {
    console.error("playwright-capture.mjs not found. Install the framework or set QUALIA_CAPTURE_SCRIPT.");
    exit(1);
  }

  const r = spawnSync("node", [
    captureScript,
    "--url", source,
    "--out", screenshotPath,
    "--width", "1440",
  ], { encoding: "utf8" });

  if (r.status !== 0 || !existsSync(screenshotPath)) {
    console.error(`screenshot capture failed (exit=${r.status})`);
    if (r.stderr) console.error(r.stderr);
    exit(1);
  }
} else {
  screenshotPath = resolve(source);
  if (!existsSync(screenshotPath)) {
    console.error(`image not found: ${screenshotPath}`);
    exit(2);
  }
  try { statSync(screenshotPath).isFile(); } catch {
    console.error(`source must be a file: ${screenshotPath}`);
    exit(2);
  }
}

// ─── Stage 2: emit extraction scaffold ────────────────────────────────

const scaffold = {
  mode: "extract",
  source: source,
  screenshot: screenshotPath,
  output_draft: outDraft,
  instruction:
    "Examine the screenshot and EXTRACT the visible design tokens. Do NOT score, judge, or critique — describe what is actually present. Output the bundle matching the schema below. If a value is not visible (e.g. motion in a static screenshot), set it to null.",
  schema: {
    aesthetic_direction: "1 sentence — name the aesthetic in concrete terms",
    color: {
      strategy: "Restrained | Committed | Full palette | Drenched",
      ground: "OKLCH or hex of the dominant background",
      ink: "OKLCH or hex of the dominant text color",
      accent: "OKLCH or hex of the single brand accent (if present)",
      notes: "1 sentence on color logic visible (e.g. 'single saturated accent, otherwise neutrals')",
    },
    typography: {
      primary_family: "best guess at the headline font family",
      secondary_family: "best guess at body / sans counterpart, or null",
      scale_observation: "tight | airy | dramatic | flat — one word",
      weight_range: "e.g. '400/600' or 'mono single weight'",
      italic_usage: "common | rare | never",
    },
    spatial: {
      grid_observation: "8px | 12-col | bespoke | dense | airy — one phrase",
      max_width_observation: "narrow | medium | wide | full",
    },
    depth: {
      shadow_intensity: "none | subtle | bold",
      borders: "hairline | medium | heavy | none",
    },
    motion: {
      visible: "true | false | unknown (static)",
      character: "snap | glide | spring | none",
    },
    register_guess: "Brand | Product | hybrid",
    confidence: "low | medium | high",
  },
  rules: [
    "Banned fonts: Inter, Roboto, Arial, Helvetica, system-ui, Space Grotesk, Montserrat, Poppins, Lato, Open Sans. If you see one of these, name it AND flag it so the user can decide whether to ban or accept.",
    "Banned patterns: purple-blue gradient, gradient text, bounce/elastic easing. Flag the same way.",
    "Confidence < high → user must review before /qualia-polish --vibe applies.",
  ],
  next_step: `After producing the bundle, write a DESIGN.md draft to ${outDraft} using the bundle to populate sections 1 (Direction), 2 (Color), 3 (Typography), 4 (Spacing), 6 (Depth), 7 (Motion). Leave sections that depend on PRODUCT.md or anti-references empty — the user will fill them.`,
};

console.log(JSON.stringify(scaffold, null, 2));
exit(0);
