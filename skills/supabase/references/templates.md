# Supabase Code Templates

> Claude: Read this file on-demand when you need specific code patterns.

## Table + RLS Pattern

```sql
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own items" ON items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Auth Setup (Next.js)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)

// OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
})

// Token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') console.log('Token refreshed')
})
```

## Auto-create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Realtime Subscriptions

```typescript
// Postgres changes
supabase.channel('changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
    payload => console.log('Change:', payload))
  .subscribe()

// Presence
const channel = supabase.channel(`room:${roomId}`)
  .on('presence', { event: 'sync' }, () => console.log('Online:', channel.presenceState()))
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id })
  })
```

## Storage Upload

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(path, file, { cacheControl: '3600' })

const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
```

## Edge Function Template

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const body = await req.json()
    // Use user-context client (respects RLS):
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    )

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

## Deno Imports (NOT npm)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk"
import { z } from "https://deno.land/x/zod/mod.ts"
```

## Common Error Fixes

| Error | Fix |
|-------|-----|
| `PGRST116: 0 rows` | Use `.maybeSingle()` not `.single()` |
| `duplicate key` | Use `.upsert({ ... }, { onConflict: 'id' })` |
| `violates RLS policy` | Check `auth.uid()` in policy, verify INSERT has `WITH CHECK` |
| `Invalid login credentials` | Check email confirmed, JWT not expired, PKCE flow |

## Query Optimization

```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT ...;

-- Composite index
CREATE INDEX idx_posts_created_likes ON posts(created_at DESC, likes_count DESC)
WHERE deleted_at IS NULL;

-- Materialized view for aggregations
CREATE MATERIALIZED VIEW post_stats AS
SELECT user_id, COUNT(*) as total_posts FROM posts GROUP BY user_id;
REFRESH MATERIALIZED VIEW CONCURRENTLY post_stats;
```
