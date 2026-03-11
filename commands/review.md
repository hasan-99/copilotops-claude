---
description: Code review with optional performance optimization deep-dive
argument-hint: "[--perf] [target path or description]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Review code for quality, correctness, and maintainability. With `--perf` flag, run a comprehensive performance optimization analysis across the full stack.

**Modes:**
- **Default** — Standard code review. Checks: correctness, edge cases, error handling, naming, readability, security, test coverage, consistency with project patterns.
- `--perf` — Full-stack performance optimization using specialized subagents across 5 phases:

  **Phase 1: Performance Analysis**
  1. Application Profiling (subagent: performance-engineer) — CPU, memory, I/O bottlenecks, flame graphs, resource utilization
  2. Database Performance (subagent: database-optimizer) — Query execution plans, slow queries, indexing, connection pooling

  **Phase 2: Backend Optimization**
  3. Backend Code (subagent: performance-engineer) — Algorithm efficiency, caching strategies, async operations
  4. API Design (subagent: backend-architect) — Pagination, response compression, field filtering, batch operations

  **Phase 3: Frontend Optimization**
  5. Frontend Performance (subagent: frontend-developer) — Bundle size, lazy loading, code splitting, Core Web Vitals
  6. Mobile Optimization (subagent: mobile-developer) — Startup time, memory usage, battery efficiency, offline performance

  **Phase 4: Infrastructure Optimization**
  7. Cloud Infrastructure (subagent: cloud-architect) — Auto-scaling, instance types, CDN, geographic distribution
  8. Deployment Pipeline (subagent: deployment-engineer) — CI/CD performance, build caching, container optimization

  **Phase 5: Monitoring & Validation**
  9. Performance Monitoring (subagent: devops-troubleshooter) — APM, real user monitoring, custom metrics, SLO definitions
  10. Performance Testing (subagent: test-automator) — Load tests, stress tests, performance regression tests

  Each optimization is validated with measurements. Trade-offs are documented.
</objective>

<process>

## Default Mode (no flags)

1. Identify target files from $ARGUMENTS (path, glob, or recent changes via `git diff`)
2. Read each file and review for:
   - Correctness and edge cases
   - Error handling completeness
   - Naming and readability
   - Security concerns
   - Test coverage gaps
   - Consistency with project patterns
3. Report findings grouped by severity (critical → suggestion)

## --perf Mode

Run the 5-phase performance optimization end-to-end:

For each phase, spawn a Task subagent with the appropriate type and a prompt targeting $ARGUMENTS.

**Coordination rules:**
- Performance metrics guide optimization priorities
- Each optimization must be validated with measurements
- Consider trade-offs between different performance aspects
- Document all optimizations and their measured impact
- Skip phases that don't apply (e.g., skip mobile if no mobile app)

</process>
