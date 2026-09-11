-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Support tickets: anyone can submit; only you can read (via Dashboard / service role)

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  note text not null default '',
  log_text text not null default '',
  file_name text,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done'))
);

-- If the table already existed without a default:
alter table public.support_tickets
  alter column log_text set default '';

create index if not exists support_tickets_created_idx
  on public.support_tickets (created_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

-- Allow the browser anon key + signed-in users to insert rows.
grant usage on schema public to anon, authenticated;
grant insert on table public.support_tickets to anon, authenticated;

-- Public submit (guests + signed-in). Note required; combat log optional.
-- No SELECT for anon/authenticated — tickets only visible in Table Editor.
drop policy if exists "Anyone can submit support tickets" on public.support_tickets;
create policy "Anyone can submit support tickets"
  on public.support_tickets for insert
  to anon, authenticated
  with check (
    char_length(trim(coalesce(note, ''))) > 0
    and char_length(coalesce(note, '')) <= 8000
    and char_length(coalesce(log_text, '')) <= 1500000
    and (user_id is null or user_id = auth.uid())
  );
