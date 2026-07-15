#!/usr/bin/env node
// Shared runtime manifest for installed Qualia bin scripts.

const RUNTIME_BIN_SCRIPTS = [
  { file: "runtime-manifest.js", label: "runtime-manifest.js (shared install manifest)" },
  { file: "command-surface.js", label: "command-surface.js (active/deprecated skill manifest)" },
  { file: "host-adapters.js", label: "host-adapters.js (Claude/Codex path renderer)" },
  { file: "state.js", label: "state.js (state machine)" },
  { file: "qualia-ui.js", label: "qualia-ui.js (cosmetics library)" },
  { file: "statusline.js", label: "statusline.js (status bar renderer)" },
  { file: "knowledge.js", label: "knowledge.js (memory-layer loader)" },
  { file: "knowledge-flush.js", label: "knowledge-flush.js (cron-runnable flush)" },
  { file: "recall.js", label: "recall.js (read-side memory recall — knowledge layer + role-filtered vault)" },
  { file: "vault-access.js", label: "vault-access.js (shared vault access-control — honors wiki/_meta/access.md)" },
  { file: "repo-map.js", label: "repo-map.js (zero-dep symbol map for brownfield onboarding — /qualia-map)" },
  { file: "design-tokens.js", label: "design-tokens.js (per-client CSS-variable token registry — R10)" },
  { file: "batch-plan.js", label: "batch-plan.js (file-disjoint batch split for /qualia-build --batch — R20)" },
  { file: "state-ledger.js", label: "state-ledger.js (hash-chained state event ledger)" },
  { file: "plan-contract.js", label: "plan-contract.js (plan JSON validator)" },
  { file: "contract-runner.js", label: "contract-runner.js (contract evidence runner)" },
  { file: "agent-status.js", label: "agent-status.js (per-task build status + wave fan-in barrier)" },
  { file: "analyze-gate.js", label: "analyze-gate.js (cross-artifact scope↔plan coverage gate)" },
  { file: "verify-panel.js", label: "verify-panel.js (verifier panel + skeptic majority-survives aggregator)" },
  { file: "wave-plan.js", label: "wave-plan.js (dependency-derived, concurrency-capped build schedule)" },
  { file: "eval-runner.js", label: "eval-runner.js (layered assertion runner for AI-feature eval suites)" },
  { file: "branch-hygiene.js", label: "branch-hygiene.js (clock-out sweep — stranded branches + stale PRs)" },
  { file: "last-report.js", label: "last-report.js (router surfacing — newest session-report digest at session start)" },
  { file: "agent-runs.js", label: "agent-runs.js (agent telemetry writer)" },
  { file: "slop-detect.mjs", label: "slop-detect.mjs (anti-pattern scanner — runs pre-commit on frontend builds)" },
  { file: "erp-retry.js", label: "erp-retry.js (ERP report retry queue — drained by session-start hook and erp-flush CLI)" },
  { file: "erp-event.js", label: "erp-event.js (signed lifecycle-event emitter → ERP /api/v1/events, R14 client)" },
  { file: "work-packet.js", label: "work-packet.js (ERP mission/work packet pull + local reader)" },
  { file: "report-payload.js", label: "report-payload.js (Framework -> ERP report payload builder)" },
  { file: "auto-report.js", label: "auto-report.js (B1 ship-time auto-report)" },
  { file: "project-snapshot.js", label: "project-snapshot.js (ERP/admin project progress snapshot)" },
  { file: "project-sync.js", label: "project-sync.js (Framework -> ERP full project-sync reconciliation payload)" },
  { file: "trust-score.js", label: "trust-score.js (harness health scoring)" },
  { file: "harness-eval.js", label: "harness-eval.js (project eval scoring + evidence artifact)" },
  { file: "codex-goal.js", label: "codex-goal.js (Codex /goal objective + token-budget suggester)" },
  { file: "planning-hygiene.js", label: "planning-hygiene.js (.planning organization scanner)" },
  { file: "prune-deprecated.js", label: "prune-deprecated.js (ghost-skill cleanup for retired commands)" },
  { file: "learning-candidates.js", label: "learning-candidates.js (scan recent commits + daily-log for patterns worth promoting)" },
  { file: "status-snapshot.js", label: "status-snapshot.js (portable operator snapshot — install + project + work + ERP + memory)" },
  { file: "security-scan.js", label: "security-scan.js (static security scanner for agent config — secrets, permissions, hook hygiene)" },
];

function binFiles() {
  return RUNTIME_BIN_SCRIPTS.map((script) => script.file);
}

module.exports = {
  RUNTIME_BIN_SCRIPTS,
  binFiles,
};
