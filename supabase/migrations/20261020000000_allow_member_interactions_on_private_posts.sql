-- Let board members comment, reply, like and react on private posts (freewriting).
--
-- Child-entity policies used can_read_post(), which is the rule for reading a
-- post's BODY. A private post's body is author-only, so every other member was
-- rejected with 403 even though posts_feed deliberately shows them the post's
-- existence and metadata.
--
-- Interacting with a post and reading its body are now two separate rules:
--   - can_read_post:          unchanged, body access
--   - can_interact_with_post: author, or any member of the post's board,
--                             regardless of visibility
--
-- The body-protection paths are untouched: the posts SELECT policy, the CASE
-- masking in posts_feed, and notifications (title only).

CREATE OR REPLACE FUNCTION public.can_interact_with_post(p_post_id TEXT)
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
        OR public.has_board_access(p.board_id)
      )
  );
$$;

-- Reactions hang off either a comment or a reply; resolve whichever is set.
CREATE OR REPLACE FUNCTION public.can_interact_with_reaction_target(p_comment_id TEXT, p_reply_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = p_comment_id AND public.can_interact_with_post(c.post_id)
  ) OR EXISTS (
    SELECT 1 FROM public.replies r
    WHERE r.id = p_reply_id AND public.can_interact_with_post(r.post_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_interact_with_post(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_interact_with_reaction_target(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_interact_with_post(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_interact_with_reaction_target(TEXT, TEXT) TO anon, authenticated, service_role;

-- =============================================
-- Comments
-- =============================================

DROP POLICY IF EXISTS "Comments are viewable if parent post is visible" ON comments;
CREATE POLICY "Comments are viewable by board members and the post author"
  ON comments FOR SELECT USING (public.can_interact_with_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_interact_with_post(post_id)
  );

-- =============================================
-- Replies
-- =============================================

DROP POLICY IF EXISTS "Replies are viewable if parent post is visible" ON replies;
CREATE POLICY "Replies are viewable by board members and the post author"
  ON replies FOR SELECT USING (public.can_interact_with_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own replies" ON replies;
CREATE POLICY "Users can insert their own replies"
  ON replies FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_interact_with_post(post_id)
  );

-- =============================================
-- Likes
-- =============================================

DROP POLICY IF EXISTS "Likes are viewable if parent post is visible" ON likes;
CREATE POLICY "Likes are viewable by board members and the post author"
  ON likes FOR SELECT USING (public.can_interact_with_post(post_id));

DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_interact_with_post(post_id)
  );

-- =============================================
-- Reactions
-- =============================================

DROP POLICY IF EXISTS "Reactions are viewable if parent post is visible" ON reactions;
CREATE POLICY "Reactions are viewable by board members and the post author"
  ON reactions FOR SELECT USING (
    public.can_interact_with_reaction_target(comment_id, reply_id)
  );

DROP POLICY IF EXISTS "Users can insert their own reactions" ON reactions;
CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.can_interact_with_reaction_target(comment_id, reply_id)
  );

-- No policy references it any more.
DROP FUNCTION IF EXISTS public.can_read_reaction_target(TEXT, TEXT);
