-- Board-scoped reads: require a user_board_permissions row to read a board's content.
--
-- Until now the only board-membership check lived in the browser, inside two
-- React Router loaders. The database itself let any caller holding the anon key
-- read every public post of every cohort:
--   - posts RLS keyed on visibility and authorship only, never on board membership
--   - posts_feed runs with security_invoker = false, so it bypasses RLS entirely
--     and carried no membership predicate of its own
--
-- Both read paths now go through has_board_access(). Authors keep access to
-- their own posts regardless of membership, so that losing a board permission
-- never hides someone's own writing from them.

-- =============================================
-- Access predicates
-- =============================================

-- SECURITY DEFINER so the lookup does not re-enter user_board_permissions' own
-- RLS, and so calling it from a policy on posts cannot recurse. Reads are
-- served by the UNIQUE(user_id, board_id) index.
CREATE OR REPLACE FUNCTION public.has_board_access(p_board_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_board_permissions p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.board_id = p_board_id
      AND p.permission IN ('read', 'write')
  );
$$;

-- The single definition of "may this caller read this post". Child-entity
-- policies below all defer to it so the rule cannot drift between comments,
-- replies, likes and reactions the way the inlined copies did.
CREATE OR REPLACE FUNCTION public.can_read_post(p_post_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = p_post_id
      AND (
        (SELECT auth.uid()) = p.author_id
        OR (p.visibility = 'public' AND public.has_board_access(p.board_id))
      )
  );
$$;

-- Reactions hang off either a comment or a reply; resolve whichever is set.
CREATE OR REPLACE FUNCTION public.can_read_reaction_target(p_comment_id TEXT, p_reply_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = p_comment_id AND public.can_read_post(c.post_id)
  ) OR EXISTS (
    SELECT 1 FROM public.replies r
    WHERE r.id = p_reply_id AND public.can_read_post(r.post_id)
  );
$$;

REVOKE ALL ON FUNCTION public.has_board_access(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_post(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_reaction_target(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_board_access(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_post(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_reaction_target(TEXT, TEXT) TO anon, authenticated, service_role;

-- =============================================
-- Posts
-- =============================================

DROP POLICY IF EXISTS "Public posts are viewable by everyone, private posts by author only" ON posts;

-- Authorship is checked first so a user reading their own posts (the stats grid
-- and their own profile) never pays for a membership lookup.
CREATE POLICY "Posts are viewable by board members, and by their author"
  ON posts FOR SELECT USING (
    (SELECT auth.uid()) = author_id
    OR (visibility = 'public' AND public.has_board_access(board_id))
  );

-- Writing into a board still requires membership in that board.
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND public.has_board_access(board_id)
  );

-- =============================================
-- Comments
-- =============================================

DROP POLICY IF EXISTS "Comments are viewable if parent post is visible" ON comments;
CREATE POLICY "Comments are viewable if parent post is visible"
  ON comments FOR SELECT USING (public.can_read_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_read_post(post_id)
  );

-- =============================================
-- Replies
-- =============================================

DROP POLICY IF EXISTS "Replies are viewable if parent post is visible" ON replies;
CREATE POLICY "Replies are viewable if parent post is visible"
  ON replies FOR SELECT USING (public.can_read_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own replies" ON replies;
CREATE POLICY "Users can insert their own replies"
  ON replies FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_read_post(post_id)
  );

-- =============================================
-- Likes
-- =============================================

DROP POLICY IF EXISTS "Likes are viewable if parent post is visible" ON likes;
CREATE POLICY "Likes are viewable if parent post is visible"
  ON likes FOR SELECT USING (public.can_read_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_read_post(post_id)
  );

-- =============================================
-- Reactions
-- =============================================

DROP POLICY IF EXISTS "Reactions are viewable if parent post is visible" ON reactions;
CREATE POLICY "Reactions are viewable if parent post is visible"
  ON reactions FOR SELECT USING (
    public.can_read_reaction_target(comment_id, reply_id)
  );

DROP POLICY IF EXISTS "Users can insert their own reactions" ON reactions;
CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_read_reaction_target(comment_id, reply_id)
  );

-- =============================================
-- posts_feed
-- =============================================

-- The view keeps its definer privileges and its content masking, which is what
-- lets board members see that a private post EXISTS without reading it. The new
-- WHERE clause scopes that visibility to boards the caller belongs to; because
-- the view bypasses RLS, this predicate is the view's only gate.
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
LEFT JOIN users u ON u.id = p.author_id
WHERE auth.uid() = p.author_id
   OR public.has_board_access(p.board_id);

GRANT SELECT ON posts_feed TO anon, authenticated;
