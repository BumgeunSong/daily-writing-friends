-- posts_feed: a redacted SELECT-only view that lets non-authors see that
-- private posts EXIST (so they appear in feeds, user-page lists, and the
-- contribution stat grid) without exposing the private content itself.
--
-- The underlying RLS on `posts` still hides private rows from non-authors,
-- which is why we expose this view as a parallel read path:
--   - Runs with definer privileges (security_invoker = false, the default)
--     so it bypasses RLS on the joined tables and can return every row.
--   - Masks `title`-adjacent content columns (`content`, `content_preview`,
--     `content_json`, `thumbnail_image_url`) when the viewer is not the
--     author of a `private` row. `auth.uid()` resolves from the session JWT
--     even when the view runs as definer, so the mask reacts to the real
--     caller.
--   - `security_barrier = true` prevents Postgres from pushing user-supplied
--     predicates (e.g. WHERE content ILIKE ...) past the CASE expressions,
--     which would otherwise leak masked content through error/timing side
--     channels.
--
-- Write operations (INSERT/UPDATE/DELETE) continue to target the base
-- `posts` table and remain governed by the existing RLS policies.

CREATE OR REPLACE VIEW posts_feed
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  p.id,
  p.board_id,
  p.author_id,
  p.author_name,
  p.title,
  CASE WHEN p.visibility = 'public' OR auth.uid() = p.author_id
       THEN p.content ELSE NULL END AS content,
  CASE WHEN p.visibility = 'public' OR auth.uid() = p.author_id
       THEN p.content_preview ELSE NULL END AS content_preview,
  CASE WHEN p.visibility = 'public' OR auth.uid() = p.author_id
       THEN p.content_json ELSE NULL END AS content_json,
  CASE WHEN p.visibility = 'public' OR auth.uid() = p.author_id
       THEN p.thumbnail_image_url ELSE NULL END AS thumbnail_image_url,
  p.visibility,
  p.count_of_comments,
  p.count_of_replies,
  p.count_of_likes,
  p.engagement_score,
  p.week_days_from_first_day,
  p.created_at,
  p.updated_at,
  p.content_length,
  b.first_day AS board_first_day,
  u.profile_photo_url AS author_profile_photo_url
FROM posts p
LEFT JOIN boards b ON b.id = p.board_id
LEFT JOIN users u ON u.id = p.author_id;

GRANT SELECT ON posts_feed TO anon, authenticated;
