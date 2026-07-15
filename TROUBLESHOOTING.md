# Troubleshooting

Real failures with real fixes. Grouped by where the error surfaces. Every error string in here is grep-able in the codebase — if you see something else, it's not from Qualia, it's from a downstream tool (git, npm, vercel, supabase).

If you're not sure what category your problem falls into, start with `qualia-framework doctor`.

---

## State machine refuses a transition

### `STATE_LOCK_TIMEOUT`
**Where:** `bin/state.js:113`.
**What it means:** Another process holds the state-write lock. Another shell, an editor saving, or a leftover hook.
**Fix:**
1. Check for stuck processes: `ps aux | grep state.js`
2. If nothing relevant, the lock file is stale. Remove it:
   ```bash
   rm .planning/.state-lock 2>/dev/null
   ```
3. Re-run the command.

### `INSUFFICIENT_EVIDENCE`
**Where:** `bin/state.js:473-474` — "contains INSUFFICIENT EVIDENCE; PASS is not allowed".
**What it means:** Phase verification produced a report that contains the literal text `INSUFFICIENT EVIDENCE`, which the verifier emits whenever it couldn't find a citation for a claim. PASS is fail-closed on this.
**Fix:** Open the verification file (`.planning/phase-{N}-verification.md`), find the `INSUFFICIENT EVIDENCE` lines, decide whether to:
- **Re-verify** with better evidence: `/qualia-verify` (the agent will try again with the gaps in context)
- **Re-plan the gap**: `/qualia-plan {N} --gaps`
- **Self-heal**: `/qualia-postmortem` to identify which rule/agent missed and propose a delta

### `GAP_CYCLE_LIMIT`
**Where:** `bin/state.js:497-501` — "Phase N has failed verification N times (limit: N). Escalate to Fawzi or re-plan from scratch."
**What it means:** The phase has burned its gap-closure budget. Default limit is 2. Configurable via `tracking.json.gap_cycle_limit` or `PROJECT.md` frontmatter `gap_cycle_limit: N`.
**Fix:** Don't bump the limit silently — the loop is telling you the plan is wrong. Re-plan the phase from scratch (`/qualia-plan {N}`), or escalate to Fawzi if the phase scope is fundamentally underspecified.

---

## Hooks block an action

All Qualia hooks exit with code 2 to BLOCK (per the Claude Code hook contract). The message tells you why.

### `BLOCKED: errors. Fix before deploying.` — pre-deploy-gate
**Where:** `hooks/pre-deploy-gate.js`.
**Fix:** Read the last N output lines printed below the BLOCKED line. Common cases:
- `BLOCKED: service_role found in client code` → `lib/supabase/client.ts` is leaking the service role key; move the call to `lib/supabase/server.ts`.
- `BLOCKED: tsc failed` → run `npx tsc --noEmit` locally and fix the type errors.
- `BLOCKED: lint failed` → run `npm run lint` and fix.
- `BLOCKED: tests failed` → run `npm test` and fix.

### `BLOCKED: branch is main` — branch-guard
**Where:** `hooks/branch-guard.js`.
**Fix:** You tried to push to `main`. Switch to a feature branch:
```bash
git checkout -b fix/your-thing
git push -u origin fix/your-thing
```
OWNER (Fawzi) can override with explicit confirmation in the prompt; employees cannot.

### `BLOCKED: wrong Vercel account` — vercel-account-guard
**Where:** `hooks/vercel-account-guard.js`.
**Fix:** Project's `.vercel-allowed-teams` file doesn't include your current `vercel whoami` team. Either:
- `vercel link` to the correct team, OR
- add your team to `.vercel-allowed-teams` (one team per line) if it's a legitimate addition.

### `BLOCKED: destructive Supabase command` — supabase-destructive-guard
**Where:** `hooks/supabase-destructive-guard.js`.
**Fix:** You ran `supabase db reset` or similar on a non-local project. Set `QUALIA_ALLOW_DESTRUCTIVE=1` for one-off OWNER overrides:
```bash
QUALIA_ALLOW_DESTRUCTIVE=1 supabase db reset
```

### Migration guard refused an edit
**Where:** `hooks/migration-guard.js`.
**Fix:** You tried to edit a migration file that's already been applied to a non-local environment. Migrations are append-only. Create a new migration:
```bash
npx supabase migration new your_change
```

---

## Install issues

