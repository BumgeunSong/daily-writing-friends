-- ================================================
-- PHASE 0: SUPABASE SCHEMA FOR DAILY WRITING FRIENDS
-- Migration: 20260106000000_initial_schema
-- ================================================

-- ================================================
-- TABLES
-- ================================================

-- Boards table
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  first_day TIMESTAMPTZ,
  last_day TIMESTAMPTZ,
  cohort INTEGER,
  waiting_users_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (profile data only - auth stays in Firebase)
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Firebase Auth UID
  real_name TEXT,
  nickname TEXT,
  email TEXT,
  profile_photo_url TEXT,
  bio TEXT,
  phone_number TEXT,
  referrer TEXT,
  recovery_status TEXT CHECK (recovery_status IN ('none', 'eligible', 'partial', 'success')),
  timezone TEXT,
  known_buddy_uid TEXT,
  known_buddy_nickname TEXT,
  known_buddy_profile_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User board permissions
CREATE TABLE user_board_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB,
  thumbnail_image_url TEXT,
  visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  count_of_comments INTEGER NOT NULL DEFAULT 0,
  count_of_replies INTEGER NOT NULL DEFAULT 0,
  count_of_likes INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  week_days_from_first_day INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
-- Historical Identity: user_name/user_profile_image stored at comment time
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  user_profile_image TEXT,
  content TEXT NOT NULL,
  count_of_replies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replies table
-- Historical Identity: user_name/user_profile_image stored at reply time
CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,  -- Denormalized for query efficiency
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  user_profile_image TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table
-- Historical Identity: user_name/user_profile_image stored at like time
CREATE TABLE likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  user_profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Reactions table (for comments and replies)
-- Historical Identity: user_name/user_profile_image stored at reaction time
-- Note: This table will be replaced in 20260106000002 with proper FK constraints
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('comment', 'reply')),
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,  -- emoji character
  user_name TEXT NOT NULL DEFAULT '',
  user_profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id)
);

-- Blocks table
CREATE TABLE blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Notifications table (materialized inbox)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'comment_on_post',
    'reply_on_comment',
    'reply_on_post',
    'reaction_on_comment',
    'reaction_on_reply',
    'like_on_post'
  )),
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_profile_image TEXT,
  board_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL DEFAULT '',
  reply_id TEXT NOT NULL DEFAULT '',
  reaction_id TEXT,
  like_id TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent write operations log
CREATE TABLE write_ops (
  op_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration diffs table (for shadow reads)
CREATE TABLE migration_diffs (
  id SERIAL PRIMARY KEY,
  feed_type TEXT NOT NULL,
  board_id TEXT,
  firestore_ids TEXT[],
  postgres_ids TEXT[],
  missing_in_postgres TEXT[],
  missing_in_firestore TEXT[],
  order_mismatch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- INDEXES
-- ================================================

-- Posts indexes
CREATE INDEX idx_posts_board_created ON posts(board_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_board_engagement ON posts(board_id, engagement_score DESC, created_at DESC, id DESC);

-- Comments indexes
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at ASC);

-- Replies indexes
CREATE INDEX idx_replies_user_created ON replies(user_id, created_at DESC);
CREATE INDEX idx_replies_comment_created ON replies(comment_id, created_at ASC);
CREATE INDEX idx_replies_post ON replies(post_id);

-- Notifications indexes
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, created_at DESC) WHERE read = FALSE;
CREATE UNIQUE INDEX idx_notifications_idempotency
  ON notifications(recipient_id, type, post_id, comment_id, reply_id, actor_id);

-- Blocks indexes
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Likes indexes
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- User board permissions indexes
CREATE INDEX idx_permissions_user ON user_board_permissions(user_id);
CREATE INDEX idx_permissions_board ON user_board_permissions(board_id);

-- Write ops index
CREATE INDEX idx_write_ops_created_at ON write_ops(created_at);

-- Migration diffs indexes
CREATE INDEX idx_migration_diffs_board ON migration_diffs(board_id, created_at DESC);
CREATE INDEX idx_migration_diffs_feed_type ON migration_diffs(feed_type, created_at DESC);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Idempotent write lock function
CREATE OR REPLACE FUNCTION try_acquire_write_lock(p_op_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO write_ops (op_id)
  VALUES (p_op_id)
  ON CONFLICT (op_id) DO NOTHING
  RETURNING TRUE INTO inserted;

  RETURN COALESCE(inserted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS
-- ================================================
-- This schema supports the Firebase to Supabase migration for Daily Writing Friends.
-- Key design decisions:
-- 1. TEXT primary keys: Match Firestore document IDs (20 alphanumeric chars)
-- 2. Firebase Auth stays: users.id = Firebase UID, auth handled externally
-- 3. Denormalized user info: user_name, user_profile_image stored for query efficiency
-- 4. Activity fan-out removed: postings/commentings/replyings replaced by indexed queries
-- 5. Notifications materialized: explicit table with idempotency constraint
-- 6. write_ops table: For dual-write idempotency during migration
