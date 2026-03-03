---
name: project-cleaner
description: "Deep project cleanup and code quality audit. Auto-detects project stack, runs automated tools (knip, jscpd, tsc, linter) + spawns parallel specialized AI agents to analyze dead code, Supabase issues, frontend flaws, security holes, performance problems, TypeScript strictness, and Next.js anti-patterns. Generates a severity-ranked report with exact file:line references, then fixes everything. Use when a project is messy, has dead code, broken features, or needs a thorough quality pass."
tags: [cleanup, refactor, dead-code, audit, quality, supabase, frontend, security, performance]
---

# Project Cleaner

Nuclear-grade codebase cleanup. Detects your stack, finds every flaw, reports it, then fixes it.

## Arguments

- --report-only: Generate report without fixing (default: report + fix)
- --fix-only: Load existing CLEANUP-REPORT.md and execute its fix plan (fails if no report exists)
- --focus AREA: Focus on one area: dead-code, supabase, frontend, security, performance, typescript, nextjs, duplicates

## Process

### Phase 0: Project Detection

Before anything else, detect the project stack. Read these files and set context for all subsequent phases:

1. Read package.json to detect:
   - Package manager: check for pnpm-lock.yaml then pnpm, yarn.lock then yarn, else npm. Use detected manager for all commands.
   - Linter: check devDependencies for "ultracite" or "biome" then use biome check; check for "eslint" then use eslint; else skip linting.
   - Framework: check for "next" then Next.js; "react" without next then React SPA; else generic.
   - Test runner: check for "playwright" or "vitest" or "jest".
   - UI library: check for "tailwindcss", "shadcn", "chakra", "mui".
   - State management: check for "swr", "@tanstack/react-query", "zustand", "redux".
   - AI SDK: check for "ai", "@ai-sdk/*".

2. Read tsconfig.json — check strict, noUncheckedIndexedAccess, paths.

3. Detect source directories — check which directories exist: src/, app/, lib/, components/, utils/, hooks/, services/. Build a SOURCE_DIRS list of the ones that exist. Use this list everywhere instead of hardcoding src/.

4. Read project CLAUDE.md if it exists — extract project-specific rules, critical implementation notes, and patterns that agents should respect.

5. Check for Supabase — look for @supabase/supabase-js in dependencies OR a supabase/ directory. If absent, skip Supabase agent entirely.

Store all detected values as context to pass to every agent and every tool command.

### Phase 1: Automated Tool Scan (run ALL in parallel)

Use the detected package manager and linter. Adapt paths to SOURCE_DIRS.

#### 1A. Knip — Dead Code Detection
```bash
npx knip --reporter json 2>/dev/null || npx knip 2>&1
```
Captures: unused files, unused exports, unused dependencies, unused devDependencies, unlisted dependencies, duplicate exports, unused class members, unused enum members, unused types.

If knip config does not exist, run with --include files,exports,dependencies,unlisted for maximum coverage.

#### 1B. jscpd — Duplicate Code Detection
```bash
npx jscpd SOURCE_DIRS --min-tokens 40 --reporters "json,console" --output /tmp/cleanup-report/ --format "typescript,tsx,javascript,jsx,css" 2>&1
```
Use SOURCE_DIRS detected in Phase 0, NOT hardcoded paths. Output to /tmp/ to avoid polluting the project. Captures: copy-pasted blocks, similarity percentage, exact locations.

#### 1C. TypeScript Strict Check
```bash
npx tsc --noEmit --strict 2>&1
```
Captures: type errors, implicit any, null safety violations, unreachable code.

#### 1D. Linter Scan (auto-detected)
If Biome/Ultracite detected:
```bash
npx biome check . --diagnostic-level=warn 2>&1
```
If ESLint detected:
```bash
npx eslint . --format json --no-error-on-unmatched-pattern 2>&1
```
If neither, skip.

#### 1E. Dependency Audit
```bash
pnpm audit --json 2>&1 || npm audit --json 2>&1
```
Use the detected package manager.

