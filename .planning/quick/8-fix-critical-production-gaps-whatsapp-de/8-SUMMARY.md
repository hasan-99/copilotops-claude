---
phase: 8-fix-critical-production-gaps-whatsapp-de
plan: "01"
subsystem: whatsapp-telegram-webhooks
tags:
  - production-resilience
  - cost-control
  - load-testing
  - circuit-breaker
  - deduplication
dependency_graph:
  requires: []
  provides:
    - whatsapp-webhook-resilience
    - telegram-webhook-resilience
    - ai-token-limits
    - load-testing-infrastructure
  affects:
    - app/api/whatsapp/webhook/route.ts
    - app/api/telegram/webhook/route.ts
    - lib/whatsapp/message-handler.ts
    - lib/telegram/message-handler.ts
    - app/(chat)/api/chat/route.ts
tech_stack:
  added:
    - circuit-breaker-pattern
    - load-testing-infrastructure
  patterns:
    - redis-deduplication-with-fallback
    - circuit-breaker-for-ai-calls
    - token-limit-enforcement
key_files:
  created:
    - tests/load/whatsapp-concurrent.test.ts
    - tests/load/README.md
  modified:
    - app/api/whatsapp/webhook/route.ts
    - app/api/telegram/webhook/route.ts
    - lib/whatsapp/message-handler.ts
    - lib/telegram/message-handler.ts
    - app/(chat)/api/chat/route.ts
decisions:
  - id: dedup-ttl-300s
    decision: Increase dedup TTL from 60s to 300s
    rationale: WaSenderAPI has aggressive retry behavior that needs longer window
    alternatives_considered:
      - Keep 60s (insufficient for aggressive retries)
      - Use 180s (compromise rejected in favor of safer 300s)
  - id: circuit-breaker-30s-timeout
    decision: Use 30s timeout for circuit breakers on WhatsApp/Telegram
    rationale: Balances responsiveness with AI processing time needs
    alternatives_considered:
      - 10s timeout (too short for complex AI responses)
      - 60s timeout (matches webhook maxDuration, no margin for error)
  - id: token-limit-via-provider-options
    decision: Use providerOptions.openai.max_tokens instead of direct maxTokens parameter
    rationale: Vercel AI SDK v5 requires model-specific settings via providerOptions
    alternatives_considered:
      - Direct maxTokens parameter (not supported in SDK)
      - No token limits (rejected - runaway cost risk)
metrics:
  duration_minutes: 7
  completed_date: "2026-03-01"
  tasks_completed: 3
  tasks_total: 3
  commits: 3
  files_modified: 7
  lines_added: 242
  lines_removed: 35
---

# Quick Task 8: Fix Critical Production Gaps in WhatsApp/Telegram Webhooks

**One-liner:** Hardened WhatsApp/Telegram webhooks with 300s deduplication, circuit breakers, 4096 token limits, and load testing infrastructure

## Overview

Fixed critical production gaps in WhatsApp and Telegram webhook resilience to prevent duplicate processing, timeout failures, runaway token costs, and cascading AI failures. Established load testing baseline for production traffic validation.

## Tasks Completed

### Task 1: Fix WhatsApp and Telegram webhook resilience gaps

**Changes:**
- Increased WhatsApp dedup TTL from 60s to 300s to handle WaSenderAPI's aggressive retry behavior
- Added `maxDuration=60` export to WhatsApp webhook to prevent Vercel timeout on long AI responses
- Implemented complete deduplication in Telegram webhook (Redis + in-memory fallback) matching WhatsApp pattern
- Both webhooks now use same dedup configuration for consistency

**Files modified:**
- `app/api/whatsapp/webhook/route.ts`
- `app/api/telegram/webhook/route.ts`

**Commit:** `6e1539a`

### Task 2: Add circuit breaker and token limits to AI calls

**Changes:**
- Wrapped WhatsApp and Telegram AI calls in circuit breakers (30s timeout) for graceful degradation
- Added `max_tokens: 4096` to all `streamText` calls via `providerOptions.openai.max_tokens`
- Applied token limits to web chat route for consistency across all AI entry points
- Circuit breakers provide fail-fast behavior when AI APIs are unhealthy

**Files modified:**
- `lib/whatsapp/message-handler.ts`
- `lib/telegram/message-handler.ts`
- `app/(chat)/api/chat/route.ts`

**Commit:** `5b319c4`

### Task 3: Create load testing setup for WhatsApp webhooks

**Changes:**
- Created load test simulating 20 concurrent WhatsApp users (60 total requests)
- Tests verify deduplication, circuit breaker behavior, and response time under load
- Success criteria: ≥95% success rate, <5000ms avg response time
- Added README with setup instructions and environment variables

**Files created:**
- `tests/load/whatsapp-concurrent.test.ts`
- `tests/load/README.md`

**Commit:** `c3ed008`

## Deviations from Plan

None - plan executed exactly as written.

## Production Impact

**Benefits:**
- **Duplicate prevention:** 300s dedup window prevents reprocessing from aggressive retries
- **Timeout protection:** `maxDuration=60` prevents Vercel function timeouts
- **Cost control:** 4096 token limit prevents runaway generation costs
- **Resilience:** Circuit breakers provide graceful degradation during AI API outages
- **Observability:** Load testing infrastructure enables pre-deployment validation

**Risk mitigation:**
- Deduplication works even if Redis is unavailable (in-memory fallback)
- Circuit breakers prevent cascading failures when AI APIs slow down
- Token limits cap maximum cost per request

## Testing

**Verification performed:**
1. ✅ WhatsApp dedup TTL is 300s
2. ✅ WhatsApp webhook has maxDuration=60
3. ✅ Telegram webhook has complete deduplication
4. ✅ All streamText calls have max_tokens=4096
5. ✅ WhatsApp and Telegram handlers wrapped in circuit breakers
6. ✅ Load test file exists and compiles
7. ✅ TypeScript compilation passes

**Load test not executed** (requires production environment variables and live webhook URL).

## Next Steps

1. Run load test against staging environment to validate performance
2. Monitor circuit breaker metrics in production logs
3. Adjust circuit breaker thresholds based on observed failure patterns
4. Consider adding load tests for Telegram webhook

## Self-Check

**Files created:**
- ✅ tests/load/whatsapp-concurrent.test.ts exists
- ✅ tests/load/README.md exists

**Files modified:**
- ✅ app/api/whatsapp/webhook/route.ts exists
- ✅ app/api/telegram/webhook/route.ts exists
- ✅ lib/whatsapp/message-handler.ts exists
- ✅ lib/telegram/message-handler.ts exists
- ✅ app/(chat)/api/chat/route.ts exists

**Commits verified:**
- ✅ 6e1539a: feat(quick-8): fix webhook resilience gaps
- ✅ 5b319c4: feat(quick-8): add circuit breakers and token limits to AI calls
- ✅ c3ed008: test(quick-8): add load testing for WhatsApp webhooks

## Self-Check: PASSED

All files exist, all commits verified, all verifications passed.
