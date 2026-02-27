-- Phase 8A: Remap user IDs from Firebase UID (TEXT) to Supabase Auth UUID
-- Run during maintenance window. Takes ~30 seconds for ~40k rows.
--
-- INSTRUCTIONS:
-- 1. Run create-supabase-auth-users.ts first to generate data/uid-mapping-inserts.sql
-- 2. Paste the INSERT block from that file into Section 0 below
-- 3. Run this entire script in Supabase SQL Editor
-- 4. Verify row counts and column types before COMMIT

BEGIN;

-- =============================================
-- 0. Create mapping table
-- =============================================
CREATE TABLE IF NOT EXISTS uid_mapping (
  firebase_uid TEXT PRIMARY KEY,
  supabase_uuid UUID NOT NULL UNIQUE
);

-- INSERT mappings here (paste from data/uid-mapping-inserts.sql)
-- INSERT INTO uid_mapping (firebase_uid, supabase_uuid) VALUES
-- ('firebase_uid_1', 'uuid-1'),
-- ('firebase_uid_2', 'uuid-2');

-- =============================================
-- 1. Disable triggers (prevent counter corruption during mass UPDATE)
-- =============================================
ALTER TABLE posts DISABLE TRIGGER ALL;
ALTER TABLE comments DISABLE TRIGGER ALL;
ALTER TABLE replies DISABLE TRIGGER ALL;
ALTER TABLE likes DISABLE TRIGGER ALL;
ALTER TABLE reactions DISABLE TRIGGER ALL;
ALTER TABLE notifications DISABLE TRIGGER ALL;

-- =============================================
-- 2. Drop FK constraints
-- =============================================
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE replies DROP CONSTRAINT IF EXISTS replies_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_user_id_fkey;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_fkey;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_user_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_known_buddy_uid_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;

-- =============================================
-- 3. Drop indexes on affected columns
-- =============================================
DROP INDEX IF EXISTS idx_posts_author_created;
DROP INDEX IF EXISTS idx_comments_user_created;
DROP INDEX IF EXISTS idx_replies_user_created;
DROP INDEX IF EXISTS idx_notifications_recipient_created;
DROP INDEX IF EXISTS idx_likes_user;
DROP INDEX IF EXISTS idx_permissions_user;
DROP INDEX IF EXISTS idx_board_waiting_users_user;
DROP INDEX IF EXISTS idx_reactions_user;
DROP INDEX IF EXISTS idx_drafts_user_board;
DROP INDEX IF EXISTS idx_blocks_blocker;
DROP INDEX IF EXISTS idx_blocks_blocked;
DROP INDEX IF EXISTS idx_reviews_reviewer;

-- Also drop unique constraints that include user columns
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_user_id_key;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_blocked_id_key;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_board_id_key;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_board_id_user_id_key;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_board_id_reviewer_id_key;
-- reactions unique indexes
DROP INDEX IF EXISTS idx_reactions_comment_user;
DROP INDEX IF EXISTS idx_reactions_reply_user;

-- =============================================
-- 4. UPDATE all FK columns (before altering types)
-- =============================================
UPDATE posts SET author_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE posts.author_id = m.firebase_uid;

UPDATE comments SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE comments.user_id = m.firebase_uid;

UPDATE replies SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE replies.user_id = m.firebase_uid;

UPDATE likes SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE likes.user_id = m.firebase_uid;

UPDATE reactions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reactions.user_id = m.firebase_uid;

UPDATE notifications SET recipient_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.recipient_id = m.firebase_uid;

UPDATE notifications SET actor_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.actor_id = m.firebase_uid;

UPDATE drafts SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE drafts.user_id = m.firebase_uid;

UPDATE user_board_permissions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE user_board_permissions.user_id = m.firebase_uid;

UPDATE board_waiting_users SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE board_waiting_users.user_id = m.firebase_uid;

UPDATE blocks SET blocker_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocker_id = m.firebase_uid;

UPDATE blocks SET blocked_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocked_id = m.firebase_uid;

UPDATE users SET known_buddy_uid = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.known_buddy_uid = m.firebase_uid;

UPDATE reviews SET reviewer_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reviews.reviewer_id = m.firebase_uid;

-- PK last (other FKs reference this)
UPDATE users SET id = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.id = m.firebase_uid;

