---
name: qualia-report
description: "Mandatory clock-out flow — generate session report, commit, push, upload to ERP. Handles empty days, missing API key, ERP outages, dry-run. Triggers: 'qualia-report', 'clock out', 'end of day', 'session report', 'I'm done for today'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# /qualia-report — Daily Shift Report

The end-of-day clock-out flow. Generates a shift report, commits it, pushes, uploads to the ERP, and tells the employee they can stop. Designed so Hasan and Moayad never get stuck on it.

This is not a task-completion ceremony. The report records what happened during the employee's fixed work shift: shipped work, partial progress, blockers, investigation, meetings, or no-code work. A valid report can say "not finished yet" as long as it clearly explains the shift outcome and next step.

## Flags
- `/qualia-report` — normal flow (generate, commit, push, upload to ERP)
- `/qualia-report --dry-run` — preview the payload without committing/uploading

## Process

### Step 0 — Pre-flight (graceful)

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner report

# Sanity checks — soft failures only, never block the report
test -d .git || node C:\Users\hasan\.claude/bin/qualia-ui.js warn "Not a git repo — local commit will be skipped, ERP upload will still try"
test -f .planning/tracking.json || node C:\Users\hasan\.claude/bin/qualia-ui.js warn "No tracking.json yet — ERP payload will use defaults"

DRY_RUN="${DRY_RUN:-false}"
echo "$ARGUMENTS" | grep -q -- '--dry-run' && DRY_RUN="true"
```

### Step 1 — Gather

```bash
SINCE="8 hours ago"
COMMITS=$(git log --oneline --since="$SINCE" 2>/dev/null)
COUNT=$(echo "$COMMITS" | grep -c . 2>/dev/null || echo 0)
BRANCH=$(git branch --show-current 2>/dev/null || echo "no-branch")
PROJECT=$(basename "$(pwd)")
```

### Step 2 — Synthesize (with empty-day handling)

**If `COUNT > 0`** — build a structured summary using this template:

```markdown
## What Was Done
- {Verb} {object}. Why: {one-clause reason}.   ← write 3–6 of these, one per related-commits group
                                                   verbs: Built, Fixed, Refactored, Added, Removed,
                                                   Migrated, Documented, Investigated, Reverted

