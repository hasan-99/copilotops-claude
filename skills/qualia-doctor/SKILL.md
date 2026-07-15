---
name: qualia-doctor
description: "Framework health check — install, project state, contracts, hooks, memory, ERP queue. Suggests safe repair commands. Triggers: 'doctor', 'health check', 'framework broken', 'hooks not running', 'ERP queue stuck'."
allowed-tools:
  - Bash
  - Read
  - Grep
---

# /qualia-doctor

Diagnose whether the framework harness itself is healthy before blaming the project or the model.

## 1. Install Health

Run:

```bash
qualia-framework doctor
qualia-framework trust
```

If it fails, report the failed checks first. Use safe repair commands only:

```bash
npx qualia-framework@latest install
```

Do not delete user files, configs, knowledge, or hooks manually.

## 2. Project State Health

Run from the project root:

```bash
node C:\Users\hasan\.claude/bin/state.js check
```

If installed under Codex only, use:

```bash
node ~/.codex/bin/state.js check
```

Classify:
- `NO_PROJECT` -> project has not been initialized; next command is `/qualia-new` or `/qualia-map` for brownfield.
- `schema_errors` -> recommend `node C:\Users\hasan\.claude/bin/state.js fix` or Codex equivalent.
- `gap_cycles` at limit -> recommend replanning or escalation.

## 3. Contract Health

For the current phase, check whether a machine-readable contract exists:

```bash
node C:\Users\hasan\.claude/bin/state.js validate-plan --phase {N}
```

If `contract_status` is `missing`, `invalid`, or `drifted`, the harness is not at full-trust mode yet.

When a contract exists, run:

```bash
node C:\Users\hasan\.claude/bin/contract-runner.js .planning/phase-{N}-contract.json
```

Use the Codex path on Codex-only installs.

## 4. Planning Folder Hygiene

Run:

```bash
qualia-framework planning-hygiene scan
```

If it reports loose files, show the dry-run result first. Only organize when the user approves:

```bash
qualia-framework planning-hygiene organize --write
```

Do not move files by hand; the script keeps phase-critical root files in place and moves loose reports/assets into `.planning/reports/`, `.planning/assets/`, `.planning/design/`, or `.planning/archive/loose/`.

## 5. Memory Health

Run:

```bash
node C:\Users\hasan\.claude/bin/knowledge.js
node C:\Users\hasan\.claude/bin/knowledge.js list
```

Healthy memory has at least `index.md`, `agents.md`, and a writable `daily-log/` directory. Missing curated memory is not fatal, but missing installed memory files means reinstall.

## 6. ERP Queue Health

Run:

```bash
qualia-framework erp-flush show
```

If the queue has entries, run:

```bash
qualia-framework erp-flush drain
```

If the queue fails with `401`, the ERP API key is invalid. Use:

```bash
printf '%s' "$QUALIA_ERP_KEY" | qualia-framework set-erp-key
```

## 7. Project Env & Auth Health

Verify the project has the env vars its stack preset requires, and that the CLIs the deploy pipeline needs are logged in. This is the gap that catches "it built fine locally but the deploy has no Supabase keys."

**Read the env contract.** `/qualia-new` writes it per stack preset to `.planning/env.required.json` (fallback `./env.required.json`). It is a JSON array of `{ name, purpose, howToObtain, ownerIssued }`. If neither file exists, print `Env: N/A (no env contract — run /qualia-new to lay down a stack preset)` and skip to CLI auth.

**Check each required var.** A var is PASS if it is present in the process env OR defined (non-empty value) in `.env.local`. Run this from the project root:

```bash
ENVFILE=".planning/env.required.json"; [ -f "$ENVFILE" ] || ENVFILE="env.required.json"
if [ -f "$ENVFILE" ]; then
  node -e '
    const fs=require("fs");
    const vars=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    let local="";
    try { local=fs.readFileSync(".env.local","utf8"); } catch {}
    const inLocal=(n)=>new RegExp("^\\s*"+n+"\\s*=\\s*\\S","m").test(local);
    for (const v of vars) {
      const present = (process.env[v.name] && process.env[v.name].length>0) || inLocal(v.name);
      if (present) { console.log("PASS  "+v.name); continue; }
      if (v.ownerIssued) {
        console.log("FAIL  "+v.name+" — MISSING. Owner-issued: ask the OWNER (Fawzi) for this key, then add it to .env.local");
      } else {
        console.log("FAIL  "+v.name+" — MISSING. "+(v.howToObtain||"")+" Then add "+v.name+"=... to .env.local");
      }
    }
  ' "$ENVFILE"
fi
```

Print one PASS/FAIL line per var with the **exact** next action:
- Missing + `ownerIssued: true` → `ask the OWNER (Fawzi) for this key` (no self-serve command — only the OWNER issues it).
- Missing + `ownerIssued: false` → the var's `howToObtain` string, then `add {NAME}=... to .env.local`.
- Present → `PASS {NAME}`.

**Check CLI logins.** The deploy pipeline needs these authenticated. Each prints PASS or FAIL with the exact fix:

```bash
# Vercel — needed for `vercel --prod`
vercel whoami >/dev/null 2>&1 && echo "PASS  vercel (logged in)" \
  || echo "FAIL  vercel — not logged in. Fix: vercel login"

# Supabase — CLI present + authenticated (projects list needs auth; version proves install)
supabase projects list >/dev/null 2>&1 && echo "PASS  supabase (authenticated)" \
  || { supabase --version >/dev/null 2>&1 \
       && echo "FAIL  supabase — installed but not authenticated. Fix: supabase login" \
       || echo "FAIL  supabase — CLI missing. Fix: npm i -g supabase  (or use npx supabase)"; }

# GitHub — needed for push / PRs
gh auth status >/dev/null 2>&1 && echo "PASS  gh (authenticated)" \
  || echo "FAIL  gh — not logged in. Fix: gh auth login"
```

Roll the worst result into the `Env` line of the Output block: all PASS → `PASS`; any owner-issued var missing → `BLOCKED (owner key needed)`; any other FAIL → `DEGRADED`.

## Output

End with:

```text
Harness health: PASS | DEGRADED | FAIL
Trust score: {N}/100
Install: ...
State: ...
State ledger: ...
Contracts: ...
Planning hygiene: ...
Memory: ...
Design/UI: ...
Employee experience: ...
Env: ...
CLI auth: ...
ERP: ...
Next: ...
```

`Env` summarizes section 7's env-var check (PASS / DEGRADED / BLOCKED (owner key needed) / N/A). `CLI auth` summarizes the vercel/supabase/gh login checks (PASS if all three are authenticated, else DEGRADED with the first failing CLI named).

## Rules

1. Read diagnostics before repair.
2. Never remove user-owned files.
3. Treat missing contracts as degraded trust, not a project failure.
4. Prefer reinstall for missing framework files.
5. Prefer `state.js fix` only for malformed generated state.
6. **Never print secret values.** The env check reports presence (PASS/FAIL) only — never echo a key's contents.
7. **Owner-issued vars get the OWNER, not a command.** For a missing `ownerIssued: true` var, the only correct fix is "ask the OWNER (Fawzi) for this key" — never suggest a self-serve way to obtain it (per the no-proxy-approval rule).
8. Missing env contract is `N/A`, not a failure — it means no stack preset was laid down yet (`/qualia-new`).
