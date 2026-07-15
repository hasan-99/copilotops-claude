#!/usr/bin/env node
// Canonical Qualia command surface.
//
// The repo may keep retired skills for migration/history, but installs should
// expose the small active surface below. This gives users fewer commands while
// preserving compatibility cleanup for older installs.

const ACTIVE_SKILLS = [
  "qualia",
  "qualia-new",
  "qualia-scope",
  "qualia-map",
  "qualia-research",
  "qualia-plan",
  "qualia-build",
  "qualia-verify",
  "qualia-eval",
  "qualia-fix",
  "qualia-feature",
  "qualia-review",
  "qualia-optimize",
  "qualia-polish",
  "qualia-test",
  "qualia-milestone",
  "qualia-update",
  "qualia-ship",
  "qualia-handoff",
  "qualia-report",
  "qualia-doctor",
  "qualia-road",
  "qualia-learn",
  "qualia-recall",
  "qualia-postmortem",
  "qualia-idk",
  "qualia-secure",
  "zoho-workflow",
];

const RETIRED_SKILLS = [
  // Historical folds.
  "qualia-task",
  "qualia-quick",
  "qualia-polish-loop",
  "qualia-design",
  "qualia-prd",

  // v6.3 surface reduction: keep the behavior under sharper active commands.
  "qualia-debug",      // folded into qualia-fix for actionable repairs
  "qualia-vibe",       // folded into qualia-polish modes/documentation
  "qualia-help",       // guide/help files remain installed; no slash command
  // qualia-idk RESTORED in v6.3.1 — owner pivot: keep the deep diagnostic
  // separate from the cheap router. /qualia stays mechanical, /qualia-idk
  // does the heavy three-scan synthesis with paste-ready command sequence.
  "qualia-pause",      // folded into qualia router handoff branch
  "qualia-resume",     // folded into qualia router handoff branch
  "qualia-zoom",       // folded into qualia-map/qualia-review as an analysis mode
  "qualia-issues",     // GitHub queue externalization is not default workflow
  "qualia-triage",     // GitHub queue routing is not default workflow
  "qualia-hook-gen",   // framework-authoring utility, not employee default
  "qualia-skill-new",  // framework-authoring utility, not employee default
  "qualia-flush",      // available as qualia-framework flush / automation

  // A4 surface collapse (v6.7): folded where a surviving skill genuinely covers it.
  "qualia-discuss",    // folded into qualia-scope — PROJECT MODE (kickoff → project-discovery.md) + PHASE MODE (grill → phase-N-context.md) now live there via its mode router
];

function activeSkills() {
  return [...ACTIVE_SKILLS];
}

function retiredSkills() {
  return [...RETIRED_SKILLS];
}

module.exports = {
  ACTIVE_SKILLS,
  RETIRED_SKILLS,
  activeSkills,
  retiredSkills,
};

