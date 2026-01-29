---
name: channel-integration
description: Add new communication channel (Gmail, Telegram, Slack, Discord) to existing AI agent. Creates webhook handler, client, and connects to AI core.
model: claude-opus-4-5-20251101
tags: [integration, channels, multi-channel, webhook, ai-agent]
---

# Channel Integration

Add a new communication channel to an existing AI agent. Works with Supabase Edge Functions or Next.js API routes.

## Supported Channels

| Channel | Webhook | OAuth | Complexity |
|---------|---------|-------|------------|
| Telegram | Yes | No (Bot Token) | Low |
| WhatsApp (WaSender) | Yes | No (API Key) | Medium |
| WhatsApp (Official) | Yes | Yes | High |
| Gmail | Push Notifications | Yes | High |
| Slack | Yes | Yes | Medium |
| Discord | Yes | No (Bot Token) | Low |
| SMS (Twilio) | Yes | No (API Key) | Low |
| SMS (Telnyx) | Yes | No (API Key) | Low |

## Pipeline

```
1. Analyze Existing Channels
       ↓
2. Create Channel Module
       ↓
3. Create Webhook Handler
       ↓
4. Connect to AI Core
       ↓
5. Configure & Deploy
```

## Phase 1: Analyze Existing Channels

First, find how existing channels work:

```bash
# Find existing integrations
ls -la lib/          # Look for telegram/, whatsapp/, etc.
ls -la supabase/functions/  # Edge Function webhooks

# Study the pattern
cat lib/whatsapp/message-handler.ts
cat supabase/functions/whatsapp-webhook/index.ts
```

Key patterns to identify:
- How messages are received
- How AI is invoked
- How responses are sent
- How sessions are managed

## Phase 2: Create Channel Module

### For Supabase Edge Functions (Deno)

```
supabase/functions/[channel]-webhook/
├── index.ts        # Main handler
└── deps.ts         # Dependencies (optional)

lib/[channel]/
├── client.ts       # API client
├── types.ts        # Type definitions
└── message-handler.ts  # Message processing
```

### Webhook Handler Template (Edge Function)

```typescript
// supabase/functions/[channel]-webhook/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req: Request) => {
  // 1. Verify webhook signature
  const signature = req.headers.get("x-webhook-signature")
  if (!verifySignature(signature, await req.clone().text())) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Parse incoming message
  const payload = await req.json()
  const { senderId, message, metadata } = parsePayload(payload)

  // 3. Get or create session
  const session = await getOrCreateSession(senderId)

  // 4. Process with AI
  const response = await processWithAI(message, session)

  // 5. Send response via channel
  await sendResponse(senderId, response)

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  })
})

// Channel-specific implementations
function parsePayload(payload: any) { /* ... */ }
function verifySignature(sig: string, body: string) { /* ... */ }
async function sendResponse(to: string, message: string) { /* ... */ }
```

### Client Template

```typescript
// lib/[channel]/client.ts
export class ChannelClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = Deno.env.get("[CHANNEL]_API_KEY")!
    this.baseUrl = "https://api.[channel].com"
  }

  async sendMessage(to: string, text: string) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to, text })
    })
    return response.json()
  }

  async sendDocument(to: string, url: string, filename: string) {
    // Channel-specific document sending
  }
}
```

## Phase 3: Channel-Specific Setup

### Telegram

```typescript
// Secrets needed: TELEGRAM_BOT_TOKEN
// Webhook URL: https://<project>.supabase.co/functions/v1/telegram-webhook

// Set webhook
const setWebhook = async () => {
  await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://<project>.supabase.co/functions/v1/telegram-webhook"
    })
  })
}
```

### Gmail (Push Notifications)

```typescript
// Secrets needed: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
// Setup: Google Cloud Pub/Sub + Gmail API watch

// 1. Create Pub/Sub topic
// 2. Grant Gmail publish rights
// 3. Call watch() on Gmail API
// 4. Webhook receives Pub/Sub notifications

const setupGmailWatch = async (gmail: any) => {
  await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: "projects/<project>/topics/gmail-notifications",
      labelIds: ["INBOX"]
    }
  })
}
```

### Slack

```typescript
// Secrets needed: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
// Events API webhook

const verifySlackSignature = (req: Request, body: string) => {
  const timestamp = req.headers.get("x-slack-request-timestamp")
  const signature = req.headers.get("x-slack-signature")
  const sigBasestring = `v0:${timestamp}:${body}`
  // HMAC SHA256 verification
}
```

### Discord

```typescript
// Secrets needed: DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY
// Interactions endpoint

const verifyDiscordSignature = (req: Request, body: string) => {
  const signature = req.headers.get("x-signature-ed25519")
  const timestamp = req.headers.get("x-signature-timestamp")
  // Ed25519 verification
}
```

## Phase 4: Connect to AI Core

Reuse existing AI logic:

```typescript
// Import shared AI utilities
import { processMessage } from "../../lib/ai/core.ts"
import { getSystemPrompt } from "../../lib/ai/prompts.ts"
import { tools } from "../../lib/ai/tools/index.ts"

async function processWithAI(message: string, session: Session) {
  const systemPrompt = await getSystemPrompt()

  const response = await processMessage({
    message,
    history: session.history,
    systemPrompt,
    tools,
  })

  // Update session
  await updateSession(session.id, response)

  return response.text
}
```

## Phase 5: Configure & Deploy

### Supabase Edge Functions

```bash
# Create function
supabase functions new [channel]-webhook

# Set secrets
supabase secrets set [CHANNEL]_API_KEY=xxx
supabase secrets set [CHANNEL]_WEBHOOK_SECRET=xxx

# Deploy
supabase functions deploy [channel]-webhook

# Test locally
supabase functions serve [channel]-webhook
```

### Webhook Registration

Each channel needs webhook URL registration:
- Telegram: `setWebhook` API call
- Slack: App settings → Event Subscriptions
- Discord: App settings → Interactions Endpoint
- Gmail: Pub/Sub subscription

## Quick Start

```bash
# Add Telegram to existing project
/channel-integration telegram

# Add Gmail
/channel-integration gmail

# Add Slack
/channel-integration slack
```

## Checklist

- [ ] Analyze existing channel implementation
- [ ] Create channel directory structure
- [ ] Implement webhook handler
- [ ] Implement client (send messages)
- [ ] Add signature verification
- [ ] Connect to AI core
- [ ] Set secrets in Supabase
- [ ] Deploy Edge Function
- [ ] Register webhook URL
- [ ] Test end-to-end

## Trigger Phrases

- "add telegram integration"
- "integrate gmail"
- "add slack channel"
- "new channel: [name]"
- "connect [channel] to sophia"
