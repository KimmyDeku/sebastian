-- Run once in Supabase (SQL Editor). Stores which devices get push notifications and when.
-- Only reminder times and ids are stored, never what the reminder is about.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  phrase text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.push_jobs (
  endpoint text not null references public.push_subscriptions(endpoint) on delete cascade,
  id text not null,
  fire_at timestamptz not null,
  sent boolean not null default false,
  primary key (endpoint, id)
);
create index if not exists push_jobs_due on public.push_jobs (sent, fire_at);
-- Lock both tables: only Sebastian's server (service role key) can use them.
alter table public.push_subscriptions enable row level security;
alter table public.push_jobs enable row level security;
