---
name: qualia-secure
description: "Security scan of agent config — CLAUDE.md / settings.json / hooks / MCP — for prompt injection, leaked secrets, unscoped permissions, config drift. Static pass + optional Opus red/blue/auditor pipeline. Triggers: 'security scan', 'security audit', 'check my config', 'before going live'."
allowed-tools:
  - Bash
  - Read
  - Grep
  - Agent
---

# /qualia-secure — Security audit of the agent's own configuration

Not application code security. **Agent configuration security.** This skill audits the surfaces that Claude/Codex itself reads — CLAUDE.md, settings.json, hooks, MCP servers — for the class of risks that a normal linter cannot catch: prompt-injection vectors, secrets baked into instructions, unscoped tool permissions, drifted policy enforcement.

This is Qualia's vertical equivalent of ECC's AgentShield, kept local to your stack.

## When to run

- **Before going live** with a new agent harness on a sensitive project.
- **After installing new MCP servers** — each MCP description consumes context AND can introduce permission scope risks.
- **As a release gate** — wire into CI via `qualia-framework secure --exit-code`.
- **After editing CLAUDE.md / settings.json by hand** to catch accidental secret leaks or permission widening.

## Process

### Step 0. Banner

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner secure
```

Say: **"Running security scan."**

### Step 1. Fast static pass

```bash
node C:\Users\hasan\.claude/bin/security-scan.js --write
```

This writes `.planning/security-scan.md` with severity-ranked findings:

- **Secret patterns** — Anthropic / OpenAI / GitHub / AWS / Supabase JWT / Vercel keys baked into CLAUDE.md or settings.json (CRITICAL/HIGH).
- **Permission smells** — unscoped `Bash` tool, `service_role` imports leaking into client code (CRITICAL/HIGH).
- **Hook hygiene** — `child_process.exec` with `shell: true` from user input, hooks missing timeouts (MEDIUM/LOW).

Read the report. If CRITICAL findings exist, **stop here** and rotate / fix before continuing — the deep pass is moot until the obvious holes are closed.

### Step 2. Opus 4.7 adversarial deep-analysis (optional, longer)

If the static pass is clean (or you want adversarial reasoning over the rules + instructions text regardless), run:

```bash
node C:\Users\hasan\.claude/bin/security-scan.js --deep
```

This writes:
- `.planning/security-scan.md` (the static findings, same as Step 1)
- `.planning/security-deep-prompt.md` (a prompt pack with the static findings as seeds, plus the three agent prompts ready to dispatch)

Read `.planning/security-deep-prompt.md`. It contains three sections — RED TEAM, BLUE TEAM, AUDITOR — each is a self-contained prompt for one `Agent()` spawn. Dispatch the first two in parallel, then the auditor after they return:

```
Agent(prompt=<contents of "## Agent A — RED TEAM" section>, subagent_type="general-purpose", description="Red-team attacks")
Agent(prompt=<contents of "## Agent B — BLUE TEAM" section>, subagent_type="general-purpose", description="Blue-team guardrail audit")
```

Wait for both. Pass their reports into the auditor:

```
Agent(prompt=<"## Agent C — AUDITOR" section> + "\n\n## Red-team output\n\n" + <A's report> + "\n\n## Blue-team output\n\n" + <B's report>, subagent_type="general-purpose", description="Auditor synthesis")
```

The auditor writes `.planning/security-audit.md` — that's the deliverable.

### Step 3. Synthesize + route

Combine `.planning/security-scan.md` (static) + `.planning/security-audit.md` (Opus) into a single executive summary. Surface the top 3 actions ranked by severity:

- **CRITICAL** → fix immediately, before any further work.
- **HIGH** → ticket for this sprint; if the fix is "make this instructional rule deterministic via a hook," propose the hook (the `migration-guard` / `branch-guard` pattern in `rules/constitution.md`) and add it under `hooks/`.
- **MEDIUM/LOW** → backlog.

### Step 4. Close

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "SECURED" "/qualia-fix"
```

(Or omit the next-command if all findings are LOW.)

## Rules

1. **Static pass is non-negotiable.** It's fast and deterministic — always runs.
2. **Opus pass is opt-in.** It costs tokens and time. Default to skipping unless the user explicitly asks for "deep audit" or the static pass triggers HIGH+ findings.
3. **No fake severity.** Per `rules/grounding.md`, every finding cites `file:line` and matches a category in the Severity Rubric. No hedging.
4. **Recommend deterministic fixes when possible.** A rule in CLAUDE.md is suggestive; a hook is enforced. The skill's bias is toward proposing a deterministic hook (under `hooks/`) over "tell the agent to do X."
5. **Never auto-rotate secrets.** Flag and instruct. The user rotates manually with confirmation — secrets in CI variables are the user's domain.

## When NOT to use

- Application-level security review (use `/security-review` for OWASP-style code audit).
- Production deployment health (use `/qualia-doctor`).
- Specific bug investigation (use `/qualia-fix`).

`/qualia-secure` is specifically for **the agent's configuration**. The hooks, the rules, the tool scopes, the MCP servers — the surfaces Claude reads to decide what to do.
