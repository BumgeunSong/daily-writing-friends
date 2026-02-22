-- Backfill notifications for the last 7 days
-- Safe to run multiple times: uses NOT EXISTS to skip duplicates
-- Supabase migrations run in a transaction implicitly, so no BEGIN/COMMIT needed

-- 1. comment_on_post
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, comment_id, message, read, created_at)
SELECT
  p.author_id,
  'comment_on_post',
  c.user_id,
  p.board_id,
  c.post_id,
  c.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(p.title, ''), 20) || '" 글에 댓글을 달았어요.',
  false,
  c.created_at
FROM comments c
JOIN posts p ON p.id = c.post_id
JOIN users u ON u.id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '7 days'
  AND c.user_id != p.author_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'comment_on_post'
      AND n.actor_id = c.user_id
      AND n.comment_id = c.id
  );

-- 2. reply_on_post
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, reply_id, message, read, created_at)
SELECT
  p.author_id,
  'reply_on_post',
  r.user_id,
  p.board_id,
  r.post_id,
  r.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(p.title, ''), 20) || '" 글에 답글을 달았어요.',
  false,
  r.created_at
FROM replies r
JOIN posts p ON p.id = r.post_id
JOIN users u ON u.id = r.user_id
WHERE r.created_at >= NOW() - INTERVAL '7 days'
  AND r.post_id IS NOT NULL
  AND r.user_id != p.author_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'reply_on_post'
      AND n.actor_id = r.user_id
      AND n.reply_id = r.id
  );

-- 3. reply_on_comment
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, comment_id, reply_id, message, read, created_at)
SELECT
  c.user_id,
  'reply_on_comment',
  r.user_id,
  p.board_id,
  r.post_id,
  r.comment_id,
  r.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(c.content, ''), 20) || '" 댓글에 답글을 달았어요.',
  false,
  r.created_at
FROM replies r
JOIN comments c ON c.id = r.comment_id
JOIN posts p ON p.id = r.post_id
JOIN users u ON u.id = r.user_id
WHERE r.created_at >= NOW() - INTERVAL '7 days'
  AND r.comment_id IS NOT NULL
  AND r.user_id != c.user_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'reply_on_comment'
      AND n.actor_id = r.user_id
      AND n.reply_id = r.id
  );

-- 4. like_on_post
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, like_id, message, read, created_at)
SELECT
  p.author_id,
  'like_on_post',
  l.user_id,
  p.board_id,
  l.post_id,
  l.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(p.title, ''), 20) || '" 글에 좋아요를 눌렀어요.',
  false,
  l.created_at
FROM likes l
JOIN posts p ON p.id = l.post_id
JOIN users u ON u.id = l.user_id
WHERE l.created_at >= NOW() - INTERVAL '7 days'
  AND l.user_id != p.author_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'like_on_post'
      AND n.actor_id = l.user_id
      AND n.like_id = l.id
  );

-- 5. reaction_on_comment
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, comment_id, reaction_id, message, read, created_at)
SELECT
  c.user_id,
  'reaction_on_comment',
  rx.user_id,
  p.board_id,
  c.post_id,
  rx.comment_id,
  rx.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(c.content, ''), 20) || '" 댓글에 반응했어요.',
  false,
  rx.created_at
FROM reactions rx
JOIN comments c ON c.id = rx.comment_id
JOIN posts p ON p.id = c.post_id
JOIN users u ON u.id = rx.user_id
WHERE rx.created_at >= NOW() - INTERVAL '7 days'
  AND rx.comment_id IS NOT NULL
  AND rx.user_id != c.user_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'reaction_on_comment'
      AND n.actor_id = rx.user_id
      AND n.reaction_id = rx.id
  );

-- 6. reaction_on_reply
INSERT INTO notifications (recipient_id, type, actor_id, board_id, post_id, reply_id, reaction_id, message, read, created_at)
SELECT
  rp.user_id,
  'reaction_on_reply',
  rx.user_id,
  p.board_id,
  rp.post_id,
  rx.reply_id,
  rx.id,
  COALESCE(u.nickname, u.real_name, '') || '님이 "' || LEFT(COALESCE(rp.content, ''), 20) || '" 답글에 반응했어요.',
  false,
  rx.created_at
FROM reactions rx
JOIN replies rp ON rp.id = rx.reply_id
JOIN posts p ON p.id = rp.post_id
JOIN users u ON u.id = rx.user_id
WHERE rx.created_at >= NOW() - INTERVAL '7 days'
  AND rx.reply_id IS NOT NULL
  AND rx.user_id != rp.user_id
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'reaction_on_reply'
      AND n.actor_id = rx.user_id
      AND n.reaction_id = rx.id
  );
