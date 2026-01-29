---
name: supabase
description: Complete Supabase mastery - tables, auth, RLS policies, migrations, debugging, optimization, realtime, storage, edge functions. One skill for all Supabase operations.
model: claude-opus-4-5-20251101
tags: [supabase, database, auth, realtime, storage, debugging, postgres, rls]
---

# Supabase Master

Complete Supabase expertise. Debug issues, optimize queries, setup features, and handle all Supabase services.

## Quick Commands

| Say | I Do |
|-----|------|
| "setup supabase auth" | Create auth tables, RLS policies, social providers, email verification |
| "create table for X" | Generate CREATE TABLE, indexes, RLS, TypeScript types |
| "debug RLS" | Analyze policies, test conditions, fix access issues |
| "setup realtime" | Configure subscriptions, presence, broadcast |
| "optimize queries" | Add indexes, analyze plans, create materialized views |

## Common Operations

### 1. Create Tables with RLS
```sql
CREATE TABLE users (
  id UUID DEFAULT auth.uid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

### 2. Auth Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Social auth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

### 3. Real-time Subscriptions
```typescript
const subscription = supabase
  .channel('any')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    payload => console.log('Change:', payload)
  )
  .subscribe()
```

### 4. Database Migrations
```bash
supabase migration new create_users_table
supabase db push
supabase gen types typescript --local > types/supabase.ts
```

## Error Debugging

### Authentication Errors

```typescript
// ERROR: "Invalid login credentials"
// Check: Email not confirmed, JWT expired, PKCE issues

// Solution: PKCE flow for mobile/SSR
const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Solution: Handle token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});
```

### RLS Errors

```sql
-- ERROR: "new row violates row-level security policy"

-- Debug: Check current user
SELECT auth.uid(), auth.jwt();

-- Debug: Test policy directly
SELECT * FROM posts WHERE auth.uid() = user_id;

-- Fix: Proper INSERT policy
CREATE POLICY "Users can insert own posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix: Read public + own content
CREATE POLICY "Read public or own" ON posts
FOR SELECT USING (public = true OR auth.uid() = user_id);

-- Fix: Service role bypass
CREATE POLICY "Service role full access" ON posts
USING (auth.jwt() ->> 'role' = 'service_role');
```

### Query Errors

```typescript
// ERROR: "PGRST116: The result contains 0 rows"
// Solution: Use maybeSingle() instead of single()
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('id', postId)
  .maybeSingle();

// ERROR: "duplicate key value violates unique constraint"
// Solution: Use upsert
const { data } = await supabase
  .from('profiles')
  .upsert({ id: userId, username }, { onConflict: 'id' });
```

## Production Auth System

```typescript
class SupabaseAuthSetup {
  async setupCompleteAuth() {
    await this.createUserTables();
    await this.setupRLSPolicies();
    await this.createAuthHooks();
  }

  async createUserTables() {
    const sql = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        username TEXT UNIQUE,
        full_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    `;
  }

  async createAuthHooks() {
    const sql = `
      -- Auto-create profile on signup
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
    `;
  }
}
```

## Realtime Setup

```typescript
class RealtimeSetup {
  // Presence tracking
  setupPresence(roomId: string) {
    const channel = supabase.channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('Online:', channel.presenceState());
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Joined:', newPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date() });
        }
      });
  }

  // Broadcast
  setupBroadcast(channelName: string) {
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        console.log('Cursor:', payload);
      })
      .subscribe();

    channel.send({ type: 'broadcast', event: 'cursor', payload: { x: 100, y: 200 } });
  }
}
```

## Storage Management

```typescript
class StorageManager {
  async setupStorage() {
    await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });
  }

  async uploadWithProgress(file: File, bucket: string, path: string, onProgress?: (n: number) => void) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        onUploadProgress: (p) => onProgress?.((p.loaded / p.total) * 100)
      });

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    return data.signedUrl;
  }
}
```

## Edge Functions

```typescript
// supabase/functions/webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { event, data } = await req.json();

  // Process webhook
  switch (event) {
    case 'payment.success':
      await supabase.from('subscriptions').upsert({ user_id: data.user_id, status: 'active' });
      break;
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

## Query Optimization

```sql
-- Analyze slow queries
EXPLAIN ANALYZE
SELECT p.*, u.username FROM posts p
JOIN profiles u ON p.user_id = u.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.likes_count DESC LIMIT 20;

-- Create composite indexes
CREATE INDEX idx_posts_created_likes
ON posts(created_at DESC, likes_count DESC)
WHERE deleted_at IS NULL;

-- Materialized views for aggregations
CREATE MATERIALIZED VIEW post_stats AS
SELECT user_id, COUNT(*) as total_posts, SUM(likes_count) as total_likes
FROM posts WHERE deleted_at IS NULL
GROUP BY user_id;

REFRESH MATERIALIZED VIEW CONCURRENTLY post_stats;
```

## Migration Template

```sql
-- migrations/001_initial_schema.sql
BEGIN;

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
```

## Debugging Toolkit

```typescript
class SupabaseDebugger {
  async debugConnection() {
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    console.log(error ? 'Connection failed' : 'Connection OK');
  }

  async debugAuth() {
    console.log('Session:', await supabase.auth.getSession());
    console.log('User:', await supabase.auth.getUser());
    console.log('Refresh:', await supabase.auth.refreshSession());
  }

  async debugRLS(table: string) {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Testing RLS as:', user?.id);

    const result = await supabase.from(table).select('*').limit(1);
    console.log('RLS result:', result);
  }
}
```

## Environment Setup

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Best Practices

- Always enable RLS on tables
- Use proper indexes for queries
- Implement connection pooling
- Handle auth state changes
- Validate data before operations
- Use transactions for related ops
- Monitor realtime connections
- Configure proper CORS policies
- Use Edge Functions for complex logic

## Trigger Phrases

- "setup supabase" → Full project setup
- "debug supabase" → Debugging toolkit
- "optimize supabase" → Performance tuning
- "supabase auth" → Authentication setup
- "supabase realtime" → Realtime features
