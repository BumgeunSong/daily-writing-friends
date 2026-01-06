-- ================================================
-- Integrity Checks for Migration Verification
-- ================================================
-- Run these queries after migration to verify data integrity.
-- All checks should return count = 0 for a successful migration.

-- Orphan comments (comments referencing non-existent posts)
SELECT 'orphan_comments' as check_name, COUNT(*) as count
FROM comments c
LEFT JOIN posts p ON p.id = c.post_id
WHERE p.id IS NULL;

-- Orphan replies (replies referencing non-existent comments)
SELECT 'orphan_replies' as check_name, COUNT(*) as count
FROM replies r
LEFT JOIN comments c ON c.id = r.comment_id
WHERE c.id IS NULL;

-- Orphan likes (likes referencing non-existent posts)
SELECT 'orphan_likes' as check_name, COUNT(*) as count
FROM likes l
LEFT JOIN posts p ON p.id = l.post_id
WHERE p.id IS NULL;

-- Orphan notifications (notifications for non-existent users)
SELECT 'orphan_notifications' as check_name, COUNT(*) as count
FROM notifications n
LEFT JOIN users u ON u.id = n.recipient_id
WHERE u.id IS NULL;

-- Orphan posts (posts referencing non-existent boards)
SELECT 'orphan_posts_board' as check_name, COUNT(*) as count
FROM posts p
LEFT JOIN boards b ON b.id = p.board_id
WHERE b.id IS NULL;

-- Orphan posts (posts referencing non-existent authors)
SELECT 'orphan_posts_author' as check_name, COUNT(*) as count
FROM posts p
LEFT JOIN users u ON u.id = p.author_id
WHERE u.id IS NULL;

-- Posts with mismatched comment counts
SELECT 'comment_count_mismatch' as check_name, COUNT(*) as count
FROM (
  SELECT p.id, p.count_of_comments, COALESCE(c.actual_count, 0) as actual_count
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as actual_count
    FROM comments
    GROUP BY post_id
  ) c ON c.post_id = p.id
  WHERE p.count_of_comments != COALESCE(c.actual_count, 0)
) mismatched;

-- Posts with mismatched reply counts
SELECT 'reply_count_mismatch' as check_name, COUNT(*) as count
FROM (
  SELECT p.id, p.count_of_replies, COALESCE(r.actual_count, 0) as actual_count
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as actual_count
    FROM replies
    GROUP BY post_id
  ) r ON r.post_id = p.id
  WHERE p.count_of_replies != COALESCE(r.actual_count, 0)
) mismatched;

-- Posts with mismatched like counts
SELECT 'like_count_mismatch' as check_name, COUNT(*) as count
FROM (
  SELECT p.id, p.count_of_likes, COALESCE(l.actual_count, 0) as actual_count
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as actual_count
    FROM likes
    GROUP BY post_id
  ) l ON l.post_id = p.id
  WHERE p.count_of_likes != COALESCE(l.actual_count, 0)
) mismatched;

-- Duplicate likes (same user liking same post multiple times)
SELECT 'duplicate_likes' as check_name, COUNT(*) as count
FROM (
  SELECT post_id, user_id, COUNT(*) as cnt
  FROM likes
  GROUP BY post_id, user_id
  HAVING COUNT(*) > 1
) duplicates;

-- Duplicate reactions (same user reacting to same entity)
SELECT 'duplicate_reactions' as check_name, COUNT(*) as count
FROM (
  SELECT entity_type, entity_id, user_id, COUNT(*) as cnt
  FROM reactions
  GROUP BY entity_type, entity_id, user_id
  HAVING COUNT(*) > 1
) duplicates;

-- Invalid notification types
SELECT 'invalid_notification_types' as check_name, COUNT(*) as count
FROM notifications
WHERE type NOT IN (
  'comment_on_post',
  'reply_on_comment',
  'reply_on_post',
  'reaction_on_comment',
  'reaction_on_reply',
  'like_on_post'
);

-- Users without valid board permissions
SELECT 'orphan_permissions_user' as check_name, COUNT(*) as count
FROM user_board_permissions p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL;

-- Board permissions for non-existent boards
SELECT 'orphan_permissions_board' as check_name, COUNT(*) as count
FROM user_board_permissions p
LEFT JOIN boards b ON b.id = p.board_id
WHERE b.id IS NULL;

-- ================================================
-- Summary Query (run all checks at once)
-- ================================================
SELECT * FROM (
  SELECT 'orphan_comments' as check_name, COUNT(*) as count
  FROM comments c LEFT JOIN posts p ON p.id = c.post_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'orphan_replies', COUNT(*)
  FROM replies r LEFT JOIN comments c ON c.id = r.comment_id WHERE c.id IS NULL
  UNION ALL
  SELECT 'orphan_likes', COUNT(*)
  FROM likes l LEFT JOIN posts p ON p.id = l.post_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'orphan_notifications', COUNT(*)
  FROM notifications n LEFT JOIN users u ON u.id = n.recipient_id WHERE u.id IS NULL
  UNION ALL
  SELECT 'orphan_posts_board', COUNT(*)
  FROM posts p LEFT JOIN boards b ON b.id = p.board_id WHERE b.id IS NULL
  UNION ALL
  SELECT 'orphan_posts_author', COUNT(*)
  FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE u.id IS NULL
) checks
WHERE count > 0;

-- If the above query returns no rows, all integrity checks pass!
