-- Fix notifications with empty-string comment_id/reply_id from Firestore migration.
-- Previous backfill (20260302000000) only handled IS NULL, missing empty strings.
-- Production has a NOT NULL constraint on comment_id, so we can't set NULL.

-- Step 1: Backfill comment_id for reaction_on_reply rows with empty comment_id
-- by looking up the reply's parent comment.
UPDATE notifications n
SET comment_id = r.comment_id
FROM replies r
WHERE n.type = 'reaction_on_reply'
  AND (n.comment_id = '' OR n.comment_id IS NULL)
  AND n.reply_id IS NOT NULL
  AND n.reply_id != ''
  AND r.id = n.reply_id;

-- Step 2: Delete reaction_on_reply rows that still have empty/null comment_id
-- (reply doesn't exist or reply_id is empty — these can't be navigated to)
DELETE FROM notifications
WHERE type = 'reaction_on_reply'
  AND (comment_id = '' OR comment_id IS NULL);
