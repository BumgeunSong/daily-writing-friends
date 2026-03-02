-- Backfill comment_id on reaction_on_reply notifications that are missing it.
-- Root cause: create-notification Edge Function was not fetching comment_id from replies table.

-- Step 1: Backfill comment_id from replies table where reply still exists
UPDATE notifications n
SET comment_id = r.comment_id
FROM replies r
WHERE n.type = 'reaction_on_reply'
  AND n.comment_id IS NULL
  AND n.reply_id IS NOT NULL
  AND r.id = n.reply_id;

-- Step 2: Delete orphaned notification rows where the reply no longer exists
DELETE FROM notifications n
WHERE n.type = 'reaction_on_reply'
  AND n.comment_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM replies r WHERE r.id = n.reply_id);
