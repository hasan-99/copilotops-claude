# Supabase Patterns
> Common patterns across Qualia projects. Updated: 2026-03-23

## Standard Setup
1. Create project in Supabase dashboard (Frankfurt region for EU)
2. Get URL + anon key → `.env.local`
3. Create `lib/supabase/server.ts` and `lib/supabase/client.ts`
4. Enable RLS on EVERY table
5. Generate types: `npx supabase gen types typescript --linked > types/database.ts`

## RLS Template
```sql
-- Basic user-owns-data pattern
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON my_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON my_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON my_table
  FOR UPDATE USING (auth.uid() = user_id);
```

## Server Action Pattern
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function myAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  // ... mutations here
}
```

## FK Normalization
Supabase returns FK as arrays. Use:
```typescript
import { normalizeFKResponse } from '@/lib/server-utils'
const normalized = normalizeFKResponse(data, ['project', 'client'])
```

## Gotchas
- NEVER use service_role key in client-side code
- ALWAYS use server.ts for mutations, client.ts for reads only
- FK returns arrays — normalize them
- RLS silently blocks if no matching policy (returns empty, not error)
