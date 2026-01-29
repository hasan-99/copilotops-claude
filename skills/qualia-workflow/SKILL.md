---
name: qualia-workflow
description: Qualia Solutions development workflow - Next.js + Supabase + Vercel + Voice AI. Use when building projects for Qualia Solutions clients.
tags: [qualia, workflow, nextjs, supabase, vercel, vapi, hume, voice-ai]
---

# Qualia Solutions Development Workflow

You're building for **Qualia Solutions** - a development studio specializing in AI-powered web applications, voice agents, and automation.

## Standard Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 15 + React 19 + TypeScript | App Router, Server Components |
| Styling | Tailwind CSS + shadcn/ui | Custom themes per client |
| Backend | Supabase | Postgres, Auth, RLS, Edge Functions |
| Deployment | Vercel | Preview on PR, Production on main |
| Voice AI | VAPI or Hume EVI | Depending on emotion needs |
| Automation | n8n | Workflow orchestration |
| Monitoring | LangSmith | LLM observability |

## Project Structure Convention

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

## Development Patterns

### 1. Server Components First
```typescript
// Default: Server Component (no directive needed)
async function ProductList() {
  const supabase = createServerClient()
  const { data } = await supabase.from('products').select()
  return <ul>{data?.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// Only when needed: Client Component
'use client'
function InteractiveButton() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### 2. Supabase Patterns

**Server Client (for Server Components/Actions):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Always use RLS:**
```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- User can only see their own data
CREATE POLICY "Users see own data" ON products
  FOR SELECT USING (auth.uid() = user_id);
```

### 3. Server Actions for Mutations
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .insert({ name: formData.get('name') })

  if (error) throw new Error(error.message)

  revalidatePath('/products')
}
```

### 4. Form Handling with Zod
```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})

function ContactForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })
  // ...
}
```

## Voice AI Integration

### VAPI (Standard Choice)
```typescript
import Vapi from '@vapi-ai/web'

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!)

// Start call
await vapi.start({
  assistantId: 'your-assistant-id',
  // or inline config
  assistant: {
    model: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    voice: { provider: 'elevenlabs', voiceId: 'rachel' },
    firstMessage: 'Hi! How can I help you today?',
  }
})
```

### Hume EVI (When Emotion Matters)
```typescript
import { HumeClient } from 'hume'

const hume = new HumeClient({ apiKey: process.env.HUME_API_KEY })

// Analyze emotion in voice
const result = await hume.expressionMeasurement.batch.startInferenceJob({
  models: { prosody: {} },
  urls: ['audio-url'],
})
```

## Deployment Checklist

Before deploying to production:

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

## Quick Commands

When working on Qualia projects, use these patterns:

**New Feature:**
```
Build [feature] using:
1. Database schema first (if needed)
2. Supabase migration
3. Generate types: npx supabase gen types typescript
4. Server Components for data display
5. Server Actions for mutations
6. Client Components only for interactivity
```

**Debug Issue:**
```
Use deep-debug skill - this is a [frontend/backend/database/API] issue.
```

**Deploy:**
```
Run production-audit before merging to main.
```

## MCP Servers Available

For Qualia projects, you have direct access to:
- **Supabase MCP**: Query/modify database directly
- **Vercel MCP**: Manage deployments
- **VAPI MCP**: Configure voice agents
- **n8n MCP**: Manage automation workflows
- **GitHub MCP**: PRs, issues, code review

## When to Spawn Parallel Agents

For complex features, spawn agents in parallel:
```
Build user dashboard with parallel agents:
- Agent 1: Database schema and migrations
- Agent 2: UI components with frontend-design
- Agent 3: Server actions and API
- Agent 4: Authentication and RLS
- Agent 5: Tests

Send ALL Task tool calls in ONE message.
```
