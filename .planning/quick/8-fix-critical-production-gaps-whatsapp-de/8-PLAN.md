---
phase: 8-fix-critical-production-gaps-whatsapp-de
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/whatsapp/webhook/route.ts
  - app/api/telegram/webhook/route.ts
  - app/(chat)/api/chat/route.ts
  - lib/whatsapp/message-handler.ts
  - lib/telegram/message-handler.ts
  - tests/load/whatsapp-concurrent.test.ts
autonomous: true

must_haves:
  truths:
    - "WhatsApp dedup TTL increased to 300s prevents duplicate processing"
    - "WhatsApp webhook has maxDuration=60 to prevent timeouts"
    - "Telegram webhook has deduplication matching WhatsApp implementation"
    - "All AI streamText calls have maxTokens=4096 to prevent runaway costs"
    - "Circuit breaker wraps all AI calls for resilience"
    - "Load test simulates 20 concurrent WhatsApp users successfully"
  artifacts:
    - path: "app/api/whatsapp/webhook/route.ts"
      provides: "WhatsApp webhook with 300s dedup TTL and maxDuration=60"
      contains: "DEDUP_TTL_SECONDS = 300"
    - path: "app/api/telegram/webhook/route.ts"
      provides: "Telegram webhook with deduplication and maxDuration=60"
      contains: "isMessageProcessed"
    - path: "lib/whatsapp/message-handler.ts"
      provides: "WhatsApp AI calls wrapped in circuit breaker with maxTokens"
      contains: "maxTokens: 4096"
    - path: "tests/load/whatsapp-concurrent.test.ts"
      provides: "Load test for 20 concurrent users"
      min_lines: 50
  key_links:
    - from: "lib/whatsapp/message-handler.ts"
      to: "lib/circuit-breakers.ts"
      via: "createCircuitBreaker wrapping streamText calls"
      pattern: "createCircuitBreaker.*streamText"
    - from: "app/api/whatsapp/webhook/route.ts"
      to: "isMessageProcessed function"
      via: "deduplication with 300s TTL"
      pattern: "DEDUP_TTL_SECONDS.*300"
---

<objective>
Fix critical production gaps in WhatsApp and Telegram webhooks for resilience and cost control.

Purpose: Prevent duplicate message processing, timeout failures, runaway token costs, and cascading AI failures. Establish load testing baseline for production traffic.

Output: Hardened webhooks with proper deduplication, timeouts, token limits, circuit breakers, and load testing infrastructure.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/qualia/Projects/aiagents/sofiatesting/CLAUDE.md
@/home/qualia/Projects/aiagents/sofiatesting/app/api/whatsapp/webhook/route.ts
@/home/qualia/Projects/aiagents/sofiatesting/app/api/telegram/webhook/route.ts
@/home/qualia/Projects/aiagents/sofiatesting/lib/circuit-breakers.ts
@/home/qualia/Projects/aiagents/sofiatesting/lib/whatsapp/message-handler.ts
@/home/qualia/Projects/aiagents/sofiatesting/lib/telegram/message-handler.ts
@/home/qualia/Projects/aiagents/sofiatesting/app/(chat)/api/chat/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix WhatsApp and Telegram webhook resilience gaps</name>
  <files>
    app/api/whatsapp/webhook/route.ts
    app/api/telegram/webhook/route.ts
  </files>
  <action>
In `app/api/whatsapp/webhook/route.ts`:
- Change `DEDUP_TTL_SECONDS = 60` to `DEDUP_TTL_SECONDS = 300` (line 16) - extends dedup window to 5 minutes to handle WaSenderAPI's aggressive retries
- Add `export const maxDuration = 60;` after imports (around line 12) - prevents Vercel timeout on long AI responses

In `app/api/telegram/webhook/route.ts`:
- Import Redis and deduplication utilities from WhatsApp webhook (same pattern as WhatsApp)
- Add dedup configuration constants:
  ```typescript
  const DEDUP_PREFIX = "telegram:dedup:";
  const DEDUP_TTL_SECONDS = 300;
  const memoryDedup = new Map<string, number>();
  let lastMemoryCleanup = Date.now();
  const MEMORY_CLEANUP_INTERVAL = 10_000;
  ```
- Add Redis client initialization (copy `getRedis()` function from WhatsApp webhook)
- Add `isMessageProcessed()` function (copy from WhatsApp webhook, change prefix to "telegram:dedup:")
- In POST handler, before processing message (line 56), add deduplication check:
  ```typescript
  const messageKey = `${body.update_id}-${body.message.chat.id}`;
  if (await isMessageProcessed(messageKey)) {
    logger.debug("Duplicate message, skipping", { messageKey });
    return NextResponse.json({ ok: true });
  }
  ```
- Already has maxDuration=60 (line 9) - keep as-is

Telegram currently lacks deduplication entirely - this prevents reprocessing messages if Telegram retries webhook delivery.
  </action>
  <verify>
