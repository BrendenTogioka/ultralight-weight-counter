-- ============================================================
-- STORAGE BUCKET SETUP
-- Run this in Supabase SQL Editor AFTER creating the bucket
-- in the Supabase Dashboard → Storage → New Bucket
--
-- Bucket name: gear-images
-- Public bucket: YES (check the toggle)
-- ============================================================

create policy "users upload own gear images"
  on storage.objects for insert
  with check (
    bucket_id = 'gear-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own gear images"
  on storage.objects for delete
  using (
    bucket_id = 'gear-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users update own gear images"
  on storage.objects for update
  using (
    bucket_id = 'gear-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "public read gear images"
  on storage.objects for select
  using (bucket_id = 'gear-images');
