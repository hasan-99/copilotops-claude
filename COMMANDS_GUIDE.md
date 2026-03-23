# Claude Code Commands Guide

Complete reference for all available slash commands and skills.

---

## Quick Reference

| Category | Commands |
|----------|----------|
| **Research** | `/deep-research`, `/production-audit`, `/stack-researcher` |
| **Debugging** | `/deep-debug`, `/smart-fix`, `/frontend-debug` |
| **Development** | `/tdd-cycle`, `/git-flow`, `/feature-development` |
| **Frontend** | `/frontend`, `/responsive`, `/ui-build`, `/animate` |
| **Database** | `/supabase-ops`, `/supabase-master` |

---

## Research & Analysis Commands

### `/deep-research <scope>`
Launch 6 parallel Opus agents to analyze codebase best practices.

**Usage:**
```
/deep-research security patterns
/deep-research performance optimization
/deep-research entire codebase
```

**What it does:**
- Spawns multiple specialized agents in parallel
- Analyzes frontend, backend, database, security, performance, deployment
- Returns consolidated findings with recommendations

---

### `/production-audit`
Production-readiness audit with parallel agents checking security, performance, reliability, observability, and deployment.

**Usage:**
```
/production-audit
```

**Checks:**
- Security vulnerabilities
- Performance bottlenecks
- Reliability patterns
- Observability setup
- Deployment configuration

---

### `/stack-researcher <technology>`
Research latest best practices using web search and Context7 documentation.

**Usage:**
```
/stack-researcher Next.js 15
/stack-researcher Supabase RLS
/stack-researcher React Server Components
```

---

## Debugging Commands

### `/deep-debug <issue>`
Systematic debugging using 6-phase methodology.

**Phases:**
1. Information Gathering
2. Hypothesis Formation
3. Systematic Testing
4. Root Cause Identification
5. Fix Implementation
6. Prevention

**Usage:**
```
/deep-debug TypeError in checkout flow
/deep-debug slow API responses
/deep-debug memory leak in dashboard
```

---

### `/smart-fix <issue>`
Intelligent auto-fix with automatic agent routing.

**Usage:**
```
/smart-fix failing tests
/smart-fix TypeScript errors
/smart-fix build errors
```

---

### `/frontend-debug <issue>`
Fix visual bugs, layout breaks, z-index wars, CSS conflicts.

**Usage:**
```
/frontend-debug broken mobile layout
/frontend-debug z-index modal issue
/frontend-debug animation glitch
```

---

## Development Workflow Commands

### `/tdd-cycle <feature>`
Execute Test-Driven Development workflow.

**Workflow:**
1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Repeat

**Usage:**
```
/tdd-cycle user authentication
/tdd-cycle shopping cart
```

---

### `/git-flow <action>`
Automated git workflows with smart commits.

**Usage:**
```
/git-flow commit
/git-flow feature start user-auth
/git-flow release 1.0.0
```

---

### `/feature-development <specification>`
Full feature implementation with planning.

**Usage:**
```
/feature-development Add dark mode toggle
/feature-development Implement user settings page
```

---

## Frontend Commands

### `/frontend <component>`
Build components with animations. Auto-detects your stack.

**Usage:**
```
/frontend navigation bar
/frontend modal dialog
/frontend data table
```

---

### `/responsive <target>`
Analyze and fix layouts for all screen sizes.

**Usage:**
```
/responsive homepage
/responsive dashboard
/responsive entire app
```

---

### `/ui-build <component>`
Build stunning UI using 2025 best practices.

**Usage:**
```
/ui-build landing page hero
/ui-build pricing cards
```

---

### `/animate <target>`
Add animations using Motion, GSAP, or CSS.

**Usage:**
```
/animate page transitions
/animate button hover effects
/animate loading states
```

---

### `/component-library`
Set up or add components from modern UI libraries.

**Usage:**
```
/component-library setup shadcn
/component-library add Magic UI
```

---

## Database Commands

### `/supabase-ops <operation>`
Supabase database operations.

**Operations:**
- Create tables
- Setup auth
- RLS policies
- Migrations
- Real-time subscriptions

**Usage:**
```
/supabase-ops create users table
/supabase-ops add RLS policy for posts
```

---

### `/supabase-master <issue>`
Debug and optimize Supabase.

**Usage:**
```
/supabase-master slow queries
/supabase-master auth error
/supabase-master RLS not working
```

---

## Agent Builders

### `/agent-builder`
Scaffold AI agents for Qualia Solutions projects.

### `/ai-agent-builder`
Build production AI agents for any platform (Autogen, LangChain, CrewAI, Claude MCP).

### `/mcp-builder`
Create MCP (Model Context Protocol) servers.

---

## Deployment Commands

### `/vercel-deploy`
Deploy to Vercel with environment variables, build settings, domains.

### `/vercel-ai-deploy`
Smart Vercel deployment with AI SDK template selection.

### `/deploy-site`
General deployment management.

---

## Testing Commands

### `/test-runner`
Run tests with coverage reports.

### `/webapp-testing`
Interactive testing with Playwright.

---

## Creative Commands

### `/algorithmic-art`
Create generative art with p5.js.

### `/canvas-design`
Create visual designs in PNG/PDF.

### `/artifacts-builder`
Build complex claude.ai HTML artifacts.

---

## Model Aliases

Use these in `.clauderc`:

```
~haiku    → Fast model (claude-3-5-haiku)
~sonnet   → Balanced model (claude-sonnet-4)
~opus     → Most capable model (claude-opus-4-5)
```

---

## Tips

1. **Combine commands:** Use multiple commands in sequence for complex tasks
2. **Be specific:** More detail = better results
3. **Use context:** Commands work better when you're in the relevant directory
4. **Check skills:** Run `ls ~/.claude/skills` to see all available skills
