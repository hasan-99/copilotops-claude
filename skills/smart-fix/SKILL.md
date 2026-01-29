---
name: smart-fix
description: Intelligent auto-fix with automatic agent routing for any type of issue - code bugs, deployment, performance, database, or legacy code (user)
tags: [fix, auto-fix, agent-routing, intelligent]
model: claude-opus-4-5-20251101
---

Intelligently fix the issue using automatic agent selection with explicit Task tool invocations.

This workflow analyzes the issue and automatically routes to the most appropriate specialist agent(s). Complex issues may require multiple agents working together.

## Analysis Phase
First, examine the issue to categorize it and determine the problem domain.

## Agent Selection and Execution

### For Deployment/Infrastructure Issues
If the issue involves deployment failures, infrastructure problems, or DevOps concerns:
- Use Task tool with subagent_type="devops-troubleshooter"
- Prompt: "Debug and fix this deployment/infrastructure issue: [issue details]. Provide root cause analysis and solution."

### For Code Errors and Bugs
If the issue involves application errors, exceptions, or functional bugs:
- Use the deep-debug skill (this is available globally)
- Alternatively, use Task tool with subagent_type="project-debugger"
- Prompt: "Analyze and fix this code error: [issue details]. Provide root cause analysis and solution."

### For Database Performance
If the issue involves slow queries, database bottlenecks, or data access patterns:
- Use Task tool with subagent_type="database-optimizer" (if available)
- Otherwise, analyze query execution plans, check indexes, review schema
- Prompt: "Optimize database performance for: [issue details]. Include query analysis, indexing strategies, and schema improvements."

### For Application Performance
If the issue involves slow response times, high resource usage, or performance degradation:
- Use Task tool with subagent_type="performance-engineer" (if available)
- Otherwise, profile the application, identify bottlenecks, suggest optimizations
- Prompt: "Profile and optimize application performance issue: [issue details]. Identify bottlenecks and provide optimization strategies."

### For Legacy Code Issues
If the issue involves outdated code, deprecated patterns, or technical debt:
- Use Task tool with subagent_type="legacy-modernizer" (if available)
- Otherwise, review the code, identify deprecated patterns, propose modern alternatives
- Prompt: "Modernize and fix legacy code issue: [issue details]. Provide migration path and updated implementation."

## Multi-Domain Coordination
For complex issues spanning multiple domains:
1. Use primary agent based on main symptom
2. Use secondary agents for related aspects
3. Coordinate fixes across all affected areas
4. Verify integration between different fixes

## Workflow
1. Ask the user to describe the issue if not already clear
2. Categorize the issue type
3. Select and invoke appropriate agent(s)
4. Implement the recommended fixes
5. Verify the solution works
6. Document changes made
