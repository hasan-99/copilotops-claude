---
archetype: ai-agent
stack: Next.js 16 (Vercel, app + API) · Supabase (Postgres + pgvector) · Railway (workers) · OpenRouter · Tailwind + shadcn/ui
updated: 2026-05-28
---

# Archetype: `ai-agent`

> LLM / chat / agent products on Supabase + Vercel, with Railway for any long-running or scheduled compute. The roadmapper loads this file when the operator picks `ai-agent`. Voice (`voice-agent`) extends this archetype with a latency + call-testing milestone — see the bottom note.

## How this file is used

Same contract as every archetype: `qualia-scope` grills the **Grill variables**, the **Definition of Done** is the fixed coverage, the **Road** is the default 0→100. The differentiator here is **M3 — the eval gate**: an agent isn't "done" because it replies; it's done when it passes measurable cases.

## Grill variables (what `qualia-scope` must extract)

- **Job to be done** — one sentence. What does the agent *do*, for whom, replacing what manual work?
- **Conversation shape** — single-turn tool, multi-turn chat, or autonomous task agent?
- **Knowledge** — does it need the client's data (RAG)? Sources, freshness, volume → drives pgvector + ingestion.
- **Tools / actions** — what can it *do* beyond talk (book, query, email, write to a system)? Each tool is a vertical slice.
- **Model & routing** — quality vs cost tier; which OpenRouter models; fallback chain.
- **Surface** — embedded widget, standalone app, API, or channel (WhatsApp/Slack)? Auth model.
- **Compute shape** — purely request/response (Vercel only) or long-running/scheduled/queue work (→ Railway worker)?
- **Guardrails** — what must it refuse? PII handling? Human escalation path?
- **Success metric** — how is "good" measured? (This becomes the eval suite. If they can't answer, the project has no finish line — surface it now.)
- **Cost ceiling** — per-conversation and monthly budget → drives guardrails.

## Production Definition of Done

**Foundation & data** — Supabase with **RLS on every table** (conversations, messages, users, embeddings); auth; pgvector if RAG. Migrations in version control.

**Agent core** — LLM via **OpenRouter** with model fallback; system prompts **versioned in source**, never hardcoded inline; streaming responses; context-window management.

**RAG (if applicable)** — ingestion pipeline; retrieval quality checked, not assumed; source attribution.

**Tools/actions** — each action validated server-side; failure + timeout handling; idempotency where it writes.

**Evals** — pass/fail suite over real cases before "done"; covers the success metric and the refusal/guardrail cases. **This is the ship gate.**

**Guardrails & cost** — input validation; refusal/safety behavior; graceful fallback on model failure; per-request + daily cost ceilings; token + latency logging.

**Compute (if Railway)** — health checks (`/health`); structured logging; restart policy; staging→prod env separation; secrets in Railway variables, never logged.

**App quality** — auth flows; rate limiting; the **non-AI-looking** UI pass; responsive; loading/empty/error/streaming states.

**Security & compliance** — `service_role` server-only; secrets in env; security headers; MFA on accounts; GDPR posture (EU) — consent, retention, data export/delete.

**Observability** — Sentry + structured logging + analytics.

**Deploy & handoff** — Vercel prod (+ Railway prod if worker); env separation; post-deploy smoke including **real agent calls**; credentials + walkthrough + archive + ERP report.

## The Road (default 0→100)

### M1 — Foundation & Data
- Init: Next.js 16 (Vercel) for app + API routes; Supabase project (auth, RLS on every table); Railway service scaffolded *only if* the grill found long-running/scheduled work.
- Schema: conversations, messages, users; pgvector tables if RAG.
- OpenRouter wired with a model + fallback; secrets in env.
- **Exit:** authenticated user can hit a stubbed endpoint; RLS verified by logging in as two users; deploys to preview.

### M2 — Core Agent Loop (vertical slice: input → model → response → persist)
- Streaming chat UI; system prompt in source control; conversation persistence.
- Orchestration: tool-calling scaffold; RAG retrieval if applicable; context management.
- Cost guardrails + token/latency logging from the first call.
- **Exit:** a real end-to-end conversation works, persists, and its cost/latency is logged.

### M3 — Evals & Guardrails (THE GATE)
- Eval harness with pass/fail cases mapped to the success metric — not vibes.
- Guardrails: input validation, refusal/safety, fallback on model failure, human-escalation path.
- Each tool/action: server-side validation, timeout + failure handling, idempotency on writes.
- Railway health checks + logging if a worker exists.
- **Exit:** eval suite green; every guardrail case handled. *No ship before this milestone closes.*

### M4 — App Surface & Polish
- Auth flows, user management, rate limiting.
- The non-AI-looking design pass (DESIGN.md, anti-slop), responsive, all async states incl. streaming.
- **Exit:** product looks and feels built, not generated; passes design-laws.

### M5 — Handoff (always last)
- Security review + secrets/env audit; GDPR posture (consent, retention, export/delete).
- Prod deploy (Vercel + Railway envs separated); post-deploy smoke including **real agent calls**, not just HTTP 200.
- Credentials handover, walkthrough, archive, `/qualia-report` to ERP.
- **Exit:** all DoD lines covered or waived with reason; client can operate it.

## Why M3 exists (the 0→100 insight)

The reason agents "finish but aren't done" is that M2 *feels* like completion — it talks, it's demo-able. But demo-able ≠ reliable. **M3 is the milestone the old flow never had**: it converts "it replied" into "it passes." If the grill couldn't extract a success metric, M3 has no cases to run — which is the framework telling you the project was never properly scoped. That's the feature, not a bug.

## Voice extension (`voice-agent`)
Add a milestone between M3 and M4: **latency budget <800ms end-to-end** (the bar where callers stop noticing it's AI; >1.2s feels like legacy IVR), **end-to-end call testing with pass/fail** through the full Retell + ElevenLabs + Telnyx stack (not just prompt review), turn-taking / barge-in verified, transcript logging + PII redaction, recording-consent disclosure.
