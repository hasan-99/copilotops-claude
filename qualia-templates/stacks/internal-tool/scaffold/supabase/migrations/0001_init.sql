-- Initial migration. Internal portal: roles gate everything; RLS on every
-- table from the first migration. Replace `records` with your real domain.

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  title text not null,
  status text not null default 'open',
  deleted_at timestamptz,             -- soft-delete (constitution: where flagged)
  created_at timestamptz not null default now()
);

alter table public.records enable row level security;

-- Authenticated staff may read non-deleted records.
create policy "records_select_staff"
  on public.records for select
  using (auth.role() = 'authenticated' and deleted_at is null);

-- Admins (role in app_metadata) may write. Matching SELECT exists above.
create policy "records_write_admin"
  on public.records for all
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
