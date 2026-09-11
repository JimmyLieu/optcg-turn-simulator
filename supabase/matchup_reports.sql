-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Saved MU reports with owner-only RLS

create table if not exists public.matchup_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matchup_reports_user_updated_idx
  on public.matchup_reports (user_id, updated_at desc);

alter table public.matchup_reports enable row level security;

drop policy if exists "Users read own reports" on public.matchup_reports;
create policy "Users read own reports"
  on public.matchup_reports for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own reports" on public.matchup_reports;
create policy "Users insert own reports"
  on public.matchup_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own reports" on public.matchup_reports;
create policy "Users update own reports"
  on public.matchup_reports for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own reports" on public.matchup_reports;
create policy "Users delete own reports"
  on public.matchup_reports for delete
  to authenticated
  using (auth.uid() = user_id);
