---
name: qualia-ship
disable-model-invocation: true
description: "Deploy to production — state-guard, full security scan, quality gates, commit, push, deploy, verify. Trigger on 'deploy', 'ship it', 'go live', 'push to prod', 'launch', 'release to production'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# /qualia-ship — Deploy

Full deployment pipeline with quality gates.

## Process

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner ship
```

### 0. State Guard — refuse to ship from an invalid state

`/qualia-ship` is a terminal operation — it writes a deployed tag, bumps counters, and produces a verified URL. It must NEVER run on an unpolished, unverified, or malformed project.

```bash
STATE=$(node C:\Users\hasan\.claude/bin/state.js check 2>/dev/null)
if [ -z "$STATE" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "No project loaded. Run /qualia-new first or cd to a Qualia-managed project."
  exit 1
fi

STATUS=$(echo "$STATE" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.status||'')}catch{}")
VERIFICATION=$(echo "$STATE" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.verification||'')}catch{}")
NEXT_COMMAND=$(echo "$STATE" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.next_command||'/qualia')}catch{process.stdout.write('/qualia')}")
ROLE=$(node -e "try{const fs=require('fs'),path=require('path'),os=require('os');const h=process.env.QUALIA_HOME||path.dirname(process.env.QUALIA_BIN||path.join(os.homedir(),'.claude','bin'));const c=JSON.parse(fs.readFileSync(path.join(h,'.qualia-config.json'),'utf8'));process.stdout.write((c.role||'').toUpperCase())}catch{}")

if [ "${QUALIA_SHIP_FORCE:-0}" = "1" ] && [ "$ROLE" != "OWNER" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Owner override is OWNER-only."
  node C:\Users\hasan\.claude/bin/qualia-ui.js info "Run $NEXT_COMMAND."
  exit 1
fi

# Valid ship-from states:
#   polished     — /qualia-polish ran cleanly; ready for deploy
#   verified+pass — final phase verified; skipping polish is allowed for hotfixes
# Anything else (setup, planned, built, shipped, handed_off, verified+fail) is refused.
if [ "$STATUS" != "polished" ] && ! { [ "$STATUS" = "verified" ] && [ "$VERIFICATION" = "pass" ]; }; then
  if [ "${QUALIA_SHIP_FORCE:-0}" = "1" ]; then
    node C:\Users\hasan\.claude/bin/qualia-ui.js warn "Forced ship from state '$STATUS' (verification: ${VERIFICATION:-none}). Record the reason in the final report."
  else
    node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Ship refused from state '$STATUS' (verification: ${VERIFICATION:-none})."
    node C:\Users\hasan\.claude/bin/qualia-ui.js info "Run $NEXT_COMMAND."
    exit 1
  fi
fi
```

### 1. Quality Gates

Run in sequence. Auto-fix failures (up to 2 attempts).

```bash
npx tsc --noEmit          # TypeScript — must pass
if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.lint?0:1)"; then npm run lint; fi
if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.test?0:1)"; then npm test; fi
npm run build             # Build — must succeed
node C:\Users\hasan\.claude/bin/slop-detect.mjs --severity=critical   # Anti-slop — CRITICAL design tells block ship
```

The `pre-deploy-gate.js` hook re-runs the anti-slop scan at `vercel --prod` time as the hard, non-bypassable gate (OWNER-only `QUALIA_SKIP_SLOP=1` escape). This step surfaces failures early so they're fixed before the deploy command.

On failure:
1. Summarize what failed in plain language
2. Auto-fix
3. Re-run the gate
4. If still failing after 2 attempts: tell the employee, suggest `/qualia-fix`

### 2. Security Check — full depth

Shallow grep on `service_role` alone was missing hardcoded keys, tracked `.env` files, and dangerous DOM injection. Match the CRITICAL checks from `/qualia-review` exactly so the two skills agree.

```bash
SEC_FAIL=0