```bash
cd /home/qualia/Projects/aiagents/sofiatesting
grep "DEDUP_TTL_SECONDS = 300" app/api/whatsapp/webhook/route.ts
grep "maxDuration = 60" app/api/whatsapp/webhook/route.ts
grep "isMessageProcessed" app/api/telegram/webhook/route.ts
grep "DEDUP_TTL_SECONDS = 300" app/api/telegram/webhook/route.ts
npx tsc --noEmit
```
  </verify>
  <done>
WhatsApp dedup TTL increased to 300s, maxDuration=60 added to WhatsApp webhook, Telegram webhook has complete deduplication matching WhatsApp, TypeScript compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add circuit breaker and token limits to AI calls</name>
  <files>
    lib/whatsapp/message-handler.ts
    lib/telegram/message-handler.ts
    app/(chat)/api/chat/route.ts
  </files>
  <action>
In `lib/whatsapp/message-handler.ts`:
- Import circuit breaker: `import { createCircuitBreaker } from "@/lib/circuit-breakers";`
- Find the `streamText()` call (around line 200-250) and add `maxTokens: 4096` parameter to prevent runaway generation costs
- Wrap the entire AI processing block in circuit breaker:
  ```typescript
  const aiBreaker = createCircuitBreaker(
    async () => {
      // Existing streamText call with maxTokens: 4096 added
    },
    { name: "WhatsApp-AI", timeout: 30000 }
  );
  const result = await aiBreaker.fire();
  ```

In `lib/telegram/message-handler.ts`:
- Import circuit breaker: `import { createCircuitBreaker } from "@/lib/circuit-breakers";`
- Find the `streamText()` call and add `maxTokens: 4096` parameter
- Wrap AI processing in circuit breaker with same pattern:
  ```typescript
  const aiBreaker = createCircuitBreaker(
    async () => {
      // Existing streamText call with maxTokens: 4096 added
    },
    { name: "Telegram-AI", timeout: 30000 }
  );
  const result = await aiBreaker.fire();
  ```

In `app/(chat)/api/chat/route.ts`:
- Find `streamText()` call (line 216) and add `maxTokens: 4096` parameter after temperature
- Web chat already has timeout from maxDuration, so circuit breaker is optional but add for consistency:
  ```typescript
  const aiBreaker = createCircuitBreaker(
    async () => {
      // Existing streamText call with maxTokens: 4096 added
    },
    { name: "WebChat-AI", timeout: 60000 }
  );
  ```

maxTokens prevents models from generating excessively long responses (default is unlimited). Circuit breaker provides graceful degradation when OpenRouter/Gemini APIs fail or slow down.
  </action>
  <verify>
```bash
cd /home/qualia/Projects/aiagents/sofiatesting
grep "maxTokens: 4096" lib/whatsapp/message-handler.ts
grep "maxTokens: 4096" lib/telegram/message-handler.ts
grep "maxTokens: 4096" app/\(chat\)/api/chat/route.ts
grep "createCircuitBreaker" lib/whatsapp/message-handler.ts
grep "createCircuitBreaker" lib/telegram/message-handler.ts
npx tsc --noEmit
```
  </verify>
  <done>
All streamText calls have maxTokens=4096 limit. WhatsApp and Telegram message handlers wrapped in circuit breakers. TypeScript compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create load testing setup for WhatsApp webhooks</name>
  <files>
    tests/load/whatsapp-concurrent.test.ts
  </files>
  <action>
Create new load test file at `tests/load/whatsapp-concurrent.test.ts`:

