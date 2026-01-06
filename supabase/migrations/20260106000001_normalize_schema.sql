-- ================================================
-- Schema Normalization Migration
-- Migration: 20260106000001_normalize_schema
-- ================================================
-- This migration normalizes the schema to remove 1NF violations.
--
-- Note: Historical Identity fields (user_name, user_profile_image) are
-- intentionally kept on comments, replies, likes, and reactions for:
-- 1. Performance: Avoids JOINs when loading PostDetailPage
-- 2. Authenticity: Preserves identity at the moment of interaction

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
-- (known_buddy_uid is kept as FK to users table)
ALTER TABLE users DROP COLUMN IF EXISTS known_buddy_nickname;
ALTER TABLE users DROP COLUMN IF EXISTS known_buddy_profile_photo_url;

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
