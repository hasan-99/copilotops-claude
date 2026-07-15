# Full App

Authenticated product — Next.js 16 + Supabase (auth + Postgres + RLS) + Tailwind + Vercel.

## Run

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npx supabase db push         # apply migrations (or link a project first)
npm run dev                  # http://localhost:3000
```

## Where things live

- `app/page.tsx` — entry; reads the session via the server adapter.
- `lib/supabase/server.ts` — server adapter. **All mutations go here.**
- `lib/supabase/client.ts` — browser adapter (publishable key only).
- `supabase/migrations/` — schema. **Every table has RLS from the first migration.**
- `.env.example` — required env. `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Non-negotiables (constitution)

- RLS on every table; authorize on `app_metadata`, never `user_metadata`.
- `service_role` key never `NEXT_PUBLIC_`, never in a client component.
- Schema changes are migrations only — never hand-applied to remote.

This is an MVP skeleton. Build the real auth + capabilities per `.planning/ROADMAP.md`.
