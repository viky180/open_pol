-- Leader-led merge signaling + product event telemetry

create table if not exists public.party_merge_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  party_id uuid not null references public.parties(id) on delete cascade,
  target_party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text null,
  constraint party_merge_signals_no_self_target check (party_id <> target_party_id),
  constraint party_merge_signals_unique_member_target unique (party_id, target_party_id, user_id)
);

create index if not exists party_merge_signals_party_idx
  on public.party_merge_signals(party_id, created_at desc);
create index if not exists party_merge_signals_target_idx
  on public.party_merge_signals(target_party_id, created_at desc);
create index if not exists party_merge_signals_user_idx
  on public.party_merge_signals(user_id);

alter table public.party_merge_signals enable row level security;

drop policy if exists "merge_signals_select" on public.party_merge_signals;
create policy "merge_signals_select"
  on public.party_merge_signals
  for select
  to authenticated
  using (true);

drop policy if exists "merge_signals_insert" on public.party_merge_signals;
create policy "merge_signals_insert"
  on public.party_merge_signals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "merge_signals_delete" on public.party_merge_signals;
create policy "merge_signals_delete"
  on public.party_merge_signals
  for delete
  to authenticated
  using (auth.uid() = user_id);


create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  party_id uuid null references public.parties(id) on delete set null,
  target_party_id uuid null references public.parties(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  source text null,
  metadata jsonb null
);

create index if not exists product_events_created_at_idx on public.product_events(created_at desc);
create index if not exists product_events_name_idx on public.product_events(event_name);
create index if not exists product_events_party_idx on public.product_events(party_id);

alter table public.product_events enable row level security;

drop policy if exists "product_events_insert" on public.product_events;
create policy "product_events_insert"
  on public.product_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "product_events_select" on public.product_events;
create policy "product_events_select"
  on public.product_events
  for select
  to authenticated
  using (true);
