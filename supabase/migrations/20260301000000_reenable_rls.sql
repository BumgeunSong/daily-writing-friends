-- Phase 8B: Re-enable RLS with UUID-native auth.uid() policies
-- Prerequisite: 20260228000000_remap_uids_to_uuid.sql has been applied
--               (users.id is now UUID matching auth.users.id)
--
-- No ::text cast needed — auth.uid() returns UUID, all user columns are UUID.
--
-- Design decisions:
--   - Public posts and their child entities (comments, replies, likes, reactions) are publicly readable
--   - Private posts and their child entities are visible only to the author
--   - Users can only write/update/delete their own content
--   - Notifications and drafts are private to the recipient/owner
--   - boards, users, user_board_permissions, board_waiting_users: read-only via anon
--     (writes go through service_role from admin app or edge functions)
--   - reviews: users can insert/update their own
--   - uid_mapping: read-only reference table

-- =============================================
-- Posts
-- =============================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts are viewable by everyone, private posts by author only"
  ON posts FOR SELECT USING (
    visibility = 'public'
    OR auth.uid() = author_id
  );
CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- =============================================
-- Comments
-- =============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable if parent post is visible"
  ON comments FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id
      AND (posts.visibility = 'public' OR posts.author_id = auth.uid()))
  );
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Replies
-- =============================================
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable if parent post is visible"
  ON replies FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = replies.post_id
      AND (posts.visibility = 'public' OR posts.author_id = auth.uid()))
  );
CREATE POLICY "Users can insert their own replies"
  ON replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies"
  ON replies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies"
  ON replies FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Likes
-- =============================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable if parent post is visible"
  ON likes FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = likes.post_id
      AND (posts.visibility = 'public' OR posts.author_id = auth.uid()))
  );
CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Reactions
-- =============================================
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable if parent post is visible"
  ON reactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = reactions.post_id
      AND (posts.visibility = 'public' OR posts.author_id = auth.uid()))
  );
CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Notifications (private to recipient)
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- INSERT: handled by pg_net trigger → Edge Function running as service_role; no anon INSERT needed.

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE USING (auth.uid() = recipient_id);

-- =============================================
-- Drafts (private to owner)
-- =============================================
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own drafts"
  ON drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drafts"
  ON drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drafts"
  ON drafts FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Blocks (private to blocker)
-- =============================================
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can insert their own blocks"
  ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete their own blocks"
  ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- =============================================
-- Users (public profiles, own-row writes)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User profiles are viewable by everyone"
  ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============================================
-- Reviews (public read, own-row writes)
-- =============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

-- =============================================
-- Boards (public read, admin writes via service_role)
-- =============================================
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boards are viewable by everyone"
  ON boards FOR SELECT USING (true);

-- =============================================
-- User board permissions (public read, admin writes via service_role)
-- =============================================
ALTER TABLE user_board_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions are viewable by everyone"
  ON user_board_permissions FOR SELECT USING (true);

-- =============================================
-- Board waiting users (public read, admin writes via service_role)
-- =============================================
ALTER TABLE board_waiting_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waiting users are viewable by everyone"
  ON board_waiting_users FOR SELECT USING (true);
CREATE POLICY "Users can add themselves to waiting list"
  ON board_waiting_users FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Reference / internal tables (no anon access needed)
-- =============================================
ALTER TABLE uid_mapping ENABLE ROW LEVEL SECURITY;
-- uid_mapping: no SELECT policy for anon — only accessed via service_role

ALTER TABLE write_ops ENABLE ROW LEVEL SECURITY;
-- write_ops: legacy dual-write tracking, no anon access needed

ALTER TABLE migration_diffs ENABLE ROW LEVEL SECURITY;
-- migration_diffs: legacy shadow-read tracking, no anon access needed
