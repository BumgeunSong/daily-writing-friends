-- Rebuild backfilled notification messages with 35-char truncation + ellipsis
-- Helper to match the Edge Function logic: 35 chars with '...' if longer
CREATE OR REPLACE FUNCTION pg_temp.preview(content TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN LENGTH(content) > 35 THEN LEFT(content, 35) || '...'
    ELSE content
  END;
$$ LANGUAGE sql;

-- 1. comment_on_post, like_on_post, reply_on_post — use post title
UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(p.title, '')) || ''' 글에 댓글을 달았어요.'
FROM users u, posts p
WHERE n.actor_id = u.id AND n.post_id = p.id
  AND n.type = 'comment_on_post'
  AND n.created_at >= NOW() - INTERVAL '7 days';

UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(p.title, '')) || ''' 글에 좋아요를 눌렀어요.'
FROM users u, posts p
WHERE n.actor_id = u.id AND n.post_id = p.id
  AND n.type = 'like_on_post'
  AND n.created_at >= NOW() - INTERVAL '7 days';

UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(p.title, '')) || ''' 글에 답글을 달았어요.'
FROM users u, posts p
WHERE n.actor_id = u.id AND n.post_id = p.id
  AND n.type = 'reply_on_post'
  AND n.created_at >= NOW() - INTERVAL '7 days';

-- 2. reply_on_comment, reaction_on_comment — use comment content
UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(c.content, '')) || ''' 댓글에 답글을 달았어요.'
FROM users u, comments c
WHERE n.actor_id = u.id AND n.comment_id = c.id
  AND n.type = 'reply_on_comment'
  AND n.created_at >= NOW() - INTERVAL '7 days';

UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(c.content, '')) || ''' 댓글에 반응했어요.'
FROM users u, comments c
WHERE n.actor_id = u.id AND n.comment_id = c.id
  AND n.type = 'reaction_on_comment'
  AND n.created_at >= NOW() - INTERVAL '7 days';

-- 3. reaction_on_reply — use reply content
UPDATE notifications n
SET message = COALESCE(u.nickname, u.real_name, '') || '님이 ''' || pg_temp.preview(COALESCE(r.content, '')) || ''' 답글에 반응했어요.'
FROM users u, replies r
WHERE n.actor_id = u.id AND n.reply_id = r.id
  AND n.type = 'reaction_on_reply'
  AND n.created_at >= NOW() - INTERVAL '7 days';
