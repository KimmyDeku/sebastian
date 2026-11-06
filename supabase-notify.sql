-- Run once in Supabase (SQL Editor). Email notifications Sebastian sends to each user's own address.
-- Each row is one email: a reminder scheduled for later, or one sent straight away.
create table if not exists public.notify_jobs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  fire_at timestamptz not null,
  kind text not null,
  subject text not null,
  body jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  primary key (user_id, id)
);
create index if not exists notify_jobs_due on public.notify_jobs (sent_at, fire_at);
-- Locked: only Sebastian's server (service role key) can read or write it.
alter table public.notify_jobs enable row level security;
