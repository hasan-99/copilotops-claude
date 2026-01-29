---
name: supabase-edge
description: Build and deploy Supabase Edge Functions - Deno runtime, webhooks, database access, secrets management. Use for serverless backend logic.
model: claude-opus-4-5-20251101
tags: [supabase, edge-functions, deno, serverless, backend]
---

# Supabase Edge Functions

Build serverless functions on Supabase. Deno runtime, TypeScript, direct database access.

## When to Use

- Webhook handlers (Telegram, WhatsApp, Stripe, etc.)
- Background jobs and cron
- API endpoints without full backend
- Serverless AI processing

## Quick Reference

```bash
# Create new function
supabase functions new my-function

# Local development
supabase functions serve

# Deploy single function
supabase functions deploy my-function

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs my-function --tail

# Set secrets
supabase secrets set MY_SECRET=value

# List secrets
supabase secrets list
```

## Project Structure

```
supabase/
├── functions/
│   ├── _shared/           # Shared utilities (import with relative path)
│   │   ├── supabase.ts    # Supabase client
│   │   ├── cors.ts        # CORS headers
│   │   └── types.ts       # Shared types
│   ├── webhook-handler/
│   │   └── index.ts       # Function entry point
│   └── another-function/
│       └── index.ts
├── migrations/            # Database migrations
└── config.toml           # Supabase config
```

## Basic Function Template

```typescript
// supabase/functions/my-function/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const body = await req.json()

    // Your logic here
    const result = { message: "Hello", data: body }

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

## Supabase Client in Edge Functions

```typescript
// supabase/functions/_shared/supabase.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Full access
)

// Or for user-context access
export function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } }
    }
  )
}
```

## Webhook Handler Template

```typescript
// supabase/functions/webhook-handler/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!

Deno.serve(async (req: Request) => {
  // 1. Verify signature
  const signature = req.headers.get("x-webhook-signature")
  const body = await req.text()

  if (!verifySignature(body, signature)) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Parse payload
  const payload = JSON.parse(body)

  // 3. Process
  await processWebhook(payload)

  // 4. Respond quickly (webhook timeout)
  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const hmac = createHmac("sha256", WEBHOOK_SECRET)
  hmac.update(body)
  const expected = hmac.digest("hex")
  return signature === expected
}

async function processWebhook(payload: any) {
  // Your webhook logic
  console.log("Processing:", payload)
}
```

## Database Access

```typescript
import { supabase } from "../_shared/supabase.ts"

// Select
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .single()

// Insert
const { data, error } = await supabase
  .from("messages")
  .insert({ user_id: userId, content: message })
  .select()
  .single()

// Update
const { error } = await supabase
  .from("users")
  .update({ last_seen: new Date().toISOString() })
  .eq("id", userId)

// RPC (stored procedure)
const { data, error } = await supabase
  .rpc("get_user_stats", { user_id: userId })
```

## Environment Variables

```typescript
// Built-in (always available)
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_ANON_KEY")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

// Custom secrets (set via CLI)
Deno.env.get("MY_API_KEY")
Deno.env.get("WEBHOOK_SECRET")
```

## Deno Imports (NOT npm)

```typescript
// Supabase client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Standard library
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts"

// NPM packages via esm.sh
import Anthropic from "https://esm.sh/@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

// Or use import map in deno.json
```

## Import Map (deno.json)

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "anthropic": "https://esm.sh/@anthropic-ai/sdk",
    "google-ai": "https://esm.sh/@google/generative-ai"
  }
}
```

## AI Integration

```typescript
// supabase/functions/ai-chat/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
const model = genAI.getGenerativeModel({ model: "gemini-pro" })

Deno.serve(async (req: Request) => {
  const { message } = await req.json()

  const result = await model.generateContent(message)
  const response = result.response.text()

  return new Response(JSON.stringify({ response }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

## Cron Jobs (Scheduled Functions)

```sql
-- In Supabase SQL Editor, enable pg_cron
select cron.schedule(
  'daily-cleanup',
  '0 0 * * *', -- Every day at midnight
  $$
  select net.http_post(
    'https://<project>.supabase.co/functions/v1/daily-cleanup',
    '{}',
    '{"Authorization": "Bearer <service_role_key>"}'
  )
  $$
);
```

## Error Handling

```typescript
Deno.serve(async (req: Request) => {
  try {
    // Main logic
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Function error:", error)

    // Return error response
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: Deno.env.get("ENV") === "development" ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
})
```

## Local Development

```bash
# Start local Supabase
supabase start

# Serve functions with hot reload
supabase functions serve

# Serve specific function
supabase functions serve my-function

# With environment variables
supabase functions serve --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Deployment

```bash
# Deploy single function
supabase functions deploy my-function

# Deploy all
supabase functions deploy

# Deploy with specific project
supabase functions deploy --project-ref <project-id>

# Check deployment status
supabase functions list
```

## Debugging

```bash
# Tail logs in real-time
supabase functions logs my-function --tail

# Get recent logs
supabase functions logs my-function

# In Supabase Dashboard
# Project → Edge Functions → Select function → Logs
```

## Common Patterns

### Rate Limiting with Redis

```typescript
import { Redis } from "https://esm.sh/@upstash/redis"

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_TOKEN")!,
})

async function rateLimit(key: string, limit: number, window: number) {
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, window)
  }
  return count <= limit
}
```

### Background Processing

```typescript
// Respond immediately, process in background
Deno.serve(async (req: Request) => {
  const payload = await req.json()

  // Start background processing (don't await)
  processInBackground(payload)

  // Respond immediately
  return new Response(JSON.stringify({ queued: true }), {
    headers: { "Content-Type": "application/json" },
  })
})

async function processInBackground(payload: any) {
  // Long-running task
  // Note: Function may be killed after response sent
  // For guaranteed execution, use a queue
}
```

## Checklist

- [ ] Create function with `supabase functions new`
- [ ] Add Deno imports (not npm)
- [ ] Set up Supabase client
- [ ] Add error handling
- [ ] Set secrets with `supabase secrets set`
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy with `supabase functions deploy`
- [ ] Verify logs with `supabase functions logs`

## Trigger Phrases

- "create edge function"
- "supabase function for [purpose]"
- "webhook handler in supabase"
- "deploy to edge functions"
- "serverless function"
