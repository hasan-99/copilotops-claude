# Project Template: AI Agent

> AI chat agent with Next.js frontend, Supabase backend, and AI provider integration.

**Stack:** Next.js 16+, React 19, TypeScript, Supabase, AI SDK / OpenRouter / Gemini, Vercel
**Phases:** 7
**Type:** ai-agent

## Phases

### Phase 1: Foundation
**Goal:** Working Next.js app with Supabase schema, auth, and base project structure
**Skills:** [@supabase]
**Tasks:**
- Initialize Next.js 16+ with App Router, TypeScript strict, Tailwind v4
- Design Supabase schema: users, conversations, messages, system_prompts
- Configure Supabase client (server.ts + client.ts pattern)
- Implement auth: login, signup (Supabase Auth)
- RLS policies on all tables (user can only access own conversations)
- Environment variables for AI provider keys
- Base layout with navigation shell

**Success Criteria:**
1. User can create account and log in
2. Database schema deployed with RLS enabled
3. Server-side auth working
4. `npx tsc --noEmit` passes

---

### Phase 2: AI Core
**Goal:** Working AI conversation engine with streaming responses and conversation persistence
**Skills:** [@supabase]
**Tasks:**
- AI provider integration (OpenRouter / Gemini / OpenAI — based on project needs)
- System prompt management (stored in Supabase, editable)
- Streaming response handler (SSE or WebSocket)
- Conversation management: create, continue, branch
- Message persistence: save user messages and AI responses
- Context window management (truncation strategy for long conversations)
- Token usage tracking per conversation
- Error handling: rate limits, provider failures, timeout recovery

**Success Criteria:**
1. User can send message and receive streaming AI response
2. Conversations persist across page reloads
3. System prompt shapes AI behavior correctly
4. Graceful handling of API errors (no crash, clear user message)

---

### Phase 3: Chat UI
**Goal:** Polished chat interface with real-time feel and markdown support
**Skills:** [@frontend-master]
**Tasks:**
- Message bubbles with user/AI distinction
- Streaming text animation (typewriter effect)
- Markdown rendering in AI responses (code blocks, lists, links)
- Typing indicator while AI generates
- Conversation list sidebar with search
- New conversation button
- Auto-scroll to latest message
- Message input with multiline support and send on Enter
- Copy message button
- Responsive layout (sidebar collapses on mobile)

**Success Criteria:**
1. Messages render with clear user/AI visual distinction
2. Streaming responses appear character-by-character
3. Code blocks syntax-highlighted and copyable
4. UI works on mobile (sidebar toggles, input accessible)

---

### Phase 4: Admin Panel
**Goal:** Admin interface for managing the AI agent: prompts, users, analytics
**Skills:** [@admin-panel, @supabase]
**Tasks:**
- Admin auth (role-based, separate from user auth)
- System prompt editor (CRUD, version history)
- User management: list, view conversations, ban/unban
- Conversation analytics: message counts, popular topics, response times
- Token usage dashboard per user and total
- AI model configuration (switch providers, adjust temperature)
- Export conversations (CSV/JSON)

**Success Criteria:**
1. Admin can edit system prompt and see changes reflected in new conversations
2. Admin can view user conversations and usage stats
3. Analytics dashboard shows meaningful metrics
4. Non-admins cannot access admin routes

---

### Phase 5: Channel Integration
**Goal:** AI agent accessible via WhatsApp, Telegram, or web widget (based on project needs)
**Skills:** [@supabase]
**Tasks:**
- Webhook endpoint for channel provider
- Message format translation (channel format ↔ internal format)
- User identity mapping (channel user → Supabase user)
- Media handling (images, voice messages if applicable)
- Rate limiting per channel user
- Channel-specific formatting (WhatsApp markdown vs web markdown)
- Health check endpoint for webhook verification

**Success Criteria:**
1. Messages from channel reach AI and response returns to channel
2. Conversation history shared across channels for same user
3. Rate limiting prevents abuse
4. Webhook responds within provider timeout limits

---

### Phase 6: Safety & Resilience
**Goal:** Production-grade safety: prompt injection defense, rate limiting, failover
**Skills:** []
**Tasks:**
- Prompt injection detection (input sanitization, pattern matching)
- Output filtering (PII detection, harmful content blocking)
- Rate limiting: per-user, per-IP, global
- AI provider failover (primary → secondary provider)
- Conversation length limits with graceful handling
- Input validation (max length, content type)
- Logging: all AI interactions logged for audit
- Error recovery: conversation state preserved on failures

**Success Criteria:**
1. Known prompt injection patterns blocked
2. Rate limits enforced and clear feedback to user
3. Provider failover works (disable primary, secondary picks up)
4. No PII leaked in AI responses (if configured)

---

### Phase 7: Deploy & Verify
**Goal:** Production deployment with AI-specific verification
**Skills:** [@deploy-verify]
**Team:** ship-team
**Tasks:**
- Final type check and lint
- Production build
- Deploy to Vercel
- Verify AI provider keys work in production
- Test full conversation flow in production
- Load test: concurrent conversations (if applicable)
- Run 6-check post-deploy verification
- Supabase production review (RLS, no service key exposed)

**Success Criteria:**
1. HTTP 200, auth flow works, no console errors
2. AI responds correctly in production
3. Conversations persist across sessions
4. API latency < 500ms for non-AI endpoints
5. AI response time < 5s for first token
6. No source maps or service keys exposed
