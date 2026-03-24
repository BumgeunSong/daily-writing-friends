-- Fix counter triggers blocked by RLS
--
-- Root cause: trigger functions run as SECURITY INVOKER (default).
-- When User A comments on User B's post, the trigger's UPDATE on posts
-- is blocked by RLS policy "Users can update their own posts"
-- (auth.uid() = author_id). The UPDATE silently does nothing.
--
-- Fix: SECURITY DEFINER makes the function run as the function owner,
-- bypassing RLS. This is safe because:
--   1. The triggers only increment/decrement counter columns
--   2. They only fire on INSERT/DELETE of comments/replies/likes
--   3. RETURNS TRIGGER prevents direct RPC invocation
--   4. SET search_path prevents search_path injection
--   5. REVOKE EXECUTE blocks any future non-trigger invocation path

BEGIN;

-- =============================================
-- 1. Fix counter trigger functions
-- =============================================

-- Comments counter on posts
CREATE OR REPLACE FUNCTION update_post_comment_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_comments = count_of_comments + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_comments = GREATEST(count_of_comments - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Replies counter on posts
CREATE OR REPLACE FUNCTION update_post_reply_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_replies = count_of_replies + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Replies counter on comments
CREATE OR REPLACE FUNCTION update_comment_reply_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET count_of_replies = count_of_replies + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Likes counter on posts
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_likes = count_of_likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_likes = GREATEST(count_of_likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Prevent direct invocation (defense-in-depth, consistent with get_app_config pattern)
REVOKE EXECUTE ON FUNCTION update_post_comment_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_post_reply_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_comment_reply_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_post_like_count() FROM PUBLIC;

-- =============================================
-- 2. Backfill stale counters
-- =============================================
-- The backfill UPDATEs on posts will automatically fire trg_engagement_score
-- (BEFORE UPDATE trigger), so engagement_score is recalculated — no additional step needed.

-- Fix posts.count_of_comments
UPDATE posts p
SET count_of_comments = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM comments GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_comments != sub.cnt;

-- Fix posts.count_of_replies
UPDATE posts p
SET count_of_replies = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM replies GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_replies != sub.cnt;

-- Fix posts.count_of_likes
UPDATE posts p
SET count_of_likes = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM likes GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_likes != sub.cnt;

-- Fix comments.count_of_replies
UPDATE comments c
SET count_of_replies = sub.cnt
FROM (SELECT comment_id, count(*)::int AS cnt FROM replies GROUP BY comment_id) sub
WHERE c.id = sub.comment_id AND c.count_of_replies != sub.cnt;

-- Zero out counters for posts/comments with no remaining children
-- Uses NOT EXISTS (NULL-safe, unlike NOT IN which silently fails on NULLs)
UPDATE posts SET count_of_comments = 0
WHERE count_of_comments > 0
  AND NOT EXISTS (SELECT 1 FROM comments WHERE comments.post_id = posts.id);

UPDATE posts SET count_of_replies = 0
WHERE count_of_replies > 0
  AND NOT EXISTS (SELECT 1 FROM replies WHERE replies.post_id = posts.id);

UPDATE posts SET count_of_likes = 0
WHERE count_of_likes > 0
  AND NOT EXISTS (SELECT 1 FROM likes WHERE likes.post_id = posts.id);

UPDATE comments SET count_of_replies = 0
WHERE count_of_replies > 0
  AND NOT EXISTS (SELECT 1 FROM replies WHERE replies.comment_id = comments.id);

-- =============================================
-- 3. Fix check_counter_integrity ambiguous column bug
-- =============================================
-- The original function declares RETURNS TABLE (post_id TEXT, ...) which creates
-- an implicit PL/pgSQL variable that conflicts with comments.post_id etc.
-- Fix: fully qualify all column references.

CREATE OR REPLACE FUNCTION check_counter_integrity()
RETURNS TABLE (
  post_id TEXT,
  stored_comments BIGINT,
  actual_comments BIGINT,
  stored_replies BIGINT,
  actual_replies BIGINT,
  stored_likes BIGINT,
  actual_likes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.count_of_comments::BIGINT,
    COALESCE(c.cnt, 0)::BIGINT,
    p.count_of_replies::BIGINT,
    COALESCE(r.cnt, 0)::BIGINT,
    p.count_of_likes::BIGINT,
    COALESCE(l.cnt, 0)::BIGINT
  FROM posts p
  LEFT JOIN (SELECT comments.post_id AS pid, COUNT(*) AS cnt FROM comments GROUP BY comments.post_id) c ON c.pid = p.id
  LEFT JOIN (SELECT replies.post_id AS pid, COUNT(*) AS cnt FROM replies GROUP BY replies.post_id) r ON r.pid = p.id
  LEFT JOIN (SELECT likes.post_id AS pid, COUNT(*) AS cnt FROM likes GROUP BY likes.post_id) l ON l.pid = p.id
  WHERE
    p.count_of_comments != COALESCE(c.cnt, 0) OR
    p.count_of_replies != COALESCE(r.cnt, 0) OR
    p.count_of_likes != COALESCE(l.cnt, 0);
END;
$$ LANGUAGE plpgsql;

-- Restrict check_counter_integrity to service_role only (it exposes all post IDs and metrics)
REVOKE EXECUTE ON FUNCTION check_counter_integrity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION check_counter_integrity() FROM anon;
REVOKE EXECUTE ON FUNCTION check_counter_integrity() FROM authenticated;

COMMIT;
