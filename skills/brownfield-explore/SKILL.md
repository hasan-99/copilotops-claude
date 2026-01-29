---
name: brownfield-explore
version: 1.0.1
description: Explore existing codebase before adding features - map architecture, find integration points, understand patterns. Use at start of brownfield work.
model: claude-opus-4-5-20251101
tags: [brownfield, exploration, architecture, analysis]
---

# Brownfield Explore

Understand an existing codebase BEFORE making changes. Maps architecture, identifies patterns, finds extension points.

## When to Use

- Starting work on an existing project
- Adding features to unfamiliar code
- Before integrating new channels/services
- Understanding how things connect

## Pipeline

```
1. Read Project Context
       ↓
2. Map Architecture
       ↓
3. Identify Patterns
       ↓
4. Find Extension Points
       ↓
5. Document Findings
```

## Phase 1: Read Project Context

```
Priority files to read:
1. CLAUDE.md (if exists) - project-specific instructions
2. README.md - overview and setup
3. package.json - dependencies and scripts
4. tsconfig.json - TypeScript strictness, paths, module resolution
5. eslint.config.js or .eslintrc.* - linting rules
6. next.config.ts / next.config.mjs - framework configuration
7. .env.example - required configuration (NEVER read .env or .env.local)
8. IMPLEMENTATION_PLAN.md or TODO.md - current state
```

TypeScript health check:
- Is "strict": true enabled?
- Are path aliases configured (@/ or ~/)?
- Any "// @ts-ignore" or "as any" patterns?

## Phase 2: Map Architecture

**Constraints:**
- Maximum directory depth: 4 levels from project root
- Maximum files listed per directory: 100 (sample if exceeded)
- Always skip: node_modules/, .git/, dist/, build/, .next/, coverage/, .cache/

```
Directory structure analysis:
- app/ or src/ - application code
- lib/ - shared utilities
- components/ - UI components
- api/ or functions/ - backend logic
- supabase/ - Edge Functions (if Supabase)
- tests/ - test coverage

Key questions:
- What framework? (Next.js, Remix, Astro)
- What database? (Supabase, Prisma, Drizzle)
- What deployment? (Vercel, Supabase Edge, Railway)
- What integrations exist?
```

## Phase 3: Identify Patterns

Look for existing patterns in:

**API/Backend:**
```
- How are routes structured?
- How is auth handled?
- How are errors handled?
- What's the database access pattern?
```

**Frontend (Next.js 13+):**
```
- Server vs Client Components - where is the 'use client' boundary?
- Route structure - file-based routing patterns?
- Data fetching - RSC, Server Actions, or client-side?
- State management (Context, Zustand, TanStack Query?)
- Styling approach (Tailwind, CSS Modules?)
- Form handling (Server Actions, React Hook Form?)
- Error handling - error.tsx boundaries?
- Loading states - Suspense, loading.tsx files?
```

**TypeScript Quality:**
```
- Are types co-located or in separate .d.ts files?
- Is 'any' used? How extensively?
- Are Zod/Valibot schemas used for runtime validation?
- How are API response types defined?
- Supabase types: Is database.types.ts generated and current?
```

**Integrations:**
```
- How are external services connected?
- Webhook patterns
- Message handling patterns
- Session management
```

## Phase 4: Find Extension Points

For adding new features, identify:

```
1. Where similar features live
   - Find analogous code to copy patterns from

2. Shared utilities to reuse
   - lib/ folder contents
   - Helper functions
   - Type definitions

3. Configuration needed
   - Environment variables
   - Database tables
   - API keys/secrets

4. Integration points
   - Where to hook in new code
   - What interfaces to implement
```

## Phase 5: Document Findings

Output a structured report:

```markdown
## Architecture Map: [Project Name]

### Stack
- Framework: [e.g., Next.js 15]
- Database: [e.g., Supabase PostgreSQL]
- Deployment: [e.g., Supabase Edge Functions]
- Key libs: [list]

### Directory Structure
[Tree of important directories]

### Existing Patterns
- API: [pattern description]
- Auth: [pattern description]
- Database: [pattern description]

### For Adding [Feature Type]
1. Create files in: [locations]
2. Follow pattern from: [existing similar code]
3. Reuse utilities: [list]
4. Add config: [what's needed]

### Type Safety Assessment
- Strict mode: [ENABLED/DISABLED]
- Path aliases: [configured / none]
- Any usage: [None / Limited / Widespread]
- Generated types: [Supabase types current / stale / missing]

### Risks/Gotchas
- [Known issues to watch for]

### Security Observations
- [Auth coverage, exposed endpoints, hardcoded values]
```

## Quick Start

```
/brownfield-explore

# Or with specific focus:
/brownfield-explore --focus integrations
/brownfield-explore --focus database
/brownfield-explore --focus frontend
```

## Security Considerations

### Files to NEVER Read
- `.env`, `.env.local`, `.env.production` (only read `.env.example`)
- `credentials.json`, `serviceAccountKey.json`, `*-key.json`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `id_rsa*`, `id_ed25519*`, `known_hosts`
- `.npmrc` (may contain auth tokens), `.netrc`, `.docker/config.json`

### Directories to Skip
- `.git/` (use git CLI if history needed)
- `node_modules/`, `vendor/`, `.pnpm/`
- `.vercel/`, `.supabase/`, `.netlify/`, `.amplify/`
- `*.backup/`, `backups/`, `dumps/`

### Output Sanitization
- Report only variable NAMES, never values
- Redact any credentials accidentally discovered
- Do not include API keys, tokens, or passwords

### Script Safety
- Review `package.json` scripts before recommending execution
- Check for suspicious pre/post install hooks
- Never execute unfamiliar shell scripts without review

## Example Output

```markdown
## Architecture Map: Sofia Testing

### Stack
- Framework: Next.js 15 (but bots on Supabase Edge)
- Database: Supabase PostgreSQL (Drizzle ORM)
- Deployment: Supabase Edge Functions (NO Vercel)
- AI: Google Gemini

### Existing Integrations
- WhatsApp: lib/whatsapp/ + supabase/functions/whatsapp-webhook/
- Telegram: lib/telegram/ + supabase/functions/telegram-webhook/
- Pattern: Webhook → Handler → AI Core → Response

### For Adding Gmail
1. Create: supabase/functions/gmail-webhook/
2. Follow pattern from: whatsapp-webhook
3. Reuse: lib/ai/ for AI processing
4. Add: GMAIL_* secrets to Supabase

### Type Safety Assessment
- Strict mode: ENABLED
- Path aliases: @/ configured
- Any usage: Limited to legacy adapters
- Generated types: Supabase types current (2 days old)

### Gotchas
- NO Vercel - everything on Supabase Edge
- Use Deno imports, not npm

### Security Observations
- Auth: Supabase Auth on all routes
- RLS: Enabled on user tables
- No hardcoded secrets found
```

## Integration with Other Skills

After exploration, use:
- **channel-integration** - Add new channel
- **supabase-edge** - Create Edge Functions
- **admin-panel** - Build dashboard

## Trigger Phrases

- "explore this codebase"
- "understand the architecture"
- "map the project"
- "before I add [feature]"
- "how does this project work"