-- =============================================
-- 5. ALTER COLUMN types from TEXT to UUID
-- =============================================
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE users ALTER COLUMN known_buddy_uid TYPE UUID USING known_buddy_uid::uuid;
ALTER TABLE posts ALTER COLUMN author_id TYPE UUID USING author_id::uuid;
ALTER TABLE comments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE replies ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE likes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE reactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE notifications ALTER COLUMN recipient_id TYPE UUID USING recipient_id::uuid;
ALTER TABLE notifications ALTER COLUMN actor_id TYPE UUID USING actor_id::uuid;
ALTER TABLE drafts ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_board_permissions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE board_waiting_users ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocker_id TYPE UUID USING blocker_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocked_id TYPE UUID USING blocked_id::uuid;
ALTER TABLE reviews ALTER COLUMN reviewer_id TYPE UUID USING reviewer_id::uuid;

-- =============================================
-- 6. Recreate indexes
-- =============================================
CREATE INDEX idx_posts_author_created ON posts (author_id, created_at DESC);
CREATE INDEX idx_comments_user_created ON comments (user_id, created_at DESC);
CREATE INDEX idx_replies_user_created ON replies (user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_likes_user ON likes (user_id);
CREATE INDEX idx_permissions_user ON user_board_permissions (user_id);
CREATE INDEX idx_board_waiting_users_user ON board_waiting_users (user_id);
CREATE INDEX idx_reactions_user ON reactions (user_id);
CREATE INDEX idx_drafts_user_board ON drafts (user_id, board_id, saved_at DESC);
CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);

-- Recreate unique constraints
ALTER TABLE likes ADD CONSTRAINT likes_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_board_id_key UNIQUE (user_id, board_id);
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_board_id_user_id_key UNIQUE (board_id, user_id);
ALTER TABLE reviews ADD CONSTRAINT reviews_board_id_reviewer_id_key UNIQUE (board_id, reviewer_id);
CREATE UNIQUE INDEX idx_reactions_comment_user ON reactions (comment_id, user_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX idx_reactions_reply_user ON reactions (reply_id, user_id) WHERE reply_id IS NOT NULL;

-- =============================================
-- 7. Re-add FK constraints
-- =============================================
ALTER TABLE users ADD CONSTRAINT users_known_buddy_uid_fkey
  FOREIGN KEY (known_buddy_uid) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE replies ADD CONSTRAINT replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE drafts ADD CONSTRAINT drafts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- =============================================
-- 8. Re-enable triggers
-- =============================================
ALTER TABLE posts ENABLE TRIGGER ALL;
ALTER TABLE comments ENABLE TRIGGER ALL;
ALTER TABLE replies ENABLE TRIGGER ALL;
ALTER TABLE likes ENABLE TRIGGER ALL;
ALTER TABLE reactions ENABLE TRIGGER ALL;
ALTER TABLE notifications ENABLE TRIGGER ALL;

-- =============================================
-- 9. Verification queries (check before COMMIT)
-- =============================================

-- Row counts (compare with pre-migration-counts.json)
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'posts', count(*) FROM posts
UNION ALL SELECT 'comments', count(*) FROM comments
UNION ALL SELECT 'replies', count(*) FROM replies
UNION ALL SELECT 'likes', count(*) FROM likes
UNION ALL SELECT 'reactions', count(*) FROM reactions
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'drafts', count(*) FROM drafts
UNION ALL SELECT 'blocks', count(*) FROM blocks;

-- Column types (should all be 'uuid')
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (column_name IN ('author_id', 'user_id', 'recipient_id', 'actor_id',
       'blocker_id', 'blocked_id', 'known_buddy_uid', 'reviewer_id')
       OR (table_name = 'users' AND column_name = 'id'))
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- FK constraints exist
SELECT conname FROM pg_constraint
WHERE contype = 'f' AND confrelid = 'public.users'::regclass;

COMMIT;

-- Post-commit: clean up dead tuples
VACUUM ANALYZE users;
VACUUM ANALYZE posts;
VACUUM ANALYZE comments;
VACUUM ANALYZE replies;
VACUUM ANALYZE likes;
VACUUM ANALYZE reactions;
VACUUM ANALYZE notifications;
VACUUM ANALYZE drafts;
VACUUM ANALYZE blocks;
