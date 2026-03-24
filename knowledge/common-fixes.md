# Common Fixes
> Recurring bugs and their solutions. Updated: 2026-03-23

## Build Failures
- **Module not found**: Check case sensitivity (Linux is case-sensitive, macOS isn't)
- **Memory issues**: `vercel --build-env NODE_OPTIONS="--max-old-space-size=4096"`
- **Missing deps**: `rm -rf node_modules && npm install`
- **Generated types stale**: `npx supabase gen types typescript --linked > types/database.ts`

## Deployment
- **Works locally, fails on Vercel**: Check Node version, env vars, case sensitivity
- **Missing env vars**: `vercel env ls` to check, `vercel env add` to fix
- **NEXT_PUBLIC_ vars**: Must be set at BUILD time, not just runtime
- **White screen**: Check for `window`/`document` in server components
- **500 on API**: Check env vars exist on Vercel, check Supabase URL not localhost

## Supabase
- **RLS blocking silently**: Returns empty array, not error. Check policies.
- **FK returns array**: Use `normalizeFKResponse()` helper
- **Connection pool exhausted**: Reduce `max_connections`, use connection pooler

## Next.js
- **Hydration mismatch**: Wrap dynamic content in `useEffect`, no `Date.now()` in SSR
- **Missing 'use client'**: Add directive to components using hooks
- **Stale cache**: `revalidatePath()` after mutations + invalidate SWR
