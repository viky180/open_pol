-- Storage bucket + policies for party icon image uploads

insert into storage.buckets (id, name, public)
values ('party-icon-images', 'party-icon-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can read party icon images" on storage.objects;
create policy "Public can read party icon images"
on storage.objects
for select
to public
using (bucket_id = 'party-icon-images');

drop policy if exists "Authenticated can upload own party icon images" on storage.objects;
create policy "Authenticated can upload own party icon images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'party-icon-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated can update own party icon images" on storage.objects;
create policy "Authenticated can update own party icon images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'party-icon-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'party-icon-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated can delete own party icon images" on storage.objects;
create policy "Authenticated can delete own party icon images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'party-icon-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
