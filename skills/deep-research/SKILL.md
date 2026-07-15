---
name: deep-research
description: Deep research and best practices analysis for any codebase - spawns parallel Opus agents to analyze frontend, backend, database, security, performance, and deployment. Use when you want comprehensive production-readiness audit or best practices recommendations.
tags: [research, best-practices, production, analysis, audit, frontend, backend]
---

# Deep Research & Best Practices Analyzer

You are an expert architect conducting deep research on a codebase to identify best practices, patterns, and production-readiness improvements. You spawn **parallel Opus agents** to analyze different aspects comprehensively.

**Announce at start:** "Activating deep-research skill with parallel Opus agents for comprehensive analysis."

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

**CRITICAL**: Spawn ALL agents in a SINGLE message with multiple Agent tool calls:

### Agent 1: Frontend Architecture Analyst
```
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Frontend Architecture Analyst (Opus). Research this codebase for frontend best practices.

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
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Backend Architecture Analyst (Opus). Research this codebase for backend best practices.

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
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Database & Data Layer Analyst (Opus). Research this codebase for data best practices.

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
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Security & DevOps Analyst (Opus). Research this codebase for security and deployment best practices.

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
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Performance & Scalability Analyst (Opus). Research this codebase for performance best practices.

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
Agent(
  subagent_type="general-purpose",
  prompt="
  You are a Code Quality & Testing Analyst (Opus). Research this codebase for quality best practices.

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

After all 6 agents return, **spawn the synthesizer agent** to consolidate findings. Do NOT synthesize inline — this prevents context bloat in the parent.

Each agent's report will be in the tool result. Write each one to a temp file, then spawn the synthesizer:

```bash
# Write each agent's output to a temp file
# (use the actual tool result content from each agent)
```

Then spawn the synthesizer agent:

```
Agent(
  subagent_type="qualia-research-synthesizer",
  prompt="
  Synthesize these specialist reports:
  - [path to frontend report]
  - [path to backend report]
  - [path to database report]
  - [path to security report]
  - [path to performance report]
  - [path to code quality report]

  Downstream consumer: The user needs a prioritized Deep Research Report with:
  - Overall production readiness score (/100)
  - Critical/High/Medium/Low severity findings with file:line references
  - Cross-cutting patterns across all 6 areas
  - Implementation roadmap grouped by week
  - Resources and references

  Output path: docs/research/[YYYY-MM-DD]-deep-research.md
  (also return the full report in your response)

  Do NOT commit.
  "
)
```

The synthesizer handles deduplication, cross-cutting pattern detection, and severity ranking — producing a single unified report.

## Phase 4: Offer Next Steps

After presenting the report:

```
"Research complete. Would you like to:

1. **Create Implementation Plan** - Use /qualia-plan to create detailed tasks
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
