# Supabase Deep Audit Checklist

## RLS (Row Level Security)
- [ ] Every table has ALTER TABLE table ENABLE ROW LEVEL SECURITY
- [ ] Every table has at least one policy (RLS enabled without policies = no access)
- [ ] SELECT policies filter by auth.uid()
- [ ] INSERT policies verify auth.uid() = NEW.user_id (or equivalent ownership column)
- [ ] UPDATE policies verify auth.uid() = OLD.user_id
- [ ] DELETE policies verify auth.uid() = OLD.user_id
- [ ] No policies use USING (true) without documented justification (public data only)
- [ ] Service role is NEVER exposed client-side
- [ ] Junction/join tables have RLS policies too (not just primary tables)

## SQL to check RLS coverage

Find tables WITHOUT RLS enabled:
```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true
);
```

Find tables WITH RLS but NO policies:
```sql
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relrowsecurity = true
AND NOT EXISTS (
  SELECT 1 FROM pg_policies p WHERE p.tablename = c.relname
);
```

List all policies for review (check for overly permissive ones):
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename;
```

Find tables with RLS enabled but using permissive USING(true) policies:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND qual = 'true';
```

## Client Query Patterns
- [ ] Every .from() has explicit .select('col1, col2') — never select all columns
- [ ] Every single-row query uses .single() or .maybeSingle() (not just .limit(1))
- [ ] Every query handles .error — no silent failures (check if error then throw/return)
- [ ] No N+1 patterns (querying in a loop instead of using joins/.in() clauses)
- [ ] Queries with filters use indexed columns
- [ ] .eq(), .in() used instead of client-side filtering of full result sets
- [ ] Pagination used for large datasets (.range() or cursor-based)
- [ ] No .from('table').select('*') fetching all columns when only a few are needed

## Auth Patterns
- [ ] User ID always derived from auth.uid() server-side, NEVER from client request body/params
- [ ] service_role key only used in server-side code (API routes, server actions, edge functions)
- [ ] anon key used for client-side Supabase client
- [ ] Session refresh handled properly (middleware or onAuthStateChange)
- [ ] Auth state changes handled with onAuthStateChange subscription
- [ ] Protected routes/pages check auth before rendering content
- [ ] Server-side Supabase client created fresh per request (not singleton)

## Generated Types
- [ ] Supabase types generated and used (Database['public']['Tables'])
- [ ] Types regenerated after schema changes (not stale)
- [ ] No manual type definitions that duplicate generated types
- [ ] Table and column names referenced via typed helpers, not raw strings

## Realtime
- [ ] Every channel.subscribe() has corresponding channel.unsubscribe() in cleanup
- [ ] Subscriptions cleaned up in useEffect return / component unmount
- [ ] Channel names do not conflict across components
- [ ] Realtime only used where polling/SWR is not sufficient
- [ ] Realtime filters used to limit data received (not subscribing to entire tables)

## Storage
- [ ] Upload file types validated (MIME type + extension)
- [ ] Upload file sizes limited (client-side AND server-side/policy)
- [ ] Public buckets reviewed — should they be private?
- [ ] Storage paths include user ID for access control
- [ ] Signed URLs used for private content with appropriate expiry
- [ ] No direct bucket URL exposure in client code for private files

## Edge Functions
- [ ] CORS headers set correctly (not wildcard in production)
- [ ] Auth token validated in function (verify JWT)
- [ ] Error responses have proper status codes
- [ ] No duplicate logic between edge functions and client
- [ ] Environment variables used for secrets (not hardcoded)
- [ ] Connection to Supabase uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars

## Performance
- [ ] Indexes exist for commonly queried columns (WHERE, ORDER BY)
- [ ] Compound indexes for common WHERE + ORDER BY patterns
- [ ] No unused indexes
- [ ] Connection pooling configured appropriately (pgbouncer)
- [ ] Large text/JSON columns not fetched when not needed (use specific .select())
- [ ] Database functions (.rpc()) used for complex operations instead of multiple client queries
