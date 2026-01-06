-- ================================================
-- Schema Normalization Migration
-- Migration: 20260106000001_normalize_schema
-- ================================================
-- This migration normalizes the schema to remove 1NF violations
-- and denormalized user data.

-- ================================================
-- 1. Normalize waiting_users_ids array to join table
-- ================================================

-- Create join table for board waiting users
CREATE TABLE board_waiting_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create indexes for the join table
CREATE INDEX idx_board_waiting_users_board ON board_waiting_users(board_id);
CREATE INDEX idx_board_waiting_users_user ON board_waiting_users(user_id);

-- Drop the array column from boards
ALTER TABLE boards DROP COLUMN IF EXISTS waiting_users_ids;

-- ================================================
-- 2. Normalize known_buddy fields on users
-- ================================================

-- Keep only the FK reference, drop denormalized data
ALTER TABLE users DROP COLUMN IF EXISTS known_buddy_nickname;
ALTER TABLE users DROP COLUMN IF EXISTS known_buddy_profile_photo_url;

-- ================================================
-- 3. Remove denormalized user info from comments
-- ================================================

ALTER TABLE comments DROP COLUMN IF EXISTS user_name;
ALTER TABLE comments DROP COLUMN IF EXISTS user_profile_image;

-- ================================================
-- 4. Remove denormalized user info from replies
-- ================================================

ALTER TABLE replies DROP COLUMN IF EXISTS user_name;
ALTER TABLE replies DROP COLUMN IF EXISTS user_profile_image;

-- ================================================
-- 5. Remove denormalized user info from likes
-- ================================================

ALTER TABLE likes DROP COLUMN IF EXISTS user_name;
ALTER TABLE likes DROP COLUMN IF EXISTS user_profile_image;

-- ================================================
-- 6. Remove denormalized user info from reactions
-- ================================================

ALTER TABLE reactions DROP COLUMN IF EXISTS user_name;
ALTER TABLE reactions DROP COLUMN IF EXISTS user_profile_image;

-- ================================================
-- 7. Remove denormalized actor info from notifications
-- ================================================

ALTER TABLE notifications DROP COLUMN IF EXISTS actor_profile_image;

-- ================================================
-- 8. Posts table - keep author_name for now
-- ================================================
-- Note: author_name is kept on posts because:
-- 1. It's the "byline" shown on the post
-- 2. Historical accuracy matters for published content
-- 3. Firestore stores it this way
-- If you want to normalize this too, uncomment:
-- ALTER TABLE posts DROP COLUMN IF EXISTS author_name;

-- ================================================
-- Summary of changes:
-- ================================================
-- ADDED:
--   - board_waiting_users (join table)
--
-- REMOVED from boards:
--   - waiting_users_ids TEXT[]
--
-- REMOVED from users:
--   - known_buddy_nickname
--   - known_buddy_profile_photo_url
--   (kept: known_buddy_uid as FK)
--
-- REMOVED from comments:
--   - user_name, user_profile_image
--
-- REMOVED from replies:
--   - user_name, user_profile_image
--
-- REMOVED from likes:
--   - user_name, user_profile_image
--
-- REMOVED from reactions:
--   - user_name, user_profile_image
--
-- REMOVED from notifications:
--   - actor_profile_image
