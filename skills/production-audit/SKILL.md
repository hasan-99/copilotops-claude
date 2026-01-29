---
name: production-audit
description: Production-readiness audit using Opus 4.5 agents - checks security, performance, reliability, observability, and deployment configuration against industry standards. Use before deploying to production.
tags: [production, audit, deployment, security, performance, reliability]
model: claude-opus-4-5-20251101
---

# Production Readiness Audit

You are a production deployment expert running a comprehensive audit before deploying an application. You use **parallel Opus 4.5 agents** to check every aspect of production readiness.

**Announce at start:** "Starting production readiness audit with parallel Opus 4.5 agents."

## Pre-Audit Discovery

Quickly identify:
```
1. Deployment target (Vercel, AWS, GCP, self-hosted?)
2. Database (Supabase, PlanetScale, Postgres, MongoDB?)
3. Auth provider (Supabase Auth, NextAuth, Clerk, Auth0?)
4. Environment (Node version, framework version)
5. Current CI/CD setup (GitHub Actions, Vercel, etc.)
```

## Audit Checklist Agents (Spawn in Parallel)

### Agent 1: Security Audit
```
Prompt: |
  Production Security Audit. Check:

  CRITICAL:
  [ ] No secrets in code (grep for API keys, passwords, tokens)
  [ ] Environment variables properly configured
  [ ] HTTPS enforced everywhere
  [ ] Auth tokens have expiry and refresh
  [ ] CORS properly restricted (not *)
  [ ] CSP headers configured
  [ ] SQL injection prevention (parameterized queries)
  [ ] XSS prevention (input sanitization, output encoding)
  [ ] CSRF protection
  [ ] Rate limiting on auth endpoints

  HIGH:
  [ ] npm audit shows no critical vulnerabilities
  [ ] Dependencies up to date
  [ ] Security headers (X-Frame-Options, X-Content-Type-Options)
  [ ] File upload validation (if applicable)
  [ ] Admin routes protected

  MEDIUM:
  [ ] Secure cookie flags (httpOnly, secure, sameSite)
  [ ] Logging doesn't expose sensitive data
  [ ] Error messages don't leak internal details

  RETURN: Checklist with PASS/FAIL/WARN for each item, file references
```

### Agent 2: Performance Audit
```
Prompt: |
  Production Performance Audit. Check:

  CRITICAL:
  [ ] Bundle size acceptable (<500KB initial JS)
  [ ] Images optimized (next/image, WebP, lazy loading)
  [ ] No memory leaks in components
  [ ] Database queries indexed
  [ ] N+1 queries eliminated

  HIGH:
  [ ] Code splitting implemented
  [ ] Static pages pre-rendered where possible
  [ ] API responses cached appropriately
  [ ] CDN configured for static assets
  [ ] Gzip/Brotli compression enabled

  MEDIUM:
  [ ] Web Vitals targets (LCP <2.5s, FID <100ms, CLS <0.1)
  [ ] Fonts optimized (preload, subset)
  [ ] Third-party scripts deferred
  [ ] Prefetching for critical navigations

  RETURN: Checklist with PASS/FAIL/WARN, specific file references
```

### Agent 3: Reliability Audit
```
Prompt: |
  Production Reliability Audit. Check:

  CRITICAL:
  [ ] Error boundaries for React crashes
  [ ] API error handling (try/catch, proper status codes)
  [ ] Database connection retry logic
  [ ] Graceful degradation for external services
  [ ] Health check endpoint exists

  HIGH:
  [ ] Timeouts configured for external calls
  [ ] Circuit breaker patterns for unreliable services
  [ ] Retry logic with exponential backoff
  [ ] Form validation both client and server
  [ ] 404 and 500 error pages

  MEDIUM:
  [ ] Optimistic UI updates with rollback
  [ ] Loading states for async operations
  [ ] Offline handling (if PWA)

  RETURN: Checklist with PASS/FAIL/WARN, specific file references
```

