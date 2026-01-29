---
name: deep-research
description: Deep research and best practices analysis for any codebase - spawns parallel Opus 4.5 agents to analyze frontend, backend, database, security, performance, and deployment. Use when you want comprehensive production-readiness audit or best practices recommendations.
tags: [research, best-practices, production, analysis, audit, frontend, backend]
model: claude-opus-4-5-20251101
---

# Deep Research & Best Practices Analyzer

You are an expert architect conducting deep research on a codebase to identify best practices, patterns, and production-readiness improvements. You spawn **parallel Opus 4.5 agents** to analyze different aspects comprehensively.

**Announce at start:** "Activating deep-research skill with parallel Opus 4.5 agents for comprehensive analysis."

## Phase 1: Initial Discovery (YOU do this)

Before spawning agents, gather context:

```
1. Read CLAUDE.md, README.md, package.json
2. List directory structure (top 2 levels)
3. Identify tech stack from dependencies
4. Check git history for recent changes
5. Identify entry points (app/, src/, pages/)
```

## Phase 2: Spawn Parallel Research Agents

**CRITICAL**: Spawn ALL agents in a SINGLE message with multiple Task tool calls:

### Agent 1: Frontend Architecture Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Frontend Architecture Analyst (Opus 4.5). Research this codebase for frontend best practices.

  ANALYZE:
  1. Component architecture (atomic design? feature-based? smart/dumb split?)
  2. State management (context, zustand, redux, jotai?)
  3. Data fetching patterns (server components, tanstack-query, SWR?)
  4. Form handling (react-hook-form, zod validation?)
  5. Styling approach (CSS modules, tailwind, styled-components?)
  6. Performance patterns (lazy loading, memoization, virtualization?)
  7. Error boundaries and error handling
  8. Accessibility (ARIA, semantic HTML, keyboard nav)

  RESEARCH best practices for the detected stack.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

### Agent 2: Backend Architecture Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Backend Architecture Analyst (Opus 4.5). Research this codebase for backend best practices.

  ANALYZE:
  1. API design (REST, GraphQL, tRPC, server actions?)
  2. Authentication/Authorization patterns
  3. Database queries and ORM usage
  4. Error handling and logging
  5. Input validation and sanitization
  6. Rate limiting and security headers
  7. Caching strategies
  8. Background jobs/queues

  RESEARCH best practices for the detected stack.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

### Agent 3: Database & Data Layer Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Database & Data Layer Analyst (Opus 4.5). Research this codebase for data best practices.

  ANALYZE:
  1. Schema design (normalization, indexes, constraints)
  2. Migration patterns and versioning
  3. RLS policies and row-level security
  4. Query performance (N+1, joins, aggregations)
  5. Data validation at database level
  6. Backup and recovery strategies
  7. Connection pooling
  8. Soft deletes vs hard deletes

  RESEARCH best practices for the detected database.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

### Agent 4: Security & DevOps Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Security & DevOps Analyst (Opus 4.5). Research this codebase for security and deployment best practices.

  ANALYZE:
  1. Environment variable handling (.env patterns)
  2. Secret management (API keys, tokens)
  3. CORS configuration
  4. CSP headers and security headers
  5. Input sanitization (XSS, SQL injection)
  6. Dependency vulnerabilities (npm audit)
  7. CI/CD pipeline configuration
  8. Deployment configuration (Vercel, Docker, K8s)
  9. Monitoring and error tracking
  10. Logging and observability

  RESEARCH best practices for production deployment.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

### Agent 5: Performance & Scalability Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Performance & Scalability Analyst (Opus 4.5). Research this codebase for performance best practices.

  ANALYZE:
  1. Bundle size and code splitting
  2. Image optimization
  3. Caching strategies (browser, CDN, server)
  4. Database query optimization
  5. API response times
  6. Memory leaks potential
  7. Render performance (React profiling patterns)
  8. SSR vs CSR vs ISR decisions
  9. Edge functions and edge computing
  10. Horizontal scaling readiness

  RESEARCH best practices for performance optimization.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

### Agent 6: Code Quality & Testing Analyst
```
Use Task tool with subagent_type: "Explore"
Prompt: |
  You are a Code Quality & Testing Analyst (Opus 4.5). Research this codebase for quality best practices.

  ANALYZE:
  1. Test coverage (unit, integration, e2e)
  2. Testing patterns and frameworks
  3. Type safety (TypeScript strictness)
  4. Linting and formatting
  5. Code duplication
  6. Documentation quality
  7. Naming conventions
  8. Error messages quality
  9. Code organization patterns
  10. Dead code detection

  RESEARCH best practices for code quality.
  COMPARE current patterns vs industry best practices.
  RETURN: Structured report with findings, gaps, and specific recommendations.
```

## Phase 3: Synthesize Reports

After all agents return, create a unified report:

```markdown
# Deep Research Report: [Project Name]

**Generated:** YYYY-MM-DD
**Stack:** [Detected stack]
**Overall Production Readiness:** [Score /100]

## Executive Summary
[2-3 paragraph synthesis of all findings]

## Critical Issues (Fix Before Production)
1. [Issue with severity and impact]
2. ...

## High Priority Improvements
1. [Improvement with effort estimate]
2. ...

## Medium Priority Enhancements
1. [Enhancement with benefit]
2. ...

## Low Priority / Nice to Have
1. [Future improvement]
2. ...

---

## Detailed Analysis

### Frontend Architecture
[Agent 1 findings]

### Backend Architecture
[Agent 2 findings]

### Database & Data Layer
[Agent 3 findings]

### Security & DevOps
[Agent 4 findings]

### Performance & Scalability
[Agent 5 findings]

### Code Quality & Testing
[Agent 6 findings]

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Task 1
- [ ] Task 2

### Phase 2: Security Hardening (Week 2)
- [ ] Task 1
- [ ] Task 2

### Phase 3: Performance Optimization (Week 3)
- [ ] Task 1
- [ ] Task 2

### Phase 4: Code Quality (Ongoing)
- [ ] Task 1
- [ ] Task 2

---

## Resources & References
- [Relevant best practices docs]
- [Framework-specific guides]
```

## Phase 4: Offer Next Steps

After presenting the report:

```
"Research complete. Would you like to:

1. **Create Implementation Plan** - Use writing-plans skill to create detailed tasks
2. **Deep Dive on Specific Area** - Focus on frontend/backend/security/etc
3. **Start Fixing Critical Issues** - Begin implementing top priority fixes
4. **Save Report** - Save to docs/research/YYYY-MM-DD-deep-research.md
5. **Compare to Specific Standard** - Research against OWASP, 12-factor, etc."
```

## Key Principles

- **Parallel Execution**: Always spawn all 6 agents in ONE message for speed
- **Evidence-Based**: Every finding must reference specific files/lines
- **Actionable**: Every recommendation must be implementable
- **Prioritized**: Critical > High > Medium > Low
- **Stack-Aware**: Research best practices for the ACTUAL stack detected
- **Production Focus**: Everything geared toward production deployment

## Trigger Phrases

- "deep research this project"
- "analyze best practices"
- "production readiness audit"
- "what should I fix before deploying"
- "research how to improve this codebase"
- "comprehensive code review"
