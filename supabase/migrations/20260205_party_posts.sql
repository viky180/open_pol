-- Party Posts
-- Simple in-app posts/announcements by members (optionally leaders)
-- Used for Home Feed and party updates.

create table if not exists public.party_posts (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists party_posts_party_created_at_idx
  on public.party_posts(party_id, created_at desc);

create index if not exists party_posts_created_at_idx
  on public.party_posts(created_at desc);

alter table public.party_posts enable row level security;

drop policy if exists "Party posts are viewable by everyone" on public.party_posts;
create policy "Party posts are viewable by everyone"
  on public.party_posts
  for select
  using (true);

drop policy if exists "Authenticated users can create party posts" on public.party_posts;
create policy "Authenticated users can create party posts"
  on public.party_posts
  for insert
  with check (
    auth.uid() is not null
    and auth.uid() = created_by
  );