# CRITICAL: service_role in client-facing code
HITS=$(grep -rn "service_role" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ src/ lib/ 2>/dev/null | grep -v node_modules | grep -v "\.server\.\|[\\/]server[\\/]\|[\\/]app[\\/]api[\\/]\|route\.\|middleware\.")
if [ -n "$HITS" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "service_role leaked to client code:"
  echo "$HITS" | head -5
  SEC_FAIL=1
fi

# CRITICAL: hardcoded secrets
HITS=$(grep -rn "sk_live\|sk_test\|SUPABASE_SERVICE_ROLE\|eyJhbGciOi" --include="*.ts" --include="*.tsx" --include="*.js" app/ components/ src/ lib/ 2>/dev/null | grep -v node_modules | grep -v "\.env")
if [ -n "$HITS" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Hardcoded secret found:"
  echo "$HITS" | head -5
  SEC_FAIL=1
fi

# CRITICAL: dangerouslySetInnerHTML / eval
HITS=$(grep -rn "dangerouslySetInnerHTML\|eval(" --include="*.ts" --include="*.tsx" --include="*.js" app/ components/ src/ 2>/dev/null | grep -v node_modules)
if [ -n "$HITS" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Dangerous innerHTML/eval pattern:"
  echo "$HITS" | head -5
  SEC_FAIL=1
fi

# CRITICAL: .env files tracked in git
HITS=$(git ls-files | grep -i "\.env" | grep -v "\.example\|\.template\|\.sample")
if [ -n "$HITS" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail ".env files tracked in git:"
  echo "$HITS"
  SEC_FAIL=1
fi

if [ $SEC_FAIL -ne 0 ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Security check failed. Fix findings above or run /qualia-review for full audit."
  exit 1
fi
```

### 3. Integrate to main (ship IS the merge point)

Ship is the one place feature work lands on `main`, so `main` is always exactly what's in production and no branch lingers. Commit, then fast-forward-integrate into `main` and push. `branch-guard` records the main push (accountability, not a block — see `rules/infrastructure.md`).

```bash
git add {specific changed files}
git commit -m "ship: {project name} production deploy"

BR=$(git branch --show-current)
if [ "$BR" != "main" ] && [ "$BR" != "master" ]; then
  git checkout main
  git pull --ff-only origin main 2>/dev/null || true   # sync with remote first
  if git merge --ff-only "$BR"; then
    : # clean fast-forward
  else
    # main moved since the branch started — rebase the feature, then ff.
    git checkout "$BR" && git rebase main || {
      node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Rebase conflict integrating $BR → main. Resolve, then re-run /qualia-ship."
      exit 1
    }
    git checkout main && git merge --ff-only "$BR"
  fi
fi
git push origin HEAD
```

If anything in this block fails (conflict, push rejected), STOP and surface it — do not deploy a half-integrated tree.

### 4. Deploy (from main)

Deploy runs on `main` HEAD — what you just integrated — so the deployed artifact and `main` are byte-identical.

```bash
vercel --prod              # Website/AI agent
# OR
supabase functions deploy  # Edge functions
# OR
wrangler deploy            # Cloudflare Workers
```

### 4b. Close the branch

On a verified successful deploy, delete the integrated feature branch so nothing lingers (skip if you shipped directly from `main`):

```bash
if [ -n "$BR" ] && [ "$BR" != "main" ] && [ "$BR" != "master" ]; then
  git branch -d "$BR" 2>/dev/null && git push origin --delete "$BR" 2>/dev/null || true
fi
```

### 5. Post-Deploy Verification

Read the deployed URL from `tracking.json.deployed_url` or from an explicit user-provided URL. Do NOT use a `{domain}` placeholder — that expects the LLM to hallucinate the URL, which is exactly the kind of silent fail the state guard above prevents.

```bash
# If the user invoked `/qualia-ship --url ...`, set QUALIA_SHIP_URL to that
# exact value before running this block. Otherwise use tracking.json.
URL="${QUALIA_SHIP_URL:-$(node -e 'try{const t=JSON.parse(require("fs").readFileSync(".planning/tracking.json","utf8"));process.stdout.write(t.deployed_url||"")}catch{}')}"
if [ -z "$URL" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js warn "No deployed_url in tracking.json — parse it from the deploy command output (vercel/supabase/wrangler all print the URL on success)."
  node C:\Users\hasan\.claude/bin/qualia-ui.js info "Re-run with: /qualia-ship --url https://your-site.com, then export that value as QUALIA_SHIP_URL for this check."
  exit 1
fi

# HTTP 200 + latency under 500ms (combined)
RESP=$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" --max-time 15 "$URL")
HTTP_CODE=$(echo "$RESP" | awk '{print $1}')
LATENCY=$(echo "$RESP" | awk '{print $2}')

if [ "$HTTP_CODE" != "200" ]; then
  node C:\Users\hasan\.claude/bin/qualia-ui.js fail "Post-deploy check failed: HTTP $HTTP_CODE at $URL"
  exit 1
fi

# Auth endpoint (best-effort — not every project has one)
AUTH_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$URL/api/auth/callback" 2>/dev/null)
```

### 6. Report

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "URL: $URL"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Status: HTTP $HTTP_CODE"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Latency: ${LATENCY}s"
[ "$AUTH_CODE" = "200" ] || [ "$AUTH_CODE" = "401" ] && node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Auth endpoint responds (HTTP $AUTH_CODE)"
```

```bash
# A5: on the per-increment layout, `release` ships the active increment, runs
# the Definition-of-Done gate, and clears its claim (one committed file → no
# merge conflict). Falls back to the legacy phase-level transition otherwise.
if [ -d .planning/increments ]; then
  node C:\Users\hasan\.claude/bin/state.js release --deployed-url "$URL"
else
  node C:\Users\hasan\.claude/bin/state.js transition --to shipped --deployed-url "$URL"
fi
```
Do NOT manually edit STATE.md or tracking.json — state.js handles both.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "SHIPPED" "/qualia-handoff"
```
