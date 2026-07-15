#!/usr/bin/env node
// Shared helper: prune retired skill folders from an install home (~/.claude or ~/.codex).
//
// Why a separate file: install.js already runs prune on install, but users often run
// `qualia-framework doctor` more frequently than they re-install. When a skill is
// retired (moved from ACTIVE_SKILLS → RETIRED_SKILLS in command-surface.js), the
// folder must also be removed from the install home, or the harness will keep
// advertising it as live and users will invoke "trap skills" that no longer route.
//
// Both install.js and cli.js (doctor) call this.

const fs = require("fs");
const path = require("path");
const { RETIRED_SKILLS } = require("./command-surface.js");

function findGhostSkills(baseDir) {
  const skillsDir = path.join(baseDir, "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return RETIRED_SKILLS.filter((name) => fs.existsSync(path.join(skillsDir, name)));
}

// Returns { removed: [names], errors: [{name, target, error}] }.
// Callers can decide how to surface errors — the doctor flow logs them, the
// install flow shows them as warnings. We do NOT silently swallow them (per
// CodeRabbit review on PR #46): a permissions / mount-point failure during
// prune leaves stale ghost skills installed and the user has no signal.
function pruneGhostSkills(baseDir) {
  const skillsDir = path.join(baseDir, "skills");
  if (!fs.existsSync(skillsDir)) return { removed: [], errors: [] };
  const removed = [];
  const errors = [];
  for (const name of RETIRED_SKILLS) {
    const target = path.join(skillsDir, name);
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        removed.push(name);
      }
    } catch (err) {
      errors.push({ name, target, error: err && err.message ? err.message : String(err) });
    }
  }
  return { removed, errors };
}

module.exports = { findGhostSkills, pruneGhostSkills };

if (require.main === module) {
  // CLI: `node prune-deprecated.js <baseDir>` — useful for manual cleanup.
  const baseDir = process.argv[2] || path.join(require("os").homedir(), ".claude");
  const { removed, errors } = pruneGhostSkills(baseDir);
  if (errors.length > 0) {
    console.error(`Pruned ${removed.length} ghost skill(s); ${errors.length} failed:`);
    for (const e of errors) console.error(`  ✗ ${e.name} (${e.target}): ${e.error}`);
    if (removed.length > 0) for (const name of removed) console.log(`  - ${name}`);
    process.exit(1);
  }
  if (removed.length === 0) {
    console.log(`No ghost skills in ${baseDir}/skills/`);
  } else {
    console.log(`Pruned ${removed.length} ghost skill(s) from ${baseDir}/skills/:`);
    for (const name of removed) console.log(`  - ${name}`);
  }
}
