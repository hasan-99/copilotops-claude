# /audit — Deep project audit

Comprehensive audit of the current project. Security, performance, code quality, deployment readiness.

## Audit Checklist

### Security
- [ ] RLS enabled on all Supabase tables
- [ ] No service_role key in client components
- [ ] Auth checks in all server actions and API routes
- [ ] Zod validation on all inputs
- [ ] No hardcoded secrets in code (grep for API keys, tokens, passwords)
- [ ] .env.local not committed to git
- [ ] CSP headers configured (if applicable)

### Code Quality
- [ ] TypeScript strict mode — `npx tsc --noEmit` passes
- [ ] ESLint clean — `npx eslint .` passes
- [ ] No console.log left in production code
- [ ] No unused imports or dead code
- [ ] Server actions use `lib/supabase/server.ts`, never `client.ts`

### Performance
- [ ] Images optimized (next/image used)
- [ ] No N+1 queries in Supabase calls
- [ ] Proper loading states / Suspense boundaries
- [ ] Bundle size reasonable (check with `npm run build`)

### Deployment
- [ ] vercel.json configured (if Vercel)
- [ ] Environment variables set in Vercel dashboard
- [ ] Domain configured and DNS propagated
- [ ] 4-check verification passes (HTTP 200, auth, console, latency)

### Production Resilience
- [ ] **Webhook idempotency**: Deduplication prevents duplicate processing on retries
- [ ] **Timeout protection**: API routes have `export const maxDuration` (Vercel/Edge Functions)
- [ ] **Circuit breakers**: AI/external API calls wrapped with failure protection
- [ ] **Token/cost limits**: AI calls have `maxTokens` configured to prevent runaway costs
- [ ] **Graceful degradation**: Fallback behavior when external services fail
- [ ] **Error monitoring**: Sentry/error tracking configured and tested
- [ ] **Uptime monitoring**: External health checks configured (UptimeRobot, etc.)

### Load Testing (AI/Voice Agents)
- [ ] **Concurrency tested**: Load test with expected user count (e.g., 20 concurrent)
- [ ] **Database pooling**: Connection limits appropriate for expected load
- [ ] **Rate limiting**: Per-user limits prevent abuse
- [ ] **Performance baseline**: Response times <500ms under normal load

### Documentation
- [ ] CLAUDE.md exists and is accurate
- [ ] README.md exists with setup instructions
- [ ] .mcp.json configured (if project uses Supabase)

## Output
For each section: PASS / FAIL / WARN with specific issues found.
End with a grade (A-F) and top 3 priority fixes.