#### 1F. Next.js Build Analysis (only if Next.js detected)
```bash
npx next build 2>&1 | tail -100
```
This can be slow. Set a 5-minute timeout. If it fails, continue without build output.

### Phase 2: AI Deep Analysis (spawn ALL as parallel Task agents)

After automated tools finish, spawn analysis agents in parallel using the Task tool. Each agent gets:
- The automated tool output from Phase 1
- The project context from Phase 0 (stack, config, source dirs)
- Its reference checklist (read the checklist file from the references/ directory and include its full content in the agent prompt)
- The project CLAUDE.md rules if they exist

CRITICAL: Each agent must provide findings with EXACT file_path:line_number references and severity ratings (CRITICAL/HIGH/MEDIUM/LOW).

CRITICAL: Tell each agent the project source directories so it searches the right paths.

#### Agent 1: Dead Code Hunter (subagent_type: general-purpose)

Prompt the agent with the knip output from Phase 1, plus instructions to go BEYOND knip:
- Functions defined but never called (trace call sites)
- React components defined but never rendered (check imports across all files)
- API routes with no callers (check for fetch/axios calls to each route)
- Event handlers wired to nothing
- State variables set but never read
- useEffect hooks that do nothing useful
- Commented-out code blocks (more than 3 lines)
- TODO/FIXME/HACK comments indicating broken or incomplete things
- console.log, console.warn, console.error left in production code
- Feature flags that are always on or always off
- Dead CSS classes (defined but never used in JSX)
- Unused environment variables (in .env.example or code but never referenced)

Scope exclusion: This agent owns dead code ONLY. Do not report type issues, security issues, or performance issues.

#### Agent 2: Supabase Auditor (subagent_type: general-purpose)

Skip entirely if Supabase not detected in Phase 0.

Include the contents of references/supabase-checklist.md in the prompt.

Prompt the agent to check:
- RLS: Every table must have RLS enabled. Every policy must check auth.uid(). Find tables WITHOUT RLS. Use the Supabase MCP tools if available to query pg_policies and pg_class.
- Auth: Find client-side code that trusts user IDs from the client instead of deriving from auth.uid(). Find exposed service_role keys anywhere in client-accessible code.
- Queries: Find .from() calls without .select() (fetching all columns). Find missing .single() or .maybeSingle() where only one row is expected. Find queries without error handling (no .error check after await). Find N+1 query patterns (queries inside loops). Find queries that should use .rpc() or database functions instead of client-side logic.
- Schema: Find columns referenced in code but with "any" types. Find missing foreign key constraints that code assumes exist.
- Realtime: Find channel.subscribe() without corresponding cleanup/unsubscribe. Find channels that overlap or conflict.
- Storage: Find upload paths without file type/size validation. Find public buckets that should be private.
- Generated Types: Check if supabase/types.ts or equivalent exists and is being used. Find places using raw strings instead of typed table/column names.

Scope exclusion: This agent owns Supabase ONLY. Do not report general TypeScript issues or frontend issues.

#### Agent 3: Frontend and Accessibility Auditor (subagent_type: feature-dev:code-reviewer)

Include the contents of references/frontend-checklist.md in the prompt.

Prompt the agent to check:
- Components: Find components over 200 lines that should be split. Find prop drilling deeper than 3 levels. Find components with too many responsibilities. Find inline function definitions in JSX props that cause unnecessary re-renders.
- State: Find state that can be derived/computed from other state. Find useState where useReducer would be cleaner. Find global state used for local concerns. Find state duplicated between client and server.
- React 19: Find class components that should be function components. Find patterns that should use the use() hook. Find forms that should use useActionState. Find missing useOptimistic for optimistic updates.
- Accessibility: Find img tags without alt. Find button and interactive elements without accessible labels. Find div with onClick that should be button. Find missing focus management in modals/dialogs. Find color-only information indicators. Find missing heading hierarchy.
- UX: Find missing loading states. Find missing error boundaries. Find forms without validation feedback. Find empty state handlers that are missing. Find toast/notification patterns that are inconsistent.
- Styling: Find hardcoded colors that should use theme/CSS variables. Find inconsistent spacing values. Find important overrides. Find z-index values that are unmanaged (random large numbers).

