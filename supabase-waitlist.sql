-- Run once in Supabase (SQL Editor). Stores waitlist sign-ups from the landing page.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  interest text,
  created_at timestamptz not null default now()
);
-- Locked: only Sebastian's server (service role key) can read or write it.
alter table public.waitlist enable row level security;
