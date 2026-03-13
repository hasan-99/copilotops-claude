# Project Template: Voice Agent

> Voice AI agent with Supabase Edge Functions, VAPI/Retell AI, and ElevenLabs.

**Stack:** Supabase Edge Functions (Deno), VAPI / Retell AI, ElevenLabs, TypeScript
**Phases:** 6
**Type:** voice-agent

## Phases

### Phase 1: Foundation
**Goal:** Supabase project with schema, edge function boilerplate, and voice provider connection
**Skills:** [@supabase, @voice-agent]
**Tasks:**
- Design Supabase schema: calls, call_events, contacts, tools, system_config
- Create edge function scaffold (Deno, cors headers, error handling)
- Configure voice provider (VAPI or Retell AI): API keys, assistant creation
- Environment variables in Supabase (voice provider keys, webhook secret)
- Basic webhook endpoint that receives and logs call events
- RLS policies on all tables

**Success Criteria:**
1. Edge function deployed and responding to health check
2. Voice provider can reach webhook endpoint
3. Schema deployed with RLS enabled
4. Call events logging to database

---

### Phase 2: Voice Flow Design
**Goal:** Complete conversation state machine with branching paths and slot filling
**Skills:** [@voice-agent]
**Tasks:**
- Design conversation flow (state machine: greeting → discovery → action → closing)
- Create VAPI/Retell assistant configuration (system prompt, voice, language)
- Define conversation states and transitions
- Slot filling logic (extract key info from conversation)
- Multi-language support (if applicable — e.g., Greek/English/Russian)
- Interruption handling (user interrupts mid-sentence)
- Silence detection and re-engagement prompts
- Transfer-to-human escalation path

**Success Criteria:**
1. Assistant follows designed flow in test calls
2. Slot filling correctly extracts required information
3. Language switching works naturally (if multi-language)
4. Escalation to human triggers correctly

---

### Phase 3: Webhook Handlers
**Goal:** Robust webhook processing for all voice provider events
**Skills:** [@supabase, @voice-agent]
**Tasks:**
- Webhook signature verification (prevent spoofing)
- Call start handler: create call record, load contact context
- Call end handler: save transcript, update call status, trigger follow-ups
- Function call handler: route tool calls to appropriate handlers
- Status update handler: track call progress in real-time
- Error handler: graceful failure with logging
- Idempotency: handle duplicate webhook deliveries

**Success Criteria:**
1. All webhook events processed and logged
2. Signature verification blocks invalid requests
3. Duplicate deliveries don't create duplicate records
4. Failed handlers don't crash the entire endpoint

---

### Phase 4: Tool Functions
**Goal:** Business logic tools the voice agent can call during conversations
**Skills:** [@supabase]
**Tasks:**
- Tool definition schema (name, description, parameters)
- Tool router: dispatch function calls to handlers
- Business-specific tools (varies per project):
  - Database lookups (order status, product search, appointment check)
  - External API calls (CRM, inventory, booking system)
  - Data mutations (create appointment, update record, send notification)
- Tool response formatting (structured → natural language for voice)
- Tool error handling (timeout, API failure → graceful voice response)
- Tool call logging (for analytics and debugging)

**Success Criteria:**
1. Voice agent can call tools mid-conversation and use results
2. Tool failures produce graceful voice responses (not errors)
3. All tool calls logged with input/output
4. Tool response latency < 2s (voice conversations are latency-sensitive)

---

### Phase 5: Testing & Tuning
**Goal:** Reliable voice agent with optimized latency and conversation quality
**Skills:** [@voice-agent]
**Tasks:**
- Test call suite: happy path, edge cases, error scenarios
- Latency profiling: identify slow tool calls, optimize
- Voice quality tuning: adjust voice provider settings (speed, pitch, stability)
- Prompt engineering: refine system prompt based on test call results
- Edge case handling: unknown inputs, off-topic queries, hostile callers
- Load testing: concurrent calls (if applicable)
- Transcript review: analyze test transcripts for quality issues
- Cost analysis: per-call cost breakdown (voice + AI + telephony)

**Success Criteria:**
1. Happy path call completes successfully in < 3 minutes
2. All tool calls respond within 2s
3. Voice sounds natural (no robotic artifacts or awkward pauses)
4. Edge cases handled gracefully (no hangups or infinite loops)

---

### Phase 6: Deploy & Verify
**Goal:** Production edge functions deployed with voice provider configured
**Skills:** [@deploy-verify, @voice-agent]
**Team:** ship-team
**Tasks:**
- Final type check on edge functions
- Deploy edge functions to Supabase production
- Configure voice provider webhooks to production URLs
- Verify webhook signature validation in production
- Test call in production environment
- Monitor first 10 production calls for issues
- Set up alerting for webhook failures
- Document: phone number, webhook URLs, provider dashboard links

**Success Criteria:**
1. Edge function responds 200 to health check
2. Voice provider webhook configured and verified
3. Test call completes full flow in production
4. Tool calls work with production data
5. No secrets exposed in edge function logs
6. Webhook failures trigger alerts