Scope exclusion: This agent owns frontend/UI/UX/a11y ONLY. Do not report TypeScript type issues, security issues, or performance issues.

#### Agent 4: Security Scanner (subagent_type: general-purpose)

Include the contents of references/security-checklist.md in the prompt.

IMPORTANT: Tell the agent the correct source directories from Phase 0. Do NOT hardcode src/.

Prompt the agent to check:
- Secrets: Find hardcoded API keys, tokens, passwords in source files. Find .env values committed to git. Find secrets in client-side bundles (anything with NEXT_PUBLIC_ prefix that should not be public). Check git history for leaked secrets.
- Input Validation: Find user inputs without Zod/validation. Find dangerouslySetInnerHTML usage. Find unsanitized URL parameters used in redirects (open redirect). Find eval() or new Function(). Find template literal injection risks.
- Auth: Find unprotected API routes (no auth check). Find server actions without auth verification. Find role checks that can be bypassed. Find session management issues.
- HTTP Security: Find missing security headers (CSP, HSTS, X-Frame-Options) in next.config or middleware. Find CORS set to wildcard. Find missing rate limiting on public endpoints.
- Dependencies: Include the audit output from Phase 1.

Scope exclusion: This agent owns security ONLY. Supabase auth/RLS is handled by the Supabase agent.

#### Agent 5: Performance Analyzer (subagent_type: performance-oracle)

Include the contents of references/performance-checklist.md in the prompt.

Prompt the agent to check:
- Bundle: Find large dependencies with lighter alternatives (moment to dayjs, lodash to lodash-es). Find barrel imports pulling entire libraries. Find missing dynamic imports for below-fold content. Find images not using next/image.
- Rendering: Find client components that should be server components. Find "use client" on files that do not use client features. Find waterfall data fetching (sequential when parallel is possible). Find missing Suspense boundaries. Find layouts that force unnecessary re-renders.
- Data Fetching: Find redundant API calls (same data fetched multiple times). Find missing pagination on large datasets. Find client-side filtering/sorting of large datasets that should be server-side. Find missing cache configuration (SWR staleTime, React Query).
- Core Web Vitals: Find potential CLS issues (images/embeds without dimensions). Find LCP blockers (render-blocking resources, unoptimized hero images). Find INP issues (long-running event handlers, main thread blocking).
- Assets: Find unoptimized images (large file sizes, wrong format). Find unused font weights loaded. Find fonts not using next/font.

Scope exclusion: This agent owns performance ONLY.

#### Agent 6: TypeScript Quality (subagent_type: kieran-typescript-reviewer)

Include the contents of references/typescript-checklist.md in the prompt. Also include the tsc --strict output from Phase 1.

Prompt the agent to check:
- Find every "any" type and suggest the correct type
- Find every ts-ignore and ts-expect-error — determine if still needed or if the underlying type can be fixed
- Find type assertions (as Type) that could be replaced with type guards or proper generics
- Find non-null assertions (the ! operator) that hide potential null bugs
- Find missing return types on exported functions
- Find Object, Function, or empty object used as types
- Find generic types that are too loose (T extends any)
- Find missing discriminated unions where switch/if chains exist
- Find inconsistent type patterns across similar files (e.g., some files use interfaces, others use types for the same pattern)
- Find Supabase/API types that are manually defined when they could be generated

Scope exclusion: This agent owns TypeScript types ONLY. Do not report dead code, security, or frontend issues.

#### Agent 7: Architecture and Next.js Patterns (subagent_type: architecture-strategist)

Include the contents of references/nextjs-checklist.md in the prompt.

Only spawn if Next.js detected in Phase 0.