```typescript
/**
 * Load test: 20 concurrent WhatsApp users sending messages
 *
 * Tests webhook resilience under production-like load:
 * - Concurrent message processing
 * - Deduplication under load
 * - Circuit breaker behavior
 * - Response time degradation
 *
 * Run: npx tsx tests/load/whatsapp-concurrent.test.ts
 */
import crypto from "crypto";

const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || "http://localhost:3000/api/whatsapp/webhook";
const WEBHOOK_SECRET = process.env.WASENDER_WEBHOOK_SECRET || "test-secret";
const CONCURRENT_USERS = 20;
const MESSAGES_PER_USER = 3;

interface LoadTestResult {
  userId: number;
  messageNum: number;
  status: number;
  duration: number;
  error?: string;
}

async function sendMessage(userId: number, messageNum: number): Promise<LoadTestResult> {
  const startTime = Date.now();
  const messageId = crypto.randomUUID();
  const phoneNumber = `357${99000000 + userId}`; // Cyprus numbers

  const payload = {
    type: "messages.upsert",
    sessionId: "test-session",
    timestamp: Date.now(),
    data: {
      key: {
        id: messageId,
        fromMe: false,
        remoteId: `${phoneNumber}@s.whatsapp.net`,
      },
      message: {
        conversation: `Load test message ${messageNum} from user ${userId}`,
      },
      pushName: `TestUser${userId}`,
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    return {
      userId,
      messageNum,
      status: response.status,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      userId,
      messageNum,
      status: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runLoadTest() {
  console.log(`Starting load test: ${CONCURRENT_USERS} concurrent users, ${MESSAGES_PER_USER} messages each`);
  console.log(`Target: ${WEBHOOK_URL}\n`);

  const results: LoadTestResult[] = [];
  const promises: Promise<LoadTestResult>[] = [];

  // Create concurrent requests
  for (let userId = 1; userId <= CONCURRENT_USERS; userId++) {
    for (let msgNum = 1; msgNum <= MESSAGES_PER_USER; msgNum++) {
      promises.push(sendMessage(userId, msgNum));
    }
  }

  // Wait for all requests
  const startTime = Date.now();
  const settled = await Promise.allSettled(promises);
  const totalDuration = Date.now() - startTime;

  // Collect results
  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    }
  }

  // Analyze results
  const successful = results.filter((r) => r.status === 200);
  const failed = results.filter((r) => r.status !== 200);
  const durations = results.map((r) => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  console.log("=== LOAD TEST RESULTS ===\n");
  console.log(`Total requests: ${results.length}`);
  console.log(`Successful: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed.length}`);
  console.log(`\nTiming:`);
  console.log(`  Total duration: ${totalDuration}ms`);
  console.log(`  Avg response: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min response: ${minDuration}ms`);
  console.log(`  Max response: ${maxDuration}ms`);

  if (failed.length > 0) {
    console.log(`\nFailed requests:`);
    failed.forEach((r) => {
      console.log(`  User ${r.userId}, Msg ${r.messageNum}: ${r.status} - ${r.error || "Unknown error"}`);
    });
  }

  // Success criteria
  const successRate = (successful.length / results.length) * 100;
  if (successRate >= 95 && avgDuration < 5000) {
    console.log(`\n✅ PASSED: ${successRate.toFixed(1)}% success, ${avgDuration.toFixed(0)}ms avg`);
    process.exit(0);
  } else {
    console.log(`\n❌ FAILED: ${successRate.toFixed(1)}% success (need 95%), ${avgDuration.toFixed(0)}ms avg (need <5000ms)`);
    process.exit(1);
  }
}

runLoadTest();
```

Also create `tests/load/README.md` with usage instructions:

```markdown
# Load Testing

## WhatsApp Concurrent Load Test

Simulates 20 concurrent WhatsApp users sending 3 messages each (60 total requests).

### Prerequisites

```bash
# Set webhook URL (defaults to localhost)
export TEST_WEBHOOK_URL="https://sofiatesting.vercel.app/api/whatsapp/webhook"

# Set webhook secret (must match production)
export WASENDER_WEBHOOK_SECRET="your-secret-here"
```

### Run

```bash
npx tsx tests/load/whatsapp-concurrent.test.ts
```

### Success Criteria

- ≥95% success rate (57/60 requests)
- <5000ms average response time
- All deduplication working (no duplicate processing in logs)
- Circuit breaker not tripping (check logs)
```

This establishes baseline load testing for production. Run before and after major changes to catch regressions.
  </action>
  <verify>
```bash
cd /home/qualia/Projects/aiagents/sofiatesting
test -f tests/load/whatsapp-concurrent.test.ts && echo "Load test created" || echo "MISSING"
test -f tests/load/README.md && echo "README created" || echo "MISSING"
grep "CONCURRENT_USERS = 20" tests/load/whatsapp-concurrent.test.ts
npx tsc --noEmit tests/load/whatsapp-concurrent.test.ts
```
  </verify>
  <done>
Load test file exists at tests/load/whatsapp-concurrent.test.ts, simulates 20 concurrent users, README documents usage, TypeScript compiles without errors.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. **Deduplication check:**
   ```bash
   grep "DEDUP_TTL_SECONDS = 300" app/api/whatsapp/webhook/route.ts
   grep "isMessageProcessed" app/api/telegram/webhook/route.ts
   ```

2. **Timeout protection:**
   ```bash
   grep "maxDuration = 60" app/api/whatsapp/webhook/route.ts
   grep "maxDuration = 60" app/api/telegram/webhook/route.ts
   ```

3. **Token limits:**
   ```bash
   grep "maxTokens: 4096" lib/whatsapp/message-handler.ts lib/telegram/message-handler.ts app/\(chat\)/api/chat/route.ts
   ```

4. **Circuit breaker wiring:**
   ```bash
   grep "createCircuitBreaker" lib/whatsapp/message-handler.ts lib/telegram/message-handler.ts
   ```

5. **TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

6. **Load test setup:**
   ```bash
   test -f tests/load/whatsapp-concurrent.test.ts && echo "READY"
   ```
</verification>

<success_criteria>
- WhatsApp webhook has 300s dedup TTL (was 60s)
- WhatsApp webhook has maxDuration=60 export
- Telegram webhook has complete deduplication matching WhatsApp (Redis + in-memory fallback)
- All streamText calls in WhatsApp, Telegram, and web chat have maxTokens=4096
- WhatsApp and Telegram message handlers wrapped in circuit breakers
- Load test file exists and compiles, simulates 20 concurrent users
- All TypeScript compilation passes without errors
- No regression in existing functionality (existing tests still pass)
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-critical-production-gaps-whatsapp-de/8-SUMMARY.md`
</output>
