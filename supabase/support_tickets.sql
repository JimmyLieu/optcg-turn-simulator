-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Support tickets: anyone can submit; only you can read (via Dashboard / service role)

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  note text not null default '',
  log_text text not null,
  file_name text,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done'))
);

create index if not exists support_tickets_created_idx
  on public.support_tickets (created_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

-- Public submit (guests + signed-in). No SELECT/UPDATE/DELETE for anon/authenticated
-- so tickets are only visible in the Supabase Table Editor (service role).
drop policy if exists "Anyone can submit support tickets" on public.support_tickets;
create policy "Anyone can submit support tickets"
  on public.support_tickets for insert
  to anon, authenticated
  with check (
    char_length(log_text) > 0
    and char_length(log_text) <= 1500000
    and char_length(coalesce(note, '')) <= 8000
    and (user_id is null or user_id = auth.uid())
  );
