# Ship Team

> Quality gate → Deploy → Verify. Pipeline pattern — abort if any step fails.

## Agents

- **quality-gate**
  - subagent_type: test-agent
  - role: Run tsc, eslint, build. Ensure no type errors, lint violations, or build failures.
  - commands: |
    npx tsc --noEmit
    npx next lint (or eslint .)
    npm run build (or next build)
  - abort_on_fail: true

- **deploy**
  - subagent_type: backend-agent
  - role: Commit staged changes, push to remote, deploy to hosting platform
  - commands: |
    git add -A && git commit (if uncommitted changes)
    git push origin {branch}
    vercel --prod (default) OR wrangler deploy (if armenius)
  - abort_on_fail: true

- **verify**
  - subagent_type: test-agent
  - role: Run 6-check post-deploy verification against production URL
  - checks: |
    1. HTTP 200 — homepage loads
    2. Auth flow — login/signup endpoint responds
    3. Console errors — no critical JS errors
    4. API latency — key endpoints < 500ms
    5. SSL — valid certificate
    6. Build artifacts — no source maps exposed
  - abort_on_fail: false (report issues but don't rollback)

## Pattern

pipeline: quality-gate → deploy → verify

Each step must succeed before the next begins. If quality-gate fails, deployment is blocked. If deploy fails, verification is skipped.

## Shared Context

- ~/.claude/knowledge/qualia-context.md — project inventory, deploy commands, Supabase refs
- .planning/STATE.md — current project state
- Project's local CLAUDE.md — project-specific deploy config

## Coordination Rules

- quality-gate runs ALL checks before passing — partial pass is a fail
- deploy detects hosting platform from project context (Vercel default, Cloudflare for armenius)
- verify uses the production URL from deploy output
- If Supabase project: deploy also runs `supabase db push` if pending migrations exist

## Output

SHIP-REPORT.md in current directory:

```markdown
# Ship Report

**Date:** {date}
**Branch:** {branch}
**Deploy URL:** {url}

## Quality Gate
- tsc: ✓ / ✗ ({error count})
- lint: ✓ / ✗ ({warning count})
- build: ✓ / ✗ ({duration})

## Deployment
- Platform: Vercel / Cloudflare
- URL: {production url}
- Commit: {sha}

## Verification
| Check | Status | Details |
|-------|--------|---------|
| HTTP 200 | ✓/✗ | {status code} |
| Auth flow | ✓/✗ | {details} |
| Console errors | ✓/✗ | {count} |
| API latency | ✓/✗ | {ms} |
| SSL | ✓/✗ | {expiry} |
| Source maps | ✓/✗ | {exposed?} |
```