## Blockers
None.   ← or list 1–N actual blockers (NOT "had to read docs" — that's normal)

## Next Steps
1. {Concrete next action — a command or a decision needed}
2. ...
```

**If `COUNT == 0`** — ask the employee gracefully (don't force a fake report or fake completed task):

Use `AskUserQuestion`:
- header: "Empty day?"
- question: "No commits in the last 8 hours. What happened during your shift?"
- options:
  - "Investigation / research only"
  - "Meetings / calls (no code)"
  - "Blocked — tell me on what"
  - "Time off / partial day"

Capture the answer as the report body. Empty days and unfinished work are still valid clock-outs — the ERP needs a truthful employee submission date and shift summary.

### Step 3 — Write report file

`.planning/reports/report-{YYYY-MM-DD}.md`:

```markdown
# Session Report — {YYYY-MM-DD}

**Project:** {PROJECT}
**Employee:** {git user.name}
**Branch:** {BRANCH}
**Phase:** {N — name (status), or "no active phase"}
**Date:** {YYYY-MM-DD}

{synthesis from Step 2}

## Commits ({COUNT})
{git log output, or "none today"}
```

### Step 4 — Allocate client report ID

Per-project sequential ID (QS-REPORT-01, 02, ...). State.js owns the counter — never edit by hand.

```bash
PEEK=""
[ "$DRY_RUN" = "true" ] && PEEK="--peek"
CLIENT_REPORT_ID=$(node C:\Users\hasan\.claude/bin/state.js next-report-id $PEEK 2>/dev/null \
  | node -e "try{const j=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(j.report_id||'')}catch{}")

if [ -z "$CLIENT_REPORT_ID" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Could not allocate report ID. Try: cat .planning/tracking.json (is it valid JSON?)"
  exit 1
fi
```

### Step 5 — Commit + push (skip on --dry-run)

```bash
if [ "$DRY_RUN" != "true" ] && [ -d .git ]; then
  mkdir -p .planning/reports
  git add .planning/reports/report-{date}.md .planning/tracking.json
  git commit -m "report: $CLIENT_REPORT_ID session {YYYY-MM-DD}" || node C:\Users\hasan\.claude/bin/qualia-ui.js warn "Nothing to commit (clean tree?)"
  git push 2>&1 | tail -3
  PUSH_EXIT=${PIPESTATUS[0]}
  [ "$PUSH_EXIT" != "0" ] && node C:\Users\hasan\.claude/bin/qualia-ui.js warn "git push failed — report committed locally but not pushed. ERP upload will still try."
fi
```

### Step 5b — Branch hygiene sweep (clock-out safety net)

Ship integrates every deploy into `main`, but work that was built and never shipped strands on a branch, and review PRs can linger. Surface both before the employee leaves — informational, never blocks:

```bash
node C:\Users\hasan\.claude/bin/branch-hygiene.js
```

Exit 1 → it lists branches with unshipped commits ahead of `main` (run `/qualia-ship` or merge them, or delete if abandoned) and any stale open PRs. Exit 0 → nothing stranded. Include the summary in the closing message so the OWNER sees it in the report.

### Step 6 — Upload to ERP

The full payload-builder + 3-attempt-retry logic lives unchanged from v4 — see the **ERP Upload** section below for the canonical implementation. Behavior summary:
- **No team code in config (employee mode)** → skip upload, report stays LOCAL only; tell the employee explicitly it was saved locally because no team code is set
- ERP disabled in config → skip upload with an info line, note local commit
- API key missing → warn with self-service fix instructions, skip upload
- 401/422 → permanent failure, no retry, tell employee to ask Fawzi
- Transient (timeout/5xx) → 3 attempts with 1s/3s/9s backoff
- Success → "Uploaded as $CLIENT_REPORT_ID (ERP: {uuid})"

**No-team-code degrade (employee mode):** When the framework was installed in employee mode, `.qualia-config.json` has `code: ""` and `erp.enabled: false`. The report is still generated, written to `.planning/reports/report-{date}.md`, and committed locally (Steps 3 + 5). The ERP upload is skipped and the employee is told the report lives locally and how to enable ERP later (get a team code from Fawzi, or `qualia-framework set-erp-key`). This is a clean degrade, not an error.

### Step 7 — State + closing

```bash
if [ "$DRY_RUN" != "true" ]; then
  node C:\Users\hasan\.claude/bin/state.js transition --to activity --notes "Session report $CLIENT_REPORT_ID generated" 2>/dev/null
fi

node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Report $CLIENT_REPORT_ID complete."
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Shift report submitted. You can clock out now."
```

## Common errors (read this when something goes wrong)

| Symptom | Likely cause | Self-service fix |
|---|---|---|
| "Report saved locally, not uploaded" | No team code (employee-mode install) | Expected — report is committed locally. To upload to ERP, get a team code from Fawzi and re-run `npx qualia-framework install`, or set a key with `qualia-framework set-erp-key` |
| "Could not allocate report ID" | tracking.json missing/corrupt | `cat .planning/tracking.json` to inspect, or restore from `git checkout HEAD -- .planning/tracking.json` |
| "ERP API key missing" | `C:\Users\hasan\.claude/.erp-api-key` empty | `printf '%s' "$QUALIA_ERP_KEY" \| qualia-framework set-erp-key` (ask Fawzi for the key) |
| "ERP auth failed (401)" | Key revoked or wrong | Ask Fawzi for a fresh key |
| "ERP upload failed after 3 attempts" | ERP down or network issue | Local commit is safe. Re-run `/qualia-report` later. |
| "git push failed" | Auth or network or upstream issue | `git push` manually, see the error, fix, re-run |

## ERP Upload (canonical implementation)

The Step 6 payload + retry logic. Inlined to avoid a script-file fetch on every clock-out. The agent runs this verbatim.

```bash
# Read ERP config
ERP_URL=$(node -e "try{const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/.qualia-config.json','utf8'));console.log(c.erp?.url||'https://portal.qualiasolutions.net')}catch{console.log('https://portal.qualiasolutions.net')}")
ERP_ENABLED=$(node -e "try{const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/.qualia-config.json','utf8'));console.log(c.erp?.enabled!==false)}catch{console.log('true')}")

API_KEY=$(cat C:\Users\hasan\.claude/.erp-api-key 2>/dev/null)
REPORT_FILE=".planning/reports/report-{date}.md"
SUBMITTED_BY=$(git config user.name || echo "unknown")
SUBMITTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Team code presence — empty in employee-mode installs. No code → the report
# can't be attributed to a team member, so it degrades to a local-only report.
TEAM_CODE=$(node -e "try{const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/.qualia-config.json','utf8'));process.stdout.write((c.code||'').trim())}catch{}")
if [ -z "$TEAM_CODE" ] && [ "$DRY_RUN" != "true" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js info "No team code configured (employee mode) — report saved LOCALLY at $REPORT_FILE, not uploaded to the ERP."
  node C:\Users\hasan\.claude/bin/qualia-ui.js info "To enable ERP uploads: get a team code from Fawzi and re-run 'npx qualia-framework install', or 'printf '%s' \"\$QUALIA_ERP_KEY\" | qualia-framework set-erp-key'."
  ERP_ENABLED="false"
fi

# Idempotency key — deterministic per (client_report_id, submitted_at). A retry
# of the same shift report carries the same key, so the ERP can dedupe at the
# header level in addition to the UPSERT on (project_id, client_report_id).
IDEMPOTENCY_KEY=$(node -e "
  const c=require('crypto');
  const seed='$CLIENT_REPORT_ID|$SUBMITTED_AT|'+require('path').basename(process.cwd());
  // RFC 4122 v5-style: deterministic UUID from sha1 of the seed
  const h=c.createHash('sha1').update(seed).digest('hex');
  console.log([h.slice(0,8),h.slice(8,12),'5'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20,32)].join('-'));
")

# Guard: API key required for upload (otherwise curl posts an empty bearer)
if [ "$ERP_ENABLED" = "true" ] && [ -z "$API_KEY" ] && [ "$DRY_RUN" != "true" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js warn "ERP API key missing (C:\Users\hasan\.claude/.erp-api-key). Run: printf '%s' \"\$QUALIA_ERP_KEY\" | qualia-framework set-erp-key"
  ERP_ENABLED="false"
fi

# Build payload (env-var-passed user values to dodge shell escaping).
# `report-payload.js` is the canonical, tested Framework -> ERP payload builder.
PAYLOAD=$(
  SUBMITTED_BY="$SUBMITTED_BY" SUBMITTED_AT="$SUBMITTED_AT" \
  CLIENT_REPORT_ID="$CLIENT_REPORT_ID" REPORT_FILE="$REPORT_FILE" \
  node C:\Users\hasan\.claude/bin/report-payload.js
)

# --dry-run: print and stop
if [ "$DRY_RUN" = "true" ]; then
  echo "--- DRY RUN · payload ---"; echo "$PAYLOAD" | node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')),null,2))"
  echo "--- DRY RUN · would POST to: $ERP_URL/api/v1/reports ---"
  echo "--- DRY RUN · client_report_id would be: $CLIENT_REPORT_ID ---"
  exit 0
fi

# Upload — 3 attempts with 1s/3s/9s backoff.
# Idempotency-Key header carries a deterministic UUID per (client_report_id, submitted_at)
# so the ERP can dedupe at the request level in addition to the UPSERT key on the body.
# Documented in docs/erp-contract.md:42-49 with a 24h replay window.
if [ "$ERP_ENABLED" = "true" ]; then
  for ATTEMPT in 1 2 3; do
    RESPONSE=$(curl -sS -X POST "$ERP_URL/api/v1/reports" \
      -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
      -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
      -d "$PAYLOAD" --max-time 10 -w "\n__HTTP__%{http_code}" 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | grep -o "__HTTP__[0-9]*" | sed 's/__HTTP__//')
    BODY=$(echo "$RESPONSE" | sed 's/__HTTP__[0-9]*//g')

    if [ "$HTTP_CODE" = "200" ]; then
      ERP_REPORT_ID=$(echo "$BODY" | node -e "try{process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).report_id||'')}catch{}")
      node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Uploaded as $CLIENT_REPORT_ID (ERP: ${ERP_REPORT_ID:-none})"
      # Reset per-session usage telemetry (command_usage + prompt_samples) now
      # that it has been delivered, so the next shift starts from a clean slate.
      rm -f .planning/.session-usage.json 2>/dev/null
      break
    fi
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ]; then
      node C:\Users\hasan\.claude/bin/qualia-ui.js warn "ERP rejected ($HTTP_CODE) — $([ "$HTTP_CODE" = "401" ] && echo "API key invalid, ask Fawzi" || echo "schema mismatch:")"
      [ "$HTTP_CODE" = "422" ] && echo "$BODY" | head -3
      break
    fi
    [ $ATTEMPT -lt 3 ] && { SLEEP=$((1 * 3 ** (ATTEMPT - 1))); node C:\Users\hasan\.claude/bin/qualia-ui.js warn "Attempt $ATTEMPT failed (HTTP ${HTTP_CODE:-timeout}), retrying in ${SLEEP}s..."; sleep $SLEEP; }
  done

  # If all 3 in-process attempts failed, enqueue the report into the persistent
  # retry queue (C:\Users\hasan\.claude/.erp-retry-queue.json). session-start.js drains it on
  # the next Claude Code launch; `qualia-framework erp-flush` drains it on demand.
  # This replaces the prior "will appear after retry" message which was a lie —
  # no retry mechanism existed before v5.9.
  if [ "$ATTEMPT" = "3" ] && [ "$HTTP_CODE" != "200" ]; then
    LAST_ERR="HTTP ${HTTP_CODE:-timeout}"
    if [ -n "$BODY" ]; then LAST_ERR="$LAST_ERR: $(echo "$BODY" | head -c 200)"; fi
    PAYLOAD="$PAYLOAD" \
    CLIENT_REPORT_ID="$CLIENT_REPORT_ID" \
    IDEMPOTENCY_KEY="$IDEMPOTENCY_KEY" \
    ERP_URL="$ERP_URL" \
    LAST_ERR="$LAST_ERR" \
    node -e "
      try {
        const {enqueue} = require(require('os').homedir() + '/.claude/bin/erp-retry.js');
        enqueue({
          client_report_id: process.env.CLIENT_REPORT_ID,
          idempotency_key: process.env.IDEMPOTENCY_KEY,
          url: process.env.ERP_URL + '/api/v1/reports',
          payload: process.env.PAYLOAD,
          last_error: process.env.LAST_ERR,
        });
        process.stdout.write('enqueued');
      } catch (e) {
        process.stderr.write('enqueue failed: ' + (e.message || e));
        process.exit(1);
      }
    " 2>/dev/null && {
      node C:\Users\hasan\.claude/bin/qualia-ui.js warn "ERP upload failed after 3 attempts — $CLIENT_REPORT_ID enqueued for auto-retry on next session"
      node C:\Users\hasan\.claude/bin/qualia-ui.js info "Drain manually with: qualia-framework erp-flush"
    } || {
      node C:\Users\hasan\.claude/bin/qualia-ui.js warn "ERP upload failed after 3 attempts AND queue enqueue failed. $CLIENT_REPORT_ID is committed locally — re-run /qualia-report later to retry."
    }
  fi
fi

[ "$ERP_ENABLED" != "true" ] && node C:\Users\hasan\.claude/bin/qualia-ui.js info "ERP upload skipped (disabled). $CLIENT_REPORT_ID committed locally."
```
