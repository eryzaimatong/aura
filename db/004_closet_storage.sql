-- ============================================================
-- 004 — closet photo storage
-- Run after creating the private `closet` bucket (Storage → New bucket).
-- Each user may only touch objects under "<their user id>/…". Safe to re-run.
-- ============================================================
begin;

drop policy if exists closet_owner_read   on storage.objects;
drop policy if exists closet_owner_insert on storage.objects;
drop policy if exists closet_owner_update on storage.objects;
drop policy if exists closet_owner_delete on storage.objects;

create policy closet_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy closet_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy closet_owner_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

-- Deletion is real (hard rule 5): users can remove their own photos.
create policy closet_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