### Doctor reports `Claude no retired ghost skills` ✗
**Where:** `bin/cli.js` doctor.
**Fix:** Run `qualia-framework doctor` once — doctor auto-prunes ghosts. If the check still fails after that, run the prune helper directly:
```bash
node C:\Users\hasan\.claude/bin/prune-deprecated.js ~/.claude
node C:\Users\hasan\.claude/bin/prune-deprecated.js ~/.codex
```

### "Duplicate skills" / "duplicate runtime behavior"
**Where:** README install warning.
**Cause:** You stacked install methods. The most common broken setup is `/plugin install` first, then `npx qualia-framework install`. Each path tries to own the same files.
**Fix:**
```bash
# 1. Pick ONE path. Recommended: the plugin (for v2.1+ Claude Code).
# 2. Uninstall the other:
npx qualia-framework@latest uninstall   # if you went plugin-first, this clears npm-installed copies
# 3. Restart Claude Code so it reloads the plugin manifest cleanly.
```

### `Run: npx qualia-framework@latest install`
**What it means:** Doctor found missing core files. Re-run the installer.
**Fix:** As shown — `@latest` matters; npx caches forever otherwise.

### Codex hooks not firing
**Where:** `hooks.json` in `~/.codex/`.
**Fix:**
1. Verify `~/.codex/hooks.json` exists: `cat ~/.codex/hooks.json | head`
2. If empty or missing, re-run the installer and choose target Codex or Both.
3. Codex hook events use Codex's wire format (different from Claude). The installer rewrites paths at install time — don't hand-edit `~/.codex/hooks.json`.

### Codex bottom status line missing
**Where:** `~/.codex/config.toml` `[tui].status_line`.
**Fix:** This is a publish-blocking install contract since v6.2.10. Re-run installer. If it still doesn't appear, check Codex CLI version (`codex --version`) is 0.133+.

---

## ERP report (`/qualia-report`) issues

### `enqueue: client_report_id, url, payload are required`
**Where:** `bin/erp-retry.js:106`.
**What it means:** A direct caller into the retry queue is missing a required field. You generally don't see this — `/qualia-report` builds the payload for you.
**Fix:** Use `/qualia-report` rather than calling `erp-retry.js` directly.

### `qualia-framework report` queued instead of sent
**What it means:** ERP was unreachable. The payload is now in `bin/erp-retry.js`'s persistent queue.
**Fix:**
```bash
qualia-framework erp-status     # see queue depth
qualia-framework erp-flush      # retry sending now
```
Queue auto-drains on next session start when ERP is reachable.

### `422` from ERP on report upload
**What it means:** ERP rejected the payload. Most often: a slug leaked into a UUID-only field (`erp_project_id`, `client_id`, `workspace_id`).
**Fix:** v6.2.3+ guards this. If you still see it, run `qualia-framework doctor` — the project may have a mis-shaped identifier in `.planning/tracking.json`.

### Empty days (no commits) report
**What it means:** You ran `/qualia-report` but did no commits during the shift.
**Fix:** Not a bug. `/qualia-report` handles empty days gracefully — it'll submit a "no-commit" report so the ERP knows you clocked in/out, even if no code shipped.

---

## Verify failed — what now?

The road on a FAIL:

1. `/qualia-postmortem` — identifies which agent/rule/skill should have caught the failure. Proposes a delta to that file so the same class of bug never recurs.
2. `/qualia-plan {N} --gaps` — generates wave-1 fix tasks for only the FAILed acceptance criteria.
3. `/qualia-build` — execute the gap-fix wave.
4. `/qualia-verify` — re-verify.

If two cycles of this don't pass, `state.js` raises `GAP_CYCLE_LIMIT`. Stop. Re-plan from scratch or escalate.

---

## "I genuinely don't know what's going on"

Use `/qualia-idk` — three-scan diagnostic (planning + code + session), returns guidance plus a paste-ready Qualia command sequence. ~30–45s.

Use `/qualia` instead if you just need the next command (instant, state-driven, no agents).

---

## Last-resort recovery

If `qualia-framework doctor` reports the framework as fundamentally broken:

1. Save current work:
   ```bash
   git stash push -u -m "qualia recovery snapshot"
   ```
2. Clean reinstall:
   ```bash
   npx qualia-framework@latest uninstall
   rm -rf C:\Users\hasan\.claude/skills/qualia-* ~/.codex/skills/qualia-*
   npx clear-npx-cache
   npx qualia-framework@latest install
   ```
3. Verify: `qualia-framework doctor` — should be all green.
4. Restore stash if needed: `git stash pop`.

If even that fails, paste the doctor output to Fawzi.