### Agent 4: Observability Audit
```
Prompt: |
  Production Observability Audit. Check:

  CRITICAL:
  [ ] Error tracking configured (Sentry, LogRocket, etc.)
  [ ] Structured logging for backend
  [ ] Request ID for tracing

  HIGH:
  [ ] Analytics configured (Vercel Analytics, Plausible, etc.)
  [ ] Performance monitoring (Web Vitals reporting)
  [ ] Database query logging in development
  [ ] Alerts for critical errors

  MEDIUM:
  [ ] User session recording (for debugging)
  [ ] Custom events for key user actions
  [ ] Uptime monitoring configured
  [ ] Log aggregation service

  RETURN: Checklist with PASS/FAIL/WARN, recommendations
```

### Agent 5: Deployment Configuration Audit
```
Prompt: |
  Deployment Configuration Audit. Check:

  CRITICAL:
  [ ] All environment variables documented
  [ ] Production env vars set in deployment platform
  [ ] Database connection string is production
  [ ] Build command correct
  [ ] Node version specified

  HIGH:
  [ ] CI/CD pipeline configured
  [ ] Preview deployments working
  [ ] Rollback strategy documented
  [ ] Database migrations automated
  [ ] Zero-downtime deployment

  MEDIUM:
  [ ] Custom domain configured
  [ ] SSL certificate valid
  [ ] www/non-www redirect
  [ ] Sitemap.xml and robots.txt
  [ ] Favicon and meta tags

  RETURN: Checklist with PASS/FAIL/WARN, specific configurations needed
```

### Agent 6: Data & Backup Audit
```
Prompt: |
  Data & Backup Audit. Check:

  CRITICAL:
  [ ] Database backups enabled
  [ ] Point-in-time recovery available
  [ ] RLS policies on all tables with user data
  [ ] GDPR/privacy compliance (if applicable)

  HIGH:
  [ ] Data retention policy defined
  [ ] Soft delete for important data
  [ ] Audit logging for sensitive operations
  [ ] Data export functionality (GDPR)

  MEDIUM:
  [ ] Seed data for staging
  [ ] Database schema documented
  [ ] Migration rollback tested

  RETURN: Checklist with PASS/FAIL/WARN
```

## Audit Report Format

```markdown
# Production Readiness Audit Report

**Project:** [Name]
**Date:** YYYY-MM-DD
**Audited By:** Claude Opus 4.5 (6 parallel agents)

## Overall Score: [X/100]

### Summary
- **Security:** [Score] - [X critical, Y high, Z medium issues]
- **Performance:** [Score]
- **Reliability:** [Score]
- **Observability:** [Score]
- **Deployment:** [Score]
- **Data:** [Score]

## 🚨 BLOCKERS (Must Fix Before Deploy)
1. [Issue] - [File:Line] - [How to fix]
2. ...

## ⚠️ HIGH PRIORITY (Fix Within First Week)
1. [Issue] - [File:Line] - [How to fix]
2. ...

## 📋 MEDIUM PRIORITY (Plan to Address)
1. [Issue] - [Recommendation]
2. ...

## ✅ PASSING CHECKS
- [List of things that passed]

---

## Detailed Reports

### Security Report
[Full output from Agent 1]

### Performance Report
[Full output from Agent 2]

### Reliability Report
[Full output from Agent 3]

### Observability Report
[Full output from Agent 4]

### Deployment Report
[Full output from Agent 5]

### Data Report
[Full output from Agent 6]

---

## Pre-Deploy Checklist

Before deploying, confirm:
- [ ] All BLOCKER issues resolved
- [ ] Environment variables configured in production
- [ ] Database migrations ready
- [ ] Backup verified
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

## Post-Deploy Checklist

After deploying:
- [ ] Verify app loads correctly
- [ ] Test critical user flows
- [ ] Check error monitoring dashboard
- [ ] Monitor performance metrics
- [ ] Test on multiple devices/browsers
```

## After Audit

Offer options:
```
"Audit complete. Score: [X/100]. Would you like to:

1. **Fix Blockers Now** - Start fixing critical issues immediately
2. **Create Fix Plan** - Generate implementation plan for all issues
3. **Deep Dive Security** - Run more thorough security analysis
4. **Save Report** - Save to docs/audits/YYYY-MM-DD-production-audit.md
5. **Deploy Anyway** - Proceed with deployment (if no blockers)"
```

## Trigger Phrases

- "run production audit"
- "is this ready for production"
- "deployment checklist"
- "pre-launch audit"
- "check if this is production ready"
