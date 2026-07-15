#!/usr/bin/env node
/**
 * score.mjs -- Qualia visual-polish loop scoring utility.
 *
 * Takes a JSON object with 9 dimension scores and computes pass/fail
 * per the design rubric formula from qualia-design/design-rubric.md.
 *
 * Usage:
 *   echo '{"typography":3,"color":2,"spatial":3,"layout":3,"shadow":3,"motion":3,"microcopy":3,"container":3,"graphics":3}' | node score.mjs
 *   node score.mjs --file scores.json
 *   node score.mjs --scores '{"typography":4,"color":3,...}'
 *
 * Output (JSON):
 *   { total, avg, pass, failing: [{dim, score}], verdict }
 *
 * Exit codes:
 *   0  all dimensions >= 3 (pass)
 *   1  one or more dimensions < 3 (fail)
 *   2  invocation error
 */

import { readFileSync } from "node:fs";
import { argv, stdin, exit } from "node:process";

const DIMENSIONS = [
  "typography",
  "color",
  "spatial",
  "layout",
  "shadow",
  "motion",
  "microcopy",
  "container",
  "graphics",
];

const DIMENSION_ALIASES = {
  "color cohesion": "color",
  "color_cohesion": "color",
  "spatial rhythm": "spatial",
  "spatial_rhythm": "spatial",
  "layout originality": "layout",
  "layout_originality": "layout",
  "shadow & depth": "shadow",
  "shadow_depth": "shadow",
  "shadow & depth hierarchy": "shadow",
  "motion intent": "motion",
  "motion_intent": "motion",
  "microcopy specificity": "microcopy",
  "microcopy_specificity": "microcopy",
  "container depth": "container",
  "container_depth": "container",
  "container depth & nesting": "container",
  "visual system": "graphics",
  "visual_system": "graphics",
  "visual system & graphics": "graphics",
  "visual_system_graphics": "graphics",
  "complex graphics": "graphics",
};

function normalizeKey(key) {
  const lower = key.toLowerCase().trim();
  return DIMENSION_ALIASES[lower] || lower;
}

function parseScores(raw) {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      console.error(`Invalid JSON: ${e.message}`);
      exit(2);
    }
  }

  const scores = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeKey(key);
    if (DIMENSIONS.includes(normalized)) {
      const num = parseInt(value, 10);
      if (num < 1 || num > 5 || isNaN(num)) {
        console.error(`Invalid score for ${key}: ${value} (must be 1-5)`);
        exit(2);
      }
      scores[normalized] = num;
    }
  }

  // Validate all dimensions present
  const missing = DIMENSIONS.filter((d) => !(d in scores));
  if (missing.length > 0) {
    console.error(`Missing dimensions: ${missing.join(", ")}`);
    exit(2);
  }

  return scores;
}

function computeResult(scores) {
  const dims = DIMENSIONS.map((d) => scores[d]);
  const total = dims.reduce((a, b) => a + b, 0);
  const avg = +(total / dims.length).toFixed(2);
  const failing = DIMENSIONS.filter((d) => scores[d] < 3).map((d) => ({
    dim: d,
    score: scores[d],
  }));
  const pass = failing.length === 0;

  let verdict;
  if (pass) {
    verdict = "SUCCESS";
  } else if (failing.some((f) => f.score === 1)) {
    verdict = "CRITICAL_FAIL";
  } else {
    verdict = "FAIL";
  }

  return {
    scores,
    total,
    max: 45,
    avg,
    pass,
    failing,
    verdict,
  };
}

// -- CLI entry point --

async function main() {
  let input = null;

  // Parse args
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) {
      try {
        input = readFileSync(argv[i + 1], "utf8");
      } catch (e) {
        console.error(`Cannot read file: ${e.message}`);
        exit(2);
      }
      i++;
    } else if (argv[i] === "--scores" && argv[i + 1]) {
      input = argv[i + 1];
      i++;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`score.mjs -- Qualia visual-polish loop scoring utility

Usage:
  echo '{"typography":3,...}' | node score.mjs
  node score.mjs --file scores.json
  node score.mjs --scores '{"typography":4,...}'

Dimensions: ${DIMENSIONS.join(", ")}
Each scored 1-5. All must be >= 3 to pass.`);
      exit(0);
    }
  }

  // Read from stdin if no explicit input
  if (!input) {
    const chunks = [];
    for await (const chunk of stdin) {
      chunks.push(chunk);
    }
    input = Buffer.concat(chunks).toString("utf8").trim();
  }

  if (!input) {
    console.error("No input provided. Use --file, --scores, or pipe JSON to stdin.");
    exit(2);
  }

  const scores = parseScores(input);
  const result = computeResult(scores);

  console.log(JSON.stringify(result, null, 2));
  exit(result.pass ? 0 : 1);
}

main();
