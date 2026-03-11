---
name: review
description: "Production audit and code review. Use --web for web app audit (security, performance, reliability), --ai for AI/voice agent audit (prompt injection, safety, RAG, voice), or no flag for general code review."
tags: [review, audit, security, production, ai, voice]
---

# Review & Audit

> **Deep parallel-agent analysis with full severity-scored report.** For a quick checklist scan without agents, use `/audit` instead.

Unified review skill. Detects project type, spawns parallel agents, scores everything.

## Usage

- `/review` — General code review: quality, security, architecture, performance, tests
- `/review --web` — Web app production audit: security hardening, performance, reliability, observability
- `/review --ai` — AI/voice agent audit: prompt injection, safety rails, RAG quality, voice latency, conversation flow

---

## General Code Review (default)

Spawn parallel review agents for:

### 1. Code Quality
- Clean code principles, SOLID, DRY, naming
- Code smells, readability, maintainability
- TypeScript strictness, type safety

### 2. Security
- OWASP top 10 (injection, XSS, CSRF)
- Auth/authorization checks server-side
- Secrets scan, env var handling
- RLS policies on Supabase tables

### 3. Architecture
- Component boundaries, coupling/cohesion
- API contract stability
- Design pattern consistency

### 4. Performance
- Database query efficiency (N+1, missing indexes)
- Bundle size, lazy loading, render performance
- Caching strategy

### 5. Test Coverage
- Unit/integration test gaps
- Edge cases not covered
- Test quality (not just coverage numbers)

### Output
Consolidated report with severity levels:
- **CRITICAL** — Must fix before deploy (security, data loss)
- **HIGH** — Should fix soon (performance, reliability)
- **MEDIUM** — Recommended (code quality, maintainability)
- **LOW** — Nice to have (style, documentation)

---

## --web (Web App Production Audit)

Full production-readiness audit for Next.js + Supabase + Vercel web apps.

### Pre-Audit Discovery
Detect: deployment target, database, auth provider, CI/CD setup.

### Security Audit
```
CRITICAL:
[ ] No secrets in code
[ ] HTTPS enforced
[ ] Auth tokens have expiry/refresh
[ ] CORS properly restricted
[ ] CSP headers configured
[ ] SQL injection prevention
[ ] XSS prevention
[ ] Rate limiting on auth endpoints

HIGH:
[ ] npm audit clean
[ ] Security headers (X-Frame-Options, HSTS)
[ ] Admin routes protected
[ ] File upload validation
```

### Performance Audit
```
[ ] Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
[ ] Image optimization (next/image, WebP)
[ ] Bundle analysis (no oversized chunks)
[ ] Database query performance
[ ] API response times
[ ] Caching strategy
```

### Reliability Audit
```
[ ] Error boundaries on all pages
[ ] API error handling (timeouts, retries)
[ ] Database connection pooling
[ ] Graceful degradation
[ ] Health check endpoint
```

### Observability Audit
```
[ ] Error tracking (Sentry or similar)
[ ] Structured logging
[ ] Uptime monitoring
[ ] Analytics configured
```

### Deployment Config
```
[ ] Environment variables set per environment
[ ] Build succeeds locally
[ ] Rollback procedure documented
[ ] Database backups configured
```

---

## --ai (AI/Voice Agent Production Audit)

Purpose-built for voice agents, chatbots, and multi-channel AI apps.

### Phase 0: Auto-Detection
Scan package.json for:
- **Voice**: VAPI, ElevenLabs, Retell, Telnyx
- **Chat**: AI SDK, OpenAI, Anthropic, Gemini
- **Channels**: WhatsApp, Telegram, Slack, Twilio
- **RAG**: pgvector, Pinecone, ChromaDB, LangChain

Skip irrelevant agents based on detection.

### Prompt Safety Audit
```
CRITICAL:
[ ] System prompts not exposed to users
[ ] Prompt injection defenses (input sanitization)
[ ] No eval() or dynamic code execution from AI output
[ ] Output validation before rendering
[ ] Token limits enforced

HIGH:
[ ] Prompt template versioning
[ ] Fallback responses for edge cases
[ ] Content filtering on AI output
[ ] User input length limits
```

### Auth & Data Security
```
[ ] User context isolated per session
[ ] API keys server-side only
[ ] Conversation data encrypted at rest
[ ] PII handling compliant
[ ] Rate limiting per user
```

### Conversation Flow
```
[ ] Graceful handling of off-topic inputs
[ ] Context window management (not exceeding limits)
[ ] Conversation history pruning strategy
[ ] Error recovery mid-conversation
[ ] Handoff to human when needed
```

### Voice-Specific (when voice detected)
```
[ ] Latency < 500ms first response
[ ] Interruption handling
[ ] Silence detection and timeout
[ ] Audio quality / codec settings
[ ] VAPI webhook security (signature verification)
[ ] Fallback TTS if primary fails
```

### RAG Quality (when embeddings detected)
```
[ ] Embedding consistency (same model for index/query)
[ ] Chunk size appropriate for use case
[ ] Metadata filtering working
[ ] Retrieval relevance scoring
[ ] Index refresh strategy
```

### Tool/Function Calling
```
[ ] Tool descriptions clear and unambiguous
[ ] Input validation on tool parameters
[ ] Error handling for tool failures
[ ] Tool execution timeout
[ ] Dangerous tools gated behind confirmation
```

### AI Resilience
```
[ ] Provider failover (primary → fallback model)
[ ] Timeout handling (don't hang on slow API)
[ ] Cost monitoring and alerts
[ ] Token budget per request
[ ] Streaming error recovery
```

### Output
Severity-scored findings with exact `file:line` references and fix recommendations.

---

## Deploy Gate

Any CRITICAL or HIGH finding from `/review` is a **deploy blocker**. The `/deploy-verify` skill checks for unresolved review findings before running its 8-point verification. If you haven't run `/review` before deploying, `/deploy-verify` will flag it as a warning.

Workflow: `/review` → fix findings → `/ship` (which triggers `/deploy-verify` automatically)
