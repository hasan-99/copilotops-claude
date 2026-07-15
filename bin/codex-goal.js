#!/usr/bin/env node
// codex-goal — suggest a Codex /goal objective + token budget from current
// .planning/STATE.md + ROADMAP.md state.
//
// Output is a single line meant to be pasted into a Codex session, or quoted
// in an agent prompt that will then issue update_goal itself. The framework
// does NOT write directly to ~/.codex/goals_1.sqlite — Codex owns the schema
// and the thread_id; the /goal slash command (and the update_goal tool the
// model can call) are the stable interfaces.
//
// Usage: node bin/codex-goal.js [phase|task|feature|quick]
//        default scope = phase

const fs = require("fs");
const path = require("path");

const SCOPE = (process.argv[2] || "phase").toLowerCase();

// Token budgets are calibrated to Codex's per-thread context window and the
// typical Qualia work-unit size. Phase = full builder loop with verification.
// Task/feature = single fresh-context spawn. Quick = one-shot inline edit.
const TOKEN_BUDGETS = {
  phase: 80000,
  task: 30000,
  feature: 30000,
  quick: 10000,
};

const PLANNING = path.join(process.cwd(), ".planning");
const STATE_FILE = path.join(PLANNING, "STATE.md");
const ROADMAP_FILE = path.join(PLANNING, "ROADMAP.md");

function readSafe(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function parseState(content) {
  if (!content) return null;
  const phaseMatch = content.match(/^Phase:\s*(\d+)\s+of\s+(\d+)\s*[—-]\s*(.+?)\r?$/m);
  if (!phaseMatch) return null;
  return {
    phase: parseInt(phaseMatch[1], 10),
    total: parseInt(phaseMatch[2], 10),
    name: phaseMatch[3].trim(),
  };
}

function readPhaseGoal(roadmap, phaseNum) {
  if (!roadmap) return "";
  // Match a heading like "## Phase 2 — Name" or "## Phase 2: Name", then
  // grab the "Goal:" line that follows.
  const heading = new RegExp(`##\\s*Phase\\s*${phaseNum}\\s*[—:\\-]\\s*[^\\n]+`, "i");
  const idx = roadmap.search(heading);
  if (idx === -1) return "";
  const body = roadmap.slice(idx, idx + 2000);
  const goalMatch = body.match(/^\s*\*?\*?Goal:?\*?\*?\s*(.+?)$/im);
  return goalMatch ? goalMatch[1].trim() : "";
}

function clip(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function main() {
  const budget = TOKEN_BUDGETS[SCOPE];
  if (budget == null) {
    process.stderr.write(`unknown scope: ${SCOPE} (use phase|task|feature|quick)\n`);
    process.exit(2);
  }

  const state = parseState(readSafe(STATE_FILE));
  if (!state) {
    // No .planning/STATE.md — fall back to a generic shape so the helper
    // still emits something useful for ad-hoc invocations.
    const objective = `${SCOPE[0].toUpperCase() + SCOPE.slice(1)} in ${path.basename(process.cwd())}`;
    process.stdout.write(`/goal ${objective}\n`);
    process.stdout.write(`# token_budget suggestion: ${budget}\n`);
    return;
  }

  const phaseGoal = readPhaseGoal(readSafe(ROADMAP_FILE), state.phase);
  const objectivePrefix = `Phase ${state.phase}/${state.total} — ${state.name}`;
  const objective = clip(
    phaseGoal ? `${objectivePrefix}: ${phaseGoal}` : objectivePrefix,
    280
  );

  process.stdout.write(`/goal ${objective}\n`);
  process.stdout.write(`# token_budget suggestion: ${budget}\n`);
}

main();
