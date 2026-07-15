-- Initial migration. RLS is enabled FROM THE FIRST MIGRATION, not retrofitted.
-- Replace `profiles` with your real domain tables — keep the RLS pattern.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS on every table (constitution).
alter table public.profiles enable row level security;

-- A user may read their own row.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- A user may update their own row. (Every UPDATE policy has a matching SELECT.)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A user may insert their own row.
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);
