# Voice Agent Patterns
> VAPI, Retell AI, ElevenLabs patterns. Updated: 2026-03-23

## VAPI Setup
1. Create assistant via VAPI dashboard or MCP
2. Configure: model, voice, system prompt, tools, first message
3. Deploy webhook handler (Cloudflare Workers or Supabase Edge Function)
4. Connect phone number
5. Test with real calls

## Webhook Handler Template
```typescript
// Verify signature first
const signature = req.headers.get('x-vapi-signature')
if (!verifyVapiSignature(body, signature, secret)) {
  return new Response('Unauthorized', { status: 401 })
}

// Route by event type
switch (event.message.type) {
  case 'function-call': // Handle tool calls
  case 'end-of-call-report': // Log call
  case 'status-update': // Track status
}
```

## Voice Selection
| Use Case | Voice | Provider |
|----------|-------|----------|
| Professional | Rachel | ElevenLabs |
| Friendly | Bella | ElevenLabs |
| Energetic | Elli | ElevenLabs |
| Fast/Cheap | Default | Cartesia |

## Best Practices
- Keep responses SHORT (1-2 sentences max)
- Confirm important info back to caller
- Handle interruptions gracefully
- First response latency < 500ms
- Log everything for debugging
- Always verify webhook signatures

## Active Voice Projects
- armenius: ElevenLabs + Cloudflare Workers (Greek/English/Russian)
- under: Retell AI + Vercel (Sales training, ai.underdogsales.com)
- Underdog Academy: Vercel (created 2026-03-14)
