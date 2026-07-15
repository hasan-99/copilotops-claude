# Internal Tool

Staff-facing portal — Next.js 16 + Supabase (invite-only auth + RLS) + Tailwind + Vercel.
Public signup is disabled; staff join by invite / SSO. Runs as a rolling release.

## Run

```bash
npm install
cp .env.example .env.local   # fill Supabase keys
npx supabase db push
npm run dev                  # http://localhost:3000
```

## Where things live

- `app/page.tsx` — portal entry; reads session + role from `app_metadata`.
- `lib/supabase/server.ts` — server adapter (mutations, RLS, inviting staff).
- `lib/supabase/client.ts` — browser adapter (publishable key only).
- `supabase/migrations/` — domain tables, RLS + role gating from the first migration.

## Non-negotiables (constitution)

- Roles live in `app_metadata`, never `user_metadata`.
- RLS on every table; every UPDATE policy has a matching SELECT.
- `service_role` server-only; used for inviting users from a server action.
- Disable public signup in the Supabase Auth settings.

This is an MVP skeleton. Build portal auth + workflows per `.planning/ROADMAP.md`.
