-- Fix backfilled notification messages: replace double quotes with single quotes
-- Pattern: 님이 "content" → 님이 'content'
UPDATE notifications
SET message = REGEXP_REPLACE(message, '님이 "(.+?)" ', '님이 ''\1'' ', 'g')
WHERE message LIKE '%님이 "%' AND created_at >= NOW() - INTERVAL '7 days';
