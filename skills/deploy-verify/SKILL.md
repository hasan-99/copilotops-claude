---
name: deploy-verify
description: Run post-deploy 4-check verification (HTTP 200, auth flow, console errors, API latency) against any deployed URL. Automatically invoked after vercel --prod deployments.
user-invocable: false
---

# Deploy Verification

Run the 4-check post-deploy verification against a deployed URL.

## Checks

1. **HTTP 200** — Homepage loads successfully
2. **Auth flow** — Auth callback endpoint responds (if applicable)
3. **Console errors** — No critical JS errors on homepage
4. **API latency** — Key API endpoints respond under 500ms

## Workflow

Given a deployed URL (e.g., from `vercel --prod` output):

```bash
# Run the verification script
bash ~/.claude/skills/deploy-verify/scripts/verify.sh <URL>
```

The script outputs a pass/fail checklist. If any check fails, investigate and fix before considering deployment complete.

## When to Invoke

Invoke this skill automatically after:
- `vercel --prod` completes successfully
- Any production deployment
- When the `/ship` skill finishes deploying

## Manual Usage

If you need to verify a URL manually:
```bash
bash ~/.claude/skills/deploy-verify/scripts/verify.sh https://example.vercel.app
```

## Interpreting Results

- **All PASS** — Deployment is verified, report success
- **Any FAIL** — Investigate the failing check, fix the issue, redeploy, and re-verify
- **SKIP** — Check was skipped (e.g., no auth endpoint detected)