Prompt the agent to check:
- Find pages without generateMetadata or static metadata export
- Find API routes using GET for mutations (should be POST/PUT/DELETE)
- Find missing revalidation strategies (revalidatePath/revalidateTag) after mutations
- Find client-side data fetching that should use server actions or server components
- Find server actions without proper error handling or auth checks
- Find missing loading.tsx, error.tsx, not-found.tsx files in route groups
- Find route handlers that should be server actions (simple mutations)
- Find unnecessary client components wrapping server component trees
- Find "use client" boundary that could be pushed lower in the component tree
- Find missing generateStaticParams for dynamic routes that could be statically generated
- Find improper use of cookies()/headers() making pages dynamic unnecessarily
- Find next.config.js that should be next.config.ts (Next.js 15+)
- Find middleware that is too broad (should use route-specific matchers)

Scope exclusion: This agent owns Next.js architecture ONLY.

### Phase 3: Generate Report

Collect ALL findings from automated tools + AI agents.

Deduplication: Before writing the report, cross-reference findings across agents. If multiple agents report the same file:line issue, keep only the most specific one (e.g., if both Security and Supabase agents flag service_role exposure, keep the Supabase agent finding since it has more context).

Write to CLEANUP-REPORT.md in the project root.

Structure the report with these sections:
- Summary with total issues, severity counts, dead code estimates, duplicate code count, removable lines estimate
- Critical Issues (Fix Immediately) — each with File path:line, What, Why it matters, Fix, Status PENDING
- High Priority Issues (same format)
- Medium Priority Issues (same format)
- Low Priority / Tech Debt (same format)
- Dead Code Inventory: unused files, unused exports, unused dependencies, duplicate code blocks
- Supabase Issues section
- Frontend Issues section
- Security Issues section
- Performance Issues section
- TypeScript Issues section
- Next.js Issues section
- Fix Plan ordered by severity then risk level, split into Batch 1 Safe Fixes, Batch 2 Moderate Fixes, Batch 3 Risky Fixes

### Phase 4: Execute Fixes (unless --report-only)

If --fix-only was passed, read the existing CLEANUP-REPORT.md and work through its fix plan. If the file does not exist, tell the user and abort.

Work through the fix plan in batches. Make ONE commit per batch, not per fix.

#### Batch 1: Safe Fixes (one commit)
- Remove unused imports
- Remove unused files (verify each is truly unused before deleting)
- Remove unused dependencies (PKG_MANAGER remove)
- Remove commented-out code blocks (3+ lines)
- Remove console.log, console.warn, console.error statements
- Add missing alt text on images
- Remove dead CSS classes

Commit message: chore: remove dead code — X files, Y exports, Z dependencies

#### Batch 2: Moderate Fixes (one commit)
- Fix TypeScript strict errors (add proper types, remove "any")
- Add missing error handling on Supabase queries
- Add missing loading.tsx / error.tsx files
- Fix accessibility issues (semantic HTML, ARIA attributes)
- Consolidate duplicate code blocks
- Add missing RLS policies

Commit message: fix: resolve X type errors, Y a11y issues, Z query safety issues

#### Batch 3: Risky Fixes (ask before each sub-batch)
- Refactor large components (200+ lines)
- Change data fetching patterns (client to server)
- Modify auth flows
- Change API route patterns

For each risky fix: Show the user what will change and ask for confirmation before applying. Commit after each approved sub-batch.

### Phase 5: Verification and Cleanup

After all fixes:

1. Run: npx tsc --noEmit (must pass)
2. Run: npx knip (should show fewer issues than before)
3. Run the project test suite if detected in Phase 0
4. Run: PKG_MANAGER run build (must succeed)
5. Update CLEANUP-REPORT.md — change status from PENDING to FIXED on resolved issues
6. Clean up artifacts: Remove /tmp/cleanup-report/ if it was created by jscpd
7. Show a before/after summary: issues found vs issues fixed vs issues remaining
