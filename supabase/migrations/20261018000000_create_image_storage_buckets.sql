-- Image buckets that replace Firebase Storage for NEW uploads.
--
-- Firebase Storage rules cannot see who is signed in (the app authenticates with
-- Supabase Auth, not Firebase Auth), so postImages / profilePhotos /
-- feedbackScreenshots had to stay writable by anonymous clients. Supabase
-- Storage runs on the same JWT as the rest of the app, so ownership can be
-- enforced here with auth.uid().
--
-- Existing Firebase files and the Firebase URLs stored in the DB are untouched;
-- once clients upload here, Firebase writes are closed and it becomes read-only.
--
-- Design:
--   * Buckets are public: images are served by public URL with no auth, same as
--     the Firebase download URLs they replace. No SELECT policy is created on
--     storage.objects, so the API cannot be used to list/enumerate files.
--   * Writes are append-only. Only INSERT is granted, restricted to the caller's
--     own `{uid}/...` folder. There is no UPDATE or DELETE policy, so nobody can
--     overwrite or remove an uploaded image. Clients must upload to a fresh,
--     timestamped path (profile photos too — a new path also busts the CDN cache).
--   * Raster allowlist only (jpeg/png/webp). image/* would admit image/svg+xml,
--     which is scriptable markup. The client re-encodes everything to jpeg/png/webp
--     and already rejects heic/heif/gif.
--   * file_size_limit mirrors the 20MB cap the Firebase rules enforced.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('post-images',          'post-images',          true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-photos',       'profile-photos',       true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('feedback-screenshots', 'feedback-screenshots', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload post images to their own folder" ON storage.objects;
CREATE POLICY "Users can upload post images to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can upload profile photos to their own folder" ON storage.objects;
CREATE POLICY "Users can upload profile photos to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can upload feedback screenshots to their own folder" ON storage.objects;
CREATE POLICY "Users can upload feedback screenshots to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
