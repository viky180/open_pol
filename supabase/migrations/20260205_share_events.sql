-- Share events for acquisition tracking (WhatsApp / X / copy link)

create table if not exists public.share_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null check (platform in ('whatsapp','x','copy')),
  party_id uuid null references public.parties(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  source text null
);

-- Helpful indexes for dashboards
create index if not exists share_events_created_at_idx on public.share_events(created_at desc);
create index if not exists share_events_party_id_idx on public.share_events(party_id);
create index if not exists share_events_platform_idx on public.share_events(platform);

-- RLS: keep it simple; allow inserts from anon/auth clients.
alter table public.share_events enable row level security;

drop policy if exists "allow_insert_share_events" on public.share_events;
create policy "allow_insert_share_events"
  on public.share_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "allow_select_share_events" on public.share_events;
create policy "allow_select_share_events"
  on public.share_events
  for select
  to authenticated
  using (true);
