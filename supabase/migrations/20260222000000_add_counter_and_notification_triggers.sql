-- Phase 7A: Counter triggers, notification triggers, RLS policies, observability
-- Replaces Cloud Functions for counters and notifications

-- =============================================
-- 1. Counter Triggers
-- =============================================

-- Comments counter on posts
CREATE OR REPLACE FUNCTION update_post_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_comments = count_of_comments + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_comments = GREATEST(count_of_comments - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_count AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Replies counter on posts
CREATE OR REPLACE FUNCTION update_post_reply_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_replies = count_of_replies + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reply_count AFTER INSERT OR DELETE ON replies
FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- Replies counter on comments
CREATE OR REPLACE FUNCTION update_comment_reply_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET count_of_replies = count_of_replies + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_reply_count AFTER INSERT OR DELETE ON replies
FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

-- Likes counter on posts
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_likes = count_of_likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_likes = GREATEST(count_of_likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_count AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Engagement score (recomputed when counts change)
CREATE OR REPLACE FUNCTION update_engagement_score() RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := NEW.count_of_comments + NEW.count_of_replies + NEW.count_of_likes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_engagement_score BEFORE UPDATE OF count_of_comments, count_of_replies, count_of_likes ON posts
FOR EACH ROW EXECUTE FUNCTION update_engagement_score();

-- =============================================
-- 2. Notification Triggers (via pg_net)
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Notification on comment insert
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url') || '/create-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'comment_on_post',
      'comment_id', NEW.id,
      'post_id', NEW.post_id,
      'author_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_comment AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Notification on reply insert
CREATE OR REPLACE FUNCTION notify_on_reply() RETURNS TRIGGER AS $$
BEGIN
  -- Notify post author
  IF NEW.post_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reply_on_post',
        'reply_id', NEW.id,
        'post_id', NEW.post_id,
        'author_id', NEW.user_id
      )
    );
  END IF;

  -- Notify comment author
  IF NEW.comment_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reply_on_comment',
        'reply_id', NEW.id,
        'comment_id', NEW.comment_id,
        'author_id', NEW.user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_reply AFTER INSERT ON replies
FOR EACH ROW EXECUTE FUNCTION notify_on_reply();

-- Notification on like insert
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url') || '/create-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'like_on_post',
      'like_id', NEW.id,
      'post_id', NEW.post_id,
      'author_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_like AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Notification on reaction insert
CREATE OR REPLACE FUNCTION notify_on_reaction() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.comment_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reaction_on_comment',
        'reaction_id', NEW.id,
        'comment_id', NEW.comment_id,
        'author_id', NEW.user_id
      )
    );
  ELSIF NEW.reply_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reaction_on_reply',
        'reaction_id', NEW.id,
        'reply_id', NEW.reply_id,
        'author_id', NEW.user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_reaction AFTER INSERT ON reactions
FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- =============================================
-- 3. Failed Notifications Table (observability)
-- =============================================

CREATE TABLE failed_notifications (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. RLS Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Posts
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid()::text = author_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid()::text = user_id);

-- Replies
CREATE POLICY "Replies are viewable by everyone"
  ON replies FOR SELECT USING (true);

CREATE POLICY "Users can insert their own replies"
  ON replies FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own replies"
  ON replies FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own replies"
  ON replies FOR DELETE USING (auth.uid()::text = user_id);

-- Likes
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE USING (auth.uid()::text = user_id);

-- Reactions
CREATE POLICY "Reactions are viewable by everyone"
  ON reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE USING (auth.uid()::text = user_id);

-- Notifications (users can only read their own)
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (auth.uid()::text = recipient_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (auth.uid()::text = recipient_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- Drafts (users can only access their own)
CREATE POLICY "Users can view their own drafts"
  ON drafts FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON drafts FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own drafts"
  ON drafts FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON drafts FOR DELETE USING (auth.uid()::text = user_id);

-- =============================================
-- 5. Counter Integrity Check Function
-- =============================================

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
  LEFT JOIN (SELECT post_id AS pid, COUNT(*) AS cnt FROM comments GROUP BY post_id) c ON c.pid = p.id
  LEFT JOIN (SELECT post_id AS pid, COUNT(*) AS cnt FROM replies GROUP BY post_id) r ON r.pid = p.id
  LEFT JOIN (SELECT post_id AS pid, COUNT(*) AS cnt FROM likes GROUP BY post_id) l ON l.pid = p.id
  WHERE
    p.count_of_comments != COALESCE(c.cnt, 0) OR
    p.count_of_replies != COALESCE(r.cnt, 0) OR
    p.count_of_likes != COALESCE(l.cnt, 0);
END;
$$ LANGUAGE plpgsql;
