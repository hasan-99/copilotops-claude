---
name: qualia-workflow
description: Qualia Solutions project conventions - structure, patterns, deployment checklist. Use when starting or auditing Qualia client projects.
tags: [qualia, workflow, nextjs, supabase, vercel]
---

# Qualia Solutions Conventions

Project conventions for Qualia Solutions client work. For specific tooling, use dedicated skills (`/sb`, `/va`, `/dep`, etc.).

## Standard Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 16+ + React 19 + TypeScript | App Router, Server Components |
| Styling | Tailwind CSS + shadcn/ui | Custom themes per client |
| Backend | Supabase | Postgres, Auth, RLS, Edge Functions |
| Deployment | Vercel | Preview on PR, Production on main |
| Voice AI | VAPI or Hume EVI | Depending on emotion needs |
| Automation | n8n | Workflow orchestration |
| Monitoring | LangSmith | LLM observability |

## Project Structure

```
project/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-required routes
│   ├── (marketing)/       # Public pages
│   ├── api/               # API routes (minimal, prefer server actions)
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase clients (server/client)
│   ├── utils.ts           # Utility functions
│   └── constants.ts       # App constants
├── types/
│   ├── database.ts        # Generated from Supabase
│   └── index.ts           # App types
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── functions/         # Edge functions
├── hooks/                 # Custom React hooks
├── actions/               # Server actions
└── public/               # Static assets
```

## Key Patterns

- **Server Components first** -- only add `'use client'` when interactivity is needed
- **Server Actions for mutations** -- always auth check first (`supabase.auth.getUser()`)
- **Prefer server actions over API routes** -- fewer files, same security
- **Generate types** after every migration: `npx supabase gen types typescript`

## Server Action Template

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  // Auth check first
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('products')
    .insert({ name: formData.get('name') })

  if (error) throw new Error('Failed to create product')

  revalidatePath('/products')
}
```

## Deployment Checklist

1. **Environment Variables**
   - [ ] All secrets in Vercel (not in code)
   - [ ] Different keys for preview vs production
   - [ ] NEXT_PUBLIC_ prefix only for client-safe vars

2. **Database**
   - [ ] Migrations applied
   - [ ] RLS policies on all tables
   - [ ] Indexes on frequently queried columns
   - [ ] Types generated and committed

3. **Security**
   - [ ] No exposed API keys
   - [ ] CORS configured
   - [ ] Rate limiting on API routes
   - [ ] Input validation everywhere

4. **Performance**
   - [ ] Images optimized (next/image)
   - [ ] Fonts optimized (next/font)
   - [ ] Bundle analyzed
   - [ ] Core Web Vitals passing

## New Feature Workflow

```
1. Database schema first (if needed)
2. Supabase migration
3. Generate types: npx supabase gen types typescript
4. Server Components for data display
5. Server Actions for mutations
6. Client Components only for interactivity
```

## MCP Servers Available

- **Supabase MCP**: Query/modify database directly
- **Vercel MCP**: Manage deployments
- **VAPI MCP**: Configure voice agents
- **GitHub MCP**: PRs, issues, code review
